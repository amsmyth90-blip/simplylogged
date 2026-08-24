"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillPageHeader, WillSectionHeading } from "@/components/wills/WillUi";
import { LettersLegalNotice, LetterSafetyNotice, LetterSubpageNav } from "@/components/wills/letters/LettersUi";
import { openPrivateDocument, uploadPrivateDocument, validateDocumentFile } from "@/lib/document-storage";
import {
  createLetterDraft,
  hydrateLettersRecord,
  letterPurposeOptions,
  letterRecipientOptions,
  type LetterOfWishes,
  type LetterPurpose,
  type LetterRecipientType,
  type LettersOfWishesRecord
} from "@/lib/letter-records";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";

function replaceLetters(state: DiaryDockAppState, record: LettersOfWishesRecord) {
  return { ...state, willsWishes: { ...state.willsWishes, lettersOfWishes: record } };
}
function readableFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const inputClass = "mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15";

export function LetterEditorWorkspace({ letterId }: { letterId?: string }) {
  const router = useRouter();
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const storedLetter = useMemo(() => letterId ? record.letters.find((letter) => letter.id === letterId) ?? null : null, [letterId, record.letters]);
  const [draft, setDraft] = useState<LetterOfWishes>(createLetterDraft);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated) setDraft(storedLetter ?? createLetterDraft());
  }, [hydrated, storedLetter]);

  const updateField = <K extends keyof LetterOfWishes>(key: K, value: LetterOfWishes[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const saveLetter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!draft.title.trim() || !draft.content.trim()) {
      setMessage("Add a title and some words before saving your letter.");
      return;
    }
    if (!draft.recipientName.trim() && draft.recipientType === "other") {
      setMessage("Add the intended recipient’s name or relationship.");
      return;
    }
    if (attachment) {
      const validationError = validateDocumentFile(attachment);
      if (validationError) {
        setMessage(validationError);
        return;
      }
      if (repositoryMode !== "supabase") {
        setMessage("Secure attachments require the connected DiaryDock account service.");
        return;
      }
    }

    setSaving(true);
    const now = new Date().toISOString();
    const id = draft.id || crypto.randomUUID();
    let attachmentIds = [...draft.attachmentDocumentIds];
    let uploadedDocument: VaultDocument | null = null;

    try {
      if (attachment) {
        const documentId = crypto.randomUUID();
        const stored = await uploadPrivateDocument(attachment, documentId);
        uploadedDocument = {
          id: documentId,
          title: `${draft.title.trim()} attachment`,
          category: "Legal & Estate",
          kind: attachment.type === "application/pdf" ? "PDF" : "Image",
          size: readableFileSize(attachment.size),
          updated: "Just now",
          storageBucket: stored.bucket,
          storagePath: stored.path,
          originalFileName: attachment.name,
          mimeType: attachment.type,
          roomId: "office",
          roomName: "Office",
          issuer: "Letter of Wishes attachment",
          reviewStatus: "reviewed"
        };
        await upsertStructuredDocument(uploadedDocument);
        attachmentIds = [...attachmentIds, documentId];
      }

      const versionNumber = draft.versions.length + 1;
      const nextLetter: LetterOfWishes = {
        ...draft,
        id,
        title: draft.title.trim(),
        recipientName: draft.recipientName.trim(),
        content: draft.content.trim(),
        envelopeTitle: draft.envelopeTitle.trim(),
        envelopeMessage: draft.envelopeMessage.trim(),
        memoryNotes: draft.memoryNotes.trim(),
        attachmentDocumentIds: attachmentIds,
        createdAt: draft.createdAt || now,
        updatedAt: now,
        versions: [
          ...draft.versions,
          {
            id: crypto.randomUUID(),
            versionNumber,
            createdAt: now,
            title: draft.title.trim(),
            content: draft.content.trim(),
            envelopeTitle: draft.envelopeTitle.trim(),
            envelopeMessage: draft.envelopeMessage.trim()
          }
        ]
      };

      updateState((current) => {
        const currentRecord = hydrateLettersRecord(current.willsWishes.lettersOfWishes);
        const nextState = uploadedDocument
          ? { ...current, vaultDocuments: [uploadedDocument, ...current.vaultDocuments.filter((document) => document.id !== uploadedDocument?.id)] }
          : current;
        return replaceLetters(nextState, {
          letters: [nextLetter, ...currentRecord.letters.filter((letter) => letter.id !== id)],
          updatedAt: now
        });
      });
      setDraft(nextLetter);
      setAttachment(null);
      setMessage(`Letter saved privately as version ${versionNumber}.`);
      if (!letterId) router.replace(`/wills/letters-of-wishes/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The letter could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (documentId: string) => {
    const document = state.vaultDocuments.find((item) => item.id === documentId);
    try {
      await openPrivateDocument(document?.storageBucket, document?.storagePath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open this attachment.");
    }
  };

  const removeAttachment = (documentId: string) => {
    setDraft((current) => ({ ...current, attachmentDocumentIds: current.attachmentDocumentIds.filter((id) => id !== documentId) }));
    setMessage("Attachment removed from this letter. The original file remains in All Files and has not been deleted.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening your private writing space…</div>;
  if (letterId && !storedLetter) return <div className="mx-auto w-full max-w-[680px]"><WillPageHeader title="Letter not found" subtitle="This letter is not available in your private records." backHref="/wills/letters-of-wishes" /><Link href="/wills/letters-of-wishes" className="mt-5 inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Back to your letters</Link></div>;

  return (
    <form onSubmit={saveLetter} className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title={letterId ? draft.title || "Edit letter" : "New letter"} subtitle="Write from the heart, then decide how you would like the letter to be kept." backHref="/wills/letters-of-wishes" />
      {draft.id ? <LetterSubpageNav letterId={draft.id} /> : null}

      <WillCard>
        <WillSectionHeading icon="users" title="Who is this letter for?" description="This records your intention; it does not grant the person access." />
        <fieldset className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <legend className="sr-only">Recipient type</legend>
          {letterRecipientOptions.map((option) => <label key={option.value} className={`flex min-h-[84px] cursor-pointer flex-col items-center justify-center rounded-[17px] border px-2 py-3 text-center transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${draft.recipientType === option.value ? "border-[#6f8e72]/40 bg-[#eef2e9]" : "border-[#20352a]/[0.07] bg-white"}`}><input type="radio" name="recipientType" value={option.value} checked={draft.recipientType === option.value} onChange={(event) => updateField("recipientType", event.target.value as LetterRecipientType)} className="sr-only" /><UiIcon name={option.value === "partner" ? "heart" : option.value === "future-me" ? "clock" : "users"} className="h-5 w-5 text-[#52705a]" /><span className="mt-2 text-[12px] font-semibold text-[#20352a]">{option.label}</span></label>)}
        </fieldset>
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Name or relationship <span className="font-normal text-[#667068]">(optional unless Other)</span></span><input value={draft.recipientName} onChange={(event) => updateField("recipientName", event.target.value)} className={inputClass} placeholder="For example, my children" /></label>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="heart" title="Letter type" description="Choose the purpose that best fits this message." />
        <fieldset className="mt-5 space-y-2.5"><legend className="sr-only">Letter purpose</legend>{letterPurposeOptions.map((option) => <label key={option.value} className={`flex min-h-[66px] cursor-pointer items-center gap-3 rounded-[16px] border px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${draft.purpose === option.value ? "border-[#6f8e72]/40 bg-[#eef2e9]" : "border-[#20352a]/[0.07] bg-white"}`}><input type="radio" name="purpose" value={option.value} checked={draft.purpose === option.value} onChange={(event) => updateField("purpose", event.target.value as LetterPurpose)} className="h-4 w-4 accent-[#52705a]" /><span className="flex-1"><span className="block text-sm font-semibold text-[#20352a]">{option.label}</span><span className="mt-0.5 block text-[11px] text-[#667068]">{option.description}</span></span></label>)}</fieldset>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="mail" title="Write your letter" description="Your words are saved privately to your DiaryDock account." />
        <label className="mt-5 block"><span className="text-sm font-semibold text-[#20352a]">Letter title</span><input value={draft.title} onChange={(event) => updateField("title", event.target.value)} className={inputClass} placeholder="For example, For my children" /></label>
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Your message</span><textarea value={draft.content} onChange={(event) => updateField("content", event.target.value)} rows={12} className="mt-2 w-full rounded-[17px] border border-[#20352a]/10 bg-white px-4 py-4 font-serif text-[17px] leading-8 text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15" placeholder="Dear…" /></label>
        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-[15px] bg-[#f1f3ec] px-4 text-sm text-[#294436]"><input type="checkbox" checked={draft.status === "ready"} onChange={(event) => updateField("status", event.target.checked ? "ready" : "draft")} className="h-5 w-5 accent-[#52705a]" />I have reviewed this letter and want to mark it ready</label>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="heart" title="Envelope preview" description="Add the words someone would see before opening the letter." />
        <label className="mt-5 block"><span className="text-sm font-semibold text-[#20352a]">Envelope title</span><input value={draft.envelopeTitle} onChange={(event) => updateField("envelopeTitle", event.target.value)} className={inputClass} placeholder="A letter for you" /></label>
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Short message</span><textarea value={draft.envelopeMessage} onChange={(event) => updateField("envelopeMessage", event.target.value)} rows={3} className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none focus:border-[#6f8e72]" placeholder="Open this when…" /></label>
        {draft.id ? <Link href={`/wills/letters-of-wishes/${draft.id}/preview`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#294436]"><UiIcon name="heart" className="h-4 w-4" />View envelope preview</Link> : null}
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="star" title="Memory box" description="Add context, photos or a PDF that belongs with this letter." />
        <label className="mt-5 block"><span className="text-sm font-semibold text-[#20352a]">Memory notes</span><textarea value={draft.memoryNotes} onChange={(event) => updateField("memoryNotes", event.target.value)} rows={4} className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none focus:border-[#6f8e72]" placeholder="Stories, memories or context for this letter…" /></label>
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Add a photo or PDF</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/jpeg,image/png,image/webp,image/heic" onChange={(event) => { const file = event.target.files?.[0] ?? null; setAttachment(file); setMessage(file ? validateDocumentFile(file) ?? "" : ""); }} className="mt-2 block min-h-12 w-full rounded-[15px] border border-dashed border-[#6f8e72]/45 bg-[#f8f8f2] px-3 py-3 text-sm text-[#59655d] file:mr-3 file:rounded-full file:border-0 file:bg-[#dde6d8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#294436]" /></label>
        {draft.attachmentDocumentIds.length ? <ul className="mt-4 space-y-2">{draft.attachmentDocumentIds.map((documentId) => { const document = state.vaultDocuments.find((item) => item.id === documentId); return <li key={documentId} className="flex min-h-12 items-center gap-2 rounded-[14px] bg-[#f3f4ed] px-3"><UiIcon name="file" className="h-4 w-4 text-[#52705a]" /><span className="min-w-0 flex-1 truncate text-xs text-[#59655d]">{document?.originalFileName ?? "Secure attachment"}</span><button type="button" onClick={() => void openAttachment(documentId)} className="min-h-10 px-2 text-xs font-semibold text-[#294436]">Open</button><button type="button" onClick={() => removeAttachment(documentId)} className="min-h-10 px-2 text-xs font-semibold text-[#765f38]">Remove</button></li>; })}</ul> : null}
        <p className="mt-3 text-[11px] leading-5 text-[#758078]">Voice and video letters are intentionally unavailable until DiaryDock has an approved encrypted-media storage and playback design.</p>
      </WillCard>

      {draft.id ? <LetterSafetyNotice>Set delivery preferences after saving. No recipient receives access automatically; trusted-person access continues to be managed separately.</LetterSafetyNotice> : null}
      {message ? <p role="status" className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-[#45604d]">{message}</p> : null}
      <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"><UiIcon name={saving ? "clock" : "check"} className="h-4 w-4" />{saving ? "Saving privately…" : draft.id ? "Save a new version" : "Save letter"}</button>
      <LettersLegalNotice />
    </form>
  );
}
