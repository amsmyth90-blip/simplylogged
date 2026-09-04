import Image from "next/image";

import { UiIcon } from "@/components/UiIcon";

type CaptureIdleViewProps = {
  onAddPages: (files: File[]) => void;
  onAnalyze: () => void;
  onRemovePage: (index: number) => void;
  previewUrls: string[];
  selectedFiles: File[];
};

function FileChoice({
  camera,
  onAdd,
}: {
  camera: boolean;
  onAdd: (files: File[]) => void;
}) {
  return (
    <label
      className={
        camera
          ? "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] bg-[#86a774] px-3 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(65,98,63,0.75)] transition hover:bg-[#789968]"
          : "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-white/90 bg-white/82 px-3 py-4 text-sm font-semibold text-slate-800 shadow-[0_18px_34px_-24px_rgba(36,63,72,0.45)] transition hover:bg-white"
      }
    >
      <span
        className={
          camera
            ? "flex h-9 w-9 items-center justify-center rounded-full bg-white/18"
            : "flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"
        }
      >
        {camera ? (
          <UiIcon name="camera" className="h-5 w-5" />
        ) : (
          <UiIcon name="file" className="h-5 w-5" />
        )}
      </span>
      {camera ? "Take photo" : "Choose pages"}
      <input
        type="file"
        accept="image/*"
        capture={camera ? "environment" : undefined}
        multiple={!camera}
        className="sr-only"
        onChange={(event) => {
          onAdd(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}

export function CaptureIdleView({
  onAddPages,
  onAnalyze,
  onRemovePage,
  previewUrls,
  selectedFiles,
}: CaptureIdleViewProps) {
  return (
    <main className="flex flex-1 flex-col justify-center py-8">
      <section className="rounded-[32px] border border-white/90 bg-white/68 p-5 shadow-[0_28px_70px_-35px_rgba(39,72,77,0.48)] backdrop-blur-2xl">
        <div className="relative mx-auto flex h-44 w-full max-w-[260px] items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(234,245,250,0.9),rgba(255,255,255,0.65))] shadow-inner">
          {previewUrls[0] ? (
            <>
              <span className="absolute h-28 w-20 translate-x-5 rotate-[7deg] rounded-2xl border border-slate-200 bg-white/85 shadow-lg" />
              <span className="absolute h-28 w-20 -translate-x-4 -rotate-6 rounded-2xl border border-slate-200 bg-white/95 shadow-xl" />
              <Image
                src={previewUrls[0]}
                alt="First selected page"
                width={80}
                height={112}
                unoptimized
                className="relative z-10 h-28 w-20 rounded-2xl border-4 border-white object-cover shadow-xl"
              />
            </>
          ) : (
            <Image
              src="/images/capture-document-stack.png"
              alt="A secure stack of household documents ready to add"
              width={160}
              height={160}
              className="relative z-10 h-40 w-40 rounded-[24px] object-contain mix-blend-multiply drop-shadow-[0_18px_18px_rgba(71,85,105,0.18)]"
            />
          )}
        </div>
        <div className="mt-5 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {selectedFiles.length
              ? `${selectedFiles.length} page${selectedFiles.length === 1 ? "" : "s"} ready`
              : "Add one or more pages"}
          </h2>
          <p className="mx-auto mt-1 max-w-[260px] text-sm leading-5 text-slate-500">
            {selectedFiles.length
              ? "Check the order, add any missing pages, then continue."
              : "Photograph each page or choose several together."}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <FileChoice camera onAdd={onAddPages} />
          <FileChoice camera={false} onAdd={onAddPages} />
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#66815f]">
          <UiIcon name="leaf" className="h-3.5 w-3.5" />
          You can add up to 12 pages
        </p>
        {selectedFiles.length ? (
          <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {previewUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative h-24 w-[70px] shrink-0 overflow-hidden rounded-[14px] border-2 border-white bg-white p-1 shadow-md"
                >
                  <Image
                    src={url}
                    alt={`Document page ${index + 1}`}
                    width={62}
                    height={88}
                    unoptimized
                    className="h-full w-full rounded-[10px] object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1/2 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-slate-800 px-1 text-[9px] font-bold text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove page ${index + 1}`}
                    onClick={() => onRemovePage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow"
                  >
                    <UiIcon name="plus" className="h-3 w-3 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAnalyze}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(15,23,42,0.75)]"
            >
              Continue
              <UiIcon name="chevron-right" className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}
