import Image from "next/image";

import { UiIcon } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";

export function DocumentFilePreview({
  document,
  fileMessage,
  onOpen,
  signedUrl,
}: {
  document: VaultDocument;
  fileMessage: string | null;
  onOpen: () => void;
  signedUrl: string | null;
}) {
  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";
  return (
    <div className="space-y-2.5">
      <section className="estate-sheet overflow-hidden p-2.5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Original file
            </h2>
            <p className="truncate text-xs text-ink/45">
              {document.originalFileName ?? "Stored DiaryDock document"}
            </p>
          </div>
          {document.storagePath ? (
            <button
              type="button"
              onClick={onOpen}
              className="shrink-0 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/60"
            >
              Open
            </button>
          ) : null}
        </div>
        <div className="mt-3 overflow-hidden rounded-[20px] border border-white/70 bg-white/62">
          {signedUrl && isImage ? (
            <Image
              src={signedUrl}
              alt={document.title}
              width={1200}
              height={1600}
              unoptimized
              className="max-h-[46vh] w-full object-contain sm:max-h-[500px]"
            />
          ) : signedUrl && isPdf ? (
            <iframe
              src={signedUrl}
              title={document.title}
              className="h-[46vh] min-h-[310px] w-full bg-white sm:h-[500px]"
            />
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-4 py-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mist text-ink/45">
                <UiIcon name="file" className="h-5 w-5" />
              </span>
              <p className="mt-2.5 text-sm font-semibold text-ink">
                {document.storagePath
                  ? "Secure original attached"
                  : "No original file attached yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-ink/50">
                {document.storagePath
                  ? "Open it securely when you need the full document."
                  : "This record currently contains saved details only."}
              </p>
            </div>
          )}
        </div>
        {fileMessage ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {fileMessage}
          </div>
        ) : null}
      </section>
      {document.extractedText ? (
        <details className="estate-sheet group p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm font-semibold text-ink">
            OCR text
            <span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-ink/45 group-open:hidden">
              Show
            </span>
            <span className="hidden rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-ink/45 group-open:inline">
              Hide
            </span>
          </summary>
          <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-xs leading-5 text-ink/62">
            {document.extractedText}
          </p>
        </details>
      ) : null}
    </div>
  );
}
