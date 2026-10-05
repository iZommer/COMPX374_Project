import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCalendar } from "../lib/ics";
import { weekRange, localToISO, oneHourLaterLocal } from "../lib/time";
import { eventInput, availabilityInput, contactInput } from "../lib/validation";
import { resolveStatus } from "../lib/status-resolution";
import { expandSeries, remainingCount } from "../lib/recurrence";
const now = new Date("2026-09-24T00:00:00Z");
const calendar = (events: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nic//Test//EN\r\n${events}\r\nEND:VCALENDAR`;
const event = (extra = "") =>
  `BEGIN:VEVENT\r\nUID:lecture-1\r\nSUMMARY:Lecture\r\nDTSTART;TZID=Pacific/Auckland:20260921T090000\r\nDTEND;TZID=Pacific/Auckland:20260921T100000\r\n${extra}\r\nEND:VEVENT`;
test("new event end time defaults to one local hour after its start", () => {
  assert.equal(oneHourLaterLocal("2026-07-02T09:30"), "2026-07-02T10:30");
});
test("active override wins over a calendar event and expires back to calendar", () => {
  const now = new Date("2026-10-05T00:00:00Z");
  const calendar = { status: "TEACHING" as const, title: "Lecture", endTime: new Date("2026-10-05T02:00:00Z") };
  assert.equal(resolveStatus({ now, overrideStatus: "OUT_OF_OFFICE", overrideUntil: new Date("2026-10-05T01:00:00Z"), calendar }).status, "OUT_OF_OFFICE");
  assert.equal(resolveStatus({ now: new Date("2026-10-05T01:00:00Z"), overrideStatus: "OUT_OF_OFFICE", overrideUntil: new Date("2026-10-05T01:00:00Z"), calendar }).status, "TEACHING");
});
test("manual recurrence expands in range and skips a cancelled instance", () => {
  const start = new Date("2026-02-01T20:00:00Z");
  const excluded = new Date("2026-02-02T20:00:00Z");
  const event = { id: "series", title: "Study", startTime: start, endTime: new Date("2026-02-01T21:00:00Z"), status: "AVAILABLE" as const, source: "MANUAL", recurrenceRule: "FREQ=DAILY;COUNT=3", recurrenceExceptions: [{ occurrenceStart: excluded, cancelled: true, title: null, startTime: null, endTime: null, status: null }] };
  const rows = expandSeries([event], new Date("2026-02-01T00:00:00Z"), new Date("2026-02-05T00:00:00Z"));
  assert.deepEqual(rows.map((row) => row.startTime.toISOString()), [start.toISOString(), "2026-02-03T20:00:00.000Z"]);
  assert.ok(rows.every((row) => row.parentEventId === "series"));
});
test("moved recurrence exceptions appear at their replacement time and preserve COUNT", () => {
  const first = new Date("2026-02-01T20:00:00Z");
  const nominal = new Date("2026-02-02T20:00:00Z");
  const moved = new Date("2026-02-02T22:00:00Z");
  const event = { id: "series", title: "Study", startTime: first, endTime: new Date("2026-02-01T21:00:00Z"), status: "AVAILABLE" as const, source: "MANUAL", recurrenceRule: "FREQ=DAILY;COUNT=3", recurrenceExceptions: [{ occurrenceStart: nominal, cancelled: false, title: "Moved study", startTime: moved, endTime: new Date(+moved + 3600000), status: null }] };
  const rows = expandSeries([event], new Date("2026-02-01T00:00:00Z"), new Date("2026-02-05T00:00:00Z"));
  assert.equal(rows.length, 3);
  assert.ok(rows.some((row) => row.title === "Moved study" && +row.startTime === +moved));
  assert.equal(remainingCount("FREQ=DAILY;COUNT=8", first, new Date("2026-02-04T20:00:00Z")), 5);
});
test("recurrence keeps Auckland wall time across DST and honors EXDATE", () => {
  const rows = parseCalendar(
    calendar(
      event(
        "RRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE;TZID=Pacific/Auckland:20261005T090000",
      ),
    ),
    now,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].startTime.toISOString(), "2026-09-20T21:00:00.000Z");
  assert.equal(rows[1].startTime.toISOString(), "2026-09-27T20:00:00.000Z");
});
test("imports have stable keys and duplicate UIDs are collapsed", () => {
  const rows = parseCalendar(calendar(event() + "\r\n" + event()), now);
  assert.equal(rows.length, 1);
  assert.equal(
    rows[0].importKey,
    parseCalendar(calendar(event()), now)[0].importKey,
  );
});

test("UTC UNTIL compares real instants when an IANA zone has no VTIMEZONE", () => {
  const rows = parseCalendar(
    calendar(event("RRULE:FREQ=WEEKLY;UNTIL=20260927T210000Z")),
    now,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].startTime.toISOString(), "2026-09-27T20:00:00.000Z");
});
test("floating times default to Auckland, all-day events have an exclusive end", () => {
  const text =
    "BEGIN:VEVENT\r\nUID:day\r\nSUMMARY:Away\r\nDTSTART;VALUE=DATE:20260928\r\nDTEND;VALUE=DATE:20260929\r\nEND:VEVENT";
  const [row] = parseCalendar(calendar(text), now);
  assert.equal(row.startTime.toISOString(), "2026-09-27T11:00:00.000Z");
  assert.equal(+row.endTime - +row.startTime, 86_400_000);
});
test("cancelled instances and moved recurrence exceptions are respected", () => {
  const exception =
    "BEGIN:VEVENT\r\nUID:lecture-1\r\nRECURRENCE-ID;TZID=Pacific/Auckland:20260928T090000\r\nDTSTART;TZID=Pacific/Auckland:20260928T110000\r\nDTEND;TZID=Pacific/Auckland:20260928T120000\r\nSUMMARY:Moved\r\nEND:VEVENT";
  const rows = parseCalendar(
    calendar(event("RRULE:FREQ=WEEKLY;COUNT=2") + "\r\n" + exception),
    now,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].title, "Moved");
  assert.equal(rows[1].startTime.toISOString(), "2026-09-27T22:00:00.000Z");
  assert.equal(
    parseCalendar(calendar(event("STATUS:CANCELLED")), now).length,
    0,
  );
});
test("invalid calendar, missing end, unknown timezone, excessive recurrence fail", () => {
  assert.throws(() => parseCalendar("not a calendar", now));
  assert.throws(() =>
    parseCalendar(
      calendar(
        event().replace("DTEND;TZID=Pacific/Auckland:20260921T100000", ""),
      ),
      now,
    ),
  );
  assert.throws(() =>
    parseCalendar(
      calendar(event().replaceAll("Pacific/Auckland", "Unknown/Zone")),
      now,
    ),
  );
  assert.throws(() =>
    parseCalendar(calendar(event("RRULE:FREQ=SECONDLY;COUNT=3000")), now),
  );
});
test("week boundaries use local midnight including a DST transition", () => {
  const week = weekRange("2026-09-24");
  assert.equal(week.start.toISOString(), "2026-09-20T12:00:00.000Z");
  assert.equal(week.end.toISOString(), "2026-09-27T11:00:00.000Z");
  assert.equal(localToISO("2026-09-28T09:00"), "2026-09-27T20:00:00.000Z");
});
test("request validation rejects reversed events and ownership injection", () => {
  assert.equal(
    eventInput.safeParse({
      title: "Meeting",
      startTime: "2026-09-24T12:00:00Z",
      endTime: "2026-09-24T11:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    contactInput.safeParse({
      email: "a@example.org",
      phone: "",
      officeLocation: "",
      academicId: "someone-else",
    }).success,
    false,
  );
  assert.equal(
    availabilityInput.safeParse({
      status: "INVALID",
      expectedReturnTime: null,
      customMessage: null,
    }).success,
    false,
  );
});
test("manual event validation accepts supported RRULEs and rejects malformed rules", () => {
  const base = { title: "Repeat", startTime: "2026-10-05T20:00:00.000Z", endTime: "2026-10-05T21:00:00.000Z", status: "TEACHING" };
  for (const recurrenceRule of ["FREQ=DAILY;COUNT=5", "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261101T105959Z", "FREQ=MONTHLY;INTERVAL=3"])
    assert.equal(eventInput.parse({ ...base, recurrenceRule }).recurrenceRule, recurrenceRule);
  assert.throws(() => eventInput.parse({ ...base, recurrenceRule: "FREQ=HOURLY;COUNT=99999999" }));
});
