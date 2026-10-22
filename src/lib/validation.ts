import { z } from "zod";
import {
  BUSINESS_MODELS,
  FREQUENCIES,
  GEOGRAPHIES,
  INDUSTRIES,
  STAGES,
} from "./engine/types";
import type { StoredStartup } from "./engine/types";
import { sanitizeSnapshot } from "./location/score";

/**
 * Optional map check. Anything that is not a well-formed snapshot is rejected,
 * and a valid one is rebuilt by sanitizeSnapshot (counts clamped, distances
 * recomputed from the coordinates) so the server never scores forged numbers.
 */
const locationField = z
  .unknown()
  .optional()
  .refine((v) => v == null || sanitizeSnapshot(v) !== null, {
    message: "The map check could not be read. Pick the spot on the map again.",
  })
  .transform((v) => (v == null ? null : sanitizeSnapshot(v)));

export const startupInputSchema = z.object({
  startupName: z.string().trim().min(2, "Please enter a startup name."),
  description: z
    .string()
    .trim()
    .min(80, "Describe the idea in at least a short paragraph (80+ characters)."),
  industry: z.string().min(1, "Choose an industry."),
  stage: z.string().min(1, "Choose a stage."),
  problemStatement: z
    .string()
    .trim()
    .min(40, "Explain the problem in at least a couple of sentences."),
  targetCustomer: z.string().trim().min(3, "Who is the customer?"),
  problemFrequency: z.string().min(1),
  problemSeverity: z.number().min(0).max(100),
  targetMarket: z.string().trim().min(3, "Describe the target market."),
  geographicMarket: z.string().min(1),
  estimatedCustomers: z.number().int().positive().nullable(),
  expectedPricing: z.number().nonnegative().nullable(),
  demandPerception: z.number().min(0).max(100),
  businessModel: z.string().min(1),
  revenueModel: z.string().trim().min(8, "How will this make money?"),
  competitors: z.array(z.string().trim()).max(12),
  differentiator: z.string().trim().min(20, "What makes this different?"),
  scalability: z.number().min(0).max(100),
  location: locationField,
});

export type WizardInput = z.infer<typeof startupInputSchema>;

const money = z.number().finite().min(0).max(1_000_000_000);

/** Unit-economics assumptions (INR). Saved with the idea, edited on the report page. */
export const economicsSchema = z.object({
  pricePerMonth: money,
  costToServe: money,
  cac: money,
  monthlyChurnPct: z.number().finite().min(0).max(100),
  fixedMonthlyCosts: money,
  customers: z.number().finite().int().min(0).max(100_000_000),
});

/** Turns a saved idea back into wizard input, to edit it and run a new version. */
export function startupToWizard(s: StoredStartup): WizardInput {
  return {
    startupName: s.startupName,
    description: s.description,
    industry: s.industry,
    stage: s.stage,
    problemStatement: s.problemStatement,
    targetCustomer: s.targetCustomer,
    problemFrequency: s.problemFrequency,
    problemSeverity: s.problemSeverity,
    targetMarket: s.targetMarket,
    geographicMarket: s.geographicMarket,
    estimatedCustomers: s.estimatedCustomers,
    expectedPricing: s.expectedPricing,
    demandPerception: s.demandPerception,
    businessModel: s.businessModel,
    revenueModel: s.revenueModel,
    competitors: s.competitors,
    differentiator: s.differentiator,
    scalability: s.scalability,
    location: s.location ?? null,
  };
}

export const emptyWizard = (): WizardInput => ({
  startupName: "",
  description: "",
  industry: INDUSTRIES[0],
  stage: STAGES[0],
  problemStatement: "",
  targetCustomer: "",
  problemFrequency: FREQUENCIES[2],
  problemSeverity: 60,
  targetMarket: "",
  geographicMarket: GEOGRAPHIES[1],
  estimatedCustomers: null,
  expectedPricing: null,
  demandPerception: 55,
  businessModel: BUSINESS_MODELS[0],
  revenueModel: "",
  competitors: [],
  differentiator: "",
  scalability: 55,
  location: null,
});

export function validateStep(step: number, data: WizardInput) {
  if (step === 1) {
    return startupInputSchema
      .pick({ startupName: true, description: true, industry: true, stage: true })
      .safeParse(data);
  }
  if (step === 2) {
    return startupInputSchema
      .pick({
        problemStatement: true,
        targetCustomer: true,
        problemFrequency: true,
        problemSeverity: true,
      })
      .safeParse(data);
  }
  if (step === 3) {
    return startupInputSchema
      .pick({
        targetMarket: true,
        geographicMarket: true,
        estimatedCustomers: true,
        expectedPricing: true,
        demandPerception: true,
      })
      .safeParse(data);
  }
  if (step === 4) {
    return startupInputSchema
      .pick({
        businessModel: true,
        revenueModel: true,
        competitors: true,
        differentiator: true,
        scalability: true,
      })
      .safeParse(data);
  }
  if (step === 5) {
    return startupInputSchema.pick({ location: true }).safeParse(data);
  }
  return startupInputSchema.safeParse(data);
}
