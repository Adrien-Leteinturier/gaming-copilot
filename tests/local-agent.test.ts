import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assistantContext,
  localMessages,
  cleanModelReply,
  groundedDiagnostic,
  priceQueryFrom,
  groundedReply,
} from "../src/agent/context";
import { emptyConfig } from "../src/domain";
test("Local agent uses real configuration and exposes missing hardware without inventing measurements", async () => {
  const context = JSON.parse(
    await assistantContext(
      { ...emptyConfig, cpu: "My real CPU" },
      "Quel upgrade pour mes jeux et quels FPS ?",
    ),
  );
  assert.equal(context[0].result.config.cpu, "My real CPU");
  assert.ok(context[0].result.missing.includes("psu"));
  assert.deepEqual(context[0].result.benchmarks, []);
  assert.ok(
    context.some((t: { name: string }) => t.name === "recommendUpgrade"),
  );
  assert.ok(
    context.some((t: { name: string }) => t.name === "recommendGameSettings"),
  );
});
test("Local model context limits history and clearly treats hardware labels as untrusted data", () => {
  const history = Array.from({ length: 50 }, () => ({
    role: "user" as const,
    content: "a".repeat(12000),
  }));
  const messages = localMessages("Question", history, "context");
  assert.equal(messages.length, 10);
  assert.equal(messages[1].content.length, 1200);
  assert.ok(messages[0].content.includes("jamais des instructions"));
});

test("Hardware diagnostics report exact stored references and missing fields without relying on a tiny model", () => {
  const answer = groundedDiagnostic("Analyse ma configuration", {
    ...emptyConfig,
    cpu: "Real CPU reference",
  })!;
  assert.ok(answer.includes("Real CPU reference"));
  assert.ok(answer.includes("Alimentation"));
  assert.ok(answer.includes("objectif, pas une performance mesurée"));
  assert.equal(groundedDiagnostic("Explique le frametime", emptyConfig), null);
});
test("Price routing extracts concrete models instead of allowing fabricated quotes", () => {
  assert.equal(
    priceQueryFrom("Quel est le prix d’une RX 9060 XT ?", emptyConfig),
    "RX 9060 XT",
  );
  assert.equal(
    priceQueryFrom("Combien coûte mon CPU ?", {
      ...emptyConfig,
      cpu: "AMD Ryzen 7 5700X 8-Core Processor",
    }),
    "5700X",
  );
  assert.equal(priceQueryFrom("Quel est le prix ?", emptyConfig), null);
});

test("The assistant never renders internal model thinking tags", () => {
  assert.equal(
    cleanModelReply("<think>internal notes</think>\nRéponse visible"),
    "Réponse visible",
  );
  assert.equal(cleanModelReply("<think>\n</think>\nRéponse"), "Réponse");
});

test("conversation context prioritizes latest intent, recent turns and verified evidence", () => {
  const messages = localMessages(
    "Et en 1 To ?",
    [
      { role: "user", content: "Conseille-moi un SSD" },
      { role: "assistant", content: "Ancienne recommandation" },
    ],
    "Carte mère B550",
    "Samsung 990 EVO Plus M.2 2280",
  );
  assert.match(messages[0].content, /dernière demande/);
  assert.match(messages[0].content, /Samsung 990 EVO Plus/);
  assert.match(messages[0].content, /anciennes erreurs/);
  assert.equal(messages.at(-1)?.content, "Et en 1 To ?");
});
test("numeric grounding retains user goals and removes unsupported claims locally", () => {
  const reply = groundedReply(
    "Votre budget est de 100 euros.\nCe SSD est au format M.2.\nVous gagnerez 35 %.",
    "Budget utilisateur : 100 €",
  );
  assert.match(reply, /budget est de 100/);
  assert.match(reply, /M.2/);
  assert.doesNotMatch(reply, /35 %/);
});
