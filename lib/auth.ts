import "server-only";
import { randomBytes } from "node:crypto";
import { adminAuth } from "@/lib/admin";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
export const newKey = () => randomBytes(32).toString("hex");
export async function academicFor(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer (\S+)$/);
  if (!match) throw new HttpError(401, "Please sign in to continue.");
  const auth = adminAuth();
  const token = await auth
    .verifyIdToken(match[1], true)
    .catch((error: unknown) => {
      const code = (error as { code?: unknown } | null)?.code;
      if (code === "auth/id-token-expired")
        throw new HttpError(
          401,
          "Your session has expired. Please sign in again.",
        );
      if (code === "auth/id-token-revoked" || code === "auth/user-not-found")
        throw new HttpError(
          401,
          "Your session is no longer valid. Please sign in again.",
        );
      if (code === "auth/user-disabled")
        throw new HttpError(403, "This account has been disabled.");
      if (code === "auth/argument-error" || code === "auth/invalid-id-token")
        throw new HttpError(
          401,
          "Your sign-in token could not be verified. Please sign in again.",
        );
      // Credential, clock, permission, and network failures are server errors,
      // not evidence that the user's session expired. Never log the raw error.
      const knownCodes = new Set([
        "app/invalid-credential",
        "auth/invalid-credential",
        "auth/insufficient-permission",
        "auth/internal-error",
        "app/network-error",
      ]);
      console.error("[diary-api] Firebase verification unavailable", {
        code:
          code === 400
            ? "credential-request-rejected"
            : typeof code === "string" && knownCodes.has(code)
              ? code
              : "unknown",
        hint: "Check the server clock, Firebase Admin credentials, permissions, and network connectivity.",
      });
      throw new HttpError(
        503,
        "The authentication service is unavailable. Please try again after the server configuration is checked.",
      );
    });
  if (token.firebase.sign_in_provider !== "password" || !token.email)
    throw new HttpError(403, "An email/password account is required.");
  const existing = await db.academic.findUnique({
    where: { firebaseUid: token.uid },
  });
  if (existing) return existing;
  // Provision all owned records together. A unique UID prevents duplicate accounts.
  try {
    return await db.academic.create({
      data: {
        firebaseUid: token.uid,
        email: token.email,
        name: token.name || token.email.split("@")[0],
        availability: { create: {} },
        contact: { create: { email: token.email } },
        display: { create: { apiKey: newKey() } },
      },
    });
  } catch (error) {
    const raced = await db.academic.findUnique({
      where: { firebaseUid: token.uid },
    });
    if (raced) return raced;
    throw error;
  }
}
