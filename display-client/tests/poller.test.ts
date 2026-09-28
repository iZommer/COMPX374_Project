import { afterEach, describe, expect, it, vi } from "vitest";
import { backoffDelay, Poller } from "../server/poller.js";
import { validPayload } from "./fixtures.js";

afterEach(() => vi.useRealTimers());

describe("poll scheduling", () => {
  it("uses capped exponential backoff", () => {
    expect(backoffDelay(1, 10_000)).toBe(10_000);
    expect(backoffDelay(2, 10_000)).toBe(15_000);
    expect(backoffDelay(3, 10_000)).toBe(30_000);
    expect(backoffDelay(20, 10_000)).toBe(30_000);
  });

  it("does not overlap requests and resumes normal interval after success", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (value: Response) => void;
    const fetchFn = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200, headers: { "content-type": "application/json" } }));
    const results: string[] = [];
    const poller = new Poller({
      getCredentials: () => ({ serverUrl: "https://example.test", apiKey: "key" }),
      onResult: (result) => { results.push(result.kind); },
      intervalMs: 10_000,
      timeoutMs: 8_000,
      fetchFn,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    resolveFirst(new Response(JSON.stringify(validPayload), { status: 200 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(results).toEqual(["success"]);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    poller.stop();
  });
});
