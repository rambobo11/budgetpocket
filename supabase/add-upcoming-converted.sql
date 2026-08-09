-- PocketBudget — flag anti-doublon conversion À venir → dépense/revenu
-- Supabase → SQL Editor → Run (si table upcoming existe déjà)

alter table public.upcoming
  add column if not exists converted boolean not null default false;
