import { afterEach, expect, it, vi } from "vitest";
import { api } from "../lib/client-api";

vi.mock("../lib/firebase", () => ({
  clientAuth: () => ({
    currentUser: { getIdToken: async () => "test-token" },
  }),
}));

afterEach(() => vi.unstubAllGlobals());

it.each([200, 404, 500, 502])(
  "reports HTML responses with their endpoint and HTTP %s without leaking the page",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            "<!DOCTYPE html><html>private platform diagnostic</html>",
            { status, headers: { "Content-Type": "text/html" } },
          ),
        ),
    );
    const error = await api("availability?private=value").catch((e) => e);
    if (!(error instanceof Error)) throw new Error("Expected a request error");
    expect(error.message).toContain(`/api/availability (HTTP ${status})`);
    expect(error.message).not.toContain("private");
    expect(error.message).not.toContain("Unexpected token");
  },
);

it("reports invalid JSON even when the server labels it as JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html>", {
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await expect(api("availability")).rejects.toThrow("unexpected response");
});

it("preserves actionable JSON API errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "Server authentication is not configured correctly." },
          { status: 503 },
        ),
      ),
  );
  await expect(api("availability")).rejects.toThrow(
    "Server authentication is not configured correctly.",
  );
});

it("handles a null JSON error body without a property access failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(null, { status: 503 })),
  );
  await expect(api("availability")).rejects.toThrow("HTTP 503");
});

it("returns successful JSON data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ status: "AVAILABLE" })),
  );
  await expect(api("availability")).resolves.toEqual({ status: "AVAILABLE" });
});
