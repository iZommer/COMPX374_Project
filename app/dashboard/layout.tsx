"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
const links = [
  ["availability", "◉", "Availability"],
  ["calendar", "▦", "Calendar"],
  ["contact", "▤", "Contact details"],
  ["display", "▣", "Display setup"],
  ["display-settings", "⚙", "Display settings"],
];
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [signOutError, setSignOutError] = useState("");
  useEffect(() => {
    if (!loading && !user && !error) router.replace("/login");
  }, [user, loading, error, router]);
  if (error)
    return (
      <main className="p-[60px] text-center max-w-[800px] m-auto [&_p]:my-5 [&_p]:mx-0 [&_a]:text-brand">
        <h1>Let’s get connected</h1>
        <p role="alert">{error}</p>
        <Link href="/login">Back to sign in →</Link>
      </main>
    );
  if (loading || !user)
    return (
      <main className="p-[60px] text-center max-w-[800px] m-auto" role="status">
        Loading your diary…
      </main>
    );
  return (
    <div className="flex min-h-screen pt-[65px] mobile:block">
      <a
        className="fixed left-2.5 top-[-80px] z-30 bg-white p-2.5 [&:focus]:top-2.5"
        href="#content"
      >
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-20 flex h-[65px] items-center border-b border-line bg-white mobile:px-[18px]">
        <Link
          className="flex min-w-0 items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand mobile:gap-3"
          href="/dashboard/availability"
        >
          <span className="flex w-[254px] shrink-0 items-center justify-center compact:w-[222px] mobile:w-auto">
            <img
              src="/logos/waikato_university.jpeg"
              alt="University of Waikato"
              className="h-auto max-h-[49px] w-auto max-w-[160px] object-contain mobile:max-w-[110px]"
            />
          </span>
          <div className="min-w-0 border-l border-line pl-9 compact:pl-[25px] mobile:pl-3">
            <span className="block text-[22px] font-bold leading-tight text-navy mobile:text-[18px]">
              Kei Hea a Nic?
            </span>
            <span className="block text-[11px] text-muted mobile:text-[9px]">
              Academic diary & availability
            </span>
          </div>
        </Link>
      </header>
      <aside className="w-[254px] shrink-0 bg-navy text-[#ecf3f9] flex flex-col overflow-y-auto pt-[30px] pr-5 pb-0 pl-5 fixed [inset:65px_auto_0_0] compact:w-[222px] compact:pl-3.5 compact:pr-3.5 mobile:static mobile:w-full mobile:pt-[18px] mobile:pr-[18px] mobile:pb-2.5 mobile:pl-[18px] mobile:[&_nav]:grid mobile:[&_nav]:grid-cols-2 mobile:[&_nav]:gap-1 mobile:[&_nav_a]:text-[11px] mobile:[&_nav_a]:whitespace-nowrap mobile:[&_nav_a]:py-2 mobile:[&_nav_a]:px-2.5 mobile:[&_nav_a]:gap-[7px] mobile:[&_nav_a_>_span]:text-[16px] mobile:[&_nav_i]:hidden">
        <p className="mt-0 mr-3 mb-3 ml-3 text-[9px] tracking-[1.9px] text-[#7e96ac] mobile:hidden">
          YOUR WORKSPACE
        </p>
        <nav
          className="grid gap-[7px] [&_a]:py-3 [&_a]:px-3.5 [&_a]:flex [&_a]:items-center [&_a]:gap-3.5 [&_a]:text-[#beccda] [&_a]:text-[13px] [&_a]:rounded-[7px] [&_a_>_span]:text-[20px] [&_a_>_span]:w-5 [&_a_>_span]:text-center [&_a:hover]:bg-[#1b344b] [&_a[aria-current='page']]:text-white [&_a[aria-current='page']]:bg-[#27415a] [&_i]:w-[5px] [&_i]:h-[5px] [&_i]:bg-[#80c9bc] [&_i]:rounded-full [&_i]:ml-auto"
          aria-label="Dashboard"
        >
          {links.map(([slug, icon, title]) => (
            <Link
              key={slug}
              href={`/dashboard/${slug}`}
              aria-current={path.endsWith(slug) ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              {title}
              {path.endsWith(slug) && <i />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-[50px] pr-3 pb-[27px] pl-3 [&_p]:text-[#dde7ef] [&_p]:text-[16px] [&_p]:tracking-[3px] [&_p]:leading-[1.6] [&_>_span]:text-[8px] [&_>_span]:text-[#90a6ba] mobile:hidden">
          <p>
            PEOPLE.
            <br />
            IDEAS.
            <br />
            IMPACT.
          </p>
          <div className="w-7 h-[3px] bg-[#df7c54] my-4 mx-0" />
          <span>Te Tangata · Ngā Whakaaro · Te Painga</span>
        </div>
        <div className="border-t border-t-[#ffffff16] flex gap-[11px] items-center py-[21px] px-0 min-w-0 [&_>_div:last-child]:min-w-0 [&_strong]:text-[10px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_button]:text-[10px] [&_button]:text-[#9eb2c5] [&_button]:mt-[3px] mobile:mt-3 mobile:py-2 mobile:px-0 mobile:justify-end mobile:[&_.avatar]:hidden mobile:[&_strong]:max-w-[130px]">
          <div className="avatar bg-[#2b475b] border border-[#ffffff20] w-[35px] h-[35px] grid place-items-center rounded-full shrink-0 text-[#d5e8e5]">
            {(user.displayName?.trim() || user.email?.[0] || "?")[0]?.toUpperCase()}
          </div>
          <div>
            <strong title={user.email || ""}>{user.displayName?.trim() || "Your workspace"}</strong>
            <button
              onClick={async () => {
                try {
                  await signOut(clientAuth());
                  router.replace("/login");
                } catch {
                  setSignOutError("Could not sign out. Please retry.");
                }
              }}
            >
              Sign out ↗
            </button>
          </div>
        </div>
        {signOutError && <p role="alert">{signOutError}</p>}
      </aside>
      <div className="ml-[254px] flex-1 min-w-0 flex flex-col compact:ml-[222px] mobile:m-0">
        <main
          key={user.uid}
          id="content"
          className="p-9 max-w-[1500px] w-full my-0 mx-auto flex-1 wide:pt-12 compact:p-[25px] mobile:py-[25px] mobile:px-4"
        >
          {children}
        </main>
        <footer className="py-5 px-9 border-t border-t-line text-[10px] text-[#8c9aa6] flex justify-between mobile:py-[18px] mobile:px-4 mobile:text-[8px] mobile:gap-[15px]">
          Kei Hea a Nic? <span>University of Waikato · Academic diary</span>
        </footer>
      </div>
    </div>
  );
}
