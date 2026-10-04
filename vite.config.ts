import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { hardwareScanner } from "./tooling/hardware-scanner";
export default defineConfig({
  plugins: [react(), hardwareScanner()],
  server: { host: "127.0.0.1" },
});
