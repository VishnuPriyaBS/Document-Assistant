
import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  DocumentItem,
  StoredDocument,
} from "@/types/document";

interface DocumentsState {
  documents: DocumentItem[];
}

const initialState: DocumentsState = {
  documents: [],
};

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    // Load documents already saved on the server
    setDocuments(
      state,
      action: PayloadAction<StoredDocument[]>
    ) {
      const savedDocuments = action.payload.map((doc) => ({
        ...doc,
        progress: 100,
      }));

      const pendingDocuments = state.documents.filter(
        (doc) => doc.status !== "ready"
      );

      state.documents = [
        ...pendingDocuments,
        ...savedDocuments,
      ];
    },

    // Insert a document or update an existing one
    upsertDocument(
      state,
      action: PayloadAction<DocumentItem>
    ) {
      const index = state.documents.findIndex(
        (doc) => doc.id === action.payload.id
      );

      if (index >= 0) {
        state.documents[index] = action.payload;
      } else {
        state.documents.unshift(action.payload);
      }
    },

    // Update progress, status or error
    updateDocument(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<
          Pick<DocumentItem, "status" | "progress" | "error">
        >;
      }>
    ) {
      const document = state.documents.find(
        (doc) => doc.id === action.payload.id
      );

      if (document) {
        Object.assign(document, action.payload.changes);
      }
    },

    removeDocument(
      state,
      action: PayloadAction<string>
    ) {
      state.documents = state.documents.filter(
        (doc) => doc.id !== action.payload
      );
    },
  },
});

export const {
  setDocuments,
  upsertDocument,
  updateDocument,
  removeDocument,
} = documentsSlice.actions;

export default documentsSlice.reducer;
