
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
    <div className="space-y-8">
      {/* Upload area */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
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
          className="block cursor-pointer"
        >
          <CloudUpload
            className="mx-auto mb-4 h-12 w-12 text-blue-600"
            aria-hidden="true"
          />

          <p className="text-lg font-semibold">
            Drag and drop documents here
          </p>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            PDF or TXT files, maximum 10 MB each
          </p>

          <span className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white">
            Browse Files
          </span>
        </label>
      </div>

      {/* Document library */}

      {/* Upload issues */}
      {failedDocuments.length > 0 && (
        <section
          aria-labelledby="upload-errors-heading"
          className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"
        >
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle
              className="h-5 w-5 text-red-600"
              aria-hidden="true"
            />

            <h3
              id="upload-errors-heading"
              className="font-semibold text-red-800 dark:text-red-300"
            >
              Upload Issues ({failedDocuments.length})
            </h3>
          </div>

          <ul className="space-y-3">
            {failedDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-white p-3 dark:border-red-900 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium">
                    {doc.name}
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {doc.error ?? "Upload failed."}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={`Dismiss error for ${doc.name}`}
                  title="Dismiss error"
                  onClick={() => dispatch(removeDocument(doc.id))}
                  className="rounded-md p-1 text-slate-500 hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
 
      <section aria-labelledby="uploaded-documents-heading">
        <h3
          id="uploaded-documents-heading"
          className="mb-4 text-lg font-semibold"
        >
          Documents ({libraryDocuments.length})
        </h3>

        {loadError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {deleteError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {deleteError}
          </p>
        )}

        {isLoading ? (
          <div className="animate-pulse rounded-xl border p-6">
            Loading your documents...
          </div>
        ) : libraryDocuments.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No documents uploaded yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {libraryDocuments.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className="mt-1 h-6 w-6 shrink-0 text-blue-600"
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {doc.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatSize(doc.size)} ·{" "}
                      {new Date(
                        doc.uploadedAt
                      ).toLocaleDateString()}
                    </p>

                    <div
                      className="mt-2 text-sm"
                      aria-live="polite"
                    >
                      {doc.status === "ready" && (
                        <span className="text-green-700 dark:text-green-400">
                          Ready
                        </span>
                      )}

                      {doc.status === "uploading" &&
                        `Uploading ${doc.progress}%`}

                      {doc.status === "processing" && (
                        <span className="inline-flex items-center gap-2">
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Saving file...
                        </span>
                      )}

                      {doc.status === "error" && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertCircle
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          {doc.error ?? "Upload failed"}
                        </span>
                      )}
                    </div>
                      {doc.status === "ready" && (
                        <DocumentTextPreview documentId={doc.id} />
        )}
                    {doc.status === "uploading" && (
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${doc.name}`}
                        aria-valuenow={doc.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                      >
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{
                            width: `${doc.progress}%`,
                          }}
                        />
                      </div>
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
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deletingId === doc.id ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
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
