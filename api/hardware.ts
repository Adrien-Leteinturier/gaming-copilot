import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(501).json({
    code: "LOCAL_COLLECTOR_REQUIRED",
    error:
      "Cette version web ne peut pas scanner votre PC directement. Générez un rapport Windows avec le collecteur, puis importez-le ici.",
  });
}
