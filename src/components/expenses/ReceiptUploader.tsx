"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface UploadState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  message?: string;
  expenseId?: string;
}

export function ReceiptUploader() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, []);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
      setUploadState({ status: "error", message: "Endast bilder (JPG, PNG) och PDF stöds" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadState({ status: "error", message: "Filen är för stor (max 10 MB)" });
      return;
    }
    setFile(f);
    setUploadState({ status: "idle" });
  };

  async function handleUpload() {
    if (!file) return;

    setUploadState({ status: "uploading", message: "Laddar upp..." });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/expenses/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { error?: string; expense?: { id: string }; message?: string };

      if (!res.ok) {
        setUploadState({ status: "error", message: data.error ?? "Uppladdning misslyckades" });
        return;
      }

      setUploadState({
        status: "done",
        message: "Kvitto uppladdat och bearbetat!",
        expenseId: data.expense?.id,
      });
    } catch {
      setUploadState({ status: "error", message: "Ett fel uppstod vid uppladdning" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <Upload size={40} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium mb-1">Dra och släpp ett kvitto här</p>
        <p className="text-sm text-gray-400 mb-4">eller</p>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          <File size={16} />
          Välj fil
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">JPG, PNG eller PDF · Max 10 MB</p>
      </div>

      {/* Selected file */}
      {file && uploadState.status !== "done" && (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <File size={20} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFile(null); setUploadState({ status: "idle" }); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {uploadState.status === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          <AlertCircle size={16} />
          {uploadState.message}
        </div>
      )}

      {uploadState.status === "done" && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} />
            {uploadState.message}
          </div>
          <button
            onClick={() => router.push(`/expenses/${uploadState.expenseId}`)}
            className="text-sm text-green-700 underline hover:no-underline"
          >
            Granska kvitto
          </button>
        </div>
      )}

      {/* Upload button */}
      {file && uploadState.status === "idle" && (
        <button
          onClick={handleUpload}
          disabled={uploadState.status !== "idle"}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Ladda upp och analysera med OCR
        </button>
      )}

      {(uploadState.status === "uploading" || uploadState.status === "processing") && (
        <div className="w-full py-2 bg-blue-100 text-blue-700 rounded-md text-center text-sm">
          <span className="animate-pulse">{uploadState.message ?? "Bearbetar..."}</span>
        </div>
      )}
    </div>
  );
}
