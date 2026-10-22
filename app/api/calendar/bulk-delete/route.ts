/** Authenticated bulk deletion API for ordinary events and recurring occurrences. */
import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, HttpError, json, route } from "@/lib/http";

/** Deletes 1–200 selected events/occurrences in a database transaction. */
export const POST = route(async (req) => {
  const academic = await academicFor(req);
  const input = await body(req);
  if (!input || typeof input !== "object" || !Array.isArray(input.events))
    throw new HttpError(400, "Choose at least one event to delete.");
  const events = input.events as Array<{ id?: unknown; occurrenceStart?: unknown }>;
  if (!events.length || events.length > 200)
    throw new HttpError(400, "Select between 1 and 200 events to delete.");
  const unique = new Map<string, { id: string; occurrenceStart: Date | null }>();
  for (const event of events) {
    if (!event || typeof event.id !== "string" || !event.id.trim())
      throw new HttpError(400, "Each selected event needs a valid ID.");
    let occurrenceStart: Date | null = null;
    if (event.occurrenceStart !== null && event.occurrenceStart !== undefined) {
      if (typeof event.occurrenceStart !== "string" || !Number.isFinite(Date.parse(event.occurrenceStart)))
        throw new HttpError(400, "A selected recurring event has an invalid occurrence date.");
      occurrenceStart = new Date(event.occurrenceStart);
    }
    const key = `${event.id}|${occurrenceStart?.toISOString() ?? ""}`;
    unique.set(key, { id: event.id, occurrenceStart });
  }
  await db.$transaction(async (tx) => {
    for (const event of unique.values()) {
      if (event.occurrenceStart) {
        const parent = await tx.calendarEvent.findFirst({
          where: { id: event.id, academicId: academic.id, recurrenceRule: { not: null } },
          select: { id: true },
        });
        if (!parent) throw new HttpError(404, "A selected recurring event was not found.");
        await tx.calendarEventException.upsert({
          where: { eventId_occurrenceStart: { eventId: event.id, occurrenceStart: event.occurrenceStart } },
          create: { eventId: event.id, occurrenceStart: event.occurrenceStart, cancelled: true },
          update: { cancelled: true },
        });
      } else {
        const result = await tx.calendarEvent.deleteMany({ where: { id: event.id, academicId: academic.id } });
        if (!result.count) throw new HttpError(404, "A selected event was not found.");
      }
    }
  });
  return json({ deleted: unique.size });
}, "calendar-bulk-delete");
