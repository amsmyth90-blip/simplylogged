import { gardenSections, type GardenSectionId } from "@diarydock/garden";

const icons: Record<GardenSectionId, string> = {
  pets: "♥",
  "outdoor-spaces": "☀",
  jobs: "✓",
  "tools-shed": "⌂",
  bins: "▤",
};

const shortLabels: Record<GardenSectionId, string> = {
  pets: "Pets",
  "outdoor-spaces": "Outdoor",
  jobs: "Jobs",
  "tools-shed": "Tools",
  bins: "Bins",
};

export function GardenSectionPicker({
  selected,
  onSelect,
}: {
  selected: GardenSectionId;
  onSelect: (section: GardenSectionId) => void;
}) {
  return (
    <div
      className="garden-section-picker"
      role="tablist"
      aria-label="Garden sections"
    >
      {gardenSections.map((section) => (
        <button
          type="button"
          role="tab"
          aria-selected={selected === section.id}
          className={selected === section.id ? "is-active" : ""}
          onClick={() => onSelect(section.id)}
          key={section.id}
        >
          <span aria-hidden="true">{icons[section.id]}</span>
          <strong>{shortLabels[section.id]}</strong>
        </button>
      ))}
    </div>
  );
}
