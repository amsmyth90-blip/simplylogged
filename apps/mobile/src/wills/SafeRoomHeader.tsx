import safeRoomImage from "../../../../public/images/pages/safe-room-hero.webp";

type Props = {
  syncStatus: string;
  onBack: () => void;
};

export function SafeRoomHeader({ syncStatus, onBack }: Props) {
  return (
    <>
      <header className="wills-header">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the estate map"
        >
          ‹
        </button>
        <div>
          <strong>Wills & Wishes</strong>
        </div>
        <span className={`sync-pill sync-${syncStatus.toLowerCase()}`}>
          {syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </header>
      <section
        className="wills-hero"
        style={{ backgroundImage: `url(${safeRoomImage})` }}
      >
        <div />
        <article>
          <h1>Wills & Wishes</h1>
        </article>
      </section>
    </>
  );
}
