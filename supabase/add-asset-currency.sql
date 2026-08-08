-- Ajouter devise (EUR / MAD) pour Compte MA etc.
-- À coller dans Supabase → SQL Editor → Run

alter table public.assets
  add column if not exists currency text not null default 'EUR'
  check (currency in ('EUR', 'MAD'));

alter table public.assets
  add column if not exists value_original numeric(14, 2);

update public.assets
set value_original = value_eur
where value_original is null;

alter table public.assets
  alter column value_original set not null;
