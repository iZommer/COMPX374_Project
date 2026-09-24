"use client";
import { useState } from "react";
import { api, errorText } from "@/lib/client-api";
import {
  Notice,
  PageHeading,
  ResourceState,
  useResource,
} from "@/components/ui";
type Contact = { email: string; phone: string; officeLocation: string };
function ContactForm({ initial }: { initial: Contact }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    setFailed(false);
    try {
      await api("contact", {
        method: "PUT",
        body: JSON.stringify({
          email: data.email,
          phone: data.phone,
          officeLocation: data.officeLocation,
        }),
      });
      setFeedback("Your contact details have been saved.");
    } catch (e) {
      setFailed(true);
      setFeedback(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-grid">
      <form className="panel" onSubmit={save}>
        <h2>Contact details</h2>
        <p>Give visitors a way to reach you, wherever you are.</p>
        <fieldset disabled={busy} className="form-stack">
          {(
            [
              {
                key: "email",
                label: "Contact email",
                type: "email",
                placeholder: "you@waikato.ac.nz",
                max: 254,
              },
              {
                key: "phone",
                label: "Phone number",
                type: "tel",
                placeholder: "+64 7 838 4466",
                max: 50,
              },
              {
                key: "officeLocation",
                label: "Office location",
                type: "text",
                placeholder: "e.g. G.2.15",
                max: 120,
              },
            ] as const
          ).map((f) => (
            <label key={f.key}>
              {f.label}
              {f.key !== "email" && <span className="optional">Optional</span>}
              <input
                type={f.type}
                required={f.key === "email"}
                maxLength={f.max}
                value={data[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => {
                  setData({ ...data, [f.key]: e.target.value });
                  setFeedback("");
                }}
              />
            </label>
          ))}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save contact details"}{" "}
            <span aria-hidden="true">✓</span>
          </button>
        </fieldset>
        <Notice message={feedback} error={failed} />
      </form>
      <aside className="panel">
        <p className="eyebrow">VISITOR PREVIEW</p>
        <h2>Stay connected</h2>
        <div className="contact-preview">
          <div>
            <span>Email</span>
            <strong>{data.email || "No email added"}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{data.phone || "No phone added"}</strong>
          </div>
          <div>
            <span>Office</span>
            <strong>{data.officeLocation || "No office added"}</strong>
          </div>
        </div>
        <p className="muted">
          These details are shared through your display API. Your sign-in email
          stays the same.
        </p>
      </aside>
    </div>
  );
}
export default function ContactPage() {
  const resource = useResource<Contact>("contact");
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE / CONTACT"
        title="Make it easy to connect"
        description="Choose the contact details visitors see outside your office."
      />
      {resource.data ? (
        <ContactForm initial={resource.data} />
      ) : (
        <ResourceState {...resource} />
      )}
    </>
  );
}
