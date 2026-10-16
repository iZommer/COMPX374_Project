"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase";
import { AppHeader } from "@/components/app-header";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const auth = clientAuth();
      const credential = await (
        register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      )(auth, String(form.get("email")), String(form.get("password")));
      if (register) {
        const name = String(form.get("name") || "").trim();
        if (!name) throw new Error("Enter your name to create your account.");
        await updateProfile(credential.user, { displayName: name });
      }
      router.replace("/dashboard/availability");
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === "auth/weak-password"
          ? "Choose a stronger password that meets your account policy."
          : code === "auth/email-already-in-use"
            ? "This email is already registered. Please sign in."
            : code === "auth/too-many-requests"
              ? "Too many attempts. Please try again later."
              : code === "auth/network-request-failed"
                ? "Unable to connect. Check your internet connection."
                : code
                  ? "Unable to sign in. Check your email and password, then try again."
                  : e instanceof Error
                    ? e.message
                    : "Authentication failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader variant="login" />
      <div className="login-content flex min-h-[calc(100vh-80px)] justify-center px-6 pb-10 mobile:min-h-[calc(100vh-76px)]">
        <div className="login-card-grid grid h-fit w-full max-w-[900px] overflow-hidden rounded-[11px] border border-line bg-white shadow-[0_3px_12px_#152e4304]">
        <section className="login-intro-panel flex flex-col justify-center bg-[var(--waikato-light)] px-10 py-12">
          <p className="eyebrow text-[12px] font-bold tracking-[1.8px] text-ink">ACADEMIC DIARY</p>
          <h1 className="mt-1 text-ink">Kei Hea a Nic?</h1>
          <p className="mt-1 font-serif text-[22px] text-muted">Where is Nic?</p>
          <div className="my-6 h-[3px] w-10 rounded-full bg-brand" />
          <p className="max-w-[340px] text-[14px] text-ink">Keep your availability, weekly diary and contact details in one place.</p>
        </section>
        <section className="login-form-panel w-full p-10">
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p className="mt-1 text-[12px]">
          {register
            ? "Set up your academic diary."
            : "Sign in to manage your office information."}
        </p>
        <form className="mt-6 grid gap-[22px] [&_label]:text-[12px]" onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                className="auth-input"
                required
                name="name"
                type="text"
                maxLength={120}
                autoComplete="name"
                placeholder="e.g. Aroha Ngata"
              />
            </label>
          )}
          <label>
            Email address
            <input
              className="auth-input"
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@waikato.ac.nz"
            />
          </label>
          <label>
            Password
            <input
              className="auth-input"
              required
              name="password"
              type="password"
              minLength={register ? 8 : 1}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={
                register ? "At least 8 characters" : "Enter your password"
              }
            />
          </label>
          {error && (
            <p
              role="alert"
              className="error my-4 mx-0 py-3 px-[15px] rounded-[7px] text-[12px] bg-[#fff0ed] text-[#a43729]"
            >
              {error}
            </p>
          )}
          <button
            className="primary w-full inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-transparent whitespace-nowrap bg-brand text-white hover:brightness-90"
            disabled={busy}
          >
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="text-center !mt-6 [&_a]:text-brand [&_a]:font-semibold [&_a]:ml-[5px]">
          {register ? "Already have an account?" : "New here?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        </section>
        </div>
      </div>
    </main>
  );
}
