import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { z } from "zod";

const defaults = { textScale: "normal", highContrast: false, pixelShiftEnabled: true, idleReturnSeconds: 60, staleAfterHours: 24, dimStartHour: 19, dimEndHour: 7, dimLevel: 55, timeFormat24h: true } as const;
const settingsInput = z.object({
  textScale: z.enum(["normal", "large", "largest"]), highContrast: z.boolean(), pixelShiftEnabled: z.boolean(),
  idleReturnSeconds: z.number().int().min(10).max(3600), staleAfterHours: z.number().int().min(1).max(720),
  dimStartHour: z.number().int().min(0).max(23), dimEndHour: z.number().int().min(0).max(23),
  dimLevel: z.number().int().min(10).max(100), timeFormat24h: z.boolean(),
}).strict();

export const GET = route(async (req) => {
  const academic = await academicFor(req);
  const settings = await db.displayClientSettings.findUnique({ where: { academicId: academic.id } });
  return json({ ...defaults, ...(settings ?? {}), defaults, appliedAt: settings?.updatedAt ?? null });
});

export const PUT = route(async (req) => {
  const academic = await academicFor(req);
  const data = settingsInput.parse(await body(req));
  const settings = await db.displayClientSettings.upsert({ where: { academicId: academic.id }, create: { academicId: academic.id, ...data }, update: data });
  return json({ ...settings, defaults, appliedAt: settings.updatedAt });
});
