import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Brain,
  Download,
  Eye,
  FileText,
  Filter,
  History as HistoryIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { INDUSTRIES } from "@/lib/engine/types";
import { downloadValidationPdf } from "@/lib/pdf";
import {
  createReport,
  deleteStartup,
  getAnalysisBundle,
  listHistory,
} from "@/lib/server/startups";
import { formatDate } from "@/lib/utils";
import { verdictBadgeVariant } from "@/lib/verdict-style";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

function HistoryPage() {
  const qc = useQueryClient();
  const history = useQuery({ queryKey: ["history"], queryFn: () => listHistory() });
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [verdict, setVerdict] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => deleteStartup({ data: id }),
    onSuccess: () => {
      toast.success("Startup idea removed from workspace.");
      void qc.invalidateQueries({ queryKey: ["history"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPendingDelete(null);
    },
    onError: () => toast.error("Could not delete that idea."),
  });

  const allItems = history.data ?? [];

  const rows = useMemo(() => {
    return allItems.filter((r) => {
      if (q && !r.startupName.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "all" && r.industry !== industry) return false;
      if (verdict !== "all" && r.verdict !== verdict) return false;
      return true;
    });
  }, [allItems, q, industry, verdict]);

  // Aggregate stats
  const totalAnalyzed = allItems.filter((r) => r.score !== null).length;
  const avgScore =
    totalAnalyzed > 0
      ? Math.round(
          allItems.reduce((sum, r) => sum + (r.score ?? 0), 0) / totalAnalyzed
        )
      : null;
  const highlyPromisingCount = allItems.filter(
    (r) => r.verdict === "Highly Promising" || r.verdict === "Promising"
  ).length;

  async function onReport(analysisId: string) {
    setDownloadingId(analysisId);
    try {
      const bundle = await getAnalysisBundle({ data: analysisId });
      if (!bundle) throw new Error("missing");
      await createReport({ data: analysisId });
      downloadValidationPdf(bundle.startup, bundle.analysis);
      toast.success("Validation report PDF generated.");
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("We couldn't generate the PDF report right now.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <HistoryIcon className="h-3.5 w-3.5" />
            Archive & Records
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Validation History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit past startup evaluations, export executive PDF briefs, and track iteration versions.
          </p>
        </div>

        <Button asChild size="sm" className="gap-2 self-start sm:self-auto">
          <Link to="/app/validate">
            <Plus className="size-4" />
            New Validation
          </Link>
        </Button>
      </section>

      {/* ── Stats Highlights ── */}
      {allItems.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="bento-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Evaluations</p>
              <p className="text-xl font-bold font-display">{allItems.length}</p>
            </div>
          </div>

          <div className="bento-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Average Viability Score</p>
              <p className="text-xl font-bold font-display">{avgScore !== null ? `${avgScore}/100` : "—"}</p>
            </div>
          </div>

          <div className="bento-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Promising Concepts</p>
              <p className="text-xl font-bold font-display">{highlyPromisingCount}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Filter Bar ── */}
      <section className="bento-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by startup name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <NativeSelect
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="h-9 text-sm"
          >
            <option value="all">All Industries</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            className="h-9 text-sm"
          >
            <option value="all">All Verdicts</option>
            <option value="Highly Promising">Highly Promising</option>
            <option value="Promising">Promising</option>
            <option value="High Risk">High Risk</option>
            <option value="Needs Major Improvement">Needs Major Improvement</option>
          </NativeSelect>
        </div>

        {(q || industry !== "all" || verdict !== "all") && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              Showing {rows.length} of {allItems.length} results
            </span>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setIndustry("all");
                setVerdict("all");
              }}
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ── Table / Content ── */}
      {history.isPending ? (
        <div className="bento-card p-8 text-center text-muted-foreground animate-pulse">
          Loading validation records…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No validation records found"
          body={
            allItems.length === 0
              ? "You haven't validated any ideas yet. Start your first analysis to see data here."
              : "No ideas match your current filter criteria."
          }
          actionLabel={allItems.length === 0 ? "Validate an Idea" : undefined}
          actionTo={allItems.length === 0 ? "/app/validate" : undefined}
        />
      ) : (
        <div className="bento-card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-5">Startup Concept</th>
                  <th className="py-3 px-5">Industry</th>
                  <th className="py-3 px-5">Viability Score</th>
                  <th className="py-3 px-5">Verdict</th>
                  <th className="py-3 px-5">Evaluated</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {row.startupName}
                        {row.version > 1 && (
                          <span className="text-[10px] font-mono rounded bg-primary/10 text-primary px-1.5 py-0.5">
                            v{row.version}
                          </span>
                        )}
                        {row.isDemo && (
                          <span className="text-[10px] rounded bg-muted text-muted-foreground px-1.5 py-0.5">
                            Sample
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-muted-foreground text-xs">
                      {row.industry}
                    </td>

                    <td className="py-3.5 px-5">
                      {row.score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            {row.score}
                          </span>
                          <span className="text-[11px] text-muted-foreground">/100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5">
                      {row.verdict ? (
                        <Badge variant={verdictBadgeVariant(row.verdict)} className="text-xs">
                          {row.verdict}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-xs text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.analysisId && (
                          <Button size="sm" variant="outline" asChild className="h-8 gap-1 text-xs">
                            <Link to="/app/results/$analysisId" params={{ analysisId: row.analysisId }}>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View
                            </Link>
                          </Button>
                        )}

                        {row.analysisId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => onReport(row.analysisId!)}
                            disabled={downloadingId === row.analysisId}
                            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            title="Download PDF report"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setPendingDelete(row.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
                          title="Delete idea"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation alert */}
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this startup idea?</AlertDialogTitle>
          <AlertDialogDescription>
            This action permanently removes the startup idea, version history, and associated validation analyses from your workspace.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
            >
              Delete Idea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
