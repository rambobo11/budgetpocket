-- Anti-doublons actifs crypto / Binance (optionnel, à exécuter une fois)
-- Supabase → SQL Editor → Run

create unique index if not exists assets_user_binance_coin_uidx
  on public.assets (user_id, coingecko_id)
  where asset_type = 'Compte Binance'
    and coingecko_id is not null;

create unique index if not exists assets_user_avantage_name_uidx
  on public.assets (user_id, name)
  where asset_type in ('Avantages', 'Primes voyage');
