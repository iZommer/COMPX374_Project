import type { DiaryPayload } from "./payload.js";

export type ConnectionState = "online" | "offline" | "invalid-key";
export type DisplayPhase = "setup" | "waiting" | "ready";
export type Staleness = "fresh" | "outdated" | "stale";

export interface PublicSettings {
  timezone: string;
  idleReturnSeconds: number;
  staleAfterHours: number;
  textScale: "normal" | "large" | "largest";
  highContrast: boolean;
  pixelShiftEnabled: boolean;
  dimStartHour: number | null;
  dimEndHour: number | null;
}

export interface DisplayState {
  phase: DisplayPhase;
  connection: ConnectionState;
  payload: DiaryPayload | null;
  lastSuccessAt: string | null;
  staleness: Staleness;
  clockWarning: boolean;
  setupDefaultUrl?: string;
  settings: PublicSettings;
}

export function getStaleness(
  lastSuccessAt: string | null,
  online: boolean,
  staleAfterHours: number,
  now = Date.now(),
): Staleness {
  if (!lastSuccessAt) return online ? "fresh" : "outdated";
  if (now - Date.parse(lastSuccessAt) >= staleAfterHours * 3_600_000)
    return "stale";
  return online ? "fresh" : "outdated";
}
