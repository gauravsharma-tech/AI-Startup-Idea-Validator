/**
 * Mamdani Fuzzy Inference System (FIS).
 * Implements Fuzzification, Rule Evaluation, Implication, Aggregation, and Defuzzification.
 */

import type { FuzzyRule, LinguisticVariable } from "./fuzzy_rule.ts";
import { evaluateAntecedent } from "./fuzzy_rule.ts";

export interface FuzzifiedState {
  [variableName: string]: {
    [termName: string]: number;
  };
}

export interface RuleActivation {
  readonly ruleId: string;
  readonly description?: string;
  readonly firingStrength: number;
  readonly consequentTerm: string;
}

export interface FuzzyInferenceResult {
  readonly crispOutput: number;
  readonly outputVariableName: string;
  readonly linguisticSummary: string;
  readonly ruleActivations: RuleActivation[];
  readonly fuzzifiedInputs: FuzzifiedState;
}

export type DefuzzificationMethod = "Centroid" | "MeanOfMaximum";

export class MamdaniFuzzySystem {
  private readonly inputVariables: Map<string, LinguisticVariable> = new Map();
  private outputVariable?: LinguisticVariable;
  private readonly rules: FuzzyRule[] = [];

  public addInputVariable(variable: LinguisticVariable): this {
    this.inputVariables.set(variable.name, variable);
    return this;
  }

  public setOutputVariable(variable: LinguisticVariable): this {
    this.outputVariable = variable;
    return this;
  }

  public addRule(rule: FuzzyRule): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Evaluates the degree of membership for all inputs across all linguistic terms.
   */
  public fuzzify(inputs: Record<string, number>): FuzzifiedState {
    const state: FuzzifiedState = {};

    for (const [varName, variable] of this.inputVariables.entries()) {
      const rawVal = inputs[varName];
      const val = rawVal !== undefined ? rawVal : variable.range[0];
      state[varName] = {};

      for (const [termName, membershipFn] of Object.entries(variable.terms)) {
        state[varName][termName] = membershipFn(val);
      }
    }

    return state;
  }

  /**
   * Executes the full Mamdani fuzzy inference pipeline.
   */
  public evaluate(
    inputs: Record<string, number>,
    defuzzMethod: DefuzzificationMethod = "Centroid",
    discretizationSteps = 200,
  ): FuzzyInferenceResult {
    if (!this.outputVariable) {
      throw new Error("Cannot evaluate Fuzzy System without an output variable defined.");
    }

    // Step 1: Fuzzify inputs
    const fuzzified = this.fuzzify(inputs);

    // Step 2: Evaluate all rules
    const activations: RuleActivation[] = [];
    const termMaxFiring: Record<string, number> = {};

    for (const rule of this.rules) {
      const strength = evaluateAntecedent(rule, fuzzified);
      if (strength > 0) {
        activations.push({
          ruleId: rule.id,
          description: rule.description,
          firingStrength: Number(strength.toFixed(4)),
          consequentTerm: rule.consequent.termName,
        });

        const currentMax = termMaxFiring[rule.consequent.termName] ?? 0;
        termMaxFiring[rule.consequent.termName] = Math.max(currentMax, strength);
      }
    }

    // Step 3 & 4: Implication & Aggregation across discretized output domain
    const [yMin, yMax] = this.outputVariable.range;
    const stepSize = (yMax - yMin) / discretizationSteps;

    const yPoints: number[] = [];
    const muAgg: number[] = [];

    for (let i = 0; i <= discretizationSteps; i++) {
      const y = yMin + i * stepSize;
      yPoints.push(y);

      // Max aggregation of clipped consequences: mu_agg(y) = max_k (min(alpha_k, mu_k(y)))
      let aggregatedMu = 0;
      for (const [termName, alpha] of Object.entries(termMaxFiring)) {
        const termFn = this.outputVariable.terms[termName];
        if (termFn) {
          const rawMembership = termFn(y);
          const clipped = Math.min(alpha, rawMembership);
          if (clipped > aggregatedMu) {
            aggregatedMu = clipped;
          }
        }
      }
      muAgg.push(aggregatedMu);
    }

    // Step 5: Defuzzification
    let crispOutput = 0;
    if (defuzzMethod === "Centroid") {
      crispOutput = this.defuzzifyCentroid(yPoints, muAgg, stepSize, yMin, yMax);
    } else {
      crispOutput = this.defuzzifyMeanOfMax(yPoints, muAgg);
    }

    // Linguistic summary of the highest firing consequent
    let bestTerm = "Neutral";
    let bestTermVal = -1;
    for (const [term, val] of Object.entries(termMaxFiring)) {
      if (val > bestTermVal) {
        bestTermVal = val;
        bestTerm = term;
      }
    }

    const linguisticSummary =
      activations.length === 0
        ? "No fuzzy rules triggered (inputs in edge undefined region)."
        : `Dominant linguistic classification is '${bestTerm}' with max firing strength ${(bestTermVal * 100).toFixed(1)}%.`;

    return {
      crispOutput: Number(crispOutput.toFixed(2)),
      outputVariableName: this.outputVariable.name,
      linguisticSummary,
      ruleActivations: activations.sort((a, b) => b.firingStrength - a.firingStrength),
      fuzzifiedInputs: fuzzified,
    };
  }

  private defuzzifyCentroid(
    y: number[],
    mu: number[],
    stepSize: number,
    yMin: number,
    yMax: number,
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < y.length; i++) {
      numerator += y[i] * mu[i] * stepSize;
      denominator += mu[i] * stepSize;
    }

    // Default to domain midpoint if no rules fired
    if (denominator <= 0.00001) {
      return (yMin + yMax) / 2.0;
    }

    return numerator / denominator;
  }

  private defuzzifyMeanOfMax(y: number[], mu: number[]): number {
    let maxMu = -1;
    for (const m of mu) {
      if (m > maxMu) maxMu = m;
    }

    if (maxMu <= 0.0001) {
      return (y[0] + y[y.length - 1]) / 2.0;
    }

    const peakY: number[] = [];
    for (let i = 0; i < y.length; i++) {
      if (Math.abs(mu[i] - maxMu) < 0.001) {
        peakY.push(y[i]);
      }
    }

    return peakY.reduce((a, b) => a + b, 0) / peakY.length;
  }
}
