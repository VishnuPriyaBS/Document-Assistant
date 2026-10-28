"use client";

import { useState } from "react";
import ChatDocumentPicker from "@/components/chat/ChatDocumentPicker";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  MAX_CHAT_DOCUMENTS,
  addSystemNotice,
  createSession,
  selectSession,
  toggleSessionDocument,
} from "@/lib/redux/slices/chatSlice";
import { useChatStream } from "@/lib/chat/useChatStream";

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, streamingSessionId } = useAppSelector(
    (state) => state.chat
  );
  const documents = useAppSelector((state) => state.documents.documents);
  const [draftDocumentIds, setDraftDocumentIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const { startStream, isRequestActive } = useChatStream();
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

  function handleToggleDocument(documentId: string, selected: boolean) {
    if (locked || isRequestActive()) return;
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
    if (isBusy || isRequestActive()) return;
    setSelectionError("");
    setDraftDocumentIds([]);
    dispatch(createSession({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      documentIds: [],
    }));
  }

  function handleSelectSession(id: string) {
    if (isBusy || isRequestActive()) return;
    setSelectionError("");
    dispatch(selectSession(id));
  }

  async function handleSend(question: string) {
    if (isBusy || isRequestActive()) return;

    if (!selectedIds.length) {
      setSelectionError(
        "Upload or select at least one document before sending a question."
      );
      return;
    }

    if (selectedIds.some((id) => !readyIds.has(id))) {
      setSelectionError(
        "A selected document is no longer available. Start a new chat and choose the available files."
      );
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

  const previousMessages =
  (activeSession?.messages ?? [])
    .flatMap((message) => {
      if (
        message.role === "system" ||
        message.error ||
        !message.content.trim()
      ) {
        return [];
      }

      return [{
        role: message.role,
        content: message.content,
      }];
    })
    .slice(-6);

    if (!activeSession?.messages.length) {
  dispatch(addSystemNotice({
    sessionId,
    messageId: crypto.randomUUID(),
    content:
      "Answers in this conversation use the selected documents. " +
      "Start a new chat to choose a different document set.",
  }));
}

    await startStream({
      sessionId,
      question,
      documentIds: [...selectedIds],
      history: previousMessages,
    });
  }


  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AI Document Assistant
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Upload or choose your documents, then ask questions
          and explore answers with source references.
        </p>
      </div>

      <div className="rounded-xl border border-app-border bg-primary-soft px-4 py-3 text-sm leading-6 text-on-primary-soft">
        Responses use the documents selected for this chat.
        Verify important information using the source links.
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          disabled={isBusy}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />

        <div className="flex h-[70dvh] min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-app-border bg-surface shadow-sm lg:h-[min(78dvh,800px)] lg:min-h-[560px]">
          <ChatDocumentPicker
            selectedIds={selectedIds}
            locked={locked}
            onToggle={handleToggleDocument}
          />

          <ChatWindow
            key={activeSessionId ?? "draft"}
            messages={activeSession?.messages ?? []}
            isStreaming={
              !!streamingSessionId &&
              streamingSessionId === activeSessionId
            }
          />

          {selectionError && (
            <p
              role="alert"
              className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {selectionError}
            </p>
          )}

          <ChatInput
            onSend={(message) => {
              void handleSend(message);
            }}
            isStreaming={isBusy}
            canSend={canSend}
          />
        </div>
      </div>
    </section>
  );

}
