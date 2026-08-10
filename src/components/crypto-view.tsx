"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Bitcoin, Loader2, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import {
  deleteCryptoTradeAction,
  seedBinanceBtcBuyAction,
} from "@/app/actions/crypto-trades";
import { CryptoTradeForm } from "@/components/crypto-trade-form";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";
import { fetchCryptoPrices, formatCryptoQuantity, getCryptoCoin } from "@/lib/crypto";
import {
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
  const [seedLoading, setSeedLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const coinIds = useMemo(
    () => [...new Set(trades.map((trade) => trade.coingecko_id))],
    [trades]
  );

  useEffect(() => {
    if (coinIds.length === 0) {
      setPrices({});
      return;
    }
    let cancelled = false;
    setPricesLoading(true);
    void fetchCryptoPrices(coinIds)
      .then((next) => {
        if (!cancelled) setPrices(next);
      })
      .catch(() => {
        if (!cancelled) setMessage("Prix live indisponibles pour le moment.");
      })
      .finally(() => {
        if (!cancelled) setPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coinIds]);

  const positions = useMemo(
    () => computeCryptoPositions(trades, prices),
    [trades, prices]
  );

  const totalValue = positions.reduce(
    (sum, position) => sum + (position.valueEur ?? 0),
    0
  );
  const totalPnl = positions.reduce(
    (sum, position) => sum + (position.unrealizedPnlEur ?? 0),
    0
  );

  async function handleSeedBtc() {
    setSeedLoading(true);
    setMessage(null);
    const result = await seedBinanceBtcBuyAction();
    setSeedLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (result.data.created) {
      setTrades((previous) => [result.data.trade, ...previous]);
      setMessage("Achat BTC (~40 USDC) ajouté + patrimoine Binance aligné.");
    } else {
      setMessage("Achat BTC déjà enregistré. Patrimoine Binance réaligné.");
    }
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
            Trades · prix d’achat / vente · PnL latent
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
                Positions
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
                {mask(formatEuro(totalValue))}
              </p>
              <p
                className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
                  totalPnl >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {totalPnl >= 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {mask(formatSignedEuro(totalPnl))} latent
                {pricesLoading ? " · prix…" : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={seedLoading}
              onClick={() => void handleSeedBtc()}
              className="h-10 rounded-full"
            >
              {seedLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bitcoin className="size-4" />
              )}
              Ajouter mon achat BTC
            </Button>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
          ) : null}
        </section>

        {positions.length > 0 ? (
          <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Ouvertes
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Quantité restante · prix moyen · vs live
              </p>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {positions.map((position) => (
                <li key={position.coingeckoId} className="px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {position.name}{" "}
                        <span className="text-zinc-500">{position.symbol}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {mask(
                          formatCryptoQuantity(
                            position.quantity,
                            position.symbol
                          )
                        )}
                        {position.avgBuyPriceQuote != null
                          ? ` · moy. ${mask(
                              formatQuotePrice(
                                position.avgBuyPriceQuote,
                                position.quoteCurrency
                              )
                            )}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {position.valueEur != null
                          ? mask(formatEuro(position.valueEur))
                          : "—"}
                      </p>
                      {position.unrealizedPnlEur != null ? (
                        <p
                          className={`mt-0.5 text-sm tabular-nums ${
                            position.unrealizedPnlEur >= 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {mask(formatSignedEuro(position.unrealizedPnlEur))}
                          {position.unrealizedPnlPercent != null
                            ? ` · ${formatSignedPercent(position.unrealizedPnlPercent)}`
                            : ""}
                        </p>
                      ) : null}
                      {position.livePriceEur != null ? (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          live {mask(formatEuro(position.livePriceEur))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <CryptoTradeForm
          onCreated={(trade) => {
            setTrades((previous) => [trade, ...previous]);
            setMessage(null);
          }}
        />

        <section className="rounded-[1.75rem] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Historique
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {trades.length} trade{trades.length > 1 ? "s" : ""}
            </p>
          </div>

          {trades.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucun trade. Ajoute ton achat BTC ou saisis un trade.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {trades.map((trade) => {
                const coin = getCryptoCoin(trade.coingecko_id);
                const dateLabel = format(parseISO(trade.traded_at), "d MMM yyyy", {
                  locale: fr,
                });
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
                          {trade.notes ? ` · ${trade.notes}` : ""}
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

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Actions (bourse) : à venir. Stablecoins ≈ EUR pour le PnL.
        </p>
      </div>
    </PageShell>
  );
}
