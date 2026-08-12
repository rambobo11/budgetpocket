import type { Asset, Expense, PaymentMethod } from "@/lib/types";

/** Montant d’une dépense qui pèse sur le salaire (hors Swile / primes CSE). */
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

export function isSwilePrimeAsset(
  asset: Pick<Asset, "name" | "notes" | "asset_type">
) {
  const type = asset.asset_type as string;
  if (type !== "Avantages" && type !== "Primes voyage" && type !== "Annexe C") {
    return false;
  }
  const haystack = `${asset.name} ${asset.notes ?? ""}`.toLowerCase();
  return haystack.includes("swile");
}

/**
 * Ajuste le solde « Prime Noël Swile » (ou autre actif Swile CSE).
 * delta négatif = dépense, positif = remboursement (suppression).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- client Supabase typé côté actions
export async function adjustSwilePrimeBalance(
  supabase: any,
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
    assets.find((asset) => isSwilePrimeAsset(asset));

  if (!preferred) return { ok: false };

  const current = Number(preferred.value_original ?? preferred.value_eur);
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
  paymentMethod: PaymentMethod | string | null | undefined
): boolean {
  return paymentMethod === "swile";
}
