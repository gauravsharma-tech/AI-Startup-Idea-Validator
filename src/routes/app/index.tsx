import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { dashboardStats, seedDemoIdeas } from "@/lib/server/startups";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { verdictBadgeVariant } from "@/lib/verdict-style";
import {
  ArrowRight,
  BarChart3,
  Brain,
  FileText,
  GitCompare,
  Map,
  Plus,
  ScanSearch,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/app/")({ component: DashboardPage });

const VERDICT_COLORS: Record<string, string> = {
  "Highly Promising": "#34D399",
  "Promising":        "#8B5CF6",
  "High Risk":        "#FBBF24",
  "Needs Major Improvement": "#FB7185",
};

const FALLBACK_COLORS = ["#34D399", "#8B5CF6", "#FBBF24", "#FB7185"];

function DashboardPage() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardStats() });
  const seed = useMutation({
    mutationFn: () => seedDemoIdeas(),
    onSuccess: (res) => {
      toast.success(res.already ? "Sample ideas are already in your history." : `Loaded ${res.seeded} sample ideas.`);
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: () => toast.error("Could not load sample ideas."),
  });

  if (stats.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Skeleton className="h-72 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-72 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }
  if (stats.isError) {
    return (
      <div className="rounded-[var(--radius-lg)] bg-danger/10 border border-danger/20 px-5 py-4 text-sm text-danger">
        We couldn't load your dashboard. Please refresh the page.
      </div>
    );
  }

  const data = stats.data;
  const dist = data.distribution.map((d) => ({
    name: d.verdict,
    value: d.count,
    fill: VERDICT_COLORS[d.verdict] ?? FALLBACK_COLORS[0],
  }));

  const metrics = [
    {
      label: "Ideas Analyzed",
      value: data.ideasAnalyzed,
      icon: Brain,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Average Score",
      value: data.averageScore ? `${data.averageScore}` : "—",
      icon: BarChart3,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Highly Promising",
      value: data.highlyPromising,
      icon: TrendingUp,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Reports Generated",
      value: data.reportsGenerated,
      icon: FileText,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ] as const;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your startup validation workspace
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-2">
            <Link to="/app/validate">
              <Plus className="size-4" />
              New Validation
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            className="gap-2"
          >
            <Sparkles className="size-3.5" />
            {seed.isPending ? "Loading…" : "Load Samples"}
          </Button>
        </div>
      </section>

      {/* ── Metric cards (Bento row) ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <article
              key={m.label}
              className={`bento-card flex flex-col gap-4 animate-slide-up stagger-${idx + 1}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bg}`}>
                <Icon className={`size-4 ${m.color}`} />
              </div>
              <div>
                <p className="metric-label">{m.label}</p>
                <p className="metric-value mt-1">{m.value}</p>
              </div>
            </article>
          );
        })}
      </section>

      {/* ── Main bento grid ── */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        {/* Recent ideas table */}
        <article className="bento-card animate-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent Analyses</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground gap-1">
              <Link to="/app/history">
                View all <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>

          {data.recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No startup ideas yet"
                body="Your validation history will appear here."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto -mx-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Startup</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Score</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Verdict</th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row.id} className="group border-b border-border/40 last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          {row.analysisId ? (
                            <Link
                              to="/app/results/$analysisId"
                              params={{ analysisId: row.analysisId }}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {row.startupName}
                            </Link>
                          ) : (
                            <span className="font-medium">{row.startupName}</span>
                          )}
                          {row.isDemo && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Demo</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="tabular-nums font-semibold">
                          {row.score ?? "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {row.verdict ? (
                          <Badge variant={verdictBadgeVariant(row.verdict)} className="text-xs">
                            {row.verdict}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Score distribution */}
        <article className="bento-card animate-slide-up stagger-3">
          <h2 className="font-display text-base font-semibold">Score Distribution</h2>
          {dist.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Analyze an idea to see verdict distribution.
            </p>
          ) : (
            <>
              <div className="mt-3 h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dist}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      cx="50%"
                      cy="50%"
                      paddingAngle={2}
                    >
                      {dist.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {dist.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ background: d.fill }}
                      />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                    </span>
                    <span className="tabular-nums font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </section>

      {/* ── Quick action cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ScanSearch,
            label: "Validate Idea",
            desc: "Start a guided validation wizard",
            to: "/app/validate",
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            icon: GitCompare,
            label: "Compare Ideas",
            desc: "Side-by-side score comparison",
            to: "/app/compare",
            color: "text-chart-4",
            bg: "bg-chart-4/10",
          },
          {
            icon: FileText,
            label: "Saved Reports",
            desc: "Browse and download PDF reports",
            to: "/app/reports",
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            icon: Map,
            label: "Location Scout",
            desc: "Analyze physical location demand",
            to: "/app/map",
            color: "text-warning",
            bg: "bg-warning/10",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className={`bento-card group block hover:shadow-[var(--shadow-glow)] transition-shadow animate-slide-up stagger-${idx + 1}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} mb-3`}>
                <Icon className={`size-4 ${card.color}`} />
              </div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {card.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.desc}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
