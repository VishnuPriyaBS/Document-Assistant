import { z } from "zod";

import type { AppStore } from "@/lib/redux/store";
import {
    MAX_CHAT_DOCUMENTS,
    restoreChat,
} from "@/lib/redux/slices/chatSlice";

export const CHAT_STORAGE_KEY = "docai-chat-v1";

const sourceSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    documentName: z.string(),
    pageNumber: z.number().int().positive(),
    snippet: z.string(),

    // Restore only the application's document links.
    url: z.string().regex(
        /^\/api\/documents\/[a-zA-Z0-9-]+\/file(?:#page=\d+)?$/
    ),
});

const messageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    sources: z.array(sourceSchema).optional(),
    error: z.string().optional(),
});

const sessionSchema = z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string(),
    documentIds: z.array(z.string()).max(MAX_CHAT_DOCUMENTS),
    messages: z.array(messageSchema),
});

const snapshotSchema = z.object({
    version: z.literal(1),
    sessions: z.array(sessionSchema),
    activeSessionId: z.string().nullable(),
    streamingSessionId: z.string().nullable(),
});

export function parseChatSnapshot(raw: string) {
    const snapshot = snapshotSchema.parse(JSON.parse(raw));

    // Preserve partial text, but mark an interrupted answer clearly.
    const interruptedSession = snapshot.sessions.find(
        (session) => session.id === snapshot.streamingSessionId
    );

    const lastMessage = interruptedSession?.messages.at(-1);

    if (lastMessage?.role === "assistant" && !lastMessage.error) {
        lastMessage.error =
            "This response was interrupted. Please ask your question again.";
    }

    return {
        sessions: snapshot.sessions,
        activeSessionId: snapshot.activeSessionId,
    };
}

export function attachChatPersistence(
    store: AppStore,
    onWarning: (message: string) => void
): () => void {
    let storage: Storage;

    try {
        storage = window.localStorage;
    } catch {
        onWarning(
            "Chat history cannot be saved in this browser. " +
            "Your current conversation will still work."
        );

        return () => { };
    }

    // Restore before subscribing, so empty initial state isn't saved first.
    try {
        const raw = storage.getItem(CHAT_STORAGE_KEY);

        if (raw !== null) {
            store.dispatch(restoreChat(parseChatSnapshot(raw)));
        }
    } catch {
        onWarning(
            "Saved chat history could not be restored. " +
            "You can continue with a new conversation."
        );
    }

    let previousChat = store.getState().chat;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saveWarningShown = false;

    function cancelScheduledSave() {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    }

    function save() {
        cancelScheduledSave();

        const chat = store.getState().chat;

        try {
            storage.setItem(
                CHAT_STORAGE_KEY,
                JSON.stringify({
                    version: 1,
                    sessions: chat.sessions,
                    activeSessionId: chat.activeSessionId,
                    streamingSessionId: chat.streamingSessionId,
                })
            );
        } catch {
            if (!saveWarningShown) {
                saveWarningShown = true;

                onWarning(
                    "Chat history could not be saved. Browser storage may be " +
                    "full or unavailable. Recent changes may be lost on refresh."
                );
            }
        }
    }

    const unsubscribe = store.subscribe(() => {
        const chat = store.getState().chat;

        // Document-library updates shouldn't trigger chat saves.
        if (chat === previousChat) return;

        const streamChanged =
            chat.streamingSessionId !== previousChat.streamingSessionId;

        previousChat = chat;

        if (!chat.streamingSessionId || streamChanged) {
            // Save immediately when idle, starting, or finishing a stream.
            save();
        } else if (timer === undefined) {
            // During streaming, save at most once per second.
            timer = setTimeout(save, 1000);
        }
    });

    function handleVisibilityChange() {
        if (document.visibilityState === "hidden") {
            save();
        }
    }

    window.addEventListener("pagehide", save);
    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    return () => {
        unsubscribe();

        window.removeEventListener("pagehide", save);
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        cancelScheduledSave();
    };
}