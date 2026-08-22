-- Ajoute le moyen de paiement cash (CB / Swile / Cash)
-- Supabase → SQL Editor → Run une fois

alter table public.expenses
  drop constraint if exists expenses_payment_method_check;

alter table public.expenses
  add constraint expenses_payment_method_check
  check (payment_method in ('cb', 'swile', 'cash'));

alter table public.subscriptions
  drop constraint if exists subscriptions_payment_method_check;

alter table public.subscriptions
  add constraint subscriptions_payment_method_check
  check (payment_method in ('cb', 'swile', 'cash'));
