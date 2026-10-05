import { db } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { weekRange, ZONE } from "@/lib/time";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ apiKey: string }> },
) {
  return route(async () => {
    const { apiKey } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(apiKey))
      throw new HttpError(404, "Display key not found.");
    const week = weekRange();
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
    // An event currently in progress takes precedence over the manually set
    // status for the display. Once it ends, the saved manual status resumes.
    const now = new Date();
    const nowMs = now.getTime();
    const currentEvent = a.events.find(
      (event) =>
        new Date(event.startTime).getTime() <= nowMs &&
        new Date(event.endTime).getTime() > nowMs,
    );
    const availability = currentEvent
      ? {
          status: currentEvent.status,
          expectedReturnTime: new Date(currentEvent.endTime).toISOString(),
          customMessage: currentEvent.title,
          updatedAt: now,
        }
      : a.availability;
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
