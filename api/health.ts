import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    status: "ok",
    assistantConfigured: Boolean(
      process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL,
    ),
    firebaseConfigured: Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
    ),
    prices: "provider-unavailable",
  });
}
