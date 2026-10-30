# Déploiement (Dokploy)

Le VPS fait tourner **Dokploy** : Traefik y gère les ports 80/443 et les certificats Let's Encrypt.
7Trip y vit dans son propre projet, séparé des autres sites du serveur.

## Environnements

| | Staging | Production |
|---|---|---|
| Branche | `dev` | `main` |
| Web invité | `staging.7trip.fr` | `7trip.fr` (+ `www`) |
| API | `api.staging.7trip.fr` | `api.7trip.fr` |
| Base | la sienne | la sienne |
| Build de l'app (EAS) | profil `preview` | profil `production` |

Le staging sert à tester l'app et l'API ensemble avant qu'une version n'atteigne les vrais
utilisateurs : une app installée ne se met pas à jour toute seule, une API qui casse la touche
donc tant qu'elle n'est pas mise à jour. Seul le staging existe pour l'instant ; la production,
avec sa propre base et son propre `JWT_SECRET`, se crée à l'identique avant la sortie publique.
Ensuite, chaque merge `dev` → `main` est une mise en production.

## Services (dans chaque environnement)

| Élément | Type Dokploy | Port interne |
|---|---|---|
| Postgres 17 | Database (réseau interne) | 5432 |
| API | Application, Dockerfile `apps/api/Dockerfile`, contexte Docker `.` | 3100 |
| Web invité | Application, Dockerfile `apps/web/Dockerfile`, contexte Docker `.` | 3000 |
| Stockage des documents | Compose RustFS (image `rustfs/rustfs`, volume persistant), réseau interne seulement | 9000 |

Les images se construisent depuis la racine du dépôt : l'API et le web ont besoin des paquets
`packages/*`. Sans contexte `.`, Dokploy prend le dossier du Dockerfile et le build ne trouve pas
`pnpm-lock.yaml`. Les migrations Prisma s'appliquent au démarrage de l'API.

Le stockage n'est jamais exposé : les apps ouvrent les fichiers par un lien signé vers l'API
(`/v1/files`, 4 min), qui les lit dans le bucket. RustFS est gratuit et tient sur le disque du VPS ;
son volume est à inclure dans les sauvegardes du serveur.

Chaque push sur la branche de l'environnement (`dev` pour le staging) redéploie l'API et le web.
Les push arrivent par le webhook de la GitHub App Dokploy, dont l'URL doit être l'adresse publique
`https://vps.jordanolv.dev/api/deploy/github` : le port 3000 du VPS n'est pas joignable depuis
GitHub.

## Variables d'environnement

**API**

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL interne de la base Dokploy |
| `JWT_SECRET` | 32 caractères aléatoires au moins (`openssl rand -base64 48`) |
| `MAIL_TRANSPORT` / `SMTP_URL` / `MAIL_FROM` | `smtp`, l'URL SMTP du fournisseur d'emails, `7Trip <no-reply@7trip.fr>` — obligatoires en production |
| `TRUST_PROXY` | `loopback, uniquelocal` (Traefik et le web passent par le réseau Docker) |
| `STORAGE_DRIVER` | `s3` — obligatoire en production (le disque d'un conteneur ne survit pas à un redéploiement) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | URL **interne** du stockage (RustFS : `http://<service-rustfs>:9000`), région (`auto` par défaut), bucket (créé par l'API au premier démarrage) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Clés d'accès limitées à ce bucket |
| `S3_FORCE_PATH_STYLE` | `true` (par défaut) pour RustFS |

**Web invité**

| Variable | Valeur |
|---|---|
| `NUXT_API_URL` | URL interne de l'API, par ex. `http://<service-api>:3100/v1` |
| `NUXT_PUBLIC_APP_LINK` | `seventrip://` (puis l'URL du web une fois les liens universels actifs) |
| `NUXT_APPLE_APP_ID` | `TEAMID.<bundle id>` — active `/.well-known/apple-app-site-association` |
| `NUXT_ANDROID_PACKAGE` / `NUXT_ANDROID_SHA256` | Paquet et empreinte de signature — activent `assetlinks.json` |

Le web n'est jamais publié directement : il ne fait confiance à `X-Forwarded-For` que lorsque la
requête vient du réseau privé (Traefik).

**App mobile (build EAS)** : `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_INVITE_BASE_URL`, l'API et le
web de l'environnement visé (`https://api.staging.7trip.fr` et `https://staging.7trip.fr` en staging).

## DNS

Enregistrements A vers l'IP du VPS : `staging.7trip.fr` et `api.staging.7trip.fr` (en place), puis
`7trip.fr`, `www.7trip.fr` et `api.7trip.fr` pour la production.
