/**
 * Defensive readers for the JSON columns added in migrations/0003. Rows written
 * before that migration hold the column defaults ('[]' and '{}'), so "empty"
 * means "not recorded", never an error.
 */

export type NlpStats = { tokenCount: number; uniqueTerms: number; keywordCount: number };

function toJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseProba(value: unknown): number[] {
  const v = toJson(value);
  if (!Array.isArray(v)) return [];
  return v.every((n) => typeof n === "number" && Number.isFinite(n)) ? (v as number[]) : [];
}

export function parseNlpStats(value: unknown): NlpStats {
  const empty: NlpStats = { tokenCount: 0, uniqueTerms: 0, keywordCount: 0 };
  const v = toJson(value);
  if (!v || typeof v !== "object") return empty;
  const rec = v as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
  return {
    tokenCount: num(rec.tokenCount),
    uniqueTerms: num(rec.uniqueTerms),
    keywordCount: num(rec.keywordCount),
  };
}

/**
 * Before model 2.0 the ML class for the weakest outcome was called
 * "Not Recommended"; it is now "Needs Major Improvement" like the rules verdict.
 * Old rows are renamed on read so history and reports use one vocabulary.
 */
export function normalizeMlLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  return value === "Not Recommended" ? "Needs Major Improvement" : value;
}

export type EconomicsValues = {
  pricePerMonth: number;
  costToServe: number;
  cac: number;
  monthlyChurnPct: number;
  fixedMonthlyCosts: number;
  customers: number;
};

/**
 * Reads saved unit-economics assumptions from a JSON column. Anything that is
 * not an object of finite, non-negative numbers reads as "not saved".
 */
export function parseEconomics(value: unknown): EconomicsValues | null {
  const v = toJson(value);
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const rec = v as Record<string, unknown>;
  const keys = ["pricePerMonth", "costToServe", "cac", "monthlyChurnPct", "fixedMonthlyCosts", "customers"] as const;
  const out: Partial<EconomicsValues> = {};
  for (const k of keys) {
    const n = rec[k];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
    out[k] = n;
  }
  const e = out as EconomicsValues;
  return { ...e, monthlyChurnPct: Math.min(100, e.monthlyChurnPct) };
}
