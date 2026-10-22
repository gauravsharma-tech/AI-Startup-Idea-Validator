import type { LocationSnapshot } from "../location/score.ts";

export const INDUSTRIES = [
  "EdTech",
  "FinTech",
  "HealthTech",
  "E-commerce",
  "SaaS",
  "AI",
  "Transportation",
  "FoodTech",
  "ClimateTech",
  "Entertainment",
  "Other",
] as const;

export const STAGES = ["Idea", "Prototype", "MVP", "Early Startup", "Growth"] as const;

export const FREQUENCIES = ["Rare", "Occasional", "Frequent", "Very Frequent"] as const;

export const GEOGRAPHIES = ["Local", "Regional", "National", "Global"] as const;

export const BUSINESS_MODELS = [
  "Subscription",
  "Freemium",
  "One-time purchase",
  "Marketplace",
  "Commission",
  "Advertisement",
  "Pay-per-use",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];
export type Stage = (typeof STAGES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type Geography = (typeof GEOGRAPHIES)[number];
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

/**
 * The four outcome classes, weakest to strongest. The rules verdict and the ML
 * classifier use these exact names, and the array index is the class id in
 * `model/forest.json` and `mlProba`.
 */
export const ML_CLASS_NAMES = [
  "Needs Major Improvement",
  "High Risk",
  "Promising",
  "Highly Promising",
] as const;

export type Verdict = (typeof ML_CLASS_NAMES)[number];
export type MlClass = Verdict;

export type RiskLevel = "Low" | "Medium" | "High";

export type StartupInput = {
  startupName: string;
  description: string;
  industry: Industry | string;
  stage: Stage | string;
  problemStatement: string;
  targetCustomer: string;
  problemFrequency: Frequency | string;
  problemSeverity: number;
  targetMarket: string;
  geographicMarket: Geography | string;
  estimatedCustomers: number | null;
  expectedPricing: number | null;
  demandPerception: number;
  businessModel: BusinessModel | string;
  revenueModel: string;
  competitors: string[];
  differentiator: string;
  scalability: number;
  /**
   * Optional map check for ideas that depend on a physical spot (shop, cafe,
   * clinic). Raw counts and nearby points from OpenStreetMap; scores are always
   * recomputed from these, never stored.
   */
  location?: LocationSnapshot | null;
};

export type KeywordHit = {
  term: string;
  score: number;
  category: "industry" | "problem" | "customer" | "technology" | "product" | "other";
};

export type ScoreBreakdown = {
  marketDemand: number;
  problemFit: number;
  innovation: number;
  competition: number;
  businessPotential: number;
  scalability: number;
  customerNeed: number;
  risk: number;
};

export type FeatureVector = {
  market_demand: number;
  problem_fit: number;
  innovation: number;
  competition: number;
  business_potential: number;
  scalability: number;
  customer_need: number;
  risk: number;
  competitor_count: number;
  desc_specificity: number;
  pricing_present: number;
  differentiator_strength: number;
  /** 0–100: how specific/concrete the founder's own text is (see nlp.ts). */
  text_evidence: number;
  /** 0–100: mean of the three self-rating sliders, before any shrinkage. */
  self_rating_avg: number;
};

export type StrengthItem = { title: string; detail: string };
export type WeaknessItem = { title: string; detail: string };

export type Swot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export type RiskItem = {
  category: string;
  level: RiskLevel;
  explanation: string;
};

export type CompetitorCard = {
  name: string;
  category: string;
  similarity: number;
  pressure: RiskLevel;
  note: string;
  risk?: string;
  mitigation?: string;
  prototype: true;
};

export type Recommendation = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

export type NextStep = {
  step: number;
  title: string;
  detail: string;
  timeframe?: string;
  month?: string;
  dayRange?: string;
  category?: "Validation" | "Product" | "Marketing" | "Sales" | "Operations";
  actionSteps?: string[];
  tools?: string[];
  successMetric?: string;
};

export type Summary = {
  potential: string;
  concern: string;
  opportunity: string;
  nextStep: string;
};

export type AnalysisResult = {
  scores: ScoreBreakdown;
  explanations: Record<keyof ScoreBreakdown, string>;
  finalScore: number;
  verdict: Verdict;
  mlPrediction: MlClass;
  mlConfidence: number;
  mlProba: number[];
  keywords: KeywordHit[];
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  swot: Swot;
  risks: RiskItem[];
  competitors: CompetitorCard[];
  recommendations: Recommendation[];
  nextSteps: NextStep[];
  summary: Summary;
  insight: string;
  analysisSource: string;
  /** Scoring + forest version that produced this report (see config.ts). */
  modelVersion: string;
  nlpStats: {
    tokenCount: number;
    uniqueTerms: number;
    keywordCount: number;
  };
};

export type StoredAnalysis = AnalysisResult & {
  id: string;
  startupId: string;
  createdAt: string;
};

/** Founder-entered assumptions for the unit-economics calculator (all money in INR). */
export type UnitEconomicsInput = {
  /** Revenue per paying customer per month. */
  pricePerMonth: number;
  /** Cost to serve one customer per month (support, hosting, delivery, payment fees...). */
  costToServe: number;
  /** Cost to acquire one paying customer. */
  cac: number;
  /** Share of customers lost each month, 0-100. */
  monthlyChurnPct: number;
  /** Costs that do not scale with customers (salaries, rent, tools). */
  fixedMonthlyCosts: number;
  /** Paying customers to model the monthly profit for. */
  customers: number;
};

export type EconomicsFlag = { level: "good" | "warn" | "bad"; text: string };

export type UnitEconomicsResult = {
  margin: number;
  marginPct: number;
  /** 1 / churn, capped at 120 months when churn is 0. */
  lifetimeMonths: number;
  ltv: number;
  /** null when CAC is 0 (nothing to compare against). */
  ltvToCac: number | null;
  /** Months of margin needed to earn back CAC; null when margin is not positive. */
  paybackMonths: number | null;
  /** null when margin is not positive. */
  breakEvenCustomers: number | null;
  monthlyRevenue: number;
  monthlyProfit: number;
  flags: EconomicsFlag[];
};

export type StoredStartup = StartupInput & {
  id: string;
  isDemo: boolean;
  createdAt: string;
  /** Saved calculator assumptions, if the founder filled them in. */
  economics: UnitEconomicsInput | null;
  /** 1 for the first run of an idea; each edit or re-run adds one. */
  version: number;
  /** Id of the first version; every version of one idea shares it. */
  rootId: string;
};
