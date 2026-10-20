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

Monorepo pnpm + Turborepo : `apps/mobile` (Expo), `apps/api` (NestJS + PostgreSQL),
`apps/web` (web invité, Nuxt), `packages/shared`.
