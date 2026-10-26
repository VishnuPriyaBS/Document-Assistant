
export type DocumentStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "error";

// Document information saved by the backend
export interface StoredDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "ready";
}

// Frontend document with additional UI state
export interface DocumentItem
  extends Omit<StoredDocument, "status"> {
  status: DocumentStatus;
  progress: number;
  error?: string;
}
