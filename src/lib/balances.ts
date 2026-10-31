import { createClient } from "@/lib/supabase/client";
import { isMissingRelationError } from "@/lib/supabase/query";
import { emptyBalancesForMonth } from "@/lib/remaining";
import { budgetMonthKey } from "@/lib/incomes";
import type { CategoryLimit, UserBalances } from "@/lib/types";

export { emptyBalancesForMonth };

function mapBalances(row: UserBalances): UserBalances {
  return {
    user_id: row.user_id,
    budget_month: String(row.budget_month).slice(0, 10),
    bank_eur: row.bank_eur == null ? null : Number(row.bank_eur),
    swile_eur: row.swile_eur == null ? null : Number(row.swile_eur),
    updated_at: row.updated_at,
  };
}

export async function fetchUserBalances(month: Date): Promise<UserBalances> {
  const supabase = createClient();
  const result = await supabase
    .from("user_balances")
    .select("*")
    .eq("budget_month", budgetMonthKey(month))
    .maybeSingle();

  if (result.error) {
    if (isMissingRelationError(result.error)) {
      return emptyBalancesForMonth(month);
    }
    throw new Error("Impossible de charger les soldes.");
  }

  if (!result.data) return emptyBalancesForMonth(month);
  return mapBalances(result.data as UserBalances);
}

export async function fetchCategoryLimits(): Promise<CategoryLimit[]> {
  const supabase = createClient();
  const result = await supabase
    .from("category_limits")
    .select("*")
    .order("category", { ascending: true });

  if (result.error) {
    if (isMissingRelationError(result.error)) return [];
    throw new Error("Impossible de charger les plafonds.");
  }

  return (result.data ?? []).map((row) => {
    const item = row as CategoryLimit;
    return { ...item, amount: Number(item.amount) };
  });
}
