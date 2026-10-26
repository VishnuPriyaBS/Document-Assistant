
"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

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

  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      aria-label="Conversation messages"
      className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Sparkles className="mb-4 h-12 w-12 text-blue-600" />

          <h2 className="text-xl font-semibold">
            How can I help you?
          </h2>

          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Upload a document, then ask a question about its contents.
            Answers will include links to relevant sources.
          </p>
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
