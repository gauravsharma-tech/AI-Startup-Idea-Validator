/**
 * Genetic Algorithm Evolutionary Loop for Parameter Calibration.
 */

import type {
  BenchmarkCase,
  GeneticAlgorithmConfig,
  Individual,
  ScoringGeneChromosome,
} from "./types.ts";
import {
  blendCrossover,
  createRandomChromosome,
  evaluateFitness,
  mutateChromosome,
  tournamentSelect,
} from "./operators.ts";

export interface EvolutionSummary {
  readonly bestIndividual: Individual;
  readonly generationHistory: {
    readonly generation: number;
    readonly bestFitness: number;
    readonly avgFitness: number;
  }[];
}

export const DEFAULT_GA_CONFIG: GeneticAlgorithmConfig = {
  populationSize: 40,
  generations: 25,
  crossoverRate: 0.8,
  mutationRate: 0.15,
  mutationScale: 0.12,
  tournamentSize: 3,
  elitismCount: 2,
};

export class GeneticScoringOptimizer {
  private readonly config: GeneticAlgorithmConfig;
  private readonly benchmarks: BenchmarkCase[];

  constructor(benchmarks: BenchmarkCase[], config: Partial<GeneticAlgorithmConfig> = {}) {
    if (benchmarks.length < 2) {
      throw new Error("Optimizer requires at least 2 benchmark cases to evaluate order.");
    }
    this.benchmarks = benchmarks;
    this.config = { ...DEFAULT_GA_CONFIG, ...config };
  }

  public run(): EvolutionSummary {
    // 1. Initialize random population
    let population: Individual[] = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      const chromo = createRandomChromosome();
      population.push(evaluateFitness(chromo, this.benchmarks));
    }

    const history: EvolutionSummary["generationHistory"] = [];

    // 2. Evolutionary Generations
    for (let gen = 1; gen <= this.config.generations; gen++) {
      // Sort descending by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      const bestFitness = population[0].fitness;
      const totalFitness = population.reduce((acc, ind) => acc + ind.fitness, 0);
      const avgFitness = Number((totalFitness / population.length).toFixed(2));

      history.push({
        generation: gen,
        bestFitness,
        avgFitness,
      });

      // Elitism: carry forward the top N individuals
      const nextGen: Individual[] = population.slice(0, this.config.elitismCount);

      // Reproduce until next generation is full
      while (nextGen.length < this.config.populationSize) {
        const parentA = tournamentSelect(population, this.config.tournamentSize);
        const parentB = tournamentSelect(population, this.config.tournamentSize);

        let childChromo: ScoringGeneChromosome;
        if (Math.random() < this.config.crossoverRate) {
          childChromo = blendCrossover(parentA.chromosome, parentB.chromosome);
        } else {
          childChromo = { ...parentA.chromosome };
        }

        if (Math.random() < this.config.mutationRate) {
          childChromo = mutateChromosome(childChromo, this.config.mutationScale);
        }

        nextGen.push(evaluateFitness(childChromo, this.benchmarks));
      }

      population = nextGen;
    }

    population.sort((a, b) => b.fitness - a.fitness);

    return {
      bestIndividual: population[0],
      generationHistory: history,
    };
  }
}
