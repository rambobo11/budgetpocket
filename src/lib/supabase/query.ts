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
