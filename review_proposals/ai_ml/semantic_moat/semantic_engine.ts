/**
 * Empirical Semantic Moat & Competitor Overlap Engine.
 * 
 * Provides vector-based semantic competition analysis to replace hardcoded list-position heuristics.
 */

import type {
  CompetitorSemanticProfile,
  SemanticMoatAnalysis,
  Vocabulary,
} from "./types.ts";
import {
  buildVocabulary,
  cosineSimilarity,
  extractShingles,
  jaccardSimilarity,
  vectorize,
} from "./vector_math.ts";

export interface SemanticEngineInput {
  startupName: string;
  description: string;
  targetMarket: string;
  differentiator: string;
  competitors: string[];
}

/**
 * Baseline corpus of generic startup competition anchors to calibrate IDF.
 */
const CALIBRATION_CORPUS: string[][] = [
  extractShingles("marketplace aggregator platform buyers sellers transaction commission fees"),
  extractShingles("saas software workflow enterprise automation cloud dashboard analytics api"),
  extractShingles("edtech learning students courses tutoring curriculum gamification practice"),
  extractShingles("fintech payments credit lending wallet banking investment accounting"),
  extractShingles("logistics delivery hyperlocal delivery fleet tracking fulfillment warehouse"),
  extractShingles("ai artificial intelligence machine learning llm automation neural model"),
  extractShingles("healthcare clinic patient doctors appointment telemedicine diagnostics records"),
];

export class SemanticMoatEngine {
  private readonly vocab: Vocabulary;

  constructor(customCorpus?: string[][]) {
    const corpus = customCorpus && customCorpus.length > 0 ? customCorpus : CALIBRATION_CORPUS;
    this.vocab = buildVocabulary(corpus);
  }

  /**
   * Analyzes the semantic collision between a startup idea, its competitors, and its moat.
   */
  public analyze(input: SemanticEngineInput): SemanticMoatAnalysis {
    const cleanCompetitors = input.competitors
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const ideaText = `${input.startupName} ${input.description} ${input.targetMarket}`;
    const ideaShingles = extractShingles(ideaText);
    const diffShingles = extractShingles(input.differentiator);
    const compShingleList = cleanCompetitors.map((c) => extractShingles(c));

    // Dynamic vocabulary: combine calibration corpus + input text + competitors
    const dynamicCorpus = [
      ...CALIBRATION_CORPUS,
      ideaShingles,
      diffShingles,
      ...compShingleList,
    ];
    const activeVocab = buildVocabulary(dynamicCorpus);

    const ideaVec = vectorize(ideaShingles, activeVocab);
    const diffVec = vectorize(diffShingles, activeVocab);

    // Differentiator specificity is evaluated by content richness and shingle density
    const diffTokens = input.differentiator.trim().split(/\s+/).filter(Boolean);
    const lengthScore = Math.min(100, Math.round((diffTokens.length / 25) * 100));
    const uniqueShingleRatio = diffShingles.length > 0
      ? new Set(diffShingles).size / diffShingles.length
      : 0;
    const diffSpecificityScore = Math.round(0.6 * lengthScore + 0.4 * (uniqueShingleRatio * 100));

    // Handle edge case: No competitors provided
    if (cleanCompetitors.length === 0) {
      const empiricalMoatScore = Math.round(0.5 * diffSpecificityScore + 25);
      return {
        differentiatorSpecificityScore: diffSpecificityScore,
        averageCompetitorOverlap: 0,
        maxCompetitorCollision: 0,
        empiricalMoatScore,
        moatClassification: empiricalMoatScore >= 70 ? "Moderate" : "Weak",
        competitorProfiles: [],
        explanation:
          "No competitors were supplied. Moat score relies solely on differentiator text depth, but unverified competitor absence introduces market risk.",
      };
    }

    const profiles: CompetitorSemanticProfile[] = [];
    let totalOverlapWithDiff = 0;
    let maxCollision = 0;

    for (const compName of cleanCompetitors) {
      const compShingles = extractShingles(compName);
      const compVec = vectorize(compShingles, activeVocab);

      // 1. Vector similarity to overall idea
      const cosSim = cosineSimilarity(ideaVec, compVec);
      const jacSim = jaccardSimilarity(ideaShingles, compShingles);
      const simToIdea = Number((0.7 * cosSim + 0.3 * jacSim).toFixed(3));

      // 2. Direct collision with claimed differentiator
      const diffCosSim = cosineSimilarity(diffVec, compVec);
      const diffJacSim = jaccardSimilarity(diffShingles, compShingles);
      const overlapWithDiff = Number((0.75 * diffCosSim + 0.25 * diffJacSim).toFixed(3));

      totalOverlapWithDiff += overlapWithDiff;
      if (overlapWithDiff > maxCollision) {
        maxCollision = overlapWithDiff;
      }

      // Threat categorization
      let threatLevel: CompetitorSemanticProfile["threatLevel"] = "Low";
      if (overlapWithDiff >= 0.55 || simToIdea >= 0.65) {
        threatLevel = "Severe";
      } else if (overlapWithDiff >= 0.35 || simToIdea >= 0.45) {
        threatLevel = "Direct";
      } else if (overlapWithDiff >= 0.18 || simToIdea >= 0.25) {
        threatLevel = "Moderate";
      }

      const semanticNotes =
        threatLevel === "Severe"
          ? `High lexical & domain overlap (${Math.round(overlapWithDiff * 100)}%) with differentiator; risk of commoditization.`
          : threatLevel === "Direct"
          ? `Named player operates in adjacent target domain; moat needs clearer technical or channel separation.`
          : `Indirect or differentiated competitor profile.`;

      profiles.push({
        competitorName: compName,
        similarityToIdea: simToIdea,
        overlapWithDifferentiator: overlapWithDiff,
        threatLevel,
        semanticNotes,
      });
    }

    const avgOverlap = Number((totalOverlapWithDiff / cleanCompetitors.length).toFixed(3));

    // Empirical Moat Calculation:
    // Rewards high differentiator specificity and penalizes high competitor collision.
    // Base formula: specificity * (1 - avgOverlap) - 25 * maxCollision
    const rawMoat =
      0.65 * diffSpecificityScore * (1.0 - Math.min(0.8, avgOverlap * 1.2)) -
      20.0 * maxCollision +
      15.0;

    const empiricalMoatScore = Math.max(0, Math.min(100, Math.round(rawMoat)));

    let moatClassification: SemanticMoatAnalysis["moatClassification"] = "Weak";
    if (empiricalMoatScore >= 80) moatClassification = "Defensible";
    else if (empiricalMoatScore >= 65) moatClassification = "Strong";
    else if (empiricalMoatScore >= 45) moatClassification = "Moderate";
    else if (empiricalMoatScore >= 25) moatClassification = "Weak";
    else moatClassification = "None";

    const explanation =
      `Empirical Moat Score is ${empiricalMoatScore}/100 (${moatClassification}). ` +
      `Analyzed ${cleanCompetitors.length} competitor(s) with average differentiator overlap of ${Math.round(avgOverlap * 100)}% ` +
      `and max collision of ${Math.round(maxCollision * 100)}%.`;

    return {
      differentiatorSpecificityScore: diffSpecificityScore,
      averageCompetitorOverlap: avgOverlap,
      maxCompetitorCollision: maxCollision,
      empiricalMoatScore,
      moatClassification,
      competitorProfiles: profiles,
      explanation,
    };
  }
}
