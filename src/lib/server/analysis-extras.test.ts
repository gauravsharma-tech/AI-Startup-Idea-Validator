import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeMlLabel, parseEconomics, parseNlpStats, parseProba } from "./analysis-extras.ts";

describe("analysis extras", () => {
  it("reads stored probabilities (array or JSON string)", () => {
    assert.deepEqual(parseProba([0.1, 0.2, 0.3, 0.4]), [0.1, 0.2, 0.3, 0.4]);
    assert.deepEqual(parseProba("[0.5,0.5]"), [0.5, 0.5]);
  });

  it("treats the column default and junk as 'not recorded'", () => {
    assert.deepEqual(parseProba([]), []);
    assert.deepEqual(parseProba(null), []);
    assert.deepEqual(parseProba('["a"]'), []);
    assert.deepEqual(parseNlpStats({}), { tokenCount: 0, uniqueTerms: 0, keywordCount: 0 });
    assert.deepEqual(parseNlpStats("not json"), { tokenCount: 0, uniqueTerms: 0, keywordCount: 0 });
  });

  it("reads stored NLP stats", () => {
    assert.deepEqual(parseNlpStats({ tokenCount: 40, uniqueTerms: 30, keywordCount: 12 }), {
      tokenCount: 40,
      uniqueTerms: 30,
      keywordCount: 12,
    });
  });
});

describe("legacy ML labels", () => {
  it("renames the old weakest class to the rules vocabulary", () => {
    assert.equal(normalizeMlLabel("Not Recommended"), "Needs Major Improvement");
    assert.equal(normalizeMlLabel("Promising"), "Promising");
    assert.equal(normalizeMlLabel(null), "");
  });
});

describe("saved unit economics", () => {
  const ok = { pricePerMonth: 299, costToServe: 90, cac: 450, monthlyChurnPct: 6, fixedMonthlyCosts: 60000, customers: 400 };

  it("reads a saved object (or its JSON string)", () => {
    assert.deepEqual(parseEconomics(ok), ok);
    assert.deepEqual(parseEconomics(JSON.stringify(ok)), ok);
  });

  it("treats null, junk, missing or negative numbers as 'not saved'", () => {
    assert.equal(parseEconomics(null), null);
    assert.equal(parseEconomics("not json"), null);
    assert.equal(parseEconomics([1, 2]), null);
    assert.equal(parseEconomics({ ...ok, cac: undefined }), null);
    assert.equal(parseEconomics({ ...ok, cac: -1 }), null);
    assert.equal(parseEconomics({ ...ok, pricePerMonth: "299" }), null);
  });

  it("clamps churn to 100", () => {
    assert.equal(parseEconomics({ ...ok, monthlyChurnPct: 900 })?.monthlyChurnPct, 100);
  });
});
