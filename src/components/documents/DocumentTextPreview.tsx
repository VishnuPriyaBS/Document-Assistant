
"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
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
  error?: string;
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

      const result =
        (await response.json()) as PreviewResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to read document."
        );
      }

      setData(result);
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
        className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-primary hover:underline"
      >
        <FileText
          className="h-4 w-4"
          aria-hidden="true"
        />

        {open ? "Hide text preview" : "Preview text"}

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
          className="mt-3 space-y-4 rounded-xl border border-app-border bg-surface-muted p-4"
        >
          {loading && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Reading document...
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {data && (
            <>
              <p className="text-sm font-semibold">
                {data.totalPages} page(s) ·{" "}
                {data.totalCharacters.toLocaleString()} characters
              </p>

              {data.warning && (
                <p className="rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {data.warning}
                </p>
              )}

              {data.preview.map((page) => (
                <div
                  key={page.pageNumber}
                  className="rounded-xl border border-app-border bg-surface p-4"
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Page {page.pageNumber}
                  </p>

                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {page.text}
                  </p>
                </div>
              ))}

              {data.preview.length > 0 && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Showing up to 700 characters
                  from each of the first three
                  readable pages.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
