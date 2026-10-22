import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, CheckCircle2, Loader2, Sparkles, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalysisBundle } from "@/lib/server/startups";

export const Route = createFileRoute("/app/processing/$analysisId")({
  component: ProcessingPage,
});

const STAGES = [
  { label: "Understanding startup idea", detail: "Extracting problem statement & target archetype" },
  { label: "Extracting key features", detail: "Structuring business model & defensibility parameters" },
  { label: "Evaluating problem-solution fit", detail: "Scoring pain severity and customer frequency" },
  { label: "Analyzing market potential", detail: "TAM/SAM sizing and pricing sensitivity models" },
  { label: "Evaluating competition", detail: "Mapping competitive landscape and differentiator moat" },
  { label: "Assessing business potential", detail: "Margin viability, unit economics, and scalability" },
  { label: "Calculating viability score", detail: "Running ensemble Random Forest ML classifier" },
  { label: "Generating recommendations", detail: "Synthesizing executive summary and pivot paths" },
];

type LoadState = "loading" | "missing" | "error";

function ProcessingPage() {
  const { analysisId } = Route.useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Cosmetic progress sequence
  useEffect(() => {
    if (state !== "loading") return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStage((s) => Math.min(STAGES.length - 1, s + 1));
      if (i >= STAGES.length) window.clearInterval(id);
    }, 280);
    return () => window.clearInterval(id);
  }, [state, attempt]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setErrorMessage(null);
    setStage(0);
    const run = async () => {
      try {
        const minWait = new Promise((r) => window.setTimeout(r, 2200));
        const bundle = await getAnalysisBundle({ data: analysisId });
        await minWait;
        if (cancelled) return;
        if (!bundle) {
          setState("missing");
          return;
        }
        await navigate({ to: "/app/results/$analysisId", params: { analysisId } });
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : null);
        setState("error");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [analysisId, navigate, attempt]);

  const progressPercent = Math.min(100, Math.round(((stage + 1) / STAGES.length) * 100));

  if (state !== "loading") {
    return (
      <div className="mx-auto max-w-xl py-12 px-4 animate-fade-in" role="alert">
        <div className="bento-card border-danger/20 bg-danger/5 p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {state === "missing" ? "Analysis Not Found" : "Evaluation Interrupted"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {state === "missing"
                ? "This analysis record could not be found. It may have been deleted or created under another account."
                : (errorMessage ?? "We couldn't connect to the validation engine. Please check your network and retry.")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {state === "error" ? (
              <Button type="button" onClick={() => setAttempt((n) => n + 1)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry Analysis
              </Button>
            ) : null}
            <Button variant="outline" asChild className="gap-2">
              <Link to="/app/history">
                <ArrowLeft className="h-4 w-4" />
                Back to History
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4 space-y-8 animate-fade-in">
      {/* Top Banner / Pulse Header */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/10">
          <Brain className="h-8 w-8 animate-pulse text-primary" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
          </span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Random Forest & NLP Engine Active
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Validating Startup Architecture
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            Computing quantitative market signals, scoring problem severity, and benchmarking against 500+ calibration models.
          </p>
        </div>
      </div>

      {/* Progress Bar Bento */}
      <div className="bento-card p-6 space-y-6">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">Validation Progress</span>
          <span className="font-mono text-primary font-bold text-sm">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stages Checklist */}
        <div className="space-y-3 pt-2">
          {STAGES.map((s, i) => {
            const isDone = i < stage;
            const isCurrent = i === stage;
            const isPending = i > stage;

            return (
              <div
                key={s.label}
                className={`flex items-start gap-3.5 p-3 rounded-xl transition-all duration-200 ${
                  isCurrent
                    ? "bg-primary/5 border border-primary/20 shadow-sm"
                    : isDone
                      ? "bg-card/40 border border-transparent opacity-90"
                      : "opacity-40 border border-transparent"
                }`}
              >
                <div className="pt-0.5">
                  {isDone ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-mono">
                      {i + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isCurrent ? "text-primary font-semibold" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[11px] font-mono text-primary/80 animate-pulse">Running…</span>
                    )}
                    {isDone && (
                      <span className="text-[11px] text-success/80 font-medium">Complete</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {s.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
