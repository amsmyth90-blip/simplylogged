"use client";

import { useState, type ChangeEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { uploadPrivateDocument } from "@/lib/document-storage";
import type { HomeInventoryItem } from "@/lib/insurance-records";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize } from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";

import { createHomeInventoryDraft } from "./home-inventory-model";
import { useHomePolicy } from "./home-insurance-shared";

export function useHomeInventoryController(highValueOnly: boolean) {
  const { state, updateState } = useDiaryDockData();
  const policy = useHomePolicy();
  const [showForm, setShowForm] = useState(false);
  const [room, setRoom] = useState("All");
  const [category, setCategory] = useState("All");
  const [working, setWorking] = useState("");
  const [draft, setDraft] = useState(createHomeInventoryDraft);
  const allItems = policy
    ? state.insurance.homeInventory.filter(item => item.policyId === policy.id)
    : [];
  const categories = Array.from(new Set(allItems.map(item => item.category))).sort();
  const items = allItems
    .filter(item => !highValueOnly || item.highValue)
    .filter(item => room === "All" || item.room === room)
    .filter(item => category === "All" || item.category === category);
  const total = items.reduce((sum, item) => sum + item.estimatedValue * item.quantity, 0);

  const save = () => {
    if (!policy || !draft.name.trim()) return;
    const now = new Date().toISOString();
    const item: HomeInventoryItem = {
      id: crypto.randomUUID(),
      policyId: policy.id,
      ...draft,
      photoDocumentIds: [],
      createdAt: now,
      updatedAt: now
    };
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        homeInventory: [item, ...current.insurance.homeInventory]
      }
    }));
    setDraft(createHomeInventoryDraft());
    setShowForm(false);
  };

  const upload = async (item: HomeInventoryItem, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(item.id);
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${item.name} — ${file.name}`,
        category: "Home Inventory",
        kind: documentKind(file),
        size: formatFileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString()
      };
      updateState(current => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments],
        insurance: {
          ...current.insurance,
          homeInventory: current.insurance.homeInventory.map(entry =>
            entry.id === item.id
              ? {
                  ...entry,
                  photoDocumentIds: [id, ...entry.photoDocumentIds],
                  updatedAt: new Date().toISOString()
                }
              : entry
          )
        }
      }));
      await upsertStructuredDocument(document);
    } finally {
      setWorking("");
    }
  };

  return {
    policy,
    showForm,
    setShowForm,
    room,
    setRoom,
    category,
    setCategory,
    working,
    draft,
    setDraft,
    categories,
    items,
    total,
    save,
    upload
  };
}

export type HomeInventoryController = ReturnType<typeof useHomeInventoryController>;
