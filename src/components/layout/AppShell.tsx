
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Files,
  MessageSquareText,
  Settings,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

import ThemeToggle from "@/components/layout/ThemeToggle";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: Files,
  },
  {
    name: "AI Chat",
    href: "/chat",
    icon: MessageSquareText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sidebarOpen]);

  const currentPage =
    navigation.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href ||
          pathname.startsWith(item.href + "/")
    ) ?? navigation[0];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only"
      >
        Skip to main content
      </a>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Application sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-app-border bg-surface shadow-xl transition-transform duration-200 md:static md:translate-x-0 md:shadow-none ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-18 items-center justify-between border-b border-app-border px-5">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
              <Sparkles
                className="h-5 w-5"
                aria-hidden="true"
              />
            </span>

            <span>
              <span className="block text-lg font-bold tracking-tight">
                DocAI
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Document workspace
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted md:hidden"
          >
            <X
              className="h-5 w-5"
              aria-hidden="true"
            />
          </button>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1.5 p-4"
        >
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>

          {navigation.map(
            ({ name, href, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href ||
                    pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={
                    active ? "page" : undefined
                  }
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-soft text-on-primary-soft"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <Icon
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                  {name}
                </Link>
              );
            }
          )}
        </nav>

        <div className="border-t border-app-border px-5 py-4 text-xs text-muted-foreground">
          DocAI · Frontend assessment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-app-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
              className="rounded-lg p-2 text-foreground hover:bg-surface-muted md:hidden"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu
                className="h-5 w-5"
                aria-hidden="true"
              />
            </button>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Your workspace
              </p>

              <h1 className="text-lg font-semibold tracking-tight">
                {currentPage.name}
              </h1>
            </div>
          </div>

          <ThemeToggle />
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
