# Deployment Checklist — Spam Inference API (Render Free Tier)

Use this doc before every deploy to catch known issues before they happen.

---

## Render service settings

| Setting | Value |
|---|---|
| **Root directory** | `dl-spam-classifier-master/dl-spam-classifier-master` |
| **Build command** | `pip install -r requirements-api.txt && python download_models.py` |
| **Start command** | `uvicorn api_server:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free (512 MB RAM) |
| **Branch** | `main` |

Environment variables (set in Render dashboard under Environment):

| Key | Value | Required? |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | Optional — harmless, can leave it |
| `SPAM_THRESHOLD` | `0.5` | Optional — defaults to value in `inference_output_config.json` |

---

## Pre-deploy checklist

Before triggering a deploy, verify locally:

- [ ] `outputs/dl_model.onnx` exists and is **not** an LFS pointer stub (run `python download_models.py` locally to check, or open the file — it should start with `ONNX` not `version https://git-lfs`)
- [ ] `outputs/tokenizer.json` exists and is valid JSON (not an LFS pointer stub)
- [ ] `requirements-api.txt` lists `onnxruntime-cpu` — **no tensorflow or tf-keras**
- [ ] `download_models.py` references `dl_model.onnx`, not `dl_model.keras`
- [ ] `spam_inference.py` imports `onnxruntime`, not `tensorflow`
- [ ] `inference_output_config.json` backend string says "ONNX Runtime", not "TensorFlow/Keras"
- [ ] Quick local smoke-test passes:
  ```
  python -c "
  from spam_inference import load_model_and_tokenizer, predict_spam_probability
  m, t = load_model_and_tokenizer()
  print(predict_spam_probability('free prize winner call now', m, t)[0])  # expect > 0.8
  print(predict_spam_probability('see you at lunch tomorrow', m, t)[0])    # expect < 0.1
  "
  ```

---

## Issues we hit and how they were resolved

### 1. Wrong Python version on Render (Python 3.14)
**Symptom:** Build failed — `No matching distribution found for tensorflow>=2.15`
**Cause:** Render defaulted to Python 3.14 which TF doesn't support.
**Fix:** Set `PYTHON_VERSION=3.11.9` as an environment variable in Render. Also added `runtime.txt` and `.python-version` files as backups.

---

### 2. Git LFS pointer files served instead of real files
**Symptom:** `model_loaded: false` in `/health`. Logs showed tiny files (under 1KB) downloaded.
**Cause:** Render's free tier doesn't pull Git LFS files automatically. The `.keras` and `.json` files in `outputs/` were LFS pointers.
**Fix:** Created `download_models.py` which explicitly fetches from `media.githubusercontent.com` (GitHub's LFS CDN) during build. Build command: `pip install -r requirements-api.txt && python download_models.py`.

---

### 3. Keras version mismatch (`batch_shape` / `optional` error)
**Symptom:** Model failed to load — `Unrecognized keyword arguments: ['batch_shape', 'optional']`
**Cause:** Model was saved with Keras 3 (TF 2.16+) but loaded under TF 2.15 (Keras 2). InputLayer serialization changed between versions.
**Fix:** Updated `requirements-api.txt` to `tensorflow-cpu==2.17.0` + added `tf-keras` package. Updated `spam_inference.py` to try `tf_keras.preprocessing` imports first.

---

### 4. Out of memory — TF 2.17 exceeded 512 MB on Render free tier
**Symptom:** Deploy failed with `==> Out of memory (used over 512Mi)` during startup.
**Cause:** TensorFlow 2.17 uses ~400–500 MB just to import, pushing the service over Render's 512 MB limit before it could even open a port.
**Fix:** Switched the entire runtime from TensorFlow to ONNX Runtime.
- Converted `dl_model.keras` → `dl_model.onnx` using `convert_to_onnx.py` (run once locally)
- Rewrote `spam_inference.py` to use `onnxruntime` + a pure-Python tokenizer (no Keras dependency)
- Rewrote `spam_attribution.py` to use the ONNX session directly
- `requirements-api.txt` now only needs `onnxruntime-cpu`, `fastapi`, `uvicorn`, `numpy`, `pydantic` (~150 MB total)

---

### 5. tf2onnx `from_keras` API fails with Keras 3 models
**Symptom:** `KeyError: 'keras_tensor_20'` during ONNX conversion.
**Cause:** `tf2onnx.convert.from_keras()` has a bug with Keras 3 model objects.
**Fix:** Export the model as a SavedModel first (`model.export(path)`), then convert using the `tf2onnx` CLI (`python -m tf2onnx.convert --saved-model ...`). See `convert_to_onnx.py`.

---

### 6. ONNX model expects `float32`, not `int32`
**Symptom:** Type error on first inference call if inputs were passed as `int32`.
**Cause:** When exported via SavedModel, the model's input signature was traced as `float32`.
**Fix:** `_pad_sequences()` now creates `float32` arrays. `_run_session()` casts to `float32` before calling ONNX Runtime.

---

## If you retrain the model

1. Run training locally — produces a new `outputs/dl_model.keras`
2. Run `python convert_to_onnx.py` — produces `outputs/dl_model.onnx`
3. Commit both (LFS handles `.keras` and `.onnx` automatically via `.gitattributes`)
4. Push and redeploy on Render

> Do not commit `dl_model.keras` without also committing a fresh `dl_model.onnx`. The API only uses the ONNX file at runtime.

---

## Health check

After deploy: `https://portfolio-jxw0.onrender.com/health`

Expected response:
```json
{ "ok": true, "model_loaded": true, "demo": "spam-cnn-inference" }
```

If `model_loaded` is `false`, check the Render build logs — the `download_models.py` step will show whether the files downloaded successfully and their sizes.
