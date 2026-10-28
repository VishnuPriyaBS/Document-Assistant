
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import StoreProvider from "./StoreProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocAI | AI Document Assistant",
  description:
    "Upload documents, ask questions and verify answers with citations.",
};

const themeInit = `(function () {
  var dark = false;

  try {
    var saved = localStorage.getItem("docai-theme");

    dark =
      saved === "dark" ||
      (saved !== "light" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
  } catch (e) {
    dark = matchMedia("(prefers-color-scheme: dark)").matches;
  }

  document.documentElement.classList.toggle("dark", dark);
})();`;

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script
          id="docai-theme-init"
          strategy="beforeInteractive"
        >
          {themeInit}
        </Script>

        <Suspense
          fallback={
            <main className="p-8">
              Loading DocAI…
            </main>
          }
        >
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
