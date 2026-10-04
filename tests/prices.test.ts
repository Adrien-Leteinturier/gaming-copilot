import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedUrl,
  matches,
  parseOffers,
  productLinks,
} from "../server/prices";
import { guessCategory, searchLinks } from "../src/prices";
const source = "https://www.ldlc.com/fiche/PB00493651.html";
const when = "2026-10-04T10:00:00.000Z";
const product = {
  "@type": "Product",
  name: "Test CPU",
  gtin13: "1234567890123",
  offers: {
    "@type": "Offer",
    price: "123.45",
    priceCurrency: "EUR",
    url: source,
    seller: { name: "Test seller" },
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
  },
};
const html = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
test("Structured product offers retain the source, observation time, seller and exact amount", () => {
  const [o] = parseOffers(
    html({
      "@graph": [{ "@type": "ItemList", itemListElement: [{ item: product }] }],
    }),
    source,
    when,
  );
  assert.equal(o.amount, 123.45);
  assert.equal(o.seller, "Test seller");
  assert.equal(o.gtin, "1234567890123");
  assert.equal(o.sourceUrl, source);
  assert.equal(o.observedAt, when);
  assert.equal(o.shipping, null);
  assert.equal(o.condition, "new");
});
test("Never interpret text prices, aggregate estimates, foreign currencies or unsafe links as merchant offers", () => {
  for (const changes of [
    { price: "123,45" },
    { price: "0" },
    { price: "-4" },
    { priceCurrency: "USD" },
    { "@type": "AggregateOffer", lowPrice: "99" },
    { url: "https://evil.example/product" },
  ]) {
    assert.equal(
      parseOffers(
        html({ ...product, offers: { ...product.offers, ...changes } }),
        source,
        when,
      ).length,
      0,
    );
  }
  assert.deepEqual(
    parseOffers(
      '<p>Only 123 EUR</p><script type="application/ld+json">broken</script>',
      source,
      when,
    ),
    [],
  );
});
test("Fetching is confined to fixed catalogs and recognized product paths", () => {
  assert.equal(allowedUrl(source).hostname, "www.ldlc.com");
  for (const url of [
    "http://127.0.0.1/",
    "https://www.ldlc.com@127.0.0.1/",
    "https://www.ldlc.com.evil.example/fiche/PB00493651.html",
    "https://www.ldlc.com/recherche/test/",
    source + "?redirect=evil",
    "https://www.ldlc.com:444/fiche/PB00493651.html",
  ])
    assert.throws(() => allowedUrl(url));
});
test("Matching never confuses X and X3D or 8GB and 16GB", () => {
  assert.equal(matches("5700X", "AMD Ryzen 7 5700X3D"), false);
  assert.equal(matches("RX9060XT 16 Go", "Sapphire RX 9060 XT 16GB"), true);
  assert.equal(matches("RX 9060 XT 16GB", "Sapphire RX 9060 XT 8GB"), false);
  assert.equal(matches("Ryzen 7 5700X", "AMD Ryzen 7 5700X"), true);
});
test("External searches encode user input instead of creating arbitrary destinations", () => {
  for (const link of searchLinks("5700x & test#"))
    assert.equal(new URL(link.url).protocol, "https:");
  assert.equal(guessCategory("RX 9060 XT"), "gpu");
  assert.equal(guessCategory("Ryzen 7 5700X"), "cpu");
});

test("Pagination without JSON-LD only discovers product links; prices still require the product page", () => {
  const h =
    '<a href="/produit/202203230059.html">AMD Ryzen 7 5700X</a><a href="https://evil.example/produit/202203230059.html">AMD Ryzen 7 5700X</a><a href="/search/5700x">AMD Ryzen 7 5700X</a>';
  const source = "https://www.materiel.net/processeur/l441/page2/";
  assert.deepEqual(productLinks(h, source, "5700X"), [
    "https://www.materiel.net/produit/202203230059.html",
  ]);
  assert.deepEqual(parseOffers(h, source, when), []);
});
