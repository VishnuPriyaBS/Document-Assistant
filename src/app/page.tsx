
import Link from "next/link";
import {
  ArrowUpRight,
  Files,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const destinations = [
  {
    href: "/documents",
    title: "Document Library",
    description:
      "Upload PDF and TXT files, review their status, and manage your documents.",
    icon: Files,
    action: "Manage documents",
  },
  {
    href: "/chat",
    title: "AI Assistant",
    description:
      "Choose the source files, ask questions, and check cited answers.",
    icon: MessageSquareText,
    action: "Start a conversation",
  },
];

export default function HomePage() {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-on-primary shadow-sm sm:px-10 sm:py-12">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-current/30 px-3 py-1 text-xs font-semibold">
            <Sparkles
              className="h-4 w-4"
              aria-hidden="true"
            />
            Your AI-powered document workspace
          </span>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find answers in your documents.
          </h2>

          <p className="max-w-xl text-sm leading-7 opacity-90 sm:text-base">
            Upload your files, ask questions naturally,
            and follow source citations to see where
            the information came from.
          </p>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
          >
            Open AI Chat
            <ArrowUpRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold tracking-tight">
          What would you like to do?
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose where to start. You can upload
          documents directly from chat too.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {destinations.map(
          ({
            href,
            title,
            description,
            icon: Icon,
            action,
          }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-app-border bg-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 inline-flex rounded-xl bg-primary-soft p-3 text-on-primary-soft">
                <Icon
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </div>

              <h4 className="text-lg font-semibold">
                {title}
              </h4>

              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {description}
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {action}
                <ArrowUpRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          )
        )}
      </div>
    </section>
  );
}
