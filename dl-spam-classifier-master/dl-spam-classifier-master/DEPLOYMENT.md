# Deployment Checklist - Spam Inference API

Use this doc before every deploy to catch known issues before they happen.

---

## HuggingFace Spaces settings (current - recommended)

| Setting | Value |
|---|---|
| **SDK** | Docker |
| **App port** | 7860 |
| **RAM** | 16 GB free (public space) |
| **Space URL** | `https://[hf-username]-spam-classifier-api.hf.space` |

No environment variables needed. Model files (`spam_weights.npz`, `tokenizer.json`) are committed directly to the Space repo.

---

## Render service settings (deprecated - OOM issues, see issues 4–7 below)

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
| `PYTHON_VERSION` | `3.11.9` | Optional - harmless, can leave it |
| `SPAM_THRESHOLD` | `0.5` | Optional - defaults to value in `inference_output_config.json` |

---

## Pre-deploy checklist

Before triggering a deploy, verify locally:

- [ ] `outputs/spam_weights.npz` exists and is **not** an LFS pointer stub (file should be ~7.3 MB)
- [ ] `outputs/tokenizer.json` exists and is valid JSON (not an LFS pointer stub)
- [ ] `requirements-api.txt` lists only `fastapi`, `uvicorn`, `numpy`, `pydantic` - **no tensorflow, tf-keras, or onnxruntime**
- [ ] `download_models.py` references `spam_weights.npz`, not `dl_model.keras` or `dl_model.onnx`
- [ ] `spam_inference.py` imports only `numpy` - no `tensorflow` or `onnxruntime`
- [ ] `inference_output_config.json` backend string says "ONNX Runtime (CPU)" or similar - **not "TensorFlow/Keras"**
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
**Symptom:** Build failed - `No matching distribution found for tensorflow>=2.15`
**Cause:** Render defaulted to Python 3.14 which TF doesn't support.
**Fix:** Set `PYTHON_VERSION=3.11.9` as an environment variable in Render. Also added `runtime.txt` and `.python-version` files as backups.

---

### 2. Git LFS pointer files served instead of real files
**Symptom:** `model_loaded: false` in `/health`. Logs showed tiny files (under 1KB) downloaded.
**Cause:** Render's free tier doesn't pull Git LFS files automatically. The `.keras` and `.json` files in `outputs/` were LFS pointers.
**Fix:** Created `download_models.py` which explicitly fetches from `media.githubusercontent.com` (GitHub's LFS CDN) during build. Build command: `pip install -r requirements-api.txt && python download_models.py`.

---

### 3. Keras version mismatch (`batch_shape` / `optional` error)
**Symptom:** Model failed to load - `Unrecognized keyword arguments: ['batch_shape', 'optional']`
**Cause:** Model was saved with Keras 3 (TF 2.16+) but loaded under TF 2.15 (Keras 2). InputLayer serialization changed between versions.
**Fix:** Updated `requirements-api.txt` to `tensorflow-cpu==2.17.0` + added `tf-keras` package. Updated `spam_inference.py` to try `tf_keras.preprocessing` imports first.

---

### 4. Out of memory - TF 2.17 exceeded 512 MB on Render free tier
**Symptom:** Deploy failed with `==> Out of memory (used over 512Mi)` during startup.
**Cause:** TensorFlow 2.17 uses ~400–500 MB just to import, pushing the service over Render's 512 MB limit before it could even open a port.
**First attempt fix:** Switched to ONNX Runtime (`onnxruntime-cpu` → then `onnxruntime`). Still OOM - see issue 7 below.

---

### 5. `onnxruntime-cpu` not found on Render's Linux build
**Symptom:** `ERROR: No matching distribution found for onnxruntime-cpu>=1.17`
**Cause:** The `onnxruntime-cpu` package name doesn't exist as a pip-installable wheel on Render's Linux. The correct name is just `onnxruntime`.
**Fix:** Changed `requirements-api.txt` from `onnxruntime-cpu>=1.17` to `onnxruntime>=1.16`.

---

### 6. tf2onnx `from_keras` API fails with Keras 3 models
**Symptom:** `KeyError: 'keras_tensor_20'` during ONNX conversion.
**Cause:** `tf2onnx.convert.from_keras()` has a bug with Keras 3 model objects.
**Fix:** Export the model as a SavedModel first (`model.export(path)`), then convert using the `tf2onnx` CLI (`python -m tf2onnx.convert --saved-model ...`). See `convert_to_onnx.py`.

---

### 7. Out of memory - ONNX Runtime also exceeded 512 MB
**Symptom:** Deploy started, model began loading, then `==> Out of memory (used over 512Mi)`.
**Cause:** `onnxruntime` itself uses ~150 MB of resident memory. Combined with Python (~30MB), numpy (~40MB), and fastapi/uvicorn (~50MB), total idle memory ~270MB. Adding session initialisation (graph optimisation passes) pushed it over 512MB.
**Fix:** Eliminated all ML runtime libraries entirely. Switched to **pure numpy forward pass**:
- `extract_weights.py` (run once locally): extracts all layer weights from `dl_model.keras` into `outputs/spam_weights.npz` (7.3 MB)
- `spam_inference.py` rewritten as a numpy CNN: Embedding lookup → Conv1D via `stride_tricks` + matmul → GlobalMaxPool → Dense → sigmoid
- `requirements-api.txt` now only needs `fastapi`, `uvicorn`, `numpy`, `pydantic` (~80 MB total)
- Verified outputs identical to original TF model (0.9951 spam / 0.0000 ham)

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

1. Run training locally - produces a new `outputs/dl_model.keras`
2. Run `python convert_to_onnx.py` - produces `outputs/dl_model.onnx`
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

If `model_loaded` is `false`, check the Render build logs - the `download_models.py` step will show whether the files downloaded successfully and their sizes.
