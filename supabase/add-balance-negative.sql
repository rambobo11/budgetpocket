-- Autorise un solde de début de mois négatif (déjà dépensé / à découvert).
-- Supabase → SQL Editor → Run

alter table public.user_balances
  drop constraint if exists user_balances_bank_eur_check;

alter table public.user_balances
  drop constraint if exists user_balances_swile_eur_check;
