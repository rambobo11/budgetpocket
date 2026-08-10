import { getCryptoCoin } from "@/lib/crypto";
import { formatEuro } from "@/lib/format";
import type { CryptoQuoteCurrency, CryptoTrade } from "@/lib/types";

export type CryptoPosition = {
  coingeckoId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPriceQuote: number | null;
  quoteCurrency: CryptoQuoteCurrency | null;
  costQuote: number;
  costEur: number;
  livePriceEur: number | null;
  valueEur: number | null;
  unrealizedPnlEur: number | null;
  unrealizedPnlPercent: number | null;
};

export type CryptoPortfolioKpis = {
  marketValueEur: number;
  costEur: number;
  floatingPnlEur: number;
  floatingPnlPercent: number | null;
  winners: number;
  losers: number;
  positionCount: number;
};

export function tradeNotionalQuote(trade: CryptoTrade): number {
  return (
    Number(trade.quantity) * Number(trade.price_quote) + Number(trade.fee_quote)
  );
}

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
    const costEur = quoteToEurApprox(costQuote, quoteCurrency);
    const valueEur =
      livePriceEur != null ? Number((quantity * livePriceEur).toFixed(2)) : null;
    const unrealizedPnlEur =
      valueEur != null ? Number((valueEur - costEur).toFixed(2)) : null;
    const unrealizedPnlPercent =
      unrealizedPnlEur != null && costEur > 0
        ? (unrealizedPnlEur / costEur) * 100
        : unrealizedPnlEur != null && costEur === 0 && valueEur != null
          ? 100
          : null;

    positions.push({
      coingeckoId,
      symbol: coin?.symbol ?? coingeckoId,
      name: coin?.name ?? coingeckoId,
      quantity,
      avgBuyPriceQuote,
      quoteCurrency,
      costQuote,
      costEur,
      livePriceEur,
      valueEur,
      unrealizedPnlEur,
      unrealizedPnlPercent,
    });
  }

  return positions.sort((a, b) => (b.valueEur ?? 0) - (a.valueEur ?? 0));
}

export function computeCryptoPortfolioKpis(
  positions: CryptoPosition[]
): CryptoPortfolioKpis {
  const marketValueEur = positions.reduce(
    (sum, p) => sum + (p.valueEur ?? 0),
    0
  );
  const costEur = positions.reduce((sum, p) => sum + p.costEur, 0);
  const floatingPnlEur = Number((marketValueEur - costEur).toFixed(2));
  const floatingPnlPercent =
    costEur > 0 ? (floatingPnlEur / costEur) * 100 : null;
  const winners = positions.filter(
    (p) => (p.unrealizedPnlEur ?? 0) > 0
  ).length;
  const losers = positions.filter((p) => (p.unrealizedPnlEur ?? 0) < 0).length;

  return {
    marketValueEur,
    costEur,
    floatingPnlEur,
    floatingPnlPercent,
    winners,
    losers,
    positionCount: positions.length,
  };
}

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
    maximumFractionDigits: amount >= 100 ? 2 : amount >= 1 ? 4 : 6,
  }).format(amount)} ${quote}`;
}
