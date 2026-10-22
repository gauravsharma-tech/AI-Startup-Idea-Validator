# IdeaValidator

**Validate your idea. Understand your market. Build with confidence.**

IdeaValidator is a professional decision-support web app for founders, students, and innovators. You describe a startup idea in a five-step flow and receive a structured validation report: dimension scores, NLP keywords, a machine-learning viability label, SWOT, risks, recommendations, and a downloadable PDF.

This is a capstone-style product, not a toy form. It is also **not** a prediction of startup success.

## Problem statement

People generate startup ideas faster than they can evaluate them. Advice from friends is polite. Spreadsheets stay empty. There is no lightweight way to pressure-test problem, market, competition, and business model in one guided pass.

## Objectives

- Guide the user from idea to report without a confusing jump between screens.
- Score six dimensions with **inspectable weights**.
- Extract keywords with offline NLP (tokenization, stopwords, TF-IDF).
- Cross-check the rules verdict with a Random Forest trained on **simulated** ideas (a consistency check, not a forecast).
- Persist per-user history, reports, and comparisons.
- Stay honest: no fake live market research, no guaranteed outcomes.

## Features

- Landing page, authentication (Google, X, email/password), dark mode
- Multi-step validator (Idea → Problem → Market → Business → Location → Review); the Location step is optional and only for ideas that depend on a physical spot
- Analysis processing screen tied to a real server result
- Results dashboard: gauge, breakdown, radar, SWOT, risks, competitors, recommendations, roadmap
- History with search/filters, PDF reports, side-by-side comparison
- **Versions:** "Edit & re-analyze" opens a saved idea in the wizard and saves a new version; "Re-run with current model" re-scores the same inputs. History shows the latest version of each idea, and the report page lists all versions with score deltas and a warning when two versions came from different model versions.
- **Unit-economics calculator** on the report page (price, cost to serve, CAC, churn, fixed costs): margin, LTV, LTV:CAC, CAC payback, break-even customers, with plain flags. The assumptions are saved with the idea, carried into new versions and included in the PDF. They are the founder's own numbers and do not change the score.
- **Share link:** a report owner can create a private, read-only link (`/sample?share=<token>`, 192-bit random token, `noindex`). Turning sharing off deletes the token, so the old link stops working. The shared page shows the whole report, including any map spot and unit-economics numbers.
- Sample ideas (StudyAI, GreenMile, HarvestLocal, Rehearse) labeled as demo data
- Methodology page with **actual** train/test metrics

## Architecture

The live application is a **TanStack Start** (React) full-stack app. Analysis runs in server functions against Postgres (Neon in production, PGLite in preview).

```
Browser  →  TanStack routes  →  createServerFn (auth-scoped)
                                 ├─ NLP + feature extraction
                                 ├─ Weighted scoring engine
                                 ├─ Random Forest inference (exported trees)
                                 └─ Optional Idea AI rewrite of prose (if XAI_API_KEY is present)
```

A Python training pipeline (`backend/ml/train.py`) fits `sklearn.ensemble.RandomForestClassifier` and exports `src/lib/engine/model/forest.json`. The Node runtime does **not** call Python.

## Technology stack

| Layer | Choice |
| --- | --- |
| App | React 19, TanStack Start/Router/Query |
| UI | Tailwind CSS v4, Radix, Lucide, Recharts, Motion |
| Auth | Better Auth (Google, X, email/password) |
| Data | Postgres (Neon / PGLite) |
| NLP | TypeScript TF-IDF (offline) |
| ML train | Python, scikit-learn, pandas, NumPy |
| ML infer | Exported JSON forest in TypeScript |
| PDF | jsPDF |

## Folder structure

```
src/routes/            pages and API auth catch-all
src/components/        layout, UI, results, landing
src/lib/engine/        NLP, features, scoring, forest, insights
src/lib/server/        authenticated server functions
backend/ml/train.py    Random Forest training
backend/nlp/           documented Python tokenization
data/                  synthetic_startups.csv (simulated ideas run through the real feature extractor)
migrations/            Better Auth + app schema (0003 adds ml_proba / nlp_stats)
```

## Installation

Install Node.js 22. Clone the project and install dependencies:

```bash
npm install
```

Optional, only to retrain the forest:

```bash
pip install -r backend/requirements.txt
python backend/ml/train.py
```

## Environment variables

Do not commit secrets. The platform injects them on deploy.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon Postgres. Unset in preview (PGLite). |
| `XAI_API_KEY` | server | Optional Idea AI rewrite of insight/recommendations. |
| Better Auth / Idea broker | server | Injected for deployed sign-in. |

There is no `.env` file in this repository by design.

## Running the app

Development: `npm run dev` (host `0.0.0.0`, port 8080).

Production build: `npm run build`. Preview the built output with `npm run preview`.

## Dataset information

`data/synthetic_startups.csv` is **simulated data**. Each row is a generated idea with a hidden quality score; its text and ratings are generated from that score with noise (founders over-rate themselves, so the sliders are only weakly informative), then run through the app's own feature extractor (`src/lib/engine/features.ts`) so the feature distribution matches what the app produces. The label is the hidden quality plus noise, cut into four classes. It is **not** historical startup success data and must not be cited as such.

Regenerate and retrain whenever scoring changes (`features.ts`, `nlp.ts`, `CALIBRATION` in `config.ts`):

```bash
node --experimental-strip-types --no-warnings -e \
  "import('./src/lib/engine/demo.ts').then(async m => process.stdout.write(await m.simulatedDatasetCsv(4000, 42)))" \
  > data/synthetic_startups.csv
python backend/ml/train.py
```

Then bump `MODEL_VERSION` in `src/lib/engine/config.ts`. Every report stores `model_version` (`MODEL_VERSION` + the dataset id of the forest), so old reports stay traceable.

## Scoring methodology

- Optional map check (physical-spot ideas): the Location step stores raw OpenStreetMap counts and nearby points on the idea; scores are recomputed from them (never trusted from the browser) and blended into market demand and competition (`LOCATION_BLEND` in `config.ts`). The report and PDF show the check with a tile-free map sketch.

- Six dimensions, weighted sum, then a fixed linear calibration (`CALIBRATION` in `config.ts`) fitted on the simulated population.
- Self-ratings (demand, severity, scalability, reach) are pulled toward 50 by a credibility factor that grows with how specific the founder's own text is (`SELF_RATING` in `config.ts`).
- Text specificity rewards length up to a per-field target, vocabulary variety, concrete detail (numbers, mechanism words, domain terms) and penalizes filler words.

## ML methodology ("consistency check")

- Model: Random Forest classifier, 64 trees, max depth 8
- Classes (same names as the rules verdict): Needs Major Improvement, High Risk, Promising, Highly Promising
- Features: the eight dimension scores, competitor count, description specificity, pricing present, differentiator strength, text evidence, average self-rating
- Split: 75% train / 25% test, stratified
- Held-out simulated set: forest accuracy 0.68 (within one class 0.99), rules accuracy 0.65, forest vs rules same class 0.81
- The report shows whether the ML check agrees, is one class off, or differs from the rules verdict

## NLP methodology

Unicode normalize → lowercase → tokenize (letters, combining marks and digits, so Devanagari works) → stopword removal (English, Hindi, Marathi, romanized Hinglish) → light suffix stemming (English only) → TF-IDF against a small built-in corpus of startup blurbs → top keywords with category labels (industry, problem, customer, technology, product).

## API (server functions)

Authenticated (session required, rows scoped to `user_id`):

- create + analyze startup
- list history / dashboard stats
- get analysis bundle
- delete idea
- compare analyses
- create / list reports
- seed labeled demo ideas

Public:

- sample report for StudyAI
- published ML metrics

## Testing

```bash
npm test
npm run typecheck
```

Engine tests cover scoring weights, verdict thresholds, NLP tokenization, competitor cards, LLM output validation, PDF text safety, and persisted analysis extras. See `CHANGES.md` for the latest fixes.

## Limitations

- Competition cards are **prototype assessments** from names you type, not live crawl data.
- The forest cannot predict real-world fundraising or survival.
- LLM prose is optional and skipped when no server key is present.
- Preview database is in-memory and resets on server restart.

## Future scope

Live competitor search, richer customer personas, pitch-deck export, investor-readiness checks, and PostgreSQL-backed analytics. The scoring weights already live in one config module so they can be tuned without UI rewrites.

## Disclaimer

This validation is intended as an initial decision-support tool. It does not guarantee market success, profitability, funding, or business performance. Users should conduct independent market research and customer validation before making business decisions.
