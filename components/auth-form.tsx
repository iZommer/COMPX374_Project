"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase";
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
      await (
        register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      )(auth, String(form.get("email")), String(form.get("password")));
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
    <main className="auth-page">
      <section className="auth-intro">
        <p className="eyebrow">UNIVERSITY OF WAIKATO · SCMS</p>
        <h1>Kei Hea a Nic?</h1>
        <p className="auth-translation">Where is Nic?</p>
        <div className="intro-rule" />
        <p>
          A little clarity.
          <br />A better connection.
        </p>
        <span>
          Keep your availability, weekly diary and contact details in one place.
        </span>
      </section>
      <section className="auth-card">
        <div className="brand-mark">
          N<span>↗</span>
        </div>
        <p className="eyebrow">ACADEMIC DIARY</p>
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p>
          {register
            ? "Set up your academic diary."
            : "Sign in to manage your office information."}
        </p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
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
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <button className="primary w-full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New here?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
