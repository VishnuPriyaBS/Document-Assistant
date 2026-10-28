import { act, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { useChatStream } from "./useChatStream";
import {
  addUserMessage,
  beginAssistantMessage,
  appendAssistantChunk,
  setAssistantSources,
  setAssistantError,
  finishAssistantMessage,
} from "@/lib/redux/slices/chatSlice";

const { dispatch } = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => dispatch,
}));

const options = {
  sessionId: "session-1",
  question: "What does the document say?",
  documentIds: ["document-1"],
  history: [],
};

function createStream(parts: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(part));
      }

      controller.close();
    },
  });
}

describe("useChatStream", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("processes citations and text across split network chunks", async () => {
    const stream = createStream([
      'data: {"type":"sources","sources":[]}\n\n',
      'data: {"type":"delta","te',
      'xt":"Hello"}\n\ndata: {"type":"done"}\n\n',
    ]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.startStream(options);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          question: options.question,
          documentIds: options.documentIds,
          history: [],
        }),
      })
    );

    expect(dispatch).toHaveBeenCalledWith(
      addUserMessage({
        sessionId: options.sessionId,
        message: {
          id: expect.any(String),
          role: "user",
          content: options.question,
        },
      })
    );

    const beginAction = dispatch.mock.calls
      .map(([action]) => action)
      .find(beginAssistantMessage.match);

    expect(beginAction).toBeDefined();

    if (!beginAction) {
      throw new Error("Assistant message was not started.");
    }

    const messageId = beginAction.payload.messageId;

    expect(dispatch).toHaveBeenCalledWith(
      setAssistantSources({
        sessionId: options.sessionId,
        messageId,
        sources: [],
      })
    );

    expect(dispatch).toHaveBeenCalledWith(
      appendAssistantChunk({
        sessionId: options.sessionId,
        messageId,
        chunk: "Hello",
      })
    );

    expect(dispatch).toHaveBeenLastCalledWith(
      finishAssistantMessage(options.sessionId)
    );

    expect(result.current.isRequestActive()).toBe(false);
  });

  it("reports an interrupted stream without a completion event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: createStream([
          'data: {"type":"delta","text":"Partial answer"}\n\n',
        ]),
      })
    );

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.startStream(options);
    });

    expect(dispatch).toHaveBeenCalledWith(
      setAssistantError({
        sessionId: options.sessionId,
        messageId: expect.any(String),
        error: "The AI response ended before completion.",
      })
    );

    expect(dispatch).toHaveBeenLastCalledWith(
      finishAssistantMessage(options.sessionId)
    );

    expect(result.current.isRequestActive()).toBe(false);
  });

  it("cancels on unmount and prevents duplicate active requests", async () => {
    let capturedSignal: AbortSignal | undefined;

    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined;

        return new Promise<Response>((_resolve, reject) => {
          capturedSignal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        });
      }
    );

    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useChatStream());

    let pending: Promise<void> | undefined;

    act(() => {
      pending = result.current.startStream(options);
    });

    expect(result.current.isRequestActive()).toBe(true);

    await act(async () => {
      await result.current.startStream(options);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await pending;
    });

    expect(capturedSignal?.aborted).toBe(true);

    expect(dispatch).toHaveBeenCalledWith(
      setAssistantError({
        sessionId: options.sessionId,
        messageId: expect.any(String),
        error: "The request was cancelled.",
      })
    );

    expect(dispatch).toHaveBeenLastCalledWith(
      finishAssistantMessage(options.sessionId)
    );
  });
});