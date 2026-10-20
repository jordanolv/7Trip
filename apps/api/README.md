# @7trip/api

API REST de 7Trip — NestJS 12, PostgreSQL, Prisma 7. Voir [docs/architecture.md](../../docs/architecture.md).

```bash
cp .env.example .env        # une fois
pnpm db:up                  # depuis la racine : Postgres en Docker
pnpm --filter @7trip/api db:migrate
pnpm --filter @7trip/api dev
curl localhost:3100/v1/health
```

| Script | Rôle |
|---|---|
| `dev` | serveur en mode watch |
| `db:migrate` | crée / applique les migrations (dev) |
| `db:deploy` | applique les migrations (CI, prod) |
| `db:studio` | interface Prisma Studio |
| `test` / `test:e2e` | tests unitaires / e2e (base requise) |

Le client Prisma est généré dans `src/generated/prisma` (ignoré par git) à l'installation et au build.
