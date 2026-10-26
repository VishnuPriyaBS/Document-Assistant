import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { extractStoredDocument, type ExtractedPage } from "./documentText";

const STORAGE_DIR = join(process.cwd(), ".local-documents");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_SELECTED_DOCUMENTS = 10;
const MAX_LIBRARY_SEARCH_DOCUMENTS = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "in", "on", "at",
  "to", "of", "for", "from", "and", "or", "what", "which", "how",
  "does", "do", "this", "that", "with", "about", "me", "tell",
  "please", "my", "your", "these", "those", "its", "can", "you",
  "could", "would", "should", "it", "be", "their", "them", "all",
]);

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  text: string;
}

export interface SearchResult extends DocumentChunk {
  score: number;
}

function tokenize(text: string): string[] {
  // Simple English-word matching; use embeddings for multilingual semantic search.
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => word.length >= 2 && !STOP_WORDS.has(word)
  );
}

function isOverviewQuestion(question: string): boolean {
  const q = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const asksSummary = /\b(summarize|summarise|summary|overview)\b/.test(q);
  const mentionsDocument = /\b(doc|docs|document|documents|pdf|pdfs|file|files|report|reports|resume|resumes|cv|cvs|candidate|candidates|question|questions)\b/.test(q);
  const asksAbout = /\b(about|describe|explain|tell|say|compare|contrast|differences)\b/.test(q);
  return asksSummary || (mentionsDocument && asksAbout);
}

function asksForIdentity(question: string): boolean {
  return /\b(name|names|candidate|candidates|who)\b/i.test(question);
}

function asksForComparison(question: string): boolean {
  return /\b(compare|comparison|versus|vs|difference|differences|better|best|strongest|more|less|rank)\b/i.test(question);
}

export function createChunks(
  documentId: string,
  documentName: string,
  pages: ExtractedPage[]
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    let start = 0;
    let chunkIndex = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);
      if (end < text.length) {
        const spaceIndex = text.lastIndexOf(" ", end);
        if (spaceIndex > start + 700) end = spaceIndex;
      }

      const content = text.slice(start, end).trim();
      if (content) {
        chunks.push({
          id: `${documentId}-${page.pageNumber}-${chunkIndex}`,
          documentId,
          documentName,
          pageNumber: page.pageNumber,
          text: content,
        });
        chunkIndex++;
      }

      if (end >= text.length) break;
      start = end - CHUNK_OVERLAP;
    }
  }

  return chunks;
}

function calculateScore(question: string, chunk: DocumentChunk): number {
  const terms = [...new Set(tokenize(question))];
  if (terms.length === 0) return 0;
  const words = new Set(tokenize(chunk.text));
  const matched = terms.filter((term) => words.has(term));
  if (!matched.length) return 0;

  const phraseBonus = chunk.text
    .toLowerCase()
    .includes(question.trim().toLowerCase())
    ? 5
    : 0;
  return matched.length * 3 + (matched.length / terms.length) * 5 + phraseBonus;
}

function isContentsPage(chunk: DocumentChunk): boolean {
  return /table of contents/i.test(chunk.text.slice(0, 250));
}

function chooseTopChunks(
  chunks: DocumentChunk[],
  question: string,
  quota: number
): SearchResult[] {
  if (isOverviewQuestion(question)) {
    return chunks
      .filter((chunk) => chunk.text.length >= 80 && !isContentsPage(chunk))
      .filter((chunk, index, all) =>
        all.findIndex((other) => other.pageNumber === chunk.pageNumber) === index
      )
      .slice(0, quota)
      .map((chunk) => ({ ...chunk, score: 1 }));
  }

  const ranked = chunks
    .map((chunk) => ({ ...chunk, score: calculateScore(question, chunk) }))
    .filter((chunk) => chunk.score > 0 && !isContentsPage(chunk))
    .sort((a, b) => b.score - a.score);

  // Prefer distinct pages, then fill remaining slots if necessary.
  const chosen: SearchResult[] = [];
  for (const result of ranked) {
    if (chosen.length >= quota) break;
    if (!chosen.some((item) => item.pageNumber === result.pageNumber)) {
      chosen.push(result);
    }
  }
  for (const result of ranked) {
    if (chosen.length >= quota) break;
    if (!chosen.some((item) => item.id === result.id)) chosen.push(result);
  }

  // Names frequently appear at the top of a resume but may not contain
  // the literal words "name" or "candidate". Include a first-page excerpt.
  if ((asksForIdentity(question) || asksForComparison(question)) && chosen.length < quota) {
    const first = chunks.find(
      (chunk) => chunk.text.length >= 30 && !isContentsPage(chunk) &&
        !chosen.some((item) => item.id === chunk.id)
    );
    if (first) chosen.push({ ...first, score: 0.5 });
  }

  return chosen;
}

/**
 * `selection` is a document ID (legacy /api/search), an array of IDs
 * (chat scope), or undefined (legacy whole-library search).
 */
export async function searchStoredDocuments(
  question: string,
  selection?: string | string[]
) {
  await mkdir(STORAGE_DIR, { recursive: true });

  const explicitSelection = selection !== undefined;
  let ids: string[];

  if (Array.isArray(selection)) {
    ids = [...new Set(selection)];
    if (!ids.length || ids.length > MAX_SELECTED_DOCUMENTS) {
      throw new Error(`Select between 1 and ${MAX_SELECTED_DOCUMENTS} documents.`);
    }
  } else if (typeof selection === "string") {
    ids = [selection];
  } else {
    const files = await readdir(STORAGE_DIR);
    ids = files.filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5))
      .filter((name) => UUID_PATTERN.test(name));
    if (ids.length > MAX_LIBRARY_SEARCH_DOCUMENTS) {
      throw new Error("Too many documents. Specify document IDs.");
    }
  }

  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    throw new Error("Invalid document ID.");
  }

  const quota = ids.length === 1 ? 5 : 2;
  const matches: SearchResult[] = [];
  const skippedDocuments: string[] = [];
  let searchedDocuments = 0;

  // Each selected document receives its own retrieval quota.
  // A comparison cannot be dominated entirely by a single PDF.
  for (const id of ids) {
    try {
      const extracted = await extractStoredDocument(id);
      searchedDocuments++;
      const chunks = createChunks(id, extracted.document.name, extracted.pages);
      matches.push(...chooseTopChunks(chunks, question, quota));
    } catch (error) {
      skippedDocuments.push(
        `${id}: ${error instanceof Error ? error.message : "Unable to process"}`
      );
    }
  }

  if (explicitSelection && skippedDocuments.length) {
    throw new Error("A selected document could not be read. Re-upload or deselect it.");
  }

  return {
    question,
    searchedDocuments,
    skippedDocuments,
    matches,
  };
}
