import "server-only";

export type BinanceHolding = {
  coingeckoId: string;
  quantity: number;
  /** Prix de revient moyen Binance (USDT). null = inconnu / stable. */
  avgCostUsdt: number | null;
};

/**
 * Holdings Binance (snapshot) — serveur uniquement.
 * Qté + coût moyen issus de l’Asset View Binance (août 2026).
 */
export const BINANCE_HOLDINGS: BinanceHolding[] = [
  { coingeckoId: "solana", quantity: 4.52456548, avgCostUsdt: 176.42 },
  { coingeckoId: "usd-coin", quantity: 400.27585839, avgCostUsdt: null },
  { coingeckoId: "aave", quantity: 0.39637185, avgCostUsdt: 204.8 },
  { coingeckoId: "bitcoin", quantity: 0.00061938, avgCostUsdt: 64108 },
  { coingeckoId: "cardano", quantity: 187.27336843, avgCostUsdt: 1.97 },
  {
    coingeckoId: "internet-computer",
    quantity: 3.44073657,
    avgCostUsdt: 30.8,
  },
  {
    coingeckoId: "polygon-ecosystem-token",
    quantity: 71.2441481,
    avgCostUsdt: 0,
  },
  { coingeckoId: "enjincoin", quantity: 100.05500359, avgCostUsdt: 2.64 },
  { coingeckoId: "coti", quantity: 181.42767981, avgCostUsdt: 0.61 },
  { coingeckoId: "the-sandbox", quantity: 31.80019213, avgCostUsdt: 3.76 },
  // Dust / < 1 USD (masqués dans Binance) — gardés à 0 pour nettoyer le patrimoine
  { coingeckoId: "gala", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "pepe", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "wormhole", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "pixels", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "terra-luna", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "binancecoin", quantity: 0, avgCostUsdt: null },
  { coingeckoId: "terra-luna-2", quantity: 0, avgCostUsdt: null },
];

export const BINANCE_COST_SEED_NOTE = "seed:binance-avg-cost";
