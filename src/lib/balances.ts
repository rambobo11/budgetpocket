import { createClient } from "@/lib/supabase/client";
import { isMissingRelationError } from "@/lib/supabase/query";
import { EMPTY_BALANCES } from "@/lib/remaining";
import type { CategoryLimit, UserBalances } from "@/lib/types";

export { EMPTY_BALANCES };

export async function fetchUserBalances(): Promise<UserBalances> {
  const supabase = createClient();
  const result = await supabase.from("user_balances").select("*").maybeSingle();

  if (result.error) {
    if (isMissingRelationError(result.error)) return EMPTY_BALANCES;
    throw new Error("Impossible de charger les soldes.");
  }

  if (!result.data) return EMPTY_BALANCES;

  const row = result.data as UserBalances;
  return {
    user_id: row.user_id,
    bank_eur: row.bank_eur == null ? null : Number(row.bank_eur),
    swile_eur: row.swile_eur == null ? null : Number(row.swile_eur),
    updated_at: row.updated_at,
  };
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
