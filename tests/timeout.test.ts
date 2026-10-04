import { test } from "node:test";
import assert from "node:assert/strict";
import { withDeadline } from "../src/agent/timeout";
test("unresponsive model is cancelled and reports a bounded error", async () => {
  let cancelled = false;
  await assert.rejects(
    withDeadline(
      new Promise<never>(() => {}),
      10,
      () => {
        cancelled = true;
      },
      "MODEL_TIMEOUT",
    ),
    /MODEL_TIMEOUT/,
  );
  assert.equal(cancelled, true);
});
test("successful calculation clears deadline and preserves answer", async () => {
  let cancelled = false;
  assert.equal(
    await withDeadline(
      Promise.resolve("réponse"),
      10,
      () => {
        cancelled = true;
      },
      "timeout",
    ),
    "réponse",
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(cancelled, false);
});
