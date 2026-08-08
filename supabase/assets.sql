-- PocketBudget — table assets (patrimoine)
-- À coller dans Supabase → SQL Editor → Run

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  asset_type text not null,
  currency text not null default 'EUR' check (currency in ('EUR', 'MAD')),
  value_original numeric(14, 2) not null check (value_original >= 0),
  value_eur numeric(14, 2) not null check (value_eur >= 0),
  quantity numeric(18, 8),
  coingecko_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_user_type_idx
  on public.assets (user_id, asset_type);

alter table public.assets enable row level security;

create policy "Users can view own assets"
  on public.assets for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own assets"
  on public.assets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own assets"
  on public.assets for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete to authenticated
  using (auth.uid() = user_id);
