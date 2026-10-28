import type { SourceCitation } from "@/types/citation";

export type ChatStreamEvent =
  | { type: "sources"; sources: SourceCitation[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function parseStreamEvent(
  block: string
): ChatStreamEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  return data ? (JSON.parse(data) as ChatStreamEvent) : null;
}