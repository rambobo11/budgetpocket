"use server";

import { calendarDateToIso } from "@/lib/date";
import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createIncomeSchema,
  idSchema,
  updateIncomeBudgetMonthSchema,
} from "@/lib/validation/schemas";
import type { Income } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

export async function createIncomeAction(
  input: unknown
): Promise<ActionResult<Income>> {
  try {
    const parsed = createIncomeSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`income:create:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { amount, source, description, date, budgetMonth } = parsed.data;

    const { data, error } = await supabase
      .from("incomes")
      .insert({
        user_id: user.id,
        amount,
        source,
        description,
        budget_month: `${budgetMonth}-01`,
        created_at: calendarDateToIso(date),
      })
      .select()
      .single();

    if (error || !data) {
      return fail(
        error?.message?.includes("budget_month")
          ? "Colonne budget_month manquante. Exécute supabase/add-budget-month.sql."
          : "Impossible d'ajouter le revenu. Réessayez."
      );
    }

    return ok(data as Income);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteIncomeAction(
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
      .from("incomes")
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

export async function updateIncomeBudgetMonthAction(
  input: unknown
): Promise<ActionResult<Income>> {
  try {
    const parsed = updateIncomeBudgetMonthSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id, budgetMonth } = parsed.data;

    const { data, error } = await supabase
      .from("incomes")
      .update({ budget_month: `${budgetMonth}-01` })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail("Impossible de modifier le mois concerné.");
    }

    return ok(data as Income);
  } catch (error) {
    return mapAuthError(error);
  }
}
