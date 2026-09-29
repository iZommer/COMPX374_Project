"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, errorText } from "@/lib/client-api";
import {
  Notice,
  PageHeading,
  ResourceState,
  useResource,
} from "@/components/ui";
type DisplayKey = { apiKey: string; pairedAt: string | null };
export default function DisplayPage() {
  const resource = useResource<DisplayKey>("display-key");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setQr("");
    if (resource.data)
      QRCode.toDataURL(resource.data.apiKey, {
        width: 240,
        margin: 2,
        color: { dark: "#10283f", light: "#ffffff" },
      })
        .then((value) => {
          if (live) setQr(value);
        })
        .catch(() => {
          if (live) {
            setFailed(true);
            setMessage(
              "The QR code could not be generated. You can still copy the key.",
            );
          }
        });
    return () => {
      live = false;
    };
  }, [resource.data]);
  async function regenerate() {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      resource.setData(
        await api<DisplayKey>("display-key", { method: "POST" }),
      );
      setMessage("New key generated. Your previous key no longer works.");
      setConfirm(false);
    } catch (e) {
      setFailed(true);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const endpoint = resource.data
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/display/${resource.data.apiKey}/latest`
    : "";
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE / DISPLAY"
        title="Your office, connected"
        description="Prepare a secure connection for your future office display."
      />
      {!resource.data ? (
        <ResourceState {...resource} />
      ) : (
        <div className="grid grid-cols-[minmax(0,_1.85fr)_minmax(260px,_1fr)] gap-[22px] compact:grid-cols-1">
          <section className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5">
            <div className="flex gap-3 justify-between items-start mb-[23px] [&_p]:mt-[5px] [&_p]:text-[12px] mobile:flex-wrap">
              <div>
                <h2>Display pairing key</h2>
                <p>Use this key when configuring a display.</p>
              </div>
              <span className="py-1 px-[9px] rounded-[4px] bg-[#f1f6f4] text-[#628377] text-[9px] whitespace-nowrap">
                {resource.data.pairedAt ? "Paired" : "Not paired"}
              </span>
            </div>
            <div className="p-[18px] bg-[#f3f6f7] border border-line rounded-[7px] mt-[22px] mr-0 mb-3.5 ml-0 break-all text-[13px]">
              <code>{resource.data.apiKey}</code>
            </div>
            <button
              className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(resource.data!.apiKey);
                  setFailed(false);
                  setMessage("Display key copied.");
                } catch {
                  setFailed(true);
                  setMessage("Could not copy. Select and copy the key above.");
                }
              }}
            >
              Copy key
            </button>
            <div className="h-[1px] bg-line my-[25px] mx-0" />
            <h3>Latest information endpoint</h3>
            <p className="mt-2">
              A read-only JSON feed for availability, this week’s calendar and
              contact details.
            </p>
            <code className="block break-all text-[11px] bg-[#f3f6f7] border border-line rounded-[5px] p-3 my-[15px] mx-0">
              GET {endpoint}
            </code>
            <p className="muted text-muted text-[12px]">
              Anyone with this key can read your visitor information. Keep it
              private and regenerate it if it is shared unintentionally.
            </p>
            <div className="h-[1px] bg-line my-[25px] mx-0" />
            {confirm ? (
              <div>
                <p>Regenerating immediately disables the current key.</p>
                <div className="mt-4 flex gap-4 items-center mt-5 [&_.muted]:text-[10px] mobile:items-start mobile:flex-col">
                  <button
                    className="inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-[#b33e3e] text-white"
                    disabled={busy}
                    onClick={regenerate}
                  >
                    {busy ? "Generating…" : "Generate new key"}
                  </button>
                  <button
                    className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="secondary inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
                onClick={() => setConfirm(true)}
              >
                Regenerate key ↻
              </button>
            )}
            <Notice message={message} error={failed} />
          </section>
          <aside className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] text-center [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5 [&_img]:my-[26px] [&_img]:mx-auto [&_img]:border [&_img]:border-line [&_img]:p-3 [&_img]:rounded-[10px] [&_p]:text-[12px] compact:[&_img]:ml-0 compact:text-left">
            <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
              READY FOR YOUR DISPLAY
            </p>
            <h2>Scan to configure</h2>
            {qr ? (
              <img
                src={qr}
                width={240}
                height={240}
                alt="QR code containing your display pairing key"
              />
            ) : (
              <p role="status">Generating QR code…</p>
            )}
            <p>This QR code contains your pairing key.</p>
            <div className="h-[1px] bg-line my-[25px] mx-0" />
            <p className="muted text-muted text-[12px]">
              Display pairing will be available in a future release. No device
              is connected or polled by this page.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
