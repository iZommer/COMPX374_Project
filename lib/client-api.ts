"use client";
import { clientAuth } from "./firebase";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const user = clientAuth().currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`/api/${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "The request could not be completed.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
