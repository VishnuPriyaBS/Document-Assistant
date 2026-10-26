
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { connection } from "next/server";

import type { StoredDocument } from "@/types/document";

const STORAGE_DIR = join(
  process.cwd(),
  ".local-documents"
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  await connection();

  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return Response.json(
      { error: "Invalid document ID." },
      { status: 400 }
    );
  }

  try {
    const metadataText = await readFile(
      join(STORAGE_DIR, `${id}.json`),
      "utf8"
    );

    const document = JSON.parse(
      metadataText
    ) as StoredDocument;

    const extension = extname(
      document.name
    ).toLowerCase();

    if (![".pdf", ".txt"].includes(extension)) {
      return Response.json(
        { error: "Unsupported file type." },
        { status: 415 }
      );
    }

    const bytes = await readFile(
      join(STORAGE_DIR, `${id}${extension}`)
    );

    return new Response(bytes, {
      headers: {
        "Content-Type":
          extension === ".pdf"
            ? "application/pdf"
            : "text/plain; charset=utf-8",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }
}
