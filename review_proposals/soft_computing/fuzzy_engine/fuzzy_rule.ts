/**
 * Fuzzy Linguistic Variables and Rule Representations.
 */

import type { MembershipFunction } from "./membership.ts";

export interface LinguisticVariable {
  readonly name: string;
  readonly range: [number, number]; // [min, max]
  readonly terms: Record<string, MembershipFunction>;
}

export interface FuzzyCondition {
  readonly variableName: string;
  readonly termName: string;
  readonly isNot?: boolean;
}

export type LogicalOperator = "AND" | "OR";

export interface FuzzyRule {
  readonly id: string;
  readonly description?: string;
  readonly antecedents: FuzzyCondition[];
  readonly operator: LogicalOperator;
  readonly consequent: {
    readonly variableName: string;
    readonly termName: string;
  };
  readonly weight?: number; // Rule firing multiplier (0.0 to 1.0, default 1.0)
}

/**
 * Evaluates the activation degree of a rule's antecedent given the fuzzified inputs.
 * Uses Zadeh T-norm (MIN) for AND and S-norm (MAX) for OR.
 */
export function evaluateAntecedent(
  rule: FuzzyRule,
  inputMemberships: Record<string, Record<string, number>>,
): number {
  if (rule.antecedents.length === 0) return 0;

  const degrees: number[] = [];

  for (const condition of rule.antecedents) {
    const varTerms = inputMemberships[condition.variableName];
    if (!varTerms) {
      throw new Error(`Input variable '${condition.variableName}' has not been evaluated.`);
    }

    let degree = varTerms[condition.termName];
    if (degree === undefined) {
      throw new Error(
        `Linguistic term '${condition.termName}' does not exist on variable '${condition.variableName}'.`,
      );
    }

    if (condition.isNot) {
      degree = 1.0 - degree;
    }

    degrees.push(degree);
  }

  let rawFiringStrength = 0;
  if (rule.operator === "AND") {
    // Mamdani T-norm: Minimum
    rawFiringStrength = Math.min(...degrees);
  } else {
    // Mamdani S-norm: Maximum
    rawFiringStrength = Math.max(...degrees);
  }

  const weight = rule.weight ?? 1.0;
  return Math.max(0, Math.min(1.0, rawFiringStrength * weight));
}
