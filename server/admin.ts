import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Transaction } from "firebase-admin/firestore";
export function admin() {
  const {
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_CLIENT_EMAIL: clientEmail,
    FIREBASE_PRIVATE_KEY: privateKey,
  } = process.env;
  if (!projectId || !clientEmail || !privateKey)
    throw Error("SERVER_NOT_CONFIGURED");
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  return { auth: getAuth(app), db: getFirestore(app) };
}
export async function consumeQuota(uid: string) {
  const { db } = admin();
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`users/${uid}/privateUsage/${day}`);
  await db.runTransaction(async (tx: Transaction) => {
    const data = await tx.get(ref);
    const count = data.data()?.count ?? 0;
    if (count >= 30) throw Error("QUOTA_EXCEEDED");
    tx.set(ref, { count: count + 1 });
  });
}
