import { FileText, Landmark } from "lucide-react";
import type { StoredDocument } from "@/lib/storage";

export function DocumentShelf({
  shelves,
  documents,
  fallbackItems,
}: {
  shelves: readonly string[];
  documents: StoredDocument[];
  fallbackItems: readonly string[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Document Shelves</h2>
        <span className="text-sm font-semibold text-stone-500">{documents.length} docs</span>
      </div>
      <div className="space-y-3">
        {shelves.map((shelf) => (
          <ShelfRow key={shelf} title={shelf} documents={documents} fallbackItems={fallbackItems} />
        ))}
      </div>
    </section>
  );
}

function ShelfRow({
  title,
  documents,
  fallbackItems,
}: {
  title: string;
  documents: StoredDocument[];
  fallbackItems: readonly string[];
}) {
  const count = documents.length || fallbackItems.length;

  return (
    <section className="rounded-[1.2rem] bg-white p-3 shadow-sm shadow-stone-200">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-sm text-stone-500">{count} documents</p>
          </div>
        </div>
        <Landmark className="h-5 w-5 text-stone-400" />
      </div>
      {documents.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {documents.slice(0, 4).map((document) => (
            <article key={`${title}-${document.id}`} className="w-40 shrink-0 rounded-2xl bg-[#fbf7ef] p-3">
              <h4 className="line-clamp-2 text-sm font-bold">{document.title}</h4>
              <p className="mt-1 truncate text-sm text-stone-500">{document.category}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
