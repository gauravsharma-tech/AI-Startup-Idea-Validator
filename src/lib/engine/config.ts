import { ML_CLASS_NAMES, type MlClass, type Verdict } from "./types.ts";

/** Transparent scoring weights — change here, not in the UI. */
export const SCORE_WEIGHTS = {
  marketDemand: 0.25,
  problemFit: 0.2,
  innovation: 0.15,
  competition: 0.15,
  businessPotential: 0.15,
  scalability: 0.1,
} as const;

/**
 * Bump whenever weights, calibration, text scoring or the forest change, so a
 * stored report can be traced to the model that produced it. The forest adds its
 * own dataset id on top (see analyze.ts).
 */
export const MODEL_VERSION = "2.1.0";

/** Stored on rows written before model versions existed. */
export const LEGACY_MODEL_VERSION = "1.0-legacy";

/**
 * Self-ratings (demand, severity, scalability, reach...) are claims, not
 * evidence. Each is pulled toward a neutral 50 by `credibility`, which grows
 * with how specific the founder's own text is:
 *   credibility = floor + (1 - floor) * evidence / 100
 *   effective   = 50 + (rating - 50) * credibility * maxTrust
 * A vague pitch with every slider at 100 therefore cannot score well.
 */
export const SELF_RATING = {
  credibilityFloor: 0.35,
  maxTrust: 0.85,
} as const;

/**
 * How much a map check (OpenStreetMap counts around the chosen spot) is blended
 * into market demand and competition, when an idea has one. It is objective
 * evidence the sliders cannot fake, but OSM is volunteer-made and thin in small
 * towns, so the weight drops when little is mapped (`lowData`).
 */
export const LOCATION_BLEND = {
  weight: 0.25,
  lowDataWeight: 0.12,
} as const;

/**
 * Linear stretch applied to the weighted composite so that scores use the whole
 * 0–100 range instead of clustering around 55–75. Fitted on the simulated
 * population (see demo.ts / backend/ml/train.py); change both together.
 *   final = 50 + (raw - center) * gain
 */
export const CALIBRATION = {
  center: 47,
  gain: 1.4,
} as const;

export const VERDICT_THRESHOLDS = {
  highlyPromising: 80,
  promising: 60,
  highRisk: 40,
} as const;

export function verdictFromScore(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.highlyPromising) return "Highly Promising";
  if (score >= VERDICT_THRESHOLDS.promising) return "Promising";
  if (score >= VERDICT_THRESHOLDS.highRisk) return "High Risk";
  return "Needs Major Improvement";
}

export type ConsistencyLevel = "agrees" | "close" | "differs";

/**
 * Compares the rules verdict with the ML class. Same class = agrees, one class
 * apart = close, more = differs. The ML model is a second opinion on whether the
 * feature pattern looks like a strong or weak idea, not a separate truth.
 */
export function mlConsistency(verdict: Verdict, ml: MlClass | string) {
  const a = ML_CLASS_NAMES.indexOf(verdict);
  const b = ML_CLASS_NAMES.indexOf(ml as MlClass);
  if (a < 0 || b < 0) return { level: "close" as ConsistencyLevel, gap: 0, label: "ML check unavailable" };
  const gap = Math.abs(a - b);
  if (gap === 0) return { level: "agrees" as ConsistencyLevel, gap, label: "ML check agrees" };
  if (gap === 1) return { level: "close" as ConsistencyLevel, gap, label: "ML check is one class off" };
  return { level: "differs" as ConsistencyLevel, gap, label: "ML check differs" };
}

export const DISCLAIMER =
  "This validation is intended as an initial decision-support tool. It does not guarantee market success, profitability, funding, or business performance. Users should conduct independent market research and customer validation before making business decisions.";

export const DATASET_DISCLAIMER =
  "The machine-learning classifier is a consistency check trained on simulated ideas whose labels come from a simulated quality score, not on historical startup outcomes. Treat it as a second look at your inputs, not a forecast.";
