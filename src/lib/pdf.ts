import { jsPDF, GState } from "jspdf";
import { DISCLAIMER, mlConsistency } from "./engine/config.ts";
import { computeUnitEconomics } from "./engine/insights.ts";
import {
  ML_CLASS_NAMES,
  type AnalysisResult,
  type StartupInput,
  type UnitEconomicsInput,
} from "./engine/types.ts";
import { getCategory } from "./location/categories.ts";
import { assessSnapshot } from "./location/score.ts";
import { pdfFileStem, pdfSafe } from "./pdf-text.ts";

// ─── Colour palette ────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C = {
  primary:   [79,  70, 229] as RGB,   // indigo-600
  accent:    [139, 92, 246] as RGB,   // violet-500
  success:   [22, 163,  74] as RGB,   // green-600
  warning:   [202,138,   4] as RGB,   // yellow-600
  danger:    [220,  38,  38] as RGB,  // red-600
  dark:      [15,  23,  42] as RGB,   // slate-900
  mid:       [71,  85, 105] as RGB,   // slate-600
  light:     [148,163,184] as RGB,    // slate-400
  bg:        [248,250,252] as RGB,    // slate-50
  card:      [255,255,255] as RGB,    // white
  border:    [226,232,240] as RGB,    // slate-200
  headerBg1: [49,  46, 129] as RGB,  // indigo-900
  headerBg2: [88,  28, 135] as RGB,  // purple-900
  green2:    [16, 185, 129] as RGB,  // emerald-500
};

function verdictColor(verdict: string): RGB {
  if (verdict === "Highly Promising") return C.success;
  if (verdict === "Promising")        return C.green2;
  if (verdict === "Needs Work")       return C.warning;
  return C.danger;
}

function scoreColor(s: number): RGB {
  if (s >= 75) return C.success;
  if (s >= 55) return C.green2;
  if (s >= 40) return C.warning;
  return C.danger;
}

function riskColor(level: string): RGB {
  if (level === "High")   return C.danger;
  if (level === "Medium") return C.warning;
  return C.success;
}

// ─── Module-level state ────────────────────────────────────────────────────────
let _doc: jsPDF;
let _y = 0;
const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const MARGIN  = 44;
const CONT_W  = PAGE_W - MARGIN * 2;

function newPage() { _doc.addPage(); _y = 52; }
function ensureSpace(need: number) { if (_y + need > PAGE_H - 48) newPage(); }

// ─── Drawing helpers ───────────────────────────────────────────────────────────
function box(
  x: number, y: number, w: number, h: number,
  fill?: RGB, stroke?: RGB, r = 0,
) {
  if (fill)   _doc.setFillColor(...fill);
  if (stroke) { _doc.setDrawColor(...stroke); _doc.setLineWidth(0.5); }
  const mode = fill && stroke ? "FD" : fill ? "F" : "S";
  if (r > 0) _doc.roundedRect(x, y, w, h, r, r, mode);
  else        _doc.rect(x, y, w, h, mode);
}

function txt(
  s: string, x: number, y: number,
  size = 10, color: RGB = C.dark,
  style: "normal"|"bold"|"italic" = "normal",
  align: "left"|"center"|"right" = "left",
) {
  _doc.setFontSize(size);
  _doc.setFont("helvetica", style);
  _doc.setTextColor(...color);
  _doc.text(pdfSafe(s), x, y, { align });
}

function wrapTxt(
  s: string, x: number, startY: number, maxW: number,
  size = 10, color: RGB = C.mid,
  style: "normal"|"bold"|"italic" = "normal",
  lh = 14,
): number {
  _doc.setFontSize(size);
  _doc.setFont("helvetica", style);
  _doc.setTextColor(...color);
  const lines = _doc.splitTextToSize(pdfSafe(s), maxW) as string[];
  let y = startY;
  for (const line of lines) {
    ensureSpace(lh + 4);
    _doc.text(line, x, y);
    y += lh;
  }
  return y;
}

function pill(label: string, px: number, py: number, color: RGB): number {
  const fw = (_doc.getStringUnitWidth(label) * 9) / (_doc as any).internal.scaleFactor + 12;
  box(px, py - 9, fw, 14, color, undefined, 7);
  _doc.setFontSize(8.5); _doc.setFont("helvetica","bold"); _doc.setTextColor(255,255,255);
  _doc.text(pdfSafe(label), px + 6, py + 1);
  return fw;
}

// ─── Section header ────────────────────────────────────────────────────────────
function sectionHdr(title: string) {
  ensureSpace(30);
  box(MARGIN, _y, CONT_W, 22, C.primary, undefined, 4);
  txt(title, MARGIN + 10, _y + 15, 10.5, [255,255,255], "bold");
  _y += 28;
}

// ─── Score gauge (arc) ────────────────────────────────────────────────────────
function drawGauge(score: number, verdict: string, cx: number, cy: number, r: number) {
  const startA = Math.PI * 0.75;
  const arc    = Math.PI * 1.5;
  const steps  = 72;

  // Track
  _doc.setLineWidth(9); _doc.setDrawColor(...C.border);
  for (let i = 0; i < steps; i++) {
    const a1 = startA + (i / steps) * arc;
    const a2 = startA + ((i + 1) / steps) * arc;
    _doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
  }
  // Fill
  const filled = Math.max(0.02, score / 100) * arc;
  _doc.setDrawColor(...verdictColor(verdict));
  for (let i = 0; i < steps; i++) {
    const a1 = startA + (i / steps) * filled;
    const a2 = startA + ((i + 1) / steps) * filled;
    if (a2 > startA + arc) break;
    _doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
  }
  _doc.setLineWidth(0.5);

  // Labels
  txt(`${score}`, cx, cy + 8, 28, C.dark, "bold", "center");
  txt("/ 100", cx, cy + 21, 9, C.light, "normal", "center");
  txt(verdict, cx, cy + 33, 8, verdictColor(verdict), "bold", "center");
}

// ─── Radar chart ──────────────────────────────────────────────────────────────
function drawRadar(data: { dim: string; value: number }[], cx: number, cy: number, r: number) {
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Grid
  for (let ring = 1; ring <= 4; ring++) {
    const rr = (r * ring) / 4;
    _doc.setLineWidth(0.3); _doc.setDrawColor(...C.border);
    for (let i = 0; i < n; i++) {
      const a1 = angle(i); const a2 = angle(i + 1);
      _doc.line(cx + rr * Math.cos(a1), cy + rr * Math.sin(a1), cx + rr * Math.cos(a2), cy + rr * Math.sin(a2));
    }
  }
  // Spokes
  for (let i = 0; i < n; i++) {
    const a = angle(i);
    _doc.line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a));
  }

  // Fill polygon (triangles from centre)
  const pts = data.map((d, i) => {
    const a = angle(i); const rr = (d.value / 100) * r;
    return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
  });
  _doc.setGState(new GState({ opacity: 0.22 }));
  _doc.setFillColor(...C.primary);
  for (let i = 0; i < n; i++) {
    const p1 = pts[i]; const p2 = pts[(i + 1) % n];
    _doc.triangle(cx, cy, p1.x, p1.y, p2.x, p2.y, "F");
  }
  _doc.setGState(new GState({ opacity: 1 }));

  // Outline
  _doc.setLineWidth(1.5); _doc.setDrawColor(...C.primary);
  for (let i = 0; i < n; i++) {
    const p1 = pts[i]; const p2 = pts[(i + 1) % n];
    _doc.line(p1.x, p1.y, p2.x, p2.y);
  }

  // Dots
  _doc.setFillColor(...C.primary);
  for (const pt of pts) _doc.circle(pt.x, pt.y, 2.5, "F");

  // Axis labels
  for (let i = 0; i < n; i++) {
    const a = angle(i); const lr = r + 20;
    const lx = cx + lr * Math.cos(a); const ly = cy + lr * Math.sin(a);
    const align: "left"|"center"|"right" = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
    _doc.setFontSize(8); _doc.setFont("helvetica","normal"); _doc.setTextColor(...C.mid);
    _doc.text(pdfSafe(data[i].dim), lx, ly + 3, { align });
    _doc.setFontSize(7.5); _doc.setTextColor(...scoreColor(data[i].value));
    _doc.text(String(data[i].value), lx, ly + 12, { align });
  }
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function drawScoreBar(label: string, score: number, bx: number, by: number, bw: number) {
  const labelW = 115; const scoreW = 30; const trackW = bw - labelW - scoreW - 12;
  txt(label, bx, by + 9, 8.5, C.mid);
  box(bx + labelW, by, trackW, 11, C.border, undefined, 5);
  box(bx + labelW, by, Math.max(4, (score / 100) * trackW), 11, scoreColor(score), undefined, 5);
  txt(`${score}`, bx + labelW + trackW + 5, by + 9.5, 9, C.dark, "bold");
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function downloadValidationPdf(
  startup: StartupInput,
  analysis: AnalysisResult,
  economics?: UnitEconomicsInput | null,
) {
  _doc = new jsPDF({ unit: "pt", format: "a4" });
  _y = 0;

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER + SCORE
  // ════════════════════════════════════════════════════════════
  // Header band
  box(0, 0, PAGE_W, 185, C.headerBg1);
  box(0, 130, PAGE_W, 55, C.headerBg2);
  // Decorative circles
  _doc.setGState(new GState({ opacity: 0.12 }));
  _doc.setFillColor(...C.accent);
  _doc.circle(PAGE_W - 55, 55, 85, "F");
  _doc.circle(35, 175, 50, "F");
  _doc.setGState(new GState({ opacity: 1 }));

  txt("IdeaValidator", MARGIN, 36, 9, [180,170,255]);
  txt("Startup Validation Report", MARGIN, 54, 22, [255,255,255], "bold");
  txt(pdfSafe(startup.startupName), MARGIN, 84, 30, [255,255,255], "bold");

  // Meta pills
  let mx = MARGIN;
  const reportDate = new Date().toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" });
  for (const m of [startup.industry, startup.stage, startup.businessModel].filter(Boolean)) {
    const fw = (_doc.getStringUnitWidth(m!) * 8.5) / (_doc as any).internal.scaleFactor + 12;
    box(mx, 103, fw, 14, [255,255,255] as RGB, undefined, 7);
    _doc.setFontSize(8); _doc.setFont("helvetica","bold"); _doc.setTextColor(...C.headerBg1);
    _doc.text(pdfSafe(m!), mx + 6, 113);
    mx += fw + 6;
  }
  txt(reportDate, PAGE_W - MARGIN, 150, 8.5, [200,190,255], "normal", "right");

  _y = 205;

  // Gauge
  const gR = 50; const gCX = MARGIN + gR + 12; const gCY = _y + gR + 8;
  drawGauge(analysis.finalScore, analysis.verdict, gCX, gCY, gR);
  pill(analysis.verdict, gCX - 38, gCY + gR + 18, verdictColor(analysis.verdict));

  // Insight
  const iX = gCX + gR + 28; const iW = PAGE_W - iX - MARGIN;
  txt("Summary Insight", iX, _y + 14, 10.5, C.dark, "bold");
  const afterInsight = wrapTxt(analysis.insight, iX, _y + 28, iW, 9.5, C.mid, "normal", 14);

  // ML note
  const consistency = mlConsistency(analysis.verdict, analysis.mlPrediction);
  let noteEnd = afterInsight;
  if (consistency.level === "differs") {
    noteEnd += 4;
    box(iX, noteEnd, iW, 26, [255,251,235] as RGB, C.warning, 4);
    noteEnd = wrapTxt(`ML Note: ${consistency.label}`, iX + 6, noteEnd + 12, iW - 12, 8, C.warning, "italic", 12);
    noteEnd += 8;
  }

  _y = Math.max(noteEnd, gCY + gR + 50) + 16;

  // ── Score Breakdown ───────────────────────────────────────────────────────────
  sectionHdr("Score Breakdown");

  const dims: Array<[string, number, string]> = [
    ["Market Demand",        analysis.scores.marketDemand,      analysis.explanations.marketDemand],
    ["Problem-Solution Fit", analysis.scores.problemFit,        analysis.explanations.problemFit],
    ["Innovation",           analysis.scores.innovation,        analysis.explanations.innovation],
    ["Competition",          analysis.scores.competition,       analysis.explanations.competition],
    ["Business Potential",   analysis.scores.businessPotential, analysis.explanations.businessPotential],
    ["Scalability",          analysis.scores.scalability,       analysis.explanations.scalability],
  ];

  for (const [label, score, exp] of dims) {
    ensureSpace(50);
    const cardH = 46;
    box(MARGIN, _y, CONT_W, cardH, C.bg, C.border, 4);
    // Color left stripe
    box(MARGIN, _y, 5, cardH, scoreColor(score), undefined, 0);
    drawScoreBar(label, score, MARGIN + 12, _y + 6, CONT_W - 16);
    wrapTxt(exp, MARGIN + 12, _y + 26, CONT_W - 24, 8, C.light, "normal", 11);
    _y += cardH + 5;
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — RADAR + STRENGTHS/WEAKNESSES
  // ════════════════════════════════════════════════════════════
  newPage();
  sectionHdr("Dimension Radar");

  const radarData = [
    { dim: "Market",       value: analysis.scores.marketDemand },
    { dim: "Problem Fit",  value: analysis.scores.problemFit },
    { dim: "Innovation",   value: analysis.scores.innovation },
    { dim: "Competition",  value: analysis.scores.competition },
    { dim: "Business",     value: analysis.scores.businessPotential },
    { dim: "Scalability",  value: analysis.scores.scalability },
  ];

  const rCX = PAGE_W / 2; const rCY = _y + 112;
  drawRadar(radarData, rCX, rCY, 88);
  _y = rCY + 108;

  // Legend row
  let lx = MARGIN;
  for (const d of radarData) {
    const lw = (_doc.getStringUnitWidth(`${d.dim} ${d.value}`) * 8.5) / (_doc as any).internal.scaleFactor + 24;
    if (lx + lw > PAGE_W - MARGIN) { lx = MARGIN; _y += 20; }
    box(lx, _y, lw, 15, C.bg, C.border, 4);
    _doc.setFillColor(...scoreColor(d.value)); _doc.circle(lx + 8, _y + 7.5, 4, "F");
    txt(`${d.dim} ${d.value}`, lx + 16, _y + 11, 7.5, C.mid);
    lx += lw + 5;
  }
  _y += 24;

  // Strengths & Weaknesses
  sectionHdr("Strengths & Weaknesses");

  const colW = (CONT_W - 6) / 2;
  box(MARGIN,          _y, colW, 18, C.success, undefined, 4);
  txt("✓  Strengths", MARGIN + 8, _y + 13, 9.5, [255,255,255], "bold");
  box(MARGIN + colW + 6, _y, colW, 18, C.danger, undefined, 4);
  txt("✗  Weaknesses", MARGIN + colW + 14, _y + 13, 9.5, [255,255,255], "bold");
  _y += 22;

  const maxRows = Math.max(analysis.strengths.length, analysis.weaknesses.length);
  for (let i = 0; i < maxRows; i++) {
    const s = analysis.strengths[i];
    const w = analysis.weaknesses[i];
    ensureSpace(60);
    const rH = 56;
    if (s) {
      box(MARGIN, _y, colW, rH, C.card, C.border, 4);
      _doc.setFillColor(...C.success); _doc.circle(MARGIN + 10, _y + 13, 4, "F");
      txt(s.title, MARGIN + 18, _y + 16, 9, C.dark, "bold");
      wrapTxt(s.detail, MARGIN + 10, _y + 29, colW - 18, 8, C.mid, "normal", 11);
    }
    if (w) {
      box(MARGIN + colW + 6, _y, colW, rH, C.card, C.border, 4);
      _doc.setFillColor(...C.danger); _doc.circle(MARGIN + colW + 16, _y + 13, 4, "F");
      txt(w.title, MARGIN + colW + 24, _y + 16, 9, C.dark, "bold");
      wrapTxt(w.detail, MARGIN + colW + 16, _y + 29, colW - 24, 8, C.mid, "normal", 11);
    }
    _y += rH + 4;
  }
  _y += 8;

  // ── SWOT ──────────────────────────────────────────────────────────────────────
  sectionHdr("SWOT Analysis");

  const swotColors: RGB[] = [C.success, C.danger, C.primary, C.warning];
  const swotLabels = ["Strengths","Weaknesses","Opportunities","Threats"];
  const swotData   = [analysis.swot.strengths, analysis.swot.weaknesses, analysis.swot.opportunities, analysis.swot.threats];
  const qW = (CONT_W - 6) / 2;

  for (let qi = 0; qi < 4; qi += 2) {
    const lItems = swotData[qi]; const rItems = swotData[qi + 1];
    const lH = 22 + lItems.length * 14 + 10;
    const rH2 = 22 + rItems.length * 14 + 10;
    const qH = Math.max(lH, rH2, 60);
    ensureSpace(qH + 10);

    box(MARGIN,       _y, qW, qH, C.card, C.border, 4);
    box(MARGIN+qW+6,  _y, qW, qH, C.card, C.border, 4);
    box(MARGIN,       _y, qW, 18, swotColors[qi],   undefined, 4);
    box(MARGIN+qW+6,  _y, qW, 18, swotColors[qi+1], undefined, 4);
    txt(swotLabels[qi],   MARGIN + 8,     _y + 13, 9, [255,255,255], "bold");
    txt(swotLabels[qi+1], MARGIN+qW+14,   _y + 13, 9, [255,255,255], "bold");

    let ry = _y + 28;
    for (const item of lItems) {
      _doc.setFontSize(8); _doc.setFont("helvetica","normal"); _doc.setTextColor(...C.mid);
      _doc.text("•", MARGIN + 8, ry);
      _doc.text(pdfSafe(item), MARGIN + 16, ry, { maxWidth: qW - 22 });
      ry += 13;
    }
    ry = _y + 28;
    for (const item of rItems) {
      _doc.setFontSize(8); _doc.setFont("helvetica","normal"); _doc.setTextColor(...C.mid);
      _doc.text("•", MARGIN + qW + 14, ry);
      _doc.text(pdfSafe(item), MARGIN + qW + 22, ry, { maxWidth: qW - 28 });
      ry += 13;
    }
    _y += qH + 6;
  }
  _y += 8;

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — RISKS + COMPETITION + RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════
  newPage();
  sectionHdr("Risk Analysis");

  for (const r of analysis.risks) {
    ensureSpace(50);
    const rcol = riskColor(r.level);
    const rH2 = 44;
    box(MARGIN, _y, CONT_W, rH2, C.card, C.border, 4);
    box(MARGIN, _y, 5, rH2, rcol, undefined, 0);
    txt(r.category, MARGIN + 14, _y + 15, 10, C.dark, "bold");
    pill(r.level, PAGE_W - MARGIN - 58, _y + 6, rcol);
    wrapTxt(r.explanation, MARGIN + 14, _y + 28, CONT_W - 74, 8.5, C.mid, "normal", 12);
    _y += rH2 + 5;
  }
  _y += 8;

  sectionHdr("Competitive Landscape");

  const n3 = Math.min(analysis.competitors.length, 3);
  const cW = n3 > 0 ? (CONT_W - (n3 - 1) * 6) / n3 : CONT_W;
  let cx2 = MARGIN;
  const compTop = _y;
  let maxCH = 0;
  for (const c of analysis.competitors.slice(0, 3)) {
    const cH = 92;
    maxCH = Math.max(maxCH, cH);
    const pc = c.pressure === "High" ? C.danger : c.pressure === "Medium" ? C.warning : C.success;
    box(cx2, compTop, cW, cH, C.card, C.border, 4);
    box(cx2, compTop, cW, 18, pc, undefined, 4);
    txt(c.name, cx2 + 8, compTop + 13, 9.5, [255,255,255], "bold");
    txt(c.category, cx2 + 8, compTop + 30, 8, C.light);
    txt("Similarity", cx2 + 8, compTop + 44, 7.5, C.mid);
    box(cx2 + 8, compTop + 47, cW - 24, 8, C.border, undefined, 4);
    box(cx2 + 8, compTop + 47, Math.max(3, (c.similarity / 100) * (cW - 24)), 8, pc, undefined, 4);
    txt(`${c.similarity}/100`, cx2 + cW - 28, compTop + 54, 7.5, C.dark, "bold");
    const compText = [
      c.risk ? `Risk: ${c.risk}` : null,
      c.mitigation ? `Defense: ${c.mitigation}` : null,
      !c.risk && !c.mitigation ? c.note : null,
    ]
      .filter(Boolean)
      .join(" | ");
    wrapTxt(compText || c.note, cx2 + 8, compTop + 65, cW - 18, 7, C.mid, "normal", 10);
    cx2 += cW + 6;
  }
  _y = compTop + maxCH + 12;

  sectionHdr("Recommendations");

  for (let i = 0; i < analysis.recommendations.length; i++) {
    const r = analysis.recommendations[i];
    ensureSpace(56);
    const rH3 = 50;
    box(MARGIN, _y, CONT_W, rH3, C.card, C.border, 4);
    _doc.setFillColor(...C.primary); _doc.circle(MARGIN + 16, _y + 20, 10, "F");
    _doc.setFontSize(9); _doc.setFont("helvetica","bold"); _doc.setTextColor(255,255,255);
    _doc.text(String(i + 1), MARGIN + 16, _y + 24, { align:"center" });
    const pCol = r.priority === "high" ? C.danger : r.priority === "medium" ? C.warning : C.success;
    const pLabel = r.priority.charAt(0).toUpperCase() + r.priority.slice(1);
    pill(pLabel, PAGE_W - MARGIN - 62, _y + 10, pCol);
    txt(r.title, MARGIN + 32, _y + 17, 10, C.dark, "bold");
    wrapTxt(r.detail, MARGIN + 32, _y + 30, CONT_W - 78, 8.5, C.mid, "normal", 12);
    _y += rH3 + 5;
  }
  _y += 8;

  // ── Roadmap ───────────────────────────────────────────────────────────────────
  sectionHdr("Practical Roadmap");

  for (const s of analysis.nextSteps) {
    ensureSpace(52);
    const sH = 48;
    box(MARGIN, _y, CONT_W, sH, C.card, C.border, 4);
    box(MARGIN, _y, 28, sH, C.primary, undefined, 4);
    _doc.setFontSize(13); _doc.setFont("helvetica","bold"); _doc.setTextColor(255,255,255);
    const titleText = s.timeframe ? `${s.title} · ${s.timeframe}` : s.title;
    txt(titleText, MARGIN + 36, _y + 16, 9, C.dark, "bold");
    wrapTxt(s.detail, MARGIN + 36, _y + 29, CONT_W - 50, 8.5, C.mid, "normal", 12);
    _y += sH + 5;
  }
  _y += 8;

  // ── Overall Assessment ─────────────────────────────────────────────────────────
  sectionHdr("Overall Assessment");

  const assessItems: [string, string][] = [
    ["Why it has potential",  analysis.summary.potential],
    ["Main concern",          analysis.summary.concern],
    ["Biggest opportunity",   analysis.summary.opportunity],
    ["Recommended next step", analysis.summary.nextStep],
  ];
  for (const [label, val] of assessItems) {
    ensureSpace(48);
    box(MARGIN, _y, CONT_W, 44, C.bg, C.border, 4);
    txt(label, MARGIN + 10, _y + 14, 9, C.primary, "bold");
    wrapTxt(val, MARGIN + 10, _y + 27, CONT_W - 20, 9, C.dark, "normal", 12);
    _y += 48;
  }

  // ════════════════════════════════════════════════════════════
  // UNIT ECONOMICS (optional)
  // ════════════════════════════════════════════════════════════
  if (economics) {
    newPage();
    sectionHdr("Unit Economics");

    const e = computeUnitEconomics(economics);
    const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

    const rows: [string, string, boolean?][] = [
      ["Price / customer / month",        rs(economics.pricePerMonth)],
      ["Cost to serve / month",           rs(economics.costToServe)],
      ["Customer acquisition cost (CAC)", rs(economics.cac)],
      ["Monthly churn",                   `${economics.monthlyChurnPct}%`],
      ["Fixed costs / month",             rs(economics.fixedMonthlyCosts)],
      ["Margin per customer / month",     `${rs(e.margin)} (${Math.round(e.marginPct)}%)`, e.margin > 0],
      ["Avg customer lifetime",           `${e.lifetimeMonths.toFixed(1)} months`],
      ["Lifetime Value (LTV)",            rs(e.ltv)],
      ["LTV : CAC",                       e.ltvToCac === null ? "n/a" : `${e.ltvToCac.toFixed(1)}x`, e.ltvToCac !== null && e.ltvToCac >= 3],
      ["CAC payback period",              e.paybackMonths === null ? "never" : `${e.paybackMonths.toFixed(1)} months`],
      ["Break-even customers",            e.breakEvenCustomers === null ? "n/a" : String(e.breakEvenCustomers)],
      [`Monthly profit @ ${economics.customers} customers`, rs(e.monthlyProfit), e.monthlyProfit > 0],
    ];

    for (let i = 0; i < rows.length; i++) {
      const [label, val, good] = rows[i];
      ensureSpace(24);
      box(MARGIN, _y, CONT_W, 22, i % 2 === 0 ? C.bg : C.card, C.border, 2);
      txt(label, MARGIN + 10, _y + 15, 9, C.mid);
      const vc: RGB = good === true ? C.success : good === false ? C.danger : C.dark;
      txt(val, PAGE_W - MARGIN - 8, _y + 15, 9.5, vc, "bold", "right");
      _y += 22;
    }
    _y += 10;
    for (const f of e.flags) {
      ensureSpace(20);
      const fc: RGB = f.level === "good" ? C.success : f.level === "warn" ? C.warning : C.danger;
      box(MARGIN, _y, CONT_W, 18, C.card, C.border, 3);
      _doc.setFillColor(...fc); _doc.circle(MARGIN + 8, _y + 9, 4, "F");
      txt(f.text, MARGIN + 18, _y + 13, 8.5, C.dark);
      _y += 22;
    }
    _y += 10;
  }

  // ════════════════════════════════════════════════════════════
  // LOCATION (optional)
  // ════════════════════════════════════════════════════════════
  if (startup.location) {
    ensureSpace(30);
    sectionHdr("Location Analysis");
    const loc = startup.location;
    const res = assessSnapshot(loc);
    const radius = loc.radiusM >= 1000 ? `${loc.radiusM / 1000} km` : `${loc.radiusM} m`;
    const cat   = getCategory(loc.categoryId).label;

    ensureSpace(50);
    box(MARGIN, _y, CONT_W, 44, C.bg, C.border, 4);
    txt(`Category: ${cat}  ·  Radius: ${radius}${loc.label ? `  ·  Near: ${loc.label}` : ""}`, MARGIN + 10, _y + 16, 9, C.mid);
    txt(
      `Opportunity: ${res.opportunity}/100  ·  Demand: ${res.demandScore}/100  ·  Room to grow: ${res.competitionScore}/100`,
      MARGIN + 10, _y + 32, 9.5, C.dark, "bold",
    );
    _y += 50;

    // Map sketch
    const mS = 148; const mCX = MARGIN + mS / 2 + 18; const mCY = _y + mS / 2 + 10;
    const mR = mS / 2 - 8;
    const cosLat2 = Math.cos((loc.lat * Math.PI) / 180);
    const atPt = (lat: number, lon: number) => ({
      x: mCX + (((lon - loc.lon) * 111320 * cosLat2) / loc.radiusM) * mR,
      y: mCY - (((lat - loc.lat) * 110540) / loc.radiusM) * mR,
    });

    ensureSpace(mS + 40);
    _doc.setFillColor(219,234,254); _doc.setDrawColor(...C.primary); _doc.setLineWidth(1);
    _doc.circle(mCX, mCY, mR, "FD");
    _doc.setDrawColor(147,197,253); _doc.setLineWidth(0.5);
    _doc.circle(mCX, mCY, mR / 2, "S");
    for (const d of loc.driverPoints) { const p = atPt(d.lat, d.lon); _doc.setFillColor(59,130,246); _doc.circle(p.x, p.y, 2, "F"); }
    for (const sh of loc.same) { const p = atPt(sh.lat, sh.lon); _doc.setFillColor(220,38,38); _doc.circle(p.x, p.y, 3, "F"); }
    _doc.setFillColor(250,204,21); _doc.setDrawColor(31,41,55); _doc.setLineWidth(1.5);
    _doc.circle(mCX, mCY, 5, "FD");

    const lgX = mCX + mR + 28; const lgY = _y + 12;
    txt("Map Legend", lgX, lgY + 10, 9, C.dark, "bold");
    _doc.setFillColor(250,204,21); _doc.circle(lgX + 5, lgY + 23, 5, "F"); txt("Your spot",         lgX + 14, lgY + 27, 8, C.mid);
    _doc.setFillColor(220,38,38);  _doc.circle(lgX + 5, lgY + 37, 4, "F"); txt("Similar shops",     lgX + 14, lgY + 41, 8, C.mid);
    _doc.setFillColor(59,130,246); _doc.circle(lgX + 5, lgY + 51, 3, "F"); txt("Customer sources",  lgX + 14, lgY + 55, 8, C.mid);
    let rly = lgY + 68;
    for (const r of res.reasons) { txt(`• ${r}`, lgX, rly, 8, C.mid); rly += 13; }

    _y = mCY + mR + 22;
  }

  // ── Keywords ──────────────────────────────────────────────────────────────────
  ensureSpace(50);
  sectionHdr("Keywords from Your Copy");
  const kwColors: RGB[] = [C.primary, C.accent, C.green2, C.warning, C.success];
  let kwX = MARGIN;
  for (let i = 0; i < analysis.keywords.length; i++) {
    const k = analysis.keywords[i];
    const kw = (_doc.getStringUnitWidth(k.term) * 9.5) / (_doc as any).internal.scaleFactor + 16;
    if (kwX + kw > PAGE_W - MARGIN) { kwX = MARGIN; _y += 22; }
    ensureSpace(22);
    box(kwX, _y, kw, 16, kwColors[i % kwColors.length], undefined, 8);
    _doc.setFontSize(8.5); _doc.setFont("helvetica","bold"); _doc.setTextColor(255,255,255);
    _doc.text(pdfSafe(k.term), kwX + 8, _y + 11);
    kwX += kw + 5;
  }
  _y += 28;

  // ── ML / NLP stats ─────────────────────────────────────────────────────────────
  ensureSpace(60);
  sectionHdr("ML & NLP Details");

  if (analysis.mlProba.length === ML_CLASS_NAMES.length) {
    box(MARGIN, _y, CONT_W, 28, C.bg, C.border, 4);
    txt("ML class probabilities (trained on simulated ideas):", MARGIN + 10, _y + 12, 9, C.mid, "bold");
    let px2 = MARGIN + 10;
    for (let i = 0; i < ML_CLASS_NAMES.length; i++) {
      const pct = Math.round(analysis.mlProba[i] * 100);
      const label = `${ML_CLASS_NAMES[i]}: ${pct}%`;
      txt(label, px2, _y + 24, 8.5, scoreColor(pct));
      px2 += (_doc.getStringUnitWidth(label) * 8.5) / (_doc as any).internal.scaleFactor + 18;
    }
    _y += 34;
  }

  if (analysis.nlpStats.tokenCount > 0) {
    ensureSpace(24);
    box(MARGIN, _y, CONT_W, 22, C.card, C.border, 4);
    txt(
      `NLP: ${analysis.nlpStats.tokenCount} tokens  ·  ${analysis.nlpStats.uniqueTerms} unique terms  ·  ${analysis.nlpStats.keywordCount} keywords`,
      MARGIN + 10, _y + 15, 9, C.mid,
    );
    _y += 28;
  }

  // ── Disclaimer + footer ────────────────────────────────────────────────────────
  ensureSpace(60);
  _y += 8;
  box(MARGIN, _y, CONT_W, 0.75, C.border);
  _y += 10;
  txt(`Scoring model ${analysis.modelVersion}`, MARGIN, _y, 8, C.light);
  txt(`Generated ${new Date().toLocaleString("en-IN")}`, PAGE_W - MARGIN, _y, 8, C.light, "normal", "right");
  _y += 14;
  wrapTxt(DISCLAIMER, MARGIN, _y, CONT_W, 7.5, C.light, "italic", 11);

  // Page numbers
  const totalPages = (_doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    _doc.setPage(p);
    _doc.setFontSize(8); _doc.setFont("helvetica","normal"); _doc.setTextColor(...C.light);
    _doc.text(`Page ${p} of ${totalPages}`, PAGE_W / 2, PAGE_H - 18, { align:"center" });
    _doc.text("IdeaValidator — Confidential", MARGIN, PAGE_H - 18);
    _doc.text(pdfSafe(startup.startupName), PAGE_W - MARGIN, PAGE_H - 18, { align:"right" });
  }

  _doc.save(`${pdfFileStem(startup.startupName)}-validation.pdf`);
}
