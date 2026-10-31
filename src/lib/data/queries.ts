import { createClient } from "@/lib/supabase/server";
import {
  isMissingRelationError,
  unwrapList,
} from "@/lib/supabase/query";
import { emptyBalancesForMonth } from "@/lib/remaining";
import { budgetMonthKey } from "@/lib/incomes";
import { monthIsoBounds } from "@/lib/date";
import { normalizeExpense } from "@/lib/expense-currency";
import type {
  Asset,
  CategoryLimit,
  Credit,
  CryptoTrade,
  Expense,
  Income,
  Subscription,
  Upcoming,
  UserBalances,
} from "@/lib/types";

export async function getExpensesForMonth(month: Date): Promise<Expense[]> {
  const supabase = await createClient();
  const { start, end } = monthIsoBounds(month);

  const result = await supabase
    .from("expenses")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(500);

  return unwrapList(result, "Impossible de charger les dépenses.").map(
    (row) => normalizeExpense(row as Expense)
  );
}

export async function getIncomesForBudgetMonth(
  budgetMonthKey: string
): Promise<Income[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("incomes")
    .select("*")
    .eq("budget_month", budgetMonthKey)
    .order("created_at", { ascending: false })
    .limit(200);

  return unwrapList(result, "Impossible de charger les revenus.");
}

export async function getAssets(): Promise<Asset[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("assets")
    .select("*")
    .order("value_eur", { ascending: false });

  return unwrapList(result, "Impossible de charger le patrimoine.");
}

export async function getCredits(): Promise<Credit[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("credits")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return unwrapList(result, "Impossible de charger les crédits.");
}

export async function getUpcoming(): Promise<Upcoming[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("upcoming")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return unwrapList(result, "Impossible de charger les échéances.").map(
    (row) => ({
      ...(row as Upcoming),
      converted: Boolean((row as Upcoming).converted),
    })
  );
}

export async function getCryptoTrades(): Promise<CryptoTrade[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("crypto_trades")
    .select("*")
    .order("traded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  return unwrapList(result, "Impossible de charger les trades crypto.").map(
    (row) => ({
      ...(row as CryptoTrade),
      quantity: Number((row as CryptoTrade).quantity),
      price_quote: Number((row as CryptoTrade).price_quote),
      fee_quote: Number((row as CryptoTrade).fee_quote ?? 0),
    })
  );
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("subscriptions")
    .select("*")
    .order("status", { ascending: true })
    .order("next_billing_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return unwrapList(result, "Impossible de charger les abonnements.").map(
    (row) => ({
      ...(row as Subscription),
      amount: Number((row as Subscription).amount),
    })
  );
}

function mapBalances(row: UserBalances): UserBalances {
  return {
    user_id: row.user_id,
    budget_month: String(row.budget_month).slice(0, 10),
    bank_eur: row.bank_eur == null ? null : Number(row.bank_eur),
    swile_eur: row.swile_eur == null ? null : Number(row.swile_eur),
    updated_at: row.updated_at,
  };
}

export async function getUserBalances(month: Date): Promise<UserBalances> {
  const supabase = await createClient();
  const key = budgetMonthKey(month);
  const result = await supabase
    .from("user_balances")
    .select("*")
    .eq("budget_month", key)
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

export async function getCategoryLimits(): Promise<CategoryLimit[]> {
  const supabase = await createClient();
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
    return {
      ...item,
      amount: Number(item.amount),
    };
  });
}
