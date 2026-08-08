-- Ajouter le mois budgétaire (mois concerné)
-- À coller dans Supabase → SQL Editor → Run

alter table public.incomes
  add column if not exists budget_month date;

-- Remplir les lignes existantes avec le mois de réception
update public.incomes
set budget_month = date_trunc('month', created_at)::date
where budget_month is null;

alter table public.incomes
  alter column budget_month set not null;

create index if not exists incomes_user_budget_month_idx
  on public.incomes (user_id, budget_month desc);
