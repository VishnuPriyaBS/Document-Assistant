
import { Palette, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function SettingsPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Settings
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Customize how your DocAI workspace looks.
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-primary-soft p-3 text-on-primary-soft">
            <Palette
              className="h-5 w-5"
              aria-hidden="true"
            />
          </span>

          <div>
            <h3 className="text-lg font-semibold">
              Appearance
            </h3>

            <p className="text-sm text-muted-foreground">
              Choose the theme that is easiest
              for you to read.
            </p>
          </div>
        </div>

        <ThemeToggle showChoices />

        <p className="mt-4 text-xs text-muted-foreground">
          Your choice is saved in this browser
          and restored when you return.
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-surface-muted p-3 text-muted-foreground">
            <ShieldCheck
              className="h-5 w-5"
              aria-hidden="true"
            />
          </span>

          <div>
            <h3 className="text-lg font-semibold">
              Privacy reminder
            </h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This assessment version uses local
              shared document storage and does not
              provide user accounts. Avoid uploading
              confidential information to a publicly
              accessible instance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
