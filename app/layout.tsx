import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Kei Hea a Nic? | Academic diary",
  description:
    "Academic availability and diary for the School of Computing and Mathematical Sciences.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
