/**
 * components/StatusIcon.tsx
 *
 * Purpose: Maps display status values to the compact SVG icons used across the dashboard.
 */
import type { ReactNode } from "react";

export type StatusIconName = "AVAILABLE" | "IN_A_MEETING" | "TEACHING" | "OUT_OF_OFFICE";

const paths: Record<StatusIconName, ReactNode> = {
  AVAILABLE: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  IN_A_MEETING: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
  TEACHING: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8" /></>,
  OUT_OF_OFFICE: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function StatusIcon({ status, className }: { status: StatusIconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[status]}</svg>;
}
