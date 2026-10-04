import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyConfig } from "../src/domain";
import { buildSetupAdvice, adviceQuestion } from "../src/agent/advice";
import { quickReply } from "../src/agent/quick";
const rig = {
  ...emptyConfig,
  cpu: "AMD Ryzen 7 5700X",
  gpu: "RX 9060 XT",
  ram: "32 GiB DDR4",
  motherboard: "B550 GAMING X V2",
  storage: "NVMe SSD",
};
test("1440p advice depends on saved PC and does not invent unknown VRAM or compatibility", async () => {
  const reply = (await quickReply(
    "Une configuration optimale en 1440p ?",
    rig,
  ))!;
  assert.match(reply, /5700X/);
  assert.match(reply, /conserver/);
  assert.match(reply, /32 GiB DDR4/);
  assert.match(reply, /variante 8 ou 16/);
  assert.match(reply, /alimentation n’est pas renseignée/);
  assert.match(reply, /RX 9070 XT/);
  assert.match(reply, /RTX 5070 Ti/);
  assert.doesNotMatch(reply, /Configurer le vide/);
  assert.match(reply, /DDR5 ne se monte pas/);
});
test("missing hardware blocks product recommendation and unknown RAM is not made up", () => {
  const missing = buildSetupAdvice("Meilleur matériel pour 1440p", emptyConfig);
  assert.deepEqual(missing.candidates, []);
  assert.match(missing.text, /GPU manque/);
  const unknown = buildSetupAdvice("Optimise pour 1440p", {
    ...rig,
    ram: "inconnue",
  });
  assert.doesNotMatch(unknown.text, /Vos 32/);
});
test("already high-end inventory does not receive the same replacement list", () => {
  assert.deepEqual(
    buildSetupAdvice("Quel upgrade en 1440p ?", { ...rig, gpu: "RTX 5090" })
      .candidates,
    [],
  );
});
test("budget follow-up retains prior resolution and never borrows unrelated advice", () => {
  const resolved = adviceQuestion("Mon budget est de 500 euros", [
    { role: "user", content: "Quel upgrade en 1440p ?" },
  ]);
  assert.match(resolved!, /1440p/);
  assert.equal(buildSetupAdvice(resolved!, rig).budget, 500);
  assert.equal(
    adviceQuestion("Explique le rôle du CPU", [
      { role: "user", content: "Quel upgrade en 1440p ?" },
    ]),
    null,
  );
});

test("visitor's exact ideal setup question routes to hardware-grounded advice", async () => {
  const reply = await quickReply(
    "Quel serait ma config ideale sur un ecran 1440p",
    rig,
  );
  assert.match(reply!, /5700X/);
  assert.match(reply!, /RX 9060 XT/);
  assert.match(reply!, /alimentation n’est pas renseignée/);
});
