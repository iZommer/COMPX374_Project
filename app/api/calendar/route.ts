import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, HttpError, json, route } from "@/lib/http";
import { eventInput } from "@/lib/validation";
import { weekRange } from "@/lib/time";
import { expandSeries, remainingCount } from "@/lib/recurrence";
function occurrenceDate(value: string | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) throw new HttpError(400, "A valid occurrence start is required.");
  return new Date(value);
}
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
  const events = await db.calendarEvent.findMany({
    where: { academicId: a.id, OR: [
      { recurrenceRule: { not: null }, startTime: { lt: range.end } },
      { recurrenceRule: null, startTime: { lt: range.end }, endTime: { gt: range.start } },
    ] },
    include: { recurrenceExceptions: true }, orderBy: { startTime: "asc" },
  });
  return json(expandSeries(events, range.start, range.end));
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
  const { id, scope = "all", occurrenceStart, ...eventData } = input as { id: string; scope?: string; occurrenceStart?: string; [key: string]: unknown };
  if (!["all", "this", "following"].includes(scope)) throw new HttpError(400, "Choose this event, this and following, or all events.");
  const occurrenceId = id.includes("@") ? id.slice(id.indexOf("@") + 1) : occurrenceStart;
  const occurrenceAt = occurrenceId ? occurrenceDate(occurrenceId) : null;
  if (scope !== "all" && !occurrenceAt) throw new HttpError(400, "A valid occurrence start is required for this scope.");
  const parentId = id.includes("@") ? id.slice(0, id.indexOf("@")) : id;
  const data = eventInput.parse(eventData);
  if (scope === "this") {
    if (!occurrenceAt) throw new HttpError(400, "Occurrence start is required.");
    const parent = await db.calendarEvent.findFirst({ where: { id: parentId, academicId: a.id } });
    if (!parent) throw new HttpError(404, "Calendar event not found.");
    await db.calendarEventException.upsert({ where: { eventId_occurrenceStart: { eventId: parentId, occurrenceStart: occurrenceAt } }, create: { eventId: parentId, occurrenceStart: occurrenceAt, title: data.title, startTime: new Date(data.startTime), endTime: new Date(data.endTime), status: data.status }, update: { cancelled: false, title: data.title, startTime: new Date(data.startTime), endTime: new Date(data.endTime), status: data.status } });
    return json({ ok: true });
  }
  if (scope === "following" && occurrenceId) {
    const parent = await db.calendarEvent.findFirst({ where: { id: parentId, academicId: a.id } });
    if (!parent?.recurrenceRule) throw new HttpError(404, "Recurring event not found.");
    const followingExceptions = await db.calendarEventException.findMany({ where: { eventId: parentId, occurrenceStart: { gte: occurrenceAt! } } });
    if (+occurrenceAt! <= +parent.startTime) await db.calendarEvent.delete({ where: { id: parentId } });
    else {
      const until = new Date(+occurrenceAt! - 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const previousRule = `${parent.recurrenceRule.replace(/;?(?:COUNT|UNTIL)=[^;]+/g, "")};UNTIL=${until}`;
      await db.calendarEvent.update({ where: { id: parentId }, data: { recurrenceRule: previousRule } });
    }
    let nextRule = data.recurrenceRule ?? parent.recurrenceRule;
    const remaining = remainingCount(parent.recurrenceRule, parent.startTime, occurrenceAt!);
    if (remaining !== null && remaining > 0 && nextRule?.includes("COUNT=")) nextRule = nextRule.replace(/COUNT=\d+/, `COUNT=${remaining}`);
    const nextSeries = await db.calendarEvent.create({ data: { ...data, recurrenceRule: nextRule, academicId: a.id, source: "MANUAL" } });
    if (followingExceptions.length) await db.calendarEventException.createMany({ data: followingExceptions.map(({ id: _id, eventId: _eventId, ...exception }) => ({ ...exception, eventId: nextSeries.id })) });
    return json({ ok: true });
  }
  const result = await db.calendarEvent.updateMany({
    where: { id: parentId, academicId: a.id },
    data,
  });
  if (!result.count) throw new HttpError(404, "Calendar event not found.");
  return json({ ok: true });
});
export const DELETE = route(async (req) => {
  const a = await academicFor(req);
  const id = new URL(req.url).searchParams.get("id");
  const scope = new URL(req.url).searchParams.get("scope") || "all";
  const occurrenceStart = new URL(req.url).searchParams.get("occurrenceStart");
  if (!["all", "this", "following"].includes(scope)) throw new HttpError(400, "Choose this event, this and following, or all events.");
  if (!id) throw new HttpError(400, "Event ID is required.");
  const parentId = id.includes("@") ? id.slice(0, id.indexOf("@")) : id;
  const occurrence = id.includes("@") ? id.slice(id.indexOf("@") + 1) : occurrenceStart;
  const occurrenceAt = occurrence ? occurrenceDate(occurrence) : null;
  if (scope !== "all" && !occurrenceAt) throw new HttpError(400, "A valid occurrence start is required for this scope.");
  if (scope === "this") {
    if (!occurrenceAt) throw new HttpError(400, "Occurrence start is required.");
    const parent = await db.calendarEvent.findFirst({ where: { id: parentId, academicId: a.id } });
    if (!parent?.recurrenceRule) throw new HttpError(404, "Recurring event not found.");
    await db.calendarEventException.upsert({ where: { eventId_occurrenceStart: { eventId: parentId, occurrenceStart: occurrenceAt } }, create: { eventId: parentId, occurrenceStart: occurrenceAt, cancelled: true }, update: { cancelled: true } });
    return json({ ok: true });
  }
  if (scope === "following" && occurrence) {
    const parent = await db.calendarEvent.findFirst({ where: { id: parentId, academicId: a.id } });
    if (!parent?.recurrenceRule) throw new HttpError(404, "Recurring event not found.");
    if (+occurrenceAt! <= +parent.startTime) await db.calendarEvent.delete({ where: { id: parentId } });
    else {
      const until = new Date(+occurrenceAt! - 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const rule = `${parent.recurrenceRule.replace(/;?(?:COUNT|UNTIL)=[^;]+/g, "")};UNTIL=${until}`;
      await db.calendarEvent.update({ where: { id: parentId }, data: { recurrenceRule: rule } });
      await db.calendarEventException.deleteMany({ where: { eventId: parentId, occurrenceStart: { gte: occurrenceAt! } } });
    }
    return json({ ok: true });
  }
  const result = await db.calendarEvent.deleteMany({ where: { id: parentId, academicId: a.id } });
  if (!result.count) throw new HttpError(404, "Calendar event not found.");
  return json({ ok: true });
});
