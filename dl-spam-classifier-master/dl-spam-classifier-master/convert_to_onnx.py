"""
Convert dl_model.keras → dl_model.onnx so the API can run on onnxruntime-cpu
(~50 MB) instead of TensorFlow (~500 MB), fitting Render's 512 MB free tier.

Run once from this directory (requires your local TF environment):
    python convert_to_onnx.py

Commit outputs/dl_model.onnx afterwards.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

OUTPUTS = Path(__file__).resolve().parent / "outputs"
KERAS_PATH = OUTPUTS / "dl_model.keras"
ONNX_PATH = OUTPUTS / "dl_model.onnx"


def main() -> None:
    if not KERAS_PATH.exists():
        sys.exit(f"ERROR: {KERAS_PATH} not found. Make sure the model is in outputs/.")

    print("Loading Keras model …")
    import tensorflow as tf  # noqa: PLC0415

    model = tf.keras.models.load_model(str(KERAS_PATH))
    model.summary()

    print("Converting to ONNX via SavedModel …")
    import tempfile  # noqa: PLC0415
    import subprocess  # noqa: PLC0415
    import sys  # noqa: PLC0415

    with tempfile.TemporaryDirectory() as tmp:
        saved_model_dir = str(Path(tmp) / "saved_model")
        print(f"  Saving as SavedModel to {saved_model_dir} …")
        model.export(saved_model_dir)
        print("  Running tf2onnx conversion …")
        result = subprocess.run(
            [
                sys.executable, "-m", "tf2onnx.convert",
                "--saved-model", saved_model_dir,
                "--output", str(ONNX_PATH),
                "--opset", "13",
            ],
            check=True,
            capture_output=False,
        )

    size_mb = ONNX_PATH.stat().st_size / 1_048_576
    print(f"Saved {ONNX_PATH}  ({size_mb:.1f} MB)")
    print("Done. Commit outputs/dl_model.onnx and push.")


if __name__ == "__main__":
    main()
