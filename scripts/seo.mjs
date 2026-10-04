export function resolveSiteUrl(env) {
  return (
    env.SITE_URL?.trim() ||
    (env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
      ? "https://" + env.VERCEL_PROJECT_PRODUCTION_URL.trim()
      : "")
  );
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export function publicOrigin(value) {
  if (!value?.trim()) return null;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.port ||
    !url.hostname.includes(".") ||
    /(^|\.)(localhost|local|test|invalid|example)$/.test(url.hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)
  )
    throw new Error(
      "SITE_URL doit être un domaine public HTTPS, sans chemin ni paramètres.",
    );
  return url.origin;
}

export const pages = [
  {
    path: "/decouvrir",
    title: "Gaming Copilot : détecter et comprendre les composants de son PC",
    description:
      "Identifiez les composants de votre PC Windows, vérifiez votre configuration et préparez vos upgrades avec Gaming Copilot. Saisie manuelle également disponible.",
    eyebrow: "GAMING COPILOT / INVENTAIRE PC",
    heading: "Savoir ce qu’il y a dans votre PC. Puis décider quoi changer.",
    body: `<p class="lead">Gaming Copilot rassemble votre fiche matériel, vos objectifs en jeu et vos questions sur votre configuration. Commencez par identifier vos composants, puis gardez une fiche que vous pouvez corriger.</p>
    <div class="steps"><span>01 / IDENTIFIER</span><span>02 / VÉRIFIER</span><span>03 / COMPARER</span></div>
    <section><h2>Une fiche matériel sans tout recopier</h2><p>Le collecteur Windows lit les références du processeur, des adaptateurs graphiques, de la carte mère, de la mémoire et des disques. Le résultat est présenté avant enregistrement : vous choisissez quand l’ajouter à votre configuration.</p><p>La détection directe est disponible dans l’application exécutée localement sous Windows. Depuis le site hébergé, vous pouvez générer un rapport sur votre ordinateur puis l’importer. Le navigateur seul ne fournit pas un inventaire complet.</p><a href="/guides/identifier-composants-pc">Comment identifier les composants de son PC →</a></section>
    <section><h2>Détection automatique et saisie manuelle</h2><p>Les références remontées par Windows peuvent inclure plusieurs adaptateurs, des périphériques virtuels ou des noms constructeur peu précis. Relisez la fiche et corrigez-la si nécessaire. Les champs non détectés restent disponibles pour une saisie manuelle.</p><p>Le modèle et la puissance de l’alimentation ne sont pas déduits. Les dimensions du boîtier, les connecteurs et les contraintes de refroidissement doivent aussi être vérifiés avant un achat.</p></section>
    <section><h2>Préparer un upgrade sur des informations vérifiables</h2><p>Une bonne décision dépend de vos jeux, de votre résolution, de votre budget et de mesures prises en jeu. Gaming Copilot organise ces informations pour préparer les vérifications de compatibilité et vos questions à l’assistant.</p><p>Un objectif FPS reste un objectif personnel. L’application n’annonce pas de benchmark à partir du seul nom des composants. L’assistant nécessite une connexion et une configuration des services Firebase et OpenAI.</p></section>
    <section><h2>Enregistrer ses objectifs d’achat</h2><p>La page Prix permet de conserver les références recherchées et votre budget cible. Les sources marchandes et les notifications ne sont pas encore connectées dans ce MVP. Un seuil enregistré ne constitue donc pas une surveillance active.</p></section>
    <section><h2>Garder la maîtrise de sa fiche</h2><p>La collecte matérielle est en lecture seule et n’inclut pas les numéros de série, le compte Windows ou les identifiants réseau. Vous vérifiez les composants avant de les enregistrer localement ou, après connexion, dans votre espace Firebase.</p></section>
    <div class="cta"><a class="button" href="/">Ouvrir mon espace Gaming Copilot</a><span>Commencez par Ma Config.</span></div>`,
  },
  {
    path: "/guides/identifier-composants-pc",
    title:
      "Comment identifier les composants de son PC Windows | Gaming Copilot",
    description:
      "Identifiez le processeur, les GPU, la carte mère, la RAM et le stockage de votre PC Windows. Découvrez les limites de la détection et les vérifications utiles.",
    eyebrow: "GUIDE / MATÉRIEL WINDOWS",
    heading: "Comment identifier les composants de son PC Windows",
    body: `<p class="lead">Avant de remplacer une carte graphique ou d’ajouter de la mémoire, relevez les références de votre configuration. Windows peut fournir une partie de cet inventaire, mais certains éléments nécessitent une vérification sur le matériel ou sa documentation.</p>
    <section><h2>1. Lire les références disponibles dans Windows</h2><p>Les classes matérielles Windows CIM exposent les informations du processeur, des adaptateurs vidéo, de la carte mère, des modules mémoire et des disques. Le collecteur Gaming Copilot utilise ces classes en lecture seule.</p><p>Dans l’application locale, ouvrez Ma Config puis Détecter ce PC. Attendez le résultat et relisez chaque catégorie avant de choisir Utiliser ces composants. Enregistrer mon setup confirme ensuite la sauvegarde.</p></section>
    <section><h2>2. Importer un rapport depuis la version web</h2><ol><li>Ouvrez Ma Config et téléchargez le collecteur Windows.</li><li>Dans le dossier où se trouve le script, lancez dans PowerShell : <code>powershell -NoProfile -File .\\detect-hardware.ps1 -OutputPath .\\gaming-copilot-hardware.json</code>.</li><li>Importez le fichier JSON généré et vérifiez les références proposées.</li></ol><p>La politique d’exécution de Windows peut bloquer les scripts. L’application ne modifie pas cette protection. Vous pouvez toujours compléter votre fiche manuellement.</p></section>
    <section><h2>3. Vérifier les adaptateurs graphiques et le stockage</h2><p>Une machine peut déclarer plusieurs GPU, une puce graphique intégrée ou un adaptateur virtuel. Une liste de noms n’indique pas automatiquement quel GPU exécute votre jeu. Vérifiez la carte réellement utilisée dans les réglages du jeu ou les outils Windows.</p><p>Les capacités des disques affichées en GiB peuvent différer des capacités commerciales en Go. Relisez également les références si vous avez plusieurs disques ou du stockage externe.</p></section>
    <section><h2>4. Compléter ce que le système ne peut pas confirmer</h2><p>Le modèle et la puissance de l’alimentation ne sont pas fiables dans un inventaire CIM standard. Consultez son étiquette ou la facture du PC. Avant toute intervention physique, éteignez et débranchez la machine ; n’ouvrez pas le bloc d’alimentation.</p><p>Pour une carte mère ou un PC de marque, consultez la documentation constructeur pour le socket, la version BIOS, la mémoire compatible, les connecteurs et les dimensions disponibles. Un nom détecté ne certifie pas à lui seul une compatibilité.</p></section>
    <section><h2>5. Séparer l’inventaire des performances</h2><p>Connaître le matériel ne suffit pas à prédire les FPS d’un jeu. La version du jeu, les pilotes, la résolution et les réglages changent le résultat. Mesurez les FPS et les frametimes dans une scène reproductible avant de décider d’un upgrade.</p></section>
    <section><h2>Sources techniques</h2><ul><li><a href="https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/computer-system-hardware-classes">Microsoft : classes matérielles Windows CIM</a></li><li><a href="https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-videocontroller">Microsoft : adaptateurs vidéo Win32_VideoController</a></li><li><a href="https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-physicalmemory">Microsoft : mémoire physique Win32_PhysicalMemory</a></li></ul></section>
    <div class="cta"><a class="button" href="/">Créer ma fiche matériel</a><a href="/decouvrir">Découvrir Gaming Copilot →</a></div>`,
  },
];

function document(page, origin, indexable) {
  const url = origin ? origin + page.path : null;
  const schema = origin
    ? [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Gaming Copilot",
          url: origin + "/decouvrir",
          inLanguage: "fr",
        },
        ...(page.path.startsWith("/guides/")
          ? [
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Gaming Copilot",
                    item: origin + "/decouvrir",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Identifier les composants de son PC",
                    item: url,
                  },
                ],
              },
            ]
          : []),
      ]
    : [];
  return `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#131515"><title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}"><meta name="robots" content="${indexable ? "index,follow,max-image-preview:large" : "noindex,follow"}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/seo.css"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Gaming Copilot"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta name="twitter:card" content="summary_large_image">${url ? `<link rel="canonical" href="${escapeHtml(url)}"><meta property="og:url" content="${escapeHtml(url)}"><meta property="og:image" content="${origin}/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Gaming Copilot — Inventaire matériel PC"><meta name="twitter:image" content="${origin}/social-card.png">` : ""}${schema.map((item) => `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, "\\u003c")}</script>`).join("")}</head><body><a class="skip" href="#contenu">Aller au contenu</a><header><a class="brand" href="/decouvrir">gaming copilot<span>.</span></a><nav aria-label="Navigation publique"><a href="/decouvrir">Le projet</a><a href="/guides/identifier-composants-pc">Guide matériel</a><a href="/">Mon espace</a></nav></header><main id="contenu"><span class="eyebrow">${page.eyebrow}</span><h1>${page.heading}</h1>${page.body}</main><footer><span>GAMING COPILOT / ATELIER PC</span><a href="/decouvrir">Le projet</a><a href="/guides/identifier-composants-pc">Identifier son matériel</a><a href="/">Ouvrir l’application</a></footer></body></html>`;
}

export function buildSeo({ siteUrl = "", environment = "development" } = {}) {
  const origin = publicOrigin(siteUrl);
  const indexable = Boolean(origin && environment === "production");
  const files = new Map(
    pages.map((page) => [
      `${page.path.slice(1)}/index.html`,
      document(page, origin, indexable),
    ]),
  );
  files.set(
    "robots.txt",
    indexable
      ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
  );
  if (indexable)
    files.set(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${escapeHtml(origin + page.path)}</loc></url>`).join("\n")}\n</urlset>\n`,
    );
  return files;
}
