
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { extractText } from "unpdf";

import type { StoredDocument } from "@/types/document";

const STORAGE_DIR = join(
  process.cwd(),
  ".local-documents"
);

const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_PAGES = 100;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  document: StoredDocument;
  totalPages: number;
  pages: ExtractedPage[];
}

export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export async function extractStoredDocument(
  id: string
): Promise<ExtractedDocument> {
  // Validate the identifier before accessing a file.
  if (!ID_PATTERN.test(id)) {
    throw new DocumentProcessingError(
      "Invalid document ID.",
      400
    );
  }

  const metadataPath = join(
    STORAGE_DIR,
    `${id}.json`
  );

  let metadataContent: string;

  try {
    metadataContent = await readFile(
      metadataPath,
      "utf8"
    );
  } catch {
    throw new DocumentProcessingError(
      "Document not found.",
      404
    );
  }

  const document = JSON.parse(
    metadataContent
  ) as StoredDocument;

  const extension = extname(
    document.name
  ).toLowerCase();

  if (
    extension !== ".pdf" &&
    extension !== ".txt"
  ) {
    throw new DocumentProcessingError(
      "Unsupported document format.",
      415
    );
  }

  const filePath = join(
    STORAGE_DIR,
    `${id}${extension}`
  );

  const buffer = await readFile(filePath);

  // Plain text documents
  if (extension === ".txt") {
    const text = buffer.toString("utf8");

    return {
      document,
      totalPages: 1,
      pages: [
        {
          pageNumber: 1,
          text,
        },
      ],
    };
  }

  // PDF documents
  
  // PDF documents
  const result = await extractText(
    new Uint8Array(buffer),
    { mergePages: false }
  );

  if (result.totalPages > MAX_PAGES) {
    throw new DocumentProcessingError(
      `PDF exceeds the ${MAX_PAGES}-page processing limit.`,
      422
    );
  }

  const pageTexts = Array.isArray(result.text)
    ? result.text
    : [result.text];

  const pages: ExtractedPage[] = pageTexts.map(
    (text, index) => ({
      pageNumber: index + 1,
      text: text.trim(),
    })
  );

  return {
    document,
    totalPages: result.totalPages,
    pages,
  };
}