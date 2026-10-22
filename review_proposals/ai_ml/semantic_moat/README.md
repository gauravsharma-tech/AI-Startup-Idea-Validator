# Semantic Moat & Competitor Overlap Engine (AI/ML Review Proposal)

## 1. Problem Statement
In the existing application (`src/lib/engine/features.ts` & `src/lib/engine/insights.ts`):
- Competitor impact is calculated primarily via list count (`nComp === 0 ? -10 : nComp <= 3 ? +6 : ...`).
- Competitor similarity in `buildCompetitors` is an arbitrary linear formula based on array position:
  ```ts
  similarity = 90 - (idx * 12) + (namedInText ? 10 : 0) - (diffSpec - 50) * 0.3
  ```
- Differentiator specificity is evaluated primarily by word count and keyword set matching (`diffSpec`).

This means the engine is **blind** to semantic collision. If a founder lists "Zepto" as a rival and claims their differentiator is "10-minute dark store grocery delivery", the existing engine gives them points for having a differentiator, even though their claimed moat directly collides with their rival's core value proposition.

## 2. Proposed Solution
This proposal implements a **Subword Shingle & Sparse Vector Space Model (VSM)** with:
- Combined word unigrams, bigrams, and character subwords (3-to-4 grams).
- Dynamic document frequency & smoothed BM25 IDF weighting.
- Sparse cosine vector similarity and Jaccard intersection-over-union.
- **Empirical Differentiator Moat Score (EDMS)**: Mathematically discounts differentiator strength by its direct vector collision against named competitors.
- **Zero runtime dependencies**: Pure TypeScript, runs natively in Node.js / TanStack Start server functions.

## 3. Files in this Proposal
- `types.ts`: Interface definitions for vectors, vocabularies, competitor profiles, and moat analysis.
- `vector_math.ts`: Sparse vector normalization, dot product, cosine similarity, and shingle extraction.
- `semantic_engine.ts`: Core engine orchestrating vocabulary building, vectorization, competitor threat categorization, and moat scoring.
- `semantic_engine.test.ts`: Standalone automated test suite.

## 4. How to Test Independently
Run the standalone test suite without modifying or touching the existing application:
```bash
node --experimental-strip-types --test review_proposals/ai_ml/semantic_moat/semantic_engine.test.ts
```

## 5. Potential Future Integration Point (Reference Only)
If approved in the future, this engine can be called within `extractScores` in `src/lib/engine/features.ts`:
```ts
// Example future integration (DO NOT APPLY NOW):
const moatEngine = new SemanticMoatEngine();
const moatAnalysis = moatEngine.analyze({
  startupName: input.startupName,
  description: input.description,
  targetMarket: input.targetMarket,
  differentiator: input.differentiator,
  competitors: input.competitors,
});
// Replace arbitrary list-based competition score with moatAnalysis.empiricalMoatScore
```
