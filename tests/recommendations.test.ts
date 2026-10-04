import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyConfig } from "../src/domain";
import { recommendProfile } from "../src/recommendations";
import { applyHardwareReport, hardwareReportSchema } from "../src/hardware";
test("partial browser inventory preserves components it cannot observe", () => {
  const report = hardwareReportSchema.parse({
    version: 1,
    platform: "browser",
    detectedAt: new Date().toISOString(),
    components: {
      cpu: null,
      gpu: "NVIDIA RTX 4070",
      motherboard: null,
      ram: null,
      storage: null,
      psu: null,
    },
    warnings: [],
  });
  const result = applyHardwareReport(
    { ...emptyConfig, cpu: "Ryzen 7 5700X", ram: "32 Go" },
    report,
  );
  assert.equal(result.cpu, "Ryzen 7 5700X");
  assert.equal(result.ram, "32 Go");
  assert.equal(result.gpu, "NVIDIA RTX 4070");
});
test("profiles use conservative defaults for unknown GPU and never target user-entered FPS", () => {
  assert.equal(recommendProfile({ ...emptyConfig, targetFps: 500 }).fps, 60);
  assert.equal(
    recommendProfile({ ...emptyConfig, gpu: "Unknown" }).ready,
    false,
  );
  assert.equal(
    recommendProfile({ ...emptyConfig, gpu: "NVIDIA RTX 4070" }).resolution,
    "1440p",
  );
  assert.equal(
    recommendProfile({ ...emptyConfig, gpu: "Intel UHD Graphics" }).quality,
    "Bas",
  );
});
