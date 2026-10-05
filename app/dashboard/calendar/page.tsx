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
  status: "AVAILABLE" | "IN_A_MEETING" | "TEACHING" | "OUT_OF_OFFICE";
  source: string;
};
const eventStatuses = [
  ["AVAILABLE", "Available", "Happy to be interrupted", "✓", "#087f5b", "#eaf6ef"],
  ["IN_A_MEETING", "In a meeting", "Please come back later", "−", "#c9534b", "#fff0ed"],
  ["TEACHING", "Teaching", "In class or facilitating", "♧", "#a66b1d", "#fff6e6"],
  ["OUT_OF_OFFICE", "Out of office", "Away from my desk", "◷", "#65778a", "#f0f3f6"],
] as const;
const localDateTime = (value: string) =>
  DateTime.fromISO(value).setZone(ZONE).toFormat("yyyy-MM-dd'T'HH:mm");
export default function CalendarPage() {
  const [week, setWeek] = useState(() =>
    DateTime.now().setZone(ZONE).startOf("week"),
  );
  const resource = useResource<Event[]>(`calendar?week=${week.toISODate()}`);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [eventStatus, setEventStatus] = useState<Event["status"]>("IN_A_MEETING");
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
  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
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
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          title: form.get("title"),
          startTime: localToISO(start),
          endTime: localToISO(end),
          status: form.get("status"),
        }),
      });
      setMessage(editing ? "Event updated." : "Event added to your diary.");
      setAdding(false);
      setEditing(null);
      setEventStatus("IN_A_MEETING");
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
      <div className="flex justify-between items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-2.5 items-center [&_h2]:text-[16px] [&_>_.secondary]:py-1.5 [&_>_.secondary]:px-[11px] [&_>_.secondary]:min-h-[35px] mobile:gap-[7px] mobile:flex-wrap mobile:[&_h2]:text-[14px]">
          <button
            aria-label="Previous week"
            className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
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
            className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
            onClick={() => setWeek(week.plus({ weeks: 1 }))}
          >
            →
          </button>
          <button
            className="text-[12px] text-brand font-semibold py-2 px-0"
            onClick={() =>
              setWeek(DateTime.now().setZone(ZONE).startOf("week"))
            }
          >
            This week
          </button>
        </div>
        <div className="flex gap-2.5 items-center">
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
            className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Working…" : "↑ Import .ics"}
          </button>
          <button
            className="primary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-brand text-white shadow-[0_3px_7px_#08766015] [&:hover]:bg-[#065e4d]"
            disabled={busy}
            onClick={() => {
              setAdding(!adding);
              setEditing(null);
              setEventStatus("IN_A_MEETING");
            }}
          >
            {adding ? "Close form" : "+ Add event"}
          </button>
        </div>
      </div>
      <Notice message={message} error={failed} />
      {processing && (
        <p
          role="status"
          className="my-4 mx-0 py-3 px-[15px] rounded-[7px] text-[12px] bg-[#eaf1f5] text-[#38566e] [&.success]:bg-[#ecf6f0] [&.success]:text-[#186e4b] [&.error]:bg-[#fff0ed] [&.error]:text-[#a43729]"
        >
          Processing your timetable. This can take a few seconds…
        </p>
      )}
      {(adding || editing) && (
        <form
          key={editing?.id ?? "new-event"}
          className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] mb-[22px] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5 [&_fieldset]:grid [&_fieldset]:gap-[18px] [&_fieldset]:mt-5 [&_button]:justify-self-start"
          onSubmit={saveEvent}
        >
          <h2>{editing ? "Edit event" : "Add an event"}</h2>
          <fieldset disabled={busy} className="grid gap-5">
            <label>
              Event title
              <input
                required
                name="title"
                maxLength={200}
                placeholder="e.g. COMPX374 lecture"
                defaultValue={editing?.title ?? ""}
              />
            </label>
            <div className="grid grid-cols-2 gap-5 mobile:grid-cols-1">
              <label>
                Starts
                <input
                  required
                  type="datetime-local"
                  name="start"
                  defaultValue={editing ? localDateTime(editing.startTime) : ""}
                />
              </label>
              <label>
                Ends
                <input
                  required
                  type="datetime-local"
                  name="end"
                  defaultValue={editing ? localDateTime(editing.endTime) : ""}
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-[13px] font-bold text-ink">What should your display show?</span>
              <span className="mb-3 block text-[11px] font-normal text-muted">
                Choose the status visitors will see while this event is happening.
              </span>
              <input type="hidden" name="status" value={eventStatus} />
              <span className="grid grid-cols-2 gap-3 mobile:grid-cols-1">
                {eventStatuses.map(([value, label, hint, icon, color, tint]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={eventStatus === value}
                    onClick={() => setEventStatus(value)}
                    className={`flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-colors ${eventStatus === value ? "border-brand bg-[#f0f8f4] ring-2 ring-[#d3e9df]" : "border-[#e2e9ec] bg-white hover:bg-[#f8fbfa]"}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px] font-bold" style={{ color, backgroundColor: tint }}>{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold text-ink">{label}</span>
                      <span className="mt-1 block text-[10px] leading-snug text-muted">{hint}</span>
                    </span>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${eventStatus === value ? "border-brand bg-brand text-white" : "border-[#d5dfe3] text-transparent"}`} aria-hidden="true">✓</span>
                  </button>
                ))}
              </span>
            </label>
            <p className="muted text-muted text-[12px]">
              All times are in Pacific/Auckland.
            </p>
            <button
              disabled={busy}
              className="primary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-brand text-white shadow-[0_3px_7px_#08766015] [&:hover]:bg-[#065e4d]"
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Save event"}
            </button>
          </fieldset>
        </form>
      )}
      {!resource.data ? (
        <ResourceState {...resource} />
      ) : (
        <section className="bg-white border border-line rounded-[11px] p-0 shadow-[0_3px_12px_#152e4304] overflow-hidden [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-0 mobile:p-0">
          <div className="py-[18px] px-[22px] flex justify-between text-[10px] text-[#81918f] border-b border-b-line mobile:text-[8px] mobile:p-3.5">
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#339d80] mr-1.5" />{" "}
              Weekly diary
            </span>
            <span>New Zealand time · Pacific/Auckland</span>
          </div>
          <div className="grid grid-cols-7 min-h-[390px] mobile:block">
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
                  className={`border-r border-r-line min-w-0 [&:last-child]:border-0 [&_>_header]:h-[90px] [&_>_header]:text-center [&_>_header]:border-b [&_>_header]:border-b-line [&_>_header]:p-3 [&_>_header]:relative [&_>_header_>_span]:block [&_>_header_>_span]:uppercase [&_>_header_>_span]:tracking-[1.2px] [&_>_header_>_span]:text-[9px] [&_>_header_>_span]:text-[#83918f] [&_>_header_>_strong]:text-[23px] [&_>_header_>_strong]:font-medium [&_>_header_>_strong]:block [&_>_header_>_small]:text-[8px] [&_>_header_>_small]:text-brand [&_>_header_>_small]:block [&_>_header_>_small]:leading-[1] [&.today]:bg-[#f8fcfa] [&.today_header_strong]:text-brand mobile:border-0 mobile:border-b mobile:border-b-line mobile:grid mobile:grid-cols-[70px_1fr] mobile:[&_>_header]:h-auto mobile:[&_>_header]:border-0 mobile:[&_>_header]:min-h-[95px] mobile:[&_>_header]:py-[15px] mobile:[&_>_header]:px-1.5 ${today ? "today" : ""}`}
                  key={index}
                >
                  <header>
                    <span>{day.toFormat("ccc")}</span>
                    <strong>{day.day}</strong>
                    {today && <small>Today</small>}
                  </header>
                  <div className="p-2 mobile:min-h-20">
                    {events.length ? (
                      events.map((e) => (
                        <article
                          className={`border-l-[3px] border-l-[#7195b2] bg-[#edf3f8] py-2.5 px-2 rounded-[4px] mt-[5px] mr-0 mb-2.5 ml-0 [overflow-wrap:anywhere] [&.imported]:border-[#63a28d] [&.imported]:bg-[#eaf5ef] [&_>_span]:text-[9px] [&_>_span]:text-[#5e7c8c] [&_>_span]:block [&_h3]:text-[11px] [&_h3]:leading-[1.6] [&_h3]:mt-[7px] [&_h3]:mr-0 [&_h3]:mb-3 [&_h3]:ml-0 [&_>_small]:text-[8px] [&_>_small]:text-[#7f928f] mobile:mt-0 ${e.source === "ICS_IMPORT" ? "imported" : ""}`}
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
                              : "Manual event"} · {eventStatuses.find(([value]) => value === e.status)?.[1] ?? "In a meeting"}
                          </small>
                          <button
                            type="button"
                            disabled={busy}
                            className="mt-3 flex min-h-[34px] w-full items-center justify-center rounded-md border border-[#d5e4dd] bg-white px-3 text-[11px] font-bold text-brand hover:bg-[#f2f8f5]"
                            onClick={() => {
                              setAdding(false);
                              setEditing(e);
                              setEventStatus(e.status ?? "IN_A_MEETING");
                              setMessage("");
                            }}
                          >
                            Edit event
                          </button>
                        </article>
                      ))
                    ) : (
                      <p className="text-[10px] text-[#b0bac0] text-center mt-[30px] mobile:text-left mobile:my-[23px] mobile:mx-2.5">
                        No events
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {resource.data.length === 0 && (
            <div className="text-center p-5 border-t border-t-line [&_p]:text-[12px] [&_p]:mt-1.5 mobile:text-left">
              <h3>A little breathing room</h3>
              <p>
                No events this week. Add an event or import your timetable to
                get started.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="flex gap-[17px] items-start border border-[#dde7eb] bg-[#edf3f6] py-[21px] px-6 rounded-[9px] mt-[25px] [&_h3]:text-[13px] [&_p]:text-[11px] [&_p]:mt-1 [&_p]:leading-[1.8] mobile:p-[18px]">
        <span
          className="grid place-items-center w-[29px] h-[29px] rounded-full bg-[#dce8ef] text-[#486b82] font-bold shrink-0"
          aria-hidden="true"
        >
          i
        </span>
        <div>
          <h3>Your timetable, in one place</h3>
          <p>
            Import .ics files up to 1 MB. Recurring events are expanded from
            last month through the next year; existing occurrences are skipped.
            When an event is in progress, its selected status appears on the display. Your manually saved availability resumes when the event ends.
          </p>
        </div>
      </section>
    </>
  );
}
