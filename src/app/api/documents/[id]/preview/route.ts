
import {
  extractStoredDocument,
  DocumentProcessingError,
} from "@/lib/server/documentText";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const result = await extractStoredDocument(id);

    const totalCharacters = result.pages.reduce(
      (total, page) => total + page.text.length,
      0
    );

    // Only send a small preview to the browser.
    const preview = result.pages
      .filter((page) => page.text.length > 0)
      .slice(0, 3)
      .map((page) => ({
        pageNumber: page.pageNumber,
        text: page.text.slice(0, 700),
      }));

    return Response.json(
      {
        documentName: result.document.name,
        totalPages: result.totalPages,
        totalCharacters,
        preview,
        warning:
          totalCharacters === 0
            ? "No readable text found. This may be a scanned PDF requiring OCR."
            : null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Document extraction failed:", error);

    return Response.json(
      {
        error:
          "Unable to extract text. The file may be damaged, encrypted, or unsupported.",
      },
      { status: 422 }
    );
  }
}
