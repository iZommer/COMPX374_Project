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
    <div className="grid grid-cols-[minmax(0,_1.85fr)_minmax(260px,_1fr)] gap-[22px] compact:grid-cols-1">
      <form
        className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5"
        onSubmit={save}
      >
        <h2>Contact details</h2>
        <p>Give visitors a way to reach you, wherever you are.</p>
        <fieldset
          disabled={busy}
          className="grid gap-[23px] mt-[27px] [&_>_.primary]:justify-self-start"
        >
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
              {f.key !== "email" && (
                <span className="text-[10px] text-[#8a97a3] font-normal ml-[7px]">
                  Optional
                </span>
              )}
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
          <button
            className="primary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-brand text-white shadow-[0_3px_7px_#08766015] [&:hover]:bg-[#065e4d]"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save contact details"}{" "}
            <span aria-hidden="true">✓</span>
          </button>
        </fieldset>
        <Notice message={feedback} error={failed} />
      </form>
      <aside className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5">
        <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
          VISITOR PREVIEW
        </p>
        <h2>Stay connected</h2>
        <div className="my-7 mx-0 border border-line rounded-[8px] py-0 px-[18px] bg-[#fafcfc] [&_>_div]:py-[19px] [&_>_div]:px-0 [&_>_div]:border-b [&_>_div]:border-b-line [&_>_div:last-child]:border-0 [&_span]:block [&_span]:text-[#82908f] [&_span]:text-[10px] [&_span]:uppercase [&_span]:tracking-[1px] [&_strong]:block [&_strong]:text-[13px] [&_strong]:mt-1.5 [&_strong]:[overflow-wrap:anywhere]">
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
        <p className="muted text-muted text-[12px]">
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
