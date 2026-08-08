import { createClient } from "@/lib/supabase/client";
import { monthIsoBounds } from "@/lib/date";
import type { Expense } from "@/lib/types";

export { defaultDateForMonth, monthBounds } from "@/lib/date";

export async function fetchExpensesForMonth(month: Date): Promise<Expense[]> {
  const supabase = createClient();
  const { start, end } = monthIsoBounds(month);

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []) as Expense[];
}

/** Dépenses entre le début de `fromMonth` et la fin de `toMonth` (inclus). */
export async function fetchExpensesBetween(
  fromMonth: Date,
  toMonth: Date
): Promise<Expense[]> {
  const supabase = createClient();
  const { start } = monthIsoBounds(fromMonth);
  const { end } = monthIsoBounds(toMonth);

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(3000);

  return (data ?? []) as Expense[];
}
