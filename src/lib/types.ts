export const PAYMENT_METHODS = ["cb", "swile"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CATEGORIES = [
  "Food et courses",
  "Achats",
  "Home",
  "Loyer",
  "Transports",
  "Travel",
  "Loisirs",
  "Santé",
  "Factures",
  "Hustle",
  "Investissement",
  "Kheir Lil",
  "Autres",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const INCOME_SOURCES = [
  "Salaire",
  "Swile",
  "Side hustle",
  "CAF",
  "Autres",
] as const;

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
  description: string | null;
  payment_method: PaymentMethod;
  created_at: string;
};

export type Income = {
  id: string;
  user_id: string;
  amount: number;
  source: IncomeSource;
  description: string | null;
  budget_month: string;
  created_at: string;
};

export const ASSET_TYPES = [
  "Crypto",
  "Compte Binance",
  "Primes voyage",
  "Avantages",
  "Actions",
  "Cash",
  "Compte MA",
  "Autres",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_CURRENCIES = ["EUR", "MAD"] as const;

export type AssetCurrency = (typeof ASSET_CURRENCIES)[number];

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  currency: AssetCurrency;
  value_original: number;
  value_eur: number;
  quantity: number | null;
  /** ID CoinGecko pour prix live (ex. solana). Null = valeur manuelle. */
  coingecko_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedExpense = {
  date: string;
  amount: number;
  description: string;
  category: Category;
  payment_method: PaymentMethod;
};

export const CREDIT_KINDS = ["On me doit", "Crédit"] as const;

export type CreditKind = (typeof CREDIT_KINDS)[number];

export const CREDIT_STATUSES = ["open", "repaid"] as const;

export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export type Credit = {
  id: string;
  user_id: string;
  person: string;
  kind: CreditKind;
  amount: number;
  currency: AssetCurrency;
  notes: string | null;
  status: CreditStatus;
  created_at: string;
  updated_at: string;
};

export const UPCOMING_KINDS = ["À payer", "À recevoir"] as const;

export type UpcomingKind = (typeof UPCOMING_KINDS)[number];

export const UPCOMING_STATUSES = ["open", "done"] as const;

export type UpcomingStatus = (typeof UPCOMING_STATUSES)[number];

export type Upcoming = {
  id: string;
  user_id: string;
  title: string;
  kind: UpcomingKind;
  amount: number;
  due_date: string | null;
  notes: string | null;
  status: UpcomingStatus;
  created_at: string;
  updated_at: string;
};
