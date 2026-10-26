
import { connection } from "next/server";

import {
  searchStoredDocuments,
} from "@/lib/server/retrieval";

export async function GET(request: Request) {
  // Compatible with Next.js Cache Components
  await connection();

  const url = new URL(request.url);

  const question = url.searchParams.get("q")?.trim();
  const documentId =
    url.searchParams.get("documentId") ?? undefined;

  if (!question) {
    return Response.json(
      { error: "Please provide a question." },
      { status: 400 }
    );
  }

  if (question.length > 500) {
    return Response.json(
      { error: "Question is too long." },
      { status: 400 }
    );
  }

  try {
    const results = await searchStoredDocuments(
      question,
      documentId
    );

    return Response.json(results, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Document search failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to search documents.",
      },
      { status: 400 }
    );
  }
}
