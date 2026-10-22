import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  GitCompare,
  Layers,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compareAnalyses, listHistory } from "@/lib/server/startups";
import { EmptyState } from "@/components/shared/empty-state";
import { verdictBadgeVariant } from "@/lib/verdict-style";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/compare")({ component: ComparePage });

const FACTORS = [
  { key: "marketDemand", label: "Market Demand", desc: "Customer appetite and market size" },
  { key: "problemFit", label: "Problem Fit", desc: "Severity and recurrence of customer pain" },
  { key: "innovation", label: "Innovation & Moat", desc: "Defensibility vs existing substitutes" },
  { key: "competition", label: "Competitive Landscape", desc: "Market saturation and rivalry" },
  { key: "businessPotential", label: "Business Potential", desc: "Monetization and margin profile" },
  { key: "scalability", label: "Scalability", desc: "Operational leverage and growth velocity" },
] as const;

function ComparePage() {
  const history = useQuery({ queryKey: ["history"], queryFn: () => listHistory() });
  const [selected, setSelected] = useState<string[]>([]);
  const compare = useMutation({
    mutationFn: () => compareAnalyses({ data: selected }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not compare."),
  });

  const analyzed = (history.data ?? []).filter((r) => r.analysisId);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, 4);
      return next;
    });
  }

  if (!history.isPending && analyzed.length < 2) {
    return (
      <EmptyState
        title="Need at least two analyses"
        body="Validate more than one idea, then return here to compare scores and market attributes side by side."
        actionLabel="Validate an Idea"
        actionTo="/app/validate"
      />
    );
  }

  // Identify highest scoring idea in comparison
  const highestScore = compare.data?.items?.reduce((max, cur) => {
    return (cur.analysis.finalScore ?? 0) > (max.analysis.finalScore ?? 0) ? cur : max;
  }, compare.data.items[0]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <GitCompare className="h-3.5 w-3.5" />
            Benchmarking Matrix
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Compare Startup Ideas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select 2 to 4 validated concepts to benchmark viability scores, market factors, and economic defensibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={selected.length < 2 || compare.isPending}
            onClick={() => compare.mutate()}
            className="gap-2 shadow-sm"
          >
            <Sparkles className="size-4" />
            {compare.isPending ? "Generating Comparison…" : `Compare Selected (${selected.length}/4)`}
          </Button>
        </div>
      </section>

      {/* ── Selection Cards Grid ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Choose startup concepts ({analyzed.length} available)</span>
          <span>Max 4 selected</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {analyzed.map((row) => {
            const isChecked = selected.includes(row.analysisId!);
            return (
              <div
                key={row.id}
                role="button"
                tabIndex={0}
                onClick={() => toggle(row.analysisId!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(row.analysisId!);
                  }
                }}
                className={cn(
                  "bento-card relative cursor-pointer p-4 transition-all duration-200 select-none flex flex-col justify-between",
                  isChecked
                    ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
                    : "hover:border-primary/40 hover:bg-card/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-display font-semibold text-foreground text-sm flex items-center gap-1.5">
                      {row.startupName}
                      {row.isDemo && (
                        <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground font-normal">
                          Demo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.industry}</p>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border/80 bg-background"
                    )}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <Badge variant={verdictBadgeVariant(row.verdict ?? "")} className="text-[10px] px-1.5 py-0">
                    {row.verdict ?? "Pending"}
                  </Badge>
                  <span className="font-mono font-bold text-foreground">
                    {row.score ?? "—"}<span className="text-muted-foreground font-normal text-[10px]">/100</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Comparison Results ── */}
      {compare.data && (
        <section className="space-y-6 animate-fade-in">
          {/* Executive Synthesis Banner */}
          <div className="bento-card border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Comparative Synthesis & Key Takeaway</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{compare.data.why}</p>
            {highestScore && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs text-primary font-medium">
                <Trophy className="h-4 w-4 text-warning shrink-0" />
                <span>
                  <strong>{highestScore.startup.startupName}</strong> leads this cohort with a score of{" "}
                  <strong>{highestScore.analysis.finalScore}/100</strong> ({highestScore.analysis.verdict}).
                </span>
              </div>
            )}
          </div>

          {/* Side-by-side Matrix Table */}
          <div className="bento-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-1/4">
                      Evaluation Factor
                    </th>
                    {compare.data.items.map((item) => {
                      const isWinner = item.startup.id === highestScore?.startup.id;
                      return (
                        <th key={item.analysis.id} className="py-4 px-5 align-top min-w-[200px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-bold text-foreground text-base">
                                {item.startup.startupName}
                              </span>
                              {isWinner && (
                                <span title="Cohort Leader">
                                  <Award className="h-4 w-4 text-warning" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">
                              {item.startup.industry} · {item.startup.stage}
                            </p>
                            <div className="pt-1 flex items-center gap-2">
                              <Badge variant={verdictBadgeVariant(item.analysis.verdict)}>
                                {item.analysis.verdict}
                              </Badge>
                              <Button variant="ghost" size="sm" asChild className="h-6 px-1.5 text-xs text-primary gap-1">
                                <Link to="/app/results/$analysisId" params={{ analysisId: item.analysis.id }}>
                                  View <ChevronRight className="h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Final Score Row */}
                  <tr className="bg-primary/5 font-semibold">
                    <td className="py-3.5 px-5 text-sm text-foreground">
                      Final Viability Score
                    </td>
                    {compare.data.items.map((item) => (
                      <td key={item.analysis.id} className="py-3.5 px-5">
                        <span className="font-mono text-xl font-bold text-primary">
                          {item.analysis.finalScore}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">/100</span>
                      </td>
                    ))}
                  </tr>

                  {/* Factor Breakdown Rows */}
                  {FACTORS.map((f) => (
                    <tr key={f.key} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-foreground text-sm">{f.label}</p>
                        <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                      </td>
                      {compare.data.items.map((item) => {
                        const score = (item.analysis.scores as Record<string, number>)[f.key] ?? 0;
                        return (
                          <td key={item.analysis.id} className="py-3.5 px-5">
                            <div className="space-y-1.5 max-w-[160px]">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-mono font-medium">{score}</span>
                                <span className="text-[10px] text-muted-foreground">100</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    score >= 75
                                      ? "bg-success"
                                      : score >= 50
                                        ? "bg-primary"
                                        : score >= 35
                                          ? "bg-warning"
                                          : "bg-danger"
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Business Model Row */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-5 text-xs font-medium text-muted-foreground">
                      Business Model
                    </td>
                    {compare.data.items.map((item) => (
                      <td key={item.analysis.id} className="py-3.5 px-5 text-sm text-foreground">
                        {item.startup.businessModel}
                      </td>
                    ))}
                  </tr>

                  {/* Pricing / Revenue Model */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-5 text-xs font-medium text-muted-foreground">
                      Revenue Engine
                    </td>
                    {compare.data.items.map((item) => (
                      <td key={item.analysis.id} className="py-3.5 px-5 text-xs text-muted-foreground">
                        {item.startup.revenueModel}
                      </td>
                    ))}
                  </tr>

                  {/* Target Market */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-5 text-xs font-medium text-muted-foreground">
                      Target Audience
                    </td>
                    {compare.data.items.map((item) => (
                      <td key={item.analysis.id} className="py-3.5 px-5 text-xs text-muted-foreground">
                        {item.startup.targetCustomer}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
