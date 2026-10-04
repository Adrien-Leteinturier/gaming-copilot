import { decodeChats, encodeChats, type ChatStore } from "./discussions";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import type { PcConfig, Alert, Message } from "./domain";
const env = import.meta.env;
export const cloudReady = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID,
);
const app = cloudReady
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  : null;
export const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
export const login = () => {
  if (!auth) throw Error("Firebase doit être configuré.");
  return signInWithPopup(auth, new GoogleAuthProvider());
};
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
export async function loadCloud(uid: string) {
  if (!db) throw Error("Firebase indisponible");
  const [pc, alerts, chats] = await Promise.all([
    getDoc(doc(db, "pcConfigs", uid)),
    getDocs(query(collection(db, "priceAlerts"), where("ownerId", "==", uid))),
    getDoc(doc(db, "conversations", uid)),
  ]);
  return {
    config: pc.exists() ? (pc.data().config as PcConfig) : null,
    alerts: alerts.docs.map((d) => ({ id: d.id, ...d.data().alert }) as Alert),
    chatStore: decodeChats(chats.exists() ? chats.data().messages : []),
  };
}
export async function saveConfig(uid: string, config: PcConfig) {
  await setDoc(doc(db!, "pcConfigs", uid), {
    ownerId: uid,
    config,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(
    doc(db!, "users", uid),
    { ownerId: uid, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
export async function saveAlert(uid: string, alert: Alert) {
  await setDoc(doc(db!, "priceAlerts", alert.id), { ownerId: uid, alert });
}
export async function removeAlert(uid: string, id: string) {
  void uid;
  await deleteDoc(doc(db!, "priceAlerts", id));
}
export async function saveChats(uid: string, store: ChatStore) {
  await setDoc(doc(db!, "conversations", uid), {
    ownerId: uid,
    messages: encodeChats(store),
    updatedAt: new Date().toISOString(),
  });
}
