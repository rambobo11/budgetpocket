# SQL PocketBudget

| Fichier | Usage |
|---------|--------|
| `schema.sql` | **Référence unique** + install greenfield (toutes les tables + RLS) |
| `credits.sql` | Table crédits / créances (si base déjà existante) |
| `upcoming.sql` | Table À venir (échéances / remboursements) |
| `crypto-trades.sql` | Journal trades crypto (achats / ventes) |
| `subscriptions.sql` | Abonnements récurrents (catalogue + totaux) |
| `add-cash-payment-method.sql` | Ajoute `cash` aux moyens de paiement |
| `add-expense-currency.sql` | Devise EUR / MAD sur les dépenses (saisie DH, stats en €) |
| `add-balances-and-limits.sql` | Solde banque + carte Swile, plafonds par catégorie |
| `add-balance-month.sql` | Solde banque / Swile par mois (saisi au 1er) |
| `add-*.sql` / `incomes.sql` / `assets.sql` | Migrations incrémentales si la base existait déjà |

Ne ré-exécute pas les scripts `add-*` si `schema.sql` consolidé a déjà été appliqué.

Vérifie toujours que **RLS est ON** sur `expenses`, `incomes`, `assets`, `credits`, `upcoming`, `crypto_trades`, `subscriptions`, `user_balances`, `category_limits`.
