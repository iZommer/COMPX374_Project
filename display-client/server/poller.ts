import { validateDiaryPayload, type DiaryPayload } from "../shared/payload.js";

export interface Credentials {
  serverUrl: string;
  apiKey: string;
}

export type FetchResult =
  | { kind: "success"; payload: DiaryPayload }
  | { kind: "invalid-key" }
  | { kind: "unreachable"; message: string }
  | { kind: "malformed"; message: string };

export type FetchLike = typeof fetch;

export async function fetchLatest(
  credentials: Credentials,
  timeoutMs: number,
  fetchFn: FetchLike = fetch,
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint = `${credentials.serverUrl.replace(/\/$/, "")}/api/display/${encodeURIComponent(credentials.apiKey)}/latest`;
  try {
    const response = await fetchFn(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      redirect: "error",
    });
    if (response.status === 401 || response.status === 404)
      return { kind: "invalid-key" };
    if (!response.ok)
      return { kind: "unreachable", message: `Diary Server returned ${response.status}.` };
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: "malformed", message: "Diary Server did not return JSON." };
    }
    const validated = validateDiaryPayload(body);
    return validated.ok
      ? { kind: "success", payload: validated.value }
      : { kind: "malformed", message: validated.error };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Diary Server request timed out."
      : "Diary Server is unreachable.";
    return { kind: "unreachable", message };
  } finally {
    clearTimeout(timeout);
  }
}

export function backoffDelay(failureCount: number, normalIntervalMs: number): number {
  if (failureCount <= 1) return normalIntervalMs;
  if (failureCount === 2) return Math.max(normalIntervalMs, 15_000);
  return 30_000;
}

export interface PollerOptions {
  getCredentials: () => Credentials | null;
  onResult: (result: FetchResult) => void | Promise<void>;
  intervalMs: number;
  timeoutMs: number;
  fetchFn?: FetchLike;
}

export class Poller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private running = false;
  private failures = 0;

  constructor(private readonly options: PollerOptions) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(0);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  restart(): void {
    this.stop();
    this.failures = 0;
    this.start();
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.run(), delay);
  }

  private async run(): Promise<void> {
    if (this.stopped || this.running) return;
    const credentials = this.options.getCredentials();
    if (!credentials) return;
    this.running = true;
    const result = await fetchLatest(
      credentials,
      this.options.timeoutMs,
      this.options.fetchFn,
    );
    this.running = false;
    if (this.stopped) return;
    await this.options.onResult(result);
    if (this.stopped || result.kind === "invalid-key") return;
    if (result.kind === "success") {
      this.failures = 0;
      this.schedule(this.options.intervalMs);
    } else {
      this.failures += 1;
      this.schedule(backoffDelay(this.failures, this.options.intervalMs));
    }
  }
}
