import type { Metadata, Viewport } from "next";
import RouteCleanup from "@/shared/RouteCleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fix-It-Flow",
  description: "Your voice-first repair mentor. Stop the e-waste.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fix-It-Flow",
  },
};

export const viewport: Viewport = {
  themeColor: "#00C896",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-dark antialiased">
        <RouteCleanup />
        {children}
      </body>
    </html>
  );
}
