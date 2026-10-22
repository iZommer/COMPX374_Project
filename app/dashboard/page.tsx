/** Dashboard index redirects to the default availability editor. */
import { redirect } from "next/navigation";
/** Keeps the dashboard root pointed at the availability editor. */
export default function Dashboard() {
  redirect("/dashboard/availability");
}
