-- Ajoute le mode de paiement (CB vs Swile)
-- À coller dans Supabase → SQL Editor → Run

alter table public.expenses
  add column if not exists payment_method text not null default 'cb'
  check (payment_method in ('cb', 'swile'));
