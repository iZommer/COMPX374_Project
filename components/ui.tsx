"use client";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/client-api";
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-[30px] [&_>_p:last-child]:mt-[11px] [&_>_p:last-child]:text-[14px] mobile:mb-[22px] mobile:[&_>_p:last-child]:text-[12px]">
      <p className="eyebrow text-[10px] tracking-[1.8px] font-bold text-[#738293] mb-3.5">
        {eyebrow}
      </p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <p
      className={`my-4 mx-0 py-3 px-[15px] rounded-[7px] text-[12px] bg-[#eaf1f5] text-[#38566e] [&.success]:bg-[#ecf6f0] [&.success]:text-[#186e4b] [&.error]:bg-[#fff0ed] [&.error]:text-[#a43729] ${error ? "error" : "success"}`}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  ) : null;
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<T>(path)
      .then((value) => {
        if (live) setData(value);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [path, attempt]);
  return { data, setData, error, retry: () => setAttempt((x) => x + 1) };
}
export function ResourceState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div className="bg-white border border-line rounded-[11px] p-[27px] shadow-[0_3px_12px_#152e4304] [&_>_p:not(.eyebrow)]:mt-[7px] wide:p-8 mobile:p-5">
      <p role={error ? "alert" : "status"}>
        {error || "Loading your information…"}
      </p>
      {error && (
        <button
          className="secondary mt-4 inline-flex items-center justify-center gap-[22px] min-h-[42px] rounded-[7px] py-2.5 px-[18px] text-[13px] font-semibold border border-[transparent] whitespace-nowrap bg-white border-[#d7e0e5] text-[#3c5064] [&:hover]:bg-[#f0f5f5]"
          onClick={retry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
