import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { hardwareScanner } from "./tooling/hardware-scanner";
import { publicSeoPages } from "./tooling/seo-pages";
export default defineConfig({
  plugins: [react(), hardwareScanner(), publicSeoPages()],
  server: { host: "127.0.0.1" },
});
