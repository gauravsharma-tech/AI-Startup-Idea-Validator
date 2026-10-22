-- IdeaValidator application schema.
-- Per-user rows always carry user_id TEXT (Better Auth ids / preview 'dev-user').

create table if not exists startup_ideas (
  id text primary key,
  user_id text not null,
  startup_name text not null,
  description text not null,
  industry text not null,
  stage text not null,
  problem_statement text not null,
  target_customer text not null,
  problem_frequency text not null,
  problem_severity integer not null,
  target_market text not null,
  geographic_market text not null,
  estimated_customers integer,
  expected_pricing numeric,
  demand_perception integer not null,
  business_model text not null,
  revenue_model text not null,
  competitors text not null default '[]',
  differentiator text not null,
  scalability integer not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists startup_ideas_user_id_idx on startup_ideas (user_id);
create index if not exists startup_ideas_created_at_idx on startup_ideas (user_id, created_at desc);

create table if not exists analysis_results (
  id text primary key,
  startup_id text not null references startup_ideas(id) on delete cascade,
  user_id text not null,
  market_score integer not null,
  problem_fit_score integer not null,
  innovation_score integer not null,
  competition_score integer not null,
  business_score integer not null,
  scalability_score integer not null,
  customer_need_score integer not null,
  risk_score integer not null,
  final_score integer not null,
  verdict text not null,
  ml_prediction text not null,
  ml_confidence numeric not null,
  nlp_keywords jsonb not null default '[]',
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  swot jsonb not null default '{}',
  risks jsonb not null default '[]',
  competitor_analysis jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  next_steps jsonb not null default '[]',
  summary jsonb not null default '{}',
  explanations jsonb not null default '{}',
  insight text not null default '',
  analysis_source text not null default 'rules+ml',
  created_at timestamptz not null default now()
);

create index if not exists analysis_results_user_id_idx on analysis_results (user_id);
create index if not exists analysis_results_startup_id_idx on analysis_results (startup_id);

create table if not exists recommendations (
  id text primary key,
  analysis_id text not null references analysis_results(id) on delete cascade,
  user_id text not null,
  recommendation text not null,
  detail text not null default '',
  priority text not null default 'medium',
  sort_order integer not null default 0
);

create index if not exists recommendations_analysis_id_idx on recommendations (analysis_id);

create table if not exists reports (
  id text primary key,
  user_id text not null,
  analysis_id text not null references analysis_results(id) on delete cascade,
  startup_id text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_id_idx on reports (user_id, created_at desc);
