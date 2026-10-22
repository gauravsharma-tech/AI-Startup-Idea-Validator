import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  CALIBRATION,
  DATASET_DISCLAIMER,
  LOCATION_BLEND,
  DISCLAIMER,
  MODEL_VERSION,
  SCORE_WEIGHTS,
  SELF_RATING,
  VERDICT_THRESHOLDS,
} from "@/lib/engine/config";
import { getPublishedMetrics } from "@/lib/engine/metrics-view";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  MapPin,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/methodology")({ component: MethodologyPage });

const DIMENSIONS = [
  { name: "Market Demand", weight: SCORE_WEIGHTS.marketDemand, desc: "Estimated customer volume, pricing tolerance & frequency" },
  { name: "Problem-Solution Fit", weight: SCORE_WEIGHTS.problemFit, desc: "Recurrence and pain severity verified against text claims" },
  { name: "Innovation & Moat", weight: SCORE_WEIGHTS.innovation, desc: "Differentiation strength vs direct and indirect substitutes" },
  { name: "Competitive Rivalry", weight: SCORE_WEIGHTS.competition, desc: "Market density, player counts, and entrant positioning" },
  { name: "Business Potential", weight: SCORE_WEIGHTS.businessPotential, desc: "Monetization model, unit margin viability and reach" },
  { name: "Scalability", weight: SCORE_WEIGHTS.scalability, desc: "Operational leverage, geographic reach, and marginal expansion cost" },
];

function MethodologyPage() {
  const m = getPublishedMetrics();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-12 px-4 py-16 animate-fade-in">
        {/* ── Page Hero ── */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Transparent AI Architecture
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            How IdeaValidator Scores Your Concept
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We reject "black-box magic AI". IdeaValidator couples deterministic multi-attribute heuristics with an ensemble Random Forest classifier and natural language verification.
          </p>
        </div>

        {/* ── 3 Pillar Overview ── */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="bento-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-base">1. Rule-Based Heuristic</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              6 calibrated market dimensions evaluated with penalty dampening on unverified self-ratings.
            </p>
          </div>

          <div className="bento-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-base">2. NLP Text Verification</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Multi-lingual tokenization (English, Hindi, Marathi, Hinglish) and keyword domain categorization.
            </p>
          </div>

          <div className="bento-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-base">3. Random Forest ML</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              50-tree ensemble classifier running client-side JSON trees as an independent second opinion.
            </p>
          </div>
        </section>

        {/* ── Section 1: Dimensions & Weights ── */}
        <section className="bento-card p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-bold">1. Multi-Attribute Dimensions & Weights</h2>
            <p className="text-sm text-muted-foreground">
              Composite scores use a linear calibration curve (50 + (sum − {CALIBRATION.center}) × {CALIBRATION.gain}) mapping full dynamic range:
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.name} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{d.name}</span>
                  <span className="font-mono text-xs font-bold text-primary rounded bg-primary/10 px-2 py-0.5">
                    {Math.round(d.weight * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(d.weight * 100 * 3.5)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-xs text-foreground/90 space-y-2 leading-relaxed">
            <p className="font-semibold text-primary">Verdict Categorization Thresholds:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-success/10 text-success px-2 py-1 font-mono">
                {VERDICT_THRESHOLDS.highlyPromising}+ : Highly Promising
              </span>
              <span className="rounded-md bg-accent/10 text-accent px-2 py-1 font-mono">
                {VERDICT_THRESHOLDS.promising}+ : Promising
              </span>
              <span className="rounded-md bg-warning/10 text-warning px-2 py-1 font-mono">
                {VERDICT_THRESHOLDS.highRisk}+ : High Risk
              </span>
              <span className="rounded-md bg-danger/10 text-danger px-2 py-1 font-mono">
                &lt; {VERDICT_THRESHOLDS.highRisk} : Needs Major Improvement
              </span>
            </div>
            <p className="text-muted-foreground pt-1">
              <strong>Anti-hype Dampening:</strong> Self-ratings (e.g. 100/100 sliders) are automatically regressed toward 50 unless supported by specific quantitative text evidence and concrete mechanisms in your problem and differentiator descriptions.
            </p>
          </div>
        </section>

        {/* ── Section 2: Machine Learning Benchmark ── */}
        <section className="bento-card p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-bold">2. Machine Learning Consistency Model</h2>
            <p className="text-sm text-muted-foreground">
              A 50-tree Random Forest classifier ({m.nTrain} train / {m.nTest} test simulated cohorts) predicts viability class as an independent check.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Model Accuracy" value={m.accuracy} />
            <Stat label="Macro Precision" value={m.precisionMacro} />
            <Stat label="Macro Recall" value={m.recallMacro} />
            <Stat label="Macro F1-Score" value={m.f1Macro} />
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confusion Matrix on Held-Out Test Data
            </h4>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="p-3 text-muted-foreground">True \ Predicted</th>
                    {m.classNames.map((c) => (
                      <th key={c} className="p-3 font-semibold text-foreground">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {m.confusionMatrix.map((row, i) => (
                    <tr key={m.classNames[i]} className="hover:bg-muted/20">
                      <th className="p-3 font-semibold text-foreground bg-muted/20">
                        {m.classNames[i]}
                      </th>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`p-3 tabular-nums font-mono ${
                            i === j ? "font-bold text-success bg-success/5" : "text-muted-foreground"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Section 3: Location Geospatial Engine ── */}
        <section className="bento-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <MapPin className="h-5 w-5" />
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              3. Geospatial Footfall & Point-of-Interest Blend
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For retail, food, and physical service startups, Location Scout queries OpenStreetMap Overpass nodes within customizable radius buffers (500m to 3km). Footfall anchor points (offices, colleges, transit hubs) and competitor density are computed and blended at a calibrated {Math.round(LOCATION_BLEND.weight * 100)}% weight into the market demand score.
          </p>
        </section>

        {/* Disclaimer & Action */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-5 text-xs text-muted-foreground leading-relaxed space-y-3">
          <p>{DATASET_DISCLAIMER}</p>
          <p>{DISCLAIMER}</p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link to="/app/validate">
              <Sparkles className="h-4 w-4" />
              Validate an Idea Now
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/sample">Explore Sample Reports</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bento-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl sm:text-2xl font-bold text-foreground">
        {(Math.round(value * 1000) / 10).toFixed(1)}%
      </p>
    </div>
  );
}
