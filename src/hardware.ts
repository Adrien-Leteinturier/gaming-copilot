import { z } from "zod";
import type { PcConfig } from "./domain";

const component = z.string().trim().min(1).max(150).nullable();
export const hardwareReportSchema = z
  .object({
    version: z.literal(1),
    platform: z.literal("windows"),
    detectedAt: z.iso.datetime(),
    components: z
      .object({
        cpu: component,
        gpu: component,
        motherboard: component,
        ram: component,
        storage: component,
        psu: z.null(),
      })
      .strict(),
    warnings: z.array(z.string().max(300)).max(20),
  })
  .strict();

export type HardwareReport = z.infer<typeof hardwareReportSchema>;
export function applyHardwareReport(
  config: PcConfig,
  report: HardwareReport,
): PcConfig {
  const detected = hardwareReportSchema.parse(report);
  const next = { ...config };
  for (const key of Object.keys(
    detected.components,
  ) as (keyof HardwareReport["components"])[]) {
    const value = detected.components[key];
    if (value !== null) next[key] = value;
  }
  return next;
}

export async function readHardwareFile(file: File): Promise<HardwareReport> {
  if (file.size > 64 * 1024)
    throw new Error("Le rapport doit faire moins de 64 Ko.");
  return hardwareReportSchema.parse(
    JSON.parse((await file.text()).replace(/^\uFEFF/, "")),
  );
}
