import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { availabilityInput } from "@/lib/validation";
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
  const forceActive = Boolean(
    availability?.overrideStatus &&
      availability.overrideUntil &&
      availability.overrideUntil > now,
  );
  const effectiveAvailability = forceActive
    ? {
        status: availability!.overrideStatus!,
        expectedReturnTime: availability!.overrideUntil,
        customMessage: availability!.overrideMessage,
      }
    : currentEvent
      ? {
          status: currentEvent.status,
          expectedReturnTime: currentEvent.endTime,
          customMessage: currentEvent.title,
        }
      : {
          status: availability?.status ?? "OUT_OF_OFFICE",
          expectedReturnTime: availability?.expectedReturnTime ?? null,
          customMessage: availability?.customMessage ?? null,
        };
  return json({
    ...availability,
    effectiveAvailability,
    effectiveSource: forceActive ? "override" : currentEvent ? "calendar" : "saved",
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
