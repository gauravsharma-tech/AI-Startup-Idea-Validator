/**
 * Standalone Unit Tests for Genetic Algorithm Parameter Optimizer.
 * Run directly with Node: `node --experimental-strip-types --test review_proposals/soft_computing/genetic_optimizer/optimizer.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { BenchmarkCase } from "./types.ts";
import { normalizeWeights, evaluateFitness } from "./operators.ts";
import { GeneticScoringOptimizer } from "./optimizer.ts";

const SAMPLE_BENCHMARKS: BenchmarkCase[] = [
  {
    id: "B1",
    name: "Catastrophic Idea",
    expectedTier: "Fatal",
    scores: {
      marketDemand: 15,
      problemFit: 10,
      innovation: 20,
      competition: 20,
      businessPotential: 15,
      scalability: 10,
    },
  },
  {
    id: "B2",
    name: "Struggling Copycat",
    expectedTier: "HighRisk",
    scores: {
      marketDemand: 45,
      problemFit: 40,
      innovation: 30,
      competition: 35,
      businessPotential: 40,
      scalability: 35,
    },
  },
  {
    id: "B3",
    name: "Solid Niche SaaS",
    expectedTier: "Promising",
    scores: {
      marketDemand: 68,
      problemFit: 72,
      innovation: 65,
      competition: 60,
      businessPotential: 70,
      scalability: 65,
    },
  },
  {
    id: "B4",
    name: "Breakthrough DeepTech",
    expectedTier: "HighlyPromising",
    scores: {
      marketDemand: 92,
      problemFit: 90,
      innovation: 95,
      competition: 88,
      businessPotential: 90,
      scalability: 94,
    },
  },
];

test("normalizeWeights ensures weights sum to exactly 1.0", () => {
  const [w1, w2, w3, w4, w5, w6] = normalizeWeights({
    wMarketDemand: 10,
    wProblemFit: 20,
    wInnovation: 30,
    wCompetition: 15,
    wBusinessPotential: 15,
    wScalability: 10,
  });

  const sum = w1 + w2 + w3 + w4 + w5 + w6;
  assert.ok(Math.abs(sum - 1.0) < 0.001, `Sum should be 1.0, got ${sum}`);
  assert.ok(w1 >= 0.05);
  assert.ok(w2 >= 0.05);
  assert.ok(w3 >= 0.05);
  assert.ok(w4 >= 0.05);
  assert.ok(w5 >= 0.05);
  assert.ok(w6 >= 0.05);
});

test("evaluateFitness penalizes inverted order and rewards correct tier separation", () => {
  // Good chromosome that scores higher on higher inputs
  const goodChromo = {
    wMarketDemand: 0.25,
    wProblemFit: 0.25,
    wInnovation: 0.15,
    wCompetition: 0.15,
    wBusinessPotential: 0.1,
    wScalability: 0.1,
    calibrationCenter: 47,
    calibrationGain: 1.4,
    credibilityFloor: 0.35,
    maxTrust: 0.85,
  };

  const goodResult = evaluateFitness(goodChromo, SAMPLE_BENCHMARKS);
  assert.equal(goodResult.metrics.benchmarkOrderLoss, 0);
  assert.ok(goodResult.fitness > 50);

  // Inverted / degenerate chromosome with negative gain causing high inverted penalty
  const badChromo = {
    ...goodChromo,
    calibrationGain: -1.0,
  };

  const badResult = evaluateFitness(badChromo, SAMPLE_BENCHMARKS);
  assert.ok(badResult.metrics.benchmarkOrderLoss > 0);
  assert.ok(badResult.fitness < goodResult.fitness);
});

test("GeneticScoringOptimizer converges and improves fitness over generations", () => {
  const optimizer = new GeneticScoringOptimizer(SAMPLE_BENCHMARKS, {
    populationSize: 25,
    generations: 10,
    crossoverRate: 0.8,
    mutationRate: 0.2,
    tournamentSize: 3,
    elitismCount: 2,
  });

  const summary = optimizer.run();

  assert.equal(summary.generationHistory.length, 10);
  const firstGenBest = summary.generationHistory[0].bestFitness;
  const lastGenBest = summary.generationHistory[9].bestFitness;

  // Best fitness must be non-decreasing due to elitism
  assert.ok(
    lastGenBest >= firstGenBest,
    `Final fitness (${lastGenBest}) should be >= first gen fitness (${firstGenBest})`,
  );

  const best = summary.bestIndividual.chromosome;
  const totalWeight =
    best.wMarketDemand +
    best.wProblemFit +
    best.wInnovation +
    best.wCompetition +
    best.wBusinessPotential +
    best.wScalability;

  assert.ok(Math.abs(totalWeight - 1.0) < 0.01);
  assert.equal(summary.bestIndividual.metrics.benchmarkOrderLoss, 0);
});
