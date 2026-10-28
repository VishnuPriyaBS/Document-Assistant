"use client";

import { useEffect, useState } from "react";
import {
  useAppDispatch,
  useAppSelector,
} from "@/lib/redux/hooks";
import { setDocuments } from "@/lib/redux/slices/documentsSlice";
import type { StoredDocument } from "@/types/document";

export function useDocuments() {
  const dispatch = useAppDispatch();

  const documents = useAppSelector(
    (state) => state.documents.documents
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as {
          documents?: StoredDocument[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(result.documents)) {
          throw new Error(
            result.error ?? "Unable to load documents."
          );
        }

        if (!controller.signal.aborted) {
          dispatch(setDocuments(result.documents));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load documents."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      controller.abort();
    };
  }, [dispatch]);

  return {
    documents,
    isLoading,
    loadError,
  };
}