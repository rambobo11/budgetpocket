-- PocketBudget — schéma consolidé (fresh install)
-- Supabase → SQL Editor → Run
--
-- Si ta base existe déjà, n’exécute PAS ce fichier en entier :
-- utilise plutôt les scripts incrémentaux (add-*.sql) déjà appliqués.
-- Ce fichier sert de référence unique + setup greenfield.

-- ═══════════════════════════════════════════
-- EXPENSES
-- ═══════════════════════════════════════════
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text,
  payment_method text not null default 'cb' check (payment_method in ('cb', 'swile')),
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_created_at_idx
  on public.expenses (user_id, created_at desc);

alter table public.expenses enable row level security;

drop policy if exists "Users can view own expenses" on public.expenses;
drop policy if exists "Users can insert own expenses" on public.expenses;
drop policy if exists "Users can update own expenses" on public.expenses;
drop policy if exists "Users can delete own expenses" on public.expenses;

create policy "Users can view own expenses"
  on public.expenses for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.expenses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.expenses for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.expenses for delete to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- INCOMES
-- ═══════════════════════════════════════════
create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  source text not null,
  description text,
  budget_month date not null,
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_created_at_idx
  on public.incomes (user_id, created_at desc);

create index if not exists incomes_user_budget_month_idx
  on public.incomes (user_id, budget_month desc);

alter table public.incomes enable row level security;

drop policy if exists "Users can view own incomes" on public.incomes;
drop policy if exists "Users can insert own incomes" on public.incomes;
drop policy if exists "Users can update own incomes" on public.incomes;
drop policy if exists "Users can delete own incomes" on public.incomes;

create policy "Users can view own incomes"
  on public.incomes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own incomes"
  on public.incomes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own incomes"
  on public.incomes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own incomes"
  on public.incomes for delete to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- ASSETS (patrimoine)
-- ═══════════════════════════════════════════
create table if not exists public.assets (
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

create index if not exists assets_user_type_idx
  on public.assets (user_id, asset_type);

alter table public.assets enable row level security;

drop policy if exists "Users can view own assets" on public.assets;
drop policy if exists "Users can insert own assets" on public.assets;
drop policy if exists "Users can update own assets" on public.assets;
drop policy if exists "Users can delete own assets" on public.assets;

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

-- ═══════════════════════════════════════════
-- CREDITS (créances / crédits)
-- ═══════════════════════════════════════════
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person text not null,
  kind text not null check (kind in ('On me doit', 'Crédit')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'MAD')),
  notes text,
  status text not null default 'open' check (status in ('open', 'repaid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credits_user_status_idx
  on public.credits (user_id, status, created_at desc);

alter table public.credits enable row level security;

drop policy if exists "Users can view own credits" on public.credits;
drop policy if exists "Users can insert own credits" on public.credits;
drop policy if exists "Users can update own credits" on public.credits;
drop policy if exists "Users can delete own credits" on public.credits;

create policy "Users can view own credits"
  on public.credits for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own credits"
  on public.credits for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own credits"
  on public.credits for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own credits"
  on public.credits for delete to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- UPCOMING (à venir : à payer / à recevoir)
-- ═══════════════════════════════════════════
create table if not exists public.upcoming (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('À payer', 'À recevoir')),
  amount numeric(12, 2) not null check (amount > 0),
  due_date date,
  notes text,
  status text not null default 'open' check (status in ('open', 'done')),
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upcoming_user_status_due_idx
  on public.upcoming (user_id, status, due_date asc nulls last);

alter table public.upcoming enable row level security;

drop policy if exists "Users can view own upcoming" on public.upcoming;
drop policy if exists "Users can insert own upcoming" on public.upcoming;
drop policy if exists "Users can update own upcoming" on public.upcoming;
drop policy if exists "Users can delete own upcoming" on public.upcoming;

create policy "Users can view own upcoming"
  on public.upcoming for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own upcoming"
  on public.upcoming for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own upcoming"
  on public.upcoming for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own upcoming"
  on public.upcoming for delete to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- CRYPTO TRADES (journal achats / ventes)
-- ═══════════════════════════════════════════
create table if not exists public.crypto_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  coingecko_id text not null,
  quantity numeric(28, 12) not null check (quantity > 0),
  price_quote numeric(28, 12) not null check (price_quote >= 0),
  quote_currency text not null default 'EUR'
    check (quote_currency in ('EUR', 'USD', 'USDT', 'USDC')),
  fee_quote numeric(28, 12) not null default 0 check (fee_quote >= 0),
  traded_at date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crypto_trades_user_traded_idx
  on public.crypto_trades (user_id, traded_at desc);

create index if not exists crypto_trades_user_coin_idx
  on public.crypto_trades (user_id, coingecko_id);

alter table public.crypto_trades enable row level security;

drop policy if exists "Users can view own crypto_trades" on public.crypto_trades;
drop policy if exists "Users can insert own crypto_trades" on public.crypto_trades;
drop policy if exists "Users can update own crypto_trades" on public.crypto_trades;
drop policy if exists "Users can delete own crypto_trades" on public.crypto_trades;

create policy "Users can view own crypto_trades"
  on public.crypto_trades for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own crypto_trades"
  on public.crypto_trades for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own crypto_trades"
  on public.crypto_trades for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own crypto_trades"
  on public.crypto_trades for delete to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- Defense-in-depth : pas d’accès anon
-- ═══════════════════════════════════════════
revoke all on public.expenses from anon;
revoke all on public.incomes from anon;
revoke all on public.assets from anon;
revoke all on public.credits from anon;
revoke all on public.upcoming from anon;
revoke all on public.crypto_trades from anon;

grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.incomes to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.credits to authenticated;
grant select, insert, update, delete on public.upcoming to authenticated;
grant select, insert, update, delete on public.crypto_trades to authenticated;
