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
        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Display pairing key</h2>
                <p>Use this key when configuring a display.</p>
              </div>
              <span className="subtle-tag">
                {resource.data.pairedAt ? "Paired" : "Not paired"}
              </span>
            </div>
            <div className="key-box">
              <code>{resource.data.apiKey}</code>
            </div>
            <button
              className="secondary"
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
            <div className="divider" />
            <h3>Latest information endpoint</h3>
            <p className="mt-2">
              A read-only JSON feed for availability, this week’s calendar and
              contact details.
            </p>
            <code className="endpoint">GET {endpoint}</code>
            <p className="muted">
              Anyone with this key can read your visitor information. Keep it
              private and regenerate it if it is shared unintentionally.
            </p>
            <div className="divider" />
            {confirm ? (
              <div>
                <p>Regenerating immediately disables the current key.</p>
                <div className="form-actions mt-4">
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={regenerate}
                  >
                    {busy ? "Generating…" : "Generate new key"}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="secondary" onClick={() => setConfirm(true)}>
                Regenerate key ↻
              </button>
            )}
            <Notice message={message} error={failed} />
          </section>
          <aside className="panel qr-panel">
            <p className="eyebrow">READY FOR YOUR DISPLAY</p>
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
            <div className="divider" />
            <p className="muted">
              Display pairing will be available in a future release. No device
              is connected or polled by this page.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
