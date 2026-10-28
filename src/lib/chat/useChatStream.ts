"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
    addUserMessage,
    beginAssistantMessage,
    appendAssistantChunk,
    setAssistantSources,
    setAssistantError,
    finishAssistantMessage
} from "@/lib/redux/slices/chatSlice";
import {
    parseStreamEvent,
    type ChatStreamEvent,
} from "./parseStreamEvent";

interface ChatRequest {
    question: string;
    documentIds: string[];
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
    signal: AbortSignal;
}

interface StartStreamOptions extends Omit<ChatRequest, "signal"> {
    sessionId: string;
}

export function useChatStream() {
    const controllerRef = useRef<AbortController | null>(null);
    const dispatch = useAppDispatch();

    const stop = useCallback(() => {
        controllerRef.current?.abort();
    }, []);

    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    async function requestAnswer({
        question,
        documentIds,
        history,
        signal,
    }: ChatRequest): Promise<ReadableStream<Uint8Array>> {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                question,
                documentIds,
                history,
            }),
            signal,
        });

        if (!response.ok) {
            const result = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;

            throw new Error(
                result?.error ?? `Request failed (${response.status}).`
            );
        }

        if (!response.body) {
            throw new Error("No response stream was returned.");
        }

        return response.body;
    }

    async function readAnswerStream(
        stream: ReadableStream<Uint8Array>,
        onEvent: (event: ChatStreamEvent) => void
    ): Promise<void> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let receivedDone = false;

        function processBlock(block: string) {
            const event = parseStreamEvent(block);

            if (!event) return;

            if (event.type === "done") {
                receivedDone = true;
            }

            onEvent(event);
        }

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let boundary = /\r?\n\r?\n/.exec(buffer);

                while (boundary) {
                    processBlock(buffer.slice(0, boundary.index));

                    buffer = buffer.slice(
                        boundary.index + boundary[0].length
                    );

                    boundary = /\r?\n\r?\n/.exec(buffer);
                }
            }

            buffer += decoder.decode();

            if (buffer.trim()) {
                processBlock(buffer);
            }
        } finally {
            reader.releaseLock();
        }

        if (!receivedDone) {
            throw new Error("The AI response ended before completion.");
        }
    }

    async function startStream({
        sessionId,
        question,
        documentIds,
        history,
    }: StartStreamOptions): Promise<void> {
        if (controllerRef.current) return;

        const controller = new AbortController();
        controllerRef.current = controller;

        const messageId = crypto.randomUUID();

        try {
            dispatch(addUserMessage({
                sessionId,
                message: {
                    id: crypto.randomUUID(),
                    role: "user",
                    content: question,
                },
            }));

            dispatch(beginAssistantMessage({
                sessionId,
                messageId,
            }));

            const stream = await requestAnswer({
                question,
                documentIds,
                history,
                signal: controller.signal,
            });

            await readAnswerStream(stream, (event) => {
                switch (event.type) {
                    case "sources":
                        dispatch(setAssistantSources({
                            sessionId,
                            messageId,
                            sources: event.sources,
                        }));
                        break;

                    case "delta":
                        dispatch(appendAssistantChunk({
                            sessionId,
                            messageId,
                            chunk: event.text,
                        }));
                        break;

                    case "done":
                        break;

                    case "error":
                        throw new Error(event.message);
                }
            });
        } catch (error) {
            dispatch(setAssistantError({
                sessionId,
                messageId,
                error: controller.signal.aborted
                    ? "The request was cancelled."
                    : error instanceof Error
                        ? error.message
                        : "Unable to answer the question.",
            }));
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }

            dispatch(finishAssistantMessage(sessionId));
        }
    }

    function isRequestActive() {
        return controllerRef.current !== null;
    }

    return {
        startStream,
        stop,
        isRequestActive,
    };
}