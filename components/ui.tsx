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
    <header className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
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
      className={`notice ${error ? "error" : "success"}`}
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
    <div className="panel">
      <p role={error ? "alert" : "status"}>
        {error || "Loading your information…"}
      </p>
      {error && (
        <button className="secondary mt-4" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
