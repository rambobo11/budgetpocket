-- PocketBudget — À venir (échéances / remboursements attendus)
-- Supabase → SQL Editor → Run
-- Ex. CVEC à payer, remboursement Sécu, caution à récupérer…

create table if not exists public.upcoming (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('À payer', 'À recevoir')),
  amount numeric(12, 2) not null check (amount > 0),
  due_date date,
  notes text,
  status text not null default 'open' check (status in ('open', 'done')),
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upcoming_user_status_due_idx
  on public.upcoming (user_id, status, due_date asc nulls last);

alter table public.upcoming enable row level security;

drop policy if exists "Users can view own upcoming" on public.upcoming;
drop policy if exists "Users can insert own upcoming" on public.upcoming;
drop policy if exists "Users can update own upcoming" on public.upcoming;
drop policy if exists "Users can delete own upcoming" on public.upcoming;

create policy "Users can view own upcoming"
  on public.upcoming for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own upcoming"
  on public.upcoming for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own upcoming"
  on public.upcoming for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own upcoming"
  on public.upcoming for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.upcoming from anon;
grant select, insert, update, delete on public.upcoming to authenticated;
