import { z } from "zod";
import type { Message } from "./domain";
export const MAX_DISCUSSIONS = 5;
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(12000),
});
const threadSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(80),
  updatedAt: z.string(),
  messages: z.array(messageSchema).max(50),
  active: z.boolean().optional(),
});
export type Discussion = z.infer<typeof threadSchema>;
export type ChatStore = { threads: Discussion[]; activeId: string | null };
export function decodeChats(value: unknown): ChatStore {
  const legacy = z.array(messageSchema).max(50).safeParse(value);
  if (legacy.success && legacy.data.length) {
    const thread: Discussion = {
      id: "legacy",
      title:
        legacy.data.find((m) => m.role === "user")?.content.slice(0, 60) ||
        "Discussion précédente",
      updatedAt: new Date().toISOString(),
      messages: legacy.data,
    };
    return { threads: [thread], activeId: thread.id };
  }
  const parsed = z.array(threadSchema).max(MAX_DISCUSSIONS).safeParse(value);
  if (!parsed.success) return { threads: [], activeId: null };
  const threads = parsed.data.filter(
    (thread, i, all) => all.findIndex((t) => t.id === thread.id) === i,
  );
  return {
    threads,
    activeId:
      threads.find((t) => t.active)?.id ??
      [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
        ?.id ??
      null,
  };
}
export function encodeChats(store: ChatStore): Discussion[] {
  const threads = store.threads
    .slice(0, MAX_DISCUSSIONS)
    .map((t) => ({
      ...t,
      messages: t.messages
        .slice(-50)
        .map((m) => ({ ...m, content: m.content.slice(0, 4000) })),
      active: t.id === store.activeId,
    }));
  // Keep the account document comfortably below Firestore's one MiB limit.
  while (new TextEncoder().encode(JSON.stringify(threads)).length > 700000) {
    const oldest = [...threads]
      .filter((t) => t.messages.length > 2)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    if (!oldest) break;
    oldest.messages.splice(0, 2);
  }
  return threads;
}
export function createDiscussion(store: ChatStore): ChatStore {
  if (store.threads.length >= MAX_DISCUSSIONS)
    throw Error(
      "Vous avez déjà cinq discussions. Supprimez-en une pour en créer une nouvelle.",
    );
  const thread: Discussion = {
    id: crypto.randomUUID(),
    title: "Nouvelle discussion",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  return { threads: [thread, ...store.threads], activeId: thread.id };
}
export function updateDiscussion(
  store: ChatStore,
  messages: Message[],
): ChatStore {
  const next = store.activeId ? store : createDiscussion(store);
  return decodeChats(
    encodeChats({
      ...next,
      threads: next.threads.map((t) =>
        t.id === next.activeId
          ? {
              ...t,
              messages,
              title:
                messages.find((m) => m.role === "user")?.content.slice(0, 60) ||
                t.title,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }),
  );
}
export function deleteDiscussion(store: ChatStore, id: string): ChatStore {
  const threads = store.threads.filter((t) => t.id !== id);
  return {
    threads,
    activeId:
      store.activeId !== id
        ? store.activeId
        : ([...threads].sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt),
          )[0]?.id ?? null),
  };
}
