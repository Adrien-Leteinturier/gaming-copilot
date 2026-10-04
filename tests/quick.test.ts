import { test } from "node:test";
import assert from "node:assert/strict";
import { quickReply } from "../src/agent/quick";
import { emptyConfig } from "../src/domain";
test("diagnostics answer without model or WebGPU and use recorded hardware", async () => {
  const reply = await quickReply("Analyse ma configuration", {
    ...emptyConfig,
    cpu: "Ryzen 7 5700X",
  });
  assert.match(reply!, /Ryzen 7 5700X/);
  assert.match(reply!, /À compléter/);
});
test("general questions request a model instead of fabricating an answer", async () => {
  assert.equal(
    await quickReply(
      "Comment interpréter un graphique de frametimes",
      emptyConfig,
    ),
    null,
  );
});
test("price questions lacking a reference provide immediate guidance without model", async () => {
  assert.match(
    (await quickReply("Quels prix ?", emptyConfig))!,
    /référence précise/,
  );
});

test("basic CPU explanation uses a controlled answer without model", async () => {
  const reply = await quickReply(
    "Explique simplement le rôle du processeur.",
    emptyConfig,
  );
  assert.match(reply!, /exécute les instructions/);
  assert.doesNotMatch(reply!, /danser|émotions/);
});
