import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
export function route(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          {
            error: error.issues
              .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
              .join("; "),
          },
          400,
        );
      if (error instanceof SyntaxError)
        return json({ error: "Invalid JSON request." }, 400);
      // Never log tokens, request bodies, calendar contents, or database connection strings.
      return json(
        { error: "The diary service is unavailable. Please try again." },
        503,
      );
    }
  };
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send application/json.");
  const text = await limitedText(request, 16_384);
  return JSON.parse(text);
}
export async function limitedText(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, "The upload is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
