# 7Trip — consignes pour les agents

Application mobile (iOS/Android) pour préparer et suivre ses voyages, seul ou en groupe : planning,
idées, sondages, dépenses partagées et remboursements, documents, notifications. Un site web sert
les invités. Prod : https://7trip.fr (API : https://api.7trip.fr) ; staging : staging.7trip.fr.

## Stack

- Monorepo pnpm 12 + Turborepo, Node 22 (`.nvmrc`), TypeScript ~6.
- `apps/mobile` : Expo SDK 58, Expo Router, React Native.
- `apps/api` : NestJS, Prisma + PostgreSQL 17, tests Vitest, lint oxlint.
- `apps/web` : Nuxt 4 (web invité).
- `packages/shared` (logique partagée : calculs financiers, schémas zod, Vitest) et
  `packages/ui-tokens` (jetons de design issus des maquettes).

## Structure

- `apps/api/src/<module>` : un dossier par domaine (auth, trips, events, expenses, ideas, polls,
  documents, notifications, mail…) ; `apps/api/prisma` : schéma et migrations ; `apps/api/test` : e2e.
- `apps/mobile/src/app` : routes Expo Router (uniquement des écrans) ; le reste (`components`,
  `lib`, un dossier par fonctionnalité) vit hors de `src/app`.
- `apps/web/{app,server}` : pages Nuxt et serveur Nitro.
- `docs/` : cahier des charges, `architecture.md`, `decisions.md` (règles métier arbitrées),
  `roadmap.md`, `deploiement.md`, `maquettes/`. À lire avant de toucher au métier.
- `apps/mobile/AGENTS.md` : consignes spécifiques Expo (à lire pour tout travail mobile).

## Conventions

- Interface et textes affichés à l'utilisateur en **français**. Commits et PR : conventional
  commits (`feat(scope):`, `fix(scope):`, `docs:`, `test(api):`, `chore:`), scope = module.
- Logique métier partagée (montants en centimes, répartitions, soldes) dans `packages/shared`,
  pas dupliquée dans l'app ou l'API. Respecter les règles de `docs/decisions.md`.
- Un module Nest par domaine ; la validation passe par les schémas zod de `packages/shared`.
- Mobile : ajouter une dépendance avec `npx expo install <paquet>`, jamais `pnpm add` seul.
  Ne pas créer `ios/` ni `android/` (générés, config dans `app.json`).
- Pas de refacto hors périmètre ; un changement de schéma Prisma = une migration.

## Commandes

```bash
pnpm install --frozen-lockfile      # installation (racine du dépôt)
pnpm dev                            # API + app Expo + watch des packages (Postgres requis)
pnpm db:up                          # Postgres en Docker (docker compose)
cp apps/api/.env.example apps/api/.env && pnpm db:migrate
```

Vérification obligatoire avant PR (toutes exécutées avec succès, sans base de données) :

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- Le lint mobile affiche 1 warning existant, sans erreur. `pnpm test` couvre `packages/shared`
  et les tests unitaires de l'API ; il ne demande pas de base.
- `pnpm test:e2e` (API) exige PostgreSQL et `DATABASE_URL` ; la CI le lance après
  `pnpm --filter @7trip/api db:deploy`. Sans base disponible, ne le lance pas et dis-le dans la PR.
  Ne crée pas de base locale persistante sans accord.
- Lancer les vérifications lourdes une par une (VPS partagé), après avoir contrôlé `free -m`.

## Git et déploiement

- Branche de base : **`dev`** ; PR vers `dev`. `main` = production, alimentée par merge `dev` → `main`.
- Tout push/merge sur `dev` redéploie le **staging** (API + web) via Dokploy ; tout merge sur `main`
  déploie en **prod**. Les migrations Prisma s'appliquent au démarrage de l'API. Ne jamais
  déclencher de déploiement à la main (voir `docs/deploiement.md`).
- La CI (`.github/workflows/ci.yml`) lance lint, typecheck, test, build, puis les e2e avec Postgres.
- Ne pas commiter : `.env`, `node_modules/`, `dist/`, `.turbo/`, `.output/`, `.storage/`,
  `*.tsbuildinfo`, `coverage/`.

## Pièges connus

- `apps/api/.env` requis en local : `DATABASE_URL`, `PORT`, `JWT_SECRET`, `MAIL_TRANSPORT`
  (`log` affiche les e-mails dans la console ; sinon `SMTP_URL`, `MAIL_FROM`). Valeurs : voir
  `.env.example`, jamais de secrets dans le dépôt.
- `pnpm install` lance `prisma generate` (postinstall de l'API) ; `nodeLinker: hoisted` est voulu
  (Metro). Les versions Expo récentes sont épinglées dans `pnpm-workspace.yaml`.
- Les paquets `packages/*` se compilent avant leurs consommateurs (`turbo` `dependsOn ^build`).
- Services externes : Expo Push (notifications), Frankfurter (taux de change), stockage S3
  (RustFS) pour les documents. Les builds stores passent par EAS.
- Le web invité Nuxt tourne sur le port 3200 en dev, l'API sur 3100.
