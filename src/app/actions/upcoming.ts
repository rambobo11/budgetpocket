"use server";

import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import { createUpcomingSchema, idSchema } from "@/lib/validation/schemas";
import type { Upcoming } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function missingTableHint(message?: string) {
  if (message?.includes("upcoming") || message?.includes("schema cache")) {
    return "Table upcoming manquante. Exécute supabase/upcoming.sql dans le SQL Editor.";
  }
  return null;
}

export async function createUpcomingAction(
  input: unknown
): Promise<ActionResult<Upcoming>> {
  try {
    const parsed = createUpcomingSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`upcoming:create:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { title, kind, amount, dueDate, notes } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("upcoming")
      .insert({
        user_id: user.id,
        title,
        kind,
        amount,
        due_date: dueDate,
        notes,
        status: "open",
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ??
          "Impossible d'ajouter. Réessayez."
      );
    }

    return ok(data as Upcoming);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function markUpcomingDoneAction(
  input: unknown
): Promise<ActionResult<Upcoming>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("upcoming")
      .update({ status: "done", updated_at: now })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible de marquer comme fait."
      );
    }

    return ok(data as Upcoming);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function reopenUpcomingAction(
  input: unknown
): Promise<ActionResult<Upcoming>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const { id } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("upcoming")
      .update({ status: "open", updated_at: now })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible de rouvrir."
      );
    }

    return ok(data as Upcoming);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteUpcomingAction(
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
      .from("upcoming")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible de supprimer."
      );
    }

    return ok({ id: data.id as string });
  } catch (error) {
    return mapAuthError(error);
  }
}
