"use server";

import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/date";
import {
  AuthError,
  assertSeedImportAllowed,
  getAuthedClient,
} from "@/lib/security/auth";
import { ok, type ActionResult } from "@/lib/security/action-result";
import type { Expense } from "@/lib/types";

/** Tag stable pour idempotence (invisible métier si on filtre à la création). */
const SWILE_CREATINE_SEED_TAG = "seed:swile-creatine-2026-08-11";

const SEED_AMOUNT = 25;
const SEED_CATEGORY = "Santé" as const;

function seedCreatedAtIso(): string {
  return fromZonedTime(
    new Date(2026, 7, 11, 20, 0, 0, 0),
    APP_TIMEZONE
  ).toISOString();
}

/**
 * One-shot owner : creatine 25 € Swile le 11/08 + débit Prime Noël.
 * Idempotent via tag. Safe à rappeler (no-op si déjà fait).
 */
export async function ensureSwileCreatineExpenseAction(): Promise<
  ActionResult<{ created: boolean; expenseId: string | null }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    try {
      assertSeedImportAllowed(user.id);
    } catch {
      return ok({ created: false, expenseId: null });
    }

    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("user_id", user.id)
      .eq("payment_method", "swile")
      .eq("amount", SEED_AMOUNT)
      .ilike("description", `%${SWILE_CREATINE_SEED_TAG}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return ok({ created: false, expenseId: existing[0]!.id as string });
    }

    // Compat : ancienne détection (avant tag-only) creatine Santé 11/08
    const dayStart = fromZonedTime(
      new Date(2026, 7, 11, 0, 0, 0, 0),
      APP_TIMEZONE
    ).toISOString();
    const dayEnd = fromZonedTime(
      new Date(2026, 7, 11, 23, 59, 59, 999),
      APP_TIMEZONE
    ).toISOString();

    const { data: legacy } = await supabase
      .from("expenses")
      .select("id")
      .eq("user_id", user.id)
      .eq("payment_method", "swile")
      .eq("amount", SEED_AMOUNT)
      .eq("category", SEED_CATEGORY)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .ilike("description", "%Creatine%")
      .limit(1);

    if (legacy && legacy.length > 0) {
      return ok({ created: false, expenseId: legacy[0]!.id as string });
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount: SEED_AMOUNT,
        category: SEED_CATEGORY,
        description: `Creatine (${SWILE_CREATINE_SEED_TAG})`,
        payment_method: "swile",
        created_at: seedCreatedAtIso(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return ok({ created: false, expenseId: null });
    }

    // Ne plus débiter Prime Noël ici — solde géré dans Patrimoine.
    return ok({ created: true, expenseId: data.id as string });
  } catch (error) {
    if (error instanceof AuthError) {
      return ok({ created: false, expenseId: null });
    }
    return ok({ created: false, expenseId: null });
  }
}
