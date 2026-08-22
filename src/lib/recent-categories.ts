import {
  CATEGORIES,
  type Category,
} from "@/lib/types";

const STORAGE_KEY = "pb:recent-categories";
const DEFAULT_RECENTS: Category[] = [
  "Food et courses",
  "Évitable",
  "Achats",
  "Transports",
  "Loisirs",
];

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function readStoredRecentCategories(limit = 5): Category[] {
  if (typeof window === "undefined") return DEFAULT_RECENTS.slice(0, limit);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECENTS.slice(0, limit);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_RECENTS.slice(0, limit);
    const valid = parsed.filter(
      (item): item is Category => typeof item === "string" && isCategory(item)
    );
    return valid.length > 0 ? valid.slice(0, limit) : DEFAULT_RECENTS.slice(0, limit);
  } catch {
    return DEFAULT_RECENTS.slice(0, limit);
  }
}

export function rememberCategory(category: Category, limit = 5): Category[] {
  const next = [
    category,
    ...readStoredRecentCategories(limit).filter((item) => item !== category),
  ].slice(0, limit);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

/** Priorité : catégories du mois (plus récentes d’abord), puis localStorage / défauts. */
export function buildRecentCategories(
  fromExpenses: { category: string }[],
  limit = 5
): Category[] {
  const seen = new Set<Category>();
  const ordered: Category[] = [];

  for (const expense of fromExpenses) {
    if (!isCategory(expense.category)) continue;
    if (seen.has(expense.category)) continue;
    seen.add(expense.category);
    ordered.push(expense.category);
    if (ordered.length >= limit) return ordered;
  }

  for (const item of readStoredRecentCategories(limit)) {
    if (seen.has(item)) continue;
    seen.add(item);
    ordered.push(item);
    if (ordered.length >= limit) break;
  }

  for (const item of DEFAULT_RECENTS) {
    if (ordered.length >= limit) break;
    if (seen.has(item)) continue;
    ordered.push(item);
  }

  return ordered;
}
