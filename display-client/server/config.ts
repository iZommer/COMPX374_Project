import path from "node:path";
import type { PublicSettings } from "../shared/state.js";

export interface StoredConfig extends Partial<PublicSettings> {
  apiKey?: string;
  diaryServerUrl?: string;
}

export interface RuntimeConfig {
  port: number;
  dataDir: string;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  defaultApiKey?: string;
  defaultServerUrl: string;
  defaultSettings: PublicSettings;
}

const numberFromEnv = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

const optionalHour = (name: string, fallback: number | null) => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
};

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    port: numberFromEnv("PORT", 3000, 1024, 65535),
    dataDir: path.resolve(process.env.DATA_DIR || "./data"),
    pollIntervalMs:
      numberFromEnv("POLL_INTERVAL_SECONDS", 10, 1, 15) * 1000,
    requestTimeoutMs: numberFromEnv("REQUEST_TIMEOUT_MS", 8000, 1000, 30000),
    defaultApiKey: process.env.DISPLAY_API_KEY?.trim() || undefined,
    defaultServerUrl: (process.env.DIARY_SERVER_URL || "").trim().replace(/\/$/, ""),
    defaultSettings: {
      timezone: process.env.TIMEZONE || "Pacific/Auckland",
      idleReturnSeconds: numberFromEnv("IDLE_RETURN_SECONDS", 60, 10, 3600),
      staleAfterHours: numberFromEnv("STALE_AFTER_HOURS", 24, 1, 720),
      textScale: "normal",
      highContrast: false,
      pixelShiftEnabled: process.env.PIXEL_SHIFT_ENABLED !== "false",
      dimStartHour: optionalHour("DIM_START_HOUR", 19),
      dimEndHour: optionalHour("DIM_END_HOUR", 7),
    },
  };
}

export function mergeSettings(
  defaults: PublicSettings,
  stored: StoredConfig | null,
): PublicSettings {
  return {
    timezone: stored?.timezone || defaults.timezone,
    idleReturnSeconds: stored?.idleReturnSeconds ?? defaults.idleReturnSeconds,
    staleAfterHours: stored?.staleAfterHours ?? defaults.staleAfterHours,
    textScale: stored?.textScale ?? defaults.textScale,
    highContrast: stored?.highContrast ?? defaults.highContrast,
    pixelShiftEnabled: stored?.pixelShiftEnabled ?? defaults.pixelShiftEnabled,
    dimStartHour: stored?.dimStartHour ?? defaults.dimStartHour,
    dimEndHour: stored?.dimEndHour ?? defaults.dimEndHour,
  };
}

export function isAllowedDiaryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol === "https:") return true;
    return (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
