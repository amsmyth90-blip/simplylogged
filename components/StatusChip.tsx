import type { AreaStatus } from "@/lib/mock-data";

const styles: Record<AreaStatus, { dot: string; text: string; label: string }> = {
  ready: { dot: "bg-lime-500", text: "text-lime-700", label: "On track" },
  attention: { dot: "bg-orange-500", text: "text-orange-600", label: "Needs attention" },
  secure: { dot: "bg-sky-500", text: "text-sky-700", label: "Secure" }
};

type StatusChipProps = {
  status: AreaStatus;
  label?: string;
};

export function StatusChip({ status, label }: StatusChipProps) {
  const style = styles[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold backdrop-blur-md ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label ?? style.label}
    </span>
  );
}
