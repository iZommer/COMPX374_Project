import { db } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { ZONE } from "@/lib/time";
import { DateTime } from "luxon";
import { resolveStatus } from "@/lib/status-resolution";
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
            name: true,
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
              where: {
                startTime: { lt: week.end },
                endTime: { gt: week.start },
              },
              orderBy: { startTime: "asc" },
              select: {
                title: true,
                startTime: true,
                endTime: true,
                status: true,
                source: true,
              },
            },
          },
        },
      },
    });
    if (!association) throw new HttpError(404, "Display key not found.");
    const a = association.academic;
    const now = new Date();
    const nowMs = now.getTime();
    const currentEvent = a.events.find(
      (event) =>
        new Date(event.startTime).getTime() <= nowMs &&
        new Date(event.endTime).getTime() > nowMs,
    );
    const resolved = resolveStatus({ now, overrideStatus: a.availability?.overrideStatus, overrideUntil: a.availability?.overrideUntil, calendar: currentEvent ? { ...currentEvent, endTime: new Date(currentEvent.endTime) } : null, savedStatus: a.availability?.status });
    const availability = { status: resolved.status, expectedReturnTime: resolved.expectedReturnTime?.toISOString() ?? null, customMessage: resolved.source === "override" ? a.availability?.overrideMessage : resolved.customMessage, updatedAt: now };
    return json({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      timezone: ZONE,
      week,
      academic: { name: a.name },
      availability,
      calendar: a.events,
      contact: a.contact,
    });
  })(request);
}
