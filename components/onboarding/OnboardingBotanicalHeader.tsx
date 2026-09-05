import Image from "next/image";

export function OnboardingBotanicalHeader({ badge }: { badge: string }) {
  return (
    <header className="relative overflow-hidden rounded-[34px] border border-[#c5ded5] bg-[#eff9f6] px-5 py-6 text-[#123f34] shadow-[0_24px_60px_-44px_rgba(5,72,54,0.45)] sm:px-8 sm:py-8">
      <Image
        aria-hidden="true"
        alt=""
        height={360}
        src="/images/onboarding-botanical-sprig.svg"
        width={240}
        className="pointer-events-none absolute -right-7 -top-14 h-[270px] w-[180px] opacity-[0.35] sm:right-2 sm:h-[320px] sm:w-[210px]"
      />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <span className="font-serif text-[26px] tracking-[-0.035em]">DiaryDock</span>
        <span className="rounded-full border border-[#9fc7b9] bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b6a53]">
          🔒 {badge}
        </span>
      </div>
      <div className="relative z-10 mt-10 max-w-xl sm:mt-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8c67a5]">
          Welcome to DiaryDock
        </p>
        <h1 className="mt-2 font-serif text-[42px] font-normal leading-[0.98] tracking-[-0.045em] sm:text-[50px]">
          Let’s make it yours
        </h1>
      </div>
    </header>
  );
}
