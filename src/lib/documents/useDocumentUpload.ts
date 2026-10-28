"use client";

import { useAppDispatch } from "@/lib/redux/hooks";
import {
  removeDocument,
  updateDocument,
  upsertDocument,
} from "@/lib/redux/slices/documentsSlice";
import type { StoredDocument } from "@/types/document";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Options {
  disabled?: boolean;
  onUploaded?: (document: StoredDocument) => void;
}

export function useDocumentUpload({
  disabled = false,
  onUploaded,
}: Options = {}) {
  const dispatch = useAppDispatch();

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
    if (disabled) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf" && extension !== "txt") {
      rejectFile(file, "Only PDF and TXT files are supported.");
      return;
    }

    if (file.size === 0) {
      rejectFile(file, "Cannot upload an empty file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      rejectFile(file, "File size must not exceed 10 MB.");
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

    function fail(error: string) {
      dispatch(updateDocument({
        id: temporaryId,
        changes: {
          status: "error",
          error,
        },
      }));
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;

      dispatch(updateDocument({
        id: temporaryId,
        changes: {
          progress: Math.round(
            (event.loaded / event.total) * 100
          ),
        },
      }));
    });

    xhr.upload.addEventListener("load", () => {
      dispatch(updateDocument({
        id: temporaryId,
        changes: {
          status: "processing",
          progress: 100,
        },
      }));
    });

    xhr.addEventListener("load", () => {
      let document: StoredDocument;

      try {
        const result = JSON.parse(xhr.responseText) as {
          document?: StoredDocument;
          error?: string;
        };

        if (xhr.status !== 201 || !result.document) {
          throw new Error(result.error ?? "Upload failed.");
        }

        document = result.document;
      } catch (error) {
        fail(
          error instanceof Error
            ? error.message
            : "Upload failed."
        );
        return;
      }

      dispatch(removeDocument(temporaryId));

      dispatch(upsertDocument({
        ...document,
        progress: 100,
      }));

      onUploaded?.(document);
    });

    xhr.addEventListener("error", () => {
      fail("Network error. Please try again.");
    });

    xhr.addEventListener("timeout", () => {
      fail("Upload timed out. Please try again.");
    });

    xhr.addEventListener("abort", () => {
      fail("Upload was cancelled.");
    });

    try {
      xhr.open("POST", "/api/documents");
      xhr.timeout = 60000;
      xhr.send(formData);
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Unable to start the upload."
      );
    }
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile);
  }

  return { handleFiles };
}