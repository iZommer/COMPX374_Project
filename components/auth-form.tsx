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
    <main className="min-h-screen grid grid-cols-2 mobile:block">
      <section className="bg-navy text-white py-[70px] px-[12%] flex flex-col justify-center [&_.eyebrow]:text-[#a4bbc9] [&_h1]:text-[51px] [&_h1]:mt-[60px] [&_>_p:not(.eyebrow):not(.auth-translation)]:text-[30px] [&_>_p:not(.eyebrow):not(.auth-translation)]:leading-[1.4] [&_>_p:not(.eyebrow):not(.auth-translation)]:text-[#e3efee] [&_>_p:not(.eyebrow):not(.auth-translation)]:tracking-[-0.5px] [&_>_span]:text-[13px] [&_>_span]:text-[#99adbd] [&_>_span]:mt-5 [&_>_span]:max-w-[300px] mobile:p-[30px] mobile:[&_h1]:text-[32px] mobile:[&_h1]:mt-2.5 mobile:[&_h1]:mr-0 mobile:[&_h1]:mb-0 mobile:[&_h1]:ml-0 mobile:[&_.eyebrow]:text-[8px] mobile:[&_.intro-rule]:hidden mobile:[&_>_span]:hidden mobile:[&_>_p:not(.eyebrow):not(.auth-translation)]:hidden">
        <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
          UNIVERSITY OF WAIKATO · SCMS
        </p>
        <h1>Kei Hea a Nic?</h1>
        <p className="auth-translation text-[#a7c3cc] font-serif text-[24px] mt-[9px] mobile:text-[18px]">
          Where is Nic?
        </p>
        <div className="intro-rule w-[43px] h-[3px] bg-[#dc825c] my-10 mx-0" />
        <p>
          A little clarity.
          <br />A better connection.
        </p>
        <span>
          Keep your availability, weekly diary and contact details in one place.
        </span>
      </section>
      <section className="self-center justify-self-center max-w-[440px] w-full p-[45px] [&_h2]:text-[28px] [&_>_p:not(.eyebrow)]:text-[12px] [&_>_p:not(.eyebrow)]:mt-2.5 [&_form]:grid [&_form]:gap-[22px] [&_form]:mt-[30px] [&_label]:text-[12px] mobile:py-8 mobile:px-[25px] mobile:m-auto">
        <div className="text-brand font-serif text-[35px] mb-10 [&_>_span]:font-sans [&_>_span]:text-[20px] [&_>_span]:ml-1 mobile:hidden">
          N<span>↗</span>
        </div>
        <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
          ACADEMIC DIARY
        </p>
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
            <p
              role="alert"
              className="error my-4 mx-0 py-3 px-[15px] rounded-[7px] text-[12px] bg-[#eaf1f5] text-[#38566e] [&.success]:bg-[#ecf6f0] [&.success]:text-[#186e4b] [&.error]:bg-[#fff0ed] [&.error]:text-[#a43729]"
            >
              {error}
            </p>
          )}
          <button
            className="primary w-full inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-brand text-white shadow-[0_3px_7px_#08766015] [&:hover]:bg-[#065e4d]"
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
    </main>
  );
}
