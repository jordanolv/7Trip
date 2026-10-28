# 7Trip — Architecture technique (V1)

Version de travail · 20 octobre 2026. Complète le [cahier des charges](cahier-des-charges/) et les
[maquettes](maquettes/README.md). Les arbitrages fonctionnels sont dans
[decisions.md](decisions.md), le découpage en étapes dans [roadmap.md](roadmap.md).

## 1. Vue d'ensemble

```
            ┌──────────────────┐      ┌──────────────────┐
            │  apps/mobile     │      │  apps/web        │
            │  Expo (iOS/And.) │      │  web invité      │
            └────────┬─────────┘      └────────┬─────────┘
                     │  HTTPS / JSON (REST)     │
                     ▼                          ▼
            ┌───────────────────────────────────────────┐
            │  apps/api — NestJS                        │
            │  auth · voyages · idées · planning ·      │
            │  sondages · finances · documents · notifs │
            └──────┬──────────────┬──────────────┬──────┘
                   ▼              ▼              ▼
             PostgreSQL     Stockage S3     Expo Push
                            (documents,     (notifications)
                             couvertures)
```

Monorepo **pnpm workspaces + Turborepo** :

| Dossier | Rôle |
|---|---|
| `apps/mobile` | App iOS / Android — Expo SDK, Expo Router, TypeScript |
| `apps/api` | API REST — NestJS, PostgreSQL via Prisma |
| `apps/web` | Web léger — rejoindre un voyage et voter sans app ni compte, pages de repli des liens profonds |
| `packages/shared` | Types et schémas Zod partagés, calculs financiers, matrice de permissions |
| `packages/ui-tokens` | Jetons de design (couleurs, typo, rayons) issus des maquettes |
| `docs/` | Cahier des charges, maquettes, architecture, décisions |

Pourquoi un package partagé : les règles qui doivent donner le même résultat partout (soldes,
arrondis, « qui peut faire quoi ») sont écrites et testées une seule fois.

## 2. Choix techniques

### Mobile — `apps/mobile`
- **Expo** (managed workflow) + **Expo Router** (navigation par fichiers, liens profonds natifs).
- **TanStack Query** pour les données serveur, avec persistance du cache sur l'appareil → base de
  la lecture hors ligne.
- **expo-secure-store** pour les jetons (compte ou session invitée).
- **expo-sqlite** (ou MMKV) pour le cache persistant ; **expo-file-system** pour les documents
  enregistrés hors ligne.
- **expo-apple-authentication** et Google Sign-In ; **expo-notifications** ; partage natif via
  l'API `Share` de React Native.
- Style : jetons de `packages/ui-tokens` ; police Plus Jakarta Sans via `expo-font`.
- Build et publication : **EAS Build / EAS Submit** ; mises à jour JS via EAS Update.

### API — `apps/api`
- **NestJS** (modules par domaine), **Prisma** + **PostgreSQL 16**.
  *Prisma plutôt que TypeORM (utilisé avant le restart)* : schéma déclaratif lisible, migrations
  fiables, types générés réutilisables. Remplaçable si tu préfères rester sur TypeORM.
- Validation des entrées avec les schémas Zod de `packages/shared` (mêmes règles côté app).
- Documentation OpenAPI générée → client typé pour le mobile et le web.
- Stockage de fichiers compatible **S3** (MinIO auto-hébergé ou Scaleway / Cloudflare R2), accès
  uniquement par **URL signées courtes** délivrées après contrôle des droits.
- Tâches différées (notifications, rappels, nettoyage) : table *outbox* + worker ; pas de Redis
  en V1.

### Web invité — `apps/web`
- **Nuxt 3** (déjà maîtrisé), rendu serveur, très peu de pages : rejoindre un voyage, voter à un
  sondage, pages de repli « ouvrir dans l'app ».
- Héberge aussi les fichiers des liens universels (`apple-app-site-association`, `assetlinks.json`).

### Infrastructure
- **Dokploy** (Traefik, Let's Encrypt) sur le serveur existant, voir [deploiement.md](deploiement.md) :
  `api.7trip.fr`, `7trip.fr` (web), Postgres, MinIO.
- CI GitHub Actions : lint, typecheck, tests (shared, API avec base de test), build.
- Environnements : local, staging (`staging.7trip.fr`, branche `dev`), production (`7trip.fr`, branche `main`).

## 3. Identité, sessions et invités

**Comptes** : email + mot de passe (hash Argon2id), Apple, Google. Les jetons Apple / Google sont
vérifiés côté API. Un email vérifié est unique : se connecter avec Google sur un email déjà
inscrit rattache le fournisseur au compte existant au lieu de créer un doublon.

**Jetons** : jeton d'accès court (JWT, ~15 min) + jeton de rafraîchissement opaque, stocké haché
en base, renouvelé à chaque usage (rotation, révocable).

**Invités** : rejoindre par lien crée un `Participant` sans compte (`userId = null`) avec un
pseudo, et une **session invitée** : jeton opaque haché en base, conservé dans le secure store
(mobile) ou un cookie `HttpOnly` (web). La session n'ouvre que **ce** voyage.

**Passage invité → compte** : à la création du compte depuis une session invitée, le participant
est rattaché au nouvel utilisateur. Votes, dépenses et parts pointent vers le participant, pas vers
l'utilisateur : rien n'est perdu ni recopié.

## 4. Modèle de données

Principe : toutes les données d'un voyage pointent vers un **participant**, jamais directement
vers un utilisateur. C'est ce qui permet les invités, le départ d'un participant et le passage
invité → compte.

```
User ─┬─< AuthIdentity (email | apple | google)
      ├─< RefreshToken
      └─< Participant >── Trip ──┬─< Invitation
                                  ├─< Idea ──(0..1)── Event
                                  ├─< Event ─< EventParticipant
                                  ├─< Poll ─< PollOption ─< Vote
                                  ├─< Expense ─< ExpenseShare
                                  ├─< Settlement
                                  ├─< Document ──(0..1)── Event
                                  └─< Notification (outbox)
```

| Table | Champs clés |
|---|---|
| `Trip` | titre, destination?, startDate?, endDate?, kind (solo/group), coverType (pattern/photo), coverUrl?, color, icon, baseCurrency, invitePolicy (all/organizers), createdAt |
| `Participant` | tripId, userId?, displayName, role (organizer/participant), status (active/left), guestTokenHash?, notifPrefs (json), joinedAt |
| `Invitation` | tripId, code (court, unique), createdBy, revokedAt?, expiresAt?, usesCount |
| `Idea` | tripId, authorId, title, category?, place?, url?, description?, cost? (texte libre : « Gratuit », « ~25 € / pers. »), status (proposed/kept), version — photo avec les documents (étape 7) |
| `Event` | tripId, ideaId?, title, category, startDate, endDate?, startTime?, endTime?, allDay, place?, url?, description?, bookingRef? |
| `EventParticipant` | eventId, participantId (vide = tout le groupe) |
| `Poll` | tripId, authorId, question, kind (destination/dates/…/generic), multiple, closesAt?, closedAt?, closedBy?, followUp? |
| `PollOption` | pollId, label, imageUrl?, position |
| `Vote` | optionId, participantId (unique par option) |
| `Expense` | tripId, label, amountMinor, currency, rateToBase, payerId, category?, eventId?, isPersonal, createdBy, date |
| `ExpenseShare` | expenseId, participantId, amountMinor (part réelle, en devise du voyage) |
| `Settlement` | tripId, fromId, toId, amountMinor, settledAt, createdBy |
| `PersonalBudget` | participantId, totalMinor, perCategory (json) |
| `Document` | tripId, ownerId, title, kind (file/link), storageKey?, url?, mime?, size?, category, date?, eventId?, visibility (private/shared) |
| `Notification` | participantId, type, payload, scheduledAt, sentAt? |

Une idée planifiée garde son identité : l'`Event` créé référence l'`Idea` (`ideaId`). Retirer
l'événement du planning le supprime sans toucher l'idée. Le statut « planifiée » affiché dans la
boîte à idées se **déduit** de l'existence d'un événement lié ; il n'est pas stocké.

## 5. Permissions

Vérifiées dans l'API par un guard qui résout le participant courant (compte ou session invitée)
pour le voyage demandé. La matrice est écrite dans `packages/shared` et testée.

| Action | Organisateur | Participant | Invité |
|---|---|---|---|
| Voir le voyage, voter, proposer une idée, ajouter une dépense | ✓ | ✓ | ✓ |
| Modifier / supprimer **ses** idées, événements, dépenses | ✓ | ✓ | ✓ |
| Modifier / supprimer ceux **des autres** | ✓ | — (cf. décisions) | — |
| Ajouter / modifier des éléments du planning | ✓ | ✓ | ✓ |
| Inviter | ✓ | si `invitePolicy = all` | — |
| Révoquer / renouveler le lien, changer les rôles, retirer quelqu'un | ✓ | — | — |
| Modifier l'identité du voyage, clore un sondage, appliquer la suite d'un sondage | ✓ | — | — |
| Supprimer le voyage | ✓ | — | — |
| Quitter le voyage | ✓ (sauf dernier organisateur) | ✓ | ✓ |

Règles transverses :
- il reste toujours au moins un organisateur (vérifié en transaction) ;
- un document `private` n'est visible que de son propriétaire : la liste ne le renvoie pas et
  l'URL signée n'est jamais émise pour un autre participant ;
- un lien d'invitation révoqué ou expiré ne permet plus de rejoindre. Rejoindre donne toujours le
  rôle `participant` : aucune ancienne invitation ne contourne les droits actuels.

## 6. Finances

- Montants en **entiers de centimes** (`amountMinor`), jamais en flottants.
- Chaque dépense stocke sa devise d'origine et un `rateToBase` **figé à la saisie**. Les parts
  (`ExpenseShare`) sont stockées dans la devise de référence du voyage.
- **Répartition égale** : la somme est divisée en centimes. Les centimes restants sont attribués
  un par un, dans un ordre déterministe (ordre d'arrivée des participants). La somme des parts
  égale toujours le montant.
- **Solde d'un participant** = Σ avancé − Σ parts réelles + Σ remboursements versés
  − Σ remboursements reçus (rembourser quelqu'un rapproche son propre solde de zéro).
- **Suggestions de remboursement** : algorithme glouton (plus gros débiteur → plus gros créancier),
  au plus *n − 1* virements. Recalculées à la demande, jamais stockées.
- **Budget personnel** : Σ des parts du participant par catégorie, hors avances. C'est l'exemple
  du cahier des charges : 120 € partagés à 4 → 30 € dans le budget.
- Toute la logique est dans `packages/shared/finance` avec des tests unitaires, dont les cas
  limites : payeur non bénéficiaire, participant exclu, arrondis, multi-devises.

## 7. Liens, partage et web

| Lien | Cible |
|---|---|
| `https://7trip.fr/j/{code}` | rejoindre un voyage |
| `https://7trip.fr/s/{pollId}` | ouvrir un sondage |
| `https://7trip.fr/t/{tripId}` | ouvrir un voyage (membres) |

Les liens universels (iOS) et App Links (Android) ouvrent l'app si elle est installée, sinon la
page web. Les droits sont identiques : un sondage partagé ne s'affiche qu'à un membre du voyage,
ou à quelqu'un qui le rejoint via une invitation valide. Le message de partage est prérempli et
envoyé via le partage natif. Les pages ont des métadonnées Open Graph : titre et image du voyage
ou des options du sondage.

## 8. Hors ligne (V1 : lecture seule)

- Le cache TanStack Query est persisté pour les voyages déjà consultés : tableau de bord, planning,
  idées, finances, participants.
- Les documents marqués « disponible hors ligne » sont téléchargés via `expo-file-system`. Le
  fichier local est supprimé si l'accès est révoqué, constaté à la prochaine synchro.
- L'app affiche un bandeau « Hors ligne · données du … » et désactive les actions d'écriture.
  Aucune édition hors ligne n'est promise en V1.

## 9. Notifications

Les événements métier (nouveau sondage, sondage bientôt clos, changement important du planning,
rappel du jour, remboursement dû, invitation) écrivent dans l'outbox. Un worker applique les
préférences du participant pour ce voyage, regroupe ce qui peut l'être et envoie via **Expo Push**.
Aucune notification n'est envoyée par défaut pour chaque nouvelle dépense ou chaque vote.

## 10. API (aperçu)

REST, préfixe `/v1`, toutes les routes de voyage sous `/v1/trips/{tripId}`.

| Domaine | Routes principales |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/apple`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password` |
| Moi | `GET /me`, `PATCH /me`, `GET /me/trips`, `POST /me/export`, `DELETE /me` |
| Invitations | `GET /invitations/{code}` (aperçu public), `POST /invitations/{code}/join` (compte ou pseudo invité), `POST /trips/{id}/invitations/rotate` |
| Voyages | `POST /trips`, `GET/PATCH/DELETE /trips/{id}`, `GET /trips/{id}/dashboard` |
| Participants | `GET …/participants`, `PATCH …/participants/{pid}` (rôle), `DELETE …/participants/{pid}`, `POST …/leave` |
| Idées | `GET/POST …/ideas`, `GET/PATCH/DELETE …/ideas/{iid}`, `POST …/ideas/{iid}/schedule` |
| Planning | `GET/POST …/events` (filtres date / catégorie), `GET/PATCH/DELETE …/events/{eid}` |
| Sondages | `GET/POST …/polls`, `GET …/polls/{pid}`, `PUT …/polls/{pid}/vote`, `POST …/polls/{pid}/close`, `POST …/polls/{pid}/apply` |
| Finances | `GET/POST …/expenses`, `PATCH/DELETE …/expenses/{xid}`, `GET …/balances`, `POST …/settlements`, `GET/PUT …/budget` |
| Documents | `GET/POST …/documents`, `PATCH/DELETE …/documents/{did}`, `GET …/documents/{did}/url` (URL signée) |
| Notifications | `PUT …/notification-prefs`, `POST /me/push-tokens` |

Le tableau de bord (`/dashboard`) est une route agrégée qui renvoie uniquement les blocs utiles
(sondages à voter, rappels, remboursements, planning du jour), pour éviter les blocs vides.

**Conflits de modification** : chaque ressource modifiable expose un `version` (entier). Un
`PATCH` avec une version périmée renvoie `409` et l'état courant. L'app affiche alors l'écran de
conflit des maquettes.

## 11. Sécurité, RGPD, qualité

- Contrôle d'accès systématique (guard voyage + vérification de propriété). Pas d'identifiants
  séquentiels exposés : UUID v7.
- Limitation de débit sur l'auth, les invitations et le vote invité.
- Documents : type MIME et taille contrôlés (limites dans [decisions.md](decisions.md)),
  stockage privé, URL signées de quelques minutes.
- RGPD : export JSON des données personnelles. Suppression du compte : le participant est
  anonymisé (« Ancien participant ») pour garder des finances cohérentes pour le groupe, et les
  documents privés sont supprimés.
- Tests : unitaires (`shared`), intégration API sur une vraie base Postgres (Testcontainers), et
  quelques parcours E2E mobile (Maestro) reprenant les critères de validation du cahier des
  charges (§15).
- Accessibilité : cibles tactiles ≥ 44 px, libellés sur les boutons-icônes, alternative tactile
  au glisser-déposer (déjà prévue dans les maquettes), contrastes vérifiés.
