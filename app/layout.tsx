import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Task Planner",
  description: "学生向けタスクプランナー",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Task Planner",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3479af",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ja"><body><ServiceWorkerRegistration />{children}</body></html>;
}
