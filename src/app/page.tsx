
import Link from "next/link";
import { Files, MessageSquareText } from "lucide-react";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">
          Welcome to DocAI
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Upload your documents and ask AI-powered questions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/documents"
          className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900"
        >
          <Files className="mb-4 h-8 w-8 text-blue-600" />
          <h3 className="text-xl font-semibold">
            My Documents
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Upload and manage PDF and text files.
          </p>
        </Link>

        <Link
          href="/chat"
          className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900"
        >
          <MessageSquareText className="mb-4 h-8 w-8 text-blue-600" />
          <h3 className="text-xl font-semibold">
            AI Assistant
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Chat with your uploaded documents.
          </p>
        </Link>
      </div>
    </section>
  );
}
