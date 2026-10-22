-- Extra analysis columns, all with defaults so existing rows stay valid:
--  ml_proba / nlp_stats  the ML class probabilities and NLP stats analyzeStartup()
--                        already computes, so a reloaded report equals the fresh one.
--                        '[]' / '{}' mean "not recorded" (rows saved before this).
--  startup_ideas.location optional map check (OpenStreetMap counts and nearby points)
--                        for ideas that depend on a physical spot; null for everything else.
--  startup_ideas.economics   saved unit-economics assumptions (jsonb, null until filled in).
--  startup_ideas.root_id / version  every edit or re-run of an idea is a new row; all versions
--                        share root_id (the first version's id) and count up in `version`.
--  analysis_results.share_token  random token behind the public share link (null = not shared).
--  model_version         scoring + forest version that produced the report
--                        (see MODEL_VERSION in src/lib/engine/config.ts). Rows saved
--                        before versions existed read as '1.0-legacy'.

alter table analysis_results add column if not exists ml_proba jsonb not null default '[]';
alter table analysis_results add column if not exists nlp_stats jsonb not null default '{}';
alter table analysis_results add column if not exists model_version text not null default '1.0-legacy';
alter table startup_ideas add column if not exists location jsonb;
alter table startup_ideas add column if not exists economics jsonb;
alter table startup_ideas add column if not exists root_id text;
alter table startup_ideas add column if not exists version integer not null default 1;
create index if not exists startup_ideas_root_idx on startup_ideas (user_id, root_id);
create unique index if not exists startup_ideas_root_version_key on startup_ideas (root_id, version) where root_id is not null;
alter table analysis_results add column if not exists share_token text;
create unique index if not exists analysis_results_share_token_key on analysis_results (share_token) where share_token is not null;
