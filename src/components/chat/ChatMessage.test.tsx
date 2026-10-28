
import { describe, expect, it } from "vitest";
import {
  render,
  screen,
  within,
} from "@testing-library/react";
import { axe } from "jest-axe";

import ChatMessage from "./ChatMessage";

import type {
  ChatMessage as ChatMessageType,
} from "@/lib/redux/slices/chatSlice";

const userMessage: ChatMessageType = {
  id: "user-1",
  role: "user",
  content: "What is React?",
};

const assistantMessage: ChatMessageType = {
  id: "assistant-1",
  role: "assistant",
  content: "React is mentioned in the resume. [S1]",
  sources: [
    {
      id: "S1",
      documentId: "document-123",
      documentName: "resume.pdf",
      pageNumber: 2,
      snippet: "Experience with React and TypeScript.",
      url: "/api/documents/document-123/file#page=2",
    },
  ],
};

describe("ChatMessage", () => {
  it("displays a user message", () => {
    render(<ChatMessage message={userMessage} />);

    expect(screen.getByText("You")).toBeInTheDocument();

    expect(
      screen.getByText("What is React?")
    ).toBeInTheDocument();
  });

  it("renders assistant source citations as links", () => {
    render(
      <ChatMessage
        message={assistantMessage}
        isStreaming={false}
      />
    );

    const links = screen.getAllByRole("link");

    expect(
      links.some(
        (link) =>
          link.getAttribute("href") ===
          "/api/documents/document-123/file#page=2"
      )
    ).toBe(true);

    expect(
      screen.getByText(
        "Experience with React and TypeScript."
      )
    ).toBeInTheDocument();

    expect(
      within(screen.getByRole("article"))
        .getAllByRole("link")
        .length
    ).toBeGreaterThanOrEqual(1);
  });

  it("displays a streaming indicator", () => {
    const streamingMessage: ChatMessageType = {
      id: "assistant-2",
      role: "assistant",
      content: "",
    };

    render(
      <ChatMessage
        message={streamingMessage}
        isStreaming={true}
      />
    );

    expect(
      screen.getByText(/searching your documents/i)
    ).toBeInTheDocument();
  });

  it("displays an error without an empty message bubble", () => {
    const errorMessage: ChatMessageType = {
      id: "assistant-error",
      role: "assistant",
      content: "",
      error: "Unable to generate an answer.",
    };

    render(
      <ChatMessage message={errorMessage} />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to generate an answer."
    );
  });

  it("matches the saved component snapshot", () => {
    const { container } = render(
      <ChatMessage message={userMessage} />
    );

    expect(container.firstElementChild).toMatchSnapshot();
  });

  it("has no automatically detected accessibility violations", async () => {
    const { container } = render(
      <ChatMessage message={assistantMessage} />
    );

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
  it("renders a distinct system notice", () => {
  render(
    <ChatMessage
      message={{
        id: "notice-1",
        role: "system",
        content: "This conversation uses selected documents.",
      }}
    />
  );

  expect(
    screen.getByRole("article", { name: "System notice" })
  ).toHaveTextContent(
    "This conversation uses selected documents."
  );

  expect(
    screen.queryByText("AI Assistant")
  ).not.toBeInTheDocument();
});
});
