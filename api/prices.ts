import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { categories } from "../src/prices.js";
import { searchPrices } from "../server/prices.js";
const input = z
  .object({
    q: z.string().trim().min(2).max(150),
    category: z.enum(categories).optional(),
  })
  .strict();
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  const parsed = input.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        error:
          "Indiquez une référence entre 2 et 150 caractères et une catégorie valide.",
      });
  try {
    return res
      .status(200)
      .json(await searchPrices(parsed.data.q, parsed.data.category));
  } catch {
    return res
      .status(502)
      .json({ error: "Les sources de prix sont momentanément indisponibles." });
  }
}
