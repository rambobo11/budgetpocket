"use server";

import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createSubscriptionSchema,
  idSchema,
  updateSubscriptionStatusSchema,
} from "@/lib/validation/schemas";
import type { Subscription } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function missingTableHint(message?: string) {
  if (
    message?.includes("subscriptions") ||
    message?.includes("schema cache")
  ) {
    return "Table subscriptions manquante. Exécute supabase/subscriptions.sql dans le SQL Editor.";
  }
  return null;
}

function asSubscription(row: Record<string, unknown>): Subscription {
  return {
    ...(row as unknown as Subscription),
    amount: Number(row.amount),
  };
}

export async function createSubscriptionAction(
  input: unknown
): Promise<ActionResult<Subscription>> {
  try {
    const parsed = createSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`subscription:create:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const {
      name,
      amount,
      category,
      billingInterval,
      nextBillingDate,
      paymentMethod,
      notes,
    } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        name,
        amount,
        category,
        billing_interval: billingInterval,
        next_billing_date: nextBillingDate,
        payment_method: paymentMethod,
        status: "active",
        notes,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ??
          "Impossible d'ajouter l'abonnement. Réessayez."
      );
    }

    return ok(asSubscription(data as Record<string, unknown>));
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function updateSubscriptionStatusAction(
  input: unknown
): Promise<ActionResult<Subscription>> {
  try {
    const parsed = updateSubscriptionStatusSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`subscription:status:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { id, status } = parsed.data;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ status, updated_at: now })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return fail(
        missingTableHint(error?.message) ?? "Impossible de mettre à jour."
      );
    }

    return ok(asSubscription(data as Record<string, unknown>));
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function deleteSubscriptionAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Identifiant invalide.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`subscription:delete:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const { id } = parsed.data;

    const { data, error } = await supabase
      .from("subscriptions")
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
