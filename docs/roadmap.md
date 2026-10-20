# 7Trip — Découpage de la V1

Chaque étape se termine par quelque chose d'utilisable et de testé. Les écrans cités sont ceux des
[maquettes](maquettes/README.md). Pas de dates : l'ordre compte, pas le calendrier.

| # | Étape | Contenu | Terminé quand… |
|---|---|---|---|
| 0 | **Socle** | Monorepo pnpm + Turborepo, `packages/shared`, `packages/ui-tokens`, API NestJS + Prisma + Postgres en Docker, app Expo vide avec Expo Router et police, CI (lint, types, tests). | `pnpm dev` lance API + app ; la CI est verte. |
| 1 | **Comptes** | Inscription / connexion email, vérification email, mot de passe oublié, Apple, Google, jetons + rotation, profil minimal. Écrans : Visiteur, Connexion, Profil. | On s'inscrit, se déconnecte, se reconnecte sur iOS et Android, sans doublon de compte. |
| 2 | **Voyages & participants** | Création (titre seul), personnalisation, liste « Mes voyages » (à venir / en cours / terminés), tableau de bord minimal, menu Plus, paramètres, invitations par lien, rôles, quitter, suppression confirmée. Écrans : Voyages, Création, Personnalisation, Dashboard, Plus, Participants, Paramètres, Suppression. | Critère CDC : un voyage sans date ni destination est créé et partagé. |
| 3 | **Invités** | Session invitée (mobile + web), `apps/web` : rejoindre, liens universels / App Links, passage invité → compte sans perte. Écran : InviteRejoindre. | Critère CDC : un invité rejoint sans inscription ; ses actions restent quand il crée un compte. |
| 4 | **Idées & planning** | Boîte à idées (liste, filtres, fiche), planning chronologique, événements (dates / heures facultatives, plages, participants), chevauchements signalés, idée → planning → retrait. Écrans : Idées, IdeeDetail, IdeePlanifier, Planning, Evenement, AjoutEvenement. | Critères CDC : une idée est planifiée, déplanifiée puis replanifiée sans perte ; deux activités qui se chevauchent sont acceptées, avec avertissement. |
| 5 | **Sondages & partage** | Création, choix unique ou multiple, échéance, vote modifiable, clôture, action de suivi confirmée, partage natif + lien profond, vote invité sur le web. Écrans : Sondage*, InviteVote. | Critère CDC : un sondage à choix multiple fonctionne et son lien respecte les droits. |
| 6 | **Finances** | Ajout rapide, personnelle / partagée, exclusions et parts personnalisées, multi-devises à taux figé, soldes, suggestions de remboursement, « c'est réglé », budget personnel. Écrans : Finances, AjoutDepense, Soldes, Budget. | Critère CDC : coût personnel, avance et remboursement sont distincts, y compris quand le payeur n'est pas bénéficiaire. |
| 7 | **Documents & hors ligne** | Upload S3, privé / partagé, lien à un événement, section « sans date », téléchargement hors ligne, cache persistant, bandeau hors ligne, conflits de modification (409). Écrans : Documents, HorsLigne, Conflit. | Critère CDC : un document privé est invisible aux autres ; un document enregistré reste lisible sans réseau. |
| 8 | **Notifications & tableau de bord** | Outbox + worker, Expo Push, préférences par voyage, rappels, tableau de bord contextuel complet (avant / pendant / après le séjour). | Critère CDC : le tableau de bord montre les actions utiles au bon moment, sans blocs vides. |
| 9 | **Portfolio (minimal) & finitions** | Portfolio des voyages terminés (sans souvenirs auto), export / suppression RGPD, états de chargement / erreur partout, passe d'accessibilité. Écrans : Portfolio, Chargement. | Tous les critères du §15 sont couverts par des tests. |
| 10 | **Bêta & stores** | TestFlight / test interne Play, retours, icône et captures, fiches stores, politique de confidentialité, mise en production. | App publiée. |

Les étapes 4 à 7 sont assez indépendantes une fois l'étape 3 terminée : leur ordre peut changer
selon les priorités.
