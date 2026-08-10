"use server";

import { toEuro } from "@/lib/assets";
import { cryptoValueEur, getCryptoCoin } from "@/lib/crypto";
import { fetchCoinGeckoPricesEur } from "@/lib/crypto-prices";
import { AuthError, assertSeedImportAllowed, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createAssetSchema,
  idSchema,
  updateAssetValueSchema,
} from "@/lib/validation/schemas";
import type { Asset } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

export async function createAssetAction(
  input: unknown
): Promise<ActionResult<Asset>> {
  try {
    const parsed = createAssetSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`asset:create:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const dataIn = parsed.data;
    const now = new Date().toISOString();
    const isCrypto =
      dataIn.assetType === "Crypto" || dataIn.assetType === "Compte Binance";

    let insertPayload: Record<string, unknown>;

    if (isCrypto && dataIn.coingeckoId && dataIn.quantity != null) {
      const coin = getCryptoCoin(dataIn.coingeckoId);
      if (!coin) return fail("Crypto non supportée.");

      let prices: Record<string, number>;
      try {
        prices = await fetchCoinGeckoPricesEur([dataIn.coingeckoId]);
      } catch {
        return fail("Prix introuvable. Réessaie dans un instant.");
      }

      const price = prices[dataIn.coingeckoId];
      if (price == null) {
        return fail("Prix introuvable. Réessaie dans un instant.");
      }

      const valueEur = cryptoValueEur(dataIn.quantity, price);
      insertPayload = {
        user_id: user.id,
        name: `${coin.name} (${coin.symbol})`,
        asset_type: dataIn.assetType,
        currency: "EUR",
        value_original: valueEur,
        value_eur: valueEur,
        quantity: dataIn.quantity,
        coingecko_id: coin.id,
        notes:
          dataIn.notes ||
          (dataIn.assetType === "Compte Binance" ? "Binance" : null),
        updated_at: now,
      };
    } else {
      const valueOriginal = dataIn.valueOriginal ?? 0;
      insertPayload = {
        user_id: user.id,
        name: dataIn.name,
        asset_type: dataIn.assetType,
        currency: dataIn.currency,
        value_original: valueOriginal,
        value_eur: toEuro(valueOriginal, dataIn.currency),
        quantity: dataIn.quantity ?? null,
        coingecko_id: null,
        notes: dataIn.notes,
        updated_at: now,
      };
    }

    const { data, error } = await supabase
      .from("assets")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      return fail(
        error?.message?.includes("coingecko_id")
          ? "Colonne crypto manquante. Exécute supabase/add-crypto-coingecko-id.sql."
          : error?.message?.includes("currency") ||
              error?.message?.includes("value_original")
            ? "Colonnes devise manquantes. Exécute supabase/add-asset-currency.sql."
            : error?.message?.includes("assets")
              ? "Table assets manquante. Exécute supabase/assets.sql."
              : "Impossible d'ajouter l'actif. Réessayez."
      );
    }

    return ok(data as Asset);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteAssetAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id } = parsed.data;

    const { data, error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return fail("Impossible de supprimer. Réessaie.");
    }

    return ok({ id });
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function updateAssetValueAction(
  input: unknown
): Promise<ActionResult<Asset>> {
  try {
    const parsed = updateAssetValueSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id, value } = parsed.data;

    const { data: existing, error: loadError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (loadError || !existing) {
      return fail("Actif introuvable.");
    }

    const asset = existing as Asset;
    const now = new Date().toISOString();
    const isLive =
      (asset.asset_type === "Crypto" || asset.asset_type === "Compte Binance") &&
      Boolean(asset.coingecko_id) &&
      asset.quantity != null;

    let updatePayload: Record<string, unknown>;

    if (isLive && asset.coingecko_id) {
      let prices: Record<string, number>;
      try {
        prices = await fetchCoinGeckoPricesEur([asset.coingecko_id]);
      } catch {
        return fail("Impossible de récupérer le prix.");
      }

      const price = prices[asset.coingecko_id];
      if (price == null) {
        return fail("Prix introuvable pour cette crypto.");
      }

      const valueEur = cryptoValueEur(value, price);
      updatePayload = {
        quantity: value,
        value_original: valueEur,
        value_eur: valueEur,
        currency: "EUR",
        updated_at: now,
      };
    } else {
      const currency = asset.currency ?? "EUR";
      updatePayload = {
        value_original: value,
        value_eur: toEuro(value, currency),
        updated_at: now,
      };
    }

    const { data, error } = await supabase
      .from("assets")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return fail("Impossible de mettre à jour.");
    }

    return ok(data as Asset);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function refreshCryptoPricesAction(): Promise<
  ActionResult<Asset[]>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`asset:refresh:${user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Rafraîchissement trop fréquent. Attends un peu.");
    }

    const { data: assets, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("value_eur", { ascending: false });

    if (error || !assets) {
      return fail("Impossible de charger les actifs.");
    }

    const list = assets as Asset[];
    const tracked = list.filter(
      (asset) =>
        (asset.asset_type === "Crypto" ||
          asset.asset_type === "Compte Binance") &&
        Boolean(asset.coingecko_id) &&
        asset.quantity != null &&
        Number(asset.quantity) > 0
    );

    if (tracked.length === 0) {
      return ok(list);
    }

    let prices: Record<string, number>;
    try {
      prices = await fetchCoinGeckoPricesEur(
        tracked.map((asset) => asset.coingecko_id!)
      );
    } catch {
      return fail("Impossible de récupérer les prix crypto.");
    }

    const now = new Date().toISOString();
    const updatedMap = new Map<string, Asset>();

    await Promise.all(
      tracked.map(async (asset) => {
        const price = prices[asset.coingecko_id!];
        if (price == null) return;

        const quantity = Number(asset.quantity);
        const valueEur = cryptoValueEur(quantity, price);
        const coin = getCryptoCoin(asset.coingecko_id!);

        const { data } = await supabase
          .from("assets")
          .update({
            value_original: valueEur,
            value_eur: valueEur,
            currency: "EUR",
            name: coin ? `${coin.name} (${coin.symbol})` : asset.name,
            updated_at: now,
          })
          .eq("id", asset.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (data) updatedMap.set(asset.id, data as Asset);
      })
    );

    const next = list
      .map((asset) => updatedMap.get(asset.id) ?? asset)
      .sort((a, b) => Number(b.value_eur) - Number(a.value_eur));

    return ok(next);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function importBinanceHoldingsAction(): Promise<
  ActionResult<{ added: Asset[]; skipped: number }>
> {
  try {
    const { BINANCE_HOLDINGS } = await import("@/lib/binance-holdings");
    const { user, supabase } = await getAuthedClient();
    assertSeedImportAllowed(user.id);
    const limited = rateLimit(`asset:import-binance:${user.id}`, {
      limit: 3,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Import déjà lancé récemment.");
    }

    const { data: existing } = await supabase
      .from("assets")
      .select("id, coingecko_id")
      .eq("user_id", user.id)
      .eq("asset_type", "Compte Binance");

    const existingByCoin = new Map(
      (existing ?? [])
        .filter((row) => row.coingecko_id)
        .map((row) => [row.coingecko_id as string, row.id as string])
    );

    let prices: Record<string, number>;
    try {
      prices = await fetchCoinGeckoPricesEur(
        BINANCE_HOLDINGS.map((holding) => holding.coingeckoId)
      );
    } catch {
      return fail("Impossible de récupérer les prix CoinGecko.");
    }

    const now = new Date().toISOString();
    const added: Asset[] = [];
    let skipped = 0;

    for (const holding of BINANCE_HOLDINGS) {
      const coin = getCryptoCoin(holding.coingeckoId);
      const price = prices[holding.coingeckoId];
      if (!coin || price == null) {
        skipped += 1;
        continue;
      }

      const valueEur = cryptoValueEur(holding.quantity, price);
      const existingId = existingByCoin.get(holding.coingeckoId);

      if (existingId) {
        const { data, error } = await supabase
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
          .eq("user_id", user.id)
          .select()
          .single();
        if (!error && data) added.push(data as Asset);
        else skipped += 1;
      } else {
        const { data, error } = await supabase
          .from("assets")
          .insert({
            user_id: user.id,
            name: `${coin.name} (${coin.symbol})`,
            asset_type: "Compte Binance" as const,
            currency: "EUR" as const,
            value_original: valueEur,
            value_eur: valueEur,
            quantity: holding.quantity,
            coingecko_id: holding.coingeckoId,
            notes: "Binance",
            updated_at: now,
          })
          .select()
          .single();
        if (!error && data) added.push(data as Asset);
        else skipped += 1;
      }
    }

    return ok({
      added,
      skipped,
    });
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function importAvantagesHoldingsAction(): Promise<
  ActionResult<{ added: Asset[]; skipped: number }>
> {
  try {
    const { AVANTAGES_HOLDINGS } = await import("@/lib/avantages-holdings");
    const { user, supabase } = await getAuthedClient();
    assertSeedImportAllowed(user.id);
    const limited = rateLimit(`asset:import-avantages:${user.id}`, {
      limit: 3,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Import déjà lancé récemment.");
    }

    const names = AVANTAGES_HOLDINGS.map((item) => item.name);
    const { data: existing } = await supabase
      .from("assets")
      .select("name")
      .eq("user_id", user.id)
      .in("name", names);

    const existingNames = new Set(
      (existing ?? []).map((row) => row.name as string)
    );
    const toImport = AVANTAGES_HOLDINGS.filter(
      (item) => !existingNames.has(item.name)
    );

    if (toImport.length === 0) {
      return ok({ added: [], skipped: AVANTAGES_HOLDINGS.length });
    }

    const now = new Date().toISOString();
    const rows = toImport.map((item) => ({
      user_id: user.id,
      name: item.name,
      asset_type: item.asset_type,
      currency: "EUR" as const,
      value_original: item.value,
      value_eur: item.value,
      quantity: null,
      coingecko_id: null,
      notes: item.notes,
      updated_at: now,
    }));

    const { data, error } = await supabase.from("assets").insert(rows).select();

    if (error || !data) {
      return fail("Import avantages impossible. Réessaie.");
    }

    return ok({
      added: data as Asset[],
      skipped: AVANTAGES_HOLDINGS.length - toImport.length,
    });
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function migrateAnnexeCLabelAction(): Promise<
  ActionResult<Asset[]>
> {
  try {
    const { user, supabase } = await getAuthedClient();

    const { data: assets, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("value_eur", { ascending: false });

    if (error || !assets) {
      return fail("Impossible de charger les actifs.");
    }

    const list = assets as Asset[];
    const toMigrate = list.filter(
      (asset) => (asset.asset_type as string) === "Annexe C"
    );

    if (toMigrate.length === 0) {
      return ok(list);
    }

    const now = new Date().toISOString();
    const updatedMap = new Map<string, Asset>();

    await Promise.all(
      toMigrate.map(async (asset) => {
        const { data } = await supabase
          .from("assets")
          .update({ asset_type: "Primes voyage", updated_at: now })
          .eq("id", asset.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (data) updatedMap.set(asset.id, data as Asset);
      })
    );

    return ok(list.map((asset) => updatedMap.get(asset.id) ?? asset));
  } catch (error) {
    return mapAuthError(error);
  }
}
