# Spam classifier portfolio — what was done & what you do next

## For agents (handoff)

Treat this file as a **map**, not a full code dump. **Architecture:** (1) **Browser rules** in `project-demos.html` power the static-site demo (instant, no backend). (2) **CNN + GloVe** is trained in the Jupyter notebook; headline metrics and CSV proof live under `dl-spam-classifier-master/dl-spam-classifier-master/outputs/`. **Before changing behavior or copy:** open the files named here and confirm—they are the source of truth. **Always read the user’s latest request** (retrain, API, UI-only, etc.); this doc does not replace that. **Paths:** portfolio HTML/CSS usually sit in the portfolio root; the ML repo is nested under `dl-spam-classifier-master/`.

---

This file summarizes work on the **browser demo** (`project-demos.html`), **model page** (`spam-model.html`), **styles** (`styles.css`), and the **dl-spam-classifier-master** repo (`README.md`, `GATHER.md`).

---

## What was done (already in your project)

### 1. Interactive demo (`project-demos.html`)

- **Rules engine upgrades** (JavaScript): broader phrase patterns (banking, parcel delivery, OTP, URL shorteners, multilingual hints, etc.), **Unicode homoglyph folding** so lookalike letters still match, **dedupe by rule key** and **merge overlapping matches** so the same text isn’t scored multiple times, **calibrated** likelihood bar (not raw sum), **matched-text snippets** in the signals list, and a **highlight strip** under the textarea for matched spans.
- **Word boundaries vs contractions:** In JavaScript, `\b` matches between a word character (`[A-Za-z0-9_]`) and a non-word character. An apostrophe is non-word, so a naive `\bwon\b` still matches the substring `won` in **`won't`** (boundary after `n`, before `'`), which is a false positive for normal English. The “you won” rule uses `won(?![\u2019']t)` so **`won't` / `won’t`** are excluded while **`you won`**, **`winner`**, and **`win a`** still match. Other rules could in theory hit the same class of bug for short words before `'` (e.g. **`it`** in **`it's`**); only the prize/won family is special-cased here.
- **Honest copy**: The hero text says the **~98% metrics are from the CNN on the UCI test set**, while the **playground uses hand-tuned rules in the browser** (no server, not the neural net).
- **Note box** (`demo-note`): Calls the demo a portfolio MVP, points to false negatives in `outputs/test_predictions_dl.csv`, and links to the About page.
- **Output panel**: Subtext explains rules vs CNN; the bar label is **“Likelihood (rules)”** so it isn’t confused with model probabilities.

### 2. Model page (`spam-model.html`)

- **Clarification**: Interactive demo = JavaScript rules; headline metrics = **trained Keras CNN** on UCI, with proof in `outputs/`.
- **Limitations** section: UCI isn’t the real world; model still misses some spam; high accuracy ≠ catches every scam.

### 3. Styles (`styles.css`)

- Styles for **`.demo-note`** (boxed note under the demo hero).
- Styles for **`.demo-highlight-wrap`** and **`mark.signal-hit`** (matched-text preview under the textarea).

### 4. Repo `dl-spam-classifier-master/README.md`

- **Limitations** subsection (dataset, 14 test errors, demo = rules unless you add an API).
- **Pointer** to **`GATHER.md`** for optional “v2” work.

### 5. Repo `dl-spam-classifier-master/GATHER.md`

- A **checklist** of what to collect before retraining, deploying an API, or adding explainability.

---

## What you need to do (your choices)

### If you’re happy with the portfolio as an MVP

- **Nothing required.** Deploy or share the site as usual; the copy already separates **rules demo** vs **CNN metrics**.

### If you want a stronger *model* (retrain)

1. **Gather or choose data**  
   Extra labeled SMS-style data (spam / not spam), from **public datasets you’re allowed to use** and/or your own sources, with license/terms clear.

2. **Decide the goal**  
   e.g. “catch more spam” (higher recall) even if more ham is flagged—this drives thresholds and class weights.

3. **Environment**  
   Same Python as the notebook (e.g. 3.12), and the **GloVe** embedding file path (`glove.twitter.27B.100d`) where the notebook expects it.

4. **Re-run the notebook**  
   Train, export new `outputs/metrics_dl.csv` and `outputs/test_predictions_dl.csv`, update any copy if numbers change.

5. **Fill in `GATHER.md`** in the repo so future you (or a tool) knows your choices.

### If you want the *website* to call the real Keras model

1. **Hosting**  
   A small backend (e.g. FastAPI) must run somewhere; a plain static site cannot load `dl_model.keras` by itself without something like TensorFlow.js (big change) or a server.

2. **Artifacts**  
   Trained **`dl_model.keras`** (or equivalent export), and whether it lives in git or only on the server (large file).

3. **Deployment details**  
   API base URL, CORS if the site and API are on different domains.

4. **Then** ask for implementation wired to your hosting choice.

### If you want “why spam?” explanations (LIME/SHAP-style)

- Optional and heavier; say you want it when you’re ready to invest time.

---

## File quick reference

| File | Role |
|------|------|
| `portfolio/project-demos.html` | Rules demo + copy |
| `portfolio/spam-model.html` | Model story + limitations |
| `portfolio/styles.css` | Demo note + highlights |
| `dl-spam-classifier-master/dl-spam-classifier-master/README.md` | Technical README + limitations |
| `dl-spam-classifier-master/dl-spam-classifier-master/GATHER.md` | Your checklist for v2 |
| `dl-spam-classifier-master/.../outputs/metrics_dl.csv` | CNN metrics source of truth |
| `dl-spam-classifier-master/.../outputs/test_predictions_dl.csv` | Per-message predictions & errors |

---

## One-line summary

**Done:** Clearer, more honest portfolio + stronger rules demo + README/GATHER structure.  
**Your move:** Nothing mandatory; optional next steps are **better training data + retrain**, and/or **API + hosting** if the live site should use the real model.
