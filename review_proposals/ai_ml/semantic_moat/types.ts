/**
 * Types and interfaces for the Semantic Moat & Competitor Overlap Engine.
 * 
 * This module defines the contracts for character and token n-gram vectorization,
 * cosine distance computations, and empirical moat scoring.
 */

export interface Vector {
  readonly indices: number[];
  readonly values: number[];
  readonly magnitude: number;
}

export interface Vocabulary {
  readonly tokenToIndex: Map<string, number>;
  readonly idf: number[];
  readonly totalDocuments: number;
}

export interface CompetitorSemanticProfile {
  readonly competitorName: string;
  readonly similarityToIdea: number;      // 0.0 to 1.0 (Cosine similarity of domain/text)
  readonly overlapWithDifferentiator: number; // 0.0 to 1.0 (Collision with founder's claimed moat)
  readonly threatLevel: "Low" | "Moderate" | "Direct" | "Severe";
  readonly semanticNotes: string;
}

export interface SemanticMoatAnalysis {
  readonly differentiatorSpecificityScore: number; // 0 to 100
  readonly averageCompetitorOverlap: number;      // 0.0 to 1.0
  readonly maxCompetitorCollision: number;        // 0.0 to 1.0
  readonly empiricalMoatScore: number;           // 0 to 100
  readonly moatClassification: "None" | "Weak" | "Moderate" | "Strong" | "Defensible";
  readonly competitorProfiles: CompetitorSemanticProfile[];
  readonly explanation: string;
}
