import type {
  AnalysisResult,
  CompetitorCard,
  Recommendation,
  StartupInput,
  Swot,
} from "./types";

type LlmPayload = {
  insight?: string;
  summary?: AnalysisResult["summary"];
  recommendations?: Recommendation[];
  swot?: Swot;
  competitors?: CompetitorCard[];
};

/** Give up on the LLM after this long; the rules+ML result is always enough. */
export const LLM_TIMEOUT_MS = 12_000;

const MAX_TEXT = 600;
const PRIORITIES = new Set(["high", "medium", "low"]);

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function str(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

function strList(value: unknown, maxItems: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.map((v) => str(v, 240)).filter((v): v is string => v !== null);
  return out.length ? out.slice(0, maxItems) : null;
}

/**
 * Validates model output field by field. Each field is accepted or dropped on
 * its own, so one malformed field never discards the rest, and nothing with the
 * wrong shape can reach the UI (which calls .map/.join on these).
 */
export function parseLlmPayload(text: string): LlmPayload | null {
  const raw = extractJson(text);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: LlmPayload = {};

  const insight = str(obj.insight, 700);
  if (insight) out.insight = insight;

  if (obj.summary && typeof obj.summary === "object") {
    const s = obj.summary as Record<string, unknown>;
    const potential = str(s.potential);
    const concern = str(s.concern);
    const opportunity = str(s.opportunity);
    const nextStep = str(s.nextStep);
    if (potential && concern && opportunity && nextStep) {
      out.summary = { potential, concern, opportunity, nextStep };
    }
  }

  if (Array.isArray(obj.recommendations)) {
    const recs: Recommendation[] = [];
    for (const item of obj.recommendations) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const title = str(r.title, 120);
      const detail = str(r.detail);
      const priority = typeof r.priority === "string" ? r.priority.toLowerCase() : "";
      if (title && detail && PRIORITIES.has(priority)) {
        recs.push({ title, detail, priority: priority as Recommendation["priority"] });
      }
    }
    if (recs.length) out.recommendations = recs.slice(0, 5);
  }

  if (obj.swot && typeof obj.swot === "object") {
    const w = obj.swot as Record<string, unknown>;
    const strengths = strList(w.strengths, 5);
    const weaknesses = strList(w.weaknesses, 5);
    const opportunities = strList(w.opportunities, 4);
    const threats = strList(w.threats, 4);
    if (strengths && weaknesses && opportunities && threats) {
      out.swot = { strengths, weaknesses, opportunities, threats };
    }
  }

  if (Array.isArray(obj.competitors)) {
    const comps: CompetitorCard[] = [];
    for (const item of obj.competitors) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      const name = str(c.name, 80);
      const category = str(c.category, 80) ?? "Market Competitor";
      const similarity =
        typeof c.similarity === "number"
          ? Math.round(Math.min(95, Math.max(20, c.similarity)))
          : 65;
      const pressure =
        c.pressure === "High" || c.pressure === "Low" ? c.pressure : "Medium";
      const risk = str(c.risk, 350) ?? undefined;
      const mitigation = str(c.mitigation, 350) ?? undefined;
      const note = str(c.note, 300) ?? "AI-analyzed market competitor.";
      if (name) {
        comps.push({
          name,
          category,
          similarity,
          pressure,
          risk,
          mitigation,
          note,
          prototype: true,
        });
      }
    }
    if (comps.length) out.competitors = comps.slice(0, 6);
  }

  return Object.keys(out).length ? out : null;
}

export function mergeLlmPayload(base: AnalysisResult, parsed: LlmPayload): AnalysisResult {
  return {
    ...base,
    insight: parsed.insight ?? base.insight,
    summary: parsed.summary ?? base.summary,
    recommendations: parsed.recommendations ?? base.recommendations,
    swot: parsed.swot ?? base.swot,
    competitors: parsed.competitors ?? base.competitors,
    analysisSource: "rules+ml+llm",
  };
}

export async function enrichWithLlm(
  input: StartupInput,
  base: AnalysisResult,
): Promise<AnalysisResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ...base, analysisSource: "rules+ml" };
  }

  const prompt = `You help founders evaluate their startup idea, market competition, and risks.
Return ONLY JSON with keys:
insight (string, 2 sentences),
summary {potential, concern, opportunity, nextStep},
competitors (array of 3-4 {name, category, similarity: 20-95, pressure: "High"|"Medium"|"Low", risk: "main threat/risk from this competitor", mitigation: "actionable strategy to beat or mitigate risk against them"}),
recommendations (array of 5 {title, detail, priority: high|medium|low}),
swot {strengths, weaknesses, opportunities, threats} (arrays of short strings).
Startup: ${input.startupName}
Industry: ${input.industry}
Stage: ${input.stage}
Description: ${input.description.slice(0, 900)}
Problem: ${input.problemStatement.slice(0, 400)}
Customer: ${input.targetCustomer}
Score: ${base.finalScore} (${base.verdict})
ML consistency check: ${base.mlPrediction} (classifier trained on simulated ideas, a second opinion on the rules verdict)
Dimension scores: ${JSON.stringify(base.scores)}
Weaknesses: ${base.weaknesses.map((w) => w.title).join("; ")}`;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // Without this a hung upstream would hang the whole analysis request.
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.IDEA_LLM_MODEL || "grok-4.5",
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You write concise, skeptical founder advice. Never invent live competitor or market statistics.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return { ...base, analysisSource: "rules+ml" };
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const parsed = parseLlmPayload(text);
    if (!parsed) return { ...base, analysisSource: "rules+ml" };
    return mergeLlmPayload(base, parsed);
  } catch {
    // Timeout, network error or bad JSON body: fall back to rules+ML.
    return { ...base, analysisSource: "rules+ml" };
  }
}
