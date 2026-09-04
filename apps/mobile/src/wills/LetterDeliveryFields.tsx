import type { MobileLetterOfWishes } from "@diarydock/wills";

type Delivery = MobileLetterOfWishes["delivery"];

export function LetterDeliveryFields(props: {
  delivery: Delivery;
  onChange: (delivery: Delivery) => void;
}) {
  const change = <K extends keyof Delivery>(key: K, value: Delivery[K]) =>
    props.onChange({ ...props.delivery, [key]: value });
  const eventBased = props.delivery.type === "event" ||
    props.delivery.type === "after-death";

  return (
    <div className="wills-editor-section">
      <h3>Delivery preferences</h3>
      <p className="wills-inline-note">
        Preferences are stored only as instructions. DiaryDock does not
        activate delivery.
      </p>
      <label>
        <span>Timing</span>
        <select
          value={props.delivery.type}
          onChange={(event) =>
            change("type", event.target.value as Delivery["type"])
          }
        >
          <option value="not-set">Not set</option>
          <option value="now">Now</option>
          <option value="date">On a date</option>
          <option value="event">After an event</option>
          <option value="after-death">After death — instruction only</option>
        </select>
      </label>
      {props.delivery.type === "date" ? (
        <div className="wills-editor-row">
          <label>
            <span>Date</span>
            <input
              type="date"
              value={props.delivery.date}
              onChange={(event) => change("date", event.target.value)}
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="time"
              value={props.delivery.time}
              onChange={(event) => change("time", event.target.value)}
            />
          </label>
        </div>
      ) : null}
      {eventBased ? (
        <label>
          <span>Event or instruction</span>
          <textarea
            rows={3}
            maxLength={2_000}
            value={props.delivery.eventDescription}
            onChange={(event) => change("eventDescription", event.target.value)}
          />
        </label>
      ) : null}
      <label>
        <span>Reminder preference</span>
        <select
          value={props.delivery.reminder}
          onChange={(event) =>
            change("reminder", event.target.value as Delivery["reminder"])
          }
        >
          <option value="none">No reminder</option>
          <option value="1-day">1 day before</option>
          <option value="7-days">7 days before</option>
          <option value="30-days">30 days before</option>
        </select>
      </label>
      <label>
        <span>Intended people</span>
        <textarea
          rows={3}
          maxLength={2_000}
          value={props.delivery.intendedPeople}
          onChange={(event) => change("intendedPeople", event.target.value)}
        />
      </label>
      <label className="wills-check">
        <input
          type="checkbox"
          checked={props.delivery.trustedSettingsReviewed}
          onChange={(event) =>
            change("trustedSettingsReviewed", event.target.checked)
          }
        />
        <span>I have reviewed the trusted-person settings separately</span>
      </label>
    </div>
  );
}
