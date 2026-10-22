/**
 * Pre-calibrated Fuzzy Logic Model for Startup Validation.
 * 
 * Defines linguistic variables and expert fuzzy rules that address the "compensatory flaw"
 * of linear weighted scoring (where high text specificity can artificially mask fatal bottleneck risks).
 */

import { trapezoidal, triangular } from "./membership.ts";
import type { LinguisticVariable } from "./fuzzy_rule.ts";
import { MamdaniFuzzySystem } from "./fuzzy_system.ts";

export function createStartupFuzzyModel(): MamdaniFuzzySystem {
  const sys = new MamdaniFuzzySystem();

  // -------------------------------------------------------------
  // Input 1: Problem-Solution Fit (0 to 100)
  // -------------------------------------------------------------
  const problemFit: LinguisticVariable = {
    name: "ProblemFit",
    range: [0, 100],
    terms: {
      Poor: trapezoidal(0, 0, 25, 45),
      Moderate: triangular(35, 55, 75),
      Strong: trapezoidal(65, 80, 100, 100),
    },
  };
  sys.addInputVariable(problemFit);

  // -------------------------------------------------------------
  // Input 2: Market Demand (0 to 100)
  // -------------------------------------------------------------
  const marketDemand: LinguisticVariable = {
    name: "MarketDemand",
    range: [0, 100],
    terms: {
      Thin: trapezoidal(0, 0, 30, 48),
      Moderate: triangular(40, 60, 78),
      Substantial: trapezoidal(70, 85, 100, 100),
    },
  };
  sys.addInputVariable(marketDemand);

  // -------------------------------------------------------------
  // Input 3: Competition Pressure (0 to 100)
  // -------------------------------------------------------------
  const competitionPressure: LinguisticVariable = {
    name: "CompetitionPressure",
    range: [0, 100],
    terms: {
      Negligible: trapezoidal(0, 0, 20, 38),
      Moderate: triangular(30, 52, 72),
      Severe: trapezoidal(65, 82, 100, 100),
    },
  };
  sys.addInputVariable(competitionPressure);

  // -------------------------------------------------------------
  // Input 4: Moat / Differentiator Strength (0 to 100)
  // -------------------------------------------------------------
  const moatStrength: LinguisticVariable = {
    name: "MoatStrength",
    range: [0, 100],
    terms: {
      Weak: trapezoidal(0, 0, 32, 50),
      Moderate: triangular(42, 60, 78),
      Defensible: trapezoidal(70, 85, 100, 100),
    },
  };
  sys.addInputVariable(moatStrength);

  // -------------------------------------------------------------
  // Output: Startup Viability Score (0 to 100)
  // -------------------------------------------------------------
  const startupViability: LinguisticVariable = {
    name: "StartupViability",
    range: [0, 100],
    terms: {
      Fatal: trapezoidal(0, 0, 20, 35),
      HighRisk: triangular(25, 45, 60),
      Viable: triangular(50, 68, 85),
      HighlyViable: trapezoidal(75, 88, 100, 100),
    },
  };
  sys.setOutputVariable(startupViability);

  // -------------------------------------------------------------
  // Expert Rules: Non-linear startup dynamics
  // -------------------------------------------------------------

  // Fatal Bottleneck Rules (Compensatory bypass prevention)
  sys.addRule({
    id: "R1",
    description: "Poor problem fit with thin demand is fatal regardless of text polish",
    antecedents: [
      { variableName: "ProblemFit", termName: "Poor" },
      { variableName: "MarketDemand", termName: "Thin" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "Fatal" },
    weight: 1.0,
  });

  sys.addRule({
    id: "R2",
    description: "Severe competition paired with a weak moat creates high-risk existential threat",
    antecedents: [
      { variableName: "CompetitionPressure", termName: "Severe" },
      { variableName: "MoatStrength", termName: "Weak" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "Fatal" },
    weight: 1.0,
  });

  sys.addRule({
    id: "R3",
    description: "Poor problem fit with severe competition cannot be saved by demand",
    antecedents: [
      { variableName: "ProblemFit", termName: "Poor" },
      { variableName: "CompetitionPressure", termName: "Severe" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "Fatal" },
    weight: 1.0,
  });

  // High Risk Rules
  sys.addRule({
    id: "R4",
    description: "Moderate demand but weak moat leaves venture exposed to fast followers",
    antecedents: [
      { variableName: "MarketDemand", termName: "Moderate" },
      { variableName: "MoatStrength", termName: "Weak" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "HighRisk" },
    weight: 0.9,
  });

  sys.addRule({
    id: "R5",
    description: "Strong problem fit but thin demand caps the market ceiling",
    antecedents: [
      { variableName: "ProblemFit", termName: "Strong" },
      { variableName: "MarketDemand", termName: "Thin" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "HighRisk" },
    weight: 0.85,
  });

  // Viable Rules (Solid baseline business)
  sys.addRule({
    id: "R6",
    description: "Strong problem fit and moderate demand with a defensible moat yields a viable venture",
    antecedents: [
      { variableName: "ProblemFit", termName: "Strong" },
      { variableName: "MarketDemand", termName: "Moderate" },
      { variableName: "MoatStrength", termName: "Defensible" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "Viable" },
    weight: 1.0,
  });

  sys.addRule({
    id: "R7",
    description: "Substantial demand with moderate moat sustains viability even under moderate competition",
    antecedents: [
      { variableName: "MarketDemand", termName: "Substantial" },
      { variableName: "MoatStrength", termName: "Moderate" },
      { variableName: "CompetitionPressure", termName: "Moderate" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "Viable" },
    weight: 0.9,
  });

  // Highly Viable Rules (Top decile opportunities)
  sys.addRule({
    id: "R8",
    description: "Strong fit, substantial demand, and defensible moat yields high viability",
    antecedents: [
      { variableName: "ProblemFit", termName: "Strong" },
      { variableName: "MarketDemand", termName: "Substantial" },
      { variableName: "MoatStrength", termName: "Defensible" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "HighlyViable" },
    weight: 1.0,
  });

  sys.addRule({
    id: "R9",
    description: "Strong problem fit and negligible competition with defensible moat",
    antecedents: [
      { variableName: "ProblemFit", termName: "Strong" },
      { variableName: "CompetitionPressure", termName: "Negligible" },
      { variableName: "MoatStrength", termName: "Defensible" },
    ],
    operator: "AND",
    consequent: { variableName: "StartupViability", termName: "HighlyViable" },
    weight: 0.95,
  });

  return sys;
}
