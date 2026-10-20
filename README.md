# 7Trip

« Tout ton voyage, au même endroit. » Application mobile pour préparer, organiser et suivre ses
voyages, en solo ou en groupe.

## Documentation

- [Cahier des charges fonctionnel v1.0](docs/cahier-des-charges/7Trip_Cahier_des_charges_fonctionnel_v1.0.pdf)
- [Maquettes V1](docs/maquettes/README.md) · [canevas interactif](https://claude.ai/artifact/K9S4MQwJASegK4xX1Anu7N)
- [Architecture technique](docs/architecture.md)
- [Points arbitrés](docs/decisions.md)
- [Découpage de la V1](docs/roadmap.md)

## Stack

Monorepo pnpm + Turborepo :

| Dossier | Contenu |
|---|---|
| `apps/mobile` | App iOS / Android — Expo SDK 57, Expo Router |
| `apps/api` | API REST — NestJS 12, PostgreSQL, Prisma 7 |
| `apps/web` | Web invité — Nuxt (à venir, étape 3) |
| `packages/shared` | Logique partagée (calculs financiers…) |
| `packages/ui-tokens` | Jetons de design issus des maquettes |

## Démarrer

Prérequis : Node 22, Docker, pnpm via corepack (`corepack enable pnpm`).

```bash
pnpm install
pnpm db:up                                   # Postgres en Docker
cp apps/api/.env.example apps/api/.env
pnpm db:migrate
pnpm dev                                     # API + app Expo + watch des packages
```

| Commande | Rôle |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | vérifications (lancées aussi par la CI) |
| `pnpm test:e2e` | tests e2e de l'API (base requise) |
| `pnpm build` | build de l'API et des packages |
