
"use client";

import { MessageSquare, Plus } from "lucide-react";

import type {
  ChatSession,
} from "@/lib/redux/slices/chatSlice";

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
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      <h2 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recent Conversations
      </h2>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No conversations yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={() =>
                  onSelectSession(session.id)
                }
                disabled={disabled}
                aria-pressed={
                  activeSessionId === session.id
                }
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm disabled:opacity-60 ${
                  activeSessionId === session.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {session.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
