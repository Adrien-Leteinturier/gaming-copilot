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


## Détection de matériel Windows

En développement local (pnpm dev), la page Ma Config peut lire les composants de ce PC depuis Windows CIM. La lecture est déclenchée par le bouton Détecter ce PC ; aucun scan ne part au chargement. Le collecteur lit uniquement CPU, noms des adaptateurs vidéo, fabricant/référence de carte mère, capacité/génération de RAM et modèles/capacités des disques. Aucun numéro de série, compte Windows ni identifiant réseau collecté. Les requêtes sont limitées à localhost/127.0.0.1 et au même origin ; aucune entrée du navigateur ne devient une commande.

La détection complète ne fonctionne pas dans le navigateur hébergé seul : Vercel est un autre ordinateur et ne doit jamais être scanné comme le PC utilisateur. Dans la version hébergée, télécharger public/detect-hardware.ps1, générer un rapport JSON puis l’importer dans Ma Config. Windows peut appliquer sa politique d’exécution : le produit ne la modifie pas. La saisie manuelle reste disponible.

Le résultat est affiché pour vérification. Utiliser ces composants remplit seulement la fiche en cours ; Enregistrer mon setup confirme la persistance locale ou Firebase. Les champs non remontés et les objectifs sont conservés. Les adaptateurs et disques multiples sont listés, sans choisir arbitrairement la carte de jeu. Les références OEM ou virtuelles nécessitent vérification. Le modèle et la puissance de l’alimentation ne sont pas déduits.

Le scanner local fait partie du serveur de développement, pas des fonctions Vercel. Un futur compagnon desktop pourra offrir la détection directe sur la version hébergée ; ce MVP fournit l’import de rapport réel.

Références : [classes matérielles Windows CIM](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/computer-system-hardware-classes), [adaptateurs vidéo](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-videocontroller), [mémoire physique](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-physicalmemory).

Validation de cette évolution : neuf tests réussis, compilation TypeScript/Vite réussie, lecture réelle Windows de cinq catégories, remplissage du brouillon, export JSON valide et affichage mobile vérifiés. Les requêtes sans origine ou depuis une autre origine sont refusées (403), les lectures GET sont refusées (405).


## SEO et sitemap

L’espace applicatif à la racine reste en noindex (meta + en-tête HTTP Vercel). Les données personnelles sont protégées par Firebase Auth et les règles Firestore : robots.txt et noindex ne sont pas des mécanismes de sécurité.

Deux pages publiques sont générées en HTML complet sans JavaScript : /decouvrir et /guides/identifier-composants-pc. Elles ont un titre et une description uniques, un H1, une navigation HTML, les métadonnées Open Graph/Twitter, une image de partage et des données structurées WebSite/BreadcrumbList lorsqu’une adresse de production est disponible. Pas de faux avis, tarifs ou résultats enrichis promis.

Sans domaine personnalisé, le build utilise automatiquement VERCEL_PROJECT_PRODUCTION_URL (adresse stable *.vercel.app). Activer les variables système Vercel si nécessaire. SITE_URL est un remplacement facultatif pour un futur domaine HTTPS, sans chemin. VERCEL_URL et les adresses de branche ne sont jamais utilisés comme adresse canonique. Le build produit sitemap.xml avec les seules pages publiques et robots.txt avec la déclaration du sitemap. Aucun lastmod de compilation arbitraire, aucune URL personnelle. En preview, en développement ou sans adresse de production, les pages restent noindex, robots.txt refuse le crawl et aucun sitemap public n’est publié. Un build avec une URL invalide échoue.

Le sitemap et les pages sont générés par scripts/generate-seo.mjs avant le build. La liste des routes et le contenu sont dans scripts/seo.mjs. Les réécritures Vercel ciblent seulement les pages publiques : les URL inconnues ne renvoient plus artificiellement l’application avec un statut 200.

Avant lancement : vérifier le domaine canonique et ses redirections HTTPS/www, ouvrir sitemap.xml et robots.txt en production, inspecter les URL publiques et envoyer le sitemap dans Google Search Console. Valider les données structurées et mesurer les Core Web Vitals sur le site déployé. Aucune vérification Search Console ni score de performance réel n’est revendiqué avant déploiement. Ajouter ensuite de nouveaux guides utiles au manifeste des pages publiques.

Références : [variables système Vercel](https://vercel.com/docs/environment-variables/system-environment-variables), [Google : créer un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [directives robots](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [SEO et JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

Validation SEO : compilation réussie, 13 tests réussis (dont sitemap, previews et domaine stable Vercel), pages publiques et retour à l’application vérifiés dans le navigateur. Le sitemap est absent en local tant qu’aucune adresse de production n’est définie.
