import ICAL from "ical.js";
import { DateTime } from "luxon";
import { createHash } from "node:crypto";
import { ZONE } from "./time";

export type ImportedEvent = {
  title: string;
  startTime: Date;
  endTime: Date;
  importKey: string;
  source: "ICS_IMPORT";
};
// Bound expansion and reject, rather than silently truncate, oversized calendars.
export function parseCalendar(text: string, now = new Date()): ImportedEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== "vcalendar")
    throw new Error("Upload a valid VCALENDAR file.");
  const zones = new Map<string, ICAL.Timezone>();
  for (const component of root.getAllSubcomponents("vtimezone")) {
    const tzid = String(component.getFirstPropertyValue("tzid"));
    zones.set(tzid, new ICAL.Timezone({ component, tzid }));
  }
  function prepare(component: ICAL.Component) {
    for (const name of [
      "dtstart",
      "dtend",
      "recurrence-id",
      "exdate",
      "rdate",
    ]) {
      for (const prop of component.getAllProperties(name)) {
        const tzid = prop.getParameter("tzid");
        if (typeof tzid !== "string") continue;
        // Attach file-local zones without mutating ICAL's global timezone registry.
        let zone = zones.get(tzid);
        if (!zone && DateTime.now().setZone(tzid).isValid) {
          // Give ICAL an offset-aware IANA zone so UTC UNTIL boundaries and
          // recurrence comparisons work even when VTIMEZONE was omitted.
          zone = new ICAL.Timezone({ tzid });
          zone.utcOffset = (time: ICAL.Time) =>
            DateTime.fromObject(
              {
                year: time.year,
                month: time.month,
                day: time.day,
                hour: time.hour,
                minute: time.minute,
                second: time.second,
              },
              { zone: tzid },
            ).offset * 60;
          zones.set(tzid, zone);
        }
        for (const value of prop.getValues())
          if (value instanceof ICAL.Time && zone) value.zone = zone;
      }
    }
  }
  function toDate(time: ICAL.Time, component: ICAL.Component) {
    if (time.zone.tzid !== "floating" && time.zone.tzid !== "local")
      return time.toJSDate();
    const tzid = component.getFirstProperty("dtstart")?.getParameter("tzid");
    const zone = typeof tzid === "string" ? tzid : ZONE;
    const value = DateTime.fromObject(
      {
        year: time.year,
        month: time.month,
        day: time.day,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
      },
      { zone },
    );
    if (!value.isValid)
      throw new Error(
        `Unsupported calendar timezone: ${zone}. Export with VTIMEZONE or UTC times.`,
      );
    return value.toJSDate();
  }
  const components = root.getAllSubcomponents("vevent");
  components.forEach(prepare);
  const events = components.map((c) => new ICAL.Event(c));
  const from = DateTime.fromJSDate(now)
    .setZone(ZONE)
    .minus({ months: 1 })
    .startOf("day")
    .toJSDate();
  const until = DateTime.fromJSDate(now)
    .setZone(ZONE)
    .plus({ years: 1 })
    .endOf("day")
    .toJSDate();
  const output = new Map<string, ImportedEvent>();
  let iterations = 0;
  const deadline = Date.now() + 5_000;
  for (const event of events.filter((e) => !e.isRecurrenceException())) {
    if (event.component.getFirstPropertyValue("status") === "CANCELLED")
      continue;
    if (!event.uid || !event.startDate)
      throw new Error("Each event needs a UID and start date.");
    for (const exception of events.filter(
      (e) => e.isRecurrenceException() && e.uid === event.uid,
    ))
      event.relateException(exception);
    const iterator = event.iterator();
    let occurrence: ICAL.Time | null;
    while ((occurrence = iterator.next())) {
      if (++iterations > 20_000 || Date.now() > deadline)
        throw new Error(
          "Calendar recurrence is too large. Export a smaller date range.",
        );
      const nominal = toDate(occurrence, event.component);
      if (nominal > until) break;
      const detail = event.getOccurrenceDetails(occurrence);
      if (detail.item.component.getFirstPropertyValue("status") === "CANCELLED")
        continue;
      const startTime = toDate(detail.startDate, detail.item.component);
      const endTime = toDate(detail.endDate, detail.item.component);
      if (endTime <= from || startTime > until) continue;
      if (
        !Number.isFinite(+startTime) ||
        !Number.isFinite(+endTime) ||
        endTime <= startTime
      )
        throw new Error("An event has an invalid or missing end time.");
      const importKey = createHash("sha256")
        .update(`${event.uid}|${nominal.toISOString()}`)
        .digest("hex");
      output.set(importKey, {
        title: (detail.item.summary || "Untitled event").slice(0, 200),
        startTime,
        endTime,
        importKey,
        source: "ICS_IMPORT",
      });
      if (output.size > 2_000)
        throw new Error(
          "Calendar contains more than 2,000 occurrences. Export a smaller calendar.",
        );
    }
  }
  return [...output.values()];
}
