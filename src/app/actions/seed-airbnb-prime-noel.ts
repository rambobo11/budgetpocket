"use server";

import {
  AuthError,
  assertSeedImportAllowed,
  getAuthedClient,
} from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { calendarDateWithNowTimeToIso, nowInAppTz } from "@/lib/date";
import { format } from "date-fns";
import {
  adjustSwilePrimeBalance,
  isChristmasSwilePrimeAsset,
} from "@/lib/swile-prime";
import type { Asset } from "@/lib/types";

/** Tag stable pour idempotence. */
const SEED_TAG = "seed:airbnb-prime-noel-2026-08";

const SEED_CATEGORY = "Travel" as const;

/**
 * One-shot owner : solde restant Prime Noël → dépense carte Airbnb,
 * puis Prime Noël à 0 €. Idempotent via tag.
 */
export async function ensureAirbnbPrimeNoelExpenseAction(): Promise<
  ActionResult<{
    created: boolean;
    expenseId: string | null;
    amount: number | null;
    primeZeroed: boolean;
  }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    try {
      assertSeedImportAllowed(user.id);
    } catch {
      return ok({
        created: false,
        expenseId: null,
        amount: null,
        primeZeroed: false,
      });
    }

    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("user_id", user.id)
      .ilike("description", `%${SEED_TAG}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return ok({
        created: false,
        expenseId: existing[0]!.id as string,
        amount: null,
        primeZeroed: false,
      });
    }

    const { data: assetsData } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id);

    const assets = (assetsData ?? []) as Asset[];
    const prime =
      assets.find((asset) => asset.name === "Prime Noël Swile") ??
      assets.find((asset) => isChristmasSwilePrimeAsset(asset));

    const remaining = prime
      ? Number(prime.value_original ?? prime.value_eur)
      : 0;

    if (!Number.isFinite(remaining) || remaining <= 0) {
      return ok({
        created: false,
        expenseId: null,
        amount: null,
        primeZeroed: true,
      });
    }

    const amount = Number(remaining.toFixed(2));
    const today = format(nowInAppTz(), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount,
        amount_original: amount,
        currency: "EUR",
        category: SEED_CATEGORY,
        description: `Carte Airbnb · Prime Noël (${SEED_TAG})`,
        payment_method: "cb",
        created_at: calendarDateWithNowTimeToIso(today),
      })
      .select("id")
      .single();

    if (error || !data) {
      return fail("Impossible d’enregistrer la dépense Prime Noël.");
    }

    let primeZeroed = false;
    if (prime) {
      const current = Number(prime.value_original ?? prime.value_eur);
      if (Number.isFinite(current) && current > 0) {
        const adjusted = await adjustSwilePrimeBalance(
          supabase,
          user.id,
          -current
        );
        primeZeroed = adjusted.ok;
      } else if (Number.isFinite(current) && current === 0) {
        primeZeroed = true;
      }
    }

    return ok({
      created: true,
      expenseId: data.id as string,
      amount,
      primeZeroed,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return ok({
        created: false,
        expenseId: null,
        amount: null,
        primeZeroed: false,
      });
    }
    return ok({
      created: false,
      expenseId: null,
      amount: null,
      primeZeroed: false,
    });
  }
}
