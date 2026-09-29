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
    <div className="flex min-h-screen mobile:block">
      <a
        className="fixed left-2.5 top-[-80px] z-[10] bg-white p-2.5 [&:focus]:top-2.5"
        href="#content"
      >
        Skip to content
      </a>
      <aside className="w-[254px] shrink-0 bg-navy text-[#ecf3f9] flex flex-col pt-[30px] pr-5 pb-0 pl-5 fixed [inset:0_auto_0_0] compact:w-[222px] compact:pl-3.5 compact:pr-3.5 mobile:static mobile:w-full mobile:pt-[18px] mobile:pr-[18px] mobile:pb-2.5 mobile:pl-[18px] mobile:[&_nav]:grid mobile:[&_nav]:grid-cols-2 mobile:[&_nav]:gap-1 mobile:[&_nav_a]:text-[11px] mobile:[&_nav_a]:whitespace-nowrap mobile:[&_nav_a]:py-2 mobile:[&_nav_a]:px-2.5 mobile:[&_nav_a]:gap-[7px] mobile:[&_nav_a_>_span]:text-[16px] mobile:[&_nav_i]:hidden">
        <Link
          className="flex gap-[11px] items-center text-white [&_>_span:last-child]:font-serif [&_>_span:last-child]:text-[9px] [&_>_span:last-child]:tracking-[1.6px] [&_>_span:last-child]:leading-[1.4] [&_strong]:block [&_strong]:text-[25px] [&_strong]:tracking-[1px] [&_strong]:font-normal [&_em]:block [&_em]:text-[#e6aa6d] [&_em]:text-[8px] [&_em]:tracking-[0.2px] mobile:hidden"
          href="/dashboard/availability"
        >
          <span
            className="border-[2px] border-[#d7a25d] border-t-[5px] border-t-[#c86f45] py-1 px-2 rounded-[2px_2px_14px_14px] font-serif text-[25px] text-[#ecc07f]"
            aria-hidden="true"
          >
            W
          </span>
          <span>
            THE UNIVERSITY OF<strong>WAIKATO</strong>
            <em>Te Whare Wānanga o Waikato</em>
          </span>
        </Link>
        <div className="mt-[37px] mr-2 mb-9 ml-2 [&_h2]:text-[22px] [&_h2]:text-white [&_p]:text-[11px] [&_p]:text-[#aabfce] [&_p]:mt-1.5 mobile:mt-0 mobile:mr-0 mobile:mb-4 mobile:ml-0 mobile:[&_h2]:text-[21px] mobile:[&_p]:text-[10px]">
          <h2>Kei Hea a Nic?</h2>
          <p>Academic diary & availability</p>
        </div>
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
        <div className="border-t border-t-[#ffffff16] flex gap-[11px] items-center py-[21px] px-0 min-w-0 [&_>_div:last-child]:min-w-0 [&_strong]:text-[10px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_button]:text-[10px] [&_button]:text-[#9eb2c5] [&_button]:mt-[3px] mobile:absolute mobile:right-[18px] mobile:top-3 mobile:py-2 mobile:px-0 mobile:border-0 mobile:max-w-[150px] mobile:[&_.avatar]:hidden mobile:[&_strong]:max-w-[130px]">
          <div className="avatar bg-[#2b475b] border border-[#ffffff20] w-[35px] h-[35px] grid place-items-center rounded-full shrink-0 text-[#d5e8e5]">
            {user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <strong title={user.email || ""}>{user.email}</strong>
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
        <div className="h-[65px] border-b border-b-line bg-white flex items-center justify-between py-0 px-9 text-[#83909c] text-[11px] compact:py-0 compact:px-[25px] mobile:h-[42px] mobile:py-0 mobile:px-[18px] mobile:text-[9px]">
          <span>School of Computing & Mathematical Sciences</span>
          <span className="py-1 px-2.5 border border-line rounded-[5px] text-[#657686] text-[10px] mobile:hidden">
            Academic workspace
          </span>
        </div>
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
