
"use client";

import { useEffect, useRef } from "react";
import { FileText, Sparkles } from "lucide-react";

import ChatMessage from "./ChatMessage";
import type {
  ChatMessage as ChatMessageType,
} from "@/lib/redux/slices/chatSlice";

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
}

export default function ChatWindow({
  messages,
  isStreaming,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    nearBottomRef.current = distanceFromBottom < 100;
  }

  useEffect(() => {
    const element = scrollRef.current;

    // Follow new messages only when the user
    // is already near the bottom of the chat.
    if (element && nearBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-surface p-4 sm:p-6"
    >
      {messages.length === 0 ? (
        <div className="flex min-h-full flex-col items-center justify-center px-3 py-8 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-on-primary-soft">
            <Sparkles
              className="h-8 w-8"
              aria-hidden="true"
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Start exploring your documents
          </h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Upload or select a document, ask a question,
            and get an answer with links to its sources.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-full border border-app-border bg-surface-muted px-4 py-2 text-xs text-muted-foreground">
            <FileText
              className="h-4 w-4"
              aria-hidden="true"
            />
            PDF and TXT supported
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
