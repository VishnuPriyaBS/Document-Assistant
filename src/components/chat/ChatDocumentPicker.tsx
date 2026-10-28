"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, ChevronDown, ChevronUp, FileText, Paperclip, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  removeDocument,
  setDocuments,
  updateDocument,
  upsertDocument,
} from "@/lib/redux/slices/documentsSlice";
import { MAX_CHAT_DOCUMENTS } from "@/lib/redux/slices/chatSlice";
import type { StoredDocument } from "@/types/document";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  selectedIds: string[];
  locked: boolean;
  onToggle: (documentId: string, selected: boolean) => void;
}

function getError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function ChatDocumentPicker({ selectedIds, locked, onToggle }: Props) {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.documents);
  const inputRef = useRef<HTMLInputElement>(null);
  const sectionId = useId();

  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const ready = documents.filter((doc) => doc.status === "ready");
  const pending = documents.filter(
    (doc) => doc.status === "uploading" || doc.status === "processing"
  );
  const failed = documents.filter((doc) => doc.status === "error");
  const selectedDocuments = ready.filter((doc) => selectedIds.includes(doc.id));

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/documents", { cache: "no-store" });
        const result = (await response.json()) as {
          documents?: StoredDocument[];
          error?: string;
        };
        if (!response.ok || !result.documents) {
          throw new Error(result.error ?? "Unable to load documents.");
        }
        if (active) dispatch(setDocuments(result.documents));
      } catch (error) {
        if (active) setLoadError(getError(error));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [dispatch]);

  function rejectFile(file: File, error: string) {
    dispatch(upsertDocument({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "error",
      progress: 0,
      error,
    }));
  }

  function uploadFile(file: File) {
    if (locked || isLoading) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf" && extension !== "txt") {
      rejectFile(file, "Only PDF and TXT files are supported.");
      return;
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      rejectFile(file, file.size === 0 ? "File is empty." : "Maximum size is 10 MB.");
      return;
    }

    const temporaryId = crypto.randomUUID();
    dispatch(upsertDocument({
      id: temporaryId,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "uploading",
      progress: 0,
    }));

    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");
    xhr.timeout = 60000;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        dispatch(updateDocument({
          id: temporaryId,
          changes: { progress: Math.round((event.loaded / event.total) * 100) },
        }));
      }
    });
    xhr.upload.addEventListener("load", () => {
      dispatch(updateDocument({
        id: temporaryId,
        changes: { status: "processing", progress: 100 },
      }));
    });
    xhr.addEventListener("load", () => {
      try {
        const result = JSON.parse(xhr.responseText) as {
          document?: StoredDocument;
          error?: string;
        };
        if (xhr.status !== 201 || !result.document) {
          throw new Error(result.error ?? "Upload failed.");
        }
        dispatch(removeDocument(temporaryId));
        dispatch(upsertDocument({ ...result.document, progress: 100 }));
        // Attach the saved file to the new/empty conversation.
        onToggle(result.document.id, true);
      } catch (error) {
        dispatch(updateDocument({
          id: temporaryId,
          changes: { status: "error", error: getError(error) },
        }));
      }
    });
    xhr.addEventListener("error", () => {
      dispatch(updateDocument({
        id: temporaryId,
        changes: { status: "error", error: "Network error during upload." },
      }));
    });
    xhr.addEventListener("timeout", () => {
      dispatch(updateDocument({
        id: temporaryId,
        changes: { status: "error", error: "Upload timed out." },
      }));
    });
    xhr.send(formData);
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!locked && !isLoading) handleFiles(event.dataTransfer.files);
  }


  return (
    <div
      className={`shrink-0 border-b border-app-border bg-surface-muted p-3 sm:p-4 ${
        isDragging
          ? "ring-2 ring-inset ring-primary"
          : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!locked && !isLoading) {
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        aria-label="Upload PDF or text documents for this chat"
        className="sr-only"
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        multiple
        disabled={locked || isLoading}
        onChange={handleInputChange}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Documents for this chat
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {selectedDocuments.length} selected · up to{" "}
            {MAX_CHAT_DOCUMENTS}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={locked || isLoading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip
              className="h-4 w-4"
              aria-hidden="true"
            />
            Upload
          </button>

          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={sectionId}
            onClick={() =>
              setExpanded((value) => !value)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            Choose files
            {expanded ? (
              <ChevronUp
                className="h-4 w-4"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="h-4 w-4"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {selectedDocuments.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-2"
          aria-label="Selected documents"
        >
          {selectedDocuments.map((doc) => (
            <span
              key={doc.id}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-app-border bg-primary-soft px-3 py-1.5 text-xs font-medium text-on-primary-soft"
            >
              <FileText
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />

              <span
                className="max-w-40 truncate"
                title={doc.name}
              >
                {doc.name}
              </span>

              {!locked && (
                <button
                  type="button"
                  aria-label={`Remove ${doc.name} from this chat`}
                  onClick={() =>
                    onToggle(doc.id, false)
                  }
                  className="rounded-full p-1 transition-colors hover:bg-surface"
                >
                  <X
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {locked && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This conversation uses a fixed document
          set. Start a New Chat to change it.
        </p>
      )}

      {!locked &&
        selectedIds.length === 0 &&
        !isLoading && (
          <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Upload or select at least one document
            before asking a question.
          </p>
        )}

      {pending.length > 0 && (
        <div
          className="mt-3 space-y-2"
          aria-live="polite"
        >
          {pending.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-app-border bg-surface p-3"
            >
              <p
                className="truncate text-xs font-medium"
                title={doc.name}
              >
                {doc.name} ·{" "}
                {doc.status === "uploading"
                  ? `Uploading ${doc.progress}%`
                  : "Saving..."}
              </p>

              <div
                role="progressbar"
                aria-label={`Uploading ${doc.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={doc.progress}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${doc.progress}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <div
          className="mt-3 space-y-2"
          aria-label="Upload issues"
        >
          {failed.map((doc) => (
            <div
              key={doc.id}
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              <AlertCircle
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />

              <span className="min-w-0 flex-1 break-words">
                {doc.name}: {doc.error}
              </span>

              <button
                type="button"
                aria-label={`Dismiss upload error for ${doc.name}`}
                onClick={() =>
                  dispatch(removeDocument(doc.id))
                }
                className="rounded-md p-1 hover:bg-red-100 dark:hover:bg-red-900"
              >
                <X
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <p
          role="alert"
          className="mt-3 text-xs text-red-700 dark:text-red-300"
        >
          {loadError}
        </p>
      )}

      {expanded && (
        <div
          id={sectionId}
          className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-app-border bg-surface p-2"
        >
          {isLoading ? (
            <div
              role="status"
              className="space-y-2 p-2"
              aria-label="Loading documents"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-8 animate-pulse rounded-lg bg-surface-muted"
                />
              ))}

              <span className="sr-only">
                Loading document library...
              </span>
            </div>
          ) : ready.length === 0 ? (
            <p className="p-3 text-center text-xs leading-5 text-muted-foreground">
              No saved documents yet. Use Upload
              to add one.
            </p>
          ) : (
            ready.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(
                    doc.id
                  )}
                  disabled={
                    locked ||
                    (!selectedIds.includes(doc.id) &&
                      selectedIds.length >=
                        MAX_CHAT_DOCUMENTS)
                  }
                  onChange={(event) =>
                    onToggle(
                      doc.id,
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-primary"
                />

                <FileText
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />

                <span
                  className="min-w-0 truncate"
                  title={doc.name}
                >
                  {doc.name}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );

}
