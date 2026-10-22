import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { analyzeStartup } from "@/lib/engine/analyze";
import { DEMO_IDEAS } from "@/lib/engine/demo";
import { getModelMetrics } from "@/lib/engine/forest";
import { rowToAnalysis, rowToStartup, type AnalysisRow, type IdeaRow } from "./serialize";

export const getPublicSample = createServerFn({ method: "GET" })
  .validator((slug?: string) => slug ?? "study-ai")
  .handler(async ({ data: slug }) => {
    const idea = DEMO_IDEAS.find((d) => d.slug === slug) ?? DEMO_IDEAS[0];
    const result = await analyzeStartup(idea, { useLlm: false });
    return { startup: idea, analysis: result, samples: DEMO_IDEAS.map((d) => d.slug) };
  });

export const getMethodology = createServerFn({ method: "GET" }).handler(async () => {
  return getModelMetrics();
});

/**
 * Public, read-only view of a report whose owner switched sharing on. The 192-bit
 * random token is the only credential; turning sharing off deletes it. Internal
 * ids and the owner are never returned.
 */
export const getSharedReport = createServerFn({ method: "GET" })
  .validator((token: unknown) => (typeof token === "string" && /^[a-f0-9]{32,64}$/.test(token) ? token : ""))
  .handler(async ({ data: token }) => {
    if (!token) return null;
    const sql = await getSql();
    const analyses = await sql<AnalysisRow>`select * from analysis_results where share_token = ${token} limit 1`;
    if (!analyses[0]) return null;
    const ideas = await sql<IdeaRow>`select * from startup_ideas where id = ${analyses[0].startup_id} limit 1`;
    if (!ideas[0]) return null;
    const stored = rowToStartup(ideas[0]);
    const { id: _id, isDemo: _demo, createdAt: _created, rootId: _root, economics, version, ...startup } = stored;
    const { id: _aid, startupId: _sid, ...analysis } = rowToAnalysis(analyses[0]);
    return { startup, analysis, economics, version, sharedFrom: String(analyses[0].created_at) };
  });
