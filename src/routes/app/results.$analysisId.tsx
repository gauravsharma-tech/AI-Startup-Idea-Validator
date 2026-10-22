import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ReportBody } from "@/components/results/report-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MODEL_VERSION } from "@/lib/engine/config";
import { downloadValidationPdf } from "@/lib/pdf";
import {
  createReport,
  getAnalysisBundle,
  getVersionHistory,
  reanalyzeIdea,
  saveEconomics,
  setReportSharing,
  type VersionItem,
} from "@/lib/server/startups";
import { startupToWizard } from "@/lib/validation";
import { verdictBadgeVariant } from "@/lib/verdict-style";
import { useWizard } from "@/lib/wizard-store";
import {
  Copy,
  Download,
  Edit3,
  GitCompare,
  Link2,
  Link2Off,
  RefreshCw,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/results/$analysisId")({
  component: ResultsPage,
});

function ResultsPage() {
  const { analysisId } = Route.useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => getAnalysisBundle({ data: analysisId }),
  });
  const versions = useQuery({
    queryKey: ["versions", analysisId],
    queryFn: () => getVersionHistory({ data: analysisId }),
  });
  const report = useMutation({
    mutationFn: async () => {
      const bundle = query.data;
      if (!bundle) throw new Error("missing");
      await createReport({ data: analysisId });
      downloadValidationPdf(bundle.startup, bundle.analysis, bundle.startup.economics);
    },
    onSuccess: () => toast.success("Report saved and download started."),
    onError: () => toast.error("We couldn't generate the report right now."),
  });
  const rerun = useMutation({
    mutationFn: (basedOnId: string) => reanalyzeIdea({ data: { basedOnId } }),
    onSuccess: (res) =>
      navigate({ to: "/app/processing/$analysisId", params: { analysisId: res.analysisId } }),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "We couldn't re-run this idea right now."),
  });

  if (query.isPending) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
  if (query.isError) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Could not load this report</h1>
        <p className="text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Please try again from history."}
        </p>
        <Button asChild>
          <Link to="/app/history">Back to history</Link>
        </Button>
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Report not found</h1>
        <Button asChild>
          <Link to="/app/history">Back to history</Link>
        </Button>
      </div>
    );
  }

  const { startup, analysis, shareToken } = query.data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card px-4 py-3 shadow-[var(--shadow-border)]">
        <div>
          <p className="text-xs text-muted-foreground">
            Validation report
            {startup.version > 1 ? ` · version ${startup.version}` : ""}
          </p>
          <p className="font-display text-lg font-semibold">{startup.startupName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              useWizard.getState().loadForEdit(startup.id, startupToWizard(startup));
              void navigate({ to: "/app/validate" });
            }}
          >
            <Edit3 className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => rerun.mutate(startup.id)}
            disabled={rerun.isPending}
            title={`Re-score with current model (${MODEL_VERSION})`}
          >
            <RefreshCw className={`size-3.5 ${rerun.isPending ? "animate-spin" : ""}`} />
            {rerun.isPending ? "Re-running…" : "Re-run"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="/app/compare">
              <GitCompare className="size-3.5" />
              Compare
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={() => report.mutate()}
            disabled={report.isPending}
          >
            <Download className={`size-3.5 ${report.isPending ? "animate-bounce" : ""}`} />
            {report.isPending ? "Preparing…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <SharePanel analysisId={analysisId} initialToken={shareToken} />

      {versions.data && versions.data.length > 1 ? (
        <VersionsCard items={versions.data} currentAnalysisId={analysisId} />
      ) : null}

      <ReportBody
        startup={startup}
        analysis={analysis}
        economics={startup.economics}
        onSaveEconomics={async (values) => {
          try {
            await saveEconomics({ data: { startupId: startup.id, economics: values } });
            toast.success("Assumptions saved.");
            await query.refetch();
          } catch {
            toast.error("We couldn't save those assumptions. Please try again.");
          }
        }}
      />
    </div>
  );
}

function SharePanel({ analysisId, initialToken }: { analysisId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setReportSharing({ data: { analysisId, enabled } }),
    onSuccess: (res) => {
      setToken(res.token);
      toast.success(res.token ? "Share link created." : "Sharing turned off.");
    },
    onError: () => toast.error("We couldn't change sharing right now."),
  });
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = token ? `${origin}/sample?share=${token}` : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card px-4 py-3 shadow-[var(--shadow-border)]">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${link ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
        {link ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {link ? "Anyone with this link can view this report" : "Share this report"}
        </p>
        {link ? (
          <>
            <input
              readOnly
              value={link}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Read-only. Turning sharing off kills this link.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Create a private link for a mentor, co-founder, or investor.
          </p>
        )}
      </div>
      {link ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            navigator.clipboard
              .writeText(link)
              .then(() => toast.success("Link copied."))
              .catch(() => toast.error("Copy failed. Select and copy manually."))
          }
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={link ? "ghost" : "default"}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate(!link)}
        className="gap-1.5"
      >
        {link ? (
          <>
            <Link2Off className="size-3.5" />
            Stop sharing
          </>
        ) : (
          <>
            <Zap className="size-3.5" />
            Create link
          </>
        )}
      </Button>
    </div>
  );
}

const DIM_LABELS: { key: keyof VersionItem["scores"]; label: string }[] = [
  { key: "marketDemand",    label: "Market demand" },
  { key: "problemFit",      label: "Problem fit" },
  { key: "innovation",      label: "Innovation" },
  { key: "competition",     label: "Competition" },
  { key: "businessPotential", label: "Business" },
  { key: "scalability",     label: "Scalability" },
];

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

function VersionsCard({ items, currentAnalysisId }: { items: VersionItem[]; currentAnalysisId: string }) {
  const idx = items.findIndex((v) => v.analysisId === currentAnalysisId);
  const current = idx >= 0 ? items[idx] : null;
  const previous = idx > 0 ? items[idx - 1] : null;
  const changes =
    current && previous
      ? DIM_LABELS.map((d) => ({
          label: d.label,
          delta: current.scores[d.key] - previous.scores[d.key],
        })).filter((c) => c.delta !== 0)
      : [];

  return (
    <section className="bento-card space-y-4">
      <h2 className="font-display text-base font-semibold">Version History</h2>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60">
              {["Version", "Date", "Score", "Verdict", "Model", ""].map((h) => (
                <th key={h} className="pb-2 pr-4 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((v, i) => (
              <tr key={v.analysisId} className="border-b border-border/40 last:border-0">
                <td className="py-2.5 pr-4 tabular-nums font-medium">v{v.version}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground text-xs">
                  {new Date(v.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="py-2.5 pr-4 tabular-nums">
                  <span className="font-semibold">{v.finalScore}</span>
                  {i > 0 && (
                    <span className={`ml-1.5 text-xs ${v.finalScore - items[i - 1].finalScore > 0 ? "text-success" : v.finalScore - items[i - 1].finalScore < 0 ? "text-danger" : "text-muted-foreground"}`}>
                      ({signed(v.finalScore - items[i - 1].finalScore)})
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <Badge variant={verdictBadgeVariant(v.verdict)} className="text-xs">{v.verdict}</Badge>
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{v.modelVersion}</td>
                <td className="py-2.5 text-right">
                  {v.analysisId === currentAnalysisId ? (
                    <span className="text-xs text-muted-foreground">Current</span>
                  ) : (
                    <Link
                      to="/app/results/$analysisId"
                      params={{ analysisId: v.analysisId }}
                      className="text-xs text-primary hover:underline"
                    >
                      Open
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current && previous ? (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">vs v{previous.version}:{" "}</span>
          {changes.length
            ? changes.map((c) => `${c.label} ${signed(c.delta)}`).join(", ")
            : "no dimension changed"}
          {current.modelVersion !== previous.modelVersion ? (
            <span className="block mt-1">
              Different model versions may account for part of the change ({previous.modelVersion} → {current.modelVersion}).
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
