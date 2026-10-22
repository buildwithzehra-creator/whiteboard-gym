-- Whiteboard Gym database (Supabase / Postgres).
-- Run once in Supabase → SQL Editor. Every user can only see their own sessions, boards and reports.

create extension if not exists pgcrypto;

-- The prompt library. Readable by everyone except the interviewer notes (served only by the API).
create table if not exists prompts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  brief            text not null,
  category         text not null check (category in ('design-product','redesign-critique','constraint','physical-iot','systems')),
  difficulty       smallint not null default 2 check (difficulty between 1 and 3),
  time_box_min     smallint not null default 30,
  interviewer_notes text,
  source           text,
  source_url       text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  prompt_id     uuid references prompts(id),
  status        text not null default 'clarify' check (status in ('clarify','design','present','qa','done','abandoned')),
  respun        boolean not null default false,
  panel_config  jsonb not null default '[{"role":"manager","name":"Maya"},{"role":"engineer","name":"Leo"}]',
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create table if not exists messages (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  speaker     text not null check (speaker in ('candidate','manager','engineer','designer','developer','system')),
  content     text not null,
  phase       text,
  created_at  timestamptz not null default now()
);

-- Mochiboard's board object, stored as-is.
create table if not exists boards (
  session_id     uuid primary key references sessions(id) on delete cascade,
  board_json     jsonb not null,
  thumbnail_url  text,
  updated_at     timestamptz not null default now()
);

create table if not exists reports (
  session_id     uuid primary key references sessions(id) on delete cascade,
  overall_score  numeric(3,1),
  rubric_json    jsonb not null,
  went_well      text[] not null default '{}',
  keep_doing     text[] not null default '{}',
  improve        text[] not null default '{}',
  user_rating    smallint check (user_rating in (-1, 1)),
  created_at     timestamptz not null default now()
);

-- Fair-use guard (not a paywall): how much each person used per day.
create table if not exists usage (
  user_id          uuid not null references auth.users(id) on delete cascade,
  day              date not null default current_date,
  sessions_started int not null default 0,
  tokens           int not null default 0,
  primary key (user_id, day)
);

create index if not exists sessions_user_idx on sessions(user_id, started_at desc);
create index if not exists messages_session_idx on messages(session_id, id);

-- Row-level security
alter table prompts  enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table boards   enable row level security;
alter table reports  enable row level security;
alter table usage    enable row level security;

-- Public prompt list without the hidden notes
create or replace view public_prompts with (security_invoker = on) as
  select id, slug, title, brief, category, difficulty, time_box_min from prompts where active;
revoke select on prompts from anon, authenticated;
grant select (id, slug, title, brief, category, difficulty, time_box_min, active) on prompts to anon, authenticated;
create policy "prompts are public" on prompts for select using (active);

create policy "own sessions" on sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on messages for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own boards" on boards for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own reports" on reports for select
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own usage" on usage for select using (auth.uid() = user_id);
-- reports and usage are written only by the API with the service role key
