import type { ReactNode } from "react";

import type { ApplicabilityAnswer } from "@/lib/diarydock-data";

const answerLabels: Record<Exclude<ApplicabilityAnswer, "not-set">, string> = {
  yes: "Yes",
  no: "No / not applicable",
};

export function AnswerRow({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{title}</legend>
      <p className="mt-1 text-xs text-[#667068]">{detail}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function AnswerButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition ${selected ? "border-[#315443] bg-[#315443] text-white" : "border-[#315443]/12 bg-[#f8f6f0] text-[#667068]"}`}
    >
      {children}
    </button>
  );
}

export function BinaryAnswer({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: ApplicabilityAnswer;
  onChange: (value: ApplicabilityAnswer) => void;
}) {
  return (
    <AnswerRow title={title} detail={detail}>
      {(["yes", "no"] as const).map((answer) => (
        <AnswerButton
          key={answer}
          selected={value === answer}
          onClick={() => onChange(answer)}
        >
          {answerLabels[answer]}
        </AnswerButton>
      ))}
    </AnswerRow>
  );
}
