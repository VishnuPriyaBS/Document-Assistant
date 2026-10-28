
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import {
  CloudUpload,
  FileText,
  Trash2,
  AlertCircle,
  LoaderCircle,
  X
} from "lucide-react";

import {
  useAppDispatch,
  useAppSelector,
} from "@/lib/redux/hooks";

import {
  setDocuments,
  upsertDocument,
  updateDocument,
  removeDocument,
} from "@/lib/redux/slices/documentsSlice";

import type {
  DocumentItem,
  StoredDocument,
} from "@/types/document";

import DocumentTextPreview from "./DocumentTextPreview";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

export default function DocumentUploader() {
  const dispatch = useAppDispatch();

  const documents = useAppSelector(
    (state) => state.documents.documents
  );

const failedDocuments = documents.filter(
  (doc) => doc.status === "error"
);

const libraryDocuments = documents.filter(
  (doc) => doc.status !== "error"
);

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load previously saved documents on page open
  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
        });

        const result = (await response.json()) as {
          documents?: StoredDocument[];
          error?: string;
        };

        if (!response.ok || !result.documents) {
          throw new Error(
            result.error ?? "Unable to load documents."
          );
        }

        if (active) {
          dispatch(setDocuments(result.documents));
        }
      } catch (error) {
        if (active) {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      active = false;
    };
  }, [dispatch]);

  function addRejectedFile(file: File, error: string) {
    dispatch(
      upsertDocument({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: "error",
        progress: 0,
        error,
      })
    );
  }

  function uploadFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !["pdf", "txt"].includes(extension)) {
      addRejectedFile(
        file,
        "Only PDF and TXT files are supported."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      addRejectedFile(
        file,
        "File size must not exceed 10 MB."
      );
      return;
    }

    if (file.size === 0) {
      addRejectedFile(file, "Cannot upload an empty file.");
      return;
    }

    const temporaryId = crypto.randomUUID();

    dispatch(
      upsertDocument({
        id: temporaryId,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: "uploading",
        progress: 0,
      })
    );

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/documents");
    xhr.timeout = 60000;

    // Real progress of bytes sent to the server
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round(
          (event.loaded / event.total) * 100
        );

        dispatch(
          updateDocument({
            id: temporaryId,
            changes: { progress },
          })
        );
      }
    });

    // Upload finished, waiting for server to save file
    xhr.upload.addEventListener("load", () => {
      dispatch(
        updateDocument({
          id: temporaryId,
          changes: {
            status: "processing",
            progress: 100,
          },
        })
      );
    });

    xhr.addEventListener("load", () => {
      try {
        const result = JSON.parse(xhr.responseText) as {
          document?: StoredDocument;
          error?: string;
        };

        if (xhr.status !== 201 || !result.document) {
          throw new Error(
            result.error ?? "Upload failed."
          );
        }

        dispatch(removeDocument(temporaryId));

        dispatch(
          upsertDocument({
            ...result.document,
            progress: 100,
          })
        );
      } catch (error) {
        dispatch(
          updateDocument({
            id: temporaryId,
            changes: {
              status: "error",
              error: getErrorMessage(error),
            },
          })
        );
      }
    });

    xhr.addEventListener("error", () => {
      dispatch(
        updateDocument({
          id: temporaryId,
          changes: {
            status: "error",
            error: "Network error. Please try again.",
          },
        })
      );
    });

    xhr.addEventListener("timeout", () => {
      dispatch(
        updateDocument({
          id: temporaryId,
          changes: {
            status: "error",
            error: "Upload timed out. Please try again.",
          },
        })
      );
    });

    xhr.send(formData);
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.files) {
      handleFiles(event.target.files);
    }

    // Allow selecting the same file again
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  async function handleDelete(doc: DocumentItem) {
    setDeleteError("");

    // Failed uploads exist only in Redux
    if (doc.status === "error") {
      dispatch(removeDocument(doc.id));
      return;
    }

    if (doc.status !== "ready") return;

    setDeletingId(doc.id);

    try {
      const response = await fetch(
        `/api/documents?id=${encodeURIComponent(doc.id)}`,
        { method: "DELETE" }
      );

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to delete document."
        );
      }

      dispatch(removeDocument(doc.id));
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }


  return (
    <div className="space-y-7">
      {/* Upload area */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
          isDragging
            ? "border-primary bg-primary-soft"
            : "border-app-border bg-surface hover:border-primary"
        }`}
      >
        <input
          id="document-file-input"
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />

        <label
          htmlFor="document-file-input"
          className="block cursor-pointer rounded-xl"
        >
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-on-primary-soft">
            <CloudUpload
              className="h-8 w-8"
              aria-hidden="true"
            />
          </span>

          <span className="block text-lg font-semibold text-foreground">
            Drag and drop documents here
          </span>

          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
            Or browse your computer to add files
          </span>

          <span className="mt-1 block text-xs text-muted-foreground">
            PDF or TXT · Maximum 10 MB per file
          </span>

          <span className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover">
            Browse Files
          </span>
        </label>
      </div>

      {/* Upload errors */}
      {failedDocuments.length > 0 && (
        <section
          aria-labelledby="upload-errors-heading"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950 sm:p-5"
        >
          <h3
            id="upload-errors-heading"
            className="mb-3 flex items-center gap-2 font-semibold text-red-800 dark:text-red-200"
          >
            <AlertCircle
              className="h-5 w-5"
              aria-hidden="true"
            />
            Upload issues ({failedDocuments.length})
          </h3>

          <ul className="space-y-2">
            {failedDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-surface p-3 dark:border-red-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">
                    {doc.name}
                  </p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {doc.error ?? "Upload failed."}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={`Dismiss error for ${doc.name}`}
                  title="Dismiss error"
                  onClick={() =>
                    dispatch(removeDocument(doc.id))
                  }
                  className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  <X
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Library */}
      <section
        aria-labelledby="uploaded-documents-heading"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3
              id="uploaded-documents-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Your documents
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {libraryDocuments.length} file
              {libraryDocuments.length === 1 ? "" : "s"} in your library
            </p>
          </div>

          <span className="rounded-full border border-app-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            PDF + TXT
          </span>
        </div>

        {loadError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {loadError}
          </p>
        )}

        {deleteError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {deleteError}
          </p>
        )}

        {isLoading ? (
          <div
            role="status"
            aria-label="Loading documents"
            className="space-y-3"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-4 rounded-2xl border border-app-border bg-surface p-5"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl bg-surface-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-surface-muted" />
                  <div className="h-3 w-1/3 rounded bg-surface-muted" />
                </div>
              </div>
            ))}
            <span className="sr-only">
              Loading your documents...
            </span>
          </div>
        ) : libraryDocuments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-border bg-surface p-8 text-center sm:p-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
              <FileText
                className="h-7 w-7"
                aria-hidden="true"
              />
            </span>

            <h4 className="text-lg font-semibold">
              Your library is empty
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Upload a PDF or TXT document above.
              Once it is ready, you can preview it here
              or ask questions in AI Chat.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {libraryDocuments.map((doc) => (
              <li
                key={doc.id}
                className="rounded-2xl border border-app-border bg-surface p-4 shadow-sm transition-colors hover:border-primary sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-on-primary-soft">
                    <FileText
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold sm:text-base">
                      {doc.name}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatSize(doc.size)} ·{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>

                    <div
                      className="mt-3"
                      aria-live="polite"
                    >
                      {doc.status === "ready" && (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          Ready
                        </span>
                      )}

                      {doc.status === "uploading" && (
                        <span className="text-sm font-medium text-muted-foreground">
                          Uploading {doc.progress}%
                        </span>
                      )}

                      {doc.status === "processing" && (
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Saving file...
                        </span>
                      )}
                    </div>

                    {doc.status === "uploading" && (
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${doc.name}`}
                        aria-valuenow={doc.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${doc.progress}%`,
                          }}
                        />
                      </div>
                    )}

                    {doc.status === "ready" && (
                      <DocumentTextPreview
                        documentId={doc.id}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${doc.name}`}
                    title="Remove document"
                    onClick={() => void handleDelete(doc)}
                    disabled={
                      deletingId === doc.id ||
                      doc.status === "uploading" ||
                      doc.status === "processing"
                    }
                    className="shrink-0 rounded-xl border border-app-border p-2.5 text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950 dark:hover:text-red-200"
                  >
                    {deletingId === doc.id ? (
                      <LoaderCircle
                        className="h-5 w-5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

}
