import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { parseCalendar } from "./ics";
import { ZONE } from "./time";

type Status = "AVAILABLE" | "IN_A_MEETING" | "TEACHING" | "OUT_OF_OFFICE";
type Series = { id: string; title: string; startTime: Date; endTime: Date; status: Status; source: string; importKey?: string | null; recurrenceRule: string | null; recurrenceExceptions: Array<{ occurrenceStart: Date; cancelled: boolean; title: string | null; startTime: Date | null; endTime: Date | null; status: Status | null }> };
type Expanded = Omit<Series, "recurrenceExceptions"> & { id: string; parentEventId: string | null; occurrenceStart: string | null };
const localStamp = (date: Date) => DateTime.fromJSDate(date).setZone(ZONE).toFormat("yyyyMMdd'T'HHmmss");
const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const keyFor = (seriesId: string, occurrence: Date) => createHash("sha256").update(`${seriesId}|${occurrence.toISOString()}`).digest("hex");

export function expandSeries<T extends Series>(series: T[], start: Date, end: Date): Expanded[] {
  const output: Expanded[] = [];
  for (const event of series) {
    if (!event.recurrenceRule) {
      if (event.startTime < end && event.endTime > start) output.push({ id: event.id, title: event.title, startTime: event.startTime, endTime: event.endTime, status: event.status, source: event.source, importKey: event.importKey, recurrenceRule: null, parentEventId: null, occurrenceStart: null });
      continue;
    }
    const exdates = event.recurrenceExceptions.filter((e) => e.cancelled || e.startTime).map((e) => `EXDATE;TZID=${ZONE}:${localStamp(e.occurrenceStart)}`).join("\r\n");
    const from = DateTime.fromJSDate(start).setZone(ZONE).plus({ months: 1 }).toJSDate();
    const source = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${event.id}\r\nSUMMARY:${escapeText(event.title)}\r\nDTSTART;TZID=${ZONE}:${localStamp(event.startTime)}\r\nDTEND;TZID=${ZONE}:${localStamp(event.endTime)}\r\nRRULE:${event.recurrenceRule}\r\n${exdates ? `${exdates}\r\n` : ""}END:VEVENT\r\nEND:VCALENDAR`;
    const rows = parseCalendar(source, from);
    const exceptions = new Map(event.recurrenceExceptions.map((x) => [keyFor(event.id, x.occurrenceStart), x]));
    const occurrences: Expanded[] = rows.flatMap((row) => {
      const nominal = row.startTime;
      const exception = exceptions.get(row.importKey);
      if (exception?.cancelled) return [];
      const occurrence = {
        id: `${event.id}@${nominal.toISOString()}`,
        parentEventId: event.id,
        occurrenceStart: nominal.toISOString(),
        title: exception?.title ?? event.title,
        startTime: exception?.startTime ?? row.startTime,
        endTime: exception?.endTime ?? row.endTime,
        status: (exception?.status ?? event.status) as Status,
        source: "MANUAL",
        importKey: null,
        recurrenceRule: event.recurrenceRule,
      };
      return occurrence.startTime < end && occurrence.endTime > start ? [occurrence] : [];
    });
    for (const exception of event.recurrenceExceptions.filter((item) => item.startTime && item.endTime)) {
      if (exception.cancelled || !exception.startTime || !exception.endTime || exception.startTime >= end || exception.endTime <= start) continue;
      occurrences.push({ id: `${event.id}@${exception.occurrenceStart.toISOString()}`, title: exception.title ?? event.title, startTime: exception.startTime, endTime: exception.endTime, status: exception.status ?? event.status, source: "MANUAL", recurrenceRule: event.recurrenceRule, parentEventId: event.id, occurrenceStart: exception.occurrenceStart.toISOString() });
    }
    output.push(...occurrences);
  }
  return output.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
}

export function remainingCount(rule: string, first: Date, target: Date): number | null {
  const match = rule.match(/(?:^|;)COUNT=(\d+)/);
  if (!match) return null;
  const total = Number(match[1]);
  const properties = Object.fromEntries(rule.split(";").map((part) => part.split("=")));
  const interval = Number(properties.INTERVAL ?? 1);
  const start = DateTime.fromJSDate(first).setZone(ZONE);
  const until = DateTime.fromJSDate(target).setZone(ZONE);
  const weekdayMap: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
  const weekdays = properties.BYDAY ? properties.BYDAY.split(",").map((day: string) => weekdayMap[day]) : [start.weekday];
  let before = 0;
  for (let cursor = start; cursor < until && before < total; cursor = cursor.plus({ days: 1 })) {
    const days = Math.floor(cursor.startOf("day").diff(start.startOf("day"), "days").days);
    const months = (cursor.year - start.year) * 12 + cursor.month - start.month;
    const active = properties.FREQ === "DAILY"
      ? days % interval === 0 && cursor.hour === start.hour && cursor.minute === start.minute
      : properties.FREQ === "WEEKLY"
        ? Math.floor(cursor.startOf("week").diff(start.startOf("week"), "weeks").weeks) % interval === 0 && weekdays.includes(cursor.weekday) && cursor.hour === start.hour && cursor.minute === start.minute
        : properties.FREQ === "MONTHLY"
          ? months % interval === 0 && cursor.day === start.day && cursor.hour === start.hour && cursor.minute === start.minute
          : false;
    if (active) before += 1;
  }
  return Math.max(0, total - before);
}
