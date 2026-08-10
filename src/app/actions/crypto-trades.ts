"use server";

import { format } from "date-fns";
import {
  BINANCE_COST_SEED_NOTE,
  BINANCE_HOLDINGS,
} from "@/lib/binance-holdings";
import { cryptoValueEur, getCryptoCoin } from "@/lib/crypto";
import { fetchCoinGeckoPricesEur } from "@/lib/crypto-prices";
import { nowInAppTz } from "@/lib/date";
import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import { createCryptoTradeSchema, idSchema } from "@/lib/validation/schemas";
import type { CryptoTrade } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function missingTableHint(message?: string) {
  if (
    message?.includes("crypto_trades") ||
    message?.includes("schema cache")
  ) {
    return "Table crypto_trades manquante. Exécute supabase/crypto-trades.sql dans le SQL Editor.";
  }
  return null;
}

function asTrade(row: Record<string, unknown>): CryptoTrade {
  return {
    ...(row as unknown as CryptoTrade),
    quantity: Number(row.quantity),
    price_quote: Number(row.price_quote),
    fee_quote: Number(row.fee_quote ?? 0),
  };
}

export async function createCryptoTradeAction(
  input: unknown
): Promise<ActionResult<CryptoTrade>> {
  try {
    const parsed = createCryptoTradeSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`crypto-trade:create:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const data = parsed.data;
    if (!getCryptoCoin(data.coingeckoId)) {
      return fail("Crypto non supportée.");
    }

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("crypto_trades")
      .insert({
        user_id: user.id,
        side: data.side,
        coingecko_id: data.coingeckoId,
        quantity: data.quantity,
        price_quote: data.priceQuote,
        quote_currency: data.quoteCurrency,
        fee_quote: data.feeQuote ?? 0,
        traded_at: data.tradedAt,
        notes: data.notes,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !row) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible d'enregistrer le trade."
      );
    }

    return ok(asTrade(row as Record<string, unknown>));
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteCryptoTradeAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`crypto-trade:delete:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { data, error } = await supabase
      .from("crypto_trades")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible de supprimer."
      );
    }

    return ok({ id: data.id as string });
  } catch (error) {
    return mapAuthError(error);
  }
}

/**
 * Sync Patrimoine Binance (qté BTC/USDC/…) + seed trades au prix de revient Binance.
 */
export async function syncBinancePortfolioAction(): Promise<
  ActionResult<{
    trades: CryptoTrade[];
    tradesCreated: number;
    assetsUpserted: number;
  }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`crypto-trade:sync-binance:${user.id}`, {
      limit: 5,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Sync déjà lancée récemment. Attends un peu.");
    }

    const ids = BINANCE_HOLDINGS.map((h) => h.coingeckoId);
    let prices: Record<string, number>;
    try {
      prices = await fetchCoinGeckoPricesEur(ids);
    } catch {
      return fail("Impossible de récupérer les prix CoinGecko.");
    }

    const now = new Date().toISOString();
    const tradedAt = format(nowInAppTz(), "yyyy-MM-dd");

    const { data: existingAssets } = await supabase
      .from("assets")
      .select("id, coingecko_id")
      .eq("user_id", user.id)
      .eq("asset_type", "Compte Binance");

    const assetByCoin = new Map(
      (existingAssets ?? [])
        .filter((row) => row.coingecko_id)
        .map((row) => [row.coingecko_id as string, row.id as string])
    );

    let assetsUpserted = 0;

    for (const holding of BINANCE_HOLDINGS) {
      const coin = getCryptoCoin(holding.coingeckoId);
      const price = prices[holding.coingeckoId];
      if (!coin || price == null) continue;

      const valueEur = cryptoValueEur(holding.quantity, price);
      const existingId = assetByCoin.get(holding.coingeckoId);

      if (existingId) {
        const { error } = await supabase
          .from("assets")
          .update({
            quantity: holding.quantity,
            value_original: valueEur,
            value_eur: valueEur,
            currency: "EUR",
            name: `${coin.name} (${coin.symbol})`,
            notes: "Binance",
            updated_at: now,
          })
          .eq("id", existingId)
          .eq("user_id", user.id);
        if (!error) assetsUpserted += 1;
      } else {
        const { error } = await supabase.from("assets").insert({
          user_id: user.id,
          name: `${coin.name} (${coin.symbol})`,
          asset_type: "Compte Binance",
          currency: "EUR",
          value_original: valueEur,
          value_eur: valueEur,
          quantity: holding.quantity,
          coingecko_id: holding.coingeckoId,
          notes: "Binance",
          updated_at: now,
        });
        if (!error) assetsUpserted += 1;
      }
    }

    const { data: existingSeeds, error: seedsError } = await supabase
      .from("crypto_trades")
      .select("coingecko_id")
      .eq("user_id", user.id)
      .eq("notes", BINANCE_COST_SEED_NOTE);

    if (seedsError) {
      return fail(
        missingTableHint(seedsError.message) ??
          "Impossible de lire les trades seed."
      );
    }

    const seededCoins = new Set(
      (existingSeeds ?? []).map((row) => row.coingecko_id as string)
    );

    const tradeRows = BINANCE_HOLDINGS.flatMap((holding) => {
      if (holding.avgCostUsdt == null) return [];
      if (seededCoins.has(holding.coingeckoId)) return [];
      if (!getCryptoCoin(holding.coingeckoId)) return [];

      return [
        {
          user_id: user.id,
          side: "buy" as const,
          coingecko_id: holding.coingeckoId,
          quantity: holding.quantity,
          price_quote: holding.avgCostUsdt,
          quote_currency: "USDT" as const,
          fee_quote: 0,
          traded_at: tradedAt,
          notes: BINANCE_COST_SEED_NOTE,
          updated_at: now,
        },
      ];
    });

    let createdTrades: CryptoTrade[] = [];
    if (tradeRows.length > 0) {
      const { data, error } = await supabase
        .from("crypto_trades")
        .insert(tradeRows)
        .select();
      if (error || !data) {
        return fail(
          missingTableHint(error?.message) ??
            "Patrimoine OK, mais trades non créés."
        );
      }
      createdTrades = data.map((row) =>
        asTrade(row as Record<string, unknown>)
      );
    }

    const { data: allTrades } = await supabase
      .from("crypto_trades")
      .select("*")
      .eq("user_id", user.id)
      .order("traded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    return ok({
      trades: (allTrades ?? []).map((row) =>
        asTrade(row as Record<string, unknown>)
      ),
      tradesCreated: createdTrades.length,
      assetsUpserted,
    });
  } catch (error) {
    return mapAuthError(error);
  }
}

/** @deprecated Use syncBinancePortfolioAction */
export async function seedBinanceBtcBuyAction(): Promise<
  ActionResult<{ trade: CryptoTrade; created: boolean }>
> {
  const result = await syncBinancePortfolioAction();
  if (!result.ok) return fail(result.error);

  const btc = result.data.trades.find(
    (trade) => trade.coingecko_id === "bitcoin" && trade.side === "buy"
  );
  if (!btc) {
    return fail("BTC introuvable après sync.");
  }

  return ok({
    trade: btc,
    created: result.data.tradesCreated > 0,
  });
}
