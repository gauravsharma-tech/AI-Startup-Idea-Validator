/**
 * Types and interfaces for the Genetic Algorithm Parameter Optimizer.
 */

export interface ScoringGeneChromosome {
  // Dimension weights (must sum to 1.0)
  readonly wMarketDemand: number;
  readonly wProblemFit: number;
  readonly wInnovation: number;
  readonly wCompetition: number;
  readonly wBusinessPotential: number;
  readonly wScalability: number;

  // Calibration parameters
  readonly calibrationCenter: number; // typically 40 to 55
  readonly calibrationGain: number;   // typically 1.0 to 2.0
  readonly credibilityFloor: number;  // typically 0.2 to 0.5
  readonly maxTrust: number;          // typically 0.7 to 0.95
}

export interface BenchmarkCase {
  readonly id: string;
  readonly name: string;
  readonly expectedTier: "Fatal" | "HighRisk" | "Promising" | "HighlyPromising";
  readonly scores: {
    marketDemand: number;
    problemFit: number;
    innovation: number;
    competition: number;
    businessPotential: number;
    scalability: number;
  };
}

export interface Individual {
  readonly chromosome: ScoringGeneChromosome;
  fitness: number;
  readonly metrics: {
    readonly benchmarkOrderLoss: number;
    readonly distributionEntropy: number;
    readonly marginSeparation: number;
  };
}

export interface GeneticAlgorithmConfig {
  readonly populationSize: number;
  readonly generations: number;
  readonly crossoverRate: number;
  readonly mutationRate: number;
  readonly mutationScale: number;
  readonly tournamentSize: number;
  readonly elitismCount: number;
}
