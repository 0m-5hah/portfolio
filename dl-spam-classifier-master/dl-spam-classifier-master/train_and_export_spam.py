"""
Train the CNN spam model (same hyperparameters as DL_Spam_Filtering_Om.ipynb),
save outputs/dl_model.keras and outputs/tokenizer.json for api_server / spam_inference.

Data: training_data/ (see README there) and dataset_loader.py. Stratified split with random_state=42.
"""
from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras import callbacks, layers, models
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer

from dataset_loader import load_merged_training_data
from output_config import load_inference_output_config

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

BASE_DIR = Path(__file__).resolve().parent
OUT_DIR = BASE_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

_cfg = load_inference_output_config()
max_words = 20000
max_len = int(_cfg["max_len"])
embedding_dim = 100


def main() -> None:
    data, y_all, summary = load_merged_training_data(BASE_DIR)
    print(summary)
    idx_all = np.arange(len(data))
    X_all = data["text"].tolist()

    X_train_idx, X_test_idx = train_test_split(
        idx_all,
        test_size=0.2,
        random_state=SEED,
        stratify=y_all,
    )
    np.save(OUT_DIR / "train_idx.npy", X_train_idx)
    np.save(OUT_DIR / "test_idx.npy", X_test_idx)

    X_train = [X_all[i] for i in X_train_idx]
    X_test = [X_all[i] for i in X_test_idx]
    y_train = y_all[X_train_idx]
    y_test = y_all[X_test_idx]

    tokenizer = Tokenizer(num_words=max_words, oov_token="<OOV>")
    tokenizer.fit_on_texts(X_train)
    train_seq = tokenizer.texts_to_sequences(X_train)
    test_seq = tokenizer.texts_to_sequences(X_test)
    X_train_pad = pad_sequences(train_seq, maxlen=max_len, padding="post", truncating="post")
    X_test_pad = pad_sequences(test_seq, maxlen=max_len, padding="post", truncating="post")

    word_index = tokenizer.word_index
    num_tokens = min(max_words, len(word_index) + 1)

    rng = np.random.default_rng(SEED)
    embedding_matrix = rng.normal(0, 0.05, size=(num_tokens, embedding_dim)).astype("float32")
    embedding_matrix[0] = 0.0

    model = models.Sequential(
        [
            layers.Embedding(
                input_dim=num_tokens,
                output_dim=embedding_dim,
                weights=[embedding_matrix],
                trainable=True,
            ),
            layers.Conv1D(128, 5, activation="relu"),
            layers.GlobalMaxPooling1D(),
            layers.Dense(64, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

    early_stop = callbacks.EarlyStopping(monitor="val_loss", patience=2, restore_best_weights=True)
    model.fit(
        X_train_pad,
        y_train,
        validation_split=0.2,
        epochs=10,
        batch_size=64,
        callbacks=[early_stop],
        verbose=1,
    )

    dl_model_path = OUT_DIR / "dl_model.keras"
    model.save(dl_model_path)
    tok_path = OUT_DIR / "tokenizer.json"
    with open(tok_path, "w", encoding="utf-8") as f:
        f.write(tokenizer.to_json())

    score = model.predict(X_test_pad, verbose=0).ravel()
    pred = (score >= 0.5).astype(int)
    acc = float((pred == y_test).mean())
    print(f"Test accuracy: {acc:.4f}")
    print(f"Saved: {dl_model_path.resolve()}")
    print(f"Saved: {tok_path.resolve()}")


if __name__ == "__main__":
    main()
