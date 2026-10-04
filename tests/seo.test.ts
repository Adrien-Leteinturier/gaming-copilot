import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error SEO build code is deliberately plain JavaScript, runnable before compilation.
import { buildSeo, publicOrigin, pages, resolveSiteUrl } from "../scripts/seo.mjs";
test("Production sitemap only includes canonical public pages", () => {
  const files = buildSeo({
    siteUrl: "https://gaming-copilot.fr/",
    environment: "production",
  });
  const sitemap = files.get("sitemap.xml");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 2);
  assert.ok(!sitemap.includes("/api/"));
  assert.ok(!sitemap.includes("localhost"));
  assert.ok(!sitemap.includes("lastmod"));
  for (const page of pages) {
    const html = files.get(page.path.slice(1) + "/index.html");
    assert.ok(
      html.includes(
        `<link rel="canonical" href="https://gaming-copilot.fr${page.path}">`,
      ),
    );
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes("index,follow"));
    assert.ok(html.includes("application/ld+json"));
    assert.ok(html.includes('name="description"'));
    assert.ok(html.includes("<main"));
  }
});
test("Preview builds are never indexable and never advertise a sitemap", () => {
  for (const input of [
    { environment: "production" },
    { siteUrl: "https://gaming-copilot.fr", environment: "preview" },
  ]) {
    const files = buildSeo(input);
    assert.ok(!files.has("sitemap.xml"));
    assert.ok(files.get("robots.txt").includes("Disallow: /"));
    assert.ok(!files.get("robots.txt").includes("Sitemap:"));
    assert.ok(files.get("decouvrir/index.html").includes("noindex,follow"));
  }
});
test("Invalid canonical origins fail the build instead of creating wrong SEO URLs", () => {
  for (const value of [
    "http://gaming-copilot.fr",
    "https://localhost",
    "https://example.test",
    "https://127.0.0.1",
    "https://user:pass@gaming-copilot.fr",
    "https://gaming-copilot.fr/path",
    "https://gaming-copilot.fr/?key=secret",
  ])
    assert.throws(() => publicOrigin(value));
  assert.equal(publicOrigin(""), null);
});

test("Stable production Vercel domain is used, never a deployment or branch URL", () => {
  const env = {
    SITE_URL: "",
    VERCEL_PROJECT_PRODUCTION_URL: "gaming-copilot.vercel.app",
    VERCEL_URL: "random-preview.vercel.app",
    VERCEL_BRANCH_URL: "branch.vercel.app",
  };
  assert.equal(resolveSiteUrl(env), "https://gaming-copilot.vercel.app");
  assert.equal(
    resolveSiteUrl({ ...env, SITE_URL: "https://example.com" }),
    "https://example.com",
  );
  assert.equal(resolveSiteUrl({ VERCEL_URL: env.VERCEL_URL }), "");
  assert.ok(
    buildSeo({ siteUrl: resolveSiteUrl(env), environment: "production" })
      .get("sitemap.xml")
      .includes("https://gaming-copilot.vercel.app/decouvrir"),
  );
  assert.ok(
    !buildSeo({ siteUrl: resolveSiteUrl(env), environment: "preview" }).has(
      "sitemap.xml",
    ),
  );
});

