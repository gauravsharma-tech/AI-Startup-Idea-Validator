import { roundScore } from "../utils.ts";
import { CALIBRATION, SCORE_WEIGHTS, verdictFromScore } from "./config.ts";
import type { ScoreBreakdown } from "./types.ts";

/** Documented weighted sum of the six headline dimensions, before calibration. */
export function rawWeightedScore(scores: ScoreBreakdown) {
  return (
    scores.marketDemand * SCORE_WEIGHTS.marketDemand +
    scores.problemFit * SCORE_WEIGHTS.problemFit +
    scores.innovation * SCORE_WEIGHTS.innovation +
    scores.competition * SCORE_WEIGHTS.competition +
    scores.businessPotential * SCORE_WEIGHTS.businessPotential +
    scores.scalability * SCORE_WEIGHTS.scalability
  );
}

/** Linear stretch so scores use the whole range (see CALIBRATION in config.ts). */
export function calibrate(raw: number) {
  return 50 + (raw - CALIBRATION.center) * CALIBRATION.gain;
}

export function weightedFinalScore(scores: ScoreBreakdown) {
  return roundScore(calibrate(rawWeightedScore(scores)));
}

export { verdictFromScore, SCORE_WEIGHTS };
