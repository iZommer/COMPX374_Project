import type { CalendarEvent } from "./payload.js";

export interface EventSegment {
  event: CalendarEvent;
  dayIndex: number;
  startMinute: number;
  endMinute: number;
  column: number;
  columnCount: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(date: Date, timezone: string): LocalParts {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-NZ", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timezone, formatter);
  }
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

const dayNumber = (p: Pick<LocalParts, "year" | "month" | "day">) =>
  Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);

export function layoutWeekEvents(
  events: CalendarEvent[],
  weekStart: string,
  timezone: string,
  days = 7,
): EventSegment[] {
  const weekDay = dayNumber(parts(new Date(weekStart), timezone));
  const segments: EventSegment[] = [];
  for (const event of events) {
    const start = parts(new Date(event.startTime), timezone);
    const end = parts(new Date(event.endTime), timezone);
    const firstDay = dayNumber(start);
    const lastDay = dayNumber(end);
    for (let day = firstDay; day <= lastDay; day += 1) {
      const dayIndex = day - weekDay;
      if (dayIndex < 0 || dayIndex >= days) continue;
      const startsHere = day === firstDay;
      const endsHere = day === lastDay;
      const startMinute = startsHere ? start.hour * 60 + start.minute : 0;
      let endMinute = endsHere ? end.hour * 60 + end.minute : 1440;
      if (endsHere && endMinute === 0 && lastDay > firstDay) endMinute = 1440;
      if (endMinute <= startMinute) continue;
      segments.push({
        event,
        dayIndex,
        startMinute,
        endMinute,
        column: 0,
        columnCount: 1,
        continuesBefore: !startsHere,
        continuesAfter: !endsHere,
      });
    }
  }

  for (let day = 0; day < days; day += 1) {
    const daySegments = segments
      .filter((segment) => segment.dayIndex === day)
      .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
    const active: EventSegment[] = [];
    for (const segment of daySegments) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].endMinute <= segment.startMinute) active.splice(i, 1);
      }
      const used = new Set(active.map((item) => item.column));
      let column = 0;
      while (used.has(column)) column += 1;
      segment.column = column;
      active.push(segment);
      const count = Math.max(...active.map((item) => item.column)) + 1;
      for (const item of active) item.columnCount = Math.max(item.columnCount, count);
    }
  }
  return segments;
}
