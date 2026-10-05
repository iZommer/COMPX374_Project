import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, HttpError, json, route } from "@/lib/http";
import { eventInput } from "@/lib/validation";
import { weekRange } from "@/lib/time";
export const GET = route(async (req) => {
  const a = await academicFor(req);
  const date = new URL(req.url).searchParams.get("week") || undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new HttpError(400, "Week must be YYYY-MM-DD.");
  let range;
  try {
    range = weekRange(date);
  } catch {
    throw new HttpError(400, "Invalid week date.");
  }
  return json(
    await db.calendarEvent.findMany({
      where: {
        academicId: a.id,
        startTime: { lt: range.end },
        endTime: { gt: range.start },
      },
      orderBy: { startTime: "asc" },
    }),
  );
});
export const POST = route(async (req) => {
  const a = await academicFor(req);
  const data = eventInput.parse(await body(req));
  return json(
    await db.calendarEvent.create({
      data: { ...data, academicId: a.id, source: "MANUAL" },
    }),
    201,
  );
});
export const PUT = route(async (req) => {
  const a = await academicFor(req);
  const input = await body(req);
  if (!input || typeof input !== "object" || !("id" in input) || typeof input.id !== "string")
    throw new HttpError(400, "Event ID is required.");
  const { id, ...eventData } = input as { id: string; [key: string]: unknown };
  const data = eventInput.parse(eventData);
  const result = await db.calendarEvent.updateMany({
    where: { id, academicId: a.id },
    data,
  });
  if (!result.count) throw new HttpError(404, "Calendar event not found.");
  return json({ ok: true });
});
export const DELETE = route(async (req) => {
  const a = await academicFor(req);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new HttpError(400, "Event ID is required.");
  const result = await db.calendarEvent.deleteMany({ where: { id, academicId: a.id } });
  if (!result.count) throw new HttpError(404, "Calendar event not found.");
  return json({ ok: true });
});
