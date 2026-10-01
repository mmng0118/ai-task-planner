import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "poco plan — little steps, big wins",
  description: "課題を小さく分けて、ひとつずつ進める学生向けタスクプランナー。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
