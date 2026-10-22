/**
 * Standalone Unit Tests for Semantic Moat Engine.
 * Run directly with Node: `node --experimental-strip-types --test review_proposals/ai_ml/semantic_moat/semantic_engine.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import { SemanticMoatEngine } from "./semantic_engine.ts";
import { cosineSimilarity, extractShingles, jaccardSimilarity } from "./vector_math.ts";

test("extractShingles returns correct n-grams", () => {
  const text = "SaaS AI";
  const shingles = extractShingles(text, 3, 3);
  // "saas" -> ["saa", "aas"]
  // "ai" has length 2 < 3, so stays as "ai"
  assert.ok(shingles.includes("saa"));
  assert.ok(shingles.includes("aas"));
  assert.ok(shingles.includes("ai"));
});

test("cosineSimilarity returns 1.0 for identical unit vectors and 0 for orthogonal", () => {
  const v1 = { indices: [0, 1], values: [0.6, 0.8], magnitude: 1.0 };
  const v2 = { indices: [0, 1], values: [0.6, 0.8], magnitude: 1.0 };
  const vOrthogonal = { indices: [2, 3], values: [0.6, 0.8], magnitude: 1.0 };

  const simIdentical = cosineSimilarity(v1, v2);
  const simZero = cosineSimilarity(v1, vOrthogonal);

  assert.equal(Math.round(simIdentical * 100) / 100, 1.0);
  assert.equal(simZero, 0.0);
});

test("jaccardSimilarity calculates proper intersection over union", () => {
  const s1 = ["foo", "bar", "baz"];
  const s2 = ["bar", "baz", "qux"];
  // Intersection = 2, Union = 4 -> 0.5
  assert.equal(jaccardSimilarity(s1, s2), 0.5);
});

test("SemanticMoatEngine identifies severe competitor collision", () => {
  const engine = new SemanticMoatEngine();

  const result = engine.analyze({
    startupName: "FastDeliver",
    description: "Hyperlocal 10-minute grocery delivery app connecting dark stores with local customers.",
    targetMarket: "Urban metro residents needing instant essentials.",
    differentiator: "Proprietary 10-minute dark store dispatch algorithm and electric delivery fleet.",
    competitors: [
      "Blinkit 10-minute grocery delivery",
      "Zepto dark store instant dispatch",
      "Swiggy Instamart quick delivery",
    ],
  });

  assert.ok(result.competitorProfiles.length === 3);
  assert.ok(result.maxCompetitorCollision > 0.2);
  assert.ok(result.averageCompetitorOverlap > 0.10);
  // Moat classification should not be "Defensible" when directly colliding with Zepto/Blinkit dark stores
  assert.notEqual(result.moatClassification, "Defensible");
});

test("SemanticMoatEngine rewards genuine unique differentiation", () => {
  const engine = new SemanticMoatEngine();

  const result = engine.analyze({
    startupName: "BioSift",
    description: "AI-driven micro-protein folding analysis for rural diagnostic laboratories.",
    targetMarket: "Tier-3 diagnostic centers and community clinics.",
    differentiator: "Patented microfluidic optical sensor operating at 0.01 nanometer resolution with zero internet connectivity required.",
    competitors: ["Standard pathology labs", "Quest Diagnostics"],
  });

  assert.ok(result.differentiatorSpecificityScore >= 50);
  // The competitor names don't collide with the microfluidic sensor differentiator
  assert.ok(result.maxCompetitorCollision < 0.2);
  assert.ok(result.empiricalMoatScore >= 50);
});

test("SemanticMoatEngine handles empty competitor list gracefully", () => {
  const engine = new SemanticMoatEngine();

  const result = engine.analyze({
    startupName: "SoloIdea",
    description: "A new language learning app for classical Sanskrit.",
    targetMarket: "Scholars and university students.",
    differentiator: "Proprietary morphological parser for Vedic grammar.",
    competitors: [],
  });

  assert.equal(result.competitorProfiles.length, 0);
  assert.equal(result.averageCompetitorOverlap, 0);
  assert.ok(result.empiricalMoatScore > 0);
  assert.ok(result.explanation.includes("No competitors were supplied"));
});
