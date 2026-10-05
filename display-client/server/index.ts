import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Response } from "express";
import { atomicWriteJson, readCache, readStoredConfig, type CacheRecord } from "./storage.js";
import {
  isAllowedDiaryUrl,
  loadRuntimeConfig,
  mergeSettings,
  type StoredConfig,
} from "./config.js";
import { fetchLatest, Poller, type FetchResult } from "./poller.js";
import { getStaleness, type DisplayState, type PublicSettings } from "../shared/state.js";

const runtime = loadRuntimeConfig();
const configPath = path.join(runtime.dataDir, "config.json");
const cachePath = path.join(runtime.dataDir, "cache.json");
let storedConfig = await readStoredConfig(configPath);
const cached = await readCache(cachePath);
const clients = new Set<Response>();
let serverSettings: Partial<PublicSettings> | null = cached?.payload.displaySettings ?? null;
const effectiveSettings = () => mergeSettings(runtime.defaultSettings, serverSettings ? { ...(storedConfig ?? {}), ...serverSettings } : storedConfig);

const credentials = () => {
  const apiKey = storedConfig && Object.hasOwn(storedConfig, "apiKey")
    ? storedConfig.apiKey
    : runtime.defaultApiKey;
  const serverUrl = storedConfig && Object.hasOwn(storedConfig, "diaryServerUrl")
    ? storedConfig.diaryServerUrl
    : runtime.defaultServerUrl;
  return apiKey && serverUrl ? { apiKey, serverUrl } : null;
};

let state: DisplayState = {
  phase: credentials() ? (cached ? "ready" : "waiting") : "setup",
  connection: cached ? "offline" : "offline",
  payload: cached?.payload ?? null,
  lastSuccessAt: cached?.lastSuccessAt ?? null,
  staleness: getStaleness(
    cached?.lastSuccessAt ?? null,
    false,
    effectiveSettings().staleAfterHours,
  ),
  clockWarning: new Date().getFullYear() < 2024,
  setupDefaultUrl: credentials() ? undefined : runtime.defaultServerUrl,
  settings: effectiveSettings(),
};
let lastBroadcast = "";

function publicState(): DisplayState {
  const settings = effectiveSettings();
  return {
    ...state,
    settings,
    setupDefaultUrl: state.phase === "setup" ? runtime.defaultServerUrl : undefined,
    clockWarning: new Date().getFullYear() < 2024,
    staleness: getStaleness(
      state.lastSuccessAt,
      state.connection === "online",
      settings.staleAfterHours,
    ),
  };
}

function broadcast(force = false): void {
  const json = JSON.stringify(publicState());
  if (!force && json === lastBroadcast) return;
  lastBroadcast = json;
  for (const client of clients) client.write(`event: state\ndata: ${json}\n\n`);
}

async function handlePollResult(result: FetchResult): Promise<void> {
  if (result.kind === "success") {
    serverSettings = result.payload.displaySettings ?? null;
    const now = new Date().toISOString();
    const cache: CacheRecord = { payload: result.payload, lastSuccessAt: now };
    await atomicWriteJson(cachePath, cache);
    state = {
      ...state,
      phase: "ready",
      connection: "online",
      payload: result.payload,
      lastSuccessAt: now,
    };
  } else if (result.kind === "invalid-key") {
    state = { ...state, phase: "setup", connection: "invalid-key", payload: null };
  } else {
    state = {
      ...state,
      phase: state.payload ? "ready" : "waiting",
      connection: "offline",
    };
  }
  broadcast();
}

const poller = new Poller({
  getCredentials: credentials,
  onResult: handlePollResult,
  intervalMs: runtime.pollIntervalMs,
  timeoutMs: runtime.requestTimeoutMs,
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  );
  next();
});

app.get("/local/state", (_request, response) => response.json(publicState()));

app.get("/local/events", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();
  clients.add(response);
  response.write(`event: state\ndata: ${JSON.stringify(publicState())}\n\n`);
  const keepAlive = setInterval(() => response.write(": keepalive\n\n"), 20_000);
  request.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(response);
  });
});

app.post("/local/setup", async (request, response) => {
  const serverUrl = String(request.body?.serverUrl || "").trim().replace(/\/$/, "");
  const apiKey = String(request.body?.apiKey || "").trim();
  if (!isAllowedDiaryUrl(serverUrl))
    return response.status(400).json({ error: "Use an HTTPS Diary Server URL (HTTP is allowed only for localhost development)." });
  if (!apiKey || apiKey.length > 512)
    return response.status(400).json({ error: "Enter a valid display API key." });
  const result = await fetchLatest({ serverUrl, apiKey }, runtime.requestTimeoutMs);
  if (result.kind !== "success") {
    const messages = {
      "invalid-key": "That display key is invalid or has been revoked.",
      unreachable: result.kind === "unreachable" ? result.message : "",
      malformed: result.kind === "malformed" ? `Unexpected Diary Server response: ${result.message}` : "",
    };
    const status = result.kind === "invalid-key" ? 401 : result.kind === "malformed" ? 502 : 503;
    return response.status(status).json({ error: messages[result.kind] });
  }
  storedConfig = { ...(storedConfig ?? {}), diaryServerUrl: serverUrl, apiKey };
  await atomicWriteJson(configPath, storedConfig);
  await handlePollResult(result);
  poller.restart();
  return response.json({ ok: true });
});

app.post("/local/settings", async (request, response) => {
  const body = request.body as Partial<PublicSettings>;
  const allowedScales = ["normal", "large", "largest"];
  const next: StoredConfig = { ...(storedConfig ?? {}) };
  if (allowedScales.includes(String(body.textScale))) next.textScale = body.textScale;
  if (typeof body.highContrast === "boolean") next.highContrast = body.highContrast;
  if (typeof body.pixelShiftEnabled === "boolean") next.pixelShiftEnabled = body.pixelShiftEnabled;
  if (typeof body.idleReturnSeconds === "number")
    next.idleReturnSeconds = Math.min(3600, Math.max(10, Math.round(body.idleReturnSeconds)));
  storedConfig = next;
  await atomicWriteJson(configPath, storedConfig);
  state = { ...state, settings: effectiveSettings() };
  broadcast(true);
  return response.json({ ok: true, settings: state.settings });
});

app.post("/local/reset", async (_request, response) => {
  storedConfig = { ...(storedConfig ?? {}), apiKey: "" };
  await atomicWriteJson(configPath, storedConfig);
  poller.stop();
  state = {
    ...state,
    phase: "setup",
    connection: "offline",
    payload: null,
    lastSuccessAt: null,
  };
  broadcast(true);
  return response.json({ ok: true });
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(currentDir, "../../dist");
app.use(express.static(webRoot, {
  index: "index.html",
  setHeaders: (response, filePath) => {
    if (path.basename(filePath) === "index.html")
      response.setHeader("Cache-Control", "no-cache");
    else if (filePath.includes(`${path.sep}assets${path.sep}`))
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));
app.get("/{*path}", (_request, response) => {
  response.setHeader("Cache-Control", "no-cache");
  response.sendFile(path.join(webRoot, "index.html"));
});

const server = app.listen(runtime.port, "127.0.0.1", () => {
  console.log(`Digital Office Display listening on http://127.0.0.1:${runtime.port}`);
  poller.start();
});

function shutdown(): void {
  poller.stop();
  for (const client of clients) client.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
