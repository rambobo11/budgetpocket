import "server-only";

import type { SeedExpense } from "@/lib/types";

/** Charges fixes mensuelles (loyer, Free, CTLM) pour mai–juillet 2026 */
const FIXED_FOR_MONTHS = ["2026-05-01", "2026-06-01", "2026-07-01"] as const;

const FIXED_CHARGES: Omit<SeedExpense, "date">[] = [
  {
    amount: 617.43,
    description: "Loyer",
    category: "Loyer",
    payment_method: "cb",
  },
  {
    amount: 19.99,
    description: "Free",
    category: "Factures",
    payment_method: "cb",
  },
  {
    amount: 62,
    description: "CTLM",
    category: "Transports",
    payment_method: "cb",
  },
];

const DAILY: SeedExpense[] = [
  // 27/05
  { date: "2026-05-27", amount: 141.9, description: "Prot", category: "Santé", payment_method: "cb" },
  { date: "2026-05-27", amount: 4.7, description: "Beer", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-05-27", amount: 16, description: "Flixbus", category: "Transports", payment_method: "cb" },
  { date: "2026-05-27", amount: 23, description: "Airbnb", category: "Travel", payment_method: "cb" },
  { date: "2026-05-27", amount: 5, description: "Chicken", category: "Food et courses", payment_method: "cb" },
  // 28/05
  { date: "2026-05-28", amount: 2.73, description: "Ftur", category: "Food et courses", payment_method: "swile" },
  { date: "2026-05-28", amount: 4.89, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-05-28", amount: 28.99, description: "Creatine", category: "Santé", payment_method: "cb" },
  { date: "2026-05-28", amount: 76.6, description: "N3na3", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-05-28", amount: 7, description: "Kebab", category: "Food et courses", payment_method: "swile" },
  { date: "2026-05-28", amount: 2, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  // 29/05
  { date: "2026-05-29", amount: 2.8, description: "Livraison Deliveroo", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-29", amount: 21.23, description: "Les courses", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-29", amount: 5, description: "Garo", category: "Kheir Lil", payment_method: "cb" },
  // 30/05
  { date: "2026-05-30", amount: 3.55, description: "Ftur", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-30", amount: 7.44, description: "Groceries", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-30", amount: 7.2, description: "Biere coca", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-05-30", amount: 9, description: "L3cha", category: "Food et courses", payment_method: "cb" },
  // 31/05
  { date: "2026-05-31", amount: 9, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-31", amount: 1.9, description: "Lma", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-31", amount: 2.85, description: "Pizza", category: "Food et courses", payment_method: "cb" },
  { date: "2026-05-31", amount: 4.4, description: "Beer w chips", category: "Kheir Lil", payment_method: "cb" },
  // 01/06
  { date: "2026-06-01", amount: 15, description: "Jap", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-01", amount: 2.9, description: "Eggs", category: "Food et courses", payment_method: "cb" },
  // 02/06
  { date: "2026-06-02", amount: 1.7, description: "Ftur", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-02", amount: 24, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  // 03/06
  { date: "2026-06-03", amount: 7, description: "Pizza", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-03", amount: 6.6, description: "Garo", category: "Kheir Lil", payment_method: "cb" },
  // 04/06
  { date: "2026-06-04", amount: 7, description: "Kebab", category: "Food et courses", payment_method: "cb" },
  // 05/06
  { date: "2026-06-05", amount: 7.9, description: "Pizza", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-05", amount: 6, description: "2 garo", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-06-05", amount: 2.8, description: "Br", category: "Kheir Lil", payment_method: "cb" },
  // 06/06
  { date: "2026-06-06", amount: 50, description: "Les courses", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-06", amount: 233.02, description: "Billet Maroc", category: "Travel", payment_method: "cb" },
  // 07/06
  { date: "2026-06-07", amount: 9, description: "Autres", category: "Autres", payment_method: "cb" },
  // 08/06
  { date: "2026-06-08", amount: 2.5, description: "Beer", category: "Kheir Lil", payment_method: "cb" },
  // 09/06
  { date: "2026-06-09", amount: 1.14, description: "Lma banane", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-09", amount: 12.9, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-09", amount: 7.58, description: "Byd roz", category: "Food et courses", payment_method: "cb" },
  // 10/06
  { date: "2026-06-10", amount: 2.89, description: "Banane eau prot", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-10", amount: 5.9, description: "Sandwich", category: "Food et courses", payment_method: "cb" },
  // 11/06
  { date: "2026-06-11", amount: 1.49, description: "Bananas", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-11", amount: 9.5, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  // 12/06
  { date: "2026-06-12", amount: 1.36, description: "Lma banane", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-12", amount: 10, description: "L9ss", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-12", amount: 2, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  // 13/06
  { date: "2026-06-13", amount: 1.1, description: "Lkhobz", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-13", amount: 5.45, description: "Djaja", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-13", amount: 3.45, description: "Lkhobz", category: "Food et courses", payment_method: "swile" },
  // 14/06
  { date: "2026-06-14", amount: 8, description: "Pizza oeuf", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-14", amount: 9.7, description: "9ssesa", category: "Food et courses", payment_method: "cb" },
  // 15/06
  { date: "2026-06-15", amount: 17, description: "Ghda", category: "Food et courses", payment_method: "cb" },
  // 16/06
  { date: "2026-06-16", amount: 5.12, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-16", amount: 7, description: "Credit Mouad", category: "Autres", payment_method: "cb" },
  { date: "2026-06-16", amount: 14.19, description: "L3cha pizza", category: "Food et courses", payment_method: "cb" },
  // 17/06
  { date: "2026-06-17", amount: 37.98, description: "Free", category: "Factures", payment_method: "cb" },
  { date: "2026-06-17", amount: 150, description: "Jacket cuir et sun glasses", category: "Achats", payment_method: "cb" },
  { date: "2026-06-17", amount: 1.8, description: "Banane lma", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-17", amount: 5.12, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-17", amount: 2.85, description: "Pizza", category: "Food et courses", payment_method: "swile" },
  // 18/06
  { date: "2026-06-18", amount: 0.74, description: "2 banana", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-18", amount: 5.12, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-18", amount: 50, description: "Stronger with you Khalid + acide salicylique Primor", category: "Autres", payment_method: "cb" },
  { date: "2026-06-18", amount: 2.9, description: "Pizza", category: "Food et courses", payment_method: "cb" },
  // 19/06
  { date: "2026-06-19", amount: 7, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-19", amount: 8.2, description: "Skyr thon", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-19", amount: 4.5, description: "Beer OCB", category: "Kheir Lil", payment_method: "cb" },
  // 20/06
  { date: "2026-06-20", amount: 3, description: "X", category: "Autres", payment_method: "cb" },
  { date: "2026-06-20", amount: 4.8, description: "Beer chips", category: "Kheir Lil", payment_method: "cb" },
  // 21/06
  { date: "2026-06-21", amount: 7.5, description: "McDo", category: "Food et courses", payment_method: "cb" },
  // 22/06
  { date: "2026-06-22", amount: 16.5, description: "Courses", category: "Food et courses", payment_method: "cb" },
  // 23/06
  { date: "2026-06-23", amount: 9.03, description: "Polo Vinted", category: "Achats", payment_method: "cb" },
  { date: "2026-06-23", amount: 9.28, description: "Course", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-23", amount: 4.26, description: "Cleaning stuff", category: "Home", payment_method: "cb" },
  // 24/06
  { date: "2026-06-24", amount: 50, description: "Davidoff, gel nettoyant, lotion hydratante, dentifrice", category: "Santé", payment_method: "cb" },
  // 25/06
  { date: "2026-06-25", amount: 21, description: "Privicomoras / Nssaba", category: "Autres", payment_method: "cb" },
  { date: "2026-06-25", amount: 84, description: "2 polos Ralph", category: "Achats", payment_method: "cb" },
  { date: "2026-06-25", amount: 9, description: "Course", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-25", amount: 12.71, description: "Course", category: "Food et courses", payment_method: "cb" },
  // 26/06
  { date: "2026-06-26", amount: 15.4, description: "Atelier Napoli", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-26", amount: 20, description: "L7la9", category: "Santé", payment_method: "cb" },
  { date: "2026-06-26", amount: 30.2, description: "Polo Ralph", category: "Achats", payment_method: "cb" },
  // 27/06
  { date: "2026-06-27", amount: 249.5, description: "Uniqlo", category: "Achats", payment_method: "cb" },
  { date: "2026-06-27", amount: 53.92, description: "Zara", category: "Achats", payment_method: "cb" },
  { date: "2026-06-27", amount: 3.25, description: "Skyr", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-27", amount: 2, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-06-27", amount: 2.55, description: "Lidl", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-27", amount: 3.35, description: "Lidl", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-27", amount: 39.68, description: "Leclerc", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-27", amount: 6.53, description: "Cocci", category: "Food et courses", payment_method: "swile" },
  { date: "2026-06-27", amount: 15.3, description: "Beer", category: "Kheir Lil", payment_method: "cb" },
  // 28/06
  { date: "2026-06-28", amount: 15.84, description: "L9as", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-28", amount: 49.8, description: "Gymshark cadeau Saad", category: "Autres", payment_method: "cb" },
  // 29/06
  { date: "2026-06-29", amount: 13.5, description: "Japonais", category: "Food et courses", payment_method: "swile" },
  // 30/06
  { date: "2026-06-30", amount: 17.27, description: "L9ss", category: "Food et courses", payment_method: "cb" },
  { date: "2026-06-30", amount: 2.5, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  { date: "2026-06-30", amount: 5.94, description: "Skyr", category: "Food et courses", payment_method: "swile" },
  // 01/07
  { date: "2026-07-01", amount: 41.72, description: "Polo Ralph", category: "Achats", payment_method: "cb" },
  { date: "2026-07-01", amount: 36, description: "Terss", category: "Kheir Lil", payment_method: "cb" },
  // 02/07
  { date: "2026-07-02", amount: 6.9, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-02", amount: 4.96, description: "Skyr", category: "Food et courses", payment_method: "cb" },
  // 03/07
  { date: "2026-07-03", amount: 23.06, description: "Courses", category: "Food et courses", payment_method: "swile" },
  // 05/07 (skip 0 eur)
  { date: "2026-07-05", amount: 12.4, description: "Courses", category: "Food et courses", payment_method: "cb" },
  { date: "2026-07-05", amount: 2.5, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  // 06/07
  { date: "2026-07-06", amount: 3.25, description: "Pizza", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-06", amount: 21.82, description: "Cursor", category: "Hustle", payment_method: "cb" },
  // 07/07
  { date: "2026-07-07", amount: 10.3, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-07", amount: 4.95, description: "Skyr", category: "Food et courses", payment_method: "swile" },
  // 08/07
  { date: "2026-07-08", amount: 4.19, description: "Lidl", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-08", amount: 6, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-08", amount: 1.58, description: "Skyr", category: "Food et courses", payment_method: "swile" },
  // 09/07
  { date: "2026-07-09", amount: 2.05, description: "Food", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-09", amount: 1.59, description: "Lidl", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-09", amount: 8.5, description: "Lghda", category: "Food et courses", payment_method: "swile" },
  // 10/07
  { date: "2026-07-10", amount: 8.4, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  { date: "2026-07-10", amount: 1.59, description: "Coca", category: "Food et courses", payment_method: "cb" },
  { date: "2026-07-10", amount: 158.5, description: "Uniqlo", category: "Achats", payment_method: "cb" },
  { date: "2026-07-10", amount: 3.88, description: "Auchan", category: "Food et courses", payment_method: "swile" },
  { date: "2026-07-10", amount: 2.5, description: "OCB", category: "Kheir Lil", payment_method: "cb" },
  // 11/07
  { date: "2026-07-11", amount: 12.9, description: "Lghda", category: "Food et courses", payment_method: "cb" },
  { date: "2026-07-11", amount: 4.09, description: "Deo", category: "Achats", payment_method: "cb" },
  { date: "2026-07-11", amount: 25.99, description: "Chemise", category: "Achats", payment_method: "cb" },
  { date: "2026-07-11", amount: 90.3, description: "Primark", category: "Achats", payment_method: "cb" },
  { date: "2026-07-11", amount: 5.99, description: "Deliveroo", category: "Food et courses", payment_method: "cb" },
  // 12/07
  { date: "2026-07-12", amount: 15, description: "L9ss", category: "Food et courses", payment_method: "cb" },
  // 22/07
  { date: "2026-07-22", amount: 6.5, description: "Lghda", category: "Food et courses", payment_method: "swile" },
];

export const HISTORICAL_EXPENSES: SeedExpense[] = [
  ...FIXED_FOR_MONTHS.flatMap((date) =>
    FIXED_CHARGES.map((charge) => ({ ...charge, date }))
  ),
  ...DAILY,
];
