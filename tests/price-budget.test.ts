import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterOffersByBudget,
  keepReference,
  readSavedReferences,
  type Offer,
} from "../src/prices";
const offer = (amount: number): Offer => ({
  component: "SSD",
  amount,
  currency: "EUR",
  merchant: "LDLC",
  seller: null,
  url: "https://www.ldlc.com/fiche/PB00000000.html",
  observedAt: new Date().toISOString(),
  sourceUrl: "https://www.ldlc.com/fiche/PB00000000.html",
  availability: "in-stock",
  condition: "new",
  gtin: null,
  mpn: null,
  shipping: null,
});
test("100 euro threshold only shows offers at or below 100 and sorts numerically", () => {
  const original = [
    offer(120),
    offer(100),
    offer(99.99),
    offer(100.01),
    offer(70),
  ];
  assert.deepEqual(
    filterOffersByBudget(original, 100).map((o) => o.amount),
    [70, 99.99, 100],
  );
  assert.equal(original[0].amount, 120);
  assert.deepEqual(filterOffersByBudget([offer(120)], 100), []);
  assert.equal(filterOffersByBudget(original).length, 5);
});
test("kept references persist through serialization and never create duplicates", () => {
  let value = "[]";
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => value },
  });
  try {
    const refs = keepReference(
      keepReference([], "Samsung 990 PRO"),
      "Samsung 990 PRO",
    );
    value = JSON.stringify(refs);
    assert.deepEqual(readSavedReferences("test"), ["Samsung 990 PRO"]);
    value = "[null]";
    assert.deepEqual(readSavedReferences("test"), []);
  } finally {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});
