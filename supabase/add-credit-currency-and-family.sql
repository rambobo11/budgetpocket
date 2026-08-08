-- Devise pour crédits (EUR / MAD) + seed famille
-- Supabase → SQL Editor → Run

alter table public.credits
  add column if not exists currency text not null default 'EUR'
  check (currency in ('EUR', 'MAD'));

-- Créances / crédits famille (idempotent via NOT EXISTS)
insert into public.credits (user_id, person, kind, amount, currency, notes, status)
select
  '62af554f-3751-4282-b53d-91ef03f9b5b7'::uuid,
  'Sœur',
  'Crédit',
  20000,
  'MAD',
  'Crédit famille',
  'open'
where not exists (
  select 1 from public.credits
  where user_id = '62af554f-3751-4282-b53d-91ef03f9b5b7'::uuid
    and person = 'Sœur'
    and currency = 'MAD'
);

insert into public.credits (user_id, person, kind, amount, currency, notes, status)
select
  '62af554f-3751-4282-b53d-91ef03f9b5b7'::uuid,
  'Frère',
  'Crédit',
  250,
  'EUR',
  'Crédit famille',
  'open'
where not exists (
  select 1 from public.credits
  where user_id = '62af554f-3751-4282-b53d-91ef03f9b5b7'::uuid
    and person = 'Frère'
    and currency = 'EUR'
);
