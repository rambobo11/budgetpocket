-- Soldes banque / Swile : un montant par mois (saisi en début de mois).
-- Supabase → SQL Editor → Run

alter table public.user_balances
  add column if not exists budget_month date;

update public.user_balances
set budget_month = date_trunc(
  'month',
  timezone('Europe/Paris', now())
)::date
where budget_month is null;

alter table public.user_balances
  alter column budget_month set not null;

alter table public.user_balances
  drop constraint if exists user_balances_pkey;

alter table public.user_balances
  add primary key (user_id, budget_month);
