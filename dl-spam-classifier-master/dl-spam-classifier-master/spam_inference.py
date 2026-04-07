"""
Load dl_model.keras + tokenizer.json and score a single SMS-style string.
Trace strings and max_len come from inference_output_config.json (see output_config.py).
"""
from __future__ import annotations

from pathlib import Path
import time

import numpy as np
import tensorflow as tf

try:
    from tf_keras.preprocessing.sequence import pad_sequences
    from tf_keras.preprocessing.text import tokenizer_from_json
except ImportError:
    from tensorflow.keras.preprocessing.sequence import pad_sequences  # type: ignore
    from tensorflow.keras.preprocessing.text import tokenizer_from_json  # type: ignore

from output_config import load_inference_output_config

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
MODEL_PATH = OUTPUTS_DIR / "dl_model.keras"
TOKENIZER_PATH = OUTPUTS_DIR / "tokenizer.json"


def _max_len() -> int:
    return int(load_inference_output_config()["max_len"])


def _load_tokenizer():
    if not TOKENIZER_PATH.is_file():
        raise FileNotFoundError(
            f"Missing {TOKENIZER_PATH}. After training, export the Keras Tokenizer once:\n"
            '  with open(OUT_DIR / "tokenizer.json", "w", encoding="utf-8") as f:\n'
            "      f.write(tokenizer.to_json())\n"
            "See INFERENCE.md"
        )
    with open(TOKENIZER_PATH, encoding="utf-8") as f:
        return tokenizer_from_json(f.read())


def load_model_and_tokenizer():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Missing {MODEL_PATH}. Train with the notebook (DEMO_MODE) or copy the saved model into outputs/."
        )
    model = tf.keras.models.load_model(MODEL_PATH)
    tokenizer = _load_tokenizer()
    return model, tokenizer


def predict_spam_probability(text: str, model, tokenizer) -> tuple[float, dict]:
    """
    Return P(spam) in [0, 1] and a trace dict for the portfolio UI (honest pipeline steps).
    """
    prob, trace, _padded = predict_spam_probability_detailed(text, model, tokenizer)
    return prob, trace


def predict_spam_probability_detailed(
    text: str, model, tokenizer
) -> tuple[float, dict, np.ndarray]:
    """
    Same as predict_spam_probability plus padded int32 tensor (1, max_len) for attribution / batching.
    """
    cfg = load_inference_output_config()
    max_len = int(cfg["max_len"])
    trace_meta = cfg["trace"]

    seq = tokenizer.texts_to_sequences([text])
    raw_ids = list(seq[0]) if seq and seq[0] is not None else []
    n_tokens = len(raw_ids)
    truncated = n_tokens > max_len
    padded = pad_sequences(seq, maxlen=max_len, padding="post", truncating="post")
    t0 = time.perf_counter()
    out = model.predict(padded, verbose=0)
    inference_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    prob = float(np.asarray(out).reshape(-1)[0])
    trace = {
        "max_len": max_len,
        "token_count": n_tokens,
        "truncated": truncated,
        "model_file": MODEL_PATH.name,
        "padded_shape": [int(x) for x in padded.shape],
        "architecture": trace_meta["architecture"],
        "token_ids_head": [int(x) for x in raw_ids[:48]],
        "backend": trace_meta["backend"],
        "inference_ms": inference_ms,
    }
    return prob, trace, padded
