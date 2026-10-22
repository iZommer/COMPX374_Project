/** Public sign-in route; Firebase form behavior is shared with registration. */
import { AuthForm } from "@/components/auth-form";
/** Public sign-in page; authentication form behavior lives in the shared component. */
export default function Login() {
  return <AuthForm />;
}
