import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { ReportBody } from "@/components/results/report-body";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicSample, getSharedReport } from "@/lib/server/public";
import { DEMO_IDEAS } from "@/lib/engine/demo";
import { cn } from "@/lib/utils";

/**
 * Public report page. With no search params it shows the labeled sample; with
 * `?share=<token>` it shows a report whose owner switched sharing on (read-only).
 */
export const Route = createFileRoute("/sample")({
  validateSearch: (search: Record<string, unknown>): { share?: string; slug?: string } => ({
    share: typeof search.share === "string" && search.share ? search.share : undefined,
    slug: typeof search.slug === "string" && search.slug ? search.slug : undefined,
  }),
  component: SamplePage,
});

function SamplePage() {
  const { share, slug } = Route.useSearch();
  const currentSlug = slug || "study-ai";
  const sample = useQuery({
    queryKey: ["sample", currentSlug],
    queryFn: () => getPublicSample({ data: currentSlug }),
    enabled: !share,
  });
  const shared = useQuery({
    queryKey: ["shared-report", share],
    queryFn: () => getSharedReport({ data: share ?? "" }),
    enabled: Boolean(share),
    retry: false,
  });

  // A shared report is private by link: ask search engines not to index it.
  useEffect(() => {
    if (!share) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.append(meta);
    return () => meta.remove();
  }, [share]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">{share ? "Shared validation report" : "Sample validation"}</h1>
            <p className="text-sm text-muted-foreground">
              {share
                ? (shared.data?.startup.startupName ?? "Read-only copy shared by its owner.")
                : sample.data
                  ? `${sample.data.startup.startupName} (${sample.data.startup.industry}) — labeled demo report, not a live market study.`
                  : "Explore demo validation reports across different startup archetypes."}
            </p>
          </div>
          <Button asChild>
            <Link to="/app/validate">Validate my idea</Link>
          </Button>
        </div>

        {!share && (
          <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-card p-3 border border-border shadow-sm">
            <span className="self-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Sample ideas:
            </span>
            {DEMO_IDEAS.map((d) => {
              const isActive = currentSlug === d.slug;
              return (
                <Link
                  key={d.slug}
                  to="/sample"
                  search={{ slug: d.slug }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/50"
                  )}
                >
                  <span>{d.startupName}</span>
                  <span className={cn("text-[10px]", isActive ? "text-primary-foreground/90" : "text-muted-foreground")}>
                    · {d.industry}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {share ? (
          <>
            {shared.isPending ? <Skeleton className="h-40 w-full" /> : null}
            {shared.data ? (
              <ReportBody
                startup={shared.data.startup}
                analysis={shared.data.analysis}
                economics={shared.data.economics}
                shared
              />
            ) : null}
            {shared.isSuccess && !shared.data ? (
              <div className="space-y-2 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
                <h2 className="font-display text-xl">This link is no longer active</h2>
                <p className="text-sm text-muted-foreground">
                  The owner may have turned sharing off, or the link was copied incorrectly.
                </p>
              </div>
            ) : null}
            {shared.isError ? (
              <p className="text-sm text-danger">We couldn&apos;t load this report. Please try again.</p>
            ) : null}
          </>
        ) : (
          <>
            {sample.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <p className="text-sm text-muted-foreground">Running the scoring engine on the sample idea…</p>
              </div>
            ) : null}
            {sample.data ? (
              <ReportBody startup={sample.data.startup} analysis={sample.data.analysis} sample />
            ) : null}
            {sample.isError ? (
              <p className="text-sm text-danger">We couldn&apos;t load the sample report. Please try again.</p>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
