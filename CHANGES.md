# P0 fixes

| # | Fix | Where |
| --- | --- | --- |
| 1 | `ai`, `ml`, `ar`, `vr`, `ev` are no longer dropped by the tokenizer, so `TECH_TERMS` can match. Tech-risk check uses whole-word matching (no more hits on "retail", "email", "business model"). | `engine/nlp.ts`, `engine/insights.ts` (`leansOnAi`), `backend/nlp/preprocess.py` |
| 2 | Competitor `similarity` no longer depends on name length. It now uses list position, whether your own text names the rival, and differentiator strength (25-90). | `engine/insights.ts` (`buildCompetitors`) |
| 3 | Processing page shows an error / "not found" state with Try again + History link instead of hanging. | `routes/app/processing.$analysisId.tsx` |
| 4 | PDF text is made safe for Helvetica: `₹` becomes `Rs.`, unsupported characters become `?`. File name falls back to `startup`. PDF also prints ML probabilities, NLP stats and keywords. | `lib/pdf-text.ts`, `lib/pdf.ts` |
| 5 | `ml_proba` and `nlp_stats` are saved and read back (new migration `0003_analysis_extras.sql`). | `migrations/`, `server/serialize.ts`, `server/analysis-extras.ts` |
| 6 | Idea + analysis + recommendations are saved in ONE SQL statement (data-modifying CTEs). The analysis runs first, so a failure leaves no orphan idea. Demo seeding is per-idea and resumable. | `server/startups.ts` (`saveIdeaWithAnalysis`) |
| 7 | LLM call has a 12 s timeout; output is validated field by field (types, lengths, priority enum) before it can reach the UI. | `engine/llm.ts` |
| 8 | Build output removed (`.vercel/`, `.tanstack/`, logs); `.gitignore` added. | repo root |

New tests: `engine/insights.test.ts`, `engine/llm.test.ts`, `lib/pdf-text.test.ts`, `server/analysis-extras.test.ts` (all wired into `npm test`).

Not verified here (no node_modules / database available): `npm run typecheck`, the SQL in `saveIdeaWithAnalysis` against a real Postgres/PGLite, and the UI. Run `npm install && npm test && npm run typecheck && npm run dev` and save one idea end to end.

# P1 fixes (model 2.0.0)

| # | Change | Where |
| --- | --- | --- |
| 1 | **Scoring recalibrated.** Self-ratings are pulled toward 50 by a credibility factor that grows with how specific the founder's own text is; slider weights inside each dimension are lower; text specificity now rewards concrete numbers, mechanism words and domain terms and penalizes filler ("best", "everyone"). A fixed linear calibration (`CALIBRATION`) stretches the composite across 0-100. Constants were fitted on the simulated population, not real outcomes. | `engine/features.ts`, `engine/nlp.ts`, `engine/scoring.ts`, `engine/config.ts` |
| 2 | **Unicode-aware tokenizer.** Devanagari letters and vowel signs are kept; Hindi, Marathi and romanized Hinglish stopwords; ZWJ/ZWNJ handled; English-only stemming ("business", "syllabus" no longer mangled). | `engine/nlp.ts`, `backend/nlp/preprocess.py` |
| 3 | **Rules and ML use the same four class names** (the old "Not Recommended" is now "Needs Major Improvement"; old rows are renamed on read). The ML model is presented as a consistency check: the report shows "ML check agrees / is one class off / differs". The forest was retrained on simulated ideas run through the real feature extractor, with two new features (`text_evidence`, `self_rating_avg`). | `engine/types.ts`, `engine/config.ts` (`mlConsistency`), `engine/demo.ts` (simulator), `backend/ml/train.py`, `data/synthetic_startups.csv`, `engine/model/*.json`, `components/results/report-body.tsx`, `routes/methodology.tsx`, `lib/pdf.ts` |
| 3b | **Methodology page** now reads its numbers from the retrained model (agreement with rules, rules vs forest accuracy). | `routes/methodology.tsx` |
| 4 | **`model_version` stored** on every analysis (`MODEL_VERSION` + the forest's dataset id, e.g. `2.0.0+5f8fb837`), shown on the report and in the PDF; old rows read as `1.0-legacy`; Compare warns when versions differ. Added to the existing migration `0003_analysis_extras.sql`. | `migrations/0003_analysis_extras.sql`, `server/startups.ts`, `server/serialize.ts` |

Held-out simulated metrics: forest accuracy 0.684, within one class 0.994; rules accuracy on the same rows 0.654; forest and rules in the same class 0.811.

Upgrade note: `model_version` was added to the existing `0003` migration instead of a new file. A database that already ran the old `0003` needs: `alter table analysis_results add column if not exists model_version text not null default '1.0-legacy';`

# P2: map check inside the validator (model 2.1.0)

| # | Change | Where |
| --- | --- | --- |
| 1 | **New "Location" wizard step** (6 steps now). Physical-spot ideas pick a spot on the embedded map; online ideas skip it. The Location step can add the named nearby shops to the competitor list. | `routes/app/validate.tsx`, `components/map/location-scout.tsx` (new props: `compact`, `initial`, `onSnapshot`, `onUseSpot`) |
| 2 | **Map page can start a validation**: "Use this spot to validate an idea" saves the spot into the wizard and opens it. | `routes/app/map.tsx` |
| 3 | **Saved on the idea** as `startup_ideas.location` (raw counts + nearby points). The server rebuilds it with `sanitizeSnapshot` (counts clamped, distances recomputed) and recomputes scores itself. | `lib/location/score.ts`, `lib/validation.ts`, `server/startups.ts`, `server/serialize.ts`, `migrations/0003_analysis_extras.sql` |
| 4 | **Feeds the scores**: the map check's demand and room-to-grow scores are blended into market demand and competition (25%, or 12% when OSM has little data). Strengths, weaknesses, explanations and next steps mention it, and a "walk the spot" step is added. `MODEL_VERSION` is now `2.1.0`. Ideas without a location score exactly as before. | `engine/features.ts`, `engine/insights.ts`, `engine/config.ts` (`LOCATION_BLEND`) |
| 5 | **Report and PDF** show a Location check: scores, counts, closest rivals and a tile-free map sketch (SVG in the report, drawn with PDF primitives in the PDF). | `components/results/report-body.tsx`, `lib/pdf.ts` |
| 6 | **Map accuracy fixes**: a bare `building=yes` no longer counts as a home (counted separately at 30%), and the low-data threshold is 12 mapped objects instead of 8. | `lib/location/categories.ts`, `overpass.ts`, `score.ts` |

Upgrade note: the `location` column was added to the existing `0003` migration. A database that already ran `0003` needs: `alter table startup_ideas add column if not exists location jsonb;`

# P3: versions, unit economics, share link (scoring unchanged, MODEL_VERSION stays 2.1.0)

| # | Change | Where |
| --- | --- | --- |
| 1 | **Versions.** Every edit or re-run is a new `startup_ideas` row sharing a `root_id` and counting up in `version`; older versions stay untouched. "Edit & re-analyze" loads the idea into the wizard (`loadForEdit`) and submits through `reanalyzeIdea`; "Re-run with current model" re-scores the same inputs. History and the dashboard count and list the latest version of each idea; deleting an idea deletes all its versions. The report page shows a versions table, score deltas, per-dimension changes and a note when the two versions were scored by different model versions. | `server/startups.ts` (`reanalyzeIdea`, `getVersionHistory`, history/dashboard/delete queries), `lib/wizard-store.ts`, `routes/app/validate.tsx`, `routes/app/results.$analysisId.tsx`, `routes/app/history.tsx` |
| 2 | **Unit-economics calculator** (`computeUnitEconomics`) on the report page: margin, lifetime, LTV, LTV:CAC, CAC payback, break-even customers, monthly profit, and flags. Saved per idea (`startup_ideas.economics`), copied into new versions, included in the PDF. Inputs are validated (`economicsSchema`) and re-read defensively (`parseEconomics`). It does not change the score. | `engine/insights.ts`, `engine/types.ts`, `validation.ts`, `server/analysis-extras.ts`, `components/results/report-body.tsx`, `lib/pdf.ts` |
| 3 | **Share link.** `setReportSharing` creates or removes a 192-bit random `share_token` on an analysis; the public `getSharedReport` returns a read-only copy without internal ids or the owner. The existing public `/sample` page shows it when opened as `/sample?share=<token>` (no new route file), with a `noindex` meta tag. | `server/startups.ts`, `server/public.ts`, `routes/sample.tsx`, `routes/app/results.$analysisId.tsx` |

New tests: unit economics (`insights.test.ts`) and the saved-economics reader (`analysis-extras.test.ts`).

Not done (still on the list): pitch-deck export and a Hindi UI.

Upgrade note: the new columns were added to the existing `0003` migration. A database that already ran `0003` needs:

```sql
alter table startup_ideas add column if not exists economics jsonb;
alter table startup_ideas add column if not exists root_id text;
alter table startup_ideas add column if not exists version integer not null default 1;
create index if not exists startup_ideas_root_idx on startup_ideas (user_id, root_id);
create unique index if not exists startup_ideas_root_version_key on startup_ideas (root_id, version) where root_id is not null;
alter table analysis_results add column if not exists share_token text;
create unique index if not exists analysis_results_share_token_key on analysis_results (share_token) where share_token is not null;
```
(plus the earlier `location` and `model_version` columns from P1/P2 if those were not applied yet.)
