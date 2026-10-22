# IdeaValidator AI & Soft Computing Review Proposals

This directory contains **isolated, reviewable source code proposals** for advanced AI/ML and Soft Computing capabilities.

> **CRITICAL ARCHITECTURAL ISOLATION NOTICE**:
> None of the code in `review_proposals/` is connected to, imported by, or active within the running application.
> No existing files or project behavior have been changed.
> All code is standalone, fully typed, tested, and ready for code review.

---

## Proposal Directory Structure

```
review_proposals/
├── ai_ml/
│   └── semantic_moat/
│       ├── types.ts                   # Vector, vocabulary, and competitor profile types
│       ├── vector_math.ts             # Sparse TF-IDF, cosine similarity, subword shingles
│       ├── semantic_engine.ts         # Empirical Differentiator Moat Score (EDMS) engine
│       ├── semantic_engine.test.ts    # Automated test suite (6 tests passing)
│       └── README.md                  # Detailed walkthrough & standalone test guide
└── soft_computing/
    ├── fuzzy_engine/
    │   ├── membership.ts              # Triangular, Trapezoidal, Gaussian, Sigmoidal functions
    │   ├── fuzzy_rule.ts              # Linguistic variables, terms, T-norm & S-norm operators
    │   ├── fuzzy_system.ts            # Mamdani inference engine with Centroid defuzzifier
    │   ├── startup_fuzzy_model.ts     # Pre-calibrated 9-rule startup bottleneck model
    │   ├── fuzzy_system.test.ts       # Automated test suite (6 tests passing)
    │   └── README.md                  # Detailed walkthrough & standalone test guide
    └── genetic_optimizer/
        ├── types.ts                   # Chromosome, benchmark, and GA config types
        ├── operators.ts               # Simplex normalization, tournament selection, BLX crossover, mutation
        ├── optimizer.ts               # Evolutionary loop with elitism
        ├── optimizer.test.ts          # Automated test suite (3 tests passing)
        └── README.md                  # Detailed walkthrough & standalone test guide
```

---

## Quick Standalone Test Execution

You can run all proposal test suites in parallel directly with Node.js:

```bash
# 1. Test Semantic Moat Engine (AI/ML)
node --experimental-strip-types --test review_proposals/ai_ml/semantic_moat/semantic_engine.test.ts

# 2. Test Mamdani Fuzzy System (Soft Computing)
node --experimental-strip-types --test review_proposals/soft_computing/fuzzy_engine/fuzzy_system.test.ts

# 3. Test Genetic Algorithm Parameter Optimizer (Soft Computing)
node --experimental-strip-types --test review_proposals/soft_computing/genetic_optimizer/optimizer.test.ts
```
