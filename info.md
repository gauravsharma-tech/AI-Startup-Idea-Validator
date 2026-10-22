# AI Startup Validator (IdeaValidator) — Comprehensive Technical & Architecture Guide

Welcome to the comprehensive documentation for **IdeaValidator** (AI Startup Validator). This document provides an in-depth, end-to-end breakdown of the project's vision, system architecture, validation engine, algorithms, database schema, and operational workflows.

---

## 1. Project Overview & Vision

**IdeaValidator** is a production-grade, decision-support web application designed for startup founders, students, angel investors, and innovators. Rather than relying on gut feelings, polite feedback, or blank spreadsheets, IdeaValidator guides founders through a structured 6-step questionnaire and subjects their idea to rigorous, evidence-based pressure testing.

### Key Principles
- **No False Promises**: It is explicitly designed as a *decision-support tool*, not a prophetic guarantee of startup success or funding.
- **Evidence Over Claims**: Sliders and self-ratings are discounted unless corroborated by concrete, specific text descriptions.
- **Dual Verification (Rules + ML)**: Combines transparent weighted multi-criteria scoring with an offline Random Forest machine learning consistency check.
- **Zero Runtime Python Dependency**: Machine learning models are trained in Python and exported to optimized JSON decision trees executed natively in TypeScript.
- **Physical + Digital Support**: Evaluates both digital/software startups and physical brick-and-mortar concepts (cafes, clinics, retail) using OpenStreetMap geospatial intelligence.

---

## 2. System Architecture

IdeaValidator is architected as a modern, full-stack reactive application using **TanStack Start** (React 19) with server-side functions and PostgreSQL storage.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Browser)                                │
│  React 19 • TanStack Router • Tailwind CSS v4 • Radix UI • Recharts • Motion • Leaflet  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / Server Actions
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION SERVER (Node 22)                              │
│                                                                                        │
│   TanStack Start `createServerFn` (Auth-Scoped Middleware via Better Auth)             │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         CORE VALIDATION ENGINE                                 │   │
│   │                                                                                │   │
│   │  1. NLP Preprocessor (Devanagari + English Tokenization, Stopwords, TF-IDF)   │   │
│   │  2. Text Specificity & Credibility Analyzer (Number & Domain Term Density)     │   │
│   │  3. Multi-Dimension Weighted Scoring Engine (6 calibrated dimensions)          │   │
│   │  4. Location Scout Blender (OpenStreetMap Overpass API Sanitizer)             │   │
│   │  5. Random Forest ML Inference (64 Trees in TypeScript)                        │   │
│   │  6. Insights, SWOT, Competitor, Risk & Roadmap Generator                       │   │
│   │  7. Optional LLM Enrichment (xAI / Grok with 12s timeout & Zod validation)    │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATABASE LAYER                                      │
│                                                                                        │
│   PostgreSQL (Neon Cloud in Production / PGLite WASM in Local Preview)                 │
│   - Atomic Persistence via Single-Statement Common Table Expressions (CTEs)            │
│   - Tables: `startup_ideas`, `analysis_results`, `recommendations`, `reports`        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 6-Step Validation Wizard

The core flow guides the founder across 6 progressive steps:

1. **Idea Basics (`Idea`)**:
   - Startup Name, Tagline, Industry (EdTech, FinTech, HealthTech, SaaS, AI, etc.), Stage (Idea, Prototype, MVP, Early Startup, Growth), and Core Description.
2. **Problem & Customer (`Problem`)**:
   - Problem Statement, Target Customer persona, Problem Frequency (Rare to Very Frequent), and Problem Severity (1–100 slider).
3. **Market Analysis (`Market`)**:
   - Target Market description, Geographic Scope (Local, Regional, National, Global), Estimated Customer Count, Expected Pricing, and Perceived Market Demand slider.
4. **Business & Competition (`Business`)**:
   - Business Model (Subscription, Freemium, Marketplace, Commission, etc.), Revenue Model details, Direct/Indirect Competitors list, Core Differentiator / Moat, and Scalability rating.
5. **Location Scout (`Location` - Optional)**:
   - For location-dependent businesses (shops, cafes, clinics, dark stores).
   - Allows dropping a pin on an interactive map. Connects to OpenStreetMap (Overpass API) to fetch local shop density, competitor counts, and anchor drivers (schools, transit, offices, residential areas).
6. **Review & Validation (`Review`)**:
   - Real-time review of inputs with validation warnings before submitting for server analysis.

---

## 4. Deep Dive: Validation & Analysis Engine

The engine lives in `src/lib/engine/` and performs analysis in milliseconds without blocking the event loop.

### 4.1 Unicode-Aware Multilingual NLP (`nlp.ts`)
- **Multilingual Support**: Supports English, Hindi (Devanagari script), Marathi, and romanized Hinglish.
- **Normalization**: Unicode NFC normalization, lowercase conversion, and proper handling of Zero-Width Joiner (ZWJ) / Zero-Width Non-Joiner (ZWNJ).
- **Custom Stopwords**: Filter lists across English, Hindi, Marathi, and romanized colloquial terms.
- **Lightweight Stemming**: English suffix-stripping rules that preserve domain jargon (e.g., words like *business* or *syllabus* are not mangled).
- **TF-IDF & Term Categorization**: Extracts keywords classified into 5 categories: `industry`, `problem`, `customer`, `technology`, and `product`.

### 4.2 Text Specificity & Credibility Scoring
Founders tend to overrate their ideas. IdeaValidator counteracts this using mathematical dampening:
- **Evidence Metrics**:
  - Word count targets per field.
  - Presence of concrete numbers, currency symbols, and metrics (`10k`, `20%`, `₹`, `$`).
  - Density of mechanism words (*because, converts, pipeline, automated, via, integrate*).
  - Domain vocabulary matching (`TECH_TERMS`, `PROBLEM_TERMS`, `CUSTOMER_TERMS`).
  - Penalties for filler and hype language (*"world's best", "revolutionary", "everyone needs", "guaranteed"*).
- **Slider Credibility Formula**:
  $$\text{credibility} = \text{credibilityFloor} + (1 - \text{credibilityFloor}) \times \frac{\text{evidence}}{100}$$
  $$\text{effectiveRating} = 50 + (\text{rawRating} - 50) \times \text{credibility} \times \text{maxTrust}$$
  *(Where `credibilityFloor = 0.35` and `maxTrust = 0.85`)*.
  If a pitch contains vague text, sliders set to 100 are automatically drawn back toward 50.

### 4.3 6-Dimension Weighted Scoring & Calibration (`features.ts`, `config.ts`, `scoring.ts`)
The final score is composed of 6 weighted dimensions:

| Dimension | Weight | Key Signals |
| :--- | :---: | :--- |
| **Market Demand** | 25% | Target market specificity, demand perception, geographic reach, physical location drivers |
| **Problem Fit** | 20% | Problem clarity, severity rating, frequency, customer persona definition |
| **Innovation & Moat**| 15% | Differentiator text specificity, tech depth, uniqueness against rivals |
| **Competition** | 15% | Named competitors, market saturation, barrier to entry, local rival distance |
| **Business Potential**| 15% | Monetization clarity, pricing model realism, business model viability |
| **Scalability** | 10% | Growth potential, fixed cost elasticity, operational leverage |

- **Score Calibration**:
  $$\text{Final Score} = 50 + (\text{rawComposite} - 47) \times 1.4$$
  Stretches scores across the full 0–100 scale, eliminating artificial clustering around 55–75.

- **Verdict Tiers**:
  - **Highly Promising**: $\ge 80$
  - **Promising**: $60 - 79$
  - **High Risk**: $40 - 59$
  - **Needs Major Improvement**: $< 40$

### 4.4 Machine Learning Consistency Check (`forest.ts`, `forest.json`)
- **Architecture**: A Random Forest Classifier with 64 decision trees and a max depth of 8.
- **Training Pipeline**: Trained in Python (`backend/ml/train.py`) on 4,000 synthetic startups (`data/synthetic_startups.csv`) matching the app's real feature distribution.
- **Inference**: The trees are serialized into `forest.json`. Node.js evaluates all 64 trees in pure TypeScript, computing class probabilities (`mlProba`) and confidence.
- **Consistency Verification**: Compares the rules-based verdict with the ML classification:
  - *Agrees*: Identical class.
  - *Close*: Off by 1 class tier.
  - *Differs*: Off by 2 or more classes.

### 4.5 Geospatial Intelligence (`lib/location/`)
- Integrates OpenStreetMap Overpass API queries within a configurable radius (e.g., 500m - 1500m).
- Analyzes competitor shops, housing footprints (`homes`, `unlabeledBuildings`), and traffic drivers (`schools`, `transit`, `offices`, `banks`).
- Server sanitizes raw coordinates and blends geospatial demand/competition into the final validation score (up to 25% blend).

### 4.6 Unit Economics Calculator
Founders can model financial projections directly on the results page:
- **Inputs**: Pricing, Cost of Goods Sold (COGS) / Cost to Serve, Customer Acquisition Cost (CAC), Monthly Churn %, Fixed Monthly Overhead.
- **Computed Metrics**:
  - Gross Margin %
  - Customer Lifetime (Months)
  - Customer Lifetime Value (LTV)
  - LTV : CAC Ratio (Flags warning if $< 3.0$)
  - CAC Payback Period (Months) (Flags warning if $> 12$ months)
  - Break-Even Customer Count
  - Estimated Monthly Net Profit

---

## 5. Report Deliverables & Features

Once validation completes, the founder receives:
1. **Interactive Results Dashboard**:
   - Speedometer gauge for overall score and verdict badge.
   - Spider/Radar dimension chart.
   - Comparative competitor analysis matrix.
   - Structured SWOT analysis (Strengths, Weaknesses, Opportunities, Threats).
   - Dynamic Risk Register with severity and mitigation strategies.
   - Phased execution roadmap (30-day, 60-day, 90-day milestones).
2. **Version History & Delta Tracking**:
   - Edits and re-runs create versioned records (`root_id`, `version`).
   - Comparison view shows exact score deltas across versions and flags if evaluated under different model versions (`MODEL_VERSION`).
3. **Private Shareable Link**:
   - Report owners can generate a secure, 192-bit tokenized URL (`/sample?share=<token>`).
   - Accessible read-only without authentication, protected with `noindex` headers.
4. **Export to Executive PDF**:
   - Generates multi-page vector PDF reports using `jspdf`.
   - Includes full score breakdowns, charts, unit economics, SWOT, and ASCII/SVG location sketches.
   - Unicode-safe text replacement prevents character corruption on standard PDF fonts.

---

## 6. Database Schema & Architecture

The database supports PostgreSQL (Neon in production, PGLite in development).

### Tables Summary

#### `startup_ideas`
Stores founder inputs and version metadata:
- `id` (PK, text/uuid)
- `user_id` (text, indexed)
- `root_id` (text, shared across revisions of the same idea)
- `version` (integer, starts at 1)
- `startup_name`, `description`, `industry`, `stage`
- `problem_statement`, `target_customer`, `problem_frequency`, `problem_severity`
- `target_market`, `geographic_market`, `estimated_customers`, `expected_pricing`, `demand_perception`
- `business_model`, `revenue_model`, `competitors` (json text), `differentiator`, `scalability`
- `location` (jsonb, raw OSM snapshot)
- `economics` (jsonb, unit economics assumptions)
- `is_demo` (boolean)
- `created_at` (timestamptz)

#### `analysis_results`
Stores computed metrics, scores, and serialized intelligence:
- `id` (PK, text/uuid)
- `startup_id` (FK -> `startup_ideas.id`, on delete cascade)
- `user_id` (text, indexed)
- Individual scores (0–100): `market_score`, `problem_fit_score`, `innovation_score`, `competition_score`, `business_score`, `scalability_score`, `customer_need_score`, `risk_score`, `final_score`
- `verdict` & `ml_prediction` (Needs Major Improvement | High Risk | Promising | Highly Promising)
- `ml_confidence` & `ml_proba` (class probabilities array)
- `model_version` (e.g., `2.1.0+5f8fb837`)
- `nlp_keywords`, `nlp_stats` (token counts, unique terms)
- `strengths`, `weaknesses`, `swot`, `risks`, `competitor_analysis`, `recommendations`, `next_steps`, `summary`, `explanations`
- `share_token` (text, unique nullable token)
- `created_at` (timestamptz)

#### `recommendations` & `reports`
- Normalized recommendation items and saved report titles.

### Atomic CTE Persistence (`saveIdeaWithAnalysis`)
To prevent orphaned ideas or inconsistent states during server connection pooling, saving ideas and analyses executes inside a **single SQL statement** using PostgreSQL Data-Modifying Common Table Expressions (`WITH ins_idea AS (...), ins_analysis AS (...) INSERT INTO ...`).

---

## 7. Directory Structure

```
├── backend/
│   ├── ml/
│   │   └── train.py               # Random Forest training script using scikit-learn
│   ├── nlp/
│   │   └── preprocess.py          # Python reference tokenizer and stopword pipeline
│   └── requirements.txt           # Python dependencies for retraining
├── data/
│   └── synthetic_startups.csv     # 4,000 simulated startups for ML model training
├── migrations/
│   ├── 0001_auth.sql              # Better Auth user/session tables
│   ├── 0002_schema.sql            # Core startup_ideas and analysis_results schema
│   └── 0003_analysis_extras.sql   # ML proba, location, economics, versioning, share tokens
├── public/                        # Static assets, PWA icons, brand media
├── scripts/
│   ├── browser-smoke.mjs          # Headless browser smoke test for mobile & desktop
│   ├── migrate.mjs                # Database migration runner
│   └── with-app-env.mjs           # Environment wrapper for Vite
├── src/
│   ├── components/
│   │   ├── brand/                 # Brand logos and banners
│   │   ├── layout/                # App shell, Navbar, Footer, Navigation
│   │   ├── map/                   # Leaflet map picker & Location Scout
│   │   ├── results/               # Report body, charts, SWOT matrix, Roadmap
│   │   ├── score/                 # Gauge and metric visualizers
│   │   └── ui/                    # Radix UI primitives (Dialog, Tabs, Slider, Button, etc.)
│   ├── lib/
│   │   ├── auth/                  # Better Auth configuration, hooks, middleware
│   │   ├── db.ts                  # Database client selector (Neon vs PGLite)
│   │   ├── engine/                # Core calculation engine
│   │   │   ├── analyze.ts         # Main analysis orchestration function
│   │   │   ├── config.ts          # Weights, calibration constants, thresholds
│   │   │   ├── demo.ts            # Synthetic data generation and sample ideas
│   │   │   ├── features.ts        # Feature extraction from raw inputs
│   │   │   ├── forest.ts          # Pure TypeScript Random Forest inference runner
│   │   │   ├── insights.ts        # SWOT, risk, recommendation, roadmap builders
│   │   │   ├── llm.ts             # Optional xAI/Grok enhancement with Zod validation
│   │   │   ├── nlp.ts             # Multilingual Unicode tokenizer and TF-IDF
│   │   │   ├── scoring.ts         # Final composite score calculation
│   │   │   ├── types.ts           # Central TypeScript types and interfaces
│   │   │   └── model/
│   │   │       ├── forest.json    # Exported 64-tree Random Forest model
│   │   │       └── metadata.json  # Model accuracy and training metrics
│   │   ├── location/              # Overpass API client and geospatial scoring
│   │   ├── pdf.ts                 # Vector PDF report generator
│   │   ├── pdf-text.ts            # Unicode-safe font sanitizer
│   │   ├── server/                # TanStack Start authenticated server functions
│   │   └── validation.ts          # Zod validation schemas for wizard inputs
│   ├── routes/
│   │   ├── __root.tsx             # Root HTML layout and providers
│   │   ├── index.tsx              # Public landing page
│   │   ├── login.tsx & signup.tsx # Authentication views
│   │   ├── methodology.tsx        # Scientific methodology and ML accuracy metrics
│   │   ├── sample.tsx             # Public sample / shared report view
│   │   └── app/
│   │       ├── index.tsx          # User dashboard and portfolio overview
│   │       ├── validate.tsx       # 6-step validation wizard
│   │       ├── results.$analysisId.tsx # Full validation report view
│   │       ├── processing.$analysisId.tsx # Animated analysis loading screen
│   │       ├── history.tsx        # Saved ideas list with search & filters
│   │       ├── compare.tsx        # Side-by-side comparison matrix
│   │       └── map.tsx            # Standalone location scout tool
│   ├── router.tsx                 # TanStack Router instance
│   └── styles.css                 # Tailwind CSS v4 design tokens and utilities
├── package.json                   # Dependencies and npm scripts
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite + TanStack Start configuration
```

---

## 8. Technology Stack Summary

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TanStack Start, TanStack Router |
| **Styling & Components**| Tailwind CSS v4, Radix UI, Lucide Icons, Motion (Framer), Vaul |
| **Data Visualization** | Recharts (Radar, Bar, Line), Custom SVG Gauges, Leaflet Maps |
| **State Management**   | Zustand, TanStack Query |
| **Authentication**     | Better Auth (Google OAuth, X/Twitter, Email/Password) |
| **Database**           | PostgreSQL (Neon in production, PGLite WASM in preview) |
| **NLP & Text Engine**  | TypeScript Offline NLP (Devanagari/English, TF-IDF) |
| **Machine Learning**   | scikit-learn (Training), TypeScript JSON Forest (Inference) |
| **Document Export**    | jsPDF (Custom vector formatting & Helvetica text safety) |
| **Type Safety**        | TypeScript 5.7, Zod v4 |

---

## 9. Development & Operational Commands

### Initial Setup
```bash
# Install Node.js dependencies
npm install

# Run database migrations
npm run db:migrate
```

### Running Locally
```bash
# Start development server on http://0.0.0.0:8080
npm run dev
```

### Testing & Validation
```bash
# Run unit & engine test suites
npm test

# Run static TypeScript type check
npm run typecheck

# Run linter
npm run lint
```

### Production Build & Preview
```bash
# Build production bundle
npm run build

# Preview production build locally on port 8081
npm run preview
```

### Retraining the Random Forest Model (Optional)
```bash
# 1. Regenerate 4,000 synthetic startups
node --experimental-strip-types --no-warnings -e \
  "import('./src/lib/engine/demo.ts').then(async m => process.stdout.write(await m.simulatedDatasetCsv(4000, 42)))" \
  > data/synthetic_startups.csv

# 2. Fit and export the Random Forest model
pip install -r backend/requirements.txt
python backend/ml/train.py
```
*(After retraining, bump `MODEL_VERSION` in `src/lib/engine/config.ts`).*

---

## 10. Security & Privacy Design

- **Row-Level User Isolation**: Every database query in `src/lib/server/startups.ts` is strictly scoped to the authenticated `user_id`.
- **Secretless Client**: API keys (such as `XAI_API_KEY` or `DATABASE_URL`) exist strictly in the server environment; client bundles only receive safe public state.
- **Sanitized Geospatial Queries**: Browser-submitted map coordinates are never trusted blindly; the server re-queries or sanitizes Overpass counts and computes distance matrices independently.
- **Defensive Error Boundaries**: Processing errors gracefully degrade with descriptive feedback and retry capabilities instead of application crashes.
