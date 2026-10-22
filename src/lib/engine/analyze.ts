import { extractScores } from "./features.ts";
import { MODEL_VERSION } from "./config.ts";
import { getForestId, predictForest } from "./forest.ts";
import {
  buildCompetitors,
  buildInsight,
  buildNextSteps,
  buildRecommendations,
  buildRisks,
  buildStrengths,
  buildSummary,
  buildSwot,
  buildWeaknesses,
} from "./insights.ts";
import { enrichWithLlm } from "./llm.ts";
import { verdictFromScore, weightedFinalScore } from "./scoring.ts";
import type { AnalysisResult, StartupInput } from "./types.ts";

export async function analyzeStartup(
  input: StartupInput,
  opts: { useLlm?: boolean } = {},
): Promise<AnalysisResult> {
  const extracted = extractScores(input);
  const finalScore = weightedFinalScore(extracted.scores);
  const verdict = verdictFromScore(finalScore);
  const ml = predictForest(extracted.features);
  const strengths = buildStrengths(extracted.scores, input);
  const weaknesses = buildWeaknesses(extracted.scores, input);
  const swot = buildSwot(extracted.scores, input, strengths, weaknesses);
  const recommendations = buildRecommendations(input, weaknesses, extracted.scores);

  const base: AnalysisResult = {
    scores: extracted.scores,
    explanations: extracted.explanations,
    finalScore,
    verdict,
    mlPrediction: ml.prediction,
    mlConfidence: ml.confidence,
    mlProba: ml.proba,
    keywords: extracted.nlp.keywords,
    strengths,
    weaknesses,
    swot,
    risks: buildRisks(extracted.scores, input),
    competitors: buildCompetitors(input),
    recommendations,
    nextSteps: buildNextSteps(input),
    summary: buildSummary(input, extracted.scores, finalScore, weaknesses),
    insight: buildInsight(input, finalScore, verdict, weaknesses),
    analysisSource: "rules+ml",
    modelVersion: `${MODEL_VERSION}+${getForestId()}`,
    nlpStats: {
      tokenCount: extracted.nlp.tokenCount,
      uniqueTerms: extracted.nlp.uniqueTerms,
      keywordCount: extracted.nlp.keywords.length,
    },
  };

  if (opts.useLlm === false) return base;
  return enrichWithLlm(input, base);
}
