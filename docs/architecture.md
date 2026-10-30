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
- Stockage de fichiers compatible **S3** (RustFS auto-hébergé ; R2 ou Scaleway possibles), accès
  uniquement par **liens signés courts** vers l'API, délivrés après contrôle des droits.
- Tâches différées (notifications, rappels, nettoyage) : table *outbox* + worker ; pas de Redis
  en V1.

### Web invité — `apps/web`
- **Nuxt 3** (déjà maîtrisé), rendu serveur, très peu de pages : rejoindre un voyage, voter à un
  sondage, pages de repli « ouvrir dans l'app ».
- Héberge aussi les fichiers des liens universels (`apple-app-site-association`, `assetlinks.json`).

### Infrastructure
- **Dokploy** (Traefik, Let's Encrypt) sur le serveur existant, voir [deploiement.md](deploiement.md) :
  `api.7trip.fr`, `7trip.fr` (web), Postgres, RustFS.
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
| `Participant` | tripId, userId?, displayName, avatarColor? (copies du compte, mises à jour avec le profil), role (organizer/participant), status (active/left), guestTokenHash?, notifPrefs (json), joinedAt |
| `Invitation` | tripId, code (court, unique), createdBy, revokedAt?, expiresAt?, usesCount |
| `Idea` | tripId, authorId, title, category?, place?, url?, description?, cost? (texte libre : « Gratuit », « ~25 € / pers. »), status (proposed/kept), version — photo avec les documents (étape 7) |
| `Event` | tripId, ideaId?, title, category, startDate, endDate?, startTime?, endTime?, allDay, place?, url?, description?, bookingRef? |
| `EventParticipant` | eventId, participantId (vide = tout le groupe) |
| `Poll` | tripId, authorId, question, kind (destination/dates/logement/resto/activité/oui-non/autre), multiple, closesAt?, closedAt?, closedBy?, appliedOptionId? |
| `PollOption` | pollId, label, position, startDate?/endDate? (sondage de dates), ideaId? (option tirée d'une idée) |
| `Vote` | optionId, participantId (unique par option) |
| `Expense` | tripId, authorId, payerId, label, amountMinor + currency (tel que payé), rateToBase (figé), baseAmountMinor (en devise du voyage), date, category?, personal, splitMode (equal/custom), eventId? (élément du planning ; le supprimer garde la dépense), version |
| `ExpenseShare` | expenseId, participantId, amountMinor (part réelle, en devise du voyage), originalMinor (la même part, en devise de la dépense) |
| `Settlement` | tripId, fromId, toId, amountMinor, createdById, createdAt |
| `PersonalBudget` | participantId (un par participant, vu de lui seul), currency (celle du voyage à la saisie), totalMinor?, perCategory (json : plafond par catégorie) |
| `Document` | tripId, ownerId, title, kind (file/link), storageKey?, url?, mime?, sizeBytes?, fileName?, category (transport/hébergement/activité/autre), date?, eventId?, visibility (private/shared, privé par défaut), bookingRef?, version |
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
- Chaque dépense stocke son montant et sa devise d'origine, et un `rateToBase` **figé à la saisie**
  (1 unité de la devise = `rateToBase` en devise du voyage). `baseAmountMinor` = arrondi(montant × taux).
  La répartition se fait dans la devise de la dépense (parts égales ou montants tapés). Elle est
  ensuite convertie au plus fort reste (`convertShares`), donc les parts converties font exactement
  `baseAmountMinor`. Soldes, remboursements et budgets n'utilisent que les montants en devise du voyage.
- Montants toujours en centièmes, même pour les devises sans centimes (yen, won…), qui s'affichent
  sans décimales quand il n'y en a pas.
- **Taux du jour** : `GET /trips/{id}/rates/{devise}` renvoie le taux BCE (via Frankfurter, gardé
  1 h en mémoire), ou `null` pour les devises que la BCE ne publie pas (MAD, VND…) : le taux est alors
  tapé. Une modification qui ne touche pas au taux garde celui qui est figé. `RATES_SOURCE=fixed`
  dans les tests.
- **Répartition égale** : la somme est divisée en centimes. Les centimes restants sont attribués
  un par un, dans un ordre déterministe (ordre d'arrivée des participants). La somme des parts
  égale toujours le montant.
- **Solde d'un participant** = Σ avancé − Σ parts réelles + Σ remboursements versés
  − Σ remboursements reçus (rembourser quelqu'un rapproche son propre solde de zéro).
- **Suggestions de remboursement** : le **moins de virements possible**. Les personnes sont
  découpées en un maximum de groupes dont les soldes s'annulent (programmation dynamique sur les
  sous-ensembles, exacte jusqu'à 16 personnes avec un solde). Chaque groupe se règle ensuite en
  glouton (plus gros débiteur → plus gros créancier). Au-delà de 16 : paires exactes, puis glouton.
  Chaque virement va d'un débiteur à un créancier. Recalculées à la demande.
- **« Autre répartition »** : les autres plans de même longueur minimale (`transferPlans`, 8 au
  plus) sont proposés. Le plan choisi est stocké sur le voyage (`Trip.transferPlan`) et affiché
  tant qu'il règle encore tout le monde en ce minimum (`isBestTransferPlan`). Un virement réglé
  en est retiré. Si une dépense change les soldes, on revient à la suggestion.
- **Budget personnel** : Σ des parts du participant par catégorie, hors avances. C'est l'exemple
  du cahier des charges : 120 € partagés à 4 → 30 € dans le budget.
  Dépenses personnelles comprises. Ce qui reste à rembourser ou à recevoir est affiché à part,
  d'après les virements proposés dans Soldes. Un budget saisi avant un changement de devise du
  voyage est à refaire (`staleCurrency`).
- Toute la logique est dans `packages/shared/finance` avec des tests unitaires, dont les cas
  limites : payeur non bénéficiaire, participant exclu, arrondis, multi-devises.

## 7. Liens, partage et web

| Lien | Cible |
|---|---|
| `https://7trip.fr/j/{code}` | rejoindre un voyage |
| `https://7trip.fr/s/{pollId}?j={code}` | ouvrir un sondage ; `j`, ajouté quand celui qui partage peut inviter, fait d'abord rejoindre le voyage |
| `https://7trip.fr/t/{tripId}` | ouvrir un voyage (membres) |

Les liens universels (iOS) et App Links (Android) ouvrent l'app si elle est installée, sinon la
page web. Les droits sont identiques : un sondage partagé ne s'affiche qu'à un membre du voyage,
ou à quelqu'un qui le rejoint via une invitation valide. Sur le web, le lien d'un sondage ne porte
pas de voyage : chaque session invitée du navigateur (un cookie par voyage) est essayée. Le vote
passe par un formulaire HTML classique, qui marche sans JavaScript. Le message de partage est prérempli et
envoyé via le partage natif. Les pages ont des métadonnées Open Graph : titre et image du voyage
ou des options du sondage.

## 8. Hors ligne (V1 : lecture seule)

- Le cache TanStack Query est persisté sur l'appareil (AsyncStorage, 7 jours) : tout écran déjà
  ouvert se relit sans réseau. Il est vidé à la déconnexion, avec les documents enregistrés.
- Le profil est gardé avec le jeton de rafraîchissement : sans réseau, l'app s'ouvre sur le compte
  et le jeton est renouvelé à la première requête en ligne.
- L'état du réseau vient de NetInfo (`onlineManager`) : hors ligne, les lectures attendent le
  réseau et affichent le cache ; toute écriture est refusée tout de suite avec un message.
- Bandeau « Hors ligne · lecture seule · Données du … » au-dessus de la barre d'onglets.
- Les documents marqués « Disponible hors ligne » sont copiés via `expo-file-system`
  (`offline-documents/<voyage>/<document>`) et s'ouvrent depuis la copie (aperçu natif). Une copie
  dont le document n'est plus visible (supprimé, rendu privé, voyage quitté) est effacée à la
  prochaine liste. Les billets liés aux événements des prochaines 48 h sont proposés.
- Conflits (409) sur un événement : fusion à trois versions (`mergeEdits` dans `shared`). Ce qu'un
  seul a changé est gardé ; pour chaque groupe de champs changé des deux côtés, on choisit
  (maquette G-Conflit). Les autres contenus gardent le message « modifié entre-temps ».

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
| Finances | `GET/POST …/expenses`, `GET/PUT/DELETE …/expenses/{xid}`, `GET …/balances`, `POST …/settlements`, `DELETE …/settlements/{sid}`, `GET/PUT …/budget` (le sien uniquement) |
| Documents | `GET/POST …/documents` (multipart : `file` + `meta` JSON), `POST …/documents/links`, `GET/PATCH/DELETE …/documents/{did}`, `GET …/documents/{did}/url` (URL signée 4 min) ; `GET /files` sert les fichiers en stockage local (dev) |
| Notifications | `PUT …/notification-prefs`, `POST /me/push-tokens` |

Le tableau de bord se compose dans l'app à partir des données déjà chargées (planning, soldes,
budget, sondages, documents) : il reste lisible hors ligne et ne demande pas de route à part. Il
change selon le moment (`tripPhase`) : avant le séjour, ce qui vient et ce qui reste à décider ;
pendant, le planning du jour (« Maintenant ») ; après, ce qui reste à rembourser. Un bloc sans
contenu n'est pas affiché.

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
