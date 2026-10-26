"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  isStreaming: boolean;
  canSend: boolean;
}

export default function ChatInput({ onSend, isStreaming, canSend }: Props) {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    const text = message.trim();
    if (!text || isStreaming || !canSend) return;
    onSend(text);
    setMessage("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      <form
        onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}
        className="mx-auto max-w-3xl"
      >
        <label htmlFor="chat-input" className="sr-only">Ask a question about selected documents</label>
        <div className="flex items-end gap-3 rounded-xl border border-slate-300 bg-white p-3 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-900">
          <textarea
            id="chat-input"
            rows={2}
            maxLength={500}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the selected documents..."
            disabled={isStreaming}
            className="max-h-40 min-h-12 flex-1 resize-none bg-transparent p-2 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!message.trim() || isStreaming || !canSend}
            className="rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          {!canSend && !isStreaming
            ? "Choose at least one ready document to send."
            : "Enter to send · Shift+Enter for a new line"}
        </p>
      </form>
    </div>
  );
}
