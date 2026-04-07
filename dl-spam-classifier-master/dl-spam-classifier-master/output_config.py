"""
Load inference_output_config.json: UI copy, interpretation thresholds, trace strings, max_len.

Path: INFERENCE_OUTPUT_CONFIG env, else inference_output_config.json next to this file.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

_BASE = Path(__file__).resolve().parent
_DEFAULT_PATH = _BASE / "inference_output_config.json"

_cached: dict | None = None


def inference_output_config_path() -> Path:
    p = os.environ.get("INFERENCE_OUTPUT_CONFIG")
    return Path(p).resolve() if p else _DEFAULT_PATH


def load_inference_output_config() -> dict:
    global _cached
    if _cached is not None:
        return _cached
    path = inference_output_config_path()
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing {path}. Add inference_output_config.json (or set INFERENCE_OUTPUT_CONFIG)."
        )
    with open(path, encoding="utf-8") as f:
        _cached = json.load(f)
    return _cached


def reload_inference_output_config() -> dict:
    global _cached
    _cached = None
    return load_inference_output_config()
