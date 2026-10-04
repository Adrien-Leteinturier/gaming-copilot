import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res
    .status(410)
    .json({
      error:
        "L’assistant utilise désormais le modèle gratuit sur votre appareil. Rechargez l’application.",
      mode: "local-webgpu",
    });
}
