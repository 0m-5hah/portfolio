"""
Load dl_model.onnx + tokenizer.json and score a single SMS-style string.
Uses onnxruntime-cpu only — no TensorFlow dependency at runtime.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

from output_config import load_inference_output_config

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
MODEL_PATH = OUTPUTS_DIR / "dl_model.onnx"
TOKENIZER_PATH = OUTPUTS_DIR / "tokenizer.json"


def _max_len() -> int:
    return int(load_inference_output_config()["max_len"])


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
        _table = str.maketrans(filters, " " * len(filters))
        self._table = _table

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
        raise FileNotFoundError(
            f"Missing {TOKENIZER_PATH}. Run train_and_export_spam.py first."
        )
    with open(TOKENIZER_PATH, encoding="utf-8") as f:
        data = json.load(f)
    cfg = data.get("config", data)
    word_index: dict[str, int] = {}
    raw_wi = cfg.get("word_index", "{}")
    if isinstance(raw_wi, str):
        raw_wi = json.loads(raw_wi)
    word_index = {k: int(v) for k, v in raw_wi.items()}
    filters = cfg.get("filters", '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n')
    lower = bool(cfg.get("lower", True))
    oov_token = cfg.get("oov_token") or None
    return _LightTokenizer(word_index=word_index, filters=filters, lower=lower, oov_token=oov_token)


def load_model_and_tokenizer():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Missing {MODEL_PATH}. Run convert_to_onnx.py to generate it."
        )
    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 1
    sess_opts.inter_op_num_threads = 1
    session = ort.InferenceSession(str(MODEL_PATH), sess_options=sess_opts, providers=["CPUExecutionProvider"])
    tokenizer = _load_tokenizer()
    return session, tokenizer


def _run_session(session: ort.InferenceSession, padded: np.ndarray) -> np.ndarray:
    input_name = session.get_inputs()[0].name
    # ONNX model was exported from SavedModel with float32 input
    return session.run(None, {input_name: padded.astype(np.float32)})[0].reshape(-1)


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
    out = _run_session(model, padded)
    inference_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    prob = float(out[0])
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
