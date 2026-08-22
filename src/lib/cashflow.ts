import type { Expense, Income } from "@/lib/types";
import { formatEuro } from "@/lib/format";
import { isSalaryExpense } from "@/lib/swile-prime";

export type CashflowNodeKind =
  | "source"
  | "budget"
  | "category"
  | "savings"
  | "deficit";

export type CashflowNode = {
  id: string;
  label: string;
  kind: CashflowNodeKind;
  value: number;
};

export type CashflowLink = {
  source: string;
  target: string;
  value: number;
};

export type CashflowModel = {
  nodes: CashflowNode[];
  links: CashflowLink[];
  incomeTotal: number;
  expenseTotal: number;
  savings: number;
  hasData: boolean;
};

const BUDGET_ID = "budget";

/** Construit un modèle Sankey : sources → Budget → catégories CB + Cash (+ épargne / déficit).
 * Swile exclu : tickets resto CSE, pas le salaire. Cash (ATM) = salaire.
 */
export function buildCashflowModel(
  incomes: Income[],
  expenses: Expense[]
): CashflowModel {
  const sourceMap = new Map<string, number>();
  for (const income of incomes) {
    const key = income.source || "Autres";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + Number(income.amount));
  }

  const categoryMap = new Map<string, number>();
  for (const expense of expenses) {
    if (!isSalaryExpense(expense)) continue;
    const key = expense.category || "Autres";
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + Number(expense.amount));
  }

  const incomeTotal = [...sourceMap.values()].reduce((a, b) => a + b, 0);
  const expenseTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0);
  const savings = incomeTotal - expenseTotal;

  if (incomeTotal <= 0 && expenseTotal <= 0) {
    return {
      nodes: [],
      links: [],
      incomeTotal: 0,
      expenseTotal: 0,
      savings: 0,
      hasData: false,
    };
  }

  const nodes: CashflowNode[] = [];
  const links: CashflowLink[] = [];

  for (const [label, value] of [...sourceMap.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    if (value <= 0) continue;
    const id = `src:${label}`;
    nodes.push({ id, label, kind: "source", value });
    links.push({ source: id, target: BUDGET_ID, value });
  }

  if (savings < 0) {
    const deficit = Math.abs(savings);
    nodes.push({
      id: "deficit",
      label: "Déficit",
      kind: "deficit",
      value: deficit,
    });
    links.push({ source: "deficit", target: BUDGET_ID, value: deficit });
  }

  const budgetValue = Math.max(incomeTotal, expenseTotal);
  nodes.push({
    id: BUDGET_ID,
    label: "Budget",
    kind: "budget",
    value: budgetValue,
  });

  for (const [label, value] of [...categoryMap.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    if (value <= 0) continue;
    const id = `cat:${label}`;
    nodes.push({ id, label, kind: "category", value });
    links.push({ source: BUDGET_ID, target: id, value });
  }

  if (savings > 0) {
    nodes.push({
      id: "savings",
      label: "Épargne",
      kind: "savings",
      value: savings,
    });
    links.push({ source: BUDGET_ID, target: "savings", value: savings });
  }

  return {
    nodes,
    links,
    incomeTotal,
    expenseTotal,
    savings,
    hasData: true,
  };
}

export function formatCashflowNodeLabel(
  node: Pick<CashflowNode, "label" | "value">,
  mask: (value: string) => string
) {
  return `${node.label} ${mask(formatEuro(node.value))}`;
}
