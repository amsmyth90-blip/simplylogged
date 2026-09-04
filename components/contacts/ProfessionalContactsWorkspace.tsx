"use client";

import { ContactDetail } from "./workspace/ContactDetail";
import { ContactMeetings } from "./workspace/ContactMeetings";
import { ContactsDashboard } from "./workspace/ContactsDashboard";
import { ContactsDirectory } from "./workspace/ContactsDirectory";
import type { ContactsView } from "./workspace/contacts-shared";
import { ImportContacts } from "./workspace/ImportContacts";
import { NewContact } from "./workspace/NewContact";

export function ProfessionalContactsWorkspace({
  view,
  contactId,
}: {
  view: ContactsView;
  contactId?: string;
}) {
  if (view === "directory") return <ContactsDirectory />;
  if (view === "new") return <NewContact />;
  if (view === "import") return <ImportContacts />;
  if (view === "detail" && contactId)
    return <ContactDetail contactId={contactId} />;
  if (view === "meetings" && contactId)
    return <ContactMeetings contactId={contactId} />;
  return <ContactsDashboard />;
}
