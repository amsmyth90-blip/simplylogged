export const kidsScheduleFieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#789469]";

export function KidsScheduleDraftInput({
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={kidsScheduleFieldClass}
      />
    </label>
  );
}
