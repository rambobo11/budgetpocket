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
  { coingeckoId: "usd-coin", quantity: 400.27585839, avgCostUsdt: null },
  { coingeckoId: "bitcoin", quantity: 0.00061938, avgCostUsdt: 64108 },
  { coingeckoId: "solana", quantity: 4.51826703, avgCostUsdt: 176.42 },
  { coingeckoId: "cardano", quantity: 187.18818476, avgCostUsdt: 1.97 },
  { coingeckoId: "aave", quantity: 0.39635798, avgCostUsdt: 204.8 },
  {
    coingeckoId: "internet-computer",
    quantity: 3.43846727,
    avgCostUsdt: 30.8,
  },
  {
    coingeckoId: "polygon-ecosystem-token",
    quantity: 71.19694677,
    avgCostUsdt: 0,
  },
  { coingeckoId: "enjincoin", quantity: 99.93629717, avgCostUsdt: 2.64 },
  { coingeckoId: "coti", quantity: 180.22791876, avgCostUsdt: 0.61 },
  { coingeckoId: "the-sandbox", quantity: 31.79292387, avgCostUsdt: 3.76 },
  { coingeckoId: "gala", quantity: 153.35861359, avgCostUsdt: null },
  { coingeckoId: "pepe", quantity: 31548.13, avgCostUsdt: null },
  { coingeckoId: "wormhole", quantity: 2.43744594, avgCostUsdt: null },
  { coingeckoId: "pixels", quantity: 3.74085635, avgCostUsdt: null },
  { coingeckoId: "terra-luna", quantity: 250, avgCostUsdt: null },
  { coingeckoId: "binancecoin", quantity: 0.00000626, avgCostUsdt: null },
  { coingeckoId: "terra-luna-2", quantity: 0.00382638, avgCostUsdt: null },
];

export const BINANCE_COST_SEED_NOTE = "seed:binance-avg-cost";
