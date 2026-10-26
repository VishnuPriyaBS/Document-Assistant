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
      className={`border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 ${
        isDragging ? "ring-2 ring-inset ring-blue-500" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!locked) setIsDragging(true);
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Documents for this chat</p>
          <p className="text-xs text-slate-500">
            {selectedDocuments.length} selected · up to {MAX_CHAT_DOCUMENTS}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={locked || isLoading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-white disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <Paperclip className="h-4 w-4" /> Upload
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={sectionId}
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-white dark:hover:bg-slate-800"
          >
            Choose files {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {selectedDocuments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Selected documents">
          {selectedDocuments.map((doc) => (
            <span key={doc.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="max-w-40 truncate" title={doc.name}>{doc.name}</span>
              {!locked && (
                <button
                  type="button"
                  aria-label={`Remove ${doc.name} from this chat`}
                  onClick={() => onToggle(doc.id, false)}
                  className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {locked && (
        <p className="mt-2 text-xs text-slate-500">
          This conversation uses a fixed document set. Start a New Chat to change it.
        </p>
      )}
      {!locked && !selectedIds.length && !isLoading && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Upload or select at least one document before asking a question.
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-2 space-y-1" aria-live="polite">
          {pending.map((doc) => (
            <p key={doc.id} className="text-xs text-slate-600 dark:text-slate-300">
              {doc.name}: {doc.status === "uploading" ? `${doc.progress}% uploaded` : "Saving..."}
            </p>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <div className="mt-2 space-y-1" aria-label="Upload issues">
          {failed.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 text-xs text-red-600" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 break-words">{doc.name}: {doc.error}</span>
              <button type="button" onClick={() => dispatch(removeDocument(doc.id))} aria-label={`Dismiss upload error for ${doc.name}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {loadError && <p role="alert" className="mt-2 text-xs text-red-600">{loadError}</p>}

      {expanded && (
        <div id={sectionId} className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
          {isLoading ? (
            <p className="p-2 text-xs text-slate-500">Loading document library...</p>
          ) : ready.length === 0 ? (
            <p className="p-2 text-xs text-slate-500">No saved documents yet. Use Upload to add one.</p>
          ) : (
            ready.map((doc) => (
              <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  disabled={locked || (!selectedIds.includes(doc.id) && selectedIds.length >= MAX_CHAT_DOCUMENTS)}
                  onChange={(event) => onToggle(doc.id, event.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="truncate" title={doc.name}>{doc.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
