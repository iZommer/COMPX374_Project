import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createPrivateKey } from "node:crypto";
import { HttpError } from "@/lib/http";

export function adminCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  ).trim();
  let reason = "";
  if (!projectId || !clientEmail || !privateKey) {
    reason =
      "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY from the Firebase service account JSON.";
  } else {
    try {
      if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----"))
        throw new Error();
      const key = createPrivateKey(privateKey);
      if (key.asymmetricKeyType !== "rsa") throw new Error();
    } catch {
      reason =
        "FIREBASE_PRIVATE_KEY must contain the complete PEM private_key from the service account JSON, not private_key_id or the Web API key.";
    }
  }
  if (reason) {
    // This explanation is fixed text; never include the actual environment values.
    console.error("[diary-api] Firebase Admin configuration error:", reason);
    throw new HttpError(
      503,
      "Server authentication is not configured correctly. Check the Firebase Admin service account settings.",
    );
  }
  return { projectId, clientEmail, privateKey };
}

export function adminAuth() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(adminCredentials()),
    });
  return getAuth(app);
}
