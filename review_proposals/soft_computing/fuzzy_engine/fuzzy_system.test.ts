/**
 * Standalone Unit Tests for Mamdani Fuzzy Inference System.
 * Run directly with Node: `node --experimental-strip-types --test review_proposals/soft_computing/fuzzy_engine/fuzzy_system.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import { gaussian, sigmoidal, trapezoidal, triangular } from "./membership.ts";
import { createStartupFuzzyModel } from "./startup_fuzzy_model.ts";

test("Triangular membership function produces correct degrees", () => {
  const trimf = triangular(20, 50, 80);
  assert.equal(trimf(10), 0);
  assert.equal(trimf(20), 0);
  assert.equal(trimf(35), 0.5);
  assert.equal(trimf(50), 1.0);
  assert.equal(trimf(65), 0.5);
  assert.equal(trimf(80), 0);
  assert.equal(trimf(90), 0);
});

test("Trapezoidal membership function produces correct plateau and slopes", () => {
  const trapmf = trapezoidal(10, 30, 70, 90);
  assert.equal(trapmf(5), 0);
  assert.equal(trapmf(20), 0.5);
  assert.equal(trapmf(30), 1.0);
  assert.equal(trapmf(50), 1.0);
  assert.equal(trapmf(70), 1.0);
  assert.equal(trapmf(80), 0.5);
  assert.equal(trapmf(95), 0);
});

test("Gaussian and Sigmoidal membership functions evaluate within bounds [0, 1]", () => {
  const g = gaussian(50, 10);
  assert.equal(g(50), 1.0);
  assert.ok(g(40) > 0 && g(40) < 1.0);

  const s = sigmoidal(0.1, 50);
  assert.equal(s(50), 0.5);
  assert.ok(s(100) > 0.9);
  assert.ok(s(0) < 0.1);
});

test("Startup Fuzzy Model correctly identifies Fatal bottleneck", () => {
  const fuzzyModel = createStartupFuzzyModel();

  // Founder with poor problem fit (15/100) and thin market demand (20/100)
  const result = fuzzyModel.evaluate({
    ProblemFit: 15,
    MarketDemand: 20,
    CompetitionPressure: 80,
    MoatStrength: 10,
  });

  assert.ok(result.crispOutput <= 35, `Expected Fatal/Severe score (<=35), got: ${result.crispOutput}`);
  assert.ok(result.linguisticSummary.includes("Fatal"));
  assert.ok(result.ruleActivations.some((r) => r.ruleId === "R1" && r.firingStrength > 0.7));
});

test("Startup Fuzzy Model correctly scores Highly Viable opportunity", () => {
  const fuzzyModel = createStartupFuzzyModel();

  // Top decile idea: Strong problem fit (90), substantial demand (85), defensible moat (92), low competition (15)
  const result = fuzzyModel.evaluate({
    ProblemFit: 90,
    MarketDemand: 85,
    CompetitionPressure: 15,
    MoatStrength: 92,
  });

  assert.ok(result.crispOutput >= 75, `Expected Highly Viable score (>=75), got: ${result.crispOutput}`);
  assert.ok(result.linguisticSummary.includes("HighlyViable"));
  assert.ok(result.ruleActivations.some((r) => r.ruleId === "R8"));
});

test("Fuzzy system prevents compensatory deception (Bottleneck test)", () => {
  const fuzzyModel = createStartupFuzzyModel();

  // In a standard linear weighted sum, if Demand is 95 and ProblemFit is 90,
  // an idea could score > 70 even if Competition is Severe (90) and Moat is Weak (10).
  // The Fuzzy Model triggers Rule R2 (Severe Competition + Weak Moat -> Fatal):
  const result = fuzzyModel.evaluate({
    ProblemFit: 90,
    MarketDemand: 95,
    CompetitionPressure: 90,
    MoatStrength: 10,
  });

  // Because R2 fires with strength 1.0 towards "Fatal", the crisp centroid is dragged down significantly:
  assert.ok(result.crispOutput < 60, `Centroid score must be dampened by fatal competition bottleneck, got: ${result.crispOutput}`);
  assert.ok(result.ruleActivations.some((r) => r.ruleId === "R2" && r.firingStrength > 0.8));
});
