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
