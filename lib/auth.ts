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
  const token = await auth.verifyIdToken(match[1], true).catch(() => {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
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
