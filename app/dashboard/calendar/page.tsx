"use client";
import { useRef, useState } from "react";
import { DateTime } from "luxon";
import { api, errorText } from "@/lib/client-api";
import { formatTime, localToISO, ZONE } from "@/lib/time";
import {
  Notice,
  PageHeading,
  ResourceState,
  useResource,
} from "@/components/ui";
type Event = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: string;
};
export default function CalendarPage() {
  const [week, setWeek] = useState(() =>
    DateTime.now().setZone(ZONE).startOf("week"),
  );
  const resource = useResource<Event[]>(`calendar?week=${week.toISODate()}`);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function importFile(file: File | undefined) {
    if (!file) return;
    setMessage("");
    setFailed(false);
    if (!file.name.toLowerCase().endsWith(".ics") || file.size > 1_048_576) {
      setFailed(true);
      setMessage("Choose an .ics file up to 1 MB.");
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => setProcessing(true), 2000);
    try {
      const data = await api<{ message: string }>("calendar/import", {
        method: "POST",
        headers: { "Content-Type": "text/calendar; charset=utf-8" },
        body: file,
      });
      setMessage(data.message);
      resource.retry();
    } catch (e) {
      setFailed(true);
      setMessage(errorText(e));
    } finally {
      clearTimeout(timer);
      setProcessing(false);
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const start = String(form.get("start"));
      const end = String(form.get("end"));
      if (end <= start) throw new Error("End time must be after start time.");
      await api("calendar", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          startTime: localToISO(start),
          endTime: localToISO(end),
        }),
      });
      setMessage("Event added to your diary.");
      setAdding(false);
      setWeek(DateTime.fromISO(start, { zone: ZONE }).startOf("week"));
      resource.retry();
    } catch (e) {
      setFailed(true);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE / CALENDAR"
        title="Your week at a glance"
        description="Keep your teaching, meetings and office hours together."
      />
      <div className="calendar-toolbar">
        <div className="week-controls">
          <button
            aria-label="Previous week"
            className="secondary"
            onClick={() => setWeek(week.minus({ weeks: 1 }))}
          >
            ←
          </button>
          <h2>
            {week.toFormat("d MMM")} –{" "}
            {week.plus({ days: 6 }).toFormat("d MMM yyyy")}
          </h2>
          <button
            aria-label="Next week"
            className="secondary"
            onClick={() => setWeek(week.plus({ weeks: 1 }))}
          >
            →
          </button>
          <button
            className="text-button"
            onClick={() =>
              setWeek(DateTime.now().setZone(ZONE).startOf("week"))
            }
          >
            This week
          </button>
        </div>
        <div className="calendar-actions">
          <input
            ref={fileRef}
            className="sr-only"
            aria-label="Import calendar file"
            type="file"
            accept=".ics,text/calendar"
            disabled={busy}
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          <button
            className="secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Working…" : "↑ Import .ics"}
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Close form" : "+ Add event"}
          </button>
        </div>
      </div>
      <Notice message={message} error={failed} />
      {processing && (
        <p role="status" className="notice">
          Processing your timetable. This can take a few seconds…
        </p>
      )}
      {adding && (
        <form className="panel event-form" onSubmit={createEvent}>
          <h2>Add an event</h2>
          <fieldset disabled={busy}>
            <label>
              Event title
              <input
                required
                name="title"
                maxLength={200}
                placeholder="e.g. COMPX374 lecture"
              />
            </label>
            <div className="two-columns">
              <label>
                Starts
                <input required type="datetime-local" name="start" />
              </label>
              <label>
                Ends
                <input required type="datetime-local" name="end" />
              </label>
            </div>
            <p className="muted">All times are in Pacific/Auckland.</p>
            <button disabled={busy} className="primary">
              {busy ? "Saving…" : "Save event"}
            </button>
          </fieldset>
        </form>
      )}
      {!resource.data ? (
        <ResourceState {...resource} />
      ) : (
        <section className="panel calendar-panel">
          <div className="calendar-meta">
            <span>
              <span className="live-dot" /> Weekly diary
            </span>
            <span>New Zealand time · Pacific/Auckland</span>
          </div>
          <div className="week-grid">
            {Array.from({ length: 7 }, (_, index) => {
              const day = week.plus({ days: index });
              const events = resource.data!.filter(
                (e) =>
                  DateTime.fromISO(e.startTime).setZone(ZONE) <
                    day.plus({ days: 1 }) &&
                  DateTime.fromISO(e.endTime).setZone(ZONE) > day,
              );
              const today = day.hasSame(DateTime.now().setZone(ZONE), "day");
              return (
                <section
                  className={`day-column ${today ? "today" : ""}`}
                  key={index}
                >
                  <header>
                    <span>{day.toFormat("ccc")}</span>
                    <strong>{day.day}</strong>
                    {today && <small>Today</small>}
                  </header>
                  <div className="day-events">
                    {events.length ? (
                      events.map((e) => (
                        <article
                          className={`calendar-event ${e.source === "ICS_IMPORT" ? "imported" : ""}`}
                          key={e.id}
                        >
                          <span>
                            {DateTime.fromISO(e.startTime).setZone(ZONE) < day
                              ? "Continues"
                              : formatTime(e.startTime)}{" "}
                            –{" "}
                            {DateTime.fromISO(e.endTime).setZone(ZONE) >
                            day.plus({ days: 1 })
                              ? "next day"
                              : formatTime(e.endTime)}
                          </span>
                          <h3>{e.title}</h3>
                          <small>
                            {e.source === "ICS_IMPORT"
                              ? "Imported"
                              : "Manual event"}
                          </small>
                        </article>
                      ))
                    ) : (
                      <p className="empty-day">No events</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {resource.data.length === 0 && (
            <div className="calendar-empty">
              <h3>A little breathing room</h3>
              <p>
                No events this week. Add an event or import your timetable to
                get started.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="info-panel">
        <span className="info-icon" aria-hidden="true">
          i
        </span>
        <div>
          <h3>Your timetable, in one place</h3>
          <p>
            Import .ics files up to 1 MB. Recurring events are expanded from
            last month through the next year; existing occurrences are skipped.
            Calendar events do not change your availability.
          </p>
        </div>
      </section>
    </>
  );
}
