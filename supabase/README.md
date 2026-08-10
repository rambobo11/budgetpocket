# SQL PocketBudget

| Fichier | Usage |
|---------|--------|
| `schema.sql` | **Référence unique** + install greenfield (toutes les tables + RLS) |
| `credits.sql` | Table crédits / créances (si base déjà existante) |
| `upcoming.sql` | Table À venir (échéances / remboursements) |
| `crypto-trades.sql` | Journal trades crypto (achats / ventes) |
| `add-*.sql` / `incomes.sql` / `assets.sql` | Migrations incrémentales si la base existait déjà |

Ne ré-exécute pas les scripts `add-*` si `schema.sql` consolidé a déjà été appliqué.

Vérifie toujours que **RLS est ON** sur `expenses`, `incomes`, `assets`, `credits`, `upcoming`, `crypto_trades`.
