"use server";

import { calendarDateWithNowTimeToIso } from "@/lib/date";
import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createExpenseSchema,
  idSchema,
} from "@/lib/validation/schemas";
import type { Expense } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

export async function createExpenseAction(
  input: unknown
): Promise<ActionResult<Expense>> {
  try {
    const parsed = createExpenseSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`expense:create:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { amount, category, description, paymentMethod, date } = parsed.data;

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount,
        category,
        description,
        payment_method: paymentMethod,
        created_at: calendarDateWithNowTimeToIso(date),
      })
      .select()
      .single();

    if (error || !data) {
      return fail("Impossible d'ajouter la dépense. Réessayez.");
    }

    return ok(data as Expense);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteExpenseAction(
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
      .from("expenses")
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
