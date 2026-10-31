# 7Trip — Points arbitrés

Réponses proposées aux points de la section 14 du cahier des charges, à partir des maquettes.
Statut : **validé le 20 octobre 2026**. Chaque ligne peut encore évoluer sans remettre en cause l’architecture.

## Finances

| Question | Proposition |
|---|---|
| Devise de référence | Une par voyage, choisie à la création (EUR par défaut ; pas encore de devise dans le profil). Les organisateurs peuvent la changer tant qu'aucune dépense ni aucun remboursement n'existe. |
| Source des taux | Taux BCE du jour (via Frankfurter, sans clé), proposé à la saisie et **figé** dans la dépense. Il reste modifiable à la main (taux réel de la carte). Pour les devises que la BCE ne publie pas (MAD, VND…), le taux est tapé. |
| Budget personnel | Facultatif : un total, un plafond par catégorie, ou les deux, en devise du voyage. Seul son propriétaire le voit (pas les organisateurs). Il ne bloque pas le changement de devise du voyage : s'il a été saisi dans l'ancienne devise, l'app demande de le refaire. |
| Dépense liée au planning | Facultatif, un seul élément par dépense. Supprimer l'élément garde la dépense, sans lien. Depuis la fiche d'un élément, « Ajouter une dépense » la crée déjà liée, à sa date et dans la catégorie correspondante. |
| Arrondis | Calculs en centimes. Les centimes restants d'une répartition égale vont un par un aux premiers participants (ordre d'arrivée). Affichage à 2 décimales. |
| Répartition inégale | V1 : parts égales avec exclusions, ou montants personnalisés par personne. Pourcentages / « parts » (×2) reportés en V1.5. |
| Participant qui part | Ses dépenses et parts restent. Il apparaît « parti » et peut encore régler ses soldes. Il ne peut pas partir avec un solde non nul sans avertissement. |
| Participant ajouté en cours de route | Il n'est pas ajouté aux dépenses passées. Les nouvelles dépenses partagées l'incluent par défaut. |
| Dépense personnelle | Toujours payée par son auteur, qui seul la voit et la modifie. Elle compte dans son coût réel (et son budget), jamais dans les soldes. Seul l'auteur peut rendre une dépense personnelle ou partagée. |
| « C'est réglé » | Enregistre un remboursement du montant suggéré. Les deux personnes concernées ou un organisateur peuvent le marquer, et l'annuler en cas d'erreur. Les suggestions sont recalculées ensuite. |
| « Autre répartition » | Hors maquette, ajouté en V1. Tout membre du voyage peut faire défiler les autres plans qui ont aussi le moins de virements possible. Le choix vaut pour tout le groupe. On revient à la suggestion dès que les soldes changent autrement qu'en réglant un virement du plan. |
| Quitter avec un solde | L'app affiche le montant dû (ou à recevoir) dans la confirmation ; partir reste possible. |

## Permissions fines

| Question | Proposition |
|---|---|
| Modifier / supprimer l'élément d'un autre | Organisateurs : oui. Participants : seulement leurs propres éléments. Exception : tout participant concerné par une dépense peut la corriger s'il en est le payeur. |
| Événements du planning | Tout participant peut en ajouter. Il ne peut modifier que les siens, ou ceux dont il est participant. |
| Événement « tout le groupe » | Sans participants précisés, tout le monde en fait partie : tout participant peut donc le modifier. |
| Après le départ d'un participant | Son contenu reste, attribué à « Prénom (parti) ». |
| Voir les dépenses personnelles des autres | Non : une dépense marquée « Personnelle » n'est visible que de son auteur. |

## Planning

| Question | Proposition |
|---|---|
| Chevauchements | Signalés, jamais bloqués : deux événements horaires du même jour qui partagent au moins une personne. Les événements sans horaire ou sur plusieurs jours (hôtel) ne comptent pas, sinon ils chevaucheraient tout. |
| Événement sans heure de fin | Compte pour une heure dans la détection des chevauchements. |
| Idée planifiée | L'événement reprend titre, lieu, lien et description de l'idée, puis vit sa vie. Le retirer du planning laisse l'idée intacte ; supprimer l'idée laisse l'événement, sans lien. |
| Dates d'un événement | Quand le voyage a des dates, un événement doit tenir dedans (refusé sinon). Sans dates, n'importe quel jour. Si les dates du voyage changent ensuite, les événements restés en dehors sont gardés et signalés ; on peut encore les modifier sans les déplacer. |
| Jours affichés | Tous les jours du voyage, plus ceux qui portent encore un événement hors des dates. |

## Sondages

| Question | Proposition |
|---|---|
| Confidentialité des votes | Votes nominatifs (on voit qui a voté quoi). C'est le cas courant entre amis. Option « anonyme » reportée. |
| Résultats avant clôture | Visibles après avoir voté (comme dans les maquettes). |
| Clôture | Manuelle par un organisateur, ou automatique à l'échéance si elle est définie. |
| Égalité | Aucune décision automatique : l'organisateur choisit, ou relance un sondage entre les ex æquo. |
| Modifier les options après des votes | Ajout possible. Suppression d'une option : demande confirmation et efface les votes sur cette option. Pas encore dans l'app : un sondage se supprime et se recrée. |
| Participation | « 4 sur 7 ont voté » compte les participants actifs ; qui a voté est toujours visible, pas ce qu'il a voté. Les votes de quelqu'un qui part restent dans les résultats. |
| Suite d'un sondage clos | Proposée à l'organisateur, jamais appliquée seule : destination (remplace la liste), dates du voyage, idée « retenue » (puis « Ajouter au planning »). Sur une égalité, chaque ex æquo est proposé. « Plus tard » laisse la carte pour la prochaine visite. |
| Lien partagé | `7trip.fr/s/{pollId}`, plus `?j={code}` quand celui qui partage peut inviter : un non-membre rejoint le voyage puis arrive sur le sondage. Sans code, le lien ne s'ouvre que pour les membres. |

## Documents

| Question | Proposition |
|---|---|
| Types acceptés | PDF, JPEG, PNG, HEIC (converti), liens. |
| Taille | 20 Mo par fichier. Quota de 500 Mo par voyage en V1. |
| Hors ligne | Enregistrement manuel par document (« Disponible hors ligne »). Les billets liés aux événements des prochaines 48 h sont proposés automatiquement. |
| Après révocation d'accès | La copie locale est supprimée à la prochaine synchro. L'URL signée expire en moins de 5 min. |
| Droits | Seul le propriétaire modifie un document (nom, visibilité, lien…). Un organisateur peut aussi supprimer un document partagé (modération), jamais en voir un privé. Un document privé d'un autre est répondu « introuvable », comme s'il n'existait pas. |
| Contrôle des fichiers | Le type est lu dans les premiers octets (PDF, JPEG, PNG), pas dans le nom ni l'en-tête envoyé. Les photos HEIC sont converties en JPEG par l'app avant l'envoi. |
| Date | Un document lié à un événement sans date propre prend celle de l'événement. Sans l'une ni l'autre, il est dans « Sans date ». |
| Stockage | RustFS (compatible S3, gratuit) sur le VPS en staging et en production, joignable par l'API seule ; un dossier local en dev et en test. MinIO ne publie plus d'images Docker. Les fichiers passent par l'API (lien signé 4 min). Les fichiers d'un voyage supprimé sont effacés avec lui. |

## Invitations

| Question | Proposition |
|---|---|
| Expiration | Aucune par défaut. Révocable et renouvelable à tout moment (maquette Participants). |
| Usage multiple | Oui, un seul lien de groupe par voyage. |
| Admission | Automatique en V1. Validation manuelle par un organisateur reportée (réglage futur). |

## Portfolio

| Question | Proposition |
|---|---|
| Visite effective | Un voyage est « visité » quand sa date de fin est passée et que le participant ne l'a pas quitté avant le départ. Destinations et étapes : celles des événements datés passés, pas les idées ni les options de sondage. |
| Photos de groupe | Hors V1. En V1.5 : une photo n'apparaît dans un portfolio que si celui qui l'a ajoutée l'a autorisé. |

## Notifications (réglages par défaut)

| Événement | Par défaut |
|---|---|
| Nouveau sondage ; rappel 24 h avant clôture à ceux qui n'ont pas voté | ✓ |
| Changement de planning (créé / modifié / supprimé sur un événement où je suis) : jours, heures, lieu, titre ou participants ; plusieurs modifications dans la minute ne font qu'une notification | ✓ |
| Rappel du jour pendant le séjour (8 h sur l'heure du téléphone, jusqu'à midi), seulement s'il y a quelque chose au programme | ✓ |
| Remboursement reçu ou confirmé ; ce qu'il reste à rembourser, une fois, le lendemain de la fin du voyage | ✓ |
| Chaque nouvelle dépense (à ceux qui y ont une part) | ✗ |
| Chaque vote | jamais |

Jamais à l'auteur du changement ; uniquement aux participants avec un compte (un invité n'a pas
de téléphone enregistré). Pas de notification d'invitation : on rejoint par un lien, il n'y a
personne à prévenir avant qu'il ait rejoint. Les préférences se règlent par voyage, dans ses
Paramètres.

## Web invité — périmètre minimal V1

Rejoindre un voyage avec un pseudo, voir le résumé du voyage (titre, dates, participants), voter
aux sondages ouverts, et ouvrir l'app ou la télécharger. Pas de planning, de finances ni de
documents sur le web en V1.

## Invités — sessions et passage au compte

- Rejoindre sans compte crée un participant sans utilisateur et un **jeton de session invitée**
  (aléatoire, stocké haché). L'app l'envoie dans l'en-tête `x-7trip-guest` ; il n'ouvre que ce
  voyage. Quitter le voyage ou en être retiré met fin à la session.
- Un invité ne gère rien : ni invitation (même si « tout le monde peut inviter »), ni rôles, ni
  modification du voyage. Il ne peut pas être nommé organisateur sans créer de compte.
- À la connexion (inscription ou compte existant), l'app envoie ses jetons invités :
  le participant invité est **rattaché au compte**, même ligne, donc tout ce qu'il possède reste.
- Si le compte était déjà dans le voyage, la participation invitée est fermée et fusionnée dans
  celle du compte. Chaque étape qui ajoute du contenu lié aux participants (votes, idées,
  dépenses…) complète `GuestSessionsService.merge` pour le déplacer.

## Profil et avatars

- Les avatars montrent les initiales sur une couleur. Dans le profil, chacun choisit sa couleur
  (8 teintes) et son prénom affiché. Sans choix, la couleur est tirée de l'identifiant du compte,
  ou de celui de la participation pour un invité : toujours la même pour une personne.
- Chaque voyage garde une copie du nom et de la couleur ; modifier son profil les met à jour dans
  tous ses voyages, y compris sur ce qu'on y a déjà ajouté.
- La photo de profil arrive avec l'upload de fichiers (étape 7). Elle remplace alors les initiales.
- Qui a voté pour une option s'affiche en avatars ; la liste « En attente » garde les prénoms,
  pour savoir qui relancer.
