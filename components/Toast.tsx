type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
};

export function Toast({ message, tone = "success" }: ToastProps) {
  if (!message) return null;

  const toneClass =
    tone === "error"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "info"
        ? "bg-violet-50 text-violet-700 ring-violet-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <div
      className={`fixed inset-x-4 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ring-1 ${toneClass}`}
      role="status"
    >
      {message}
    </div>
  );
}
