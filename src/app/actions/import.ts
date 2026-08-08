"use server";

import { calendarDateToIso } from "@/lib/date";
import { HISTORICAL_EXPENSES } from "@/lib/historical-expenses";
import {
  AuthError,
  assertSeedImportAllowed,
  getAuthedClient,
} from "@/lib/security/auth";
import { fail, ok, type ActionResult } from "@/lib/security/action-result";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Import one-shot désactivé par défaut (OWASP A01 / A04).
 * Activer avec ALLOW_HISTORICAL_IMPORT=true + OWNER_USER_ID recommandé.
 */
export async function importHistoricalExpensesAction(): Promise<
  ActionResult<{ inserted: number }>
> {
  try {
    if (process.env.ALLOW_HISTORICAL_IMPORT !== "true") {
      return fail(
        "Import historique désactivé. Ajoute ALLOW_HISTORICAL_IMPORT=true dans .env.local pour l’activer une fois."
      );
    }

    const { user, supabase } = await getAuthedClient();
    assertSeedImportAllowed(user.id);

    const limited = rateLimit(`import:historical:${user.id}`, {
      limit: 1,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!limited.ok) {
      return fail("Import déjà utilisé récemment (1× / 24h max).");
    }

    // Garde anti-doublon approximative : si déjà > 50 dépenses dans la plage, refuse
    const firstDate = HISTORICAL_EXPENSES[0]?.date;
    const lastDate = HISTORICAL_EXPENSES[HISTORICAL_EXPENSES.length - 1]?.date;
    if (firstDate && lastDate) {
      const { count } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", calendarDateToIso(firstDate))
        .lte("created_at", calendarDateToIso(lastDate));

      if ((count ?? 0) >= Math.floor(HISTORICAL_EXPENSES.length * 0.5)) {
        return fail(
          "Des dépenses historiques semblent déjà présentes. Import annulé pour éviter les doublons."
        );
      }
    }

    const rows = HISTORICAL_EXPENSES.map((expense) => ({
      user_id: user.id,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      payment_method: expense.payment_method,
      created_at: calendarDateToIso(expense.date),
    }));

    const chunkSize = 50;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("expenses").insert(chunk);

      if (error) {
        console.error("[importHistorical]", error.message);
        return fail(
          `Import interrompu après ${inserted} lignes. Vérifie les données puis réessaie.`
        );
      }

      inserted += chunk.length;
    }

    return ok({ inserted });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message);
    return fail("Erreur inattendue pendant l’import.");
  }
}
