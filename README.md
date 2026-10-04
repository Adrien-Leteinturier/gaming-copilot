# Gaming Copilot

MVP React + TypeScript + Vite en français : Dashboard, Ma Config, Assistant, Prix.

## Démarrer

Node 22.12+ et pnpm. `pnpm install`, puis `pnpm dev`. Les configurations et seuils sont stockés localement tant que vous n’êtes pas connecté. Aucun exemple de prix ni benchmark fictif. `pnpm build` vérifie le frontend **et** le code serveur. `pnpm test` vérifie les garanties des outils métier.

Le serveur Vite seul ne sert pas les API. Pour tester les fonctions après configuration : `pnpm dev:full` (Vercel CLI et connexion Vercel nécessaires).

## Firebase

Copier `.env.example` en `.env.local`. Choisir un projet Firebase et une base Firestore **Standard** avant tout provisionnement. Renseigner les quatre variables publiques `VITE_FIREBASE_*` depuis la configuration Web officielle. Activer Google Authentication et autoriser localhost et le domaine Vercel. Déployer `firestore.rules` et `firestore.indexes.json` avec `npx -y firebase-tools@latest deploy --only firestore --project VOTRE_ID` après connexion. Aucune base distante n’est créée automatiquement.

Collections : `users/{uid}` (profil), `pcConfigs/{uid}` (configuration), `conversations/{uid}` (50 messages maximum), `priceAlerts/{id}` (seuils avec ownerId), `priceHistory/{id}` (citations marchandes futures, écriture serveur uniquement). Les règles limitent l’accès à l’utilisateur propriétaire. Le serveur conserve son quota dans `users/{uid}/privateUsage/{jour}` inaccessible au client.

Le passage du stockage local à un compte ne transfère pas automatiquement les données locales. Les données de chaque compte sont chargées séparément.

## API et agent

`api/assistant.ts` vérifie le token Firebase, lit la configuration du compte côté serveur, limite à 30 requêtes par utilisateur et par jour et exécute au maximum trois étapes d’agent. La clé OpenAI et les identifiants Firebase Admin restent exclusivement côté serveur. Définir `OPENAI_MODEL` avec un modèle compatible Chat Completions / function calling disponible sur votre compte.

Les six outils sont enregistrés dans `server/tools.ts`. Analyse et compatibilité signalent les informations manquantes. Upgrade et réglages proposent des démarches de vérification, sans performance annoncée. `searchComponentPrices` utilise l’interface injectable `PriceProvider` ; chaque citation exige un marchand, une URL HTTPS, un montant et une date. Aucune intégration marchande réelle n’est activée. `createPriceAlert` prépare un seuil à confirmer dans la page Prix. Aucun email ni tâche planifiée n’est exécuté dans ce MVP.

## Vercel

Importer ce dépôt comme projet Vite. Build : `pnpm build`, sortie : `dist`. `vercel.json` prépare les fonctions sous `/api` et le frontend. Configurer les quatre variables publiques Firebase, puis les variables **serveur uniquement** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Ne jamais préfixer un secret par `VITE_`. Recompiler après une modification des variables publiques. Ajouter le domaine du déploiement dans les domaines autorisés Firebase Auth.

Vérifier `/api/health`, connexion Google, sauvegarde et rechargement de config, question à l’assistant et séparation des données avec deux comptes avant mise en production. Les règles Firebase et les appels cloud doivent être validés avec le projet réel ; les tests locaux ne prouvent pas leur déploiement.

## État des capacités de cette session

Les skills Firebase sont disponibles, mais aucun outil Firebase MCP callable n’a été exposé. Des outils Vercel ont été annoncés initialement, puis n’étaient plus callable lors de la tentative d’accès. Aucun outil GitHub callable n’était exposé lors de la demande de création du dépôt. Le dépôt GitHub public a été créé par son propriétaire : https://github.com/Adrien-Leteinturier/gaming-copilot. Aucun déploiement ni projet cloud provisionné.

Références : [Vercel Functions](https://vercel.com/docs/functions), [Firebase rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [OpenAI Chat API](https://developers.openai.com/api/reference/resources/chat).

## Validation locale

Compilation TypeScript et Vite réussie ; cinq tests métier réussis. Navigation des quatre pages, sauvegarde locale de configuration après rechargement et création/suppression de seuil vérifiées dans le navigateur. Firebase/OpenAI nécessitent les identifiants réels et restent à valider.

