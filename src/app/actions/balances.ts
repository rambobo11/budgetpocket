"use server";

import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  BALANCES_SQL_HINT,
  isMissingRelationError,
} from "@/lib/supabase/query";
import { upsertUserBalancesSchema } from "@/lib/validation/schemas";
import type { UserBalances } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function mapBalances(row: UserBalances): UserBalances {
  return {
    user_id: row.user_id,
    bank_eur: row.bank_eur == null ? null : Number(row.bank_eur),
    swile_eur: row.swile_eur == null ? null : Number(row.swile_eur),
    updated_at: row.updated_at,
  };
}

export async function upsertUserBalancesAction(
  input: unknown
): Promise<ActionResult<UserBalances>> {
  try {
    const parsed = upsertUserBalancesSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`balances:upsert:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { data: existing, error: loadError } = await supabase
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) {
      if (isMissingRelationError(loadError)) return fail(BALANCES_SQL_HINT);
      return fail("Impossible d’enregistrer le solde.");
    }

    const current = (existing as UserBalances | null) ?? null;
    const nextBank =
      parsed.data.bankEur === undefined
        ? (current?.bank_eur ?? null)
        : parsed.data.bankEur;
    const nextSwile =
      parsed.data.swileEur === undefined
        ? (current?.swile_eur ?? null)
        : parsed.data.swileEur;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_balances")
      .upsert(
        {
          user_id: user.id,
          bank_eur: nextBank,
          swile_eur: nextSwile,
          updated_at: now,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error || !data) {
      if (isMissingRelationError(error)) return fail(BALANCES_SQL_HINT);
      return fail("Impossible d’enregistrer le solde.");
    }

    return ok(mapBalances(data as UserBalances));
  } catch (error) {
    return mapAuthError(error);
  }
}
