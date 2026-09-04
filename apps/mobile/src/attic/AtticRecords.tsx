import type { AtticSection, FamilyStory } from "@diarydock/attic";
import type { DocumentSummary } from "@diarydock/documents";
import type { Reminder } from "@diarydock/reminders";

import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";

type Props = {
  documents: DocumentSummary[];
  reminders: Reminder[];
  section: AtticSection;
  stories: FamilyStory[];
  onAddReminder: () => void;
  onAddStory: () => void;
  onOpenDocument: (document: DocumentSummary) => void;
  onScan: () => void;
  onToggleReminder: (reminder: Reminder) => void;
};

function StoryList({ stories, onAdd }: { stories: FamilyStory[]; onAdd: () => void }) {
  return (
    <section className="attic-card attic-story-card">
      <header>
        <div><p>Family archive</p><h2>Your stories</h2></div>
        <button type="button" onClick={onAdd}>＋ Add</button>
      </header>
      <div className="attic-story-list">
        {stories.map((story) => (
          <details key={story.id}>
            <summary>
              <span>♥</span>
              <div><strong>{story.title}</strong><small>{[story.people, story.dateLabel, story.place].filter(Boolean).join(" · ") || "Family memory"}</small></div>
              <b>{story.images.length ? `${story.images.length} photo${story.images.length === 1 ? "" : "s"}` : "Read"}</b>
            </summary>
            <p>{story.storyText}</p>
            {story.tags.length ? <footer>{story.tags.map((tag) => <span key={tag}>{tag}</span>)}</footer> : null}
          </details>
        ))}
        {!stories.length ? (
          <div className="attic-empty"><span>♥</span><strong>Your first family story starts here</strong><p>Record the people, place and details that should never be forgotten.</p><button type="button" onClick={onAdd}>Create a story</button></div>
        ) : null}
      </div>
    </section>
  );
}

export function AtticRecords(props: Props) {
  return (
    <div className="attic-record-columns">
      {props.section.id === "family-history" ? <StoryList stories={props.stories} onAdd={props.onAddStory} /> : (
        <section className="attic-card">
          <header><div><p>Secure archive</p><h2>{props.section.title}</h2></div><button type="button" onClick={props.onScan}>＋ Scan</button></header>
          <div className="attic-document-list">
            <ProgressiveRecordList
              key={`documents-${props.section.id}`}
              initialCount={12}
              items={props.documents}
              noun="archive files"
              renderItem={(document) => (
              <button type="button" onClick={() => props.onOpenDocument(document)} key={document.syncId}>
                <span>{document.kind === "Image" ? "IMG" : document.kind === "PDF" ? "PDF" : "DOC"}</span>
                <div><strong>{document.title}</strong><small>{document.category} · {document.size}</small></div><b aria-hidden="true">›</b>
              </button>
              )}
            />
            {!props.documents.length ? <div className="attic-empty"><span>▱</span><strong>Nothing filed here yet</strong><p>{props.section.description}</p><button type="button" onClick={props.onScan}>Scan into Attic</button></div> : null}
          </div>
        </section>
      )}
      <section className="attic-card">
        <header><div><p>Gentle prompts</p><h2>Reminders</h2></div><button type="button" onClick={props.onAddReminder}>＋ Add</button></header>
        <div className="attic-reminder-list">
          <ProgressiveRecordList
            key={`reminders-${props.section.id}`}
            initialCount={8}
            items={props.reminders}
            noun="reminders"
            renderItem={(reminder) => (
            <label key={reminder.id}>
              <input type="checkbox" checked={reminder.group === "done"} onChange={() => props.onToggleReminder(reminder)} />
              <span><strong>{reminder.title}</strong><small>{[reminder.timeLabel, reminder.note].filter(Boolean).join(" · ")}</small></span>
            </label>
            )}
          />
          {!props.reminders.length ? <div className="attic-empty"><span>✓</span><strong>Nothing waiting here</strong><p>Add a reminder when a memory, scan or family detail needs attention.</p><button type="button" onClick={props.onAddReminder}>Add reminder</button></div> : null}
        </div>
      </section>
    </div>
  );
}
