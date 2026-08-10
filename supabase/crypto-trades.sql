-- PocketBudget — journal de trades crypto (achats / ventes)
-- Supabase → SQL Editor → Run

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

revoke all on public.crypto_trades from anon;
grant select, insert, update, delete on public.crypto_trades to authenticated;
