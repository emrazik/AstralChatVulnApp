import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "AstralChat",
  description: "Chat with an astral guide for star-sign insights"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
