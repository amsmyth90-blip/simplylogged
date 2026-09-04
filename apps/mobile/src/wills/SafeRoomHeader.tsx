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
          <strong>Safe Room</strong>
          <small>Wills, wishes & trusted planning</small>
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
          <p>Private planning</p>
          <h1>Wills & wishes</h1>
          <span>
            Organise the records and practical details your trusted people may one
            day need.
          </span>
        </article>
      </section>
    </>
  );
}
