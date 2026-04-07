# Checklist: what to provide for the next upgrade

Fill this in when you are ready; then you (or an agent) can implement retraining, a FastAPI service, or demo wiring without guessing.

## Always useful

- [ ] **Python version** you will use (e.g. 3.12) on your machine.
- [ ] **GloVe path**: confirm you have `glove.twitter.27B.100d` (or note where it lives). The notebook expects it.

## If you want better model quality (retrain)

- [ ] **Extra labeled SMS data** (optional): a CSV with columns like `text`, `label` (0 = ham, 1 = spam), or links to **public** datasets you are allowed to use, plus license notes.
- [ ] **Goal metric**: e.g. “raise spam recall even if ham precision drops slightly”; that drives threshold and class weights.
- [ ] **Constraint**: max training time or GPU (CPU-only is fine but slower).

## If you want the portfolio to call the real Keras model

- [ ] **Where it will run**: e.g. your PC only, Railway/Render/Fly, or “static site only” (then the demo stays rules-only unless you add client-side TF.js, which is a bigger change).
- [ ] **Model file**: ensure `outputs/dl_model.keras` exists after training and decide whether it is committed to git or deployed as a release artifact (large file).
- [ ] **CORS / URL**: base URL of your API (e.g. `https://spam-api.example.com`) once deployed, so the static site can call it.

## If you want explainability later

- [ ] **Scope**: token-level (LIME/SHAP) is heavier; say “yes, optional” or “skip.”

---

**After you check boxes and paste paths/links where asked**, ask to “implement from GATHER.md” and point to this file.
