import { z } from "zod";
import type { PcConfig } from "./domain";

const component = z.string().trim().min(1).max(150).nullable();
export const hardwareReportSchema = z
  .object({
    version: z.literal(1),
    platform: z.enum(["windows", "browser"]),
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

// Browser observations are deliberately partial: no inferred CPU or physical RAM.
export async function detectBrowserHardware(): Promise<HardwareReport> {
  let gpu: string | null = null;
  try {
    const nav = navigator as Navigator & {
      gpu?: {
        requestAdapter(options: { powerPreference: string }): Promise<{
          info?: { description?: string };
          isFallbackAdapter?: boolean;
        } | null>;
      };
    };
    const adapter = await Promise.race([
      nav.gpu?.requestAdapter({ powerPreference: "high-performance" }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (
      adapter &&
      !adapter.isFallbackAdapter &&
      adapter.info?.description?.trim()
    )
      gpu = adapter.info.description.trim().slice(0, 150);
  } catch {
    /* Restricted browsers simply leave GPU unknown. */
  }
  return hardwareReportSchema.parse({
    version: 1,
    platform: "browser",
    detectedAt: new Date().toISOString(),
    components: {
      cpu: null,
      gpu,
      motherboard: null,
      ram: null,
      storage: null,
      psu: null,
    },
    warnings: [
      "Le GPU est celui utilisé par le navigateur ; un PC peut en avoir plusieurs. CPU, RAM physique, disques et alimentation nécessitent le collecteur Windows ou une saisie manuelle.",
    ],
  });
}

export function decodeCollectorReturn(fragment: string): HardwareReport | null {
  if (!fragment.startsWith("#hardware=")) return null;
  const value = fragment.slice(10);
  if (value.length > 24000 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw Error("Retour du collecteur invalide.");
  const bytes = Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const report = hardwareReportSchema.parse(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
  if (report.platform !== "windows") throw Error("Rapport Windows attendu.");
  return report;
}
