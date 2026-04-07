"""
Local HTTP API for the trained spam CNN. Run from this directory:

  pip install -r requirements-api.txt
  python -m uvicorn api_server:app --host 127.0.0.1 --port 8765

Then open project-demos.html via a local server (not file://) so the browser can call the API.

Copy and thresholds: inference_output_config.json (or INFERENCE_OUTPUT_CONFIG).
Decision cutoff: SPAM_THRESHOLD (default from config optional; keep env only for threshold).
"""
from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from output_config import load_inference_output_config
from spam_attribution import occlusion_highlight_spans
from spam_inference import load_model_and_tokenizer, predict_spam_probability_detailed

_model = None
_tokenizer = None


def _decision_threshold() -> float:
    """P(spam) >= threshold → spam label. Env SPAM_THRESHOLD overrides inference_output_config.json."""
    if os.environ.get("SPAM_THRESHOLD") is not None:
        return float(os.environ["SPAM_THRESHOLD"])
    cfg = load_inference_output_config()
    return float(cfg["decision"]["default_threshold"])


def _build_trace_display_lines(trace: dict, p: float, thr: float) -> list[str] | None:
    """Format the multiline 'Under the hood' trace from inference_output_config.json (single source of truth)."""
    cfg = load_inference_output_config()
    d = cfg.get("trace", {}).get("display")
    if not d:
        return None
    shape_str = (
        json.dumps(trace["padded_shape"])
        if trace.get("padded_shape") is not None
        else f"(1, {trace.get('max_len', '?')})"
    )
    trunc_note = d.get("trunc_note", " (sequence truncated to maxlen)") if trace.get("truncated") else ""
    p_f = f"{p:.6f}"
    thr_clause = ""
    if thr is not None and d.get("thr_clause"):
        thr_clause = d["thr_clause"].format(thr=thr)
    line4 = d["step4"].format(p=p_f, thr_clause=thr_clause)
    arch = trace.get("architecture") or "CNN forward pass"
    return [
        d["step1"].format(token_count=trace["token_count"]),
        d["step2"].format(shape_str=shape_str, trunc_note=trunc_note),
        d["step3"].format(architecture=arch),
        line4,
    ]


def _format_display_pct(p: float, cap: float) -> str:
    """Cap displayed percentage so saturated sigmoids don’t read as a fake ‘100.0%’."""
    v = p * 100.0
    if v >= cap:
        return f"{cap:.1f}"
    return f"{v:.1f}"


def _three_way_band(p: float, thr: float, inter: dict) -> tuple[str, str | None]:
    """Returns (band, lean) with band in clear_ham | uncertain | clear_spam; lean ham|spam only if uncertain."""
    ch = float(inter.get("clear_ham_below", 0.35))
    cs = float(inter.get("clear_spam_above", 0.65))
    if p <= ch:
        return "clear_ham", None
    if p >= cs:
        return "clear_spam", None
    lean = "ham" if p < thr else "spam"
    return "uncertain", lean


def _build_outputs(
    p: float, thr: float, is_spam: bool
) -> tuple[str, str, str, str, dict]:
    cfg = load_inference_output_config()
    t = cfg["templates"]
    inter = cfg["interpretation"]
    labs = cfg["labels"]
    cap = float(inter.get("display_pct_cap", 99.9))
    sat_thr = float(inter.get("saturated_prob_threshold", 0.999))
    pct = _format_display_pct(p, cap)
    thr_pct = f"{thr * 100:.1f}"
    band, lean = _three_way_band(p, thr, inter)

    open_key = (
        "summary_open_saturated"
        if p >= sat_thr and t.get("summary_open_saturated")
        else "summary_open"
    )
    parts = [t[open_key].format(pct=pct)]

    if band == "clear_ham":
        parts.append(t["summary_band_clear_ham"])
        display_label = labs["label_clear_ham"]
    elif band == "clear_spam":
        parts.append(t["summary_band_clear_spam"])
        display_label = labs["label_clear_spam"]
    else:
        if lean == "ham":
            parts.append(t["summary_band_uncertain_lean_ham"])
            display_label = labs["label_uncertain_lean_ham"]
        else:
            parts.append(t["summary_band_uncertain_lean_spam"])
            display_label = labs["label_uncertain_lean_spam"]

    parts.append(
        t["summary_threshold_note"].format(
            thr_pct=thr_pct,
            label_spam=labs["spam"],
            label_not_spam=labs["not_spam"],
            binary_label=labs["spam"] if is_spam else labs["not_spam"],
        )
    )
    summary = " ".join(parts)
    ham_below_pct = f"{float(inter.get('clear_ham_below', 0.35)) * 100:.0f}"
    spam_above_pct = f"{float(inter.get('clear_spam_above', 0.65)) * 100:.0f}"
    confidence_hint = t["confidence_hint"].format(
        thr_pct=thr_pct,
        ham_below_pct=ham_below_pct,
        spam_above_pct=spam_above_pct,
    )
    technical_note = t["technical_note"]
    interpretation = {"band": band, "lean": lean, "display_label": display_label}
    return display_label, summary, confidence_hint, technical_note, interpretation


app = FastAPI(title="Spam CNN inference")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="SMS-style message to classify")


@app.on_event("startup")
def _startup():
    global _model, _tokenizer
    load_inference_output_config()
    try:
        _model, _tokenizer = load_model_and_tokenizer()
    except Exception as exc:
        print("WARNING: CNN not loaded (place dl_model.keras and tokenizer.json in outputs/):", exc)
        _model, _tokenizer = None, None


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": _model is not None,
        "demo": "spam-cnn-inference",
    }


@app.get("/inference-config")
def inference_config():
    """Same JSON as inference_output_config.json; lets the demo page load copy without duplicating strings."""
    return load_inference_output_config()


@app.post("/predict")
def predict(body: PredictRequest):
    if _model is None or _tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        p, trace, padded = predict_spam_probability_detailed(text, _model, _tokenizer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    thr = _decision_threshold()
    is_spam = p >= thr
    label, summary, confidence_hint, technical_note, interpretation = _build_outputs(p, thr, is_spam)
    trace = {**trace, "decision_threshold": thr}
    display_lines = _build_trace_display_lines(trace, p, thr)
    if display_lines is not None:
        trace["display_lines"] = display_lines

    cfg = load_inference_output_config()
    t = cfg["templates"]
    highlight_spans = occlusion_highlight_spans(
        text, _model, _tokenizer, padded, int(trace["max_len"])
    )
    if highlight_spans:
        technical_note = technical_note + " " + t.get("technical_note_attribution_suffix", "")

    acfg = cfg.get("attribution") or {}
    attribution_signal = None
    if highlight_spans and acfg.get("signal_title"):
        attribution_signal = {
            "title": acfg["signal_title"],
            "detail": acfg.get("signal_detail", ""),
        }

    return {
        "spam_probability": p,
        "threshold": thr,
        "label": label,
        "binary_spam": is_spam,
        "interpretation": interpretation,
        "summary": summary,
        "confidence_hint": confidence_hint,
        "technical_note": technical_note,
        "trace": trace,
        "highlight_spans": highlight_spans,
        "attribution_signal": attribution_signal,
    }
