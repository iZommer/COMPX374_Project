import { DateTime } from "luxon";
export const ZONE = "Pacific/Auckland";
export function weekRange(date?: string) {
  const day = date
    ? DateTime.fromISO(date, { zone: ZONE })
    : DateTime.now().setZone(ZONE);
  if (!day.isValid) throw new Error("Invalid date");
  const start = day.startOf("week");
  return { start: start.toJSDate(), end: start.plus({ weeks: 1 }).toJSDate() };
}
export const localToISO = (value: string) =>
  DateTime.fromISO(value, { zone: ZONE }).toUTC().toISO()!;
export const localInput = (value: string) =>
  DateTime.fromISO(value).setZone(ZONE).toFormat("yyyy-MM-dd'T'HH:mm");
export const formatTime = (value: string) =>
  DateTime.fromISO(value).setZone(ZONE).toFormat("h:mm a");
