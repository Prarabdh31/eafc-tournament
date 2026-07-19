-- FC26 Watch Party Tournament — initial schema
-- Single elimination, 2 balanced brackets (A/B) merging into one Final.

create extension if not exists "pgcrypto";

-- =========================================================
-- players
-- =========================================================
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  skill_rank int not null,          -- 1 = lowest skill; sets draft order
  bracket text check (bracket in ('A', 'B')),  -- null until seeding runs
  seed int,                         -- position within their bracket, set at seeding time
  created_at timestamptz not null default now()
);

-- =========================================================
-- teams (FC26 club pool for the draft)
-- =========================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crest_url text,
  is_taken boolean not null default false
);

-- =========================================================
-- draft_picks — one row per pick, in order
-- =========================================================
create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  pick_number int not null unique,
  player_id uuid not null references players(id),
  team_id uuid not null references teams(id),
  picked_at timestamptz not null default now()
);

-- =========================================================
-- matches
-- =========================================================
create table matches (
  id uuid primary key default gen_random_uuid(),
  round text not null,              -- 'R16' | 'QF' | 'SF' | 'Final' | 'WC_FINAL'
  bracket text check (bracket in ('A', 'B')),  -- null for the cross-bracket Final / WC final
  match_order int not null default 0,  -- ordering within a round for display
  player1_id uuid references players(id),
  player2_id uuid references players(id),
  player1_team_id uuid references teams(id),
  player2_team_id uuid references teams(id),
  score1 int not null default 0,
  score2 int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  scheduled_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  winner_id uuid references players(id),
  -- for auto-advancing brackets: which match/slot the winner feeds into
  next_match_id uuid references matches(id),
  next_match_slot int check (next_match_slot in (1, 2)),
  created_at timestamptz not null default now()
);

create index matches_next_match_id_idx on matches(next_match_id);

-- =========================================================
-- awards — manual, admin-entered
-- =========================================================
create table awards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('trophy', 'medal')),
  category text not null,          -- e.g. 'Golden Boot', free text
  player_id uuid references players(id),
  awarded_at timestamptz not null default now()
);

-- =========================================================
-- tournament_state — single row, drives the Home Display
-- =========================================================
create table tournament_state (
  id int primary key default 1,
  phase text not null default 'pre_draft'
    check (phase in ('pre_draft', 'drafting', 'bracket_play', 'final', 'wc_final', 'complete')),
  current_match_id uuid references matches(id),
  wc_final_kickoff timestamptz not null default '2026-07-20T00:30:00+05:30',
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

insert into tournament_state (id, phase) values (1, 'pre_draft');

-- =========================================================
-- Row Level Security
-- =========================================================
alter table players enable row level security;
alter table teams enable row level security;
alter table draft_picks enable row level security;
alter table matches enable row level security;
alter table awards enable row level security;
alter table tournament_state enable row level security;

-- Public read everywhere (Home Display has no login)
create policy "public read players" on players for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read draft_picks" on draft_picks for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read awards" on awards for select using (true);
create policy "public read tournament_state" on tournament_state for select using (true);

-- Writes restricted to authenticated admin
create policy "admin write players" on players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write teams" on teams for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write draft_picks" on draft_picks for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write matches" on matches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write awards" on awards for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write tournament_state" on tournament_state for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================
-- Realtime
-- =========================================================
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table tournament_state;
alter publication supabase_realtime add table draft_picks;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table awards;
