# Déploiement (Dokploy)

Le VPS fait tourner **Dokploy** : Traefik y gère les ports 80/443 et les certificats Let's Encrypt.
7Trip y vit dans un projet « 7Trip », séparé des autres sites du serveur.

| Élément | Type Dokploy | Domaine | Port interne |
|---|---|---|---|
| Postgres 17 | Database | — (réseau interne) | 5432 |
| API | Application, Dockerfile `apps/api/Dockerfile`, build path `/` | `api.7trip.fr` | 3100 |
| Web invité | Application, Dockerfile `apps/web/Dockerfile`, build path `/` | `7trip.fr` (+ `www`) | 3000 |

Les deux applications se construisent depuis le dépôt GitHub (branche `main` en production).
Les images se construisent depuis la racine du dépôt : l'API et le web ont besoin des paquets
`packages/*`. Les migrations Prisma s'appliquent au démarrage de l'API.

## Variables d'environnement

**API**

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL interne de la base Dokploy |
| `JWT_SECRET` | 32 caractères aléatoires au moins (`openssl rand -base64 48`) |
| `MAIL_TRANSPORT` / `SMTP_URL` / `MAIL_FROM` | `smtp`, l'URL SMTP du fournisseur d'emails, `7Trip <no-reply@7trip.fr>` — obligatoires en production |
| `TRUST_PROXY` | `loopback, uniquelocal` (Traefik et le web passent par le réseau Docker) |

**Web invité**

| Variable | Valeur |
|---|---|
| `NUXT_API_URL` | URL interne de l'API, par ex. `http://<service-api>:3100/v1` |
| `NUXT_PUBLIC_APP_LINK` | `seventrip://` (puis `https://7trip.fr/` une fois les liens universels actifs) |
| `NUXT_APPLE_APP_ID` | `TEAMID.<bundle id>` — active `/.well-known/apple-app-site-association` |
| `NUXT_ANDROID_PACKAGE` / `NUXT_ANDROID_SHA256` | Paquet et empreinte de signature — activent `assetlinks.json` |

Le web n'est jamais publié directement : il ne fait confiance à `X-Forwarded-For` que lorsque la
requête vient du réseau privé (Traefik).

**App mobile (build EAS)** : `EXPO_PUBLIC_API_URL=https://api.7trip.fr`,
`EXPO_PUBLIC_INVITE_BASE_URL=https://7trip.fr`.

## DNS

Enregistrements A vers l'IP du VPS : `7trip.fr`, `www.7trip.fr`, `api.7trip.fr`.
