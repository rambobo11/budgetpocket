-- Solde Swile actuel (ce qu’il y a sur la carte), distinct du 1er du mois.
-- Supabase → SQL Editor → Run

alter table public.user_balances
  add column if not exists swile_now_eur numeric(12, 2);
