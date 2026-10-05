"use client";
import { useState } from "react";
import { api, errorText } from "@/lib/client-api";
import { localInput, localToISO } from "@/lib/time";
import {
  Notice,
  PageHeading,
  ResourceState,
  useResource,
} from "@/components/ui";
const statuses = [
  {
    id: "AVAILABLE",
    label: "Available",
    hint: "Happy to be interrupted",
    icon: "✓",
    color: "[--status:#229161] [--tint:#dff1e5] [--pale:#f0f8f3]",
  },
  {
    id: "IN_A_MEETING",
    label: "In a meeting",
    hint: "Please come back later",
    icon: "−",
    color: "[--status:#db6c62] [--tint:#fbe2dd] [--pale:#fff5f3]",
  },
  {
    id: "TEACHING",
    label: "Teaching",
    hint: "In class or facilitating",
    icon: "♧",
    color: "[--status:#b78037] [--tint:#fbebd3] [--pale:#fdf8ee]",
  },
  {
    id: "OUT_OF_OFFICE",
    label: "Out of office",
    hint: "Away from my desk",
    icon: "◷",
    color: "[--status:#7c8b9c] [--tint:#e7edf1] [--pale:#f4f6f8]",
  },
];
type Availability = {
  status: string;
  expectedReturnTime: string | null;
  customMessage: string | null;
  overrideStatus: string | null;
  overrideUntil: string | null;
  overrideMessage: string | null;
  updatedAt: string;
};
function AvailabilityForm({ initial }: { initial: Availability }) {
  const [status, setStatus] = useState(initial.status);
  const [returnTime, setReturnTime] = useState(
    initial.expectedReturnTime ? localInput(initial.expectedReturnTime) : "",
  );
  const [message, setMessage] = useState(initial.customMessage || "");
  const [overrideStatus, setOverrideStatus] = useState(initial.overrideStatus || "");
  const [overrideUntil, setOverrideUntil] = useState(
    initial.overrideUntil ? localInput(initial.overrideUntil) : "",
  );
  const [overrideMessage, setOverrideMessage] = useState(initial.overrideMessage || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const selected = statuses.find((s) => s.id === status)!;
  const change = () => {
    setDirty(true);
    setFeedback("");
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    setFailed(false);
    try {
      await api("availability", {
        method: "PUT",
        body: JSON.stringify({
          status,
          expectedReturnTime: returnTime ? localToISO(returnTime) : null,
          customMessage: message || null,
          overrideStatus: overrideStatus || null,
          overrideUntil: overrideUntil ? localToISO(overrideUntil) : null,
          overrideMessage: overrideMessage || null,
        }),
      });
      setFeedback(
        "Availability saved. Your latest information is ready for your display.",
      );
      setDirty(false);
    } catch (e) {
      setFailed(true);
      setFeedback(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="grid grid-cols-[minmax(0,_1.85fr)_minmax(260px,_1fr)] gap-[22px] compact:grid-cols-1">
        <form
          className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5"
          onSubmit={save}
        >
          <div className="flex gap-3 justify-between items-start mb-[23px] [&_p]:mt-[5px] [&_p]:text-[12px] mobile:flex-wrap">
            <div>
              <h2>Current status</h2>
              <p>Let visitors know when you’re free.</p>
            </div>
            <span className="py-1 px-[9px] rounded-[4px] bg-[#f1f6f4] text-[#628377] text-[9px] whitespace-nowrap">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </div>
          <fieldset disabled={busy}>
            <legend className="sr-only">Choose your availability</legend>
            <div className="grid grid-cols-4 gap-[11px] mobile:grid-cols-2">
              {statuses.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  aria-pressed={status === s.id}
                  onClick={() => {
                    setStatus(s.id);
                    change();
                  }}
                  className={`relative flex flex-col items-center text-center border border-[#e4eaec] rounded-[8px] pt-5 pr-2 pb-[17px] pl-2 min-h-[162px] bg-[#fbfcfc] [&_strong]:text-[12px] [&_strong]:text-ink [&_strong]:mt-3 [&_strong]:mr-0 [&_strong]:mb-1 [&_strong]:ml-0 [&_>_span:not(.status-icon):not(.selected-tick)]:text-[10px] [&_>_span:not(.status-icon):not(.selected-tick)]:leading-[1.7] [&_>_span:not(.status-icon):not(.selected-tick)]:text-[#758391] [&.selected]:border-[var(--status)] [&.selected]:bg-[var(--pale)] [&.selected]:shadow-[0_0_0_1px_var(--status)] wide:min-h-[180px] compact:min-h-[145px] mobile:min-h-[135px] ${s.color} ${status === s.id ? "selected" : ""}`}
                >
                  <span
                    className="status-icon inline-flex items-center justify-center w-[39px] h-[39px] rounded-full text-[23px] text-[var(--status)] bg-[var(--tint)] shrink-0"
                    aria-hidden="true"
                  >
                    {s.icon}
                  </span>
                  <strong>{s.label}</strong>
                  <span>{s.hint}</span>
                  {status === s.id && (
                    <span
                      className="selected-tick absolute right-[7px] top-1 text-[11px] text-[var(--status)]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="h-[1px] bg-line my-[25px] mx-0" />
            <label>
              When will you be back?{" "}
              <span className="text-[10px] text-[#8a97a3] font-normal ml-[7px]">
                Optional
              </span>
              <span className="block text-[11px] font-normal text-muted mt-1 mr-0 mb-[11px] ml-0">
                Your expected return, in New Zealand time.
              </span>
              <input
                type="datetime-local"
                value={returnTime}
                onChange={(e) => {
                  setReturnTime(e.target.value);
                  change();
                }}
              />
            </label>
            {returnTime && (
              <button
                type="button"
                className="text-[12px] text-brand font-semibold py-2 px-0"
                onClick={() => {
                  setReturnTime("");
                  change();
                }}
              >
                Clear return time
              </button>
            )}
            <label className="mt-6">
              Add a message{" "}
              <span className="text-[10px] text-[#8a97a3] font-normal ml-[7px]">
                Optional
              </span>
              <span className="block text-[11px] font-normal text-muted mt-1 mr-0 mb-[11px] ml-0">
                A short note for anyone stopping by your office.
              </span>
              <textarea
                rows={3}
                maxLength={200}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  change();
                }}
                placeholder="e.g. Please email me if it’s urgent."
              />
            </label>
            <div className="mt-7 rounded-xl border border-[#d7e7e1] bg-[#f4faf7] p-5 mobile:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Force a temporary status</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    This overrides a calendar event on the display until the time you choose. The active event takes over again after it expires.
                  </p>
                </div>
                {overrideStatus && (
                  <span className="rounded-full bg-[#e1f2e9] px-3 py-1 text-[10px] font-bold text-[#18734d]">Override on</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 mobile:grid-cols-1">
                <label className="!mt-0">
                  Force status
                  <select
                    value={overrideStatus}
                    onChange={(e) => { setOverrideStatus(e.target.value); change(); }}
                  >
                    <option value="">No override</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
                <label className="!mt-0">
                  Keep override until
                  <input
                    type="datetime-local"
                    required={Boolean(overrideStatus)}
                    value={overrideUntil}
                    disabled={!overrideStatus}
                    onChange={(e) => { setOverrideUntil(e.target.value); change(); }}
                  />
                </label>
              </div>
              <label className="mt-4">
                Override message <span className="text-[10px] text-muted">Optional</span>
                <input
                  maxLength={200}
                  value={overrideMessage}
                  disabled={!overrideStatus}
                  placeholder="e.g. Stepped out briefly"
                  onChange={(e) => { setOverrideMessage(e.target.value); change(); }}
                />
              </label>
              {overrideStatus && (
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-brand underline"
                  onClick={() => { setOverrideStatus(""); setOverrideUntil(""); setOverrideMessage(""); change(); }}
                >Clear force status</button>
              )}
            </div>
            <p className="text-right text-[10px] mt-[5px]">
              {message.length}/200
            </p>
            <div className="flex gap-4 items-center mt-5 [&_.muted]:text-[10px] mobile:items-start mobile:flex-col">
              <button
                className="primary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-brand text-white shadow-[0_3px_7px_#08766015] [&:hover]:bg-[#065e4d]"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save changes"}{" "}
                <span aria-hidden="true">✓</span>
              </button>
              <span className="muted text-muted text-[12px]">
                You’re in control of your availability.
              </span>
            </div>
          </fieldset>
          <Notice message={feedback} error={failed} />
        </form>
        <aside className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] [&_>_p:not(.eyebrow)]:text-[12px] wide:p-8 mobile:p-5 compact:[&_.visitor-card]:max-w-[500px]">
          <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
            VISITOR PREVIEW
          </p>
          <h2>Outside your office</h2>
          <p>A preview of the information you share.</p>
          <div
            className={`visitor-card border border-[var(--tint)] rounded-[8px] [background:linear-gradient(140deg,_var(--pale),_#fff)] mt-6 pt-[23px] pr-5 pb-0 pl-5 overflow-hidden ${selected.color}`}
          >
            <div className="flex gap-3 items-start [&_strong]:block [&_strong]:text-[var(--status)] [&_strong]:text-[19px] [&_strong]:leading-[1.3] [&_div_>_span]:block [&_div_>_span]:text-[11px] [&_div_>_span]:text-[#72808e] [&_div_>_span]:mt-[7px]">
              <span
                className="status-icon inline-flex items-center justify-center w-[39px] h-[39px] rounded-full text-[23px] text-[var(--status)] bg-[var(--tint)] shrink-0"
                aria-hidden="true"
              >
                {selected.icon}
              </span>
              <div>
                <strong>{selected.label}</strong>
                <span>
                  {returnTime
                    ? `Expected back ${returnTime.replace("T", " at ")}`
                    : selected.hint}
                </span>
              </div>
            </div>
            {message && (
              <p className="text-[13px] mt-[22px] whitespace-pre-wrap [overflow-wrap:anywhere]">
                {message}
              </p>
            )}
            <div
              className="leading-[1] mt-[35px] flex justify-around items-end text-[#7a9f94] text-[65px] h-[95px] opacity-[0.6] [&_span:nth-child(2)]:text-[90px] compact:h-[95px] compact:mt-5"
              aria-hidden="true"
            >
              <span>⌂</span>
              <span>♧</span>
              <span>⌂</span>
            </div>
            <p className="text-[8px] tracking-[1.4px] bg-[#e5eeea] text-center my-0 mx-[-20px] p-[9px]">
              KEI HEA A NIC? · WHERE IS NIC?
            </p>
          </div>
          <div className="text-[10px] text-[#81918a] text-center mt-[18px] compact:text-left">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#339d80] mr-1.5" />{" "}
            {dirty
              ? "Preview includes unsaved changes"
              : "Your current availability"}
          </div>
        </aside>
      </div>
      <section className="flex gap-[17px] items-start border border-[#dde7eb] bg-[#edf3f6] py-[21px] px-6 rounded-[9px] mt-[25px] [&_h3]:text-[13px] [&_p]:text-[11px] [&_p]:mt-1 [&_p]:leading-[1.8] mobile:p-[18px]">
        <span
          className="grid place-items-center w-[29px] h-[29px] rounded-full bg-[#dce8ef] text-[#486b82] font-bold shrink-0"
          aria-hidden="true"
        >
          i
        </span>
        <div>
          <h3>Keep everyone in the loop</h3>
          <p>
            Saved changes are available immediately through your display API.
            Your saved availability is used by default. While a calendar event
            is in progress, the display shows that event’s selected status;
            your saved availability resumes when it ends.
          </p>
        </div>
      </section>
    </>
  );
}
export default function AvailabilityPage() {
  const resource = useResource<Availability>("availability");
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE / AVAILABILITY"
        title="Manage availability"
        description="A quick update makes it easier for others to find you."
      />
      {resource.data ? (
        <AvailabilityForm initial={resource.data} />
      ) : (
        <ResourceState {...resource} />
      )}
    </>
  );
}
