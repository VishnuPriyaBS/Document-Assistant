
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

  // Split AI text around source IDs like [S1].
  const parts = message.content.split(/(\[S\d+\])/g);

  return (
    <article
      className={`flex gap-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-white"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 max-w-[85%] flex-1">
        <p className="mb-1 text-xs font-medium text-slate-500">
          {isUser ? "You" : "AI Assistant"}
        </p>

        {(message.content || isStreaming) && (
        <div
          className={`rounded-2xl px-4 py-3 text-left text-sm leading-7 ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {parts.map((part, index) => {
              const source = message.sources?.find(
                (item) => `[${item.id}]` === part
              );

              if (!source) {
                return <span key={index}>{part}</span>;
              }

              return (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${source.documentName}, page ${source.pageNumber}`}
                  className="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-400"
                >
                  {part}
                </a>
              );
            })}

            {isStreaming && (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-500 align-middle"
              />
            )}
          </p>

          {isStreaming && !message.content && (
            <p className="mt-2 text-xs text-slate-500">
              Searching documents and preparing answer...
            </p>
          )}
        </div>
        )}
        {message.error && (
          <p
            role="alert"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {message.error}
          </p>
        )}

        {!isUser &&
          !isStreaming &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                Retrieved source passages
              </p>

              <ul className="space-y-2">
                {message.sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-blue-600" />

                      <span className="min-w-0">
                        <span className="block font-semibold text-blue-600 dark:text-blue-400">
                          [{source.id}] {source.documentName}
                          {" — "}Page {source.pageNumber}
                        </span>

                        <span className="mt-1 block break-words text-slate-500 dark:text-slate-400">
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
