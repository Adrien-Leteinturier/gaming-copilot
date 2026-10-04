import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { buildSeo, resolveSiteUrl } from "./seo.mjs";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const environment =
  env.VERCEL_ENV ??
  (process.argv.includes("--production") ? "production" : "development");
const files = buildSeo({ siteUrl: resolveSiteUrl(env), environment });
for (const [relative, contents] of files) {
  const file = path.join(process.cwd(), "public", relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents, "utf8");
}
if (!files.has("sitemap.xml"))
  await rm(path.join(process.cwd(), "public/sitemap.xml"), { force: true });
console.log(
  files.has("sitemap.xml")
    ? "SEO : pages publiques et sitemap générés."
    : "SEO : mode non indexable ; adresse de production Vercel ou SITE_URL attendue.",
);
