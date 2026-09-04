import Image from "next/image";

import { captureFilingTargets } from "@/components/document-capture/capture-model";
import { UiIcon } from "@/components/UiIcon";
import type { SuggestedRoom } from "@/lib/document-extraction";

export function CaptureProcessingView({
  filingRoom,
  previewUrl,
  processingIndex,
}: {
  filingRoom: SuggestedRoom;
  previewUrl?: string;
  processingIndex: number;
}) {
  const target =
    captureFilingTargets[filingRoom] ?? captureFilingTargets.Office;
  const targetX = Math.round(target.left * 3.4);
  const routePath = `M170 24 C170 72 ${targetX} 76 ${targetX} 140`;
  return (
    <main className="flex flex-1 flex-col justify-center py-6">
      <div className="relative mx-auto h-36 w-28">
        <span className="absolute inset-0 translate-x-4 rotate-6 rounded-[18px] border border-slate-200 bg-white/78 shadow-lg" />
        <span className="absolute inset-0 -translate-x-3 -rotate-6 rounded-[18px] border border-slate-200 bg-white/88 shadow-lg" />
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Document being organised"
            width={112}
            height={144}
            unoptimized
            className="relative z-10 h-full w-full rounded-[18px] border-4 border-white object-cover shadow-xl"
          />
        ) : null}
      </div>
      <div className="relative mt-5 overflow-hidden rounded-[30px] border border-white/85 bg-white/35 shadow-[0_28px_65px_-38px_rgba(30,61,72,0.55)] backdrop-blur-sm">
        <Image
          src="/images/estate-dashboard-country.png"
          alt="DiaryDock estate"
          width={1200}
          height={700}
          className="h-[280px] w-full object-cover transition-[object-position] duration-700"
          style={{ objectPosition: `center ${target.imagePosition}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/45" />
        <div
          className="absolute z-10 rounded-full border border-white/75 bg-slate-950/88 px-3.5 py-2 text-[11px] font-bold tracking-wide text-white shadow-[0_0_0_4px_rgba(223,242,215,0.32),0_10px_26px_rgba(15,23,42,0.4)] backdrop-blur-xl transition-all duration-700"
          style={{
            left: `${target.left}%`,
            top: "54%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {filingRoom}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 340 260"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d={routePath}
            fill="none"
            stroke="rgba(151,203,126,0.95)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="3 8"
            className="diarydock-route-line drop-shadow-[0_0_5px_rgba(128,190,106,0.9)]"
          />
          <circle
            cx={targetX}
            cy="140"
            r="7"
            fill="rgba(223,242,215,0.88)"
            stroke="rgba(104,145,88,0.95)"
            strokeWidth="3"
            className="drop-shadow-[0_0_7px_rgba(128,190,106,0.95)]"
          />
        </svg>
      </div>
      <section className="relative -mt-4 rounded-[28px] border border-white/90 bg-white/82 p-5 shadow-[0_24px_55px_-30px_rgba(32,61,70,0.45)] backdrop-blur-2xl">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          {["Reading", "Organising", "Filing"].map((step, index) => (
            <div key={step} className="contents">
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${index < processingIndex ? "border-[#98bd82] bg-[#86a774] text-white" : index === processingIndex ? "border-[#8eac7d] bg-white text-[#6d9060] shadow-[0_0_0_6px_rgba(134,167,116,0.13)]" : "border-slate-200 bg-white/60 text-slate-300"}`}
                >
                  {index < processingIndex ? (
                    <UiIcon name="check" className="h-4 w-4" />
                  ) : index === processingIndex ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold ${index <= processingIndex ? "text-slate-700" : "text-slate-400"}`}
                >
                  {step}
                </span>
              </div>
              {index < 2 ? (
                <span
                  className={`mb-5 h-0.5 rounded-full ${index < processingIndex ? "bg-[#86a774]" : "bg-slate-200"}`}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
