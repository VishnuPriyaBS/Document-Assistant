
"use client";

import { MessageSquare, Plus, MessagesSquare } from "lucide-react";
import type { ChatSession } from "@/lib/redux/slices/chatSlice";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  disabled: boolean;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  disabled,
  onNewChat,
  onSelectSession,
}: Props) {
  return (
    <aside
      aria-label="Conversation history"
      className="rounded-2xl border border-app-border bg-surface p-4 shadow-sm"
    >
      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New Chat
      </button>

      <div className="mb-3 mt-6 flex items-center gap-2">
        <MessagesSquare
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Conversations
        </h2>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-app-border bg-surface-muted p-4 text-center">
          <MessageSquare
            className="mx-auto mb-3 h-7 w-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            No conversations yet
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Select a document and ask your first question.
          </p>
        </div>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto lg:max-h-96">
          {sessions.map((session) => {
            const active = activeSessionId === session.id;

            return (
              <li key={session.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelectSession(session.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
                    active
                      ? "bg-primary-soft font-semibold text-on-primary-soft"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">
                    {session.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
