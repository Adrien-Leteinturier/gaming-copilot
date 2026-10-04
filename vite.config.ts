import { defineConfig } from "vite";
import { pricesApi } from "./tooling/prices-api";
import react from "@vitejs/plugin-react";
import { hardwareScanner } from "./tooling/hardware-scanner";
import { publicSeoPages } from "./tooling/seo-pages";
export default defineConfig({
  plugins: [react(), hardwareScanner(), publicSeoPages(), pricesApi()],
  server: { host: "127.0.0.1" },
});
