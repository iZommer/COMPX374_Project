"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { clientAuth } from "@/lib/firebase";
import { errorText } from "@/lib/client-api";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
}>({ user: null, loading: true, error: "" });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    user: null as User | null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    try {
      return onIdTokenChanged(
        clientAuth(),
        (user) => setState({ user, loading: false, error: "" }),
        () =>
          setState({
            user: null,
            loading: false,
            error: "Unable to check your session.",
          }),
      );
    } catch (e) {
      setState({ user: null, loading: false, error: errorText(e) });
    }
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
