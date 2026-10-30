/** Échec PostgREST → exception (plus de tableau vide silencieux). */
export function unwrapList<T>(
  result: { data: T[] | null; error: { message?: string } | null },
  message: string
): T[] {
  if (result.error) {
    throw new Error(message);
  }
  return result.data ?? [];
}

export const QUERY_LOAD_ERROR = "Impossible de charger les données. Réessaie.";

export const BALANCES_SQL_HINT =
  "Table manquante. Exécute supabase/add-balances-and-limits.sql dans Supabase.";

export function isMissingRelationError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}
