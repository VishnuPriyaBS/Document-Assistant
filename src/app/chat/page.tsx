"use client";

import { useEffect, useRef, useState } from "react";
import ChatDocumentPicker from "@/components/chat/ChatDocumentPicker";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  MAX_CHAT_DOCUMENTS,
  createSession,
  selectSession,
  toggleSessionDocument,
  addUserMessage,
  beginAssistantMessage,
  appendAssistantChunk,
  setAssistantSources,
  setAssistantError,
  finishAssistantMessage,
  type ChatMessage,
} from "@/lib/redux/slices/chatSlice";
import type { SourceCitation } from "@/types/citation";

type ChatStreamEvent =
  | { type: "sources"; sources: SourceCitation[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function parseStreamEvent(block: string): ChatStreamEvent | null {
  const data = block.split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  return data ? (JSON.parse(data) as ChatStreamEvent) : null;
}

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, streamingSessionId } = useAppSelector(
    (state) => state.chat
  );
  const documents = useAppSelector((state) => state.documents.documents);
  const controllerRef = useRef<AbortController | null>(null);
  const [draftDocumentIds, setDraftDocumentIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState("");

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const selectedIds = activeSession?.documentIds ?? draftDocumentIds;
  const isStreaming = streamingSessionId !== null;
  const pendingUploads = documents.some(
    (doc) => doc.status === "uploading" || doc.status === "processing"
  );
  const locked = !!activeSession?.messages.length || isStreaming;
  const isBusy = isStreaming || pendingUploads;
  const readyIds = new Set(
    documents.filter((doc) => doc.status === "ready").map((doc) => doc.id)
  );
  const canSend = selectedIds.length > 0 && selectedIds.every((id) => readyIds.has(id));

  useEffect(() => {
    return () => { controllerRef.current?.abort(); };
  }, []);

  function handleToggleDocument(documentId: string, selected: boolean) {
    if (locked || controllerRef.current) return;
    setSelectionError("");
    const current = activeSession?.documentIds ?? draftDocumentIds;
    if (selected && !current.includes(documentId) && current.length >= MAX_CHAT_DOCUMENTS) {
      setSelectionError(`You can choose up to ${MAX_CHAT_DOCUMENTS} documents per chat.`);
      return;
    }
    if (activeSession) {
      dispatch(toggleSessionDocument({
        sessionId: activeSession.id,
        documentId,
        selected,
      }));
    } else {
      // Functional update avoids lost selections when several uploads finish together.
      setDraftDocumentIds((previous) => {
        if (selected && previous.includes(documentId)) return previous;
        if (selected && previous.length >= MAX_CHAT_DOCUMENTS) return previous;
        return selected
          ? [...previous, documentId]
          : previous.filter((id) => id !== documentId);
      });
    }
  }

  function handleNewChat() {
    if (isBusy || controllerRef.current) return;
    setSelectionError("");
    setDraftDocumentIds([]);
    dispatch(createSession({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      documentIds: [],
    }));
  }

  function handleSelectSession(id: string) {
    if (isBusy || controllerRef.current) return;
    setSelectionError("");
    dispatch(selectSession(id));
  }

  async function handleSend(question: string) {
    if (isBusy || controllerRef.current) return;
    if (!selectedIds.length) {
      setSelectionError("Upload or select at least one document before sending a question.");
      return;
    }
    if (selectedIds.some((id) => !readyIds.has(id))) {
      setSelectionError("A selected document is no longer available. Start a new chat and choose the available files.");
      return;
    }
    setSelectionError("");

    const sessionId = activeSessionId ?? crypto.randomUUID();
    if (!activeSessionId) {
      dispatch(createSession({
        id: sessionId,
        createdAt: new Date().toISOString(),
        documentIds: [...selectedIds],
      }));
    }

    const previousMessages: Pick<ChatMessage, "role" | "content">[] =
      (activeSession?.messages ?? [])
        .filter((message) => !message.error && message.content.trim())
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.content }));

    const assistantMessageId = crypto.randomUUID();
    dispatch(addUserMessage({
      sessionId,
      message: { id: crypto.randomUUID(), role: "user", content: question },
    }));
    dispatch(beginAssistantMessage({ sessionId, messageId: assistantMessageId }));

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          documentIds: selectedIds,
          history: previousMessages,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(result?.error ?? `Request failed (${response.status}).`);
      }
      if (!response.body) throw new Error("No response stream was returned.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      function processEvent(block: string) {
        const event = parseStreamEvent(block);
        if (!event) return;
        switch (event.type) {
          case "sources":
            dispatch(setAssistantSources({
              sessionId,
              messageId: assistantMessageId,
              sources: event.sources,
            }));
            break;
          case "delta":
            dispatch(appendAssistantChunk({
              sessionId,
              messageId: assistantMessageId,
              chunk: event.text,
            }));
            break;
          case "done":
            receivedDone = true;
            break;
          case "error":
            throw new Error(event.message);
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = /\r?\n\r?\n/.exec(buffer);
          while (boundary) {
            processEvent(buffer.slice(0, boundary.index));
            buffer = buffer.slice(boundary.index + boundary[0].length);
            boundary = /\r?\n\r?\n/.exec(buffer);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) processEvent(buffer);
      } finally {
        reader.releaseLock();
      }
      if (!receivedDone) throw new Error("The AI response ended before completion.");
    } catch (error) {
      dispatch(setAssistantError({
        sessionId,
        messageId: assistantMessageId,
        error: controller.signal.aborted
          ? "The request was cancelled."
          : error instanceof Error ? error.message : "Unable to answer the question.",
      }));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      dispatch(finishAssistantMessage(sessionId));
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">AI Document Assistant</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload or select documents here, then ask questions about them.
        </p>
      </div>
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Responses use the documents selected for this chat. Verify key details using source links.
      </p>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          disabled={isBusy}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />

        <div className="flex h-[min(75vh,800px)] min-h-[550px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <ChatDocumentPicker
            selectedIds={selectedIds}
            locked={locked}
            onToggle={handleToggleDocument}
          />
          <ChatWindow
            messages={activeSession?.messages ?? []}
            isStreaming={!!streamingSessionId && streamingSessionId === activeSessionId}
          />
          {selectionError && (
            <p role="alert" className="px-4 py-2 text-sm text-red-600">
              {selectionError}
            </p>
          )}
          <ChatInput
            onSend={(message) => { void handleSend(message); }}
            isStreaming={isBusy}
            canSend={canSend}
          />
        </div>
      </div>
    </section>
  );
}
