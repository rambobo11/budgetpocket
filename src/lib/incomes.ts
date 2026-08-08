import {
  addMonths,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Income, IncomeSource } from "@/lib/types";

export function budgetMonthKey(month: Date): string {
  return format(startOfMonth(month), "yyyy-MM-dd");
}

export function budgetMonthInputValue(month: Date): string {
  return format(startOfMonth(month), "yyyy-MM");
}

export function parseBudgetMonthInput(value: string): string {
  return `${value}-01`;
}

export function isValidBudgetMonthInput(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function formatBudgetMonthLabel(
  value: string,
  fallback?: Date
): string {
  const safeValue = isValidBudgetMonthInput(value)
    ? value
    : fallback
      ? budgetMonthInputValue(fallback)
      : "";

  if (!isValidBudgetMonthInput(safeValue)) {
    return "—";
  }

  const date = parseISO(parseBudgetMonthInput(safeValue));
  if (!isValid(date)) {
    return "—";
  }

  return format(startOfMonth(date), "MMMM yyyy", { locale: fr });
}

/** Salaire / Swile → mois suivant ; CAF et autres → mois de réception */
export function suggestBudgetMonth(
  source: IncomeSource,
  receivedDate: string
): string {
  const received = parseISO(receivedDate);
  if (source === "Salaire" || source === "Swile") {
    return budgetMonthKey(addMonths(received, 1));
  }
  return budgetMonthKey(received);
}

export { defaultDateForMonth, monthBounds } from "@/lib/date";

export async function fetchIncomesForMonth(month: Date): Promise<Income[]> {
  const supabase = createClient();
  const key = budgetMonthKey(month);

  const { data } = await supabase
    .from("incomes")
    .select("*")
    .eq("budget_month", key)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as Income[];
}
