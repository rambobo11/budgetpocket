import type { Asset, Expense, PaymentMethod } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Dépense qui pèse sur le salaire : CB + Cash (retrait ATM). Swile = tickets resto CSE. */
export function isSalaryExpense(
  expense: Pick<Expense, "payment_method">
): boolean {
  return (expense.payment_method ?? "cb") !== "swile";
}

export function sumSalaryExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => {
    if (!isSalaryExpense(expense)) return sum;
    return sum + Number(expense.amount);
  }, 0);
}

/** Uniquement la prime Christmas CSE — pas un autre solde « Swile ». */
export function isChristmasSwilePrimeAsset(
  asset: Pick<Asset, "name" | "notes" | "asset_type">
): boolean {
  const type = asset.asset_type as string;
  if (type !== "Avantages" && type !== "Primes voyage" && type !== "Annexe C") {
    return false;
  }
  if (asset.name === "Prime Noël Swile") return true;
  const haystack = `${asset.name} ${asset.notes ?? ""}`.toLowerCase();
  const hasSwile = haystack.includes("swile");
  const hasChristmas =
    haystack.includes("noël") ||
    haystack.includes("noel") ||
    haystack.includes("christmas") ||
    haystack.includes("xmas");
  return hasSwile && hasChristmas;
}

/**
 * Ajuste le solde « Prime Noël Swile ».
 * delta négatif = dépense, positif = remboursement (suppression).
 */
export async function adjustSwilePrimeBalance(
  supabase: SupabaseClient,
  userId: string,
  deltaEur: number
): Promise<{ ok: true; assetName: string; nextValue: number } | { ok: false }> {
  if (deltaEur === 0 || !Number.isFinite(deltaEur)) {
    return { ok: false };
  }

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", userId);

  if (error || !data) return { ok: false };

  const assets = data as Asset[];
  const preferred =
    assets.find((asset) => asset.name === "Prime Noël Swile") ??
    assets.find((asset) => isChristmasSwilePrimeAsset(asset));

  if (!preferred) return { ok: false };

  const current = Number(preferred.value_original ?? preferred.value_eur);
  if (!Number.isFinite(current)) return { ok: false };

  const nextValue = Number(Math.max(0, current + deltaEur).toFixed(2));
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("assets")
    .update({
      value_original: nextValue,
      value_eur: nextValue,
      currency: "EUR",
      updated_at: now,
    })
    .eq("id", preferred.id)
    .eq("user_id", userId);

  if (updateError) return { ok: false };

  return { ok: true, assetName: preferred.name, nextValue };
}

export function shouldAdjustSwilePrime(
  _paymentMethod: PaymentMethod | string | null | undefined
): boolean {
  // Swile tickets resto ≠ Prime Noël Christmas : ne plus débiter l’actif.
  // La Prime Noël se met à jour manuellement dans Patrimoine.
  return false;
}

/** Solde cible après creatine 25 € (50,71 → 25,71) — used by repair action. */
export const CHRISTMAS_SWILE_PRIME_REPAIR_EUR = 25.71;
