import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SourceCitation } from "@/types/citation";

export const MAX_CHAT_DOCUMENTS = 10;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: SourceCitation[];
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  documentIds: string[];
  messages: ChatMessage[];
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  streamingSessionId: string | null;
}

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  streamingSessionId: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addSystemNotice(
      state,
      action: PayloadAction<{
        sessionId: string;
        messageId: string;
        content: string;
      }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );

      if (!session) return;

      session.messages.push({
        id: action.payload.messageId,
        role: "system",
        content: action.payload.content,
      });
    },
    restoreChat(
      state,
      action: PayloadAction<{
        sessions: ChatSession[];
        activeSessionId: string | null;
      }>
    ) {
      state.sessions = action.payload.sessions;

      const activeExists = state.sessions.some(
        (session) => session.id === action.payload.activeSessionId
      );

      state.activeSessionId = activeExists
        ? action.payload.activeSessionId
        : state.sessions[0]?.id ?? null;

      // A network request cannot resume after refreshing the page.
      state.streamingSessionId = null;
    },
    createSession(
      state,
      action: PayloadAction<{
        id: string;
        createdAt: string;
        documentIds?: string[];
      }>
    ) {
      const ids = [...new Set(action.payload.documentIds ?? [])].slice(
        0,
        MAX_CHAT_DOCUMENTS
      );
      state.sessions.unshift({
        id: action.payload.id,
        title: "New Conversation",
        createdAt: action.payload.createdAt,
        documentIds: ids,
        messages: [],
      });
      state.activeSessionId = action.payload.id;
    },

    selectSession(state, action: PayloadAction<string>) {
      if (state.sessions.some((session) => session.id === action.payload)) {
        state.activeSessionId = action.payload;
      }
    },

    setSessionDocuments(
      state,
      action: PayloadAction<{ sessionId: string; documentIds: string[] }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      // Once a chat has messages, its document scope is fixed.
      if (!session || session.messages.length > 0) return;
      if (state.streamingSessionId === session.id) return;
      const ids = [...new Set(action.payload.documentIds)];
      if (ids.length > MAX_CHAT_DOCUMENTS) return;
      session.documentIds = ids;
    },

    toggleSessionDocument(
      state,
      action: PayloadAction<{ sessionId: string; documentId: string; selected: boolean }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      if (!session || session.messages.length > 0) return;
      if (state.streamingSessionId === session.id) return;
      const exists = session.documentIds.includes(action.payload.documentId);
      if (action.payload.selected && !exists &&
        session.documentIds.length < MAX_CHAT_DOCUMENTS) {
        session.documentIds.push(action.payload.documentId);
      } else if (!action.payload.selected && exists) {
        session.documentIds = session.documentIds.filter(
          (id) => id !== action.payload.documentId
        );
      }
    },

    addUserMessage(
      state,
      action: PayloadAction<{ sessionId: string; message: ChatMessage }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      if (!session) return;
      session.messages.push(action.payload.message);
      if (session.title === "New Conversation") {
        session.title = action.payload.message.content.slice(0, 45);
      }
    },

    beginAssistantMessage(
      state,
      action: PayloadAction<{ sessionId: string; messageId: string }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      if (!session) return;
      session.messages.push({
        id: action.payload.messageId,
        role: "assistant",
        content: "",
      });
      state.streamingSessionId = action.payload.sessionId;
    },

    appendAssistantChunk(
      state,
      action: PayloadAction<{
        sessionId: string;
        messageId: string;
        chunk: string;
      }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      const message = session?.messages.find(
        (item) => item.id === action.payload.messageId
      );
      if (message?.role === "assistant") {
        message.content += action.payload.chunk;
      }
    },

    setAssistantSources(
      state,
      action: PayloadAction<{
        sessionId: string;
        messageId: string;
        sources: SourceCitation[];
      }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      const message = session?.messages.find(
        (item) => item.id === action.payload.messageId
      );
      if (message?.role === "assistant") {
        message.sources = action.payload.sources;
      }
    },

    setAssistantError(
      state,
      action: PayloadAction<{
        sessionId: string;
        messageId: string;
        error: string;
      }>
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId
      );
      const message = session?.messages.find(
        (item) => item.id === action.payload.messageId
      );
      if (message?.role === "assistant") {
        message.error = action.payload.error;
      }
      if (state.streamingSessionId === action.payload.sessionId) {
        state.streamingSessionId = null;
      }
    },

    finishAssistantMessage(state, action: PayloadAction<string>) {
      if (state.streamingSessionId === action.payload) {
        state.streamingSessionId = null;
      }
    },
  },
});

export const {
  restoreChat,
  createSession,
  selectSession,
  setSessionDocuments,
  toggleSessionDocument,
  addUserMessage,
  beginAssistantMessage,
  appendAssistantChunk,
  setAssistantSources,
  setAssistantError,
  finishAssistantMessage,
  addSystemNotice
} = chatSlice.actions;

export default chatSlice.reducer;
