import Image from "next/image";

type DiaryDockBrandProps = {
  className?: string;
  compact?: boolean;
  priority?: boolean;
};

export function DiaryDockBrand({
  className = "",
  compact = false,
  priority = false,
}: DiaryDockBrandProps) {
  return (
    <span className={`inline-flex items-center ${compact ? "gap-2.5" : "gap-3"} ${className}`}>
      <Image
        src="/brand/diarydock-mark.png"
        alt=""
        width={compact ? 42 : 50}
        height={compact ? 47 : 56}
        className="h-auto shrink-0"
        priority={priority}
      />
      <span className="min-w-0">
        <span
          className={`${compact ? "text-[20px]" : "text-[24px]"} block whitespace-nowrap font-sans font-semibold uppercase leading-none tracking-[0.13em]`}
        >
          <span className="text-[#0b3c78]">Diary</span>
          <span className="bg-gradient-to-r from-[#3f8edb] via-[#6679df] to-[#9d59ee] bg-clip-text text-transparent">
            Dock
          </span>
        </span>
        <span
          className={`${compact ? "text-[7px] tracking-[0.2em]" : "text-[8px] tracking-[0.22em]"} mt-1.5 block whitespace-nowrap font-semibold uppercase text-[#173d70]`}
        >
          Your digital home
        </span>
      </span>
    </span>
  );
}
