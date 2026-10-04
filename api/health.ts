import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    status: "ok",
    assistantConfigured: true,
    assistantMode: "local-webgpu",
    assistantModels: ["Qwen3-0.6B", "Qwen2.5-1.5B-Instruct"],
    firebaseConfigured: Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
    ),
    prices: "public-catalogs",
    priceSources: ["LDLC", "Materiel.net", "Alternate", "Cybertek"],
    priceCoverage: "partial",
    automaticPriceNotifications: false,
  });
}
