"""
Token-level highlights via occlusion: mask one sequence position at a time, measure |Δ P(spam)|.
Cheap, model-faithful enough for a demo; not integrated gradients / LIME.
"""
from __future__ import annotations

import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import text_to_word_sequence

from output_config import load_inference_output_config


def _word_spans_in_original(text: str, words: list[str]) -> list[tuple[int, int]]:
    """Map tokenizer word sequence to character spans in the original string (SMS-style ASCII)."""
    lower = text.lower()
    pos = 0
    out: list[tuple[int, int]] = []
    for w in words:
        wl = w.lower()
        idx = lower.find(wl, pos)
        if idx < 0:
            idx = lower.find(wl)
        if idx < 0:
            out.append((0, 0))
            continue
        out.append((idx, idx + len(wl)))
        pos = idx + len(wl)
    return out


def _non_overlapping_top_spans(
    items: list[tuple[tuple[int, int], float]],
    top_k: int,
) -> list[dict]:
    """Greedy: highest |Δ| first, skip spans that overlap already chosen."""
    items = sorted(items, key=lambda x: -x[1])
    chosen: list[tuple[tuple[int, int], float]] = []
    for span, score in items:
        a, b = span
        if a >= b or a < 0:
            continue
        if any(not (b <= ca or a >= cb) for (ca, cb), _ in chosen):
            continue
        chosen.append((span, score))
        if len(chosen) >= top_k:
            break
    return [
        {"start": int(a), "end": int(b), "delta": float(s)}
        for (a, b), s in chosen
    ]


def occlusion_highlight_spans(
    text: str,
    model: tf.keras.Model,
    tokenizer,
    padded: np.ndarray,
    max_len: int,
) -> list[dict]:
    cfg = load_inference_output_config()
    acfg = cfg.get("attribution") or {}
    if not acfg.get("enabled", True):
        return []

    words = text_to_word_sequence(
        text,
        filters=tokenizer.filters,
        lower=tokenizer.lower,
        split=tokenizer.split,
    )
    if len(words) > max_len:
        words = words[:max_len]
    if not words:
        return []

    spans = _word_spans_in_original(text, words)
    row = padded[0].astype(np.int32, copy=False)
    active = np.where(row != 0)[0]
    if active.size == 0:
        return []

    n = int(active.size)
    batch = np.tile(np.array(padded, dtype=np.int32), (n + 1, 1))
    for k in range(n):
        j = int(active[k])
        batch[k + 1, j] = 0

    preds = model.predict(batch, verbose=0).reshape(-1)
    p0 = float(preds[0])
    p_masked = preds[1:]
    deltas = np.abs(p0 - p_masked)

    top_k = int(acfg.get("top_k", 5))
    min_abs = float(acfg.get("min_abs_delta", 0.002))

    all_items: list[tuple[tuple[int, int], float]] = []
    for k in range(n):
        d = float(deltas[k])
        wi = int(active[k])
        if wi >= len(spans):
            continue
        span = spans[wi]
        if span[0] >= span[1]:
            continue
        all_items.append((span, d))

    if not all_items:
        return []

    max_d = max(d for _, d in all_items)
    # Flat output: every token matters equally little; nothing to show
    if max_d < 1e-5:
        return []

    # Prefer tokens above min_abs_delta; if everything is below (common for ham / saturated spam),
    # fall back to relative ranking so the UI still shows *something* meaningful.
    pool = [(s, d) for s, d in all_items if d >= min_abs]
    if not pool:
        pool = all_items

    return _non_overlapping_top_spans(pool, top_k)
