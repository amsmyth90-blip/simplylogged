"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { prepareShareImport } from "@/components/share-import/prepare-share-import";
import { formatImportBytes, sharedFileToFile, shareImportRoomOptions, titleFromSharedName, type ImportFile } from "@/components/share-import/share-import-model";
import { validateDocumentFile } from "@/lib/document-storage";
import { roomDetails, vaultCategories, type RoomDetail } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";

export function ShareImportWorkspace() {
  const { repositoryMode, updateState } = useDiaryDockData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFiles, setImportFiles] = useState<ImportFile[]>([]);
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState("mailbox");
  const [category, setCategory] = useState("Home & Property");
  const [loadingNative, setLoadingNative] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const selectedRoom = (roomDetails as Record<string, RoomDetail>)[roomId] ?? roomDetails.mailbox ?? roomDetails.office;
  const firstFile = importFiles[0]?.file ?? null;
  const categoryOptions = useMemo(() => vaultCategories.map((item) => item.name), []);

  useEffect(() => {
    let cancelled = false;

    async function loadNativeImport() {
      const plugin = window.Capacitor?.Plugins?.DiaryDockShareImport;

      if (!plugin?.getPendingImport) {
        setLoadingNative(false);
        return;
      }

      try {
        const payload = await plugin.getPendingImport();
        const files = (payload.files ?? [])
          .map((sharedFile) => ({
            id: sharedFile.id,
            file: sharedFileToFile(sharedFile)
          }))
          .filter((item) => !validateDocumentFile(item.file));

        if (!cancelled && files.length) {
          setImportFiles(files);
          setTitle(titleFromSharedName(files[0].file.name));
        }
      } catch {
        if (!cancelled) {
          setMessage("DiaryDock could not read the shared file. Try sharing it again, or choose it manually below.");
        }
      } finally {
        if (!cancelled) {
          setLoadingNative(false);
        }
      }
    }

    void loadNativeImport();

    return () => {
      cancelled = true;
    };
  }, []);

  const chooseFiles = (files: FileList | null) => {
    const nextFiles = Array.from(files ?? []).slice(0, 12);
    const firstError = nextFiles.map(validateDocumentFile).find(Boolean);

    if (firstError) {
      setMessage(firstError);
      return;
    }

    const mapped = nextFiles.map((file) => ({ id: crypto.randomUUID(), file }));
    setImportFiles(mapped);
    setSavedIds([]);
    setMessage(null);

    if (mapped[0]) {
      setTitle(titleFromSharedName(mapped[0].file.name));
    }
  };

  const saveImport = async () => {
    if (!importFiles.length || saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const { documents, mailboxItems, roomActivity, roomDocuments } = await prepareShareImport({
        category,
        files: importFiles,
        repositoryMode,
        room: selectedRoom,
        title
      });

      updateState((current) => ({
        ...current,
        vaultDocuments: [...documents, ...current.vaultDocuments],
        roomDocuments: {
          ...current.roomDocuments,
          [selectedRoom.id]: [...roomDocuments, ...(current.roomDocuments[selectedRoom.id] ?? [])]
        },
        roomActivity: {
          ...current.roomActivity,
          [selectedRoom.id]: [...roomActivity, ...(current.roomActivity[selectedRoom.id] ?? [])]
        },
        mailboxItems: [...mailboxItems, ...current.mailboxItems]
      }));

      if (repositoryMode === "supabase") {
        await Promise.all(documents.map((document) => upsertStructuredDocument(document)));
      }

      await window.Capacitor?.Plugins?.DiaryDockShareImport?.clearPendingImport?.();
      setSavedIds(documents.map((document) => document.id));
      setMessage(`${documents.length} file${documents.length === 1 ? "" : "s"} saved to DiaryDock for review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DiaryDock could not save this shared file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-2xl flex-col gap-5 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-2">
      <header className="rounded-[34px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-6 shadow-[0_18px_45px_rgba(32,53,42,0.10)]">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/files"
            aria-label="Back to All Files"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/[0.10] bg-white text-[#20352a] transition hover:bg-[#f5f4ed] focus:outline-none focus:ring-2 focus:ring-[#6f8e72]"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <span className="rounded-full bg-[#dde6d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#45604d]">
            Import
          </span>
        </div>
        <div className="mt-7">
          <p className="text-sm font-semibold text-[#6f8e72]">Share to DiaryDock</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[#20352a]">Review your shared file</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#667068]">
            Save PDFs, photos and email attachments into your private DiaryDock files. Check where it belongs before it is filed.
          </p>
        </div>
      </header>

      <section className="rounded-[28px] border border-[#20352a]/[0.08] bg-white p-5 shadow-[0_14px_34px_rgba(32,53,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#20352a]">Files waiting</h2>
            <p className="mt-1 text-xs leading-5 text-[#667068]">
              {loadingNative ? "Checking your phone share sheet…" : "Choose where these should live in DiaryDock."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 rounded-full border border-[#6f8e72]/30 bg-[#f5f4ed] px-4 text-sm font-semibold text-[#20352a] transition hover:bg-[#dde6d8] focus:outline-none focus:ring-2 focus:ring-[#6f8e72]"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            onChange={(event) => chooseFiles(event.target.files)}
          />
        </div>

        <div className="mt-4 space-y-3">
          {importFiles.length ? (
            importFiles.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-[#20352a]/[0.06] bg-[#f7f6ef] p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dde6d8] text-[#45604d]">
                  <UiIcon name={item.file.type === "application/pdf" ? "file" : "camera"} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#20352a]">{item.file.name}</p>
                  <p className="mt-0.5 text-xs text-[#667068]">{formatImportBytes(item.file.size)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#20352a]/20 bg-[#f7f6ef] p-5 text-center">
              <UiIcon name="share" className="mx-auto h-7 w-7 text-[#6f8e72]" />
              <p className="mt-3 text-sm font-semibold text-[#20352a]">No shared file is waiting</p>
              <p className="mt-1 text-xs leading-5 text-[#667068]">
                Share a PDF or image from your phone, or choose one here while testing.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#20352a]/[0.08] bg-white p-5 shadow-[0_14px_34px_rgba(32,53,42,0.08)]">
        <h2 className="text-base font-semibold text-[#20352a]">File details</h2>
        <div className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667068]">Name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={firstFile ? titleFromSharedName(firstFile.name) : "Shared document"}
              className="min-h-12 w-full rounded-2xl border border-[#20352a]/[0.10] bg-[#fffdf8] px-4 text-sm font-semibold text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667068]">Room</span>
              <select
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[#20352a]/[0.10] bg-[#fffdf8] px-4 text-sm font-semibold text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
              >
                {shareImportRoomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667068]">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[#20352a]/[0.10] bg-[#fffdf8] px-4 text-sm font-semibold text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="rounded-[18px] bg-[#f0f2e9] px-4 py-3 text-xs leading-5 text-[#52705a]">
            DiaryDock will store this privately and mark it for review so you can check important details later.
          </p>

          {message ? (
            <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#fffdf8] px-4 py-3 text-sm text-[#20352a]">
              {message}
            </p>
          ) : null}

          {savedIds.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/files"
                className="flex min-h-12 items-center justify-center rounded-2xl bg-[#20352a] px-4 text-sm font-semibold text-white transition hover:bg-[#20352a]/90"
              >
                Open All Files
              </Link>
              <Link
                href={`/room/${selectedRoom.id}`}
                className="flex min-h-12 items-center justify-center rounded-2xl border border-[#20352a]/15 bg-white px-4 text-sm font-semibold text-[#20352a] transition hover:bg-[#f5f4ed]"
              >
                Open {selectedRoom.name}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void saveImport()}
              disabled={!importFiles.length || saving}
              className="min-h-12 w-full rounded-2xl bg-[#20352a] px-4 text-sm font-semibold text-white shadow-[0_14px_25px_rgba(32,53,42,0.18)] transition hover:bg-[#20352a]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving to DiaryDock…" : "Save to DiaryDock"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
