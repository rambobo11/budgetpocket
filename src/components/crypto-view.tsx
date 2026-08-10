"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  deleteCryptoTradeAction,
  syncBinancePortfolioAction,
} from "@/app/actions/crypto-trades";
import { refreshCryptoPricesAction } from "@/app/actions/assets";
import { CryptoTradeForm } from "@/components/crypto-trade-form";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import {
  fetchCryptoPrices,
  formatCryptoQuantity,
  getCryptoCoin,
} from "@/lib/crypto";
import {
  computeCryptoPortfolioKpis,
  computeCryptoPositions,
  formatQuotePrice,
  tradeNotionalQuote,
} from "@/lib/crypto-trades";
import { formatEuro } from "@/lib/format";
import { formatSignedEuro, formatSignedPercent } from "@/lib/kpis";
import type { CryptoTrade } from "@/lib/types";

type CryptoViewProps = {
  initialTrades: CryptoTrade[];
};

export function CryptoView({ initialTrades }: CryptoViewProps) {
  const { mask } = usePrivacy();
  const [trades, setTrades] = useState(initialTrades);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastPriceAt, setLastPriceAt] = useState<Date | null>(null);

  const coinIds = useMemo(
    () => [...new Set(trades.map((trade) => trade.coingecko_id))],
    [trades]
  );

  async function loadMarketPrices(ids: string[], fresh: boolean) {
    if (ids.length === 0) {
      setPrices({});
      return;
    }
    setPricesLoading(true);
    if (fresh) setMessage(null);
    try {
      const next = await fetchCryptoPrices(ids, { fresh });
      setPrices(next);
      setLastPriceAt(new Date());

      if (fresh) {
        const patrimoine = await refreshCryptoPricesAction();
        if (!patrimoine.ok) {
          setMessage(`Prix marché OK · Patrimoine : ${patrimoine.error}`);
        } else {
          setMessage("Prix marché actualisés · Patrimoine mis à jour.");
        }
      }
    } catch {
      setMessage("Prix marché indisponibles pour le moment.");
    } finally {
      setPricesLoading(false);
    }
  }

  useEffect(() => {
    void loadMarketPrices(coinIds, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharge auto quand la liste de coins change
  }, [coinIds.join(",")]);

  const positions = useMemo(
    () => computeCryptoPositions(trades, prices),
    [trades, prices]
  );
  const kpis = useMemo(
    () => computeCryptoPortfolioKpis(positions),
    [positions]
  );
  const positivePnl = kpis.floatingPnlEur >= 0;

  async function handleRefreshPrices() {
    await loadMarketPrices(coinIds, true);
  }

  async function handleSyncBinance() {
    setSyncLoading(true);
    setMessage(null);
    const result = await syncBinancePortfolioAction();
    setSyncLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setTrades(result.data.trades);
    setMessage(
      `Sync OK · ${result.data.assetsUpserted} actifs Binance · ${result.data.tradesCreated} trades coût ajoutés (BTC inclus).`
    );
    const ids = [
      ...new Set(result.data.trades.map((trade) => trade.coingecko_id)),
    ];
    await loadMarketPrices(ids, true);
  }

  async function handleDelete(trade: CryptoTrade) {
    const coin = getCryptoCoin(trade.coingecko_id);
    const label = coin ? `${coin.symbol}` : trade.coingecko_id;
    const confirmed = window.confirm(
      `Supprimer ce trade ?\n${trade.side === "buy" ? "Achat" : "Vente"} ${label}`
    );
    if (!confirmed) return;

    setBusyId(trade.id);
    const result = await deleteCryptoTradeAction({ id: trade.id });
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setTrades((previous) => previous.filter((item) => item.id !== trade.id));
  }

  return (
    <PageShell>
      <header className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Crypto
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Positions · coût · floating PnL (type Binance)
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PrivacyToggle />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <AppNav />

      <div className="flex flex-col gap-4 md:gap-6">
        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Valeur estimée
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
                {mask(formatEuro(kpis.marketValueEur))}
              </p>
              <p
                className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
                  positivePnl
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {positivePnl ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                Floating PnL {mask(formatSignedEuro(kpis.floatingPnlEur))}
                {kpis.floatingPnlPercent != null
                  ? ` (${formatSignedPercent(kpis.floatingPnlPercent)})`
                  : ""}
              </p>
              {pricesLoading ? (
                <p className="mt-1 text-xs text-zinc-500">Maj des prix…</p>
              ) : lastPriceAt ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Marché à{" "}
                  {format(lastPriceAt, "HH:mm:ss", { locale: fr })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                type="button"
                disabled={pricesLoading || coinIds.length === 0}
                onClick={() => void handleRefreshPrices()}
                className="h-10 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pricesLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Actualiser les prix
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={syncLoading}
                onClick={() => void handleSyncBinance()}
                className="h-10 rounded-full"
              >
                {syncLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync Binance (BTC + coins)
              </Button>
            </div>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
          ) : (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Lance Sync une fois : ajoute BTC, met à jour les qtés Patrimoine, et
              remplit les prix de revient Binance.
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Coût
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(kpis.costEur))}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Marché
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mask(formatEuro(kpis.marketValueEur))}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              En gain
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {kpis.winners}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              En perte
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-rose-700 dark:text-rose-400">
              {kpis.losers}
            </p>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Mes assets
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Prix live / coût · floating PnL · {kpis.positionCount} position
              {kpis.positionCount > 1 ? "s" : ""}
            </p>
          </div>

          {positions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucune position. Tape « Sync Binance » pour importer BTC + tes
              coins.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {positions.map((position) => {
                const pnlPositive = (position.unrealizedPnlEur ?? 0) >= 0;
                return (
                  <li key={position.coingeckoId} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {position.symbol}{" "}
                          <span className="font-normal text-zinc-500">
                            {position.name}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {mask(
                            formatCryptoQuantity(
                              position.quantity,
                              position.symbol
                            )
                          )}
                          {position.valueEur != null
                            ? ` · ${mask(formatEuro(position.valueEur))}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Live{" "}
                          {position.livePriceEur != null
                            ? mask(formatEuro(position.livePriceEur))
                            : "—"}
                          {" / coût "}
                          {position.avgBuyPriceQuote != null
                            ? mask(
                                formatQuotePrice(
                                  position.avgBuyPriceQuote,
                                  position.quoteCurrency
                                )
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            pnlPositive
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {position.unrealizedPnlEur != null
                            ? mask(formatSignedEuro(position.unrealizedPnlEur))
                            : "—"}
                        </p>
                        {position.unrealizedPnlPercent != null ? (
                          <p
                            className={`mt-0.5 text-xs tabular-nums ${
                              pnlPositive
                                ? "text-emerald-700/80 dark:text-emerald-400/80"
                                : "text-rose-700/80 dark:text-rose-400/80"
                            }`}
                          >
                            {formatSignedPercent(position.unrealizedPnlPercent)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <CryptoTradeForm
          onCreated={(trade) => {
            setTrades((previous) => [trade, ...previous]);
            setMessage(null);
          }}
        />

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Historique trades
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {trades.length} trade{trades.length > 1 ? "s" : ""}
            </p>
          </div>

          {trades.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucun trade pour l’instant.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {trades.map((trade) => {
                const coin = getCryptoCoin(trade.coingecko_id);
                const dateLabel = format(
                  parseISO(trade.traded_at),
                  "d MMM yyyy",
                  { locale: fr }
                );
                return (
                  <li key={trade.id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              trade.side === "buy"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                            }`}
                          >
                            {trade.side === "buy" ? "Achat" : "Vente"}
                          </span>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            {coin?.symbol ?? trade.coingecko_id}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {dateLabel}
                          {" · "}
                          {mask(
                            formatCryptoQuantity(
                              Number(trade.quantity),
                              coin?.symbol ?? ""
                            )
                          )}
                          {" @ "}
                          {mask(
                            formatQuotePrice(
                              Number(trade.price_quote),
                              trade.quote_currency
                            )
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {mask(
                            formatQuotePrice(
                              tradeNotionalQuote(trade),
                              trade.quote_currency
                            )
                          )}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busyId === trade.id}
                          onClick={() => void handleDelete(trade)}
                          className="size-8 rounded-full text-zinc-500 hover:text-rose-600"
                          aria-label="Supprimer"
                        >
                          {busyId === trade.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
