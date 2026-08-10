"use server";

import { format } from "date-fns";
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
    const coin = getCryptoCoin(data.coingeckoId);
    if (!coin) return fail("Crypto non supportée.");

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
 * Enregistre l’achat BTC Binance (~40 USDC) + aligne l’actif Binance USDC/BTC.
 */
export async function seedBinanceBtcBuyAction(): Promise<
  ActionResult<{ trade: CryptoTrade; created: boolean }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`crypto-trade:seed-btc:${user.id}`, {
      limit: 3,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Action déjà lancée récemment.");
    }

    const btcQty = 0.00061938;
    const usdcSpent = 40;
    const priceQuote = usdcSpent / btcQty;
    const tradedAt = format(nowInAppTz(), "yyyy-MM-dd");
    const noteTag = "seed:binance-btc-usdc-40";

    const { data: existing, error: existingError } = await supabase
      .from("crypto_trades")
      .select("*")
      .eq("user_id", user.id)
      .eq("coingecko_id", "bitcoin")
      .eq("notes", noteTag)
      .maybeSingle();

    if (existingError) {
      return fail(
        missingTableHint(existingError.message) ??
          "Impossible de vérifier les trades."
      );
    }

    let trade: CryptoTrade;
    let created = false;

    if (existing) {
      trade = asTrade(existing as Record<string, unknown>);
    } else {
      const now = new Date().toISOString();
      const { data: row, error } = await supabase
        .from("crypto_trades")
        .insert({
          user_id: user.id,
          side: "buy",
          coingecko_id: "bitcoin",
          quantity: btcQty,
          price_quote: priceQuote,
          quote_currency: "USDC",
          fee_quote: 0,
          traded_at: tradedAt,
          notes: noteTag,
          updated_at: now,
        })
        .select()
        .single();

      if (error || !row) {
        return fail(
          missingTableHint(error?.message) ??
            "Impossible d'ajouter l'achat BTC."
        );
      }
      trade = asTrade(row as Record<string, unknown>);
      created = true;
    }

    // Aligne patrimoine Binance (USDC qty + BTC asset)
    let prices: Record<string, number>;
    try {
      prices = await fetchCoinGeckoPricesEur(["bitcoin", "usd-coin"]);
    } catch {
      return ok({ trade, created });
    }

    const now = new Date().toISOString();
    const btcPrice = prices.bitcoin;
    const usdcPrice = prices["usd-coin"];

    if (btcPrice != null) {
      const valueEur = cryptoValueEur(btcQty, btcPrice);
      const { data: btcAsset } = await supabase
        .from("assets")
        .select("id")
        .eq("user_id", user.id)
        .eq("asset_type", "Compte Binance")
        .eq("coingecko_id", "bitcoin")
        .maybeSingle();

      if (btcAsset?.id) {
        await supabase
          .from("assets")
          .update({
            quantity: btcQty,
            value_original: valueEur,
            value_eur: valueEur,
            currency: "EUR",
            name: "Bitcoin (BTC)",
            updated_at: now,
          })
          .eq("id", btcAsset.id)
          .eq("user_id", user.id);
      } else {
        await supabase.from("assets").insert({
          user_id: user.id,
          name: "Bitcoin (BTC)",
          asset_type: "Compte Binance",
          currency: "EUR",
          value_original: valueEur,
          value_eur: valueEur,
          quantity: btcQty,
          coingecko_id: "bitcoin",
          notes: "Binance",
          updated_at: now,
        });
      }
    }

    const usdcQty = 400.27585839;
    if (usdcPrice != null) {
      const valueEur = cryptoValueEur(usdcQty, usdcPrice);
      await supabase
        .from("assets")
        .update({
          quantity: usdcQty,
          value_original: valueEur,
          value_eur: valueEur,
          currency: "EUR",
          updated_at: now,
        })
        .eq("user_id", user.id)
        .eq("asset_type", "Compte Binance")
        .eq("coingecko_id", "usd-coin");
    }

    return ok({ trade, created });
  } catch (error) {
    return mapAuthError(error);
  }
}
