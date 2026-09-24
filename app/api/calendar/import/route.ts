import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, json, limitedText, route } from "@/lib/http";
import { parseCalendar } from "@/lib/ics";
export const maxDuration = 15;
export const POST = route(async (req) => {
  const a = await academicFor(req);
  if (!req.headers.get("content-type")?.startsWith("text/calendar"))
    throw new HttpError(415, "Upload the .ics file as text/calendar.");
  const text = await limitedText(req, 1_048_576);
  let events;
  try {
    events = parseCalendar(text);
  } catch (e) {
    throw new HttpError(
      400,
      e instanceof Error ? e.message : "Invalid calendar file.",
    );
  }
  if (!events.length)
    throw new HttpError(
      400,
      "No events found in the import window (last month through the next year).",
    );
  const result = await db.calendarEvent.createMany({
    data: events.map((e) => ({ ...e, academicId: a.id })),
    skipDuplicates: true,
  });
  return json({
    imported: result.count,
    skipped: events.length - result.count,
    message: `Imported ${result.count} events; skipped ${events.length - result.count} existing events.`,
  });
}, "calendar-import");
