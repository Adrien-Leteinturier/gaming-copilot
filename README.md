# Gaming Copilot

React + TypeScript + Vite, Firebase Authentication/Firestore, déploiement Vercel : https://gaming-copilot.vercel.app.
Dépôt public : https://github.com/Adrien-Leteinturier/gaming-copilot.

## Démarrer

Node 22.12+, pnpm. `pnpm install`, `pnpm dev`. `pnpm build` compile le frontend et vérifie les types serveur ; `pnpm test` vérifie les garanties métier, prix, sécurité des sources, matériel et SEO. Le serveur Vite fournit les routes locales de détection et de comparaison ; Vercel sert les API déployées. `.env.local` est ignoré par Git.

## Assistant gratuit, léger et à la demande

Les questions ne sont plus envoyées à une API IA payante. L’ancienne route `/api/assistant` renvoie 410 même si une ancienne clé existe. Aucun secret ni identifiant Admin n’est dans React.

WebLLM est chargé dynamiquement après clic, puis calcule dans un Web Worker sur le GPU du visiteur. Qwen3-0.6B quantifié est le mode par défaut : 335 Mo de poids, environ 400 Mo avec le tokenizer et le moteur, environ 1,5 Go de mémoire graphique. Qwen2.5-1.5B-Instruct est optionnel : 869 Mo de poids, environ 900 Mo au total et 2 Go de mémoire graphique. Les modèles sont sous licence Apache 2.0. Les estimations mémoire viennent du catalogue WebLLM ; les tailles poids viennent des manifests MLC. Le mode léger est moins compétent : aucune promesse de qualité équivalente à un grand modèle cloud.

Pas de téléchargement au chargement de la page. Progression, arrêt du téléchargement, arrêt de la réponse et libération de la mémoire disponibles. Le navigateur conserve les fichiers dans son cache lorsque possible ; une recharge peut nécessiter le chargement GPU mais pas un nouveau téléchargement complet. Chrome/Edge à jour et WebGPU requis ; les appareils incompatibles obtiennent un message explicite. Pas de contournement des réglages de sécurité du navigateur. Le calcul consomme du GPU et de la batterie : à éviter pendant une partie.

`src/agent/tools.ts` contient les six outils métier partagés ; `src/agent/context.ts` prépare les résultats déterministes d’analyse, compatibilité, upgrade et réglages. Les diagnostics de configuration, les informations manquantes et les checklists de compatibilité/upgrade sont construits directement à partir des outils, sans génération libre. Les explications générales utilisent le modèle. Aucune compatibilité certifiée ni FPS annoncé. Les questions de prix utilisent `/api/prices` et une réponse construite à partir des citations réelles, sans laisser le modèle inventer un prix. `createPriceAlert` prépare un seuil à confirmer dans la page Prix. Aucun appel de fonction arbitraire ni code généré n’est exécuté.

Sans connexion, la configuration et l’historique restent dans le stockage local. Connecté, l’historique et la fiche sont synchronisés dans le compte Firebase ; « calcul local » ne signifie donc pas « historique jamais synchronisé ». Le changement de compte interrompt la génération et évite de publier la réponse dans un autre compte. Les échanges sont limités à 50 messages ; le contexte du petit modèle est borné.

## Comparateur de prix sans clé API

`GET /api/prices?q=REFERENCE&category=cpu|gpu|motherboard|ram|storage|psu` lit les fiches publiques LDLC, Materiel.net, Alternate et Cybertek. Aucune clé marchande n’est nécessaire pour ces sources. Les pages de catalogue et la recherche publique Alternate servent seulement à découvrir les URL ; **chaque prix affiché est relu dans les données structurées Product/Offer de la fiche produit**. Les citations indiquent URL, marchand, vendeur lorsqu’il est fourni, montant EUR positif, état, disponibilité, référence fabricant/EAN et date de lecture. Les prix étrangers, texte libre ambigu, agrégats, fiches invalides ou sources indisponibles ne produisent jamais de prix artificiel.

Couverture **partielle**, jusqu’à trois pages de catégorie et huit fiches par source ; les requêtes et tailles des pages sont bornées. Cache en mémoire de 15 minutes avec déduplication des requêtes. Robots.txt est vérifié avant lecture, agent déclaré GamingCopilot, aucun proxy tournant, CAPTCHA ou protection contourné. Les redirections sont refusées. Les hôtes et chemins produits sont explicitement autorisés pour éviter le SSRF. Les sites peuvent modifier leur HTML ou bloquer le service hébergé : l’interface signale chaque source indisponible. LDLC et Materiel.net appartiennent au même groupe.

Tri par prix du produit hors livraison, pas par coût total. Une variante Tray, Bulk ou boîte peut être différente : vérifier la référence fabricant et la fiche. « Le plus bas » signifie parmi les résultats affichés, pas tout le marché. La recherche ne confond pas 5700X/5700X3D ou 8/16 Go. Une liste vide signifie aucun résultat vérifiable dans les pages consultées.

Amazon, Cdiscount, TopAchat, Fnac, Idealo et Google Shopping sont accessibles via des liens de recherche clairement identifiés comme externes, **sans récupération automatique de leurs prix**. Amazon demande un accès partenaire/Creators API pour une intégration officielle ; les autres sources peuvent nécessiter un flux affilié. Ne pas annoncer ces connecteurs comme actifs. Aucun compte partenaire n’a été créé ni abonnement souscrit.

Les seuils sont enregistrés dans Firebase ou localement et peuvent être comparés à la demande. Aucun cron, mail, notification ou surveillance permanente n’est activé. Le format historique `pending-provider` est conservé pour rester compatible avec les règles existantes ; l’interface explique la vérification manuelle. L’hébergement Vercel/Firebase peut avoir ses propres quotas et coûts : absence de facturation IA ne signifie pas hébergement illimité gratuit.

## Firebase et Vercel

Firebase `gaming-copilot-adrien`, base Firestore Standard `(default)` en `europe-west9` (Paris). Google Sign-in activé, localhost/127.0.0.1 et gaming-copilot.vercel.app autorisés. Collections : users, pcConfigs, conversations, priceAlerts, priceHistory. Les règles Firestore autorisent seulement le propriétaire ; les écritures priceHistory sont réservées au serveur. Aucun historique de prix n’est fabriqué et aucun scan permanent n’écrit dans la base.

Les quatre variables publiques `VITE_FIREBASE_*` sont renseignées sur Vercel. Les trois variables Admin sont réservées au serveur et ne sont jamais importées par le navigateur. Le compte serveur dédié possède datastore.user et firebaseauth.viewer, sans rôle propriétaire. Déployer les règles avec Firebase CLI après authentification. Le dépôt GitHub main est connecté au projet Vercel ; build `pnpm build`, sortie dist, fonctions en `cdg1`.

## Identification Windows

En local, bouton Détecter ce PC via CIM en lecture seule, limité à localhost et au même origin. En ligne, télécharger le collecteur, produire un rapport JSON et l’importer : Vercel ne peut pas scanner le PC du visiteur. CPU, adaptateurs vidéo, carte mère, RAM et disques sont lus sans numéros de série, comptes Windows ou identifiants réseau. L’alimentation reste à renseigner. L’import remplit un brouillon ; la sauvegarde reste une action explicite. Saisie manuelle conservée, références virtuelles/OEM et compatibilité à vérifier.

## SEO

La racine applicative reste noindex. Deux pages publiques rendues en HTML : /decouvrir et /guides/identifier-composants-pc, avec métadonnées, contenu, canonical et sitemap fondés sur l’adresse stable Vercel. SITE_URL est un remplacement facultatif HTTPS sans chemin. Les previews restent non indexables et n’annoncent aucun sitemap. Aucune date lastmod, note, prix ou benchmark fictif dans les données structurées. Les URL inconnues renvoient 404.

## Références

[WebLLM](https://webllm.mlc.ai/docs/), [Qwen léger](https://huggingface.co/Qwen/Qwen3-0.6B), [Qwen optionnel](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct), [Amazon Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction), [Vercel Functions](https://vercel.com/docs/functions), [Firebase Rules](https://firebase.google.com/docs/firestore/security/rules-conditions).

Sur Windows avec Node 24 et des certificats réseau installés dans le système : définir `NODE_OPTIONS=--use-system-ca` avant `pnpm dev` si les requêtes HTTPS marchandes échouent. Ne jamais désactiver TLS.


### Parcours matériel et profil conseillé
Le bouton du dashboard lance la détection directement. En local Windows, le collecteur lit les composants ; sur le site HTTPS, WebGPU peut seulement fournir le GPU de l’adaptateur du navigateur (description parfois masquée). Aucune RAM physique ou référence CPU n’est déduite de navigator. Les champs non observés sont conservés. Les résultats sont enregistrés dans l’espace courant, sans étape « utiliser ces composants ». Import Windows et édition manuelle restent disponibles en complément.
Le dashboard calcule un profil éditorial prudent à partir de familles GPU reconnues : 1080p/60/moyen par défaut, 1440p/60/élevé pour certaines familles supérieures, 1080p/30/bas pour des GPU intégrés explicitement reconnus. Ce ne sont ni des benchmarks ni des FPS prédits. Les GPU inconnus ne sont pas classés et le jeu, l’écran, le CPU et la température doivent être vérifiés. Aucun benchmark n’est lancé automatiquement et aucun modèle IA n’est chargé pour cette détection.

### Lanceur Windows avec retour automatique
`gaming-copilot-detect.cmd` embarque le collecteur audité et est généré à chaque build depuis `detect-hardware.ps1`. Le visiteur doit ouvrir le téléchargement ; le navigateur ne peut pas lancer une commande Windows silencieusement. Aucun administrateur, installation, service permanent, changement de stratégie d’exécution ou contournement SmartScreen. Une politique Windows peut bloquer le lanceur : conserver alors la détection partielle ou l’import manuel.
Le résultat retourne vers l’URL de production fixe dans un fragment base64url, sans API de transfert, serveur local ni token. Le fragment est supprimé avant les effets applicatifs, validé (taille, schéma, plateforme Windows), puis enregistré dans l’espace de la session courante. Le navigateur peut garder l’URL initiale dans son historique interne : ne pas partager le lien du rapport. Le script ne collecte ni identifiants, ni numéros de série. L’alimentation reste indétectable ; les GPU multiples/virtuels sont signalés. Le téléchargement n’est pas signé et peut susciter une confirmation Windows ; ne pas contourner un blocage.

### Assistant après rechargement
Le formulaire permet d’envoyer une question même sans modèle chargé. Les diagnostics déterministes et les prix consultent directement les outils légers. Une question générale reste dans le formulaire et propose « Charger et répondre » avec le volume du modèle ; aucun téléchargement automatique. Après activation explicite, le chargement est suivi de la réponse à la question conservée. Le modèle est toujours libéré au rechargement pour ne pas charger automatiquement le GPU des visiteurs.

### Retour visible à l’envoi
Toute question apparaît immédiatement dans le chat. Si le modèle est nécessaire, son activation explicite est proposée près de la question et sur le bouton du formulaire, avec volume annoncé. Progression et erreurs sont aussi visibles dans la conversation. Le chargement est borné à trois minutes et la génération à 90 secondes, puis le worker est arrêté et la question conservée pour réessayer. Aucun téléchargement automatique.
