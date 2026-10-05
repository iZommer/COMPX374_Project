import { db } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { ZONE } from "@/lib/time";
import { DateTime } from "luxon";
import { resolveStatus } from "@/lib/status-resolution";
import { expandSeries } from "@/lib/recurrence";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ apiKey: string }> },
) {
  return route(async () => {
    const { apiKey } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(apiKey))
      throw new HttpError(404, "Display key not found.");
    const localToday = DateTime.now().setZone(ZONE);
    const monday = localToday.startOf("week").plus({ weeks: localToday.weekday > 5 ? 1 : 0 });
    const week = { start: monday.toJSDate(), end: monday.plus({ days: 5 }).toJSDate() };
    const association = await db.displayAssociation.findUnique({
      where: { apiKey },
      select: {
        academic: {
          select: {
            id: true,
            name: true,
            displaySettings: true,
            availability: {
              select: {
                status: true,
                expectedReturnTime: true,
                customMessage: true,
                overrideStatus: true,
                overrideUntil: true,
                overrideMessage: true,
                updatedAt: true,
              },
            },
            contact: {
              select: { email: true, phone: true, officeLocation: true },
            },
            events: {
              where: { OR: [
                { recurrenceRule: { not: null }, startTime: { lt: week.end } },
                { recurrenceRule: null, startTime: { lt: week.end }, endTime: { gt: week.start } },
              ] },
              orderBy: { startTime: "asc" },
              include: { recurrenceExceptions: true },
            },
          },
        },
      },
    });
    if (!association) throw new HttpError(404, "Display key not found.");
    const a = association.academic;
    const now = new Date();
    const expandedEvents = expandSeries(a.events, week.start, week.end);
    const currentCandidates = await db.calendarEvent.findMany({
      where: { academicId: association.academic.id, OR: [
        { recurrenceRule: { not: null }, startTime: { lte: now } },
        { recurrenceRule: null, startTime: { lte: now }, endTime: { gt: now } },
      ] }, include: { recurrenceExceptions: true },
    });
    const currentEvent = expandSeries(currentCandidates, now, new Date(+now + 1)).find(
      (event) =>
        event.startTime <= now && event.endTime > now,
    );
    const resolved = resolveStatus({ now, overrideStatus: a.availability?.overrideStatus, overrideUntil: a.availability?.overrideUntil, calendar: currentEvent ? { title: currentEvent.title, status: currentEvent.status, endTime: currentEvent.endTime } : null });
    const availability = { status: resolved.status, expectedReturnTime: resolved.expectedReturnTime?.toISOString() ?? null, customMessage: resolved.source === "override" ? a.availability?.overrideMessage : resolved.customMessage, updatedAt: now };
    return json({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      timezone: ZONE,
      week,
      academic: { name: a.name },
      displaySettings: a.displaySettings ? {
        timezone: ZONE,
        textScale: a.displaySettings.textScale,
        highContrast: a.displaySettings.highContrast,
        pixelShiftEnabled: a.displaySettings.pixelShiftEnabled,
        idleReturnSeconds: a.displaySettings.idleReturnSeconds,
        staleAfterHours: a.displaySettings.staleAfterHours,
        dimStartHour: a.displaySettings.dimStartHour,
        dimEndHour: a.displaySettings.dimEndHour,
        dimLevel: a.displaySettings.dimLevel,
        timeFormat24h: a.displaySettings.timeFormat24h,
      } : undefined,
      availability,
      calendar: expandedEvents,
      contact: a.contact,
    });
  })(request);
}
