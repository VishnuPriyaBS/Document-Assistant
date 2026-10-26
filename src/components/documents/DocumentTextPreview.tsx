
"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
} from "lucide-react";

interface PreviewPage {
  pageNumber: number;
  text: string;
}

interface PreviewResponse {
  documentName: string;
  totalPages: number;
  totalCharacters: number;
  preview: PreviewPage[];
  warning: string | null;
}

interface Props {
  documentId: string;
}

export default function DocumentTextPreview({
  documentId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] =
    useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (data) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/preview`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to read document."
        );
      }

      setData(result as PreviewResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-expanded={open}
        aria-controls={`preview-${documentId}`}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {open ? "Hide Text" : "Preview Text"}

        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <section
          id={`preview-${documentId}`}
          aria-label="Extracted document text"
          className="mt-3 space-y-3 rounded-lg border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          {loading && (
            <p className="flex items-center gap-2 text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Reading document...
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {data && (
            <>
              <p className="text-sm font-medium">
                {data.totalPages} page(s) ·{" "}
                {data.totalCharacters.toLocaleString()} characters
              </p>

              {data.warning && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {data.warning}
                </p>
              )}

              {data.preview.map((page) => (
                <div key={page.pageNumber}>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Page {page.pageNumber}
                  </p>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {page.text}
                  </p>
                </div>
              ))}

              {data.preview.length > 0 && (
                <p className="text-xs text-slate-500">
                  Showing up to 700 characters from
                  each of the first 3 readable pages.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
