import { atticSections, type AtticSectionId } from "@diarydock/attic";

const icons: Record<AtticSectionId, string> = {
  "photo-albums": "▧",
  keepsakes: "◇",
  "family-history": "♧",
  "letters-journals": "✉",
  "memory-box": "♥",
};

const labels: Record<AtticSectionId, string> = {
  "photo-albums": "Photos",
  keepsakes: "Keepsakes",
  "family-history": "Stories",
  "letters-journals": "Letters",
  "memory-box": "Memories",
};

export function AtticSectionPicker({
  selected,
  onSelect,
}: {
  selected: AtticSectionId;
  onSelect: (section: AtticSectionId) => void;
}) {
  return (
    <div className="attic-section-picker" role="tablist" aria-label="Attic sections">
      {atticSections.map((section) => (
        <button
          type="button"
          role="tab"
          aria-selected={selected === section.id}
          className={selected === section.id ? "is-active" : ""}
          onClick={() => onSelect(section.id)}
          key={section.id}
        >
          <span aria-hidden="true">{icons[section.id]}</span>
          <strong>{labels[section.id]}</strong>
        </button>
      ))}
    </div>
  );
}
