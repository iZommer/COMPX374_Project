/**
 * lib/status-resolution.ts
 *
 * Purpose: Maps resolved availability and calendar data to the status presentation shown by the application.
 */
export type ResolvableStatus = "AVAILABLE" | "IN_A_MEETING" | "TEACHING" | "OUT_OF_OFFICE";
export const statusPresentation = {
  AVAILABLE: { label: "Available" },
  IN_A_MEETING: { label: "In a meeting" },
  TEACHING: { label: "Teaching" },
  OUT_OF_OFFICE: { label: "Out of office" },
} as const;
// Resolve status in one place so dashboard reads and the display payload use the same precedence.
export function resolveStatus(input: {
  now: Date;
  overrideStatus?: ResolvableStatus | null;
  overrideUntil?: Date | null;
  calendar?: { status: ResolvableStatus; title: string; endTime: Date } | null;
}) {
  if (input.overrideStatus && input.overrideUntil && input.overrideUntil > input.now)
    return { status: input.overrideStatus, expectedReturnTime: input.overrideUntil, customMessage: null, source: "override" as const };
  if (input.calendar && input.calendar.endTime > input.now)
    return { status: input.calendar.status, expectedReturnTime: input.calendar.endTime, customMessage: input.calendar.title, source: "calendar" as const };
  return { status: "AVAILABLE" as const, expectedReturnTime: null, customMessage: null, source: "default" as const };
}
