import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { availabilityInput } from "@/lib/validation";
import { resolveStatus } from "@/lib/status-resolution";
export const GET = route(async (req) => {
  const a = await academicFor(req);
  const now = new Date();
  const [availability, currentEvent] = await Promise.all([
    db.availabilityStatus.findUnique({ where: { academicId: a.id } }),
    db.calendarEvent.findFirst({
      where: {
        academicId: a.id,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { startTime: "desc" },
      select: { title: true, status: true, endTime: true },
    }),
  ]);
  const resolved = resolveStatus({ now, overrideStatus: availability?.overrideStatus, overrideUntil: availability?.overrideUntil, calendar: currentEvent ? { ...currentEvent, endTime: currentEvent.endTime } : null, savedStatus: availability?.status });
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
