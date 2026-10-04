import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyHardwareReport,
  hardwareReportSchema,
  type HardwareReport,
} from "../src/hardware";
import { emptyConfig } from "../src/domain";
const report: HardwareReport = {
  version: 1,
  platform: "windows",
  detectedAt: "2026-10-04T09:00:00.000Z",
  components: {
    cpu: "CPU détecté",
    gpu: null,
    motherboard: null,
    ram: "32 GiB",
    storage: null,
    psu: null,
  },
  warnings: [],
};
test("Detected fields update the draft without erasing unknown components or user goals", () => {
  const old = {
    ...emptyConfig,
    gpu: "GPU manuel",
    psu: "Alimentation manuelle",
    name: "Ma tour",
    targetFps: 120,
  };
  const updated = applyHardwareReport(old, report);
  assert.equal(updated.cpu, "CPU détecté");
  assert.equal(updated.ram, "32 GiB");
  assert.equal(updated.gpu, old.gpu);
  assert.equal(updated.psu, old.psu);
  assert.equal(updated.targetFps, 120);
  assert.equal(updated.name, "Ma tour");
  assert.equal(old.cpu, "");
});
test("Reports reject fabricated PSU detection and unexpected identity fields", () => {
  assert.equal(
    hardwareReportSchema.safeParse({
      ...report,
      components: { ...report.components, psu: "Invented PSU" },
    }).success,
    false,
  );
  assert.equal(
    hardwareReportSchema.safeParse({ ...report, serialNumber: "private" })
      .success,
    false,
  );
});
test("Unsupported platforms and corrupt report fields are rejected", () => {
  assert.equal(
    hardwareReportSchema.safeParse({ ...report, platform: "linux" }).success,
    false,
  );
  assert.equal(
    hardwareReportSchema.safeParse({ ...report, detectedAt: "yesterday" })
      .success,
    false,
  );
  assert.equal(
    hardwareReportSchema.safeParse({
      ...report,
      components: { ...report.components, cpu: "x".repeat(151) },
    }).success,
    false,
  );
});

test("File import accepts valid UTF-8/BOM reports and rejects oversized or corrupt files", async () => {
  const { readHardwareFile } = await import("../src/hardware");
  assert.deepEqual(
    await readHardwareFile(new File([JSON.stringify(report)], "report.json")),
    report,
  );
  assert.deepEqual(
    await readHardwareFile(
      new File(["\uFEFF" + JSON.stringify(report)], "bom.json"),
    ),
    report,
  );
  await assert.rejects(
    readHardwareFile(new File(["x".repeat(65537)], "large.json")),
  );
  await assert.rejects(readHardwareFile(new File(["not-json"], "bad.json")));
});
