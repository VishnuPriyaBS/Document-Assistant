
import DocumentUploader from "@/components/documents/DocumentUploader";

export default function DocumentsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Document Library
        </h2>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Upload and manage your documents.
          Your AI assistant will use them to answer questions.
        </p>
      </div>

      <DocumentUploader />
    </section>
  );
}
