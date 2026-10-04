import {
  CreateWebWorkerMLCEngine,
  type WebWorkerMLCEngine,
  type InitProgressReport,
} from "@mlc-ai/web-llm";
import type { Message, PcConfig } from "../domain";
import { assistantContext, localMessages, priceQueryFrom, groundedDiagnostic } from "./context";
export const modelIds = {
  light: "Qwen3-0.6B-q4f16_1-MLC",
  balanced: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
} as const;
export type ModelMode = keyof typeof modelIds;
let cancelLoading: (() => void) | null = null;
let worker: Worker | null = null;
let engine: WebWorkerMLCEngine | null = null;
let loading: Promise<void> | null = null;
export async function loadLocalModel(
  mode: ModelMode,
  progress: (report: InitProgressReport) => void,
) {
  if (engine) return;
  if (loading) return loading;
  loading = (async () => {
    const gpu = (
      navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }
    ).gpu;
    if (!gpu || !(await gpu.requestAdapter()))
      throw Error(
        "Ce navigateur ne dispose pas de WebGPU. Essayez Chrome ou Edge à jour avec l’accélération graphique activée.",
      );
    worker = new Worker(new URL("./local.worker.ts", import.meta.url), {
      type: "module",
    });
    const cancellation = new Promise<never>((_, reject) => {
      cancelLoading = () => reject(Error("MODEL_LOAD_CANCELLED"));
    });
    try {
      engine = await Promise.race([
        CreateWebWorkerMLCEngine(worker, modelIds[mode], {
          initProgressCallback: progress,
          logLevel: "WARN",
        }),
        cancellation,
      ]);
    } catch (e) {
      worker?.terminate();
      worker = null;
      engine = null;
      if (e instanceof Error && e.message === "MODEL_LOAD_CANCELLED") throw e;
      throw Error(
        "Le modèle n’a pas pu être chargé. Vérifiez votre connexion, l’espace disponible et la mémoire graphique, puis réessayez.",
      );
    } finally {
      cancelLoading = null;
    }
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}
export async function localReply(
  question: string,
  history: Message[],
  config: PcConfig,
  onText: (text: string) => void,
) {
  if (!engine) throw Error("Chargez d’abord le modèle gratuit.");
  if (/prix|co[uû]t|tarif|offres?/i.test(question)) {
    const query = priceQueryFrom(question, config);
    if (!query)
      return "Indiquez une référence précise (par exemple le modèle du processeur ou de la carte graphique), ou ouvrez la page Prix pour comparer les offres.";
    const { findPrices } = await import("../prices");
    const result = await findPrices(query);
    if (!result.offers.length)
      return `Aucun prix vérifiable pour ${query} dans les pages consultées. Élargissez la recherche dans la page Prix ; ce résultat ne signifie pas que le produit est indisponible.`;
    const lines = result.offers
      .slice(0, 4)
      .map(
        (o) =>
          `${o.merchant} : ${o.component} — ${o.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} hors livraison. Source : ${o.url} (lu le ${new Date(o.observedAt).toLocaleString("fr-FR")}).`,
      );
    return `Offres relevées pour ${query} :\n\n${lines.join("\n\n")}\n\nCouverture partielle. Vérifiez la variante, le vendeur et les frais de port ; la page Prix permet d’ouvrir les offres. Ces prix viennent des sources marchandes, pas du modèle.`;
  }
  const diagnostic = groundedDiagnostic(question, config);
  if (diagnostic) return diagnostic;
  const context = await assistantContext(config, question);
  const stream = await engine.chat.completions.create({
    messages: localMessages(question, history, context),
    stream: true,
    max_tokens: 600,
    temperature: 0.7,
    ...(engine.modelId?.includes(modelIds.light) ? { extra_body: { enable_thinking: false }, presence_penalty: 1.5 } : {}),
  });
  let text = "";
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta.content ?? "";
  }
  if (!text.trim())
    throw Error("Aucune réponse générée. Essayez une question plus courte.");
  if (/\b\d+(?:[.,]\d+)?\s*(?:fps|images par seconde|€|euros?|%)/i.test(text)) {
    text =
      "Je ne dispose pas de benchmark vérifié pour annoncer des FPS ou un gain de performance. Votre objectif FPS reste une cible. Mesurez une scène reproductible avant et après chaque changement ; pour un achat, consultez la page Prix qui relève des offres marchandes.";
    onText(text);
  }
  onText(text);
  return text.trim();
}
export function stopLocalReply() {
  engine?.interruptGenerate();
}
export async function unloadLocalModel() {
  if (engine) await engine.unload();
  worker?.terminate();
  worker = null;
  engine = null;
}

export function cancelLocalModelLoad() {
  cancelLoading?.();
}
