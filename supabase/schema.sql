-- Heracles WebApp schema (idempotent)
-- Paste into Supabase: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

/* =====================
   1) Core identity
===================== */
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  role text not null default 'user', -- user | vip | admin
  vip_until timestamptz,
  created_at timestamptz not null default now()
);

-- profile fields for onboarding (added safely)
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists birthdate date;
alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists goal_weight_kg numeric;
alter table public.profiles add column if not exists goal_date date;
alter table public.profiles add column if not exists calories_target int;
alter table public.profiles add column if not exists steps_target int;
alter table public.profiles add column if not exists water_goal_ml int;
alter table public.profiles add column if not exists onboarded boolean not null default false;

/* =====================
   2) Food / logs
===================== */
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- usda/tfda/off
  external_id text not null,
  name text not null,
  nutrients_per_100g jsonb not null default '{}'::jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id)
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  meal_type text not null default 'unknown',
  items jsonb not null default '[]'::jsonb,
  total_kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  verification_level text not null default 'silver', -- silver/gold
  verified boolean not null default false,
  meta jsonb not null default '{}'::jsonb
);

/* =====================
   3) Steps / body / exercise
===================== */
create table if not exists public.step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at date not null default current_date,
  steps int not null default 0,
  meta jsonb not null default '{}'::jsonb
);
create unique index if not exists step_logs_user_date on public.step_logs(user_id, created_at);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  note text,
  meta jsonb not null default '{}'::jsonb
);
create unique index if not exists body_metrics_user_date on public.body_metrics(user_id, created_at);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  minutes int not null default 0,
  activity text not null default 'unknown',
  met numeric,
  kcal_est numeric,
  note text,
  meta jsonb not null default '{}'::jsonb
);

/* =====================
   4) Economy / WhatToEat
===================== */
create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  delta int not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.dislikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  place_name text,
  created_at timestamptz not null default now(),
  unique(user_id, place_id)
);

create table if not exists public.spin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  place_id text,
  action text not null, -- accept/dislike/skip
  meta jsonb not null default '{}'::jsonb
);

/* =====================
   5) Governance: edit requests + audit
===================== */
create table if not exists public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  target_table text not null,
  target_id uuid,
  patch jsonb not null,
  reason text,
  status text not null default 'pending', -- pending/approved/rejected
  admin_id uuid references auth.users(id),
  admin_note text,
  decided_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb
);

/* =====================
   6) App settings
===================== */
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Minimal calorie presets (can be edited later in admin). The detailed table can be pasted later.
insert into public.app_settings(key, value)
values (
  'calorie_presets',
  '{
    "version":"1.0",
    "items":[
      {"id":"egg_crepe_plain","name_zh":"原味蛋餅","kcal_min":280,"kcal_max":330,"kcal_default":300},
      {"id":"lu_rou_fan_small","name_zh":"滷肉飯（小碗）","kcal_min":400,"kcal_max":540,"kcal_default":470},
      {"id":"beef_noodle","name_zh":"牛肉麵","kcal_min":450,"kcal_max":600,"kcal_default":510},
      {"id":"fried_pork_rice","name_zh":"炸排骨便當","kcal_min":800,"kcal_max":950,"kcal_default":870},
      {"id":"boba_milk_tea","name_zh":"珍珠奶茶（全糖,500ml）","kcal_min":480,"kcal_max":550,"kcal_default":510}
    ]
  }'::jsonb
) on conflict (key) do nothing;

/* =====================
   7) Triggers: create profile
===================== */
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

/* =====================
   8) RLS
===================== */
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.step_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.dislikes enable row level security;
alter table public.spin_logs enable row level security;
alter table public.edit_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- Profiles: user can read/update own (note: sensitive changes should still go through edit_requests in UI)
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Foods: read-only for clients (deny by default); server uses service role.

-- Meal logs: user can read/insert own
create policy "meal_select_own" on public.meal_logs
for select using (auth.uid() = user_id);

create policy "meal_insert_own" on public.meal_logs
for insert with check (auth.uid() = user_id);

-- Steps
create policy "steps_select_own" on public.step_logs
for select using (auth.uid() = user_id);

create policy "steps_upsert_own" on public.step_logs
for insert with check (auth.uid() = user_id);

create policy "steps_update_own" on public.step_logs
for update using (auth.uid() = user_id);

-- Body metrics
create policy "metrics_select_own" on public.body_metrics
for select using (auth.uid() = user_id);

create policy "metrics_upsert_own" on public.body_metrics
for insert with check (auth.uid() = user_id);

create policy "metrics_update_own" on public.body_metrics
for update using (auth.uid() = user_id);

-- Exercise
create policy "exercise_select_own" on public.exercise_logs
for select using (auth.uid() = user_id);

create policy "exercise_insert_own" on public.exercise_logs
for insert with check (auth.uid() = user_id);

-- Coin ledger (read-only)
create policy "coins_select_own" on public.coin_ledger
for select using (auth.uid() = user_id);

-- WhatToEat dislikes/spin
create policy "dislikes_select_own" on public.dislikes
for select using (auth.uid() = user_id);

create policy "dislikes_insert_own" on public.dislikes
for insert with check (auth.uid() = user_id);

create policy "spin_insert" on public.spin_logs
for insert with check (auth.uid() = user_id);

create policy "spin_select_own" on public.spin_logs
for select using (auth.uid() = user_id);

-- Edit requests: user creates + reads own
create policy "edit_req_insert_own" on public.edit_requests
for insert with check (auth.uid() = requester_id);

create policy "edit_req_select_own" on public.edit_requests
for select using (auth.uid() = requester_id);

-- app_settings / audit_logs: server-only (deny by default)
