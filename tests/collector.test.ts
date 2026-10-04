import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCollectorReturn } from "../src/hardware";
test("automatic Windows return decodes Unicode inventory and rejects malformed or unrelated payloads", () => {
  const data = {
    version: 1,
    platform: "windows",
    detectedAt: new Date().toISOString(),
    components: {
      cpu: "Processeur détecté",
      gpu: null,
      motherboard: null,
      ram: null,
      storage: null,
      psu: null,
    },
    warnings: [],
  };
  const fragment =
    "#hardware=" + Buffer.from(JSON.stringify(data)).toString("base64url");
  assert.equal(
    decodeCollectorReturn(fragment)?.components.cpu,
    data.components.cpu,
  );
  assert.equal(decodeCollectorReturn("#other"), null);
  assert.throws(() => decodeCollectorReturn("#hardware=%bad"));
  assert.throws(() => decodeCollectorReturn("#hardware=" + "a".repeat(24001)));
  assert.throws(() =>
    decodeCollectorReturn(
      "#hardware=" +
        Buffer.from(JSON.stringify({ ...data, platform: "browser" })).toString(
          "base64url",
        ),
    ),
  );
});
