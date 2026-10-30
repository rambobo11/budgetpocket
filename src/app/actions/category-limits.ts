"use server";

import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  BALANCES_SQL_HINT,
  isMissingRelationError,
} from "@/lib/supabase/query";
import { upsertCategoryLimitSchema } from "@/lib/validation/schemas";
import type { CategoryLimit } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function mapLimit(row: CategoryLimit): CategoryLimit {
  return { ...row, amount: Number(row.amount) };
}

export async function upsertCategoryLimitAction(
  input: unknown
): Promise<ActionResult<{ limit: CategoryLimit | null; category: string }>> {
  try {
    const parsed = upsertCategoryLimitSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`category-limit:upsert:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { category, amount } = parsed.data;

    if (amount == null) {
      const { error } = await supabase
        .from("category_limits")
        .delete()
        .eq("user_id", user.id)
        .eq("category", category);

      if (error) {
        if (isMissingRelationError(error)) return fail(BALANCES_SQL_HINT);
        return fail("Impossible de retirer le plafond.");
      }

      return ok({ limit: null, category });
    }

    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase
      .from("category_limits")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .maybeSingle();

    if (existingError) {
      if (isMissingRelationError(existingError)) return fail(BALANCES_SQL_HINT);
      return fail("Impossible d’enregistrer le plafond.");
    }

    const payload = {
      user_id: user.id,
      category,
      amount,
      updated_at: now,
    };

    const query = existing
      ? supabase
          .from("category_limits")
          .update(payload)
          .eq("id", existing.id)
          .eq("user_id", user.id)
      : supabase.from("category_limits").insert(payload);

    const { data, error } = await query.select().single();

    if (error || !data) {
      if (isMissingRelationError(error)) return fail(BALANCES_SQL_HINT);
      return fail("Impossible d’enregistrer le plafond.");
    }

    return ok({ limit: mapLimit(data as CategoryLimit), category });
  } catch (error) {
    return mapAuthError(error);
  }
}
