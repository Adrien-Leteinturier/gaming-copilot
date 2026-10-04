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

test("optimization advice changes with RAM and GPU, without copying saved goals", () => {
  const rig = {
    ...emptyConfig,
    gpu: "AMD RX 9060 XT 8GB",
    cpu: "Ryzen 7 5700X",
    ram: "32 GiB",
    storage: "NVMe SSD",
    resolution: "4K" as const,
    targetFps: 500,
  };
  const profile = recommendProfile(rig);
  assert.equal(profile.resolution, "1440p");
  assert.equal(profile.fps, 60);
  assert.ok(profile.reason.includes(rig.gpu));
  assert.ok(profile.priorities.some((p) => p.includes(rig.cpu)));
  assert.ok(profile.steps.some((p) => p.includes("8 Go")));
  assert.equal(recommendProfile({ ...rig, ram: "8 Go" }).quality, "Moyen");
  assert.ok(
    recommendProfile({ ...rig, ram: "8 Go" }).priorities.some((p) =>
      p.includes("16 Go"),
    ),
  );
  assert.ok(profile.validation.includes("Aucun FPS"));
  assert.equal(recommendProfile(emptyConfig).steps.length, 1);
});
