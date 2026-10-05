import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { availabilityInput } from "@/lib/validation";
import { resolveStatus } from "@/lib/status-resolution";
import { expandSeries } from "@/lib/recurrence";
export const GET = route(async (req) => {
  const a = await academicFor(req);
  const now = new Date();
  const [availability, calendarEvents] = await Promise.all([
    db.availabilityStatus.findUnique({ where: { academicId: a.id } }),
    db.calendarEvent.findMany({
      where: { academicId: a.id, OR: [
        { recurrenceRule: { not: null }, startTime: { lte: now } },
        { recurrenceRule: null, startTime: { lte: now }, endTime: { gt: now } },
      ] }, include: { recurrenceExceptions: true },
    }),
  ]);
  const currentEvent = expandSeries(calendarEvents, now, new Date(+now + 1)).find((event) => event.startTime <= now && event.endTime > now);
  const resolved = resolveStatus({ now, overrideStatus: availability?.overrideStatus, overrideUntil: availability?.overrideUntil, calendar: currentEvent ? { title: currentEvent.title, status: currentEvent.status, endTime: currentEvent.endTime } : null });
  const effectiveAvailability = { status: resolved.status, expectedReturnTime: resolved.expectedReturnTime, customMessage: availability?.overrideMessage ?? resolved.customMessage };
  return json({
    ...availability,
    effectiveAvailability,
    effectiveSource: resolved.source,
    activeEventTitle: currentEvent?.title ?? null,
  });
});
export const PUT = route(async (req) => {
  const a = await academicFor(req);
  const data = availabilityInput.parse(await body(req));
  if (!data.overrideStatus) {
    data.overrideUntil = null;
    data.overrideMessage = null;
  }
  return json(
    await db.availabilityStatus.update({ where: { academicId: a.id }, data }),
  );
});
