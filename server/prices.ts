import { load } from "cheerio";
import robotsParser from "robots-parser";
import {
  offerSchema,
  type Offer,
  type PriceCategory,
  type PriceResult,
  guessCategory,
} from "../src/prices.js";
const agent =
  "GamingCopilot/0.1 (+https://gaming-copilot.vercel.app/decouvrir)";
const ttl = 15 * 60 * 1000;
const cache = new Map<
  string,
  { expires: number; value: Promise<{ html: string; observedAt: string }> }
>();
const policies = new Map<
  string,
  { expires: number; value: Promise<ReturnType<typeof robotsParser>> }
>();
export const catalogs: Record<string, Record<PriceCategory, string>> = {
  "www.ldlc.com": {
    cpu: "/informatique/pieces-informatique/processeur/c4300/",
    gpu: "/informatique/pieces-informatique/carte-graphique-interne/c4684/",
    motherboard: "/informatique/pieces-informatique/carte-mere/c4293/",
    ram: "/informatique/pieces-informatique/memoire-pc/c4703/",
    storage: "/informatique/pieces-informatique/disque-ssd/c4698/",
    psu: "/informatique/pieces-informatique/alimentation-pc/c4289/",
  },
  "www.materiel.net": {
    cpu: "/processeur/l441/",
    gpu: "/carte-graphique/l426/",
    motherboard: "/carte-mere/l443/",
    ram: "/memoire/l442/",
    storage: "/disque-ssd/l429/",
    psu: "/alimentation-pc/l445/",
  },
};
const independentCatalogs: Record<string, Record<PriceCategory, string>> = {
  "www.alternate.fr": {
    cpu: "/Processeurs",
    gpu: "/Cartes-graphiques",
    motherboard: "/Cartes-mères",
    ram: "/Mémoires",
    storage: "/SSD",
    psu: "/Alimentations",
  },
  "www.cybertek.fr": {
    cpu: "/processeur-5.aspx",
    gpu: "/carte-graphique-6.aspx",
    motherboard: "/carte-mere-4.aspx",
    ram: "/memoire-pc-2.aspx",
    storage: "/disque-ssd-49.aspx",
    psu: "/alimentation-12.aspx",
  },
};
Object.assign(catalogs, independentCatalogs);
const names: Record<string, string> = {
  "www.ldlc.com": "LDLC",
  "www.materiel.net": "Materiel.net",
  "www.alternate.fr": "Alternate",
  "www.cybertek.fr": "Cybertek",
};
export function allowedUrl(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !Object.hasOwn(catalogs, u.hostname)
  )
    throw Error("INVALID_SOURCE");
  const isAlternateSearch =
    u.hostname === "www.alternate.fr" &&
    u.pathname === "/listing.xhtml" &&
    [...u.searchParams.keys()].length === 1 &&
    u.searchParams.has("q") &&
    (u.searchParams.get("q")?.trim().length ?? 0) >= 2 &&
    (u.searchParams.get("q")?.length ?? 0) <= 150;
  if ((u.search && !isAlternateSearch) || u.hash) throw Error("INVALID_SOURCE");
  const paths = Object.values(catalogs[u.hostname]);
  const isCatalog = paths.some(
    (p) =>
      u.pathname === p ||
      u.pathname === `${p}page2/` ||
      u.pathname === `${p}page3/`,
  );
  const productPatterns: Record<string, RegExp> = {
    "www.ldlc.com": /^\/fiche\/PB\d{8}\.html$/,
    "www.materiel.net": /^\/produit\/\d{12}\.html$/,
    "www.alternate.fr":
      /^\/[a-zA-Z0-9%._~-]+\/[a-zA-Z0-9%._~-]+\/html\/product\/\d{4,10}$/,
    "www.cybertek.fr":
      /^\/(processeur|carte-graphique|carte-mere|memoire-pc|disque-ssd|alimentation)\/[a-z0-9-]+-\d+\.aspx$/,
  };
  const isProduct = productPatterns[u.hostname].test(u.pathname);
  if (!isCatalog && !isProduct && !isAlternateSearch)
    throw Error("INVALID_SOURCE");
  return u;
}
async function rawFetch(url: string, limit: number) {
  const r = await fetch(url, {
    headers: { "User-Agent": agent, Accept: "text/html,text/plain" },
    redirect: "error",
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok)
    throw Error(
      r.status === 403 || r.status === 429
        ? "SOURCE_BLOCKED"
        : "SOURCE_UNAVAILABLE",
    );
  if (Number(r.headers.get("content-length")) > limit)
    throw Error("SOURCE_TOO_LARGE");
  const reader = r.body?.getReader();
  if (!reader) throw Error("SOURCE_UNAVAILABLE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error("SOURCE_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function policy(host: string) {
  const existing = policies.get(host);
  if (existing && existing.expires > Date.now()) return existing.value;
  const url = `https://${host}/robots.txt`;
  const value = rawFetch(url, 100000).then((t) => robotsParser(url, t));
  policies.set(host, { expires: Date.now() + ttl, value });
  try {
    return await value;
  } catch (e) {
    policies.delete(host);
    throw e;
  }
}
async function page(url: string) {
  const u = allowedUrl(url);
  const rules = await policy(u.hostname);
  if (rules.isAllowed(url, "GamingCopilot") !== true)
    throw Error("ROBOTS_BLOCKED");
  const entry = cache.get(url);
  if (entry && entry.expires > Date.now()) return entry.value;
  if (cache.size >= 150) {
    for (const [key, item] of cache)
      if (item.expires < Date.now()) cache.delete(key);
    if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  }
  const value = rawFetch(url, 4_000_000).then((html) => ({
    html,
    observedAt: new Date().toISOString(),
  }));
  cache.set(url, { expires: Date.now() + ttl, value });
  try {
    return await value;
  } catch (e) {
    cache.delete(url);
    throw e;
  }
}
type Json = Record<string, unknown>;
function objects(value: unknown, results: Json[], depth = 0) {
  if (
    depth > 12 ||
    results.length > 2000 ||
    value === null ||
    typeof value !== "object"
  )
    return;
  if (Array.isArray(value)) {
    for (const child of value) objects(child, results, depth + 1);
    return;
  }
  const node = value as Json;
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  if (types.includes("Product")) {
    results.push(node);
    return;
  }
  for (const child of Object.values(node)) objects(child, results, depth + 1);
}
const text = (v: unknown, max = 100) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
export function parseOffers(
  html: string,
  sourceUrl: string,
  observedAt: string,
): Offer[] {
  const source = allowedUrl(sourceUrl);
  const $ = load(html);
  const products: Json[] = [];
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      objects(JSON.parse($(el).text()), products);
    } catch {
      /* Invalid structured data is never a price. */
    }
  }
  const offers: Offer[] = [];
  for (const product of products) {
    const raw = Array.isArray(product.offers)
      ? product.offers
      : [product.offers];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Json;
      if (o["@type"] !== "Offer" || o.priceCurrency !== "EUR") continue;
      const u = text(o.url, 1000) ?? text(product.url, 1000) ?? sourceUrl;
      try {
        if (allowedUrl(u).hostname !== source.hostname) continue;
      } catch {
        continue;
      }
      const price =
        typeof o.price === "number"
          ? o.price
          : typeof o.price === "string" && /^\d+(\.\d{1,2})?$/.test(o.price)
            ? Number(o.price)
            : NaN;
      const condition = String(o.itemCondition ?? "");
      const seller =
        o.seller && typeof o.seller === "object"
          ? text((o.seller as Json).name)
          : null;
      const parsed = offerSchema.safeParse({
        component: text(product.name, 300),
        amount: price,
        currency: "EUR",
        merchant: names[source.hostname],
        seller,
        url: u,
        sourceUrl,
        observedAt,
        gtin: text(product.gtin13 ?? product.gtin14 ?? product.gtin),
        mpn: text(product.mpn),
        shipping: null,
        availability: /(?:^|\/)InStock$/.test(String(o.availability))
          ? "in-stock"
          : /(?:^|\/)(OutOfStock|SoldOut|Discontinued)$/.test(
                String(o.availability),
              )
            ? "out-of-stock"
            : "unknown",
        condition: /(?:^|\/)NewCondition$/.test(condition)
          ? "new"
          : /(?:^|\/)UsedCondition$/.test(condition)
            ? "used"
            : /(?:^|\/)RefurbishedCondition$/.test(condition)
              ? "refurbished"
              : "unknown",
      });
      if (parsed.success) offers.push(parsed.data);
    }
  }
  return offers;
}
function words(value: string) {
  return (
    value
      .replace(/(\d+)\s*(gb|go)\b/gi, "$1 gb")
      .replace(/\b(rx|rtx|gtx)(\d{3,4})(xt|ti)?\b/gi, "$1 $2 $3")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? []
  );
}
export function matches(query: string, title: string) {
  const wanted = words(query).filter(
    (w) => !["processeur", "carte", "graphique", "acheter", "prix"].includes(w),
  );
  const haystack = new Set(words(title));
  return wanted.length > 0 && wanted.every((w) => haystack.has(w));
}
export function productLinks(html: string, sourceUrl: string, query: string) {
  const source = allowedUrl(sourceUrl);
  const $ = load(html);
  const urls = new Set<string>();
  for (const el of $("a[href]").toArray()) {
    const a = $(el);
    const title =
      a.text().trim() || a.attr("title") || a.find("img").attr("alt") || "";
    if (!matches(query, title)) continue;
    try {
      const u = allowedUrl(new URL(a.attr("href")!, source).href);
      if (
        u.hostname === source.hostname &&
        /(?:\.html$|\.aspx$|\/html\/product\/\d+$)/.test(u.pathname)
      )
        urls.add(u.href);
    } catch {
      /* Ignore all non-product destinations. */
    }
  }
  return [...urls];
}
export async function searchPrices(
  query: string,
  category: PriceCategory = guessCategory(query),
): Promise<PriceResult> {
  const sources: PriceResult["sources"] = [];
  const collected: Offer[] = [];
  await Promise.all(
    Object.entries(catalogs).map(async ([host, paths]) => {
      let success = 0;
      let blocked = false;
      const found: Offer[] = [];
      const links = new Set<string>();
      const urls =
        host === "www.alternate.fr"
          ? [
              `https://${host}/listing.xhtml?${new URLSearchParams({ q: query })}`,
            ]
          : host === "www.cybertek.fr"
            ? [`https://${host}${paths[category]}`]
            : [1, 2, 3].map(
                (n) =>
                  `https://${host}${paths[category]}${n > 1 ? `page${n}/` : ""}`,
              );
      for (const url of urls) {
        try {
          const p = await page(url);
          success++;
          found.push(
            ...parseOffers(p.html, url, p.observedAt).filter(
              (o) =>
                matches(query, o.component) &&
                o.availability !== "out-of-stock",
            ),
          );
          for (const link of productLinks(p.html, url, query)) links.add(link);
        } catch (e) {
          blocked ||= e instanceof Error && /BLOCKED/.test(e.message);
          break;
        }
      }
      const known = [...new Map(found.map((o) => [o.url, o])).values()].sort(
        (a, b) => a.amount - b.amount,
      );
      const unique = [...new Set([...known.map((o) => o.url), ...links])].slice(
        0,
        8,
      );
      // Verify the individual product page; get seller, GTIN, condition and latest price.
      const verified = await Promise.all(
        unique.map(async (url) => {
          try {
            const p = await page(url);
            return parseOffers(p.html, url, p.observedAt).filter(
              (q) =>
                q.url === url &&
                matches(query, q.component) &&
                q.availability !== "out-of-stock",
            );
          } catch {
            return [];
          }
        }),
      );
      const real = verified.flat();
      collected.push(...real);
      sources.push({
        merchant: names[host],
        status: success ? "ok" : blocked ? "blocked" : "unavailable",
        count: real.length,
        note: success
          ? `${success} page(s) consultée(s) ; jusqu’à 8 fiches produit vérifiées. Couverture partielle, cache de 15 minutes.`
          : blocked
            ? "La source bloque la lecture automatique. Aucun contournement."
            : "Source temporairement inaccessible.",
      });
    }),
  );
  return {
    query,
    category,
    offers: [
      ...new Map(collected.map((o) => [`${o.url}:${o.seller}`, o])).values(),
    ].sort((a, b) => a.amount - b.amount),
    sources: sources.sort((a, b) => a.merchant.localeCompare(b.merchant)),
    coverage: "partial-catalog",
    checkedAt: new Date().toISOString(),
  };
}
export const publicPriceProvider = {
  async search(component: string) {
    return (await searchPrices(component)).offers;
  },
};
