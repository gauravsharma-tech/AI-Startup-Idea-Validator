import { createServerFn } from "@tanstack/react-start";
import { normalizeMlLabel } from "./analysis-extras";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { analyzeStartup } from "@/lib/engine/analyze";
import { LEGACY_MODEL_VERSION } from "@/lib/engine/config";
import { DEMO_IDEAS } from "@/lib/engine/demo";
import type {
  AnalysisResult,
  StartupInput,
  StoredAnalysis,
  StoredStartup,
  UnitEconomicsInput,
} from "@/lib/engine/types";
import { asNumber } from "@/lib/utils";
import { economicsSchema, startupInputSchema, startupToWizard } from "@/lib/validation";
import {
  rowToAnalysis,
  rowToStartup,
  type AnalysisRow,
  type IdeaRow,
} from "./serialize";

export type HistoryItem = {
  id: string;
  startupId: string;
  analysisId: string | null;
  startupName: string;
  industry: string;
  stage: string;
  score: number | null;
  verdict: string | null;
  mlPrediction: string | null;
  isDemo: boolean;
  /** Which run of the idea this is (1 = first). Only the latest version is listed. */
  version: number;
  createdAt: string;
};

function asId(input: unknown): string {
  if (typeof input === "string" && input.trim()) return input.trim();
  if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>;
    for (const key of ["analysisId", "id", "data"]) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  throw new Error("Missing id.");
}

function toHistoryItem(r: {
  id: string;
  startup_name: string;
  industry: string;
  stage: string;
  is_demo: boolean;
  version?: number | string | null;
  created_at: string;
  analysis_id: string | null;
  final_score: number | null;
  verdict: string | null;
  ml_prediction: string | null;
}): HistoryItem {
  return {
    id: r.id,
    startupId: r.id,
    analysisId: r.analysis_id,
    startupName: r.startup_name,
    industry: r.industry,
    stage: r.stage,
    score: r.final_score == null ? null : asNumber(r.final_score),
    verdict: r.verdict,
    mlPrediction: r.ml_prediction ? normalizeMlLabel(r.ml_prediction) : null,
    isDemo: Boolean(r.is_demo),
    version: Math.max(1, asNumber(r.version ?? 1, 1)),
    createdAt: String(r.created_at),
  };
}

type Sql = Awaited<ReturnType<typeof getSql>>;

/**
 * Saves an idea, its analysis and its recommendation rows in ONE SQL statement
 * (data-modifying CTEs), so they commit or fail together on both Neon and PGLite.
 * `sql` here is not a transaction handle — on Neon every call may use a different
 * pooled connection — which is why this is a single statement and not BEGIN/COMMIT.
 * The analysis is computed BEFORE this is called, so a failed analysis never
 * leaves an orphan idea behind.
 */
async function saveIdeaWithAnalysis(
  sql: Sql,
  userId: string,
  idea: StartupInput,
  result: AnalysisResult,
  isDemo: boolean,
  opts: { rootId?: string; version?: number; economics?: UnitEconomicsInput | null } = {},
) {
  const ideaId = crypto.randomUUID();
  const rootId = opts.rootId ?? ideaId;
  const version = opts.version ?? 1;
  const analysisId = crypto.randomUUID();
  const recs = result.recommendations.map((rec, i) => ({
    id: crypto.randomUUID(),
    title: rec.title,
    detail: rec.detail,
    priority: rec.priority,
    sort_order: i,
  }));
  await sql`
    with new_idea as (
      insert into startup_ideas (
        id, user_id, startup_name, description, industry, stage,
        problem_statement, target_customer, problem_frequency, problem_severity,
        target_market, geographic_market, estimated_customers, expected_pricing,
        demand_perception, business_model, revenue_model, competitors,
        differentiator, scalability, is_demo, location,
        root_id, version, economics
      ) values (
        ${ideaId}, ${userId}, ${idea.startupName}, ${idea.description},
        ${idea.industry}, ${idea.stage}, ${idea.problemStatement}, ${idea.targetCustomer},
        ${idea.problemFrequency}, ${idea.problemSeverity}, ${idea.targetMarket},
        ${idea.geographicMarket}, ${idea.estimatedCustomers}, ${idea.expectedPricing},
        ${idea.demandPerception}, ${idea.businessModel}, ${idea.revenueModel},
        ${JSON.stringify(idea.competitors.filter(Boolean))}, ${idea.differentiator},
        ${idea.scalability}, ${isDemo},
        ${idea.location ? JSON.stringify(idea.location) : null}::jsonb,
        ${rootId}, ${version},
        ${opts.economics ? JSON.stringify(opts.economics) : null}::jsonb
      )
    ), new_analysis as (
      insert into analysis_results (
        id, startup_id, user_id,
        market_score, problem_fit_score, innovation_score, competition_score,
        business_score, scalability_score, customer_need_score, risk_score,
        final_score, verdict, ml_prediction, ml_confidence,
        nlp_keywords, strengths, weaknesses, swot, risks, competitor_analysis,
        recommendations, next_steps, summary, explanations, insight, analysis_source,
        ml_proba, nlp_stats, model_version
      ) values (
        ${analysisId}, ${ideaId}, ${userId},
        ${result.scores.marketDemand}, ${result.scores.problemFit}, ${result.scores.innovation},
        ${result.scores.competition}, ${result.scores.businessPotential}, ${result.scores.scalability},
        ${result.scores.customerNeed}, ${result.scores.risk},
        ${result.finalScore}, ${result.verdict}, ${result.mlPrediction}, ${result.mlConfidence},
        ${JSON.stringify(result.keywords)}::jsonb,
        ${JSON.stringify(result.strengths)}::jsonb,
        ${JSON.stringify(result.weaknesses)}::jsonb,
        ${JSON.stringify(result.swot)}::jsonb,
        ${JSON.stringify(result.risks)}::jsonb,
        ${JSON.stringify(result.competitors)}::jsonb,
        ${JSON.stringify(result.recommendations)}::jsonb,
        ${JSON.stringify(result.nextSteps)}::jsonb,
        ${JSON.stringify(result.summary)}::jsonb,
        ${JSON.stringify(result.explanations)}::jsonb,
        ${result.insight}, ${result.analysisSource},
        ${JSON.stringify(result.mlProba)}::jsonb,
        ${JSON.stringify(result.nlpStats)}::jsonb,
        ${result.modelVersion}
      )
    )
    insert into recommendations (id, analysis_id, user_id, recommendation, detail, priority, sort_order)
    select r.id, ${analysisId}::text, ${userId}::text, r.title, r.detail, r.priority, r.sort_order
    from jsonb_to_recordset(${JSON.stringify(recs)}::jsonb)
      as r(id text, title text, detail text, priority text, sort_order integer)
  `;
  return { ideaId, analysisId };
}

export const createAndAnalyze = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => startupInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    // Analyze first: if this throws, nothing has been written yet.
    const result = await analyzeStartup(data, { useLlm: true });
    const sql = await getSql();
    const { ideaId, analysisId } = await saveIdeaWithAnalysis(
      sql,
      context.userId,
      data,
      result,
      false,
    );
    return { ideaId, analysisId, result };
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      startup_name: string;
      industry: string;
      stage: string;
      is_demo: boolean;
      version: number;
      created_at: string;
      analysis_id: string | null;
      final_score: number | null;
      verdict: string | null;
      ml_prediction: string | null;
    }>`
      select s.id, s.startup_name, s.industry, s.stage, s.is_demo, s.version, s.created_at,
             a.id as analysis_id, a.final_score, a.verdict, a.ml_prediction
      from startup_ideas s
      left join lateral (
        select id, final_score, verdict, ml_prediction
        from analysis_results
        where startup_id = s.id
        order by created_at desc
        limit 1
      ) a on true
      where s.user_id = ${context.userId}
      and not exists (
        select 1 from startup_ideas n
        where n.user_id = s.user_id
          and coalesce(n.root_id, n.id) = coalesce(s.root_id, s.id)
          and n.version > s.version
      )
      order by s.created_at desc
    `;
    return rows.map(toHistoryItem);
  });

export const getStartup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asId(input))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<IdeaRow>`
      select * from startup_ideas where id = ${id} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) return null;
    return rowToStartup(rows[0]);
  });

export const getAnalysisBundle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asId(input))
  .handler(async ({ context, data: analysisId }) => {
    const sql = await getSql();
    const analyses = await sql<AnalysisRow>`
      select * from analysis_results where id = ${analysisId} and user_id = ${context.userId} limit 1
    `;
    const analysis = analyses[0];
    if (!analysis) return null;
    const ideas = await sql<IdeaRow>`
      select * from startup_ideas where id = ${analysis.startup_id} and user_id = ${context.userId} limit 1
    `;
    if (!ideas[0]) return null;
    return {
      startup: rowToStartup(ideas[0]),
      analysis: rowToAnalysis(analysis),
      shareToken: analysis.share_token ?? null,
    };
  });

export const deleteStartup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asId(input))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    // History lists only the latest version, so deleting an idea removes all its versions;
    // otherwise an older version would reappear in the list.
    await sql`
      delete from startup_ideas
      where user_id = ${context.userId}
        and coalesce(root_id, id) = (
          select coalesce(root_id, id) from startup_ideas
          where id = ${id} and user_id = ${context.userId}
        )
    `;
    return { ok: true as const };
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const ideas = await sql<{ c: number }>`
      select count(distinct coalesce(root_id, id))::int as c from startup_ideas where user_id = ${context.userId}
    `;
    const analyses = await sql<{
      c: number;
      avg: number | string | null;
      promising: number;
    }>`
      select count(*)::int as c,
             coalesce(avg(a.final_score), 0) as avg,
             count(*) filter (where a.final_score >= 80)::int as promising
      from analysis_results a
      join startup_ideas s on s.id = a.startup_id
      where a.user_id = ${context.userId}
        and not exists (
          select 1 from startup_ideas n
          where n.user_id = s.user_id
            and coalesce(n.root_id, n.id) = coalesce(s.root_id, s.id)
            and n.version > s.version
        )
    `;
    const reports = await sql<{ c: number }>`
      select count(*)::int as c from reports where user_id = ${context.userId}
    `;
    const dist = await sql<{ verdict: string; c: number }>`
      select a.verdict, count(*)::int as c
      from analysis_results a
      join startup_ideas s on s.id = a.startup_id
      where a.user_id = ${context.userId}
        and not exists (
          select 1 from startup_ideas n
          where n.user_id = s.user_id
            and coalesce(n.root_id, n.id) = coalesce(s.root_id, s.id)
            and n.version > s.version
        )
      group by a.verdict
    `;
    const recentRows = await sql<{
      id: string;
      startup_name: string;
      industry: string;
      stage: string;
      is_demo: boolean;
      version: number;
      created_at: string;
      analysis_id: string | null;
      final_score: number | null;
      verdict: string | null;
      ml_prediction: string | null;
    }>`
      select s.id, s.startup_name, s.industry, s.stage, s.is_demo, s.version, s.created_at,
             a.id as analysis_id, a.final_score, a.verdict, a.ml_prediction
      from startup_ideas s
      left join lateral (
        select id, final_score, verdict, ml_prediction
        from analysis_results where startup_id = s.id
        order by created_at desc limit 1
      ) a on true
      where s.user_id = ${context.userId}
      and not exists (
        select 1 from startup_ideas n
        where n.user_id = s.user_id
          and coalesce(n.root_id, n.id) = coalesce(s.root_id, s.id)
          and n.version > s.version
      )
      order by s.created_at desc
      limit 6
    `;
    return {
      ideasAnalyzed: asNumber(ideas[0]?.c),
      averageScore: Math.round(asNumber(analyses[0]?.avg)),
      highlyPromising: asNumber(analyses[0]?.promising),
      reportsGenerated: asNumber(reports[0]?.c),
      distribution: dist.map((d) => ({ verdict: d.verdict, count: asNumber(d.c) })),
      recent: recentRows.map(toHistoryItem),
    };
  });

export const seedDemoIdeas = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const existing = await sql<{ startup_name: string }>`
      select startup_name from startup_ideas
      where user_id = ${context.userId} and is_demo = true
    `;
    const have = new Set(existing.map((r) => r.startup_name));
    const missing = DEMO_IDEAS.filter((d) => !have.has(d.startupName));
    if (missing.length === 0) return { seeded: 0, already: true as const };
    let seeded = 0;
    for (const idea of missing) {
      const result = await analyzeStartup(idea, { useLlm: false });
      await saveIdeaWithAnalysis(sql, context.userId, idea, result, true);
      seeded += 1;
    }
    return { seeded, already: false as const };
  });

export const compareAnalyses = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ids: string[]) => (Array.isArray(ids) ? ids.filter(Boolean).slice(0, 4) : []))
  .handler(async ({ context, data: ids }) => {
    if (ids.length < 2) throw new Error("Select at least two ideas to compare.");
    const sql = await getSql();
    const out: { startup: StoredStartup; analysis: StoredAnalysis }[] = [];
    for (const id of ids) {
      const analyses = await sql<AnalysisRow>`
        select * from analysis_results where id = ${id} and user_id = ${context.userId} limit 1
      `;
      if (!analyses[0]) continue;
      const ideas = await sql<IdeaRow>`
        select * from startup_ideas where id = ${analyses[0].startup_id} and user_id = ${context.userId} limit 1
      `;
      if (!ideas[0]) continue;
      out.push({ startup: rowToStartup(ideas[0]), analysis: rowToAnalysis(analyses[0]) });
    }
    if (out.length < 2) throw new Error("Could not load enough analyses to compare.");
    const ranked = [...out].sort((a, b) => b.analysis.finalScore - a.analysis.finalScore);
    const winner = ranked[0];
    const runner = ranked[1];
    const why = `${winner.startup.startupName} currently scores ${winner.analysis.finalScore} versus ${runner.startup.startupName} at ${runner.analysis.finalScore}. The higher composite is an analytical estimate, not a guarantee of success.`;
    const versions = [...new Set(out.map((o) => o.analysis.modelVersion))];
    const versionNote =
      versions.length > 1
        ? ` These reports come from different scoring model versions (${versions.join(", ")}), so the scores are not directly comparable; re-run the older ideas first.`
        : "";
    return { items: out, why: why + versionNote, strongerId: winner.analysis.id };
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asId(input))
  .handler(async ({ context, data: analysisId }) => {
    const sql = await getSql();
    const analyses = await sql<AnalysisRow>`
      select * from analysis_results where id = ${analysisId} and user_id = ${context.userId} limit 1
    `;
    if (!analyses[0]) throw new Error("Analysis not found.");
    const ideas = await sql<IdeaRow>`
      select * from startup_ideas where id = ${analyses[0].startup_id} and user_id = ${context.userId} limit 1
    `;
    if (!ideas[0]) throw new Error("Startup not found.");
    const existing = await sql<{ id: string }>`
      select id from reports where analysis_id = ${analysisId} and user_id = ${context.userId} limit 1
    `;
    const reportId = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) {
      await sql`
        insert into reports (id, user_id, analysis_id, startup_id, title)
        values (
          ${reportId}, ${context.userId}, ${analysisId}, ${ideas[0].id},
          ${`${ideas[0].startup_name} validation report`}
        )
      `;
    }
    return {
      reportId,
      startup: rowToStartup(ideas[0]),
      analysis: rowToAnalysis(analyses[0]),
    };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      analysis_id: string;
      startup_id: string;
      title: string;
      created_at: string;
      final_score: number | null;
      verdict: string | null;
      startup_name: string;
    }>`
      select r.id, r.analysis_id, r.startup_id, r.title, r.created_at,
             a.final_score, a.verdict, s.startup_name
      from reports r
      join analysis_results a on a.id = r.analysis_id
      join startup_ideas s on s.id = r.startup_id
      where r.user_id = ${context.userId}
      order by r.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      analysisId: r.analysis_id,
      startupId: r.startup_id,
      title: r.title,
      createdAt: String(r.created_at),
      score: r.final_score == null ? null : asNumber(r.final_score),
      verdict: r.verdict,
      startupName: r.startup_name,
    }));
  });

/** One row of an idea's version history (the latest analysis of each version). */
export type VersionItem = {
  startupId: string;
  analysisId: string;
  version: number;
  startupName: string;
  createdAt: string;
  finalScore: number;
  verdict: string;
  modelVersion: string;
  scores: {
    marketDemand: number;
    problemFit: number;
    innovation: number;
    competition: number;
    businessPotential: number;
    scalability: number;
  };
};

/**
 * Runs a new version of an idea: either the same inputs under the current model
 * (no `idea`), or an edited copy. Older versions are kept untouched.
 */
export const reanalyzeIdea = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const rec = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
      basedOnId: asId(rec.basedOnId),
      idea: rec.idea === undefined || rec.idea === null ? undefined : startupInputSchema.parse(rec.idea),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<IdeaRow>`
      select * from startup_ideas where id = ${data.basedOnId} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) throw new Error("That idea no longer exists.");
    const base = rowToStartup(rows[0]);
    const input: StartupInput = data.idea ?? startupToWizard(base);
    // Analyze first: if this throws, nothing has been written yet.
    const result = await analyzeStartup(input, { useLlm: true });
    const latest = await sql<{ v: number }>`
      select coalesce(max(version), 0)::int as v from startup_ideas
      where user_id = ${context.userId} and coalesce(root_id, id) = ${base.rootId}
    `;
    const { ideaId, analysisId } = await saveIdeaWithAnalysis(sql, context.userId, input, result, false, {
      rootId: base.rootId,
      version: asNumber(latest[0]?.v) + 1,
      economics: base.economics,
    });
    return { ideaId, analysisId, result };
  });

export const getVersionHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asId(input))
  .handler(async ({ context, data: analysisId }): Promise<VersionItem[]> => {
    const sql = await getSql();
    const own = await sql<{ root: string }>`
      select coalesce(s.root_id, s.id) as root
      from analysis_results a join startup_ideas s on s.id = a.startup_id
      where a.id = ${analysisId} and a.user_id = ${context.userId} limit 1
    `;
    if (!own[0]) return [];
    const rows = await sql<{
      startup_id: string;
      analysis_id: string;
      version: number;
      startup_name: string;
      created_at: string;
      final_score: number;
      verdict: string;
      model_version: string | null;
      market_score: number;
      problem_fit_score: number;
      innovation_score: number;
      competition_score: number;
      business_score: number;
      scalability_score: number;
    }>`
      select s.id as startup_id, a.id as analysis_id, s.version, s.startup_name, s.created_at,
             a.final_score, a.verdict, a.model_version, a.market_score, a.problem_fit_score,
             a.innovation_score, a.competition_score, a.business_score, a.scalability_score
      from startup_ideas s
      join lateral (
        select * from analysis_results where startup_id = s.id order by created_at desc limit 1
      ) a on true
      where s.user_id = ${context.userId} and coalesce(s.root_id, s.id) = ${own[0].root}
      order by s.version asc, s.created_at asc
    `;
    return rows.map((r) => ({
      startupId: r.startup_id,
      analysisId: r.analysis_id,
      version: Math.max(1, asNumber(r.version, 1)),
      startupName: r.startup_name,
      createdAt: String(r.created_at),
      finalScore: asNumber(r.final_score),
      verdict: r.verdict,
      modelVersion: r.model_version || LEGACY_MODEL_VERSION,
      scores: {
        marketDemand: asNumber(r.market_score),
        problemFit: asNumber(r.problem_fit_score),
        innovation: asNumber(r.innovation_score),
        competition: asNumber(r.competition_score),
        businessPotential: asNumber(r.business_score),
        scalability: asNumber(r.scalability_score),
      },
    }));
  });

export const saveEconomics = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const rec = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return { startupId: asId(rec.startupId), economics: economicsSchema.parse(rec.economics) };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update startup_ideas set economics = ${JSON.stringify(data.economics)}::jsonb
      where id = ${data.startupId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

function newShareToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Turns the public share link for one report on or off. Returns the token, or null when off. */
export const setReportSharing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const rec = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return { analysisId: asId(rec.analysisId), enabled: rec.enabled === true };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ share_token: string | null }>`
      select share_token from analysis_results
      where id = ${data.analysisId} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) throw new Error("Report not found.");
    if (!data.enabled) {
      await sql`update analysis_results set share_token = null where id = ${data.analysisId} and user_id = ${context.userId}`;
      return { token: null as string | null };
    }
    const token = rows[0].share_token ?? newShareToken();
    await sql`update analysis_results set share_token = ${token} where id = ${data.analysisId} and user_id = ${context.userId}`;
    return { token: token as string | null };
  });
