# PocketBudget

App privée de suivi budget : dépenses, revenus, patrimoine (crypto live), crédits, stats.  
Stack : Next.js, Tailwind, Shadcn UI, Supabase.

## Fonctionnalités

- **Dépenses** — Quick Add CB/Swile, catégories, mois
- **Revenus** — sources + mois concerné
- **Patrimoine** — crypto live, cash, MA, primes CSE à part
- **Crédit** — créances / crédits (EUR & MAD)
- **Stats** — totaux du mois
- Dark mode + mode privacy (masque les montants)

## Setup local

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

### Variables (`.env.local`)

| Variable | Où la trouver |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (`anon` `public`) |
| `OWNER_USER_ID` | Supabase → Authentication → Users → UID |

### Base de données

Dans Supabase → **SQL Editor**, exécute `supabase/schema.sql` (ou les scripts incrémentaux si ta base existe déjà). Voir `supabase/README.md`.

### Utilisateur

Authentication → Users → **Add user** (email / mot de passe). Désactive les inscriptions publiques en prod.

## Déploiement Vercel

1. Importe le repo GitHub sur [vercel.com](https://vercel.com)
2. Ajoute les 3 variables d’environnement (Production)
3. Deploy
4. Supabase → Authentication → URL Configuration :
   - **Site URL** = `https://ton-app.vercel.app`
   - **Redirect URLs** = `https://ton-app.vercel.app/**`

Ne mets **pas** `ALLOW_HISTORICAL_IMPORT` en production.

## Installer sur iPhone (Home Screen)

Après un deploy Vercel :

1. Ouvre l’URL de l’app dans **Safari** (pas Chrome)
2. Tap **Share** (carré + flèche)
3. **Add to Home Screen**
4. Nom : PocketBudget → **Add**

L’icône **PB** s’affiche ; l’app s’ouvre en mode standalone (sans barre d’adresse).

### Raccourcis iOS (optionnel)

App **Shortcuts** → **+** → action **Open URLs** → colle par ex. :

- `https://TON-URL/` — Dépenses
- `https://TON-URL/a-venir` — À venir
- `https://TON-URL/dashboard` — Stats
- `https://TON-URL/patrimoine` — Patrimoine

Puis Share → **Add to Home Screen**.

> Pas de vraie widget live possible en PWA seule : une tuile Shortcuts peut seulement **ouvrir** l’app.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + Shadcn UI + Lucide
- Supabase Auth + Postgres (RLS)
- CoinGecko (prix crypto, proxy authentifié)
- PWA légère (manifest + icônes, pas de service worker offline)
