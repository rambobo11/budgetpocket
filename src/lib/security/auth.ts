import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export class AuthError extends Error {
  constructor(message = "Session expirée. Reconnectez-vous.") {
    super(message);
    this.name = "AuthError";
  }
}

/** Utilisateur authentifié obligatoire (Server Actions / Route Handlers). */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError();
  }

  return user;
}

/**
 * Pages protégées : auth obligatoire + redirect login.
 * Ne pas s’appuyer uniquement sur le proxy (Next 16).
 */
export async function requireUserOrRedirect(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getAuthedClient() {
  const user = await requireUser();
  const supabase = await createClient();
  return { user, supabase };
}

/**
 * Restreint les imports seed (Binance / historique / avantages)
 * au seul OWNER_USER_ID (obligatoire).
 */
export function assertSeedImportAllowed(userId: string): void {
  const ownerId = process.env.OWNER_USER_ID?.trim();
  if (!ownerId) {
    throw new AuthError(
      "Configure OWNER_USER_ID dans .env.local (ton uuid Supabase Auth)."
    );
  }
  if (ownerId !== userId) {
    throw new AuthError("Import non autorisé pour ce compte.");
  }
}
