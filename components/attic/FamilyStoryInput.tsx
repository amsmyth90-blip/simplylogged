export function FamilyStoryInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#33483b]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
      />
    </label>
  );
}
