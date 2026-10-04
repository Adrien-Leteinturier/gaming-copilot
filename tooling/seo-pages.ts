import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin, Connect } from "vite";

// Fixed public routes: never resolve a path supplied by the visitor.
const routes = ["/decouvrir", "/guides/identifier-composants-pc"];
function middleware(root: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const route = routes.find(
      (item) =>
        pathname === item ||
        pathname === item + "/" ||
        pathname === item + "/index.html",
    );
    if (!route && pathname !== "/sitemap.xml") return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (route && pathname !== route) {
      res.statusCode = 308;
      res.setHeader("Location", route);
      res.end();
      return;
    }
    try {
      const body = await readFile(
        path.join(root, route ? route.slice(1) + "/index.html" : "sitemap.xml"),
      );
      res.setHeader(
        "Content-Type",
        route ? "text/html; charset=utf-8" : "application/xml; charset=utf-8",
      );
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.statusCode = 404;
      res.end("Page introuvable");
    }
  };
}
export function publicSeoPages(): Plugin {
  return {
    name: "public-seo-pages",
    configureServer(server) {
      server.middlewares.use(middleware(server.config.publicDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        middleware(
          path.resolve(server.config.root, server.config.build.outDir),
        ),
      );
    },
  };
}
