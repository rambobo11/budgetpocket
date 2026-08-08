import "server-only";

import { CRYPTO_COINS } from "@/lib/crypto";

const ALLOWED_IDS = new Set<string>(CRYPTO_COINS.map((coin) => coin.id));

/** Ne garde que les ids CoinGecko connus de l’app (anti-SSRF / open proxy). */
export function sanitizeCoinGeckoIds(ids: string[]): string[] {
  const unique = new Set<string>();

  for (const raw of ids) {
    const id = raw.trim().toLowerCase();
    if (!id) continue;
    if (!/^[a-z0-9-]{1,64}$/.test(id)) continue;
    if (!ALLOWED_IDS.has(id)) continue;
    unique.add(id);
  }

  return [...unique];
}

export function isAllowedCoinGeckoId(id: string): boolean {
  return ALLOWED_IDS.has(id.trim().toLowerCase());
}

/** Appel direct CoinGecko (serveur uniquement). */
export async function fetchCoinGeckoPricesEur(
  ids: string[]
): Promise<Record<string, number>> {
  const allowed = sanitizeCoinGeckoIds(ids);
  if (allowed.length === 0) return {};

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", allowed.join(","));
  url.searchParams.set("vs_currencies", "eur");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("CoinGecko indisponible.");
  }

  const raw = (await response.json()) as Record<string, { eur?: number }>;
  const prices: Record<string, number> = {};

  for (const [id, value] of Object.entries(raw)) {
    if (!ALLOWED_IDS.has(id)) continue;
    if (typeof value?.eur === "number" && Number.isFinite(value.eur)) {
      prices[id] = value.eur;
    }
  }

  return prices;
}
