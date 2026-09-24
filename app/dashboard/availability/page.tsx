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
    color: "green",
  },
  {
    id: "IN_A_MEETING",
    label: "In a meeting",
    hint: "Please come back later",
    icon: "−",
    color: "red",
  },
  {
    id: "TEACHING",
    label: "Teaching",
    hint: "In class or facilitating",
    icon: "♧",
    color: "amber",
  },
  {
    id: "OUT_OF_OFFICE",
    label: "Out of office",
    hint: "Away from my desk",
    icon: "◷",
    color: "slate",
  },
];
type Availability = {
  status: string;
  expectedReturnTime: string | null;
  customMessage: string | null;
  updatedAt: string;
};
function AvailabilityForm({ initial }: { initial: Availability }) {
  const [status, setStatus] = useState(initial.status);
  const [returnTime, setReturnTime] = useState(
    initial.expectedReturnTime ? localInput(initial.expectedReturnTime) : "",
  );
  const [message, setMessage] = useState(initial.customMessage || "");
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
      <div className="content-grid">
        <form className="panel" onSubmit={save}>
          <div className="panel-heading">
            <div>
              <h2>Current status</h2>
              <p>Let visitors know when you’re free.</p>
            </div>
            <span className="subtle-tag">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </div>
          <fieldset disabled={busy}>
            <legend className="sr-only">Choose your availability</legend>
            <div className="status-grid">
              {statuses.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  aria-pressed={status === s.id}
                  onClick={() => {
                    setStatus(s.id);
                    change();
                  }}
                  className={`status-option ${s.color} ${status === s.id ? "selected" : ""}`}
                >
                  <span className="status-icon" aria-hidden="true">
                    {s.icon}
                  </span>
                  <strong>{s.label}</strong>
                  <span>{s.hint}</span>
                  {status === s.id && (
                    <span className="selected-tick" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="divider" />
            <label>
              When will you be back? <span className="optional">Optional</span>
              <span className="field-hint">
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
                className="text-button"
                onClick={() => {
                  setReturnTime("");
                  change();
                }}
              >
                Clear return time
              </button>
            )}
            <label className="mt-6">
              Add a message <span className="optional">Optional</span>
              <span className="field-hint">
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
            <p className="char-count">{message.length}/200</p>
            <div className="form-actions">
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}{" "}
                <span aria-hidden="true">✓</span>
              </button>
              <span className="muted">
                You’re in control of your availability.
              </span>
            </div>
          </fieldset>
          <Notice message={feedback} error={failed} />
        </form>
        <aside className="panel preview-panel">
          <p className="eyebrow">VISITOR PREVIEW</p>
          <h2>Outside your office</h2>
          <p>A preview of the information you share.</p>
          <div className={`visitor-card ${selected.color}`}>
            <div className="preview-status">
              <span className="status-icon" aria-hidden="true">
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
            {message && <p className="preview-message">{message}</p>}
            <div className="preview-art" aria-hidden="true">
              <span>⌂</span>
              <span>♧</span>
              <span>⌂</span>
            </div>
            <p className="preview-caption">KEI HEA A NIC? · WHERE IS NIC?</p>
          </div>
          <div className="preview-note">
            <span className="live-dot" />{" "}
            {dirty
              ? "Preview includes unsaved changes"
              : "Your current availability"}
          </div>
        </aside>
      </div>
      <section className="info-panel">
        <span className="info-icon" aria-hidden="true">
          i
        </span>
        <div>
          <h3>Keep everyone in the loop</h3>
          <p>
            Saved changes are available immediately through your display API.
            Availability is set manually and does not change automatically with
            your calendar.
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
