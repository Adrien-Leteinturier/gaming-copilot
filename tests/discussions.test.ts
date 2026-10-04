import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeChats, encodeChats, createDiscussion, updateDiscussion, deleteDiscussion } from "../src/discussions";
const empty = () => ({ threads: [], activeId: null });
test("five discussions maximum without automatic eviction", () => {
  let store = empty() as ReturnType<typeof decodeChats>;
  for(let i=0;i<5;i++) store=createDiscussion(store);
  assert.equal(store.threads.length,5);
  assert.throws(() => createDiscussion(store),/cinq/);
  const removed=deleteDiscussion(store,store.activeId!);
  assert.equal(removed.threads.length,4);
  assert.ok(removed.threads.some(t=>t.id===removed.activeId));
  assert.equal(createDiscussion(removed).threads.length,5);
});
test("legacy history migrates, active discussion restores, and histories remain separate", () => {
  let store=decodeChats([{role:"user",content:"Ancien échange"},{role:"assistant",content:"Ancienne réponse"}]);
  assert.equal(store.threads.length,1);
  const oldId=store.activeId;
  store=createDiscussion(store);
  store=updateDiscussion(store,[{role:"user",content:"Nouveau sujet"},{role:"assistant",content:"Nouvelle réponse"}]);
  const restored=decodeChats(JSON.parse(JSON.stringify(encodeChats(store))));
  assert.equal(restored.activeId,store.activeId);
  assert.equal(restored.threads.find(t=>t.id===oldId)?.messages[0].content,"Ancien échange");
  assert.equal(restored.threads.find(t=>t.id===store.activeId)?.title,"Nouveau sujet");
  const deleted=deleteDiscussion(restored,store.activeId!);
  assert.equal(deleted.activeId,oldId);
  assert.deepEqual(decodeChats(encodeChats(deleteDiscussion(deleted,oldId!))),empty());
});
test("storage rejects corrupt records and bounds UTF-8 document size", () => {
  assert.deepEqual(decodeChats([{id:"broken",messages:[null]}]),empty());
  let store=createDiscussion(empty());
  for(let i=0;i<4;i++)store=createDiscussion(store);
  store.threads=store.threads.map(t=>({...t,messages:Array.from({length:50},()=>({role:"user" as const,content:"界".repeat(4000)}))}));
  const encoded=encodeChats(store);
  assert.ok(new TextEncoder().encode(JSON.stringify(encoded)).length<=700000);
  assert.ok(encoded.every(t=>t.messages.length<=50));
});
