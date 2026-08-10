import { getCryptoCoin } from "@/lib/crypto";
import { formatEuro } from "@/lib/format";
import type { CryptoQuoteCurrency, CryptoTrade } from "@/lib/types";

export type CryptoPosition = {
  coingeckoId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPriceQuote: number | null;
  /** Devise dominante des achats restants (approx.). */
  quoteCurrency: CryptoQuoteCurrency | null;
  costQuote: number;
  livePriceEur: number | null;
  valueEur: number | null;
  /** PnL latent en EUR si prix live dispo. */
  unrealizedPnlEur: number | null;
  unrealizedPnlPercent: number | null;
};

/** Coût total d’un trade dans sa devise de cotation. */
export function tradeNotionalQuote(trade: CryptoTrade): number {
  return Number(trade.quantity) * Number(trade.price_quote) + Number(trade.fee_quote);
}

/**
 * Positions ouvertes (FIFO simplifié) + coût moyen des lots restants.
 * Le PnL EUR utilise une approx. USDC/USDT/USD ≈ EUR si pas de taux exact.
 */
export function computeCryptoPositions(
  trades: CryptoTrade[],
  livePricesEur: Record<string, number>
): CryptoPosition[] {
  const byCoin = new Map<string, CryptoTrade[]>();

  for (const trade of trades) {
    const list = byCoin.get(trade.coingecko_id) ?? [];
    list.push(trade);
    byCoin.set(trade.coingecko_id, list);
  }

  const positions: CryptoPosition[] = [];

  for (const [coingeckoId, coinTrades] of byCoin) {
    const ordered = [...coinTrades].sort((a, b) => {
      if (a.traded_at !== b.traded_at) {
        return a.traded_at.localeCompare(b.traded_at);
      }
      return a.created_at.localeCompare(b.created_at);
    });

    type Lot = {
      quantity: number;
      priceQuote: number;
      quoteCurrency: CryptoQuoteCurrency;
    };
    const lots: Lot[] = [];

    for (const trade of ordered) {
      if (trade.side === "buy") {
        const feePerUnit =
          Number(trade.quantity) > 0
            ? Number(trade.fee_quote) / Number(trade.quantity)
            : 0;
        lots.push({
          quantity: Number(trade.quantity),
          priceQuote: Number(trade.price_quote) + feePerUnit,
          quoteCurrency: trade.quote_currency,
        });
        continue;
      }

      let toSell = Number(trade.quantity);
      while (toSell > 1e-12 && lots.length > 0) {
        const lot = lots[0]!;
        const take = Math.min(lot.quantity, toSell);
        lot.quantity -= take;
        toSell -= take;
        if (lot.quantity <= 1e-12) lots.shift();
      }
    }

    const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (quantity <= 1e-12) continue;

    const costQuote = lots.reduce(
      (sum, lot) => sum + lot.quantity * lot.priceQuote,
      0
    );
    const avgBuyPriceQuote = costQuote / quantity;
    const quoteCurrency = lots[0]?.quoteCurrency ?? null;
    const coin = getCryptoCoin(coingeckoId);
    const livePriceEur = livePricesEur[coingeckoId] ?? null;
    const costEurApprox = quoteToEurApprox(costQuote, quoteCurrency);
    const valueEur =
      livePriceEur != null ? Number((quantity * livePriceEur).toFixed(2)) : null;
    const unrealizedPnlEur =
      valueEur != null ? Number((valueEur - costEurApprox).toFixed(2)) : null;
    const unrealizedPnlPercent =
      unrealizedPnlEur != null && costEurApprox > 0
        ? (unrealizedPnlEur / costEurApprox) * 100
        : null;

    positions.push({
      coingeckoId,
      symbol: coin?.symbol ?? coingeckoId,
      name: coin?.name ?? coingeckoId,
      quantity,
      avgBuyPriceQuote,
      quoteCurrency,
      costQuote,
      livePriceEur,
      valueEur,
      unrealizedPnlEur,
      unrealizedPnlPercent,
    });
  }

  return positions.sort(
    (a, b) => (b.valueEur ?? 0) - (a.valueEur ?? 0)
  );
}

/** Approx. stablecoins / USD → EUR (1:1). Suffisant pour un suivi perso. */
export function quoteToEurApprox(
  amount: number,
  quote: CryptoQuoteCurrency | null
): number {
  if (quote == null || quote === "EUR") return amount;
  return amount;
}

export function formatQuotePrice(
  amount: number,
  quote: CryptoQuoteCurrency | null
) {
  if (quote === "EUR" || quote == null) return formatEuro(amount);
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: amount >= 1 ? 2 : 6,
  }).format(amount)} ${quote}`;
}
