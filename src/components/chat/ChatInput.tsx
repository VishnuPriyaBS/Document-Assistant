
"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  isStreaming: boolean;
  canSend: boolean;
}

export default function ChatInput({
  onSend,
  isStreaming,
  canSend,
}: Props) {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    const text = message.trim();

    if (!text || isStreaming || !canSend) return;

    onSend(text);
    setMessage("");
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="shrink-0 border-t border-app-border bg-surface p-3 sm:p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="mx-auto max-w-3xl"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about selected documents
        </label>

        <div className="flex items-end gap-2 rounded-2xl border border-app-border bg-surface-muted p-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:gap-3 sm:p-3">
          <textarea
            id="chat-input"
            rows={2}
            maxLength={500}
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents..."
            disabled={isStreaming}
            className="max-h-40 min-h-12 min-w-0 flex-1 resize-none bg-transparent p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            aria-label="Send message"
            disabled={
              !message.trim() ||
              isStreaming ||
              !canSend
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming ? (
              <LoaderCircle
                className="h-5 w-5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowUp
                className="h-5 w-5"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        <p
          className="mt-2 text-center text-xs text-muted-foreground"
          aria-live="polite"
        >
          {!canSend && !isStreaming
            ? "Choose at least one ready document to send."
            : "Enter to send · Shift+Enter for a new line"}
        </p>
      </form>
    </div>
  );
}
