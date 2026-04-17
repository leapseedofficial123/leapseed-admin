import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/auth-gate";
import { AppShell } from "@/components/app-shell";
import { AppStateProvider } from "@/context/app-state-context";
import { AuthProvider } from "@/context/auth-context";
import { withBasePath } from "@/lib/base-path";
import { APP_TITLE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "LeapSeed shared payroll application.",
  manifest: withBasePath("/manifest.webmanifest"),
  icons: {
    icon: [
      {
        url: withBasePath("/branding/leapseed-home-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: withBasePath("/branding/leapseed-home-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: withBasePath("/branding/leapseed-apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: [withBasePath("/branding/leapseed-home-icon-192.png")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <AuthProvider>
          <AppStateProvider>
            <AuthGate>
              <AppShell>{children}</AppShell>
            </AuthGate>
          </AppStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
