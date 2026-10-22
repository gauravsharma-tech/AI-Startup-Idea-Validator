import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompetitors, computeUnitEconomics, leansOnAi } from "./insights.ts";
import { tokenize } from "./nlp.ts";
import type { StartupInput } from "./types.ts";

const base: StartupInput = {
  startupName: "Demo",
  description: "An online retail marketplace with email receipts and a simple business model.",
  industry: "E-commerce",
  stage: "Idea",
  problemStatement: "Small sellers cannot reach nearby buyers without paying heavy platform fees.",
  targetCustomer: "Small local sellers",
  problemFrequency: "Frequent",
  problemSeverity: 60,
  targetMarket: "Local sellers",
  geographicMarket: "Regional",
  estimatedCustomers: 5000,
  expectedPricing: 99,
  demandPerception: 60,
  businessModel: "Commission",
  revenueModel: "Commission per order",
  competitors: ["Amazon", "Flipkart", "A"],
  differentiator: "Neighbourhood-only listings with same-day pickup instead of national shipping.",
  scalability: 55,
};

describe("tokenizer keeps meaningful short tokens", () => {
  it("keeps ai / ml but still drops other 2-letter words", () => {
    const t = tokenize("An AI and ML tool to go on it");
    assert.ok(t.includes("ai"));
    assert.ok(t.includes("ml"));
    assert.ok(!t.includes("go"));
    assert.ok(!t.includes("on"));
  });
});

describe("leansOnAi", () => {
  it("does not fire on words that merely contain 'ai' or 'ml'", () => {
    assert.equal(leansOnAi(base), false); // retail, email, business model
  });

  it("fires on real AI language and the AI industry", () => {
    assert.equal(leansOnAi({ ...base, description: "An AI-powered planner." }), true);
    assert.equal(leansOnAi({ ...base, description: "Uses machine learning to rank." }), true);
    assert.equal(leansOnAi({ ...base, industry: "AI" }), true);
  });
});

describe("buildCompetitors", () => {
  it("does not depend on the length of the competitor name", () => {
    const short = buildCompetitors({ ...base, competitors: ["X"] })[0].similarity;
    const long = buildCompetitors({ ...base, competitors: ["X".repeat(40)] })[0].similarity;
    assert.equal(short, long);
  });

  it("ranks earlier-listed rivals as closer and stays within 25-90", () => {
    const cards = buildCompetitors({ ...base, competitors: ["A1", "B2", "C3", "D4"] });
    for (let i = 1; i < cards.length; i += 1) {
      assert.ok(cards[i].similarity <= cards[i - 1].similarity);
    }
    for (const c of cards) assert.ok(c.similarity >= 25 && c.similarity <= 90);
  });

  it("raises similarity when the founder's own text names the rival", () => {
    // Mention the rival in the description only, so differentiator strength is unchanged.
    const plain = buildCompetitors({ ...base, competitors: ["Zomato"] })[0].similarity;
    const named = buildCompetitors({
      ...base,
      competitors: ["Zomato"],
      description: `${base.description} Unlike Zomato we do not charge restaurants.`,
    })[0].similarity;
    assert.equal(named - plain, 10);
  });

  it("auto-detects market competitors with risk and mitigation when competitors list is empty", () => {
    const cards = buildCompetitors({ ...base, competitors: [] });
    assert.ok(cards.length >= 3);
    for (const c of cards) {
      assert.ok(c.name.length > 0);
      assert.ok(c.risk && c.risk.length > 0);
      assert.ok(c.mitigation && c.mitigation.length > 0);
    }
  });

  it("generates risk and mitigation for custom-supplied competitors", () => {
    const cards = buildCompetitors({ ...base, competitors: ["CustomRival"] });
    assert.equal(cards.length, 1);
    assert.ok(cards[0].risk && cards[0].risk.length > 0);
    assert.ok(cards[0].mitigation && cards[0].mitigation.length > 0);
  });
});

describe("computeUnitEconomics", () => {
  const healthy = { pricePerMonth: 299, costToServe: 90, cac: 450, monthlyChurnPct: 6, fixedMonthlyCosts: 60000, customers: 400 };

  it("derives margin, lifetime, LTV, payback and break-even from the assumptions", () => {
    const r = computeUnitEconomics(healthy);
    assert.equal(r.margin, 209);
    assert.ok(Math.abs(r.lifetimeMonths - 100 / 6) < 1e-9);
    assert.ok(Math.abs(r.ltv - 209 * (100 / 6)) < 1e-6);
    assert.ok(Math.abs((r.ltvToCac ?? 0) - (209 * (100 / 6)) / 450) < 1e-9);
    assert.ok(Math.abs((r.paybackMonths ?? 0) - 450 / 209) < 1e-9);
    assert.equal(r.breakEvenCustomers, Math.ceil(60000 / 209));
    assert.equal(r.monthlyProfit, 209 * 400 - 60000);
    assert.ok(r.flags.every((f) => f.level === "good"));
  });

  it("flags a customer who costs more to serve than they pay", () => {
    const r = computeUnitEconomics({ ...healthy, costToServe: 400 });
    assert.ok(r.margin < 0);
    assert.equal(r.ltv, 0);
    assert.equal(r.paybackMonths, null);
    assert.equal(r.breakEvenCustomers, null);
    assert.ok(r.flags.some((f) => f.level === "bad" && /costs more to serve/i.test(f.text)));
  });

  it("warns on weak LTV:CAC, slow payback and fixed costs the customers do not cover", () => {
    const r = computeUnitEconomics({ pricePerMonth: 100, costToServe: 60, cac: 3000, monthlyChurnPct: 15, fixedMonthlyCosts: 50000, customers: 100 });
    assert.ok(r.ltvToCac !== null && r.ltvToCac < 1);
    assert.ok(r.flags.some((f) => f.level === "bad" && /LTV is/i.test(f.text)));
    assert.ok(r.flags.some((f) => /months of margin/i.test(f.text)));
    assert.ok(r.flags.some((f) => /cover fixed costs/i.test(f.text)));
  });

  it("caps lifetime when churn is zero and never divides by zero or returns NaN", () => {
    const r = computeUnitEconomics({ ...healthy, monthlyChurnPct: 0, cac: 0 });
    assert.equal(r.lifetimeMonths, 120);
    assert.equal(r.ltvToCac, null);
    assert.equal(r.paybackMonths, 0);
    const junk = computeUnitEconomics({ pricePerMonth: Number.NaN, costToServe: -5, cac: Infinity, monthlyChurnPct: 500, fixedMonthlyCosts: 0, customers: 2.6 });
    for (const v of [junk.margin, junk.ltv, junk.monthlyProfit, junk.lifetimeMonths]) assert.ok(Number.isFinite(v));
    assert.ok(junk.flags.some((f) => /No price/i.test(f.text)));
  });
});
