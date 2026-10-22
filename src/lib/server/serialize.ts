import { asJson, asNumber } from "../utils";
import type { AnalysisResult, StoredAnalysis, StoredStartup } from "../engine/types";
import { LEGACY_MODEL_VERSION } from "../engine/config";
import { sanitizeSnapshot } from "../location/score";
import { normalizeMlLabel, parseEconomics, parseNlpStats, parseProba } from "./analysis-extras";

export type IdeaRow = {
  id: string;
  user_id: string;
  startup_name: string;
  description: string;
  industry: string;
  stage: string;
  problem_statement: string;
  target_customer: string;
  problem_frequency: string;
  problem_severity: number;
  target_market: string;
  geographic_market: string;
  estimated_customers: number | string | null;
  expected_pricing: number | string | null;
  demand_perception: number;
  business_model: string;
  revenue_model: string;
  competitors: unknown;
  differentiator: string;
  scalability: number;
  is_demo: boolean;
  /** Added by migrations/0003; null for ideas without a map check. */
  location?: unknown;
  /** Added by migrations/0003. */
  economics?: unknown;
  root_id?: string | null;
  version?: number | string | null;
  created_at: string;
};

export type AnalysisRow = {
  id: string;
  startup_id: string;
  user_id: string;
  market_score: number;
  problem_fit_score: number;
  innovation_score: number;
  competition_score: number;
  business_score: number;
  scalability_score: number;
  customer_need_score: number;
  risk_score: number;
  final_score: number;
  verdict: string;
  ml_prediction: string;
  ml_confidence: number | string;
  nlp_keywords: unknown;
  strengths: unknown;
  weaknesses: unknown;
  swot: unknown;
  risks: unknown;
  competitor_analysis: unknown;
  recommendations: unknown;
  next_steps: unknown;
  summary: unknown;
  explanations: unknown;
  insight: string;
  analysis_source: string;
  /** Added by migrations/0003; absent only if that migration has not run. */
  ml_proba?: unknown;
  nlp_stats?: unknown;
  model_version?: string | null;
  share_token?: string | null;
  created_at: string;
};

export function rowToStartup(row: IdeaRow): StoredStartup {
  return {
    id: row.id,
    startupName: row.startup_name,
    description: row.description,
    industry: row.industry,
    stage: row.stage,
    problemStatement: row.problem_statement,
    targetCustomer: row.target_customer,
    problemFrequency: row.problem_frequency,
    problemSeverity: asNumber(row.problem_severity),
    targetMarket: row.target_market,
    geographicMarket: row.geographic_market,
    estimatedCustomers:
      row.estimated_customers == null ? null : asNumber(row.estimated_customers, 0),
    expectedPricing: row.expected_pricing == null ? null : asNumber(row.expected_pricing, 0),
    demandPerception: asNumber(row.demand_perception),
    businessModel: row.business_model,
    revenueModel: row.revenue_model,
    competitors: asJson<string[]>(row.competitors, []),
    differentiator: row.differentiator,
    scalability: asNumber(row.scalability),
    location: sanitizeSnapshot(asJson<unknown>(row.location, null)),
    economics: parseEconomics(row.economics),
    version: Math.max(1, asNumber(row.version ?? 1, 1)),
    rootId: row.root_id || row.id,
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at),
  };
}

export function rowToAnalysis(row: AnalysisRow): StoredAnalysis {
  const result: AnalysisResult = {
    scores: {
      marketDemand: asNumber(row.market_score),
      problemFit: asNumber(row.problem_fit_score),
      innovation: asNumber(row.innovation_score),
      competition: asNumber(row.competition_score),
      businessPotential: asNumber(row.business_score),
      scalability: asNumber(row.scalability_score),
      customerNeed: asNumber(row.customer_need_score),
      risk: asNumber(row.risk_score),
    },
    explanations: asJson(row.explanations, {
      marketDemand: "",
      problemFit: "",
      innovation: "",
      competition: "",
      businessPotential: "",
      scalability: "",
      customerNeed: "",
      risk: "",
    }),
    finalScore: asNumber(row.final_score),
    verdict: row.verdict as StoredAnalysis["verdict"],
    mlPrediction: normalizeMlLabel(row.ml_prediction) as StoredAnalysis["mlPrediction"],
    mlConfidence: asNumber(row.ml_confidence),
    mlProba: parseProba(row.ml_proba),
    modelVersion: row.model_version || LEGACY_MODEL_VERSION,
    keywords: asJson(row.nlp_keywords, []),
    strengths: asJson(row.strengths, []),
    weaknesses: asJson(row.weaknesses, []),
    swot: asJson(row.swot, {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    }),
    risks: asJson(row.risks, []),
    competitors: asJson(row.competitor_analysis, []),
    recommendations: asJson(row.recommendations, []),
    nextSteps: asJson(row.next_steps, []),
    summary: asJson(row.summary, {
      potential: "",
      concern: "",
      opportunity: "",
      nextStep: "",
    }),
    insight: row.insight,
    analysisSource: row.analysis_source,
    nlpStats: parseNlpStats(row.nlp_stats),
  };
  return {
    ...result,
    id: row.id,
    startupId: row.startup_id,
    createdAt: String(row.created_at),
  };
}
