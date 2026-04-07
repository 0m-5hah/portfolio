"""
Extract trained weights from dl_model.keras into spam_weights.npz.
Run once locally (requires TensorFlow):
    python extract_weights.py
Then commit outputs/spam_weights.npz.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
import tensorflow as tf

OUTPUTS = Path(__file__).resolve().parent / "outputs"

model = tf.keras.models.load_model(str(OUTPUTS / "dl_model.keras"))
layers = [l for l in model.layers if l.weights]

# Expected order: Embedding, Conv1D, Dense, Dense
emb_w   = layers[0].weights[0].numpy()   # (20000, 100)
conv_k  = layers[1].weights[0].numpy()   # (5, 100, 128)
conv_b  = layers[1].weights[1].numpy()   # (128,)
d1_k    = layers[2].weights[0].numpy()   # (128, 64)
d1_b    = layers[2].weights[1].numpy()   # (64,)
d2_k    = layers[3].weights[0].numpy()   # (64, 1)
d2_b    = layers[3].weights[1].numpy()   # (1,)

out = OUTPUTS / "spam_weights.npz"
np.savez_compressed(str(out), emb=emb_w, conv_k=conv_k, conv_b=conv_b,
                    d1_k=d1_k, d1_b=d1_b, d2_k=d2_k, d2_b=d2_b)
size_mb = out.stat().st_size / 1_048_576
print(f"Saved {out}  ({size_mb:.1f} MB)")
print("Shapes:", {k: v.shape for k, v in dict(
    emb=emb_w, conv_k=conv_k, conv_b=conv_b,
    d1_k=d1_k, d1_b=d1_b, d2_k=d2_k, d2_b=d2_b).items()})
