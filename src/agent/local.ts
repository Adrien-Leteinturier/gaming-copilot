import { withDeadline } from "./timeout";
import { quickReply } from "./quick";
import {
  CreateWebWorkerMLCEngine,
  hasModelInCache,
  type WebWorkerMLCEngine,
  type InitProgressReport,
} from "@mlc-ai/web-llm";
import type { Message, PcConfig } from "../domain";
import {
  assistantContext,
  localMessages,
  cleanModelReply,
  groundedReply,
} from "./context";
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
        withDeadline(
          CreateWebWorkerMLCEngine(worker, modelIds[mode], {
            initProgressCallback: progress,
            logLevel: "WARN",
          }),
          180000,
          () => {
            worker?.terminate();
            worker = null;
            engine = null;
          },
          "MODEL_TIMEOUT : le chargement a dépassé trois minutes. Vérifiez la connexion puis réessayez.",
        ),
        cancellation,
      ]);
    } catch (e) {
      worker?.terminate();
      worker = null;
      engine = null;
      if (
        e instanceof Error &&
        (e.message === "MODEL_LOAD_CANCELLED" ||
          e.message.includes("MODEL_TIMEOUT"))
      )
        throw e;
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
  const evidence = await quickReply(question, config, history);
  // Merchant results remain exact, source-attributed data, never rewritten by the model.
  if (
    evidence &&
    /Offres relevées|Offres vérifiées/i.test(evidence) &&
    /prix|co[uû]t|tarif|offres?/i.test(question)
  )
    return evidence;
  if (!engine) throw Error("Chargez d’abord le modèle gratuit.");
  const context = await assistantContext(config, question);
  const activeEngine = engine;
  let text = await withDeadline(
    (async () => {
      const stream = await activeEngine.chat.completions.create({
        messages: localMessages(question, history, context, evidence ?? ""),
        stream: true,
        max_tokens: 800,
        temperature: 0.2,
        ...(activeEngine.modelId?.some((id) => id.includes("Qwen3"))
          ? { extra_body: { enable_thinking: false }, presence_penalty: 0 }
          : {}),
      });
      let text = "";
      for await (const chunk of stream) {
        text += chunk.choices[0]?.delta.content ?? "";
      }
      return text;
    })(),
    90000,
    () => {
      worker?.terminate();
      worker = null;
      engine = null;
    },
    "MODEL_TIMEOUT : le calcul n’a pas terminé sur cet appareil après 90 secondes. Rechargez le modèle pour réessayer.",
  );
  text = cleanModelReply(text);
  if (!text.trim())
    throw Error("Aucune réponse générée. Essayez une question plus courte.");
  text = groundedReply(
    text,
    [
      question,
      context,
      evidence ?? "",
      ...history
        .filter((m) => m.role === "user")
        .slice(-8)
        .map((m) => m.content),
    ].join("\n"),
  );
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

export async function cachedModelModes(): Promise<ModelMode[]> {
  const modes = Object.keys(modelIds) as ModelMode[];
  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        return (await hasModelInCache(modelIds[mode])) ? mode : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((mode): mode is ModelMode => mode !== null);
}
