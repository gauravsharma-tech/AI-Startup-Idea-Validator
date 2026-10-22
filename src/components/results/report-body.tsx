import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { ScoreGauge } from "@/components/score/gauge";
import { DISCLAIMER, mlConsistency } from "@/lib/engine/config";
import type { AnalysisResult, StartupInput } from "@/lib/engine/types";
import { getCategory } from "@/lib/location/categories";
import { assessSnapshot, type LocationSnapshot } from "@/lib/location/score";
import { verdictBadgeVariant } from "@/lib/verdict-style";
import { RoadmapSection } from "./roadmap";

const DIMS: { key: keyof AnalysisResult["scores"]; label: string }[] = [
  { key: "marketDemand", label: "Market demand" },
  { key: "problemFit", label: "Problem-solution fit" },
  { key: "innovation", label: "Innovation" },
  { key: "competition", label: "Competition" },
  { key: "businessPotential", label: "Business potential" },
  { key: "scalability", label: "Scalability" },
];

export function ReportBody({
  startup,
  analysis,
  sample,
  shared,
}: {
  startup: StartupInput;
  analysis: AnalysisResult;
  sample?: boolean;
  /** A public, read-only copy opened from a share link. */
  shared?: boolean;
}) {
  const consistency = mlConsistency(analysis.verdict, analysis.mlPrediction);
  const radar = DIMS.map((d) => ({
    dim: d.label.replace(" potential", "").replace("Problem-solution ", "Problem "),
    value: analysis.scores[d.key],
  }));

  return (
    <div className="space-y-10">
      {shared ? (
        <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          A shared, read-only copy of a validation report. Scores come from the founder&apos;s own inputs
          and open data, not live market research.
        </div>
      ) : null}
      {sample ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Sample / demo report generated from a built-in idea. Not a live market study.
        </p>
      ) : null}

      <section className="grid gap-8 rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] md:grid-cols-[auto_1fr] md:items-center">
        <ScoreGauge score={analysis.finalScore} verdict={analysis.verdict} />
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Startup validation report
          </p>
          <h1 className="mt-1 font-display text-3xl">{startup.startupName}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{analysis.insight}</p>
          {consistency.level === "differs" ? (
            <p className="mt-3 max-w-2xl rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              The rules say {analysis.verdict}, but the ML check reads the same inputs as{" "}
              {analysis.mlPrediction} ({Math.round(analysis.mlConfidence * 100)}% of its trees). This
              usually means your ratings and the detail you wrote point in different directions. Treat
              the gap as a prompt to sharpen the text or re-check the ratings.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={verdictBadgeVariant(analysis.verdict)}>{analysis.verdict}</Badge>
            <Badge
              variant={
                consistency.level === "agrees"
                  ? "secondary"
                  : consistency.level === "close"
                    ? "outline"
                    : "warning"
              }
            >
              {consistency.label}
            </Badge>
            <Badge variant="outline">
              {analysis.analysisSource === "rules+ml+llm" ? "Rules + ML + LLM" : "Rules + ML"}
            </Badge>
            {startup.industry ? <Badge variant="outline">{startup.industry}</Badge> : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Score breakdown</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {DIMS.map((d) => (
            <article key={d.key} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium">{d.label}</h3>
                <p className="tabular-nums text-sm">{analysis.scores[d.key]}/100</p>
              </div>
              <Progress className="mt-3" value={analysis.scores[d.key]} />
              <p className="mt-3 text-sm text-muted-foreground">{analysis.explanations[d.key]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl">Dimension radar</h2>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl">Keywords from your copy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            TF-IDF terms extracted from the description, problem, and differentiator.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {analysis.keywords.map((k) => (
              <li key={k.term}>
                <Badge variant="secondary">
                  {k.term}
                  <span className="ml-1 text-[10px] text-muted-foreground">{k.category}</span>
                </Badge>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl">What looks strong</h2>
          <ul className="mt-4 space-y-3">
            {analysis.strengths.map((s) => (
              <li key={s.title}>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl">What needs attention</h2>
          <ul className="mt-4 space-y-3">
            {analysis.weaknesses.map((s) => (
              <li key={s.title}>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section>
        <h2 className="font-display text-2xl">SWOT</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Strengths", analysis.swot.strengths],
              ["Weaknesses", analysis.swot.weaknesses],
              ["Opportunities", analysis.swot.opportunities],
              ["Threats", analysis.swot.threats],
            ] as const
          ).map(([title, items]) => (
            <article key={title} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <h3 className="font-medium">{title}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Risk analysis</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {analysis.risks.map((r) => (
            <article key={r.category} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{r.category}</h3>
                <Badge
                  variant={r.level === "High" ? "danger" : r.level === "Medium" ? "warning" : "success"}
                >
                  {r.level}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-display text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Market Competitors & Risk Defense
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-analyzed market competitors, competitive risks, and tactical counter-strategies to defend your startup.
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            AI Market Intelligence
          </Badge>
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {analysis.competitors.map((c) => (
            <article
              key={c.name}
              className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)] flex flex-col justify-between border border-border/40 hover:border-border transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-foreground leading-snug">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.category}</p>
                  </div>
                  <Badge
                    variant={
                      c.pressure === "High"
                        ? "danger"
                        : c.pressure === "Medium"
                        ? "warning"
                        : "secondary"
                    }
                    className="shrink-0 text-[11px]"
                  >
                    {c.pressure} pressure
                  </Badge>
                </div>

                <div className="mt-3.5 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Market Overlap / Similarity</span>
                    <span className="font-medium text-foreground">{c.similarity}%</span>
                  </div>
                  <Progress value={c.similarity} className="h-1.5" />
                </div>

                {c.risk && (
                  <div className="mt-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-danger">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Market Risk / Threat:</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed pl-5">{c.risk}</p>
                  </div>
                )}

                {c.mitigation && (
                  <div className="mt-2.5 rounded-lg bg-success/10 border border-success/20 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-success">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>How to Beat & Defend (Strategy):</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed pl-5">{c.mitigation}</p>
                  </div>
                )}
              </div>

              <p className="mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                {c.note}
              </p>
            </article>
          ))}
        </div>
      </section>

      {startup.location ? <LocationSection snapshot={startup.location} /> : null}



      <section>
        <h2 className="font-display text-2xl">Recommendations</h2>
        <ol className="mt-4 space-y-3">
          {analysis.recommendations.map((r, i) => (
            <li key={r.title} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <p className="text-xs text-muted-foreground">
                {i + 1} · {r.priority} priority
              </p>
              <h3 className="mt-1 font-medium">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-6">
        <article className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-bold">Executive Summary & Strategic Assessment</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-lg bg-muted/30 p-3.5 border border-border/40">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it has potential</dt>
              <dd className="mt-1.5 text-foreground leading-relaxed text-xs">{analysis.summary.potential}</dd>
            </div>
            <div className="rounded-lg bg-danger/5 p-3.5 border border-danger/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-danger">Main concern</dt>
              <dd className="mt-1.5 text-foreground leading-relaxed text-xs">{analysis.summary.concern}</dd>
            </div>
            <div className="rounded-lg bg-success/5 p-3.5 border border-success/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-success">Biggest opportunity</dt>
              <dd className="mt-1.5 text-foreground leading-relaxed text-xs">{analysis.summary.opportunity}</dd>
            </div>
            <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-primary">Recommended next step</dt>
              <dd className="mt-1.5 text-foreground leading-relaxed text-xs font-medium">{analysis.summary.nextStep}</dd>
            </div>
          </dl>
        </article>

        {/* Interactive Step-by-Step Execution Roadmap with Checklists */}
        <RoadmapSection steps={analysis.nextSteps} startup={startup} />
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      <p className="text-xs text-muted-foreground">Scoring model {analysis.modelVersion}</p>
    </div>
  );
}

const radiusText = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

function LocationSection({ snapshot }: { snapshot: LocationSnapshot }) {
  const category = getCategory(snapshot.categoryId);
  const result = assessSnapshot(snapshot);
  const saved = new Date(snapshot.fetchedAt);
  const savedText = Number.isNaN(saved.getTime()) || saved.getFullYear() < 2000 ? null : saved.toLocaleDateString("en-IN");
  return (
    <section>
      <h2 className="font-display text-2xl">Location check</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {category.label} within {radiusText(snapshot.radiusM)}
        {snapshot.label ? ` of ${snapshot.label}` : ""}. Counts come from OpenStreetMap
        {savedText ? ` (checked ${savedText})` : ""} and feed the market demand and competition scores.
      </p>
      <div className="mt-4 grid gap-6 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] md:grid-cols-[320px_1fr]">
        <LocationPlot snapshot={snapshot} />
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-xl">{result.label}</p>
            <p className="tabular-nums text-sm">{result.opportunity}/100 opportunity</p>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Demand around the spot</span>
              <span className="tabular-nums text-muted-foreground">{result.demandScore}/100</span>
            </div>
            <Progress className="mt-1" value={result.demandScore} />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Room to grow (less competition)</span>
              <span className="tabular-nums text-muted-foreground">{result.competitionScore}/100</span>
            </div>
            <Progress className="mt-1" value={result.competitionScore} />
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {result.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          {snapshot.same.length ? (
            <div>
              <p className="mb-1 text-sm font-medium">Closest similar shops</p>
              <ol className="divide-y divide-border rounded-lg border border-border text-sm">
                {snapshot.same.slice(0, 5).map((s, i) => (
                  <li key={`${s.lat},${s.lon},${i}`} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="truncate">{s.name ?? "Unnamed shop"}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{s.distanceM} m</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Tile-free map: the spot at the centre, the search radius as a ring, nearby places as dots. */
function LocationPlot({ snapshot }: { snapshot: LocationSnapshot }) {
  const size = 320;
  const c = size / 2;
  const ring = 140;
  const cosLat = Math.cos((snapshot.lat * Math.PI) / 180);
  const at = (lat: number, lon: number) => {
    const dx = (lon - snapshot.lon) * 111320 * cosLat;
    const dy = (lat - snapshot.lat) * 110540;
    return { x: c + (dx / snapshot.radiusM) * ring, y: c - (dy / snapshot.radiusM) * ring };
  };
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Map sketch: ${snapshot.same.length} similar shops and ${snapshot.driverPoints.length} customer sources within ${radiusText(snapshot.radiusM)} of the chosen spot`}
      className="mx-auto w-full max-w-[320px]"
    >
      <circle cx={c} cy={c} r={ring} fill="#3b82f6" fillOpacity={0.08} stroke="#1d4ed8" strokeWidth={1.5} />
      <circle cx={c} cy={c} r={ring / 2} fill="none" stroke="#1d4ed8" strokeOpacity={0.25} strokeDasharray="3 4" />
      {snapshot.driverPoints.map((d, i) => {
        const { x, y } = at(d.lat, d.lon);
        return <circle key={`d${i}`} cx={x} cy={y} r={3} fill="#60a5fa" stroke="#1d4ed8" strokeWidth={1} />;
      })}
      {snapshot.same.map((s, i) => {
        const { x, y } = at(s.lat, s.lon);
        return <circle key={`s${i}`} cx={x} cy={y} r={5} fill="#dc2626" stroke="#7f1d1d" strokeWidth={1.5} />;
      })}
      <circle cx={c} cy={c} r={6} fill="#facc15" stroke="#1f2937" strokeWidth={2} />
      <text x={c} y={size - 6} textAnchor="middle" fontSize={10} fill="currentColor" className="text-muted-foreground">
        Ring = {radiusText(snapshot.radiusM)} · red: rivals · blue: customers
      </text>
    </svg>
  );
}

