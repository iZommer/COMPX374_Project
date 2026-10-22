"use client";
/** Editor for preferences returned with the public display payload. */
import { useState } from "react";
import { api, errorText } from "@/lib/client-api";
import { localInput } from "@/lib/time";
import { Notice, PageHeading, ResourceState, useResource } from "@/components/ui";

type Settings = { textScale: "normal" | "large" | "largest"; highContrast: boolean; pixelShiftEnabled: boolean; idleReturnSeconds: number; staleAfterHours: number; dimStartHour: number; dimEndHour: number; dimLevel: number; timeFormat24h: boolean; defaults: Omit<Settings, "defaults" | "appliedAt">; appliedAt: string | null };

export default function DisplaySettingsPage() {
  const resource = useResource<Settings>("display-settings");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (key: string) => Number(form.get(key));
    setSaving(true); setMessage(""); setError(false);
    try {
      await api("display-settings", { method: "PUT", body: JSON.stringify({
        textScale: form.get("textScale"), highContrast: form.has("highContrast"), pixelShiftEnabled: form.has("pixelShiftEnabled"),
        idleReturnSeconds: number("idleReturnSeconds"), staleAfterHours: number("staleAfterHours"),
        dimStartHour: number("dimStartHour"), dimEndHour: number("dimEndHour"), dimLevel: number("dimLevel"),
        timeFormat24h: form.get("timeFormat24h") === "true",
      }) });
      setMessage("Settings saved. The display applies them on its next poll.");
      resource.retry();
    } catch (e) { setMessage(errorText(e)); setError(true); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading eyebrow="YOUR WORKSPACE / DISPLAY" title="Display Client Settings" description="Manage the Raspberry Pi display settings from your web app." />
    {!resource.data ? <ResourceState {...resource} /> : <>
      <Notice message={message} error={error} />
      <form onSubmit={save} className="grid max-w-4xl gap-7 rounded-xl border border-line bg-white p-5 shadow-sm sm:p-7">
        <section className="grid gap-4">
          <SectionHeading title="Appearance" description="Choose how information is shown on the display." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Setting label="Time format" current={resource.data.timeFormat24h ? "24-hour" : "12-hour"} fallback={resource.data.defaults.timeFormat24h ? "24-hour" : "12-hour"}><select name="timeFormat24h" defaultValue={String(resource.data.timeFormat24h)}><option value="true">24-hour</option><option value="false">12-hour</option></select></Setting>
            <Setting label="Text size" current={resource.data.textScale} fallback={resource.data.defaults.textScale}><select name="textScale" defaultValue={resource.data.textScale}><option value="normal">Normal</option><option value="large">Large</option><option value="largest">Largest</option></select></Setting>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="High contrast" name="highContrast" checked={resource.data.highContrast} fallback={resource.data.defaults.highContrast} />
            <Toggle label="Subtle pixel shift" name="pixelShiftEnabled" checked={resource.data.pixelShiftEnabled} fallback={resource.data.defaults.pixelShiftEnabled} />
          </div>
        </section>

        <section className="grid gap-4 border-t border-line pt-6">
          <SectionHeading title="Screen behavior" description="Set when the display returns to its main screen and dims." />
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Setting label="Return to Status after (seconds)" current={resource.data.idleReturnSeconds} fallback={resource.data.defaults.idleReturnSeconds}><input name="idleReturnSeconds" type="number" min="10" max="3600" defaultValue={resource.data.idleReturnSeconds} /></Setting>
            <Setting label="Mark cached data stale after (hours)" current={resource.data.staleAfterHours} fallback={resource.data.defaults.staleAfterHours}><input name="staleAfterHours" type="number" min="1" max="720" defaultValue={resource.data.staleAfterHours} /></Setting>
            <Setting label="Dim from (local hour, 0–23)" current={`${resource.data.dimStartHour}:00`} fallback={`${resource.data.defaults.dimStartHour}:00`}><input name="dimStartHour" type="number" min="0" max="23" defaultValue={resource.data.dimStartHour} /></Setting>
            <Setting label="Dim until (local hour, 0–23)" current={`${resource.data.dimEndHour}:00`} fallback={`${resource.data.defaults.dimEndHour}:00`}><input name="dimEndHour" type="number" min="0" max="23" defaultValue={resource.data.dimEndHour} /></Setting>
            <Setting label="Dim brightness (%)" current={resource.data.dimLevel} fallback={resource.data.defaults.dimLevel}><input name="dimLevel" type="number" min="10" max="100" defaultValue={resource.data.dimLevel} /></Setting>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button className="primary min-h-11 rounded-lg bg-brand px-5 font-semibold text-white sm:min-w-40" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          <p className="m-0 text-xs text-muted">Last saved/applied by the server: {resource.data.appliedAt ? localInput(resource.data.appliedAt).replace("T", " ") : "Default values (not saved yet)"}</p>
        </div>
      </form>
    </>}
  </>;
}

function Setting({ label, current, fallback, children }: { label: string; current: React.ReactNode; fallback: React.ReactNode; children: React.ReactNode }) {
  return <label className="grid content-start gap-1 text-sm font-semibold">{label}<span className="text-xs font-normal text-muted">Current: {current} · Default: {fallback}</span>{children}</label>;
}
function Toggle({ label, name, checked, fallback }: { label: string; name: string; checked: boolean; fallback: boolean }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-canvas/50 p-4 text-sm font-semibold transition-colors hover:border-brand/40">
    <span>{label}<small className="mt-0.5 block font-normal text-muted">Current: {checked ? "On" : "Off"} · Default: {fallback ? "On" : "Off"}</small></span>
    <span className="relative inline-flex shrink-0 items-center">
      <input className="peer sr-only" type="checkbox" name={name} defaultChecked={checked} />
      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-[#cfd9e0] transition-colors peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#48a99a] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </span>
  </label>;
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base">{title}</h2><p className="mt-0.5 text-sm">{description}</p></div>;
}
