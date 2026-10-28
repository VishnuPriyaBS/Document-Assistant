
"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const KEY = "docai-theme";
const EVENT = "docai-theme-change";

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const useDark =
      event.newValue === "dark" ||
      (event.newValue !== "light" && prefersDark);

    document.documentElement.classList.toggle("dark", useDark);
    notify();
  };

  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerTheme = (): Theme => "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark"
  );

  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Theme can still change if storage is unavailable.
  }

  window.dispatchEvent(new Event(EVENT));
}

export default function ThemeToggle({
  showChoices = false,
}: {
  showChoices?: boolean;
}) {
  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    getServerTheme
  );

  if (showChoices) {
    return (
      <div
        className="flex flex-wrap gap-3"
        aria-label="Colour theme"
      >
        {(["light", "dark"] as const).map((option) => {
          const Icon = option === "light" ? Sun : Moon;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => applyTheme(option)}
              className={`flex min-w-36 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                theme === option
                  ? "border-primary bg-primary-soft text-on-primary-soft"
                  : "border-app-border bg-surface text-foreground hover:bg-surface-muted"
              }`}
            >
              <Icon
                className="h-5 w-5"
                aria-hidden="true"
              />
              {option === "light" ? "Light" : "Dark"}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={
        theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      title={
        theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      onClick={() =>
        applyTheme(theme === "dark" ? "light" : "dark")
      }
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-surface text-foreground transition-colors hover:bg-surface-muted"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
