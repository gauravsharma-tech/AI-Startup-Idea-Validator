/**
 * Genetic Operators: Initialization, Selection, Crossover, and Mutation.
 */

import type {
  BenchmarkCase,
  Individual,
  ScoringGeneChromosome,
} from "./types.ts";

/**
 * Normalizes dimension weights so they sum strictly to 1.0 and each is >= 0.05.
 */
export function normalizeWeights(genes: {
  wMarketDemand: number;
  wProblemFit: number;
  wInnovation: number;
  wCompetition: number;
  wBusinessPotential: number;
  wScalability: number;
}): [number, number, number, number, number, number] {
  const minBound = 0.05;
  const raw = [
    Math.max(minBound, genes.wMarketDemand),
    Math.max(minBound, genes.wProblemFit),
    Math.max(minBound, genes.wInnovation),
    Math.max(minBound, genes.wCompetition),
    Math.max(minBound, genes.wBusinessPotential),
    Math.max(minBound, genes.wScalability),
  ];
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => Number((w / sum).toFixed(4))) as [number, number, number, number, number, number];
}

export function createRandomChromosome(): ScoringGeneChromosome {
  const [w1, w2, w3, w4, w5, w6] = normalizeWeights({
    wMarketDemand: Math.random() + 0.1,
    wProblemFit: Math.random() + 0.1,
    wInnovation: Math.random() + 0.1,
    wCompetition: Math.random() + 0.1,
    wBusinessPotential: Math.random() + 0.1,
    wScalability: Math.random() + 0.1,
  });

  return {
    wMarketDemand: w1,
    wProblemFit: w2,
    wInnovation: w3,
    wCompetition: w4,
    wBusinessPotential: w5,
    wScalability: w6,
    calibrationCenter: Number((40 + Math.random() * 15).toFixed(2)),
    calibrationGain: Number((1.1 + Math.random() * 0.7).toFixed(2)),
    credibilityFloor: Number((0.25 + Math.random() * 0.2).toFixed(2)),
    maxTrust: Number((0.75 + Math.random() * 0.2).toFixed(2)),
  };
}

/**
 * Evaluates an individual's chromosome against a set of ordered benchmark startup cases.
 * Objective:
 *  1. Penalize inverted ordering (e.g., Fatal startup scoring higher than Promising startup).
 *  2. Reward margin separation between tiers.
 *  3. Reward calibration spread across 0–100.
 */
export function evaluateFitness(
  chromosome: ScoringGeneChromosome,
  benchmarks: BenchmarkCase[],
): Individual {
  const evaluateScore = (scores: BenchmarkCase["scores"]) => {
    const raw =
      scores.marketDemand * chromosome.wMarketDemand +
      scores.problemFit * chromosome.wProblemFit +
      scores.innovation * chromosome.wInnovation +
      scores.competition * chromosome.wCompetition +
      scores.businessPotential * chromosome.wBusinessPotential +
      scores.scalability * chromosome.wScalability;

    const calibrated = 50 + (raw - chromosome.calibrationCenter) * chromosome.calibrationGain;
    return Math.max(0, Math.min(100, calibrated));
  };

  const results = benchmarks.map((b) => ({
    id: b.id,
    expectedTier: b.expectedTier,
    score: evaluateScore(b.scores),
  }));

  // Expected tier order: Fatal (0) < HighRisk (1) < Promising (2) < HighlyPromising (3)
  const tierOrder: Record<BenchmarkCase["expectedTier"], number> = {
    Fatal: 0,
    HighRisk: 1,
    Promising: 2,
    HighlyPromising: 3,
  };

  let orderLoss = 0;
  let totalMargin = 0;

  for (let i = 0; i < results.length - 1; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const itemA = results[i];
      const itemB = results[j];
      const tierA = tierOrder[itemA.expectedTier];
      const tierB = tierOrder[itemB.expectedTier];

      if (tierA < tierB) {
        if (itemA.score >= itemB.score) {
          // Severe penalty for inversion
          orderLoss += (itemA.score - itemB.score + 10) * 5;
        } else {
          // Margin reward
          totalMargin += itemB.score - itemA.score;
        }
      }
    }
  }

  // Distribution spread metric: standard deviation of scores
  const meanScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
  const variance =
    results.reduce((acc, r) => acc + Math.pow(r.score - meanScore, 2), 0) / results.length;
  const spreadStdDev = Math.sqrt(variance);

  // Composite Fitness (Higher is better)
  const fitness = Number((totalMargin * 1.5 + spreadStdDev * 2.0 - orderLoss * 10).toFixed(2));

  return {
    chromosome,
    fitness,
    metrics: {
      benchmarkOrderLoss: orderLoss,
      distributionEntropy: Number(spreadStdDev.toFixed(2)),
      marginSeparation: Number(totalMargin.toFixed(2)),
    },
  };
}

/**
 * Tournament Selection: Selects the best individual from a random subset.
 */
export function tournamentSelect(population: Individual[], tournamentSize: number): Individual {
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Blend Crossover (BLX-alpha) with simplex weight normalization.
 */
export function blendCrossover(
  p1: ScoringGeneChromosome,
  p2: ScoringGeneChromosome,
  alpha = 0.2,
): ScoringGeneChromosome {
  const blend = (v1: number, v2: number, min: number, max: number) => {
    const d = Math.abs(v1 - v2);
    const low = Math.min(v1, v2) - alpha * d;
    const high = Math.max(v1, v2) + alpha * d;
    return Math.max(min, Math.min(max, low + Math.random() * (high - low)));
  };

  const [w1, w2, w3, w4, w5, w6] = normalizeWeights({
    wMarketDemand: blend(p1.wMarketDemand, p2.wMarketDemand, 0.05, 0.5),
    wProblemFit: blend(p1.wProblemFit, p2.wProblemFit, 0.05, 0.5),
    wInnovation: blend(p1.wInnovation, p2.wInnovation, 0.05, 0.5),
    wCompetition: blend(p1.wCompetition, p2.wCompetition, 0.05, 0.5),
    wBusinessPotential: blend(p1.wBusinessPotential, p2.wBusinessPotential, 0.05, 0.5),
    wScalability: blend(p1.wScalability, p2.wScalability, 0.05, 0.5),
  });

  return {
    wMarketDemand: w1,
    wProblemFit: w2,
    wInnovation: w3,
    wCompetition: w4,
    wBusinessPotential: w5,
    wScalability: w6,
    calibrationCenter: Number(blend(p1.calibrationCenter, p2.calibrationCenter, 40, 55).toFixed(2)),
    calibrationGain: Number(blend(p1.calibrationGain, p2.calibrationGain, 1.0, 2.0).toFixed(2)),
    credibilityFloor: Number(blend(p1.credibilityFloor, p2.credibilityFloor, 0.2, 0.5).toFixed(2)),
    maxTrust: Number(blend(p1.maxTrust, p2.maxTrust, 0.7, 0.95).toFixed(2)),
  };
}

/**
 * Polynomial / Gaussian Mutation with bound enforcement.
 */
export function mutateChromosome(
  parent: ScoringGeneChromosome,
  mutationScale = 0.1,
): ScoringGeneChromosome {
  const perturb = (val: number, min: number, max: number) => {
    const delta = (Math.random() - 0.5) * 2 * mutationScale * (max - min);
    return Math.max(min, Math.min(max, val + delta));
  };

  const [w1, w2, w3, w4, w5, w6] = normalizeWeights({
    wMarketDemand: perturb(parent.wMarketDemand, 0.05, 0.5),
    wProblemFit: perturb(parent.wProblemFit, 0.05, 0.5),
    wInnovation: perturb(parent.wInnovation, 0.05, 0.5),
    wCompetition: perturb(parent.wCompetition, 0.05, 0.5),
    wBusinessPotential: perturb(parent.wBusinessPotential, 0.05, 0.5),
    wScalability: perturb(parent.wScalability, 0.05, 0.5),
  });

  return {
    wMarketDemand: w1,
    wProblemFit: w2,
    wInnovation: w3,
    wCompetition: w4,
    wBusinessPotential: w5,
    wScalability: w6,
    calibrationCenter: Number(perturb(parent.calibrationCenter, 40, 55).toFixed(2)),
    calibrationGain: Number(perturb(parent.calibrationGain, 1.0, 2.0).toFixed(2)),
    credibilityFloor: Number(perturb(parent.credibilityFloor, 0.2, 0.5).toFixed(2)),
    maxTrust: Number(perturb(parent.maxTrust, 0.7, 0.95).toFixed(2)),
  };
}
