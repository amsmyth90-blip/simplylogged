import Image from "next/image";

export function AuthBrand() {
  return (
    <div className="flex items-center gap-3 text-[#20352a]">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={44}
        height={44}
        className="rounded-[13px] shadow-sm"
      />
      <span>
        <span className="block font-serif text-[24px] leading-none">DiaryDock</span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#667068]">
          Your digital home
        </span>
      </span>
    </div>
  );
}
