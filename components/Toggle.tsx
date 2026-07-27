"use client";

import { useState } from "react";

type ToggleProps = {
  defaultOn?: boolean;
  label: string;
};

export function Toggle({ defaultOn = false, label }: ToggleProps) {
  const [on, setOn] = useState(defaultOn);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((value) => !value)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        on ? "bg-moss" : "bg-slate-300/80"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
