-- Devise EUR / MAD sur les dépenses.
-- Saisie en dirhams exacts ; amount reste en EUR pour les stats.
-- Supabase → SQL Editor → Run

alter table public.expenses
  add column if not exists currency text not null default 'EUR';

alter table public.expenses
  drop constraint if exists expenses_currency_check;

alter table public.expenses
  add constraint expenses_currency_check check (currency in ('EUR', 'MAD'));

alter table public.expenses
  add column if not exists amount_original numeric(12, 2);

update public.expenses
set amount_original = amount
where amount_original is null;

alter table public.expenses
  alter column amount_original set not null;
