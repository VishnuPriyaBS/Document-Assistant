
import { Bot, User, ExternalLink } from "lucide-react";

import type {
  ChatMessage as ChatMessageType,
} from "@/lib/redux/slices/chatSlice";

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({
  message,
  isStreaming = false,
}: Props) {
  const isUser = message.role === "user";
  const parts = message.content.split(/(\[S\d+\])/g);

  return (
    <article
      className={`flex gap-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-primary text-on-primary"
            : "bg-primary-soft text-on-primary-soft"
        }`}
      >
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 max-w-[85%] flex-1">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {isUser ? "You" : "AI Assistant"}
        </p>

        {(message.content || isStreaming) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${
              isUser
                ? "bg-primary text-on-primary"
                : "border border-app-border bg-surface-muted text-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">
              {parts.map((part, index) => {
                const source = message.sources?.find(
                  (item) => `[${item.id}]` === part
                );

                if (!source) {
                  return (
                    <span key={index}>{part}</span>
                  );
                }

                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${source.documentName}, page ${source.pageNumber}`}
                    className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {part}
                  </a>
                );
              })}

              {isStreaming && (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary align-middle"
                />
              )}
            </p>

            {isStreaming && !message.content && (
              <p className="mt-2 text-xs text-muted-foreground">
                Searching your documents and preparing an answer...
              </p>
            )}
          </div>
        )}

        {message.error && (
          <p
            role="alert"
            className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {message.error}
          </p>
        )}

        {!isUser &&
          !isStreaming &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Source references
              </p>

              <ul className="space-y-2">
                {message.sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-xl border border-app-border bg-surface p-3 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <ExternalLink
                        className="h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />

                      <span className="min-w-0">
                        <span className="block break-words font-semibold text-primary">
                          [{source.id}]{" "}
                          {source.documentName}
                          {" — "}Page{" "}
                          {source.pageNumber}
                        </span>

                        <span className="mt-2 block break-words leading-5 text-muted-foreground">
                          {source.snippet}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </article>
  );
}
