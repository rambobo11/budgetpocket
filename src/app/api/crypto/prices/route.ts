import { NextResponse, type NextRequest } from "next/server";
import {
  fetchCoinGeckoPricesEur,
  sanitizeCoinGeckoIds,
} from "@/lib/crypto-prices";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Proxy CoinGecko authentifié + allowlist + rate-limit (OWASP A01/A03/A10).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const limited = rateLimit(`crypto:prices:${user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get("ids")?.trim();

  if (!rawIds) {
    return NextResponse.json(
      { error: "Paramètre ids manquant." },
      { status: 400 }
    );
  }

  const ids = sanitizeCoinGeckoIds(rawIds.split(","));
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Aucun id crypto autorisé." },
      { status: 400 }
    );
  }

  if (ids.length > 40) {
    return NextResponse.json(
      { error: "Trop d’ids demandés." },
      { status: 400 }
    );
  }

  try {
    const fresh = searchParams.get("fresh") === "1";
    const prices = await fetchCoinGeckoPricesEur(ids, { fresh });
    return NextResponse.json(prices, {
      headers: {
        "Cache-Control": fresh
          ? "private, no-store"
          : "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur réseau CoinGecko." },
      { status: 502 }
    );
  }
}
