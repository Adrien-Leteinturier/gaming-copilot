import { z } from "zod";
export const categories = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
] as const;
export type PriceCategory = (typeof categories)[number];
export const categoryLabels: Record<PriceCategory, string> = {
  cpu: "Processeur",
  gpu: "Carte graphique",
  motherboard: "Carte mère",
  ram: "Mémoire RAM",
  storage: "SSD",
  psu: "Alimentation",
};
export const offerSchema = z.object({
  component: z.string().min(1).max(300),
  amount: z.number().positive().max(100000),
  currency: z.literal("EUR"),
  merchant: z.string().min(1).max(100),
  seller: z.string().max(100).nullable(),
  url: z.url().refine((u) => {
    const p = new URL(u);
    return (
      p.protocol === "https:" &&
      [
        "www.ldlc.com",
        "www.materiel.net",
        "www.alternate.fr",
        "www.cybertek.fr",
      ].includes(p.hostname)
    );
  }),
  observedAt: z.iso.datetime(),
  sourceUrl: z.url(),
  availability: z.enum(["in-stock", "out-of-stock", "unknown"]),
  condition: z.enum(["new", "used", "refurbished", "unknown"]),
  gtin: z.string().nullable(),
  mpn: z.string().nullable(),
  shipping: z.number().nonnegative().nullable(),
});
export type Offer = z.infer<typeof offerSchema>;
export const priceResultSchema = z.object({
  query: z.string(),
  category: z.enum(categories),
  offers: z.array(offerSchema).max(100),
  sources: z.array(
    z.object({
      merchant: z.string(),
      status: z.enum(["ok", "unavailable", "blocked"]),
      count: z.number(),
      note: z.string(),
    }),
  ),
  coverage: z.literal("partial-catalog"),
  checkedAt: z.iso.datetime(),
});
export type PriceResult = z.infer<typeof priceResultSchema>;
export function guessCategory(query: string): PriceCategory {
  if (/rtx|gtx|radeon|\brx\b|graphique|geforce/i.test(query)) return "gpu";
  if (/b[4568]\d{2}|x[5678]\d{2}|z[5678]\d{2}|carte m[eè]re/i.test(query))
    return "motherboard";
  if (/ddr[345]|ram|corsair|g\.skill|m[eé]moire/i.test(query)) return "ram";
  if (/ssd|nvme|980|990|sn[578]\d\d|stockage/i.test(query)) return "storage";
  if (/alimentation|psu|\b\d{3,4}\s*w\b|rm\d{3}/i.test(query)) return "psu";
  return "cpu";
}
export function searchLinks(query: string) {
  const q = encodeURIComponent(query);
  return [
    { merchant: "Amazon", url: `https://www.amazon.fr/s?k=${q}` },
    {
      merchant: "Cdiscount",
      url: `https://www.cdiscount.com/search/10/${q}.html`,
    },
    { merchant: "TopAchat", url: `https://www.topachat.com/s?q=${q}` },
    {
      merchant: "Fnac",
      url: `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}&SCat=0`,
    },
    { merchant: "Idealo", url: `https://www.idealo.fr/resultats.html?q=${q}` },
    {
      merchant: "Google Shopping",
      url: `https://www.google.com/search?tbm=shop&q=${q}`,
    },
  ];
}
export async function findPrices(
  query: string,
  category?: PriceCategory,
  signal?: AbortSignal,
): Promise<PriceResult> {
  const p = new URLSearchParams({ q: query });
  if (category) p.set("category", category);
  const response = await fetch(`/api/prices?${p}`, { signal });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "La recherche de prix est indisponible.");
  return priceResultSchema.parse(data);
}

export function filterOffersByBudget(
  offers: Offer[],
  budget?: number,
): Offer[] {
  return offers
    .filter((o) => budget === undefined || o.amount <= budget)
    .sort((a, b) => a.amount - b.amount);
}
export function readSavedReferences(key: string): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return z.array(z.string().trim().min(1).max(150)).max(50).parse(data);
  } catch {
    return [];
  }
}
export function keepReference(current: string[], query: string): string[] {
  const value = query.trim().slice(0, 150);
  if (!value) return current;
  return [value, ...current.filter((item) => item !== value)].slice(0, 50);
}
