
import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, extname } from "node:path";

import type { StoredDocument } from "@/types/document";

const STORAGE_DIR = join(
  process.cwd(),
  ".local-documents"
);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true });
}

// GET /api/documents
export async function GET() {
  try {
    await ensureStorage();

    const files = await readdir(STORAGE_DIR);

    const documents = await Promise.all(
      files
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => {
          const content = await readFile(
            join(STORAGE_DIR, name),
            "utf8"
          );

          return JSON.parse(content) as StoredDocument;
        })
    );

    documents.sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt)
    );

    return Response.json(
      { documents },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { error: "Unable to load documents." },
      { status: 500 }
    );
  }
}

// POST /api/documents
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Please select a file." },
        { status: 400 }
      );
    }

    const extension = extname(file.name).toLowerCase();

    if (![".pdf", ".txt"].includes(extension)) {
      return Response.json(
        { error: "Only PDF and TXT files are allowed." },
        { status: 415 }
      );
    }

    if (file.size === 0) {
      return Response.json(
        { error: "The file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Maximum file size is 10 MB." },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    // Basic content validation
    if (extension === ".pdf") {
      const signature = new TextDecoder().decode(
        bytes.subarray(0, 5)
      );

      if (signature !== "%PDF-") {
        return Response.json(
          { error: "Invalid PDF file." },
          { status: 415 }
        );
      }
    } else {
      try {
        new TextDecoder("utf-8", {
          fatal: true,
        }).decode(bytes);

        if (bytes.includes(0)) {
          throw new Error("Binary content");
        }
      } catch {
        return Response.json(
          { error: "Invalid UTF-8 text file." },
          { status: 415 }
        );
      }
    }

    await ensureStorage();

    const id = randomUUID();

    const document: StoredDocument = {
      id,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "ready",
    };

    const filePath = join(
      STORAGE_DIR,
      `${id}${extension}`
    );

    const metadataPath = join(
      STORAGE_DIR,
      `${id}.json`
    );

    await writeFile(filePath, bytes);

    try {
      await writeFile(
        metadataPath,
        JSON.stringify(document, null, 2)
      );
    } catch {
      await rm(filePath, { force: true });
      throw new Error("Metadata write failed");
    }

    return Response.json(
      { document },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "Unable to upload the document." },
      { status: 500 }
    );
  }
}

// DELETE /api/documents?id=DOCUMENT_ID
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // Prevent IDs containing directory paths
    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return Response.json(
        { error: "Invalid document ID." },
        { status: 400 }
      );
    }

    const metadataPath = join(
      STORAGE_DIR,
      `${id}.json`
    );

    let document: StoredDocument;

    try {
      document = JSON.parse(
        await readFile(metadataPath, "utf8")
      ) as StoredDocument;
    } catch {
      return Response.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const extension = extname(
      document.name
    ).toLowerCase();

    if (![".pdf", ".txt"].includes(extension)) {
      return Response.json(
        { error: "Invalid stored document." },
        { status: 500 }
      );
    }

    await rm(
      join(STORAGE_DIR, `${id}${extension}`),
      { force: true }
    );

    await rm(metadataPath, { force: true });

    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Unable to delete document." },
      { status: 500 }
    );
  }
}
