-- Renommer Food → Food et courses
-- À coller dans Supabase → SQL Editor → Run

update public.expenses
set category = 'Food et courses'
where category = 'Food';
