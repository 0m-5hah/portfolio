"""
Load spam_weights.npz + tokenizer.json and score SMS-style strings.
Pure numpy forward pass: no TensorFlow, no ONNX Runtime.
Architecture: Embedding → Conv1D(relu) → GlobalMaxPool → Dense(relu) → Dense(sigmoid)
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np

from output_config import load_inference_output_config

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
WEIGHTS_PATH = OUTPUTS_DIR / "spam_weights.npz"
TOKENIZER_PATH = OUTPUTS_DIR / "tokenizer.json"


def _pad_sequences(sequences: list[list[int]], maxlen: int) -> np.ndarray:
    out = np.zeros((len(sequences), maxlen), dtype=np.float32)
    for i, seq in enumerate(sequences):
        trunc = seq[:maxlen]
        out[i, : len(trunc)] = trunc
    return out


class _LightTokenizer:
    """Minimal re-implementation of Keras Tokenizer loaded from tokenizer.json."""

    def __init__(self, word_index: dict[str, int], filters: str, lower: bool, oov_token: str | None):
        self.word_index = word_index
        self.filters = filters
        self.lower = lower
        self.oov_token = oov_token
        self.split = " "
        self._oov_id = word_index.get(oov_token) if oov_token else None
        self._table = str.maketrans(filters, " " * len(filters))

    def texts_to_sequences(self, texts: list[str]) -> list[list[int]]:
        seqs = []
        for text in texts:
            if self.lower:
                text = text.lower()
            text = text.translate(self._table)
            ids = []
            for w in text.split():
                if not w:
                    continue
                wid = self.word_index.get(w)
                if wid is None:
                    if self._oov_id is not None:
                        ids.append(self._oov_id)
                else:
                    ids.append(wid)
            seqs.append(ids)
        return seqs

    def text_to_word_sequence_list(self, text: str) -> list[str]:
        if self.lower:
            text = text.lower()
        text = text.translate(self._table)
        return [w for w in text.split() if w]


def _load_tokenizer() -> _LightTokenizer:
    if not TOKENIZER_PATH.is_file():
        raise FileNotFoundError(f"Missing {TOKENIZER_PATH}.")
    with open(TOKENIZER_PATH, encoding="utf-8") as f:
        data = json.load(f)
    cfg = data.get("config", data)
    raw_wi = cfg.get("word_index", "{}")
    if isinstance(raw_wi, str):
        raw_wi = json.loads(raw_wi)
    word_index = {k: int(v) for k, v in raw_wi.items()}
    filters = cfg.get("filters", '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n')
    lower = bool(cfg.get("lower", True))
    oov_token = cfg.get("oov_token") or None
    return _LightTokenizer(word_index=word_index, filters=filters, lower=lower, oov_token=oov_token)


class _NumpyModel:
    """Forward pass for Embedding → Conv1D(relu) → GlobalMaxPool → Dense(relu) → Dense(sigmoid)."""

    def __init__(self, weights_path: Path):
        w = np.load(str(weights_path))
        self.emb   = w["emb"].astype(np.float32)    # (vocab, embed_dim)
        self.conv_k = w["conv_k"].astype(np.float32) # (kernel_size, embed_dim, filters)
        self.conv_b = w["conv_b"].astype(np.float32) # (filters,)
        self.d1_k  = w["d1_k"].astype(np.float32)   # (filters, units)
        self.d1_b  = w["d1_b"].astype(np.float32)   # (units,)
        self.d2_k  = w["d2_k"].astype(np.float32)   # (units, 1)
        self.d2_b  = w["d2_b"].astype(np.float32)   # (1,)
        self.kernel_size = self.conv_k.shape[0]
        self.n_filters = self.conv_k.shape[2]
        # Pre-flatten conv kernel for fast matmul
        self._conv_k_flat = self.conv_k.reshape(-1, self.n_filters)  # (k*embed, filters)

    def predict(self, token_ids: np.ndarray) -> np.ndarray:
        """token_ids: (batch, seq_len) int/float → returns (batch,) float32 probabilities."""
        ids = token_ids.astype(np.int32)
        ids = np.clip(ids, 0, self.emb.shape[0] - 1)

        # Embedding lookup
        x = self.emb[ids]  # (batch, seq_len, embed_dim)

        batch, seq_len, embed_dim = x.shape
        k = self.kernel_size
        out_len = seq_len - k + 1

        # Conv1D via sliding window + matmul
        shape = (batch, out_len, k, embed_dim)
        strides = (x.strides[0], x.strides[1], x.strides[1], x.strides[2])
        windows = np.lib.stride_tricks.as_strided(x, shape=shape, strides=strides)
        windows_flat = windows.reshape(batch, out_len, -1)           # (batch, out_len, k*embed)
        conv_out = windows_flat @ self._conv_k_flat + self.conv_b    # (batch, out_len, filters)
        conv_out = np.maximum(0.0, conv_out)                         # relu

        # GlobalMaxPooling
        pooled = conv_out.max(axis=1)                                # (batch, filters)

        # Dense + relu
        h = np.maximum(0.0, pooled @ self.d1_k + self.d1_b)         # (batch, units)

        # Dense + sigmoid
        logits = h @ self.d2_k + self.d2_b                          # (batch, 1)
        return (1.0 / (1.0 + np.exp(-logits))).reshape(-1).astype(np.float32)


def load_model_and_tokenizer():
    if not WEIGHTS_PATH.is_file():
        raise FileNotFoundError(
            f"Missing {WEIGHTS_PATH}. Run extract_weights.py to generate it."
        )
    model = _NumpyModel(WEIGHTS_PATH)
    tokenizer = _load_tokenizer()
    return model, tokenizer


def _run_session(model: _NumpyModel, padded: np.ndarray) -> np.ndarray:
    return model.predict(padded)


def predict_spam_probability(text: str, model, tokenizer) -> tuple[float, dict]:
    prob, trace, _padded = predict_spam_probability_detailed(text, model, tokenizer)
    return prob, trace


def predict_spam_probability_detailed(
    text: str, model, tokenizer
) -> tuple[float, dict, np.ndarray]:
    cfg = load_inference_output_config()
    max_len = int(cfg["max_len"])
    trace_meta = cfg["trace"]

    seq = tokenizer.texts_to_sequences([text])
    raw_ids = list(seq[0]) if seq and seq[0] is not None else []
    n_tokens = len(raw_ids)
    truncated = n_tokens > max_len
    padded = _pad_sequences(seq, max_len)

    t0 = time.perf_counter()
    out = model.predict(padded)
    inference_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    prob = float(out[0])
    trace = {
        "max_len": max_len,
        "token_count": n_tokens,
        "truncated": truncated,
        "model_file": WEIGHTS_PATH.name,
        "padded_shape": [int(x) for x in padded.shape],
        "architecture": trace_meta["architecture"],
        "token_ids_head": [int(x) for x in raw_ids[:48]],
        "backend": trace_meta["backend"],
        "inference_ms": inference_ms,
    }
    return prob, trace, padded
