import { purposeLabel, recipientLabel, type MobileLetterOfWishes } from "@diarydock/wills";

type Props = {
  letters: MobileLetterOfWishes[];
  onAdd: () => void;
  onEdit: (letter: MobileLetterOfWishes) => void;
};

export function LettersList(props: Props) {
  return (
    <section className="wills-card wills-record-card">
      <header>
        <div><p>Personal guidance</p><h2>Letters of Wishes</h2></div>
        <button type="button" onClick={props.onAdd}>＋ Write</button>
      </header>
      <p className="wills-boundary-note">
        Letters record personal wishes and messages. They are not a substitute for
        a legally valid will.
      </p>
      <div className="wills-letter-list">
        {props.letters.map((letter) => (
          <button type="button" key={letter.id} onClick={() => props.onEdit(letter)}>
            <span>✉</span>
            <div>
              <strong>{letter.title}</strong>
              <small>
                {recipientLabel(letter.recipientType)} · {purposeLabel(letter.purpose)}
                {` · version ${letter.versions.length || 1}`}
              </small>
              <p>{letter.content}</p>
            </div>
            <b>›</b>
          </button>
        ))}
        {!props.letters.length ? (
          <div className="wills-empty">
            <span>✉</span>
            <strong>No personal letters yet</strong>
            <p>
              Write only when you are ready. Drafts remain private and never trigger
              automatic delivery.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
