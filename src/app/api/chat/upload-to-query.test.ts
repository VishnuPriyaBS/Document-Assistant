
/**
 * @vitest-environment node
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  POST as uploadDocument,
  DELETE as deleteDocument,
} from "@/app/api/documents/route";

import {
  POST as askQuestion,
} from "@/app/api/chat/route";

type UploadedDocument = {
  id: string;
  name: string;
};

type StreamEvent = {
  type: string;
  text?: string;
  sources?: {
    documentId: string;
    documentName: string;
    pageNumber: number;
    url: string;
  }[];
};

describe("Document upload to AI question integration", () => {
  it(
    "uploads a document and streams a cited response",
    async () => {
      vi.stubEnv("AI_PROVIDER", "gemini");
      vi.stubEnv("OPENAI_MOCK_MODE", "true");

      let uploadedId: string | undefined;

      try {
        // STEP 1: Create a test text document
        const filename = `docai-test-${randomUUID()}.txt`;

        const file = new File(
          [
            "The Atlas dashboard uses React and TypeScript. " +
              "React components display analytics. " +
              "TypeScript provides type safety. " +
              "The dashboard integrates REST APIs.",
          ],
          filename,
          { type: "text/plain" }
        );

        const formData = new FormData();
        formData.append("file", file);

        // STEP 2: Upload through the real API handler
        const uploadResponse = await uploadDocument(
          new Request("http://localhost:3000/api/documents", {
            method: "POST",
            body: formData,
          })
        );

        expect(uploadResponse.status).toBe(201);

        const uploadResult = (await uploadResponse.json()) as {
          document?: UploadedDocument;
        };

        uploadedId = uploadResult.document?.id;

        expect(uploadedId).toBeTruthy();

        if (!uploadedId) {
          throw new Error("Upload did not return a document ID.");
        }

        // STEP 3: Ask a question about the uploaded file
        const question = "Which technologies does the Atlas dashboard use?";

        const chatResponse = await askQuestion(
          new Request("http://localhost:3000/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question,
              documentIds: [uploadedId],
              history: [],
            }),
          })
        );

        expect(chatResponse.status).toBe(200);

        expect(
          chatResponse.headers.get("content-type")
        ).toContain("text/event-stream");

        // STEP 4: Read the streaming events
        const streamText = await chatResponse.text();

        const events: StreamEvent[] = streamText
          .split(/\r?\n\r?\n/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block) => {
            const json = block.replace(/^data:\s*/, "");
            return JSON.parse(json) as StreamEvent;
          });

        // The response must include citations
        const sourceEvent = events.find(
          (event) => event.type === "sources"
        );

        expect(sourceEvent).toBeDefined();

        expect(
          sourceEvent?.sources?.[0]?.documentId
        ).toBe(uploadedId);

        expect(
          sourceEvent?.sources?.[0]?.documentName
        ).toBe(filename);

        // The response must contain streamed text
        const streamedAnswer = events
          .filter((event) => event.type === "delta")
          .map((event) => event.text ?? "")
          .join("");

        expect(streamedAnswer).toContain("DEMO MODE");
        expect(streamedAnswer).toContain("[S1]");

        // The response must finish successfully
        expect(
          events.some((event) => event.type === "done")
        ).toBe(true);

        expect(
          events.some((event) => event.type === "error")
        ).toBe(false);
      } finally {
        // STEP 5: Delete the uploaded test document
        if (uploadedId) {
          await deleteDocument(
            new Request(
              `http://localhost:3000/api/documents?id=${uploadedId}`,
              { method: "DELETE" }
            )
          );
        }

        vi.unstubAllEnvs();
      }
    },
    15000
  );
});
