import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { hardwareReportSchema } from "../src/hardware";

const execute = promisify(execFile);
export async function scanWindowsHardware() {
  if (process.platform !== "win32") throw new Error("WINDOWS_REQUIRED");
  // Only this audited, fixed script is executed. No browser input reaches PowerShell.
  const script = await readFile(
    resolve(process.cwd(), "public/detect-hardware.ps1"),
    "utf8",
  );
  const executable = resolve(
    process.env.SystemRoot ?? "C:/Windows",
    "System32/WindowsPowerShell/v1.0/powershell.exe",
  );
  const { stdout } = await execute(
    executable,
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
    {
      windowsHide: true,
      timeout: 25000,
      maxBuffer: 64 * 1024,
      encoding: "utf8",
    },
  );
  return hardwareReportSchema.parse(JSON.parse(stdout.replace(/^\uFEFF/, "")));
}

export function hardwareScanner(): Plugin {
  let scanning = false;
  return {
    name: "gaming-copilot-local-hardware",
    configureServer(server) {
      server.middlewares.use("/api/hardware", async (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        const reply = (status: number, body: unknown) => {
          res.statusCode = status;
          res.end(JSON.stringify(body));
        };
        // Restrict to local, same-origin POST. Never expose inventory via CORS or public dev-server binding.
        const host = req.headers.host ?? "";
        if (
          !/^(localhost|127\.0\.0\.1):\d+$/.test(host) ||
          req.headers.origin !== `http://${host}`
        )
          return reply(403, {
            error: "Scan réservé à cette application locale.",
          });
        if (req.method !== "POST") {
          res.setHeader("Allow", "POST");
          return reply(405, { error: "Méthode non autorisée." });
        }
        if (scanning)
          return reply(429, { error: "Une détection est déjà en cours." });
        scanning = true;
        try {
          return reply(200, await scanWindowsHardware());
        } catch {
          return reply(503, {
            error:
              "La détection Windows est indisponible. Vous pouvez importer un rapport ou compléter les champs.",
          });
        } finally {
          scanning = false;
        }
      });
    },
  };
}
