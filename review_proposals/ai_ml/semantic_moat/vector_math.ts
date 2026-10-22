/**
 * Vector Math and Sparse Linear Algebra utilities for NLP vector representations.
 * Implemented in pure TypeScript without native dependencies.
 */

import type { Vector, Vocabulary } from "./types.ts";

/**
 * Extracts character n-grams (shingles) from text.
 * e.g., "hyperlocal" with n=3 -> ["hyp", "ype", "per", "erl", "rlo", "loc", "oca", "cal"]
 * Subword shingles bridge typos, brand names, and compound terminology without a heavy deep learning model.
 */
export function extractShingles(text: string, minN = 3, maxN = 4): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const shingles: string[] = [];

  // 1. Include whole word unigrams (highest semantic weight)
  for (const token of tokens) {
    shingles.push(token);
  }

  // 2. Include word bigrams (phrases like "dark store", "10 minute")
  for (let i = 0; i < tokens.length - 1; i++) {
    shingles.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  // 3. Include character n-grams for subword matching
  for (const token of tokens) {
    if (token.length >= minN) {
      for (let n = minN; n <= Math.min(maxN, token.length); n++) {
        for (let i = 0; i <= token.length - n; i++) {
          shingles.push(token.slice(i, i + n));
        }
      }
    }
  }

  return shingles;
}

/**
 * Builds a dynamic vocabulary and calculates Inverse Document Frequency (IDF)
 * using the standard BM25/smooth IDF formula: idf = ln((N - n + 0.5) / (n + 0.5) + 1.0)
 */
export function buildVocabulary(corpus: string[][]): Vocabulary {
  const tokenToIndex = new Map<string, number>();
  const docFreq = new Map<string, number>();
  const totalDocuments = corpus.length;

  for (const doc of corpus) {
    const seenInDoc = new Set<string>();
    for (const term of doc) {
      if (!tokenToIndex.has(term)) {
        tokenToIndex.set(term, tokenToIndex.size);
      }
      seenInDoc.add(term);
    }
    for (const term of seenInDoc) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const idf: number[] = new Array(tokenToIndex.size);
  for (const [term, index] of tokenToIndex.entries()) {
    const df = docFreq.get(term) ?? 0;
    // Smoothed logarithmic IDF
    idf[index] = Math.log((totalDocuments - df + 0.5) / (df + 0.5) + 1.0);
  }

  return {
    tokenToIndex,
    idf,
    totalDocuments,
  };
}

/**
 * Transforms a list of terms into a sparse TF-IDF vector with L2 normalization.
 */
export function vectorize(terms: string[], vocab: Vocabulary): Vector {
  const termCounts = new Map<number, number>();
  for (const term of terms) {
    const idx = vocab.tokenToIndex.get(term);
    if (idx !== undefined) {
      termCounts.set(idx, (termCounts.get(idx) ?? 0) + 1);
    }
  }

  const sortedEntries = Array.from(termCounts.entries()).sort((a, b) => a[0] - b[0]);
  const indices: number[] = [];
  const values: number[] = [];
  let sumSquares = 0;

  for (const [idx, count] of sortedEntries) {
    // Sublinear TF scaling: 1 + ln(count)
    const tf = 1 + Math.log(count);
    const weight = tf * (vocab.idf[idx] ?? 1.0);
    indices.push(idx);
    values.push(weight);
    sumSquares += weight * weight;
  }

  const magnitude = Math.sqrt(sumSquares);

  // Normalize to unit vector for fast cosine similarity via dot product
  if (magnitude > 0) {
    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] / magnitude;
    }
  }

  return { indices, values, magnitude };
}

/**
 * Computes Cosine Similarity between two sparse vectors in O(n1 + n2) time.
 * Returns a value in [0.0, 1.0].
 */
export function cosineSimilarity(v1: Vector, v2: Vector): number {
  if (v1.values.length === 0 || v2.values.length === 0) return 0;

  let i = 0;
  let j = 0;
  let dotProduct = 0;

  while (i < v1.indices.length && j < v2.indices.length) {
    const idx1 = v1.indices[i];
    const idx2 = v2.indices[j];

    if (idx1 === idx2) {
      dotProduct += v1.values[i] * v2.values[j];
      i++;
      j++;
    } else if (idx1 < idx2) {
      i++;
    } else {
      j++;
    }
  }

  return Math.min(1.0, Math.max(0.0, dotProduct));
}

/**
 * Computes Jaccard Similarity between two sets of shingles.
 */
export function jaccardSimilarity(s1: string[], s2: string[]): number {
  if (s1.length === 0 && s2.length === 0) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const set1 = new Set(s1);
  const set2 = new Set(s2);

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
