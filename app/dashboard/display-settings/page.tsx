"use client";
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
    <PageHeading eyebrow="YOUR WORKSPACE / DISPLAY" title="Display Client Settings" description="Manage the Raspberry Pi display. Server settings take priority over its local fallback menu." />
    {!resource.data ? <ResourceState {...resource} /> : <>
      <Notice message={message} error={error} />
      <form onSubmit={save} className="grid max-w-3xl gap-5 rounded-xl border border-line bg-white p-6 shadow-sm">
        <Setting label="Time format" current={resource.data.timeFormat24h ? "24-hour" : "12-hour"} fallback={resource.data.defaults.timeFormat24h ? "24-hour" : "12-hour"}><select name="timeFormat24h" defaultValue={String(resource.data.timeFormat24h)}><option value="true">24-hour</option><option value="false">12-hour</option></select></Setting>
        <Setting label="Text size" current={resource.data.textScale} fallback={resource.data.defaults.textScale}><select name="textScale" defaultValue={resource.data.textScale}><option value="normal">Normal</option><option value="large">Large</option><option value="largest">Largest</option></select></Setting>
        <Toggle label="High contrast" name="highContrast" checked={resource.data.highContrast} fallback={resource.data.defaults.highContrast} />
        <Toggle label="Subtle pixel shift" name="pixelShiftEnabled" checked={resource.data.pixelShiftEnabled} fallback={resource.data.defaults.pixelShiftEnabled} />
        <Setting label="Return to Status after (seconds)" current={resource.data.idleReturnSeconds} fallback={resource.data.defaults.idleReturnSeconds}><input name="idleReturnSeconds" type="number" min="10" max="3600" defaultValue={resource.data.idleReturnSeconds} /></Setting>
        <Setting label="Mark cached data stale after (hours)" current={resource.data.staleAfterHours} fallback={resource.data.defaults.staleAfterHours}><input name="staleAfterHours" type="number" min="1" max="720" defaultValue={resource.data.staleAfterHours} /></Setting>
        <Setting label="Dim from (local hour, 0–23)" current={`${resource.data.dimStartHour}:00`} fallback={`${resource.data.defaults.dimStartHour}:00`}><input name="dimStartHour" type="number" min="0" max="23" defaultValue={resource.data.dimStartHour} /></Setting>
        <Setting label="Dim until (local hour, 0–23)" current={`${resource.data.dimEndHour}:00`} fallback={`${resource.data.defaults.dimEndHour}:00`}><input name="dimEndHour" type="number" min="0" max="23" defaultValue={resource.data.dimEndHour} /></Setting>
        <Setting label="Dim brightness (%)" current={resource.data.dimLevel} fallback={resource.data.defaults.dimLevel}><input name="dimLevel" type="number" min="10" max="100" defaultValue={resource.data.dimLevel} /></Setting>
        <button className="primary min-h-11 rounded-lg bg-brand px-5 font-semibold text-white" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
        <p className="text-xs text-muted">Last saved/applied by the server: {resource.data.appliedAt ? localInput(resource.data.appliedAt).replace("T", " ") : "Default values (not saved yet)"}</p>
      </form>
    </>}
  </>;
}

function Setting({ label, current, fallback, children }: { label: string; current: React.ReactNode; fallback: React.ReactNode; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-semibold">{label}<span className="text-xs font-normal text-muted">Current: {current} · Default: {fallback}</span>{children}</label>;
}
function Toggle({ label, name, checked, fallback }: { label: string; name: string; checked: boolean; fallback: boolean }) {
  return <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm font-semibold"><input type="checkbox" name={name} defaultChecked={checked} /><span>{label}<small className="block font-normal text-muted">Current: {checked ? "On" : "Off"} · Default: {fallback ? "On" : "Off"}</small></span></label>;
}
