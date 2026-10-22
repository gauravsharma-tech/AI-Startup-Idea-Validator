import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  ChartPie,
  FileText,
  Lightbulb,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/score/gauge";
import { DISCLAIMER } from "@/lib/engine/config";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* ══ HERO ══ */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0 gradient-radial-primary" />
          {/* Grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28 lg:py-32">
            <div className="space-y-6 animate-slide-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3" />
                AI-powered startup intelligence
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
                Turn your startup idea into{" "}
                <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                  data-driven insight
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Analyze market demand, competition, innovation, and business potential
                with structured scoring, NLP analysis, and a machine-learning viability label.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild className="gap-2 shadow-[var(--shadow-glow)]">
                  <Link to="/app/validate">
                    Validate my idea
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/sample">See sample report</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-5 pt-2">
                {[
                  "Free to start",
                  "No credit card",
                  "Instant results",
                ].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-success" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="animate-slide-up stagger-2">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section className="border-y border-border bg-card/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Process
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                How it works
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                A five-step guided wizard captures your idea. Our engine does the rest in seconds.
              </p>
            </div>
            <ol className="grid gap-5 md:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "Describe your idea",
                  d: "A structured five-step flow captures the problem, market, and business model.",
                },
                {
                  n: "02",
                  t: "AI analyzes your startup",
                  d: "NLP extracts keywords; rules score six dimensions; a random forest labels viability.",
                },
                {
                  n: "03",
                  t: "Review your report",
                  d: "Composite 0–100 score, dimension breakdown, SWOT analysis, and risk heat map.",
                },
                {
                  n: "04",
                  t: "Iterate & improve",
                  d: "Act on recommendations, compare versions, export a shareable PDF report.",
                },
              ].map((s, idx) => (
                <li
                  key={s.n}
                  className={`bento-card relative overflow-hidden animate-slide-up stagger-${idx + 1}`}
                >
                  <span className="absolute right-4 top-3 font-mono text-4xl font-bold text-muted/30 select-none">
                    {s.n}
                  </span>
                  <p className="font-mono text-xs font-semibold text-primary">{s.n}</p>
                  <h3 className="mt-2 font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ══ FEATURES BENTO GRID ══ */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Features
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                From NLP keyword extraction to ML viability labels — a complete founder toolkit.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Brain,
                  t: "Idea analysis",
                  d: "TF-IDF keyword extraction and problem-language signals from your copy.",
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  icon: Target,
                  t: "Market demand",
                  d: "Reach, frequency, and demand estimate — independently scored on 0–100.",
                  color: "text-chart-4",
                  bg: "bg-chart-4/10",
                },
                {
                  icon: Scale,
                  t: "Competition",
                  d: "Rivals are not an automatic fail. Differentiation is weighed in carefully.",
                  color: "text-chart-5",
                  bg: "bg-chart-5/10",
                },
                {
                  icon: Lightbulb,
                  t: "Innovation score",
                  d: "How specific and distinct the differentiator actually is, not just buzz.",
                  color: "text-warning",
                  bg: "bg-warning/10",
                },
                {
                  icon: ChartPie,
                  t: "Business potential",
                  d: "Model, price, and revenue description folded into a single dimension.",
                  color: "text-success",
                  bg: "bg-success/10",
                },
                {
                  icon: ShieldAlert,
                  t: "Risk analysis",
                  d: "Six risk categories: market, competition, financial, tech, customer, ops.",
                  color: "text-danger",
                  bg: "bg-danger/10",
                },
                {
                  icon: Sparkles,
                  t: "Recommendations",
                  d: "Next actions tied to the specific weaknesses the engine found.",
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  icon: FileText,
                  t: "Detailed reports",
                  d: "A downloadable validation memo you can share with mentors or investors.",
                  color: "text-chart-2",
                  bg: "bg-chart-2/10",
                },
              ].map((f, idx) => {
                const Icon = f.icon;
                return (
                  <article
                    key={f.t}
                    className={`bento-card group hover:shadow-[var(--shadow-glow)] transition-shadow animate-slide-up stagger-${(idx % 4) + 1}`}
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${f.bg}`}>
                      <Icon className={`size-4 ${f.color}`} />
                    </div>
                    <h3 className="font-semibold text-sm">{f.t}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ WHY / DISCLAIMER ══ */}
        <section className="border-y border-border bg-card/30 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why use this?</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Pressure-test your idea before you bet on it
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Many founders have startup ideas but no structured way to pressure-test them.
                Friends are polite. Spreadsheets are empty. IdeaValidator gives an explainable,
                inspectable reading — scores you can understand and act on, not a black-box verdict.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="gap-2">
                  <Link to="/app/validate">
                    Get started <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/methodology">Read the methodology</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bento-card border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 text-warning mb-3">
                  <ShieldAlert className="size-4" />
                  <p className="text-sm font-semibold">Honest disclaimer</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
              </div>
              <div className="bento-card">
                <div className="flex items-center gap-2 text-success mb-3">
                  <TrendingUp className="size-4" />
                  <p className="text-sm font-semibold">What you can trust</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Transparent scoring — every point is explainable",
                    "Consistent methodology across all analyses",
                    "Versioned results — track your improvements",
                    "Shareable reports for mentors and investors",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="relative overflow-hidden py-24 text-center">
          <div className="pointer-events-none absolute inset-0 gradient-radial-primary" />
          <div className="relative mx-auto max-w-2xl px-4">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Sparkles className="size-7 text-primary" />
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
              Ready to validate your startup?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Sign in, walk through five steps, and get a structured report you can defend.
              Free, instant, and no credit card required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild className="gap-2 shadow-[var(--shadow-glow)]">
                <Link to="/app/validate">
                  Start validation <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sample">View sample report</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function DashboardPreview() {
  const bars = [
    { l: "Market demand",   v: 82, color: "#8B5CF6" },
    { l: "Problem fit",     v: 76, color: "#34D399" },
    { l: "Innovation",      v: 71, color: "#FBBF24" },
    { l: "Competition",     v: 64, color: "#60A5FA" },
    { l: "Business",        v: 79, color: "#FB7185" },
    { l: "Scale",           v: 73, color: "#8B5CF6" },
  ];

  return (
    <div className="relative">
      {/* Glow effect behind card */}
      <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
      <div className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex gap-1">
            <span className="size-2.5 rounded-full bg-danger/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
          </div>
          <p className="ml-1 text-xs text-muted-foreground/60 font-mono">idea_validator.app</p>
        </div>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreGauge score={78} verdict="Promising" size={130} />
          <div className="w-full flex-1 space-y-2.5">
            {bars.map((b) => (
              <div key={b.l}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{b.l}</span>
                  <span className="tabular-nums font-medium">{b.v}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${b.v}%`, background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
          <TrendingUp className="size-3.5 text-success" />
          <p className="text-xs font-medium text-success">Strong market demand detected</p>
        </div>
      </div>
    </div>
  );
}
