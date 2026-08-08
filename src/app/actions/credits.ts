"use server";

import { AuthError, assertSeedImportAllowed, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createCreditSchema,
  idSchema,
  updateCreditAmountSchema,
} from "@/lib/validation/schemas";
import type { Credit } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

export async function createCreditAction(
  input: unknown
): Promise<ActionResult<Credit>> {
  try {
    const parsed = createCreditSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`credit:create:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { person, kind, amount, currency, notes } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("credits")
      .insert({
        user_id: user.id,
        person,
        kind,
        amount,
        currency,
        notes,
        status: "open",
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      return fail(
        error?.message?.includes("currency")
          ? "Colonne currency manquante. Exécute supabase/add-credit-currency-and-family.sql."
          : error?.message?.includes("credits")
            ? "Table credits manquante. Exécute supabase/credits.sql."
            : "Impossible d'ajouter. Réessayez."
      );
    }

    return ok(data as Credit);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function updateCreditAmountAction(
  input: unknown
): Promise<ActionResult<Credit>> {
  try {
    const parsed = updateCreditAmountSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id, amount } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("credits")
      .update({
        amount,
        status: amount === 0 ? "repaid" : "open",
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail("Impossible de mettre à jour.");
    }

    return ok(data as Credit);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function markCreditRepaidAction(
  input: unknown
): Promise<ActionResult<Credit>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("credits")
      .update({
        amount: 0,
        status: "repaid",
        updated_at: now,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail("Impossible de marquer comme remboursé.");
    }

    return ok(data as Credit);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteCreditAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();

    const { data, error } = await supabase
      .from("credits")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return fail("Impossible de supprimer. Réessaie.");
    }

    return ok({ id: parsed.data.id });
  } catch (error) {
    return mapAuthError(error);
  }
}

/** Seed one-shot : crédit sœur (MAD) + frère (EUR). */
export async function ensureFamilyCreditsAction(): Promise<
  ActionResult<{ added: Credit[] }>
> {
  try {
    const { user, supabase } = await getAuthedClient();
    assertSeedImportAllowed(user.id);

    const seeds = [
      {
        person: "Sœur",
        kind: "Crédit" as const,
        amount: 20000,
        currency: "MAD" as const,
        notes: "Crédit famille",
      },
      {
        person: "Frère",
        kind: "Crédit" as const,
        amount: 250,
        currency: "EUR" as const,
        notes: "Crédit famille",
      },
    ];

    const { data: existing } = await supabase
      .from("credits")
      .select("person, currency")
      .eq("user_id", user.id)
      .in(
        "person",
        seeds.map((s) => s.person)
      );

    const existingKeys = new Set(
      (existing ?? []).map(
        (row) => `${row.person as string}|${(row.currency as string) ?? "EUR"}`
      )
    );

    const toInsert = seeds.filter(
      (seed) => !existingKeys.has(`${seed.person}|${seed.currency}`)
    );

    if (toInsert.length === 0) {
      return ok({ added: [] });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("credits")
      .insert(
        toInsert.map((seed) => ({
          user_id: user.id,
          ...seed,
          status: "open",
          updated_at: now,
        }))
      )
      .select();

    if (error || !data) {
      return fail(
        error?.message?.includes("currency")
          ? "Colonne currency manquante. Exécute supabase/add-credit-currency-and-family.sql."
          : "Impossible d'ajouter les crédits famille."
      );
    }

    return ok({ added: data as Credit[] });
  } catch (error) {
    return mapAuthError(error);
  }
}
