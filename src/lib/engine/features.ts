import { clamp, roundScore } from "../utils.ts";
import { assessSnapshot } from "../location/score.ts";
import { LOCATION_BLEND, SELF_RATING } from "./config.ts";
import { FIELD_WORDS, analyzeText, lexicalOverlap, specificityScore } from "./nlp.ts";
import type { FeatureVector, ScoreBreakdown, StartupInput } from "./types.ts";

const FREQ_SCORE: Record<string, number> = {
  Rare: 28,
  Occasional: 52,
  Frequent: 74,
  "Very Frequent": 90,
};

const GEO_DEMAND: Record<string, number> = {
  Local: 48,
  Regional: 62,
  National: 78,
  Global: 88,
};

const GEO_SCALE: Record<string, number> = {
  Local: 42,
  Regional: 58,
  National: 74,
  Global: 90,
};

const STAGE_PROGRESS: Record<string, number> = {
  Idea: 45,
  Prototype: 60,
  MVP: 70,
  "Early Startup": 78,
  Growth: 85,
};

const MODEL_BIZ: Record<string, number> = {
  Subscription: 82,
  Freemium: 78,
  Marketplace: 76,
  Commission: 70,
  "Pay-per-use": 72,
  "One-time purchase": 60,
  Advertisement: 54,
  Other: 58,
};

const MODEL_SCALE: Record<string, number> = {
  Subscription: 84,
  Freemium: 86,
  "Pay-per-use": 80,
  Marketplace: 74,
  Commission: 70,
  Advertisement: 78,
  "One-time purchase": 52,
  Other: 60,
};

function customerBaseScore(n: number | null) {
  if (n == null || n <= 0) return 48;
  const log = Math.log10(Math.max(1, n));
  return clamp(32 + log * 18);
}

function pricingScore(price: number | null, model: string) {
  if (price == null || price <= 0) return 42;
  if (model === "Advertisement") return 55;
  if (price < 50) return 62;
  if (price < 500) return 78;
  if (price < 5000) return 74;
  return 60;
}

export function extractScores(input: StartupInput) {
  const nlp = analyzeText([
    input.description,
    input.problemStatement,
    input.differentiator,
    input.targetCustomer,
    input.targetMarket,
  ]);

  const overlap = lexicalOverlap(input.description, input.problemStatement);
  const descSpec = specificityScore(input.description, FIELD_WORDS.description);
  const problemSpec = specificityScore(input.problemStatement, FIELD_WORDS.problem);
  const diffSpec = specificityScore(input.differentiator, FIELD_WORDS.differentiator);
  const customerSpec = specificityScore(input.targetCustomer, FIELD_WORDS.customer);
  const marketSpec = specificityScore(input.targetMarket, FIELD_WORDS.market);
  const revenueSpec = specificityScore(input.revenueModel, FIELD_WORDS.revenue);
  const competitors = input.competitors.map((c) => c.trim()).filter(Boolean);
  const nComp = competitors.length;

  // How much the founder's own words back up their claims, 0–100.
  const evidence =
    0.28 * descSpec + 0.24 * problemSpec + 0.24 * diffSpec + 0.1 * customerSpec + 0.14 * revenueSpec;
  // Self-ratings are pulled toward 50 unless the text earns trust (see config.ts).
  const credibility = SELF_RATING.credibilityFloor + (1 - SELF_RATING.credibilityFloor) * (evidence / 100);
  const eff = (v: number) => 50 + (clamp(v) - 50) * credibility * SELF_RATING.maxTrust;

  const freq = eff(FREQ_SCORE[input.problemFrequency] ?? 50);
  const geoDemand = eff(GEO_DEMAND[input.geographicMarket] ?? 55);
  const demandClaim = eff(input.demandPerception);
  const severityClaim = eff(input.problemSeverity);
  const customerBase = eff(customerBaseScore(input.estimatedCustomers));
  const termSignal = clamp(nlp.signals.industry * 400 + nlp.signals.customer * 220);
  const needSignal = clamp(nlp.signals.customer * 400 + nlp.signals.problem * 200);

  // Optional map check: objective footfall/competition evidence for physical ideas.
  const loc = input.location ? assessSnapshot(input.location) : null;
  const locWeight = loc ? (loc.lowData ? LOCATION_BLEND.lowDataWeight : LOCATION_BLEND.weight) : 0;
  const withMap = (base: number, mapScore: number | undefined) =>
    loc && mapScore !== undefined ? (1 - locWeight) * base + locWeight * mapScore : base;

  const marketDemand = roundScore(
    withMap(
      0.15 * demandClaim +
        0.13 * geoDemand +
        0.14 * customerBase +
        0.14 * freq +
        0.12 * termSignal +
        0.32 * (0.5 * marketSpec + 0.5 * customerSpec),
      loc?.demandScore,
    ),
  );

  const problemFit = roundScore(
    0.36 * problemSpec +
      0.14 * severityClaim +
      0.12 * freq +
      0.2 * clamp(overlap * 220) +
      0.18 * customerSpec,
  );

  const innovation = roundScore(
    0.46 * diffSpec +
      0.12 * clamp(nlp.signals.technology * 500) +
      0.28 * descSpec +
      0.14 * (STAGE_PROGRESS[input.stage] ?? 50),
  );

  // Competition score = ability to compete, NOT "more rivals is worse".
  let competition = 50;
  if (nComp === 0) competition -= 10;
  else if (nComp <= 3) competition += 6;
  else if (nComp <= 6) competition += 2;
  else competition -= 8;
  competition += (diffSpec - 50) * 0.5;
  competition += (marketDemand - 50) * 0.1;
  if (nComp >= 5 && diffSpec < 45) competition -= 14;
  if (nComp >= 1 && diffSpec >= 70) competition += 8;
  const competitionScore = roundScore(withMap(competition, loc?.competitionScore));

  const businessPotential = roundScore(
    0.26 * (MODEL_BIZ[input.businessModel] ?? 58) +
      0.22 * pricingScore(input.expectedPricing, input.businessModel) +
      0.34 * revenueSpec +
      0.18 * (input.stage === "Growth" ? 80 : input.stage === "Early Startup" ? 72 : 60),
  );

  const scalabilityScore = roundScore(
    0.26 * eff(input.scalability) +
      0.26 * eff(GEO_SCALE[input.geographicMarket] ?? 55) +
      0.28 * (MODEL_SCALE[input.businessModel] ?? 60) +
      0.2 * evidence,
  );

  const customerNeed = roundScore(
    0.26 * severityClaim + 0.18 * freq + 0.28 * customerSpec + 0.28 * needSignal,
  );

  const risk = roundScore(
    0.22 * (100 - marketDemand) +
      0.18 * (100 - problemFit) +
      0.16 * (nComp >= 6 && diffSpec < 50 ? 78 : nComp === 0 ? 64 : 42) +
      0.16 * (input.expectedPricing == null || input.expectedPricing <= 0 ? 70 : 40) +
      0.14 * (input.stage === "Idea" ? 72 : input.stage === "Prototype" ? 58 : 40) +
      0.14 * (100 - scalabilityScore),
  );

  const scores: ScoreBreakdown = {
    marketDemand,
    problemFit,
    innovation,
    competition: competitionScore,
    businessPotential,
    scalability: scalabilityScore,
    customerNeed,
    risk,
  };

  const explanations: Record<keyof ScoreBreakdown, string> = {
    marketDemand: explainMarket(input, marketDemand, nComp, credibility, loc, locWeight),
    problemFit: `Problem-solution fit is ${problemFit}/100, mostly from how specifically the problem is described, plus severity (${input.problemSeverity}) and frequency (${input.problemFrequency}) counted at ${Math.round(credibility * SELF_RATING.maxTrust * 100)}% strength.`,
    innovation: `Innovation is ${innovation}/100 from the differentiator, technical language in the description, and stage (${input.stage}).`,
    competition: explainCompetition(nComp, diffSpec, competitionScore, input, loc, locWeight),
    businessPotential: `Business potential is ${businessPotential}/100 given a ${input.businessModel.toLowerCase()} model${input.expectedPricing ? ` and a listed price of ₹${input.expectedPricing}` : " without a clear price point"}.`,
    scalability: `Scalability is ${scalabilityScore}/100 combining your ${input.scalability}/100 self-rating (discounted by how specific the text is), a ${input.geographicMarket.toLowerCase()} market, and the ${input.businessModel.toLowerCase()} model.`,
    customerNeed: `Customer need is ${customerNeed}/100 from problem severity, frequency, and how clearly the target customer is described.`,
    risk: `Composite risk is ${risk}/100. Higher means more caution around market, competition, pricing, stage, and scale — not a prediction of failure.`,
  };

  const features: FeatureVector = {
    market_demand: marketDemand,
    problem_fit: problemFit,
    innovation,
    competition: competitionScore,
    business_potential: businessPotential,
    scalability: scalabilityScore,
    customer_need: customerNeed,
    risk,
    competitor_count: nComp,
    desc_specificity: roundScore(descSpec),
    pricing_present: input.expectedPricing && input.expectedPricing > 0 ? 1 : 0,
    differentiator_strength: roundScore(diffSpec),
    text_evidence: roundScore(evidence),
    self_rating_avg: roundScore(
      (clamp(input.demandPerception) + clamp(input.problemSeverity) + clamp(input.scalability)) / 3,
    ),
  };

  return {
    scores,
    explanations,
    features,
    nlp,
    competitorCount: nComp,
    diffSpec,
    evidence,
    credibility,
    location: loc,
  };
}

type MapCheck = ReturnType<typeof assessSnapshot> | null;

function mapSentence(loc: MapCheck, weight: number, what: string) {
  if (!loc) return "";
  const pct = Math.round(weight * 100);
  return ` A map check around your chosen spot (OpenStreetMap) gave ${what}, blended in at ${pct}% weight${loc.lowData ? " (kept low because little is mapped there)" : ""}.`;
}

function explainMarket(
  input: StartupInput,
  score: number,
  nComp: number,
  credibility: number,
  loc: MapCheck,
  locWeight: number,
) {
  const reach = input.geographicMarket.toLowerCase();
  const extra =
    nComp === 0
      ? " Competitor list is empty, so demand is treated as an estimate only."
      : "";
  const trust = Math.round(credibility * SELF_RATING.maxTrust * 100);
  return `Market demand is ${score}/100 from how clearly the target market and customer are described, a ${reach} reach, perceived demand of ${input.demandPerception}/100 and ${input.problemFrequency.toLowerCase()} problem occurrence. Your own ratings count at ${trust}% strength because that is how specific your text is.${extra}${mapSentence(loc, locWeight, `a footfall/demand score of ${loc?.demandScore}/100`)}`;
}

function explainCompetition(
  nComp: number,
  diffSpec: number,
  score: number,
  input: StartupInput,
  loc: MapCheck,
  locWeight: number,
) {
  const map = loc
    ? mapSentence(
        loc,
        locWeight,
        `${loc.sameCount} similar shop${loc.sameCount === 1 ? "" : "s"} within ${input.location?.radiusM} m and a room-to-grow score of ${loc.competitionScore}/100`,
      )
    : "";
  const text = explainCompetitionText(nComp, diffSpec, score);
  return text + map;
}

function explainCompetitionText(nComp: number, diffSpec: number, score: number) {
  if (nComp === 0) {
    return `Competition score is ${score}/100. Market competitors and risks were auto-analyzed by AI based on your industry and differentiator. Prototype assessment only.`;
  }
  if (nComp >= 5 && diffSpec < 45) {
    return `Competition score is ${score}/100. ${nComp} named alternatives plus a thin differentiator increase competitive pressure. A crowded market is not automatically a bad idea if positioning is sharp. Prototype assessment only.`;
  }
  return `Competition score is ${score}/100. ${nComp} competitor${nComp === 1 ? " was" : "s were"} named. This score rewards awareness and differentiation rather than punishing the mere existence of rivals. Prototype assessment only.`;
}
