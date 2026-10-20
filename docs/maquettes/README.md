# Maquettes 7Trip — V1

Canevas Claude Design (source de vérité, cliquable en mode Play) :
https://claude.ai/artifact/K9S4MQwJASegK4xX1Anu7N — page « Direction v3 ».

Les fichiers de `ecrans/` sont les sources des artboards (format `.dc.html`). Les images y sont
référencées par leurs URL d'asset du canevas (`/_blob/…`) : ils s'ouvrent correctement dans le
canevas, pas directement dans un navigateur. Les mêmes photos sont rangées dans `photos/`.

## Direction visuelle retenue (« G »)

| Jeton | Valeur |
|---|---|
| Police | Plus Jakarta Sans (400 → 800, logo en 800 italique) |
| Fond | `#F7F3EC` (crème) |
| Surface | `#FFFFFF` |
| Texte | `#1B2433` (encre), `#5E6675` (secondaire), `#3A4352` |
| Accent | `#2F7A5D` (vert sapin), teinte `#E3EFE8`, texte sur teinte `#22553F` |
| Chips / séparateurs | `#EDE7DC`, `#F2EDE4`, `#EEE8DD` |
| Alerte douce | `#FBE6D8` / `#8A3D12` (chevauchement, conflit) |
| Info douce | `#FBEBD0` / `#6B3F08` (astuces) |
| Danger | `#A12C1C` |
| Rayons | cartes 18–22 px, boutons 14–16 px, chips 999 px |
| Motif | courbes de niveau discrètes (en-têtes, couverture par défaut), itinéraires en pointillés |

Couleur propre à chaque voyage (tuile d'icône) : orange `#E0703C`, vert `#2F7A5D`, lagon `#1F6F8B`,
framboise `#C2417A`, lavande `#5B4B8A`, moutarde `#B8860B`.

## Écrans

| Domaine | Fichiers |
|---|---|
| Accueil | `G-Voyages`, `G-Visiteur`, `G-Connexion`, `G-Creation`, `G-Personnalisation`, `G-Chargement` |
| Voyage | `G-Dashboard`, `G-Plus`, `G-Parametres`, `G-Participants`, `G-Suppression` |
| Planning | `G-Planning`, `G-Evenement`, `G-AjoutEvenement`, `G-HorsLigne`, `G-Conflit` |
| Idées | `G-Idees`, `G-IdeeDetail`, `G-IdeePlanifier` |
| Sondages | `G-SondageCreation`, `G-SondageVote`, `G-SondagePartage`, `G-SondageResultats` |
| Finances | `G-Finances`, `G-AjoutDepense`, `G-Soldes`, `G-Budget` |
| Documents | `G-Documents` |
| Invités web | `G-InviteRejoindre`, `G-InviteVote` |
| Compte | `G-Profil`, `G-Portfolio` |

Navigation : hors voyage `Voyages | Portfolio | Profil` ; dans un voyage
`Accueil | Planning | Idées | Finances | Plus`.

## Crédits photos (Wikimedia Commons)

À conserver si ces photos sont réutilisées ; à remplacer par des visuels sous licence propre avant
publication sur les stores.

| Fichier | Auteur | Licence |
|---|---|---|
| `seville.jpg` (Plaza de España) | Wzwz | Domaine public |
| `alcazar.jpg` (Real Alcázar) | Ajay Suresh, édité par MenkinAlRire | CC BY 2.0 |
| `annecy.jpg` (Lac d'Annecy) | Carsten Steger | CC BY-SA 4.0 |
| `lisbon.jpg` (Tour de Belém) | Alvesgaspar | CC BY-SA 3.0 |
| `berlin.jpg` (Porte de Brandebourg) | Thomas Wolf, www.foto-tw.de | CC BY-SA 3.0 |
| `split.jpg` (Split) | Tatyana Peshkova | CC BY-SA 4.0 |
| `naxos.jpg` (Naxos) | Manfred Werner (Tsui) | CC BY-SA 4.0 |
| `cefalu.jpg` (Cefalù) | Ludvig14 | CC BY-SA 4.0 |
