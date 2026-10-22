/** Public account-creation route using the shared Firebase authentication form. */
import { AuthForm } from "@/components/auth-form";
/** Public account creation page, using the shared Firebase authentication form. */
export default function Register() {
  return <AuthForm register />;
}
