"use client";

import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, FileText, Sparkles, Upload } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { analyseDocument, type DocumentAnalysis } from "@/lib/mock-ai";
import { uploadDocumentFile, type UploadedDocumentFile } from "@/lib/supabase/storage";

const maxClientFileSize = 12 * 1024 * 1024;
const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export default function AddPage() {
  return (
    <Suspense fallback={<AddLoading />}>
      <AddPageContent />
    </Suspense>
  );
}

function AddPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredRoomId = searchParams.get("roomId") ?? "";
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);

  const isImage = file?.type.startsWith("image/");
  const canAnalyse = Boolean(file);

  const fileLabel = useMemo(() => {
    if (!file) {
      return "No file selected";
    }

    if (file.type === "application/pdf") {
      return file.name;
    }

    return `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }, [file]);

  function handleFile(nextFile?: File) {
    if (!nextFile) {
      return;
    }

    setError("");
    setWarning("");

    if (!supportedTypes.includes(nextFile.type)) {
      setFile(null);
      setPreviewUrl("");
      setError("Unsupported file type. Please upload an image or PDF.");
      return;
    }

    if (nextFile.size > maxClientFileSize) {
      setWarning("This file is quite large. Try a smaller file under 12 MB if analysis fails.");
    }

    setFile(nextFile);
    if (nextFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setPreviewUrl("");
    }
  }

  async function analyseSelectedDocument() {
    if (!file) {
      setError("Choose a file before analysing.");
      return;
    }

    if (!supportedTypes.includes(file.type)) {
      setError("Unsupported file type. Please upload an image or PDF.");
      return;
    }

    if (file.size > maxClientFileSize) {
      setError("This file is too large. Please upload a file under 12 MB.");
      return;
    }

    setIsAnalysing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyse-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || "Analysis failed.");
      }

      const analysis = (await response.json()) as DocumentAnalysis;
      validateAnalysis(analysis);
      const documentId = createId();
      const upload = await tryUploadFile(file, documentId);
      savePendingAnalysis(file, analysis, response.headers.get("x-analysis-source") ?? "real-ai", {
        documentId,
        filePath: upload?.filePath ?? "",
        fileUrl: upload?.fileUrl ?? "",
        preferredRoomId,
      });
      router.push("/add/review");
    } catch (apiError) {
      console.warn("Document analysis fell back to mock mode", apiError);
      try {
        const fallbackAnalysis = analyseDocument(file.name);
        const documentId = createId();
        const upload = await tryUploadFile(file, documentId);
        savePendingAnalysis(file, fallbackAnalysis, "mock-fallback", {
          documentId,
          filePath: upload?.filePath ?? "",
          fileUrl: upload?.fileUrl ?? "",
          preferredRoomId,
        });
        router.push("/add/review");
      } catch {
        setError("The document could not be analysed. Please try another file.");
      }
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_36%,#e9eef8_100%)] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-zinc-950">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold text-violet-700">Simply Logged</p>
        <h1 className="text-3xl font-bold tracking-normal">Add to Simply Logged</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Capture a life admin document and let Simply Logged file it into the right room.
        </p>

        <section className="mt-6 rounded-[1.75rem] bg-white p-4 shadow-xl shadow-slate-300/40">
          <div className="grid gap-3">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-violet-600 px-4 py-6 text-white shadow-lg shadow-violet-600/25">
              <Camera className="h-8 w-8" />
              <span className="text-base font-bold">Take photo</span>
              <input
                className="sr-only"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>

            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-900">
              <Upload className="h-5 w-5 text-violet-700" />
              Upload document
              <input
                className="sr-only"
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          </div>

          <p className="mt-3 text-center text-xs font-medium text-zinc-500">
            Accepted file types: image/*, application/pdf
          </p>
        </section>

        {file ? (
          <section className="mt-4 rounded-[1.5rem] bg-white/88 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
            {isImage && previewUrl ? (
              <div className="relative h-56 overflow-hidden rounded-[1.25rem] bg-zinc-100">
                <Image
                  src={previewUrl}
                  alt="Selected document preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[1.25rem] bg-zinc-50 p-4">
                <FileText className="h-8 w-8 text-violet-700" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{file.name}</p>
                  <p className="text-xs text-zinc-500">PDF ready for analysis</p>
                </div>
              </div>
            )}

            <p className="mt-3 truncate text-sm font-semibold text-zinc-700">{fileLabel}</p>
          </section>
        ) : null}

        {warning ? (
          <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">
            {warning}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          onClick={analyseSelectedDocument}
          disabled={!canAnalyse || isAnalysing}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white shadow-xl shadow-zinc-400/30 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          <Sparkles className="h-5 w-5" />
          {isAnalysing ? "AI is reviewing your document..." : "Analyse document"}
        </button>
      </div>
      <BottomNav />
    </main>
  );
}

function AddLoading() {
  return (
    <main className="grid min-h-svh place-items-center bg-[#f5efe6] px-4 text-zinc-950">
      <p className="text-sm font-bold text-zinc-600">Opening document capture...</p>
    </main>
  );
}

async function tryUploadFile(file: File, documentId: string) {
  try {
    return await uploadDocumentFile(file, documentId);
  } catch (error) {
    console.warn("Supabase upload failed; continuing with metadata only", error);
    return null;
  }
}

function savePendingAnalysis(
  file: File,
  analysis: DocumentAnalysis,
  source: string,
  upload: UploadedDocumentFile & { preferredRoomId?: string },
) {
  window.localStorage.setItem(
    "simplyLoggedPendingAnalysis",
    JSON.stringify({
      documentId: upload.documentId,
      fileName: file.name,
      fileType: file.type,
      filePath: upload.filePath,
      fileUrl: upload.fileUrl,
      preferredRoomId: upload.preferredRoomId,
      analysedAt: new Date().toISOString(),
      source: source === "real-ai" ? "real-ai" : "mock-fallback",
      analysis,
    }),
  );
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error;
  } catch {
    return "";
  }
}

function validateAnalysis(analysis: DocumentAnalysis) {
  if (!analysis || typeof analysis.title !== "string" || typeof analysis.suggestedRoomId !== "string") {
    throw new Error("The analysis response was invalid.");
  }

  if (!Array.isArray(analysis.suggestedReminders)) {
    throw new Error("The analysis reminders were invalid.");
  }
}
