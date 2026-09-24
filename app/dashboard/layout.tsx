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
      <main className="setup-error">
        <h1>Let’s get connected</h1>
        <p role="alert">{error}</p>
        <Link href="/login">Back to sign in →</Link>
      </main>
    );
  if (loading || !user)
    return (
      <main className="loading" role="status">
        Loading your diary…
      </main>
    );
  return (
    <div className="dashboard">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="university" href="/dashboard/availability">
          <span className="crest" aria-hidden="true">
            W
          </span>
          <span>
            THE UNIVERSITY OF<strong>WAIKATO</strong>
            <em>Te Whare Wānanga o Waikato</em>
          </span>
        </Link>
        <div className="app-brand">
          <h2>Kei Hea a Nic?</h2>
          <p>Academic diary & availability</p>
        </div>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Dashboard">
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
        <div className="sidebar-bottom">
          <p>
            PEOPLE.
            <br />
            IDEAS.
            <br />
            IMPACT.
          </p>
          <div className="accent-rule" />
          <span>Te Tangata · Ngā Whakaaro · Te Painga</span>
        </div>
        <div className="account">
          <div className="avatar">{user.email?.[0]?.toUpperCase()}</div>
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
      <div className="main-area">
        <div className="topbar">
          <span>School of Computing & Mathematical Sciences</span>
          <span className="workspace-badge">Academic workspace</span>
        </div>
        <main key={user.uid} id="content" className="page-content">
          {children}
        </main>
        <footer>
          Kei Hea a Nic? <span>University of Waikato · Academic diary</span>
        </footer>
      </div>
    </div>
  );
}
