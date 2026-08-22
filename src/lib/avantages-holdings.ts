import "server-only";

/**
 * Primes / avantages CSE — serveur uniquement (pas dans le bundle client).
 */
export const AVANTAGES_HOLDINGS = [
  {
    name: "Chèques vacances ANCV",
    asset_type: "Primes voyage" as const,
    value: 400,
    notes: "Prime voyage · ANCV",
  },
  {
    name: "Prime Noël Swile",
    asset_type: "Avantages" as const,
    value: 25.71,
    notes: "Swile · prime Christmas",
  },
  {
    name: "Prime culture HelloCSE",
    asset_type: "Avantages" as const,
    value: 150,
    notes: "HelloCSE",
  },
] as const;
