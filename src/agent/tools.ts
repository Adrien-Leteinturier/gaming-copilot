import { z } from "zod";
import type { PcConfig } from "../domain";
export type PriceQuote = {
  component: string;
  amount: number;
  currency: "EUR";
  merchant: string;
  url: string;
  observedAt: string;
};
export interface PriceProvider {
  search(component: string): Promise<PriceQuote[]>;
}
export const quoteSchema = z.object({
  component: z.string(),
  amount: z.number().positive(),
  currency: z.literal("EUR"),
  merchant: z.string().min(1),
  url: z.url().refine((url) => url.startsWith("https://")),
  observedAt: z.iso.datetime(),
});
export const unavailablePrices: PriceProvider = {
  async search() {
    return [];
  },
};
const definitions = [
  [
    "analyzePcConfig",
    "Lister la configuration et les informations manquantes.",
  ],
  [
    "checkCompatibility",
    "Lister les vérifications constructeur nécessaires ; ne pas certifier la compatibilité.",
  ],
  [
    "recommendUpgrade",
    "Préparer une démarche d’upgrade sans benchmark ni produit non vérifié.",
  ],
  [
    "recommendGameSettings",
    "Préparer un protocole de réglage et de mesure pour un jeu.",
  ],
  [
    "searchComponentPrices",
    "Chercher des prix avec source et date via un fournisseur vérifié.",
  ],
  [
    "createPriceAlert",
    "Préparer un seuil de prix à confirmer dans la page Prix ; ne pas lancer de surveillance.",
  ],
] as const;
export const toolDefinitions = definitions.map(([name, description]) => ({
  type: "function" as const,
  function: {
    name,
    description,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Jeu, composant ou objectif." },
        target: {
          type: "number",
          description: "Seuil EUR souhaité, uniquement pour une alerte.",
        },
      },
      additionalProperties: false,
    },
  },
}));
const argsSchema = z
  .object({
    query: z.string().max(150).optional(),
    target: z.number().positive().max(100000).optional(),
  })
  .strict();
export async function executeTool(
  name: string,
  args: unknown,
  config: PcConfig,
  provider: PriceProvider = unavailablePrices,
) {
  const parsed = argsSchema.parse(args);
  switch (name) {
    case "analyzePcConfig":
      return {
        config,
        missing: Object.entries(config)
          .filter(([, v]) => v === "")
          .map(([k]) => k),
        benchmarks: [],
        note: "Aucune performance mesurée. Le FPS cible est un objectif utilisateur.",
      };
    case "checkCompatibility":
      return {
        status: "unverified",
        checks: [
          "Socket CPU / carte mère et version BIOS",
          "Génération RAM / carte mère",
          "Puissance, connecteurs et fiche constructeur de l’alimentation",
          "Dimensions GPU, boîtier et refroidissement",
        ],
        config,
      };
    case "recommendUpgrade":
      return {
        status: "needs-evidence",
        goal: parsed.query,
        steps: [
          "Préciser les jeux et le budget",
          "Mesurer FPS et frametimes en jeu",
          "Identifier la limite CPU, GPU ou mémoire",
          "Vérifier chaque référence sur sa fiche constructeur avant achat",
        ],
        config,
      };
    case "recommendGameSettings":
      return {
        game: parsed.query ?? "À préciser",
        status: "measurement-required",
        steps: [
          "Préciser le jeu et sa version",
          "Mesurer les FPS et frametimes dans une scène reproductible",
          "Modifier un réglage à la fois puis remesurer",
          "Comparer la qualité visuelle et la fluidité",
        ],
        target: { resolution: config.resolution, fps: config.targetFps },
      };
    case "searchComponentPrices": {
      if (!parsed.query) throw Error("Composant requis");
      const quotes = await provider.search(parsed.query);
      return {
        status: quotes.length ? "verified-quotes" : "provider-unavailable",
        quotes: quotes.map((q) => quoteSchema.parse(q)),
        note: "Une liste vide signifie aucun prix vérifié disponible.",
      };
    }
    case "createPriceAlert": {
      if (!parsed.query || !parsed.target)
        throw Error("Composant et seuil requis");
      return {
        status: "confirmation-required",
        component: parsed.query,
        target: parsed.target,
        currency: "EUR",
        action:
          "Inviter l’utilisateur à enregistrer ce seuil dans la page Prix. Aucune écriture ni surveillance effectuée.",
      };
    }
    default:
      throw Error("Outil inconnu");
  }
}
