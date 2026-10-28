
import DocumentUploader from "@/components/documents/DocumentUploader";
import { Files } from "lucide-react";

export default function DocumentsPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-7">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-primary-soft p-3 text-on-primary-soft">
          <Files
            className="h-7 w-7"
            aria-hidden="true"
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Document Library
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep your files organized in one place.
            Upload PDF or TXT documents, preview
            their content, and use them in AI Chat.
          </p>
        </div>
      </div>

      <DocumentUploader />
    </section>
  );
}
