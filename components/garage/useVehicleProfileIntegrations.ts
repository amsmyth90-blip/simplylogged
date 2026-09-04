"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  audit,
  daysUntil,
  formatDate,
  imageSize,
  type DialogKind,
  type ReminderDraft,
} from "@/components/garage/vehicle-profile-model";
import { uploadPrivateDocument } from "@/lib/document-storage";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

type SetMessage = (message: string) => void;
type SetDialog = (dialog: DialogKind) => void;

export function useVehicleProfileIntegrations({
  vehicleId,
  vehicleName,
  setMessage,
  setDialog,
}: {
  vehicleId: string;
  vehicleName: string;
  setMessage: SetMessage;
  setDialog: SetDialog;
}) {
  const { repositoryMode, updateState } = useDiaryDockData();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft>({ title: "", date: "", note: "" });

  const saveReminder = async (event: FormEvent) => {
    event.preventDefault();
    if (!reminderDraft.title.trim() || !reminderDraft.date) {
      setMessage("Add a reminder title and date.");
      return;
    }
    const due = daysUntil(reminderDraft.date);
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: reminderDraft.title.trim(),
      note: reminderDraft.note.trim() || undefined,
      roomId: "garage",
      roomName: "Garage",
      group: due !== null && due <= 0 ? "today" : due !== null && due <= 7 ? "week" : "later",
      timeLabel: formatDate(reminderDraft.date),
      dueDate: reminderDraft.date,
      priority: due !== null && due <= 7 ? "high" : "normal",
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    if (repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((vehicle) => vehicle.id === vehicleId
          ? { ...vehicle, audit: [audit(`Reminder added: ${reminder.title}`), ...vehicle.audit] }
          : vehicle),
      },
    }));
    setReminderDraft({ title: "", date: "", note: "" });
    setDialog(null);
    setMessage("");
  };

  const addPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose a JPEG, PNG, WebP or HEIC image.");
      return;
    }
    setUploadingPhoto(true);
    setMessage("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${vehicleName} photo`,
        category: "Vehicles & Transport",
        kind: "Image",
        size: imageSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "garage",
        roomName: "Garage",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments.filter((item) => item.id !== id)],
        vehicles: {
          vehicles: current.vehicles.vehicles.map((vehicle) => vehicle.id === vehicleId
            ? {
                ...vehicle,
                primaryPhotoDocumentId: id,
                documentIds: [id, ...vehicle.documentIds.filter((documentId) => documentId !== id)],
                audit: [audit("Primary vehicle photo updated"), ...vehicle.audit],
                updatedAt: new Date().toISOString(),
              }
            : vehicle),
        },
      }));
      if (repositoryMode === "supabase") await upsertStructuredDocument(document);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to add this photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  return { uploadingPhoto, reminderDraft, setReminderDraft, saveReminder, addPhoto };
}
