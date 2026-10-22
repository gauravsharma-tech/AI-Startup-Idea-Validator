import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, ExternalLink, Sparkles, FolderArchive, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listReports } from "@/lib/server/startups";
import { formatDate } from "@/lib/utils";
import { verdictBadgeVariant } from "@/lib/verdict-style";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => listReports() });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <FolderArchive className="h-3.5 w-3.5" />
            Executive Artifacts
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Saved Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit-ready PDF intelligence briefs and archived executive teardowns generated from your validation runs.
          </p>
        </div>
      </section>

      {reports.isPending ? (
        <div className="bento-card p-8 text-center text-muted-foreground animate-pulse">
          Loading archived reports…
        </div>
      ) : (reports.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No generated reports yet"
          body="Generate an executive PDF from any validation results view to save and download it here."
          actionLabel="View validation history"
          actionTo="/app/history"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.data?.map((r) => (
            <div
              key={r.id}
              className="bento-card p-5 flex flex-col justify-between hover:border-primary/40 transition-all duration-200 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  {r.verdict && (
                    <Badge variant={verdictBadgeVariant(r.verdict)} className="text-[11px]">
                      {r.verdict}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-display font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generated on {formatDate(r.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-bold text-foreground text-sm">
                    {r.score ?? "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>

                <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 text-xs">
                  <Link to="/app/results/$analysisId" params={{ analysisId: r.analysisId }}>
                    Open Report
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
