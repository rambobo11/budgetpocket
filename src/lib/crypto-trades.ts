import { getCryptoCoin } from "@/lib/crypto";
import { formatEuro } from "@/lib/format";
import type { CryptoQuoteCurrency, CryptoTrade } from "@/lib/types";

export type CryptoHoldingInput = {
  coingeckoId: string;
  quantity: number;
};

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
  isStable: boolean;
};

export type CryptoPortfolioKpis = {
  /** Valeur marché du wallet (toutes les holdings, stables inclus). */
  marketValueEur: number;
  /** Coût des positions avec prix de revient (hors stables sans coût). */
  costEur: number;
  /** Somme des floating PnL des positions avec coût. */
  floatingPnlEur: number;
  floatingPnlPercent: number | null;
  winners: number;
  losers: number;
  positionCount: number;
  stableValueEur: number;
};

const STABLE_IDS = new Set(["usd-coin", "tether"]);

export function tradeNotionalQuote(trade: CryptoTrade): number {
  return (
    Number(trade.quantity) * Number(trade.price_quote) + Number(trade.fee_quote)
  );
}

/** Coût moyen restant (FIFO) par coin à partir des trades. */
export function averageCostByCoin(
  trades: CryptoTrade[]
): Map<
  string,
  { avgPriceQuote: number; quoteCurrency: CryptoQuoteCurrency; costPerUnitEur: number }
> {
  const byCoin = new Map<string, CryptoTrade[]>();
  for (const trade of trades) {
    const list = byCoin.get(trade.coingecko_id) ?? [];
    list.push(trade);
    byCoin.set(trade.coingecko_id, list);
  }

  const result = new Map<
    string,
    {
      avgPriceQuote: number;
      quoteCurrency: CryptoQuoteCurrency;
      costPerUnitEur: number;
    }
  >();

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
    const quoteCurrency = lots[0]!.quoteCurrency;
    const avgPriceQuote = costQuote / quantity;
    result.set(coingeckoId, {
      avgPriceQuote,
      quoteCurrency,
      costPerUnitEur: quoteToEurApprox(avgPriceQuote, quoteCurrency),
    });
  }

  return result;
}

/**
 * Positions = holdings wallet (vérité Binance) + coût moyen des trades.
 * Les stables (USDC…) comptent dans la valeur marché, pas dans le floating PnL.
 */
export function computeCryptoPositionsFromHoldings(
  holdings: CryptoHoldingInput[],
  trades: CryptoTrade[],
  livePricesEur: Record<string, number>
): CryptoPosition[] {
  const costs = averageCostByCoin(trades);
  const merged = new Map<string, number>();

  for (const holding of holdings) {
    if (!holding.coingeckoId || holding.quantity <= 0) continue;
    merged.set(
      holding.coingeckoId,
      (merged.get(holding.coingeckoId) ?? 0) + holding.quantity
    );
  }

  // Si un trade existe sans holding patrimoine, on le montre quand même
  for (const [coingeckoId, cost] of costs) {
    if (!merged.has(coingeckoId)) {
      // quantité inconnue côté wallet → ignore (wallet = source de vérité)
      void cost;
    }
  }

  const positions: CryptoPosition[] = [];

  for (const [coingeckoId, quantity] of merged) {
    const coin = getCryptoCoin(coingeckoId);
    const livePriceEur = livePricesEur[coingeckoId] ?? null;
    const valueEur =
      livePriceEur != null ? Number((quantity * livePriceEur).toFixed(2)) : null;
    const isStable = STABLE_IDS.has(coingeckoId);
    const costInfo = costs.get(coingeckoId);

    let avgBuyPriceQuote: number | null = null;
    let quoteCurrency: CryptoQuoteCurrency | null = null;
    let costEur = 0;
    let costQuote = 0;
    let unrealizedPnlEur: number | null = null;
    let unrealizedPnlPercent: number | null = null;

    if (!isStable && costInfo) {
      avgBuyPriceQuote = costInfo.avgPriceQuote;
      quoteCurrency = costInfo.quoteCurrency;
      costEur = Number((quantity * costInfo.costPerUnitEur).toFixed(2));
      costQuote = quantity * costInfo.avgPriceQuote;
      if (valueEur != null) {
        unrealizedPnlEur = Number((valueEur - costEur).toFixed(2));
        unrealizedPnlPercent =
          costEur > 0
            ? (unrealizedPnlEur / costEur) * 100
            : costEur === 0
              ? 100
              : null;
      }
    }

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
      isStable,
    });
  }

  return positions.sort((a, b) => (b.valueEur ?? 0) - (a.valueEur ?? 0));
}

/** @deprecated Prefer computeCryptoPositionsFromHoldings */
export function computeCryptoPositions(
  trades: CryptoTrade[],
  livePricesEur: Record<string, number>
): CryptoPosition[] {
  const costs = averageCostByCoin(trades);
  const holdings: CryptoHoldingInput[] = [];
  // Rebuild qty from FIFO leftover via costs + re-run lots — use trade-only path
  const byCoin = new Map<string, CryptoTrade[]>();
  for (const trade of trades) {
    const list = byCoin.get(trade.coingecko_id) ?? [];
    list.push(trade);
    byCoin.set(trade.coingecko_id, list);
  }
  for (const [coingeckoId, coinTrades] of byCoin) {
    const ordered = [...coinTrades].sort((a, b) => {
      if (a.traded_at !== b.traded_at) return a.traded_at.localeCompare(b.traded_at);
      return a.created_at.localeCompare(b.created_at);
    });
    let qty = 0;
    for (const trade of ordered) {
      qty +=
        trade.side === "buy"
          ? Number(trade.quantity)
          : -Number(trade.quantity);
    }
    if (qty > 1e-12) holdings.push({ coingeckoId, quantity: qty });
    void costs;
  }
  return computeCryptoPositionsFromHoldings(holdings, trades, livePricesEur);
}

export function computeCryptoPortfolioKpis(
  positions: CryptoPosition[]
): CryptoPortfolioKpis {
  const marketValueEur = positions.reduce(
    (sum, p) => sum + (p.valueEur ?? 0),
    0
  );
  const stableValueEur = positions
    .filter((p) => p.isStable)
    .reduce((sum, p) => sum + (p.valueEur ?? 0), 0);

  const withCost = positions.filter(
    (p) => !p.isStable && p.unrealizedPnlEur != null
  );
  const costEur = withCost.reduce((sum, p) => sum + p.costEur, 0);
  const floatingPnlEur = Number(
    withCost
      .reduce((sum, p) => sum + (p.unrealizedPnlEur ?? 0), 0)
      .toFixed(2)
  );
  const floatingPnlPercent =
    costEur > 0 ? (floatingPnlEur / costEur) * 100 : null;
  const winners = withCost.filter((p) => (p.unrealizedPnlEur ?? 0) > 0).length;
  const losers = withCost.filter((p) => (p.unrealizedPnlEur ?? 0) < 0).length;

  return {
    marketValueEur,
    costEur,
    floatingPnlEur,
    floatingPnlPercent,
    winners,
    losers,
    positionCount: positions.length,
    stableValueEur,
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
