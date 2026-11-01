-- Autorise un solde de début de mois négatif (déjà dépensé / à découvert).
-- Supabase → SQL Editor → Run
-- Enlève TOUTES les contraintes CHECK sur user_balances (noms variables).

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'user_balances'
      and c.contype = 'c'
  loop
    execute format(
      'alter table public.user_balances drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;
