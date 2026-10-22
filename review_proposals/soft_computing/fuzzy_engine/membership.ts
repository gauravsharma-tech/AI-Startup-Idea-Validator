/**
 * Fuzzy Membership Functions for Soft Computing.
 * Provides mathematical representations of linguistic uncertainty.
 */

export type MembershipFunction = (x: number) => number;

/**
 * Standard Triangular Membership Function: trimf(x; a, b, c)
 * Parameters:
 *   a: Left foot (membership = 0)
 *   b: Peak / Center (membership = 1)
 *   c: Right foot (membership = 0)
 */
export function triangular(a: number, b: number, c: number): MembershipFunction {
  if (a > b || b > c) {
    throw new Error(`Invalid triangular bounds: a (${a}) <= b (${b}) <= c (${c}) required.`);
  }

  return (x: number): number => {
    if (x <= a || x >= c) return 0;
    if (x === b) return 1;
    if (x > a && x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  };
}

/**
 * Trapezoidal Membership Function: trapmf(x; a, b, c, d)
 * Parameters:
 *   a: Left foot (0)
 *   b: Left shoulder (1)
 *   c: Right shoulder (1)
 *   d: Right foot (0)
 */
export function trapezoidal(a: number, b: number, c: number, d: number): MembershipFunction {
  if (a > b || b > c || c > d) {
    throw new Error(`Invalid trapezoidal bounds: a (${a}) <= b (${b}) <= c (${c}) <= d (${d}) required.`);
  }

  return (x: number): number => {
    if (x <= a || x >= d) return 0;
    if (x >= b && x <= c) return 1;
    if (x > a && x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
  };
}

/**
 * Gaussian Membership Function: gaussmf(x; mean, sigma)
 * Parameters:
 *   mean: Center of maximum membership (1.0)
 *   sigma: Standard deviation controlling width/spread
 */
export function gaussian(mean: number, sigma: number): MembershipFunction {
  if (sigma <= 0) {
    throw new Error(`Sigma must be strictly positive: got ${sigma}`);
  }

  return (x: number): number => {
    const diff = x - mean;
    return Math.exp(-0.5 * Math.pow(diff / sigma, 2));
  };
}

/**
 * Sigmoidal Membership Function: sigmf(x; a, c)
 * Useful for monotonic concepts like "Very High" or "Critical".
 * Parameters:
 *   a: Slope parameter (positive for ascending, negative for descending)
 *   c: Inflection point where membership is 0.5
 */
export function sigmoidal(a: number, c: number): MembershipFunction {
  return (x: number): number => {
    return 1.0 / (1.0 + Math.exp(-a * (x - c)));
  };
}
