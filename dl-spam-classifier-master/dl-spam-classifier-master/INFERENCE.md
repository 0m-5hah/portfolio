# Inference API (developer notes)

The portfolio demo is static HTML; **Keras inference runs in this FastAPI service**, which loads `outputs/dl_model.keras` and returns real `P(spam)` (not client-side rules).

## UI copy (`inference_output_config.json`)

Demo strings and trace labels live in **`inference_output_config.json`**. The static page loads it from the repo path, or via `GET /inference-config` when served with the API. Restart the server after edits.

## Word highlights (occlusion)

The `/predict` response can include **`highlight_spans`**: character ranges in the input where masking that token changed **P(spam)** the most (absolute delta). Tunables live under **`attribution`** in `inference_output_config.json` (`enabled`, `top_k`, `min_abs_delta`). This is a lightweight sensitivity probe, not integrated gradients or LIME; disable with `"enabled": false` if you want to skip the extra batched forward pass.

## 1. One-time: export `tokenizer.json`

The tokenizer must be **identical** to the one used in `DL_Spam_Filtering_Om.ipynb`. After training (or in `DEMO_MODE` after the tokenizer exists), run **once** in the notebook:

```python
with open(OUT_DIR / "tokenizer.json", "w", encoding="utf-8") as f:
    f.write(tokenizer.to_json())
print("Wrote", OUT_DIR / "tokenizer.json")
```

You should have:

- `outputs/dl_model.keras`
- `outputs/tokenizer.json`

## 2. Install API dependencies

```bash
cd dl-spam-classifier-master/dl-spam-classifier-master
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements-api.txt
```

### Windows: TensorFlow failed to install or `No module named 'tensorflow.python'`

TensorFlow ships very **deep directory trees**. On Windows the default **260-character path limit** often breaks `pip install tensorflow` with an error like:

`OSError: [Errno 2] No such file or directory: ...\grpc\...\gcp_service_account_identity_credentials.h`  
**HINT:** … enable Windows Long Path support …

A failed install can leave **half-installed** packages, which then causes:

`ModuleNotFoundError: No module named 'tensorflow.python'`

**Do this in order:**

1. **Remove broken packages** (same Python you use for the project):

   ```powershell
   python -m pip uninstall tensorflow keras -y
   python -m pip cache purge
   ```

2. **Enable long paths in Windows** (one-time; Administrator PowerShell):

   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

   Alternatively: *Run* → `gpedit.msc` → **Computer Configuration → Administrative Templates → System → Filesystem → Enable Win32 long paths** → **Enabled**, then reboot if prompted.

   Microsoft reference: [Maximum path length limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation).

3. **Reboot** (recommended so new path limits apply reliably).

4. **Use a short path for the venv** (reduces risk even with long paths on):

   ```powershell
   mkdir C:\venvs
   cd C:\venvs
   python -m venv spam-api
   .\spam-api\Scripts\activate
   python -m pip install --upgrade pip
   python -m pip install -r "C:\Users\omssh\Desktop\portfolio\dl-spam-classifier-master\dl-spam-classifier-master\requirements-api.txt"
   ```

   Then run `uvicorn` from that activated venv while your `dl_model.keras` / `tokenizer.json` stay in the repo’s `outputs\` folder (paths on disk can stay as they are).

5. **Run the server with `python -m uvicorn`** (avoids “Scripts not on PATH” warnings):

   ```powershell
   cd C:\Users\omssh\Desktop\portfolio\dl-spam-classifier-master\dl-spam-classifier-master
   python -m uvicorn api_server:app --host 127.0.0.1 --port 8765
   ```

If TensorFlow still fails after the above, install **Python 3.12** from [python.org](https://www.python.org/downloads/) (not the Store build), create a fresh venv, and retry. Some teams have fewer issues with the standalone installer than the Microsoft Store layout.

## 3. Start the API

```bash
python -m uvicorn api_server:app --host 127.0.0.1 --port 8765
```

`POST /predict` returns `spam_probability`, `label`, and a **`trace`** object (token count, padded shape, token id head, model filename, etc.) so the portfolio page can show the real local pipeline, not a generic “AI” blurb.

## 4. Serve the portfolio over HTTP

Browsers block `fetch` from `file://` to localhost in many setups. From the **portfolio root**:

```bash
python -m http.server 8080
```

Open `http://127.0.0.1:8080/project-demos.html`.

Optional: point the page at another host/port with `?api=http://127.0.0.1:8765` or set `localStorage.spamApiBase`.

## 5. Improving the model (training)

Better accuracy or calibration comes from **data and training** (more labeled SMS, class weights, retrain in the notebook), not from hard-coded regex in HTML. After retraining, overwrite `outputs/dl_model.keras`, refresh `tokenizer.json` if the vocabulary changed, and restart `uvicorn`.
