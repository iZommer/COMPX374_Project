"use client";
import { useRef, useState } from "react";
import { DateTime } from "luxon";
import { api, errorText } from "@/lib/client-api";
import { formatTime, localToISO, oneHourLaterLocal, ZONE } from "@/lib/time";
import { DateTime24Field } from "@/components/DateTime24Field";
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
  recurrenceRule: string | null;
  parentEventId: string | null;
  occurrenceStart: string | null;
};
type EventScope = "this" | "following" | "all";
const weekDays = [["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"], ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"]] as const;
const eventStatuses = [
  ["AVAILABLE", "Available", "Happy to be interrupted", "✓", "var(--status-available)", "var(--status-available-tint)"],
  ["IN_A_MEETING", "In a meeting", "Please come back later", "−", "var(--status-meeting)", "var(--status-meeting-tint)"],
  ["TEACHING", "Teaching", "In class or facilitating", "♧", "var(--status-teaching)", "#eeeeff"],
  ["OUT_OF_OFFICE", "Out of office", "Away from my desk", "◷", "var(--status-away)", "var(--status-away-tint)"],
] as const;
const localDateTime = (value: string) =>
  DateTime.fromISO(value).setZone(ZONE).toFormat("yyyy-MM-dd'T'HH:mm");
export default function CalendarPage() {
  const [week, setWeek] = useState(() =>
    DateTime.now().setZone(ZONE).startOf("week"),
  );
  const resource = useResource<Event[]>(`calendar?week=${week.toISODate()}`);
  const timeSettings = useResource<{ timeFormat24h: boolean }>("display-settings");
  const show24Hour = timeSettings.data?.timeFormat24h ?? true;
  const timeText = (value: string) => DateTime.fromISO(value).setZone(ZONE).toFormat(show24Hour ? "HH:mm" : "h:mm a");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [scopeAction, setScopeAction] = useState<{ kind: "save"; form: FormData } | { kind: "delete" } | null>(null);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [eventStatus, setEventStatus] = useState<Event["status"]>("IN_A_MEETING");
  const [repeat, setRepeat] = useState("none");
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [repeatEnd, setRepeatEnd] = useState("never");
  const [repeatDate, setRepeatDate] = useState("");
  const [repeatCount, setRepeatCount] = useState("10");
  const [customFrequency, setCustomFrequency] = useState("WEEKLY");
  const [customInterval, setCustomInterval] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endEdited = useRef(false);
  function currentRecurrenceRule() {
    const frequency = repeat === "fortnightly" ? "WEEKLY" : repeat === "custom" ? customFrequency : repeat.toUpperCase();
    const parts = repeat === "none" ? [] : [`FREQ=${frequency}`];
    if (repeat === "fortnightly") parts.push("INTERVAL=2");
    if (repeat === "custom" && Number(customInterval) > 1) parts.push(`INTERVAL=${customInterval}`);
    if ((repeat === "weekly" || (repeat === "custom" && customFrequency === "WEEKLY")) && repeatDays.length) parts.push(`BYDAY=${repeatDays.join(",")}`);
    if (repeatEnd === "date" && repeatDate) parts.push(`UNTIL=${DateTime.fromISO(`${repeatDate}T23:59:59`, { zone: ZONE }).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`);
    if (repeatEnd === "count") parts.push(`COUNT=${repeatCount}`);
    return parts.length ? parts.join(";") : null;
  }
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
    form.set("recurrenceRule", currentRecurrenceRule() ?? "");
    if (editing?.parentEventId && editing.occurrenceStart) {
      setScopeAction({ kind: "save", form });
      return;
    }
    await persistEvent(form, "all");
  }
  async function persistEvent(form: FormData, scope: EventScope) {
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
          ...(editing?.occurrenceStart ? { occurrenceStart: editing.occurrenceStart } : {}),
          ...(editing?.parentEventId ? { scope } : {}),
          title: form.get("title"),
          startTime: localToISO(start),
          endTime: localToISO(end),
          status: form.get("status"),
          recurrenceRule: String(form.get("recurrenceRule") || "") || null,
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
  async function deleteEvent(scope: EventScope) {
    if (!editing) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ id: editing.id, scope });
      if (editing.occurrenceStart) params.set("occurrenceStart", editing.occurrenceStart);
      await api(`calendar?${params}`, { method: "DELETE" });
      setEditing(null);
      setMessage("Event deleted.");
      resource.retry();
    } catch (e) {
      setFailed(true);
      setMessage(errorText(e));
    } finally { setBusy(false); }
  }
  function requestDeleteEvent() {
    if (!editing || !window.confirm(`Delete “${editing.title}”?`)) return;
    if (editing.parentEventId && editing.occurrenceStart) setScopeAction({ kind: "delete" });
    else void deleteEvent("all");
  }
  async function chooseScope(scope: EventScope) {
    const action = scopeAction;
    setScopeAction(null);
    if (!action) return;
    if (action.kind === "save") await persistEvent(action.form, scope);
    else await deleteEvent(scope);
  }
  const recurrenceChanged = scopeAction?.kind === "save" &&
    String(scopeAction.form.get("recurrenceRule") || "") !== (editing?.recurrenceRule ?? "");
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
              endEdited.current = false;
              const start = DateTime.now().setZone(ZONE).startOf("minute").toFormat("yyyy-MM-dd'T'HH:mm");
              setStartValue(start);
              setEndValue(oneHourLaterLocal(start));
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
      {scopeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14232f]/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeAction(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="event-scope-title" className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-2xl">
            <h2 id="event-scope-title" className="text-[18px]">{scopeAction.kind === "save" ? "Apply changes to" : "Delete"}</h2>
            <p className="mt-2 text-[13px]">Choose which part of this repeating event to {scopeAction.kind === "save" ? "update" : "remove"}.</p>
            {recurrenceChanged && <p className="mt-3 rounded-md border border-[#e9d39d] bg-[#fff9e8] p-3 text-[12px] text-[#705817]">You changed the repeat days. That changes the series schedule, so “This event only” cannot apply that change. Choose “This and following” or “All events”.</p>}
            <div className="mt-5 grid gap-2">
              {([["this", "This event only", "Change just this date."], ["following", "This and following", "Change this date and later repeats."], ["all", "All events", "Change the entire repeating series."]] as const).map(([scope, title, detail]) => (
                <button key={scope} type="button" disabled={scope === "this" && recurrenceChanged} className="flex min-h-14 flex-col items-start rounded-lg border border-[#d8e1e5] bg-white px-4 py-2 text-left hover:border-brand hover:bg-[#f3faf7] disabled:cursor-not-allowed disabled:opacity-45" onClick={() => void chooseScope(scope)}>
                  <span className="text-[13px] font-bold text-ink">{title}</span>
                  <span className="text-[11px] font-normal text-muted">{detail}</span>
                </button>
              ))}
            </div>
            <button type="button" className="secondary mt-4 min-h-10 px-4" onClick={() => setScopeAction(null)}>Cancel</button>
          </section>
        </div>
      )}
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
              <label>Starts<DateTime24Field name="start" value={startValue || (editing ? localDateTime(editing.startTime) : "")} required onChange={(value) => { setStartValue(value); if (!endEdited.current && DateTime.fromISO(value, { zone: ZONE }).isValid) setEndValue(oneHourLaterLocal(value)); }} /></label>
              <label>Ends<DateTime24Field name="end" value={endValue || (editing ? localDateTime(editing.endTime) : "")} required onChange={(value) => { endEdited.current = true; setEndValue(value); }} /></label>
            </div>
            <section className="grid gap-4 rounded-lg border border-line bg-[#fbfcfc] p-4">
              <label className="text-[13px]">Repeats
                <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                  <option value="none">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="custom">Custom</option>
                </select>
              </label>
              {(repeat === "weekly" || (repeat === "custom" && customFrequency === "WEEKLY")) && (
                <fieldset className="grid grid-cols-7 gap-2 border-0 p-0 mobile:grid-cols-4">
                  <legend className="mb-2 text-[12px] font-semibold text-[#526274]">Days of the week</legend>
                  {weekDays.map(([code, label]) => {
                    const selected = repeatDays.includes(code);
                    return <label key={code} className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-2 text-[12px] font-semibold transition-colors ${selected ? "border-brand bg-[#eaf6ef] text-brand" : "border-[#d8e1e5] bg-white text-[#526274] hover:bg-[#f3f7f6]"}`}>
                      <input className="!m-0 !h-4 !w-4 !p-0" type="checkbox" checked={selected} onChange={() => setRepeatDays((days) => selected ? days.filter((day) => day !== code) : [...days, code])} />{label}
                    </label>;
                  })}
                </fieldset>
              )}
              {repeat === "custom" && <div className="grid grid-cols-2 gap-3"><label>Frequency<select value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label><label>Every<input type="number" min="1" max="999" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} /></label></div>}
              {repeat !== "none" && <div className="grid grid-cols-2 gap-3 mobile:grid-cols-1"><label>Ends<select value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)}><option value="never">Never</option><option value="date">On date</option><option value="count">After N occurrences</option></select></label>{repeatEnd === "date" && <label>Last date<input required type="date" value={repeatDate} onChange={(e) => setRepeatDate(e.target.value)} /></label>}{repeatEnd === "count" && <label>Occurrences<input required type="number" min="1" max="99999" value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} /></label>}</div>}
            </section>
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
            {editing && <button type="button" disabled={busy} className="secondary" onClick={requestDeleteEvent}>Delete event</button>}
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
                          className={`border-l-[3px] border-l-[#7195b2] bg-[#edf3f8] py-2.5 px-2 rounded-[4px] mt-[5px] mr-0 mb-2.5 ml-0 [overflow-wrap:anywhere] [&.imported]:border-[#63a28d] [&.imported]:bg-[#eaf5ef] [&_>_span]:text-[9px] [&_>_span]:text-[#5e7c8c] [&_>_span]:block [&_h3]:text-[11px] [&_h3]:leading-[1.6] [&_h3]:mt-[7px] [&_h3]:mr-0 [&_h3]:mb-3 [&_h3]:ml-0 [&_>_small]:text-[12px] [&_>_small]:font-semibold [&_>_small]:text-[#536b76] mobile:mt-0 ${e.source === "ICS_IMPORT" ? "imported" : ""}`}
                          key={e.id}
                          style={e.status === "TEACHING" ? { borderLeftColor: "var(--status-teaching)", backgroundColor: "#eeeeff" } : e.status === "IN_A_MEETING" ? { borderLeftColor: "var(--status-meeting)", backgroundColor: "var(--status-meeting-tint)" } : e.status === "OUT_OF_OFFICE" ? { borderLeftColor: "var(--status-away)", backgroundColor: "var(--status-away-tint)" } : { borderLeftColor: "var(--status-available)", backgroundColor: "var(--status-available-tint)" }}
                        >
                          <span>
                            {DateTime.fromISO(e.startTime).setZone(ZONE) < day
                              ? "Continues"
                              : timeText(e.startTime)}{" "}
                            –{" "}
                            {DateTime.fromISO(e.endTime).setZone(ZONE) >
                            day.plus({ days: 1 })
                              ? "next day"
                              : timeText(e.endTime)}
                          </span>
                          <h3>{e.title}</h3>
                          <small className="text-[13px] font-semibold">
                            {e.source === "ICS_IMPORT"
                              ? "Imported"
                              : "Manual event"} · {eventStatuses.find(([value]) => value === e.status)?.[1] ?? "In a meeting"}
                          </small>
                          <button
                            type="button"
                            disabled={busy}
                            className="mt-3 flex min-h-[34px] w-full items-center justify-center rounded-md border border-[#d5e4dd] bg-white px-3 text-[11px] font-bold text-brand hover:bg-[#f2f8f5]"
                            onClick={() => {
                              endEdited.current = true;
                              setAdding(false);
                              setEditing(e);
                              setStartValue(localDateTime(e.startTime));
                              setEndValue(localDateTime(e.endTime));
                              setEventStatus(e.status ?? "IN_A_MEETING");
                              const rule = e.recurrenceRule ?? "";
                              const freq = rule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/)?.[1] ?? "WEEKLY";
                              const interval = Number(rule.match(/INTERVAL=(\d+)/)?.[1] ?? 1);
                              setRepeat(rule ? freq === "WEEKLY" && interval === 2 ? "fortnightly" : interval > 1 ? "custom" : freq.toLowerCase() : "none");
                              setCustomFrequency(freq); setCustomInterval(String(interval));
                              setRepeatDays(rule.match(/BYDAY=([^;]+)/)?.[1].split(",") ?? []);
                              setRepeatEnd(rule.includes("COUNT=") ? "count" : rule.includes("UNTIL=") ? "date" : "never");
                              setRepeatCount(rule.match(/COUNT=(\d+)/)?.[1] ?? "10");
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

