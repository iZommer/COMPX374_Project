import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { DiaryPayload } from "../shared/payload.js";
import { validateDiaryPayload } from "../shared/payload.js";
import type { StoredConfig } from "./config.js";

export interface CacheRecord {
  payload: DiaryPayload;
  lastSuccessAt: string;
}

export async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tempPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function readStoredConfig(filePath: string): Promise<StoredConfig | null> {
  const value = await readJson(filePath);
  if (!isObject(value)) return null;
  const config: StoredConfig = {};
  if (typeof value.apiKey === "string") config.apiKey = value.apiKey;
  if (typeof value.diaryServerUrl === "string") config.diaryServerUrl = value.diaryServerUrl;
  if (typeof value.timezone === "string") config.timezone = value.timezone;
  if (typeof value.idleReturnSeconds === "number") config.idleReturnSeconds = value.idleReturnSeconds;
  if (typeof value.staleAfterHours === "number") config.staleAfterHours = value.staleAfterHours;
  if (["normal", "large", "largest"].includes(String(value.textScale)))
    config.textScale = value.textScale as StoredConfig["textScale"];
  if (typeof value.highContrast === "boolean") config.highContrast = value.highContrast;
  if (typeof value.pixelShiftEnabled === "boolean")
    config.pixelShiftEnabled = value.pixelShiftEnabled;
  if (typeof value.dimStartHour === "number" || value.dimStartHour === null)
    config.dimStartHour = value.dimStartHour as number | null;
  if (typeof value.dimEndHour === "number" || value.dimEndHour === null)
    config.dimEndHour = value.dimEndHour as number | null;
  return config;
}

export async function readCache(filePath: string): Promise<CacheRecord | null> {
  const value = await readJson(filePath);
  if (!isObject(value) || typeof value.lastSuccessAt !== "string") return null;
  if (!Number.isFinite(Date.parse(value.lastSuccessAt))) return null;
  const payload = validateDiaryPayload(value.payload);
  return payload.ok ? { payload: payload.value, lastSuccessAt: value.lastSuccessAt } : null;
}
