/** Root route redirects visitors to the dashboard's availability editor. */
import { redirect } from "next/navigation";
/** Redirects the site root to the authenticated availability dashboard. */
export default function Home() {
  redirect("/dashboard/availability");
}
