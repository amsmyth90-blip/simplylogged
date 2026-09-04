import type { RefObject } from "react";

import { UiIcon } from "@/components/UiIcon";

import type { NoticeCaptureMode } from "./use-noticeboard-controller";

export function NoticeCaptureActions({
  photoRef,
  titleRef,
  unavailable,
  processing,
  recording,
  onCapture,
  onStartVoice,
  onStopVoice,
}: {
  photoRef: RefObject<HTMLInputElement | null>;
  titleRef: RefObject<HTMLInputElement | null>;
  unavailable: boolean;
  processing: NoticeCaptureMode | null;
  recording: boolean;
  onCapture: (file: File, mode: NoticeCaptureMode) => Promise<void>;
  onStartVoice: () => Promise<void>;
  onStopVoice: () => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => photoRef.current?.click()}
        disabled={unavailable}
        className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-[#dce5d8] bg-[#edf4e9] text-[10px] font-semibold text-[#58704f] disabled:opacity-45"
      >
        <UiIcon name="camera" className="h-5 w-5" /> Take a photo
      </button>
      <button
        type="button"
        onClick={recording ? onStopVoice : () => void onStartVoice()}
        disabled={Boolean(processing)}
        className={`flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border text-[10px] font-semibold disabled:opacity-45 ${recording ? "border-red-200 bg-red-50 text-red-600" : "border-[#ead7c5] bg-[#f5e8dc] text-[#8c6549]"}`}
      >
        <span className={recording ? "animate-pulse" : ""}>
          <UiIcon name="microphone" className="h-5 w-5" />
        </span>
        {recording ? "Tap to finish" : "Speak"}
      </button>
      <button
        type="button"
        onClick={() => titleRef.current?.focus()}
        disabled={unavailable}
        className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-[#d7dfe8] bg-[#edf2f5] text-[10px] font-semibold text-[#5a7080] disabled:opacity-45"
      >
        <UiIcon name="file" className="h-5 w-5" /> Type
      </button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (file)
            void onCapture(file, "photo").finally(() => {
              input.value = "";
            });
        }}
      />
    </div>
  );
}
