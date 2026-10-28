import { describe, expect, it } from "vitest";
import { parseStreamEvent } from "./parseStreamEvent";

describe("parseStreamEvent", () => {
  it("parses an answer text event", () => {
    const block = 'data: {"type":"delta","text":"Hello"}';

    expect(parseStreamEvent(block)).toEqual({
      type: "delta",
      text: "Hello",
    });
  });

  it("handles Windows newlines and ignores non-data lines", () => {
    const block = [
      "event: message",
      ": keep-alive",
      'data: {"type":"done"}',
    ].join("\r\n");

    expect(parseStreamEvent(block)).toEqual({
      type: "done",
    });
  });

  it("combines multiple data lines", () => {
    const block = [
      'data: {"type":"delta",',
      'data: "text":"Hello"}',
    ].join("\n");

    expect(parseStreamEvent(block)).toEqual({
      type: "delta",
      text: "Hello",
    });
  });

  it("returns null when there is no data", () => {
    expect(parseStreamEvent(": keep-alive")).toBeNull();
  });

  it("throws when the data contains invalid JSON", () => {
    expect(() => {
      parseStreamEvent("data: invalid-json");
    }).toThrow();
  });
});