/**
 * components/app-header.tsx
 *
 * Purpose: Renders the shared navigation header for login and authenticated dashboard views.
 */
import Link from "next/link";

export function AppHeader({ variant = "dashboard" }: { variant?: "dashboard" | "login" }) {
  const login = variant === "login";
  return (
    <header className={`inset-x-0 top-0 z-20 flex items-center border-b border-line bg-white ${login ? "relative h-[80px] px-7 mobile:h-[76px] mobile:px-5" : "fixed h-[65px] mobile:px-[18px]"}`}>
      {login ? (
        <span className="flex shrink-0 items-center justify-start">
          <img src="/logos/uow-logo.png" alt="University of Waikato" className="h-[58px] w-auto object-contain mobile:h-[56px]" />
        </span>
      ) : (
        <Link className="flex min-w-0 items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand mobile:gap-3" href="/dashboard/availability">
          <span className="flex w-[254px] shrink-0 items-center justify-start pl-[18px] compact:w-[222px] compact:pl-2 mobile:w-auto mobile:pl-0">
            <img src="/logos/uow-logo.png" alt="University of Waikato" className="h-auto max-h-[55px] w-auto max-w-[185px] bg-white p-1 object-contain mobile:max-h-[52px] mobile:max-w-[125px]" />
          </span>
          <div className="min-w-0 border-l border-line pl-9 compact:pl-[25px] mobile:pl-3">
            <span className="block text-[22px] font-bold leading-tight text-navy mobile:text-[18px]">Kei Hea a Nic?</span>
            <span className="block text-[11px] text-muted mobile:text-[9px]">Academic diary &amp; availability</span>
          </div>
        </Link>
      )}
    </header>
  );
}
