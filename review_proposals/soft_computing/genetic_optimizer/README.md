# Multi-Objective Genetic Algorithm for Scoring Parameter Calibration (Soft Computing Review Proposal)

## 1. Problem Statement
In `src/lib/engine/config.ts`:
- Six dimension weights (`SCORE_WEIGHTS`: 0.25, 0.20, 0.15, 0.15, 0.15, 0.10)
- Calibration parameters (`CALIBRATION`: center 47, gain 1.4)
- Self-rating trust parameters (`SELF_RATING`: floor 0.35, maxTrust 0.85)

These 10 parameters were manually chosen heuristics. When adjusting one parameter (e.g. increasing Problem Fit weight), it is easy to inadvertently distort tier separation or cause clustering in composite scores without empirical optimization.

## 2. Proposed Solution: Evolutionary Parameter Optimization
This proposal implements a **Constrained Multi-Objective Genetic Algorithm (GA)** to evolve optimal scoring parameters:
- **Chromosome Representation**: 10 real-valued genes encoding the 6 dimension weights and 4 calibration constants.
- **Simplex Boundary Constraints**: Automated weight normalization ensuring $\sum_{i=1}^6 w_i = 1.0$ and $w_i \ge 0.05$.
- **Fitness Objectives**:
  1. Penalizes benchmark order inversions (e.g., Fatal startup scoring higher than a Promising startup).
  2. Maximizes margin separation between distinct venture quality tiers.
  3. Maximizes score distribution standard deviation to prevent score compression.
- **Genetic Operators**:
  - Tournament Selection ($k=3$).
  - Blend Crossover (BLX-$\alpha$) with simplex projection.
  - Polynomial / Gaussian Mutation with boundary reflection.
  - Elitism ($K=2$) preserving top historical parameter sets.

## 3. Files in this Proposal
- `types.ts`: Chromosome interfaces, benchmark contracts, and configuration options.
- `operators.ts`: Simplex normalization, fitness evaluation, tournament selection, BLX crossover, and mutation.
- `optimizer.ts`: Evolutionary loop tracking generation-by-generation best and average fitness.
- `optimizer.test.ts`: Automated tests demonstrating convergence and benchmark constraint satisfaction.

## 4. How to Test Independently
Run the standalone test suite without modifying the running application:
```bash
node --experimental-strip-types --test review_proposals/soft_computing/genetic_optimizer/optimizer.test.ts
```

## 5. Potential Future Integration Point (Reference Only)
Can be executed as an offline CLI calibration utility whenever new benchmark startup profiles or synthetic calibration batches are generated. The output chromosome directly maps to `SCORE_WEIGHTS` and `CALIBRATION` in `src/lib/engine/config.ts`.
