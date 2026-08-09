import { z } from "zod";
import {
  ASSET_CURRENCIES,
  ASSET_TYPES,
  CATEGORIES,
  CREDIT_KINDS,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  UPCOMING_KINDS,
} from "@/lib/types";
import { CRYPTO_COINS } from "@/lib/crypto";
import { isRealBudgetMonth, isRealCalendarDate } from "@/lib/date";
import { parseDecimalInput } from "@/lib/number-input";

const uuidSchema = z.string().uuid("Identifiant invalide.");

/** Refuse les booléens / strings non numériques (évite true → 1). Accepte "12,5". */
const amountPositive = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "string" && value.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    const n = parseDecimalInput(value);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    if (n > 1_000_000_000) {
      ctx.addIssue({ code: "custom", message: "Montant trop élevé." });
      return z.NEVER;
    }
    return n;
  });

const amountNonNegative = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "string" && value.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Valeur invalide." });
      return z.NEVER;
    }
    const n = parseDecimalInput(value);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Valeur invalide." });
      return z.NEVER;
    }
    if (n > 1_000_000_000) {
      ctx.addIssue({ code: "custom", message: "Valeur trop élevée." });
      return z.NEVER;
    }
    return n;
  });

const dateYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
  .refine(isRealCalendarDate, "Date invalide.");

const budgetMonthInput = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Mois concerné invalide.")
  .refine(isRealBudgetMonth, "Mois concerné invalide.");

const descriptionSchema = z
  .string()
  .trim()
  .max(500, "Description trop longue.")
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value;
  });

const cryptoIdSchema = z.enum(
  CRYPTO_COINS.map((coin) => coin.id) as [string, ...string[]]
);

/** Aligné sur numeric(18, 8) Postgres. */
const quantitySchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const n = parseDecimalInput(value);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Quantité invalide." });
      return z.NEVER;
    }
    if (n >= 1e10) {
      ctx.addIssue({ code: "custom", message: "Quantité trop élevée." });
      return z.NEVER;
    }
    return n;
  });

export const createExpenseSchema = z.object({
  amount: amountPositive,
  category: z.enum(CATEGORIES),
  description: descriptionSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  date: dateYmd,
});

export const createIncomeSchema = z.object({
  amount: amountPositive,
  source: z.enum(INCOME_SOURCES),
  description: descriptionSchema,
  date: dateYmd,
  budgetMonth: budgetMonthInput,
});

export const updateIncomeBudgetMonthSchema = z.object({
  id: uuidSchema,
  budgetMonth: budgetMonthInput,
});

export const createAssetSchema = z
  .object({
    name: z.string().trim().max(120).optional().default(""),
    assetType: z.enum(ASSET_TYPES),
    currency: z.enum(ASSET_CURRENCIES),
    valueOriginal: amountNonNegative.optional(),
    quantity: quantitySchema.nullable().optional(),
    coingeckoId: cryptoIdSchema.nullable().optional(),
    notes: descriptionSchema,
  })
  .superRefine((data, ctx) => {
    const isCrypto =
      data.assetType === "Crypto" || data.assetType === "Compte Binance";

    if (isCrypto) {
      if (!data.coingeckoId) {
        ctx.addIssue({
          code: "custom",
          message: "Choisissez une crypto.",
          path: ["coingeckoId"],
        });
      }
      if (data.quantity == null) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez la quantité.",
          path: ["quantity"],
        });
      }
    } else {
      if (!data.name.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez un nom.",
          path: ["name"],
        });
      }
      if (data.valueOriginal == null) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez une valeur.",
          path: ["valueOriginal"],
        });
      }
    }
  });

export const updateAssetValueSchema = z.object({
  id: uuidSchema,
  value: amountNonNegative,
});

export const idSchema = z.object({
  id: uuidSchema,
});

export const createCreditSchema = z.object({
  person: z.string().trim().min(1, "Indiquez qui.").max(120),
  kind: z.enum(CREDIT_KINDS),
  amount: amountPositive,
  currency: z.enum(ASSET_CURRENCIES).default("EUR"),
  notes: descriptionSchema,
});

export const updateCreditAmountSchema = z.object({
  id: uuidSchema,
  amount: amountNonNegative,
});

const optionalDueDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value == null || value === "") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isRealCalendarDate(value)) {
      ctx.addIssue({ code: "custom", message: "Date limite invalide." });
      return z.NEVER;
    }
    return value;
  });

export const createUpcomingSchema = z.object({
  title: z.string().trim().min(1, "Indiquez un libellé.").max(120),
  kind: z.enum(UPCOMING_KINDS),
  amount: amountPositive,
  dueDate: optionalDueDate,
  notes: descriptionSchema,
});

export const completeUpcomingSchema = z.object({
  id: uuidSchema,
  convert: z.boolean(),
  category: z.enum(CATEGORIES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  source: z.enum(INCOME_SOURCES).optional(),
  date: dateYmd.optional(),
  budgetMonth: budgetMonthInput.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type CreateCreditInput = z.infer<typeof createCreditSchema>;
export type CreateUpcomingInput = z.infer<typeof createUpcomingSchema>;
export type CompleteUpcomingInput = z.infer<typeof completeUpcomingSchema>;
