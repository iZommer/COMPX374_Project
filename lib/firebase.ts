"use client";
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export function clientAuth() {
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_WEB_API_KEY"
  )
    throw new Error(
      "Firebase is not configured. Add the Firebase Web settings from .env.example to your environment.",
    );
  return getAuth(
    getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }),
  );
}
