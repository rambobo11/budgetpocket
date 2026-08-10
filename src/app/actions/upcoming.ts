"use server";

import { format } from "date-fns";
import { calendarDateToIso, calendarDateWithNowTimeToIso, nowInAppTz } from "@/lib/date";
import { suggestBudgetMonth } from "@/lib/incomes";
import { AuthError, getAuthedClient } from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  completeUpcomingSchema,
  createUpcomingSchema,
  idSchema,
} from "@/lib/validation/schemas";
import type { Upcoming } from "@/lib/types";

function mapAuthError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return fail("Erreur inattendue. Réessayez.");
}

function missingTableHint(message?: string) {
  if (message?.includes("upcoming") || message?.includes("schema cache")) {
    return "Table upcoming manquante. Exécute supabase/upcoming.sql dans le SQL Editor.";
  }
  if (message?.includes("converted")) {
    return "Colonne converted manquante. Exécute supabase/add-upcoming-converted.sql.";
  }
  return null;
}

function todayYmd() {
  return format(nowInAppTz(), "yyyy-MM-dd");
}

function asUpcoming(row: Record<string, unknown>): Upcoming {
  return {
    ...(row as unknown as Upcoming),
    converted: Boolean(row.converted),
  };
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
        converted: false,
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

    return ok(asUpcoming(data as Record<string, unknown>));
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function completeUpcomingAction(
  input: unknown
): Promise<ActionResult<Upcoming>> {
  try {
    const parsed = completeUpcomingSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Données invalides.");
    }

    const { user, supabase } = await getAuthedClient();
    const limited = rateLimit(`upcoming:complete:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

    const {
      id,
      convert,
      category,
      paymentMethod,
      source,
      date,
      budgetMonth,
    } = parsed.data;

    const { data: existing, error: fetchError } = await supabase
      .from("upcoming")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return fail(
        missingTableHint(fetchError?.message) ?? "Échéance introuvable."
      );
    }

    const item = asUpcoming(existing as Record<string, unknown>);
    if (item.status === "done") {
      return ok(item);
    }

    if (convert && item.converted) {
      return fail(
        "Déjà converti en écriture. Utilise « Juste marquer fait » pour clôturer."
      );
    }

    if (convert) {
      if (item.kind === "À payer" && !category) {
        return fail("Choisissez une catégorie de dépense.");
      }
      if (item.kind === "À recevoir" && !source) {
        return fail("Choisissez une source de revenu.");
      }
    }

    const eventDate = date ?? item.due_date ?? todayYmd();
    const now = new Date().toISOString();

    // Claim atomique : empêche double conversion / double clic
    const { data: claimed, error: claimError } = await supabase
      .from("upcoming")
      .update({
        status: "done",
        converted: convert ? true : item.converted,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "open")
      .select()
      .maybeSingle();

    if (claimError) {
      return fail(
        missingTableHint(claimError.message) ??
          "Impossible de marquer comme fait."
      );
    }

    if (!claimed) {
      const { data: again } = await supabase
        .from("upcoming")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (again) return ok(asUpcoming(again as Record<string, unknown>));
      return fail("Échéance déjà traitée.");
    }

    const claimedItem = asUpcoming(claimed as Record<string, unknown>);

    if (!convert) {
      return ok(claimedItem);
    }

    async function rollbackClaim() {
      await supabase
        .from("upcoming")
        .update({
          status: "open",
          converted: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    if (item.kind === "À payer") {
      const { error: expenseError } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: item.amount,
        category,
        description: item.title,
        payment_method: paymentMethod ?? "cb",
        created_at: calendarDateWithNowTimeToIso(eventDate),
      });
      if (expenseError) {
        await rollbackClaim();
        return fail("Impossible de créer la dépense. Réessaie.");
      }
    } else {
      const suggested = suggestBudgetMonth(source!, eventDate).slice(0, 7);
      const monthKey = budgetMonth ?? suggested;
      const { error: incomeError } = await supabase.from("incomes").insert({
        user_id: user.id,
        amount: item.amount,
        source,
        description: item.title,
        budget_month: `${monthKey}-01`,
        created_at: calendarDateToIso(eventDate),
      });
      if (incomeError) {
        await rollbackClaim();
        return fail(
          incomeError.message?.includes("budget_month")
            ? "Colonne budget_month manquante. Exécute supabase/add-budget-month.sql."
            : "Impossible de créer le revenu. Réessaie."
        );
      }
    }

    return ok(claimedItem);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function markUpcomingDoneAction(
  input: unknown
): Promise<ActionResult<Upcoming>> {
  const id =
    typeof input === "object" && input && "id" in input
      ? (input as { id: string }).id
      : input;
  return completeUpcomingAction({ id, convert: false });
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
    const limited = rateLimit(`upcoming:reopen:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

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

    return ok(asUpcoming(data as Record<string, unknown>));
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
    const limited = rateLimit(`upcoming:delete:${user.id}`, {
      limit: 40,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return fail("Trop de requêtes. Réessaie dans un instant.");
    }

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
