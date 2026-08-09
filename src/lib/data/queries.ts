import { createClient } from "@/lib/supabase/server";
import { monthIsoBounds } from "@/lib/date";
import type { Asset, Credit, Expense, Income, Upcoming } from "@/lib/types";

export async function getExpensesForMonth(month: Date): Promise<Expense[]> {
  const supabase = await createClient();
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

export async function getIncomesForBudgetMonth(
  budgetMonthKey: string
): Promise<Income[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incomes")
    .select("*")
    .eq("budget_month", budgetMonthKey)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as Income[];
}

export async function getAssets(): Promise<Asset[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("value_eur", { ascending: false });

  return (data ?? []) as Asset[];
}

export async function getCredits(): Promise<Credit[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("credits")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return (data ?? []) as Credit[];
}

export async function getUpcoming(): Promise<Upcoming[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("upcoming")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    ...(row as Upcoming),
    converted: Boolean((row as Upcoming).converted),
  }));
}
