"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { useVaultDocumentActions } from "@/components/vault-workspace/useVaultDocumentActions";
import {
  defaultDraft,
  isEmailImport,
  recencyRank,
  type VaultDraft,
  type VaultFilter,
  type VaultSort,
} from "@/components/vault-workspace/vault-workspace-model";
import { remindersList, vaultCategories } from "@/lib/mock-data";

export function useVaultController(initialFilter: VaultFilter = "all") {
  const { state, repositoryMode } = useDiaryDockData();
  const searchParams = useSearchParams();
  const documents = state.vaultDocuments;
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState<VaultFilter>(initialFilter);
  const [sortBy, setSortBy] = useState<VaultSort>("newest");
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const [draft, setDraft] = useState<VaultDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [manualDestinationValues, setManualDestinationValues] = useState<Record<string, string>>({});
  const shareOptions = useMemo(() => state.householdMembers.filter((member) =>
    Boolean(member.userId) && member.lastActive !== "Now",
  ), [state.householdMembers]);
  const secureQueue = remindersList
    .filter((item) => item.roomId === "office" || item.roomId === "safe-room")
    .slice(0, 3);
  const reviewQueue = documents.filter((document) => document.reviewStatus === "needs-review");
  const emailImportQueue = reviewQueue.filter(isEmailImport);
  const sharedQueue = documents.filter((document) =>
    document.visibility && document.visibility !== "PRIVATE",
  );
  const emergencyQueue = documents.filter((document) => document.emergencyVisible);
  const filterOptions: { id: VaultFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: documents.length },
    { id: "needs-review", label: "Needs review", count: reviewQueue.length },
    { id: "shared", label: "Shared", count: sharedQueue.length },
    { id: "emergency", label: "Emergency", count: emergencyQueue.length },
    { id: "starred", label: "Starred", count: documents.filter((document) => document.starred).length },
  ];
  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter((document) => {
      const matchesCategory = selectedCategory === "all" || document.category === selectedCategory;
      const matchesFilter = selectedFilter === "all" ||
        (selectedFilter === "needs-review" && document.reviewStatus === "needs-review") ||
        (selectedFilter === "shared" && Boolean(document.visibility && document.visibility !== "PRIVATE")) ||
        (selectedFilter === "emergency" && Boolean(document.emergencyVisible)) ||
        (selectedFilter === "starred" && Boolean(document.starred));
      const haystack = [document.title, document.category, document.kind, document.roomName,
        document.issuer, document.dueDate, document.extractionSummary, document.extractedText]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesCategory && matchesFilter && haystack.includes(query.trim().toLowerCase());
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "category") return `${a.category}${a.title}`.localeCompare(`${b.category}${b.title}`);
      if (sortBy === "due-date") return (a.dueDate || "zzzz").localeCompare(b.dueDate || "zzzz");
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return recencyRank(a) - recencyRank(b);
    });
  }, [documents, query, selectedCategory, selectedFilter, sortBy]);
  const selectedDocument = filteredDocuments.find((document) => document.id === selectedId)
    ?? filteredDocuments[0]
    ?? null;
  const categoryCounts = useMemo(() => vaultCategories.map((category) => ({
    ...category,
    count: documents.filter((document) => document.category === category.name).length,
  })), [documents]);

  useEffect(() => {
    const filter = searchParams.get("filter");
    if (["needs-review", "shared", "emergency", "starred"].includes(filter ?? "")) {
      setSelectedFilter(filter as VaultFilter);
    }
  }, [searchParams]);

  const actions = useVaultDocumentActions({
    draft, setDraft, editingId, setEditingId, setOpen, setSelectedId,
    setFileMessage, setOpeningFileId, setBusyDocumentId,
    setManualDestinationValues, selectedDocument,
  });
  return {
    repositoryMode, documents, query, setQuery, selectedCategory, setSelectedCategory,
    selectedFilter, setSelectedFilter, sortBy, setSortBy, selectedId, setSelectedId,
    draft, setDraft, editingId, open, fileMessage, setFileMessage, openingFileId,
    busyDocumentId, manualDestinationValues, setManualDestinationValues,
    shareOptions, secureQueue, reviewQueue, emailImportQueue, filterOptions,
    filteredDocuments, selectedDocument, categoryCounts,
    reviewInboxMode: selectedFilter === "needs-review", ...actions,
  };
}

export type VaultController = ReturnType<typeof useVaultController>;
