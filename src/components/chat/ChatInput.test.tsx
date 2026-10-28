
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import ChatInput from "./ChatInput";

describe("ChatInput", () => {
  it("allows the user to type and send a question", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <ChatInput
        onSend={onSend}
        isStreaming={false}
        canSend={true}
      />
    );

    const input = screen.getByRole("textbox", {
      name: /ask a question/i,
    });

    await user.type(input, "What is React?");

    await user.click(
      screen.getByRole("button", {
        name: /send message/i,
      })
    );

    expect(onSend).toHaveBeenCalledExactlyOnceWith(
      "What is React?"
    );

    expect(input).toHaveValue("");
  });

  it("sends a question when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <ChatInput
        onSend={onSend}
        isStreaming={false}
        canSend={true}
      />
    );

    const input = screen.getByRole("textbox");

    await user.type(input, "Explain TypeScript");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith(
      "Explain TypeScript"
    );
  });

  it("does not send when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <ChatInput
        onSend={onSend}
        isStreaming={false}
        canSend={true}
      />
    );

    const input = screen.getByRole("textbox");

    await user.type(input, "First line");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("prevents sending when no document is selected", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <ChatInput
        onSend={onSend}
        isStreaming={false}
        canSend={false}
      />
    );

    await user.type(
      screen.getByRole("textbox"),
      "Summarize the document"
    );

    expect(
      screen.getByRole("button", {
        name: /send message/i,
      })
    ).toBeDisabled();

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables input while a response is streaming", () => {
    render(
      <ChatInput
        onSend={vi.fn()}
        isStreaming={true}
        canSend={true}
      />
    );

    expect(
      screen.getByRole("textbox")
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: /send message/i,
      })
    ).toBeDisabled();
  });

  it("has no automatically detected accessibility violations", async () => {
    const { container } = render(
      <ChatInput
        onSend={vi.fn()}
        isStreaming={false}
        canSend={true}
      />
    );

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
