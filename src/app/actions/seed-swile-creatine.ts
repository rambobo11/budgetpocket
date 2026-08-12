"use server";

import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/date";
import { adjustSwilePrimeBalance } from "@/lib/swile-prime";
import {
  AuthError,
  assertSeedImportAllowed,
  getAuthedClient,
} from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import type { Expense } from "@/lib/types";

const SEED_AMOUNT = 25;
const SEED_DESCRIPTION = "Creatine";
const SEED_CATEGORY = "Santé" as const;
const SEED_NOTE_TAG = "seed:swile-creatine-2026-08-11";

function seedCreatedAtIso(): string {
  // 11 août 2026 · 20:00 Europe/Paris
  return fromZonedTime(
    new Date(2026, 7, 11, 20, 0, 0, 0),
    APP_TIMEZONE
  ).toISOString();
}

/**
 * One-shot owner seed : creatine 25 € Swile le 11/08 → débit Prime Noël.
 * Idempotent (ne recrée pas si déjà présente).
 */
export async function ensureSwileCreatineExpenseAction(): Promise<
  ActionResult<{
    created: boolean;
    expense: Expense | null;
    primeNote: string | null;
  }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    assertSeedImportAllowed(user.id);

    const dayStart = fromZonedTime(
      new Date(2026, 7, 11, 0, 0, 0, 0),
      APP_TIMEZONE
    ).toISOString();
    const dayEnd = fromZonedTime(
      new Date(2026, 7, 11, 23, 59, 59, 999),
      APP_TIMEZONE
    ).toISOString();

    const { data: existing } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("payment_method", "swile")
      .eq("amount", SEED_AMOUNT)
      .eq("category", SEED_CATEGORY)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .ilike("description", `%${SEED_DESCRIPTION}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return ok({
        created: false,
        expense: existing[0] as Expense,
        primeNote: null,
      });
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount: SEED_AMOUNT,
        category: SEED_CATEGORY,
        description: `${SEED_DESCRIPTION} · ${SEED_NOTE_TAG}`,
        payment_method: "swile",
        created_at: seedCreatedAtIso(),
      })
      .select()
      .single();

    if (error || !data) {
      return fail("Impossible de créer la dépense creatine Swile.");
    }

    const adjusted = await adjustSwilePrimeBalance(
      supabase,
      user.id,
      -SEED_AMOUNT
    );
    const primeNote = adjusted.ok
      ? `${adjusted.assetName} → ${adjusted.nextValue.toFixed(2)} €`
      : "Dépense créée, mais Prime Noël Swile introuvable (importe tes primes).";

    return ok({
      created: true,
      expense: data as Expense,
      primeNote,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return ok({ created: false, expense: null, primeNote: null });
    }
    return fail("Seed Swile creatine impossible.");
  }
}
