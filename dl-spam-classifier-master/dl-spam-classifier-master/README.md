# Spam message classifier (CNN + GloVe)

**Author:** Om Shah  

This repo is my deep learning spam filter for a **university data analytics assignment**. It classifies SMS text as spam or not spam and outputs a probability score. I use it on my portfolio to show applied ML next to my other work (see my CV in the portfolio root: **`OM SHAH - RESUME (1).pdf`**, two folders up from this file). Metrics and error counts below are backed by the files in **`outputs/`**.

---

## What it does

You give the model a message. It returns how likely the message is spam (sigmoid output). The notebook trains a CNN on top of GloVe embeddings, evaluates on a held-out test set, and writes **proof artifacts** into `outputs/` (metrics table, per-row predictions, plots).

---

## Method (short)

Traditional baselines (Naive Bayes, TF-IDF + SVM) treat text as a bag of words. This model keeps **word order**: a **Conv1D** layer scans short windows over the sequence, and **GloVe** supplies 100-dimensional word vectors pretrained on Twitter text so the network does not start from random embeddings.

**Architecture:**

```
Embedding (GloVe, 100d)
    -> Conv1D (128 filters, window 5)
    -> GlobalMaxPooling1D
    -> Dense (64, ReLU)
    -> Dropout (0.3)
    -> Dense (1, Sigmoid)
```

Training uses **early stopping** on validation loss (best weights restored).

---

## Results with proof (`outputs/metrics_dl.csv`)

All headline metrics below are **exactly what is stored** in `outputs/metrics_dl.csv` for the row `DeepLearning_CNN`. Rounded percentages are shown for reading; the CSV keeps full float precision.

| Metric | Raw value in `metrics_dl.csv` | Rounded |
|--------|------------------------------|---------|
| Accuracy | `0.9874439461883409` | 98.74% |
| Precision (spam) | `0.972027972027972` | 97.20% |
| Recall (spam) | `0.9328859060402684` | 93.29% |
| F1 (spam) | `0.952054794520548` | 95.21% |
| F1 (macro) | `0.9724154261560428` | 97.24% |
| ROC-AUC | `0.9942091514166216` | 99.42% |
| Average precision | `0.9806513202479222` | 98.07% |

So the table in the old README was not hand typed from memory. It matches the saved evaluation export.

**Plots and model weights in `outputs/` (when present):**

| File | What it proves |
|------|----------------|
| `metrics_dl.csv` | One row of numeric metrics for the run that produced the figures below |
| `confusion_matrix_dl.png` | Visual confusion matrix for the same evaluation |
| `roc_dl.png` | ROC curve |
| `pr_dl.png` | Precision-recall curve |
| `training_curves_dl.png` | Loss and accuracy by epoch |
| `dl_model.keras` | Serialized trained model |
| `test_predictions_dl.csv` | Every test message with `actual`, `pred_dl`, and `score_dl` |

---

## Per-message proof (`outputs/test_predictions_dl.csv`)

The file `outputs/test_predictions_dl.csv` has **1,115** rows (one per test message) with columns:

`idx`, `text`, `actual` (0 = ham, 1 = spam), `pred_dl`, `score_dl`.

**Independent check:** Compare `actual` to `pred_dl` for every row.

- Total rows: **1115**
- Rows where `actual != pred_dl`: **14**
  - **10** false negatives (spam labeled 1 but predicted 0)
  - **4** false positives (ham labeled 0 but predicted 1)

That matches the headline “14 misclassified” and the 10 / 4 split you get from a confusion matrix at the same threshold.

**Examples of correct high-confidence spam calls** (from the same CSV, `actual` = 1 and `pred_dl` = 1):

- Index **575**, `score_dl` ≈ **0.993** (prize / claim style SMS)
- Index **3057**, `score_dl` ≈ **0.971** (subscription / URL spam)
- Index **2668**, `score_dl` ≈ **0.999** (explicit spam promotion)

**Examples of correct ham** (scores near 0):

- Index **222**, “Sorry, I'll call later”, `score_dl` ≈ **4.86e-4**
- Index **2826**, long casual message, `score_dl` ≈ **8.85e-5**

You can grep or open `test_predictions_dl.csv` to verify any row.

---

## Dataset

[UCI SMS Spam Collection](https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset): **5,572** labeled SMS messages (**4,825** ham, **747** spam). Splits and preprocessing follow the notebook.

---

## How to run

```text
python -m venv .venv
.venv\Scripts\activate
pip install tensorflow pandas numpy scikit-learn matplotlib jupyter
jupyter notebook
```

Open `DL_Spam_Filtering_Om.ipynb` and run all cells.

To **load the saved model without retraining**, set `DEMO_MODE = True` in the first code cell (see notebook).

Optional: `README_SETUP.txt` (PyCharm) and `README_CODE_WALKTHROUGH.txt` (code walkthrough) if they exist in your copy of the project.

---

## Limitations

- **Dataset:** Metrics are on **UCI SMS** only; real inboxes and modern phishing differ (domain shift).
- **Errors:** The exported test run still has **14** wrong rows (**10** spam missed, **4** ham flagged) in `outputs/test_predictions_dl.csv`.
- **Portfolio demo:** The live page uses **browser rules** unless you wire a backend to `dl_model.keras`.

---

## Tech stack

- Python 3.12  
- TensorFlow / Keras  
- NumPy, pandas, scikit-learn  
- GloVe Twitter embeddings (`glove.twitter.27B.100d`)  
- Jupyter Notebook  

---

## What to gather for a “v2” (optional)

If you want to retrain or connect the real model to the site, collect the items in **`GATHER.md`** (checklist in this folder), then re-run the notebook or add a small API as described there.

---

## License / use

Academic and portfolio use. Dataset terms follow UCI / Kaggle usage for the SMS corpus.
