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
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      cache: "no-store",
    });
    const endpoint = `/api/${path.split("?")[0]}`;
    const contentType = response.headers.get("content-type") ?? "";
    const invalidResponse = () =>
      new Error(
        `The server returned an unexpected response for ${endpoint} (HTTP ${response.status}). ` +
          "Check the deployment's API routes and runtime logs.",
      );
    if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|\s*$)/i.test(contentType))
      throw invalidResponse();
    let data;
    try {
      data = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw invalidResponse();
      throw error;
    }
    if (!response.ok)
      throw new Error(
        typeof data?.error === "string" && data.error
          ? data.error
          : `The request could not be completed (HTTP ${response.status}).`,
      );
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
