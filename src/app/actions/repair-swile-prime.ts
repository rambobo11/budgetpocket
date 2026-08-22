"use server";

import {
  CHRISTMAS_SWILE_PRIME_REPAIR_EUR,
  isChristmasSwilePrimeAsset,
} from "@/lib/swile-prime";
import {
  AuthError,
  assertSeedImportAllowed,
  getAuthedClient,
} from "@/lib/security/auth";
import { ok, type ActionResult } from "@/lib/security/action-result";
import type { Asset } from "@/lib/types";

const REPAIR_NOTE_TAG = "repair:prime-noel-25.71";

/**
 * Remet Prime Noël Swile à 25,71 € (solde réel).
 * Corrige les débits erronés des tickets Swile resto.
 * Idempotent via tag dans notes.
 */
export async function repairChristmasSwilePrimeAction(): Promise<
  ActionResult<{ repaired: boolean; value: number | null }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    try {
      assertSeedImportAllowed(user.id);
    } catch {
      return ok({ repaired: false, value: null });
    }

    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id);

    const assets = (data ?? []) as Asset[];
    const prime =
      assets.find((asset) => asset.name === "Prime Noël Swile") ??
      assets.find((asset) => isChristmasSwilePrimeAsset(asset));

    if (!prime) {
      return ok({ repaired: false, value: null });
    }

    const notes = prime.notes ?? "";
    if (notes.includes(REPAIR_NOTE_TAG)) {
      return ok({ repaired: false, value: Number(prime.value_eur) });
    }

    const target = CHRISTMAS_SWILE_PRIME_REPAIR_EUR;
    const nextNotes = notes.trim()
      ? `${notes.trim()} · ${REPAIR_NOTE_TAG}`
      : REPAIR_NOTE_TAG;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("assets")
      .update({
        value_original: target,
        value_eur: target,
        currency: "EUR",
        notes: nextNotes,
        updated_at: now,
      })
      .eq("id", prime.id)
      .eq("user_id", user.id);

    if (error) {
      return ok({ repaired: false, value: Number(prime.value_eur) });
    }

    return ok({ repaired: true, value: target });
  } catch (error) {
    if (error instanceof AuthError) {
      return ok({ repaired: false, value: null });
    }
    return ok({ repaired: false, value: null });
  }
}
