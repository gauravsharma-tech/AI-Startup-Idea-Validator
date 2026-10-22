import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLlmPayload } from "./llm.ts";

const good = {
  insight: "A sharp two-sentence insight. Test it with users.",
  summary: { potential: "p", concern: "c", opportunity: "o", nextStep: "n" },
  recommendations: [
    { title: "Narrow audience", detail: "One segment first.", priority: "HIGH" },
    { title: "Bad priority", detail: "x", priority: "urgent" },
    { title: 5, detail: "x", priority: "low" },
  ],
  swot: {
    strengths: ["a"],
    weaknesses: ["b"],
    opportunities: ["c"],
    threats: ["d"],
  },
};

describe("parseLlmPayload", () => {
  it("accepts a well-formed payload and keeps only valid recommendations", () => {
    const out = parseLlmPayload("Here you go:\n" + JSON.stringify(good) + "\nThanks");
    assert.ok(out);
    assert.equal(out.recommendations?.length, 1);
    assert.equal(out.recommendations?.[0].priority, "high");
    assert.deepEqual(out.swot?.threats, ["d"]);
  });

  it("drops a malformed field without losing the others", () => {
    const out = parseLlmPayload(JSON.stringify({ ...good, swot: { strengths: "not an array" } }));
    assert.ok(out);
    assert.equal(out.swot, undefined);
    assert.equal(out.insight, good.insight);
    assert.ok(out.summary);
  });

  it("rejects non-JSON, arrays and empty objects", () => {
    assert.equal(parseLlmPayload("no json here"), null);
    assert.equal(parseLlmPayload("[1,2,3]"), null);
    assert.equal(parseLlmPayload("{}"), null);
    assert.equal(parseLlmPayload('{"insight": 42, "summary": "x"}'), null);
  });

  it("caps very long strings", () => {
    const out = parseLlmPayload(JSON.stringify({ insight: "x".repeat(5000) }));
    assert.equal(out?.insight?.length, 700);
  });

  it("parses valid competitors with risk and mitigation", () => {
    const out = parseLlmPayload(
      JSON.stringify({
        ...good,
        competitors: [
          {
            name: "RivalCo",
            category: "FinTech",
            similarity: 82,
            pressure: "High",
            risk: "Deep pockets and established trust",
            mitigation: "Target underserved niche with specialized product",
          },
        ],
      }),
    );
    assert.ok(out?.competitors);
    assert.equal(out?.competitors?.length, 1);
    assert.equal(out?.competitors?.[0].name, "RivalCo");
    assert.equal(out?.competitors?.[0].risk, "Deep pockets and established trust");
    assert.equal(out?.competitors?.[0].mitigation, "Target underserved niche with specialized product");
  });
});
