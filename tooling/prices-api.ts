import type { Plugin } from "vite";
import { searchPrices } from "../server/prices";
import { categories, type PriceCategory } from "../src/prices";
export function pricesApi(): Plugin {
  return {
    name: "local-prices-api",
    configureServer(server) {
      server.middlewares.use("/api/prices", async (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Méthode non autorisée." }));
          return;
        }
        const p = new URL(req.url ?? "/", "http://localhost").searchParams;
        const q = p.get("q")?.trim() ?? "";
        const c = p.get("category");
        if (
          q.length < 2 ||
          q.length > 150 ||
          (c && !categories.includes(c as PriceCategory))
        ) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({ error: "Référence ou catégorie invalide." }),
          );
          return;
        }
        try {
          res.end(
            JSON.stringify(
              await searchPrices(q, c ? (c as PriceCategory) : undefined),
            ),
          );
        } catch {
          res.statusCode = 502;
          res.end(
            JSON.stringify({ error: "Sources momentanément indisponibles." }),
          );
        }
      });
    },
  };
}
