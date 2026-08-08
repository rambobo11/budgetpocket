-- PocketBudget — tracking prix crypto (CoinGecko)
-- À coller dans Supabase → SQL Editor → Run

alter table public.assets
  add column if not exists coingecko_id text;

comment on column public.assets.coingecko_id is
  'ID CoinGecko pour prix live (ex. solana, bitcoin). Null = valeur manuelle.';
