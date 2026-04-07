"""
Merge spam/ham CSV/TSV files for train_and_export_spam.py.

Load order:
1) training_datasets.json: explicit list (paths relative to project dir)
2) All *.csv / *.tsv under training_data/ (recursive; skips __MACOSX)
3) Legacy spam.csv in project root
4) Fallback: download default SMS TSV

Label columns are mapped to ham=0 / spam=1 without keyword-based scoring.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
import zipfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# Email bodies in CSV can exceed default 128 KiB field limit
try:
    csv.field_size_limit(min(2147483647, sys.maxsize))
except Exception:
    csv.field_size_limit(10 * 1024 * 1024)

DEFAULT_SPAM_URL = (
    "https://raw.githubusercontent.com/justmarkham/pycon-2016-tutorial/master/data/sms.tsv"
)

_COLUMN_PAIR_HINTS: list[tuple[list[str], list[str]]] = [
    (["v1"], ["v2"]),
    (["label"], ["message"]),
    (["label"], ["text"]),
    (["Label"], ["Text"]),
    (["category"], ["message"]),
    (["Category"], ["Message"]),
    (["class"], ["sms"]),
    (["target"], ["content"]),
    (["ham_spam"], ["sms"]),
    (["email_type"], ["email_text"]),
    (["Email Type"], ["Email Text"]),
    (["type"], ["email"]),
    (["label"], ["body"]),
    (["Label"], ["Body"]),
]


def _norm_col(c: str) -> str:
    return str(c).strip().lower().replace(" ", "_")


def _read_table(
    path: Path,
    sep: str | None,
    encoding: str | None,
    *,
    nrows: int | None = None,
    usecols: list[str] | None = None,
) -> pd.DataFrame:
    sep = sep or ","
    enc = encoding
    kw: dict[str, Any] = {"sep": sep, "engine": "python"}
    if nrows is not None:
        kw["nrows"] = nrows
    if usecols is not None:
        kw["usecols"] = usecols
    if enc:
        return pd.read_csv(path, encoding=enc, **kw)
    try:
        return pd.read_csv(path, encoding="cp1252", **kw)
    except UnicodeDecodeError:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return pd.read_csv(io.StringIO(f.read()), **kw)


def _max_rows_for_file(path: Path, spec: dict[str, Any]) -> int | None:
    if spec.get("max_rows") is not None:
        return int(spec["max_rows"])
    env = os.environ.get("SPAM_TRAIN_MAX_ROWS")
    if env:
        return int(env)
    size_mb = path.stat().st_size / (1024 * 1024)
    threshold = float(os.environ.get("SPAM_TRAIN_LARGE_FILE_MB", "40"))
    if size_mb >= threshold:
        return int(os.environ.get("SPAM_TRAIN_LARGE_FILE_ROWS", "120000"))
    return None


def _infer_sep(path: Path, explicit: str | None) -> str:
    if explicit:
        return explicit
    if path.suffix.lower() == ".tsv":
        return "\t"
    return ","


def _find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {_norm_col(c): c for c in df.columns}
    for cand in candidates:
        key = _norm_col(cand)
        if key in lower_map:
            return lower_map[key]
    return None


def _try_uci_two_column(path: Path, encoding: str | None) -> pd.DataFrame | None:
    """Tab-separated, no header: label \\t text (UCI SMS style)."""
    read_kw: dict[str, Any] = {"sep": "\t", "header": None, "names": ["v1", "v2"], "engine": "python"}
    try:
        if encoding:
            return pd.read_csv(path, encoding=encoding, **read_kw)
        try:
            return pd.read_csv(path, encoding="utf-8", **read_kw)
        except UnicodeDecodeError:
            return pd.read_csv(path, encoding="cp1252", **read_kw)
    except Exception:
        pass

    enc = encoding or "utf-8"
    rows: list[tuple[str, str]] = []
    try:
        with open(path, encoding=enc, errors="replace") as fh:
            for line in fh:
                line = line.rstrip("\n\r")
                if "\t" not in line:
                    continue
                lab, rest = line.split("\t", 1)
                rows.append((lab.strip(), rest))
    except OSError:
        return None
    if not rows:
        try:
            with open(path, encoding="cp1252", errors="replace") as fh:
                for line in fh:
                    line = line.rstrip("\n\r")
                    if "\t" not in line:
                        continue
                    lab, rest = line.split("\t", 1)
                    rows.append((lab.strip(), rest))
        except OSError:
            return None
    if not rows:
        return None
    return pd.DataFrame(rows, columns=["v1", "v2"])


def _auto_detect_columns(df: pd.DataFrame) -> tuple[str, str] | None:
    for labels, texts in _COLUMN_PAIR_HINTS:
        lc = _find_column(df, labels)
        tc = _find_column(df, texts)
        if lc is not None and tc is not None:
            return lc, tc
    if len(df.columns) == 2:
        a, b = df.columns[0], df.columns[1]
        s0, s1 = df[a], df[b]
        try:
            if s0.dtype == object and s1.dtype != object:
                return (b, a) if float(s0.astype(str).str.len().mean()) < float(
                    s1.astype(str).str.len().mean()
                ) else (a, b)
            if s1.dtype == object and s0.dtype != object:
                return (a, b) if float(s1.astype(str).str.len().mean()) < float(
                    s0.astype(str).str.len().mean()
                ) else (b, a)
        except Exception:
            pass
    return None


def _labels_to_binary(
    raw: pd.Series,
    spam_values: list[str] | None,
    ham_values: list[str] | None,
) -> pd.Series:
    spam_values = [
        str(x).strip().lower()
        for x in (
            spam_values
            or ["spam", "1", "phishing", "phishing email", "bad", "1.0"]
        )
    ]
    ham_values = [
        str(x).strip().lower()
        for x in (
            ham_values
            or ["ham", "0", "good", "legitimate", "benign", "safe email", "0.0"]
        )
    ]

    def one(x: Any) -> float:
        if pd.isna(x):
            return np.nan
        if isinstance(x, (int, np.integer)):
            v = int(x)
            if v in (0, 1):
                return float(v)
        if isinstance(x, (float, np.floating)):
            fv = float(x)
            if abs(fv - round(fv)) < 1e-9 and fv in (0.0, 1.0):
                return float(int(fv))
        s = str(x).strip().lower()
        if s in spam_values:
            return 1.0
        if s in ham_values:
            return 0.0
        if re.fullmatch(r"0|1", s):
            return float(s)
        return np.nan

    return raw.map(one)


def _standardize_frame(
    raw: pd.DataFrame,
    label_col: str,
    text_col: str,
    spam_values: list[str] | None,
    ham_values: list[str] | None,
    source_name: str,
) -> pd.DataFrame:
    out = pd.DataFrame(
        {
            "label": _labels_to_binary(raw[label_col], spam_values, ham_values),
            "text": raw[text_col].astype(str),
        }
    )
    out["_source"] = source_name
    out = out.dropna(subset=["text"]).copy()
    out = out[out["text"].str.strip() != ""].copy()
    out = out.dropna(subset=["label"]).reset_index(drop=True)
    out["label"] = out["label"].astype(int)
    return out


def _load_one_spec(base_dir: Path, spec: dict[str, Any]) -> pd.DataFrame:
    rel = spec.get("path")
    if not rel:
        raise ValueError("Each dataset entry needs 'path'")
    path = (base_dir / rel).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Dataset file not found: {path}")

    sep = _infer_sep(path, spec.get("sep"))
    encoding = spec.get("encoding")
    fmt = (spec.get("format") or "").lower()

    if fmt != "uci_sms" and path.name == "SMSSpamCollection":
        spec = {**spec, "format": "uci_sms"}
        return _load_one_spec(base_dir, spec)

    if fmt == "uci_sms":
        df = _try_uci_two_column(path, encoding)
        if df is None:
            raise ValueError(f"Could not read UCI-style file: {path}")
        label_col, text_col = "v1", "v2"
    else:
        max_rows = _max_rows_for_file(path, spec)
        label_col = spec.get("label_col")
        text_col = spec.get("text_col")
        if label_col and text_col:
            df = _read_table(
                path,
                sep,
                encoding,
                nrows=max_rows,
                usecols=[label_col, text_col],
            )
        else:
            df_peek = _read_table(path, sep, encoding, nrows=200)
            inferred = _auto_detect_columns(df_peek)
            if inferred is None:
                uci = _try_uci_two_column(path, encoding)
                if uci is not None and len(uci.columns) == 2:
                    df = uci
                    label_col, text_col = "v1", "v2"
                else:
                    raise ValueError(
                        f"Could not infer label/text columns for {path.name}. "
                        "Add training_datasets.json with label_col and text_col, or format: uci_sms."
                    )
            else:
                label_col, text_col = inferred
                if spec.get("label_col"):
                    label_col = spec["label_col"]
                if spec.get("text_col"):
                    text_col = spec["text_col"]
                df = _read_table(
                    path,
                    sep,
                    encoding,
                    nrows=max_rows,
                    usecols=[label_col, text_col],
                )

    spam_vals = spec.get("spam_labels")
    ham_vals = spec.get("ham_labels")
    if spam_vals is not None:
        spam_vals = list(spam_vals)
    if ham_vals is not None:
        ham_vals = list(ham_vals)

    return _standardize_frame(df, label_col, text_col, spam_vals, ham_vals, path.name)


def _iter_training_files(training_dir: Path) -> list[Path]:
    out: list[Path] = []
    for p in sorted(training_dir.rglob("*.csv")) + sorted(training_dir.rglob("*.tsv")):
        parts = {x.lower() for x in p.parts}
        if "__macosx" in parts or p.name.startswith("."):
            continue
        out.append(p)
    # UCI SMS zip often extracts to extensionless "SMSSpamCollection"
    for p in training_dir.rglob("SMSSpamCollection"):
        if p.is_file():
            parts = {x.lower() for x in p.parts}
            if "__macosx" not in parts:
                out.append(p)
    return sorted(set(out))


def ensure_zips_extracted(training_dir: Path) -> None:
    """Extract *.zip directly under training_data/ once (creates subfolders)."""
    for zpath in sorted(training_dir.glob("*.zip")):
        marker = zpath.with_suffix(zpath.suffix + ".extracted")
        if marker.is_file():
            continue
        dest = training_dir / zpath.stem
        dest.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(zpath, "r") as zf:
                zf.extractall(dest)
        except zipfile.BadZipFile:
            continue
        marker.write_text("ok", encoding="utf-8")


def load_merged_training_data(
    base_dir: Path,
    default_url: str = DEFAULT_SPAM_URL,
) -> tuple[pd.DataFrame, np.ndarray, str]:
    manifest_path = base_dir / "training_datasets.json"
    training_dir = base_dir / "training_data"
    if training_dir.is_dir():
        ensure_zips_extracted(training_dir)

    frames: list[pd.DataFrame] = []
    parts: list[str] = []

    if manifest_path.is_file():
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)
        entries = manifest.get("datasets") or []
        if not entries:
            raise ValueError("training_datasets.json exists but 'datasets' is empty")
        for spec in entries:
            fr = _load_one_spec(base_dir, spec)
            frames.append(fr)
            parts.append(f"{spec.get('path', '?')}: {len(fr)} rows")
    elif training_dir.is_dir():
        files = _iter_training_files(training_dir)
        if files:
            for path in files:
                spec = {"path": str(path.relative_to(base_dir))}
                try:
                    fr = _load_one_spec(base_dir, spec)
                    frames.append(fr)
                    parts.append(f"{path.relative_to(training_dir)}: {len(fr)} rows")
                except Exception as e:
                    parts.append(f"{path.name}: SKIPPED ({e})")

    legacy = base_dir / "spam.csv"
    if not frames and legacy.is_file():
        fr = _load_one_spec(base_dir, {"path": "spam.csv"})
        frames.append(fr)
        parts.append(f"spam.csv: {len(fr)} rows")

    if not frames:
        import urllib.request

        raw = urllib.request.urlopen(default_url, timeout=120).read().decode("utf-8", errors="ignore")
        df = pd.read_csv(io.StringIO(raw), sep="\t", header=None, names=["v1", "v2"])
        fr = _standardize_frame(df, "v1", "v2", None, None, "downloaded sms.tsv")
        frames.append(fr)
        parts.append(f"default URL: {len(fr)} rows")

    merged = pd.concat(frames, ignore_index=True)
    before = len(merged)
    merged = merged.drop_duplicates(subset=["text"], keep="first").reset_index(drop=True)
    dropped = before - len(merged)

    y = merged["label"].values
    summary = (
        "Merged training sources:\n  "
        + "\n  ".join(parts)
        + f"\n  (deduped {dropped} duplicate texts)\n"
        + f"Total rows: {len(merged)} | spam_rate: {y.mean():.4f}"
    )
    return merged, y, summary
