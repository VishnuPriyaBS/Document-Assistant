// @vitest-environment node

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { create, search } = vi.hoisted(() => ({
  create: vi.fn(),
  search: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: { create },
    };

    responses = { create };
  },
}));

vi.mock("@/lib/server/retrieval", () => ({
  searchStoredDocuments: search,
}));

import { POST } from "./route";

const documentId = "11111111-1111-4111-8111-111111111111";

function makeRequest() {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "What does this document say?",
      documentIds: [documentId],
      history: [],
    }),
  });
}

async function* streamEvents(events: unknown[]) {
  for (const event of events) {
    yield event;
  }
}

function parseEvents(text: string) {
  return text
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim())
    .map((block) =>
      JSON.parse(block.replace(/^data:\s*/, "")) as {
        type: string;
        message?: string;
      }
    );
}

describe("chat provider errors", () => {
  beforeEach(() => {
    create.mockReset();
    search.mockReset();

    vi.stubEnv("OPENAI_MOCK_MODE", "false");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    vi.spyOn(console, "error").mockImplementation(() => {});

    search.mockResolvedValue({
      matches: [{
        documentId,
        documentName: "notes.txt",
        pageNumber: 1,
        text: "This document describes a React application.",
      }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(["gemini", "openai"])(
    "%s times out and aborts a pending provider request",
    async (provider) => {
      vi.useFakeTimers();
      vi.stubEnv("AI_PROVIDER", provider);

      let signal: AbortSignal | undefined;

      create.mockImplementation(
        (_body: unknown, options: { signal: AbortSignal }) => {
          signal = options.signal;

          return new Promise((_resolve, reject) => {
            signal?.addEventListener(
              "abort",
              () => reject(
                new DOMException("Aborted", "AbortError")
              ),
              { once: true }
            );
          });
        }
      );

      const response = await POST(makeRequest());
      const body = response.text();

      await vi.advanceTimersByTimeAsync(60_000);

      expect(signal?.aborted).toBe(true);

      expect(parseEvents(await body)).toEqual([
        {
          type: "error",
          message: "The AI response timed out. Please try again.",
        },
      ]);
    }
  );

  it.each(["gemini", "openai"])(
    "%s times out even after answer streaming has started",
    async (provider) => {
      vi.useFakeTimers();
      vi.stubEnv("AI_PROVIDER", provider);

      create.mockImplementation(
        (_body: unknown, options: { signal: AbortSignal }) =>
          (async function* () {
            yield provider === "gemini"
              ? {
                  choices: [{
                    delta: { content: "Partial answer" },
                    finish_reason: null,
                  }],
                }
              : {
                  type: "response.output_text.delta",
                  delta: "Partial answer",
                };

            await new Promise<void>((_resolve, reject) => {
              const abort = () => reject(
                new DOMException("Aborted", "AbortError")
              );

              if (options.signal.aborted) {
                abort();
              } else {
                options.signal.addEventListener(
                  "abort",
                  abort,
                  { once: true }
                );
              }
            });
          })()
      );

      const response = await POST(makeRequest());
      const body = response.text();

      await vi.advanceTimersByTimeAsync(60_000);

      const events = parseEvents(await body);

      expect(events.some((event) => event.type === "delta"))
        .toBe(true);

      expect(events.at(-1)).toEqual({
        type: "error",
        message: "The AI response timed out. Please try again.",
      });

      expect(events.some((event) => event.type === "done"))
        .toBe(false);
    }
  );

  it.each(["gemini", "openai"])(
    "%s returns a friendly refusal without a success event",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);

      const event = provider === "gemini"
        ? {
            choices: [{
              delta: {},
              finish_reason: "content_filter",
            }],
          }
        : {
            type: "response.refusal.delta",
            delta: "Request declined",
          };

      create.mockResolvedValue(streamEvents([event]));

      const response = await POST(makeRequest());
      const events = parseEvents(await response.text());

      expect(events).toEqual([
        {
          type: "error",
          message:
            "The AI provider declined this request under its content policy. " +
            "Please ask a different question about your documents.",
        },
      ]);
    }
  );

  it.each(["gemini", "openai"])(
    "%s preserves rate-limit handling",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);

      create.mockRejectedValue({ status: 429 });

      const response = await POST(makeRequest());
      const events = parseEvents(await response.text());

      expect(events[0].type).toBe("error");
      expect(events[0].message).toMatch(/rate limit/i);
    }
  );
});