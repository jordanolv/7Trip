# @7trip/mobile

App iOS / Android de 7Trip — Expo SDK 58, Expo Router. Voir [docs/architecture.md](../../docs/architecture.md)
et les [maquettes](../../docs/maquettes/README.md).

```bash
cp .env.example .env.local   # EXPO_PUBLIC_API_URL (IP locale du PC pour un vrai téléphone)
pnpm --filter @7trip/mobile dev
```

Ajouter une dépendance : `npx expo install <paquet>` depuis ce dossier (versions compatibles avec le SDK).
Les écrans vivent dans `src/app/` (un fichier = une route) ; le reste du code hors de `src/app/`.
