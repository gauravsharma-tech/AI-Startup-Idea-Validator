import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pdfFileStem, pdfSafe } from "./pdf-text.ts";

describe("pdfSafe", () => {
  it("replaces the rupee sign, which Helvetica cannot draw", () => {
    assert.equal(pdfSafe("listed price of ₹199"), "listed price of Rs. 199");
    assert.equal(pdfSafe("₹ 45 per delivery"), "Rs. 45 per delivery");
  });

  it("keeps Latin-1 and WinAnsi punctuation used in reports", () => {
    const s = "Score 72/100 · “Promising” — it’s a start…";
    assert.equal(pdfSafe(s), s);
  });

  it("collapses unsupported runs (e.g. Devanagari) into one ?", () => {
    assert.equal(pdfSafe("StudyAI छात्र योजना ok"), "StudyAI ? ? ok");
  });

  it("strips zero-width and control characters and handles non-strings", () => {
    assert.equal(pdfSafe("a\u200Bb\u0007c"), "abc");
    assert.equal(pdfSafe(undefined), "");
    assert.equal(pdfSafe(42), "42");
  });
});

describe("pdfFileStem", () => {
  it("builds a safe, non-empty file name", () => {
    assert.equal(pdfFileStem("Study AI!"), "study-ai");
    assert.equal(pdfFileStem("छात्र"), "startup");
  });
});
