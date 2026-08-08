import { createClient } from "@/lib/supabase/client";
import { formatEuro, formatMad } from "@/lib/format";
import type { Asset, AssetCurrency, AssetType } from "@/lib/types";

export { formatEuro, formatMad } from "@/lib/format";

/** Taux approx. pour convertir MAD → EUR (1 MAD ≈ 0,092 €) */
export const MAD_TO_EUR = 0.092;

export function toEuro(amount: number, currency: AssetCurrency): number {
  if (currency === "MAD") {
    return Number((amount * MAD_TO_EUR).toFixed(2));
  }
  return Number(amount.toFixed(2));
}

export function defaultCurrencyForType(type: AssetType): AssetCurrency {
  return type === "Compte MA" ? "MAD" : "EUR";
}

/** Crypto live : type Crypto ou Compte Binance avec coingecko_id + quantité */
export function isLiveCryptoAsset(asset: Pick<Asset, "asset_type" | "coingecko_id" | "quantity">) {
  return (
    (asset.asset_type === "Crypto" || asset.asset_type === "Compte Binance") &&
    Boolean(asset.coingecko_id) &&
    asset.quantity != null &&
    Number(asset.quantity) > 0
  );
}

export async function fetchAssets(): Promise<Asset[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("value_eur", { ascending: false });

  return (data ?? []) as Asset[];
}

/** Types exclus du patrimoine net (soldes CSE / primes à part). */
export function isAvantageAsset(
  asset: Pick<Asset, "asset_type">
): boolean {
  const type = asset.asset_type as string;
  return (
    type === "Primes voyage" ||
    type === "Avantages" ||
    type === "Annexe C"
  );
}

export function splitPatrimoineAssets(assets: Asset[]) {
  const patrimoine: Asset[] = [];
  const avantages: Asset[] = [];

  for (const asset of assets) {
    if (isAvantageAsset(asset)) avantages.push(asset);
    else patrimoine.push(asset);
  }

  return { patrimoine, avantages };
}

export type AssetTypeBreakdown = {
  type: AssetType | string;
  value: number;
  count: number;
  percent: number;
};

export type PatrimoineKpis = {
  total: number;
  count: number;
  byType: AssetTypeBreakdown[];
};

export function computePatrimoineKpis(assets: Asset[]): PatrimoineKpis {
  const { patrimoine } = splitPatrimoineAssets(assets);
  const total = patrimoine.reduce(
    (sum, asset) => sum + Number(asset.value_eur),
    0
  );
  const map = new Map<string, { value: number; count: number }>();

  for (const asset of patrimoine) {
    const current = map.get(asset.asset_type) ?? { value: 0, count: 0 };
    current.value += Number(asset.value_eur);
    current.count += 1;
    map.set(asset.asset_type, current);
  }

  const byType: AssetTypeBreakdown[] = [...map.entries()]
    .map(([type, value]) => ({
      type,
      value: value.value,
      count: value.count,
      percent: total > 0 ? (value.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    total,
    count: patrimoine.length,
    byType,
  };
}

export function computeAvantagesKpis(assets: Asset[]): PatrimoineKpis {
  const { avantages } = splitPatrimoineAssets(assets);
  const total = avantages.reduce(
    (sum, asset) => sum + Number(asset.value_eur),
    0
  );
  const map = new Map<string, { value: number; count: number }>();

  for (const asset of avantages) {
    const current = map.get(asset.asset_type) ?? { value: 0, count: 0 };
    current.value += Number(asset.value_eur);
    current.count += 1;
    map.set(asset.asset_type, current);
  }

  const byType: AssetTypeBreakdown[] = [...map.entries()]
    .map(([type, value]) => ({
      type,
      value: value.value,
      count: value.count,
      percent: total > 0 ? (value.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    total,
    count: avantages.length,
    byType,
  };
}

export function formatAssetValue(asset: Asset) {
  const currency = asset.currency ?? "EUR";
  const original = Number(asset.value_original ?? asset.value_eur);

  if (currency === "MAD") {
    return `${formatMad(original)} ≈ ${formatEuro(Number(asset.value_eur))}`;
  }

  return formatEuro(Number(asset.value_eur));
}
