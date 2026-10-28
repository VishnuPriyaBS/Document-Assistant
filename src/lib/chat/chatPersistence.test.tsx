import { describe, expect, it } from "vitest";

import { parseChatSnapshot } from "./chatPersistence";
import chatReducer, {
  restoreChat,
} from "@/lib/redux/slices/chatSlice";

function createSnapshot(streamingSessionId: string | null) {
  return {
    version: 1,
    activeSessionId: "session-1",
    streamingSessionId,
    sessions: [
      {
        id: "session-1",
        title: "My conversation",
        createdAt: "2026-10-29T00:00:00.000Z",
        documentIds: ["document-1"],
        messages: [
          {
            id: "answer-1",
            role: "assistant",
            content: "A saved answer",
          },
        ],
      },
    ],
  };
}

describe("chat persistence", () => {
  it("restores a completed answer without adding an error", () => {
    const restored = parseChatSnapshot(
      JSON.stringify(createSnapshot(null))
    );

    expect(restored.sessions[0].messages[0].content)
      .toBe("A saved answer");

    expect(restored.sessions[0].messages[0].error)
      .toBeUndefined();
  });

  it("marks an interrupted answer while preserving its text", () => {
    const restored = parseChatSnapshot(
      JSON.stringify(createSnapshot("session-1"))
    );

    const message = restored.sessions[0].messages[0];

    expect(message.content).toBe("A saved answer");
    expect(message.error).toContain("interrupted");

    const state = chatReducer(undefined, restoreChat(restored));

    expect(state.streamingSessionId).toBeNull();
  });

  it("rejects malformed stored data", () => {
    expect(() => parseChatSnapshot("invalid JSON")).toThrow();

    expect(() =>
      parseChatSnapshot(JSON.stringify({ version: 1 }))
    ).toThrow();
  });

  it("falls back when the saved active session is missing", () => {
    const snapshot = createSnapshot(null);
    snapshot.activeSessionId = "missing-session";

    const restored = parseChatSnapshot(JSON.stringify(snapshot));
    const state = chatReducer(undefined, restoreChat(restored));

    expect(state.activeSessionId).toBe("session-1");
  });
});