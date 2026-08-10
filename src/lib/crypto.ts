/** Cryptos suivies via CoinGecko (prix EUR, gratuit, sans clé) */
export const CRYPTO_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "usd-coin", symbol: "USDC", name: "USDC" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "aave", symbol: "AAVE", name: "Aave" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "POL" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon (MATIC)" },
  { id: "enjincoin", symbol: "ENJ", name: "Enjin Coin" },
  { id: "coti", symbol: "COTI", name: "COTI" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox" },
  { id: "gala", symbol: "GALA", name: "Gala" },
  { id: "pepe", symbol: "PEPE", name: "Pepe" },
  { id: "wormhole", symbol: "W", name: "Wormhole" },
  { id: "pixels", symbol: "PIXEL", name: "Pixels" },
  { id: "terra-luna", symbol: "LUNC", name: "Terra Classic" },
  { id: "terra-luna-2", symbol: "LUNA", name: "Terra" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "near", symbol: "NEAR", name: "NEAR" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "toncoin", symbol: "TON", name: "Toncoin" },
] as const;

export type CryptoCoinId = (typeof CRYPTO_COINS)[number]["id"];

export function getCryptoCoin(id: string) {
  return CRYPTO_COINS.find((coin) => coin.id === id) ?? null;
}

export function formatCryptoQuantity(quantity: number, symbol: string) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: quantity >= 1 ? 4 : 8,
  }).format(quantity);
  return `${formatted} ${symbol}`;
}

/** Prix EUR par coingecko_id */
export type CryptoPrices = Record<string, number>;

export async function fetchCryptoPrices(
  ids: string[],
  options?: { fresh?: boolean }
): Promise<CryptoPrices> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const params = new URLSearchParams({
    ids: unique.join(","),
  });
  if (options?.fresh) {
    params.set("fresh", "1");
    params.set("_", String(Date.now()));
  }

  const response = await fetch(`/api/crypto/prices?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de récupérer les prix crypto.");
  }

  const data = (await response.json()) as CryptoPrices;
  return data;
}

export function cryptoValueEur(quantity: number, priceEur: number) {
  return Number((quantity * priceEur).toFixed(2));
}
