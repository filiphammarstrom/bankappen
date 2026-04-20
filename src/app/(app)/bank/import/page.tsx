export const dynamic = "force-dynamic";

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, File, X, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; imported: number; skipped: number }
  | { status: "error"; message: string };

export default function BankImportPage() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv") && f.type !== "text/csv" && f.type !== "text/plain") {
      setState({ status: "error", message: "Endast CSV-filer stöds" });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setState({ status: "error", message: "Filen är för stor (max 5 MB)" });
      return;
    }
    setFile(f);
    setState({ status: "idle" });
  }, []);

  async function handleUpload() {
    if (!file) return;
    setState({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/bank/import", { method: "POST", body: formData });
      const data = await res.json() as { error?: string; imported?: number; skipped?: number };

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Import misslyckades" });
        return;
      }
      setState({ status: "done", imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
    } catch {
      setState({ status: "error", message: "Nätverksfel – försök igen" });
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bank" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importera bankutdrag</h1>
          <p className="text-gray-500">Ladda upp en CSV-fil från din bank</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
        <p className="font-medium">Hur du exporterar bankutdrag:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li><strong>SEB:</strong> Internetbanken → Konton → Exportera → CSV</li>
          <li><strong>Swedbank:</strong> Internetbanken → Kontohändelser → Exportera → CSV</li>
          <li><strong>Handelsbanken:</strong> Kontoutdrag → Ladda ner → Excel/CSV</li>
          <li><strong>Nordea:</strong> Transaktioner → Exportera → CSV</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Filen måste innehålla kolumner för datum, beskrivning och belopp. Appen känner automatiskt igen
          vanliga svenska kolumnnamn (Datum, Belopp, Text, Beskrivning m.fl.).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <Upload size={36} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium mb-1">Dra och släpp CSV-fil här</p>
        <p className="text-sm text-gray-400 mb-4">eller</p>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          <File size={16} />
          Välj fil
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">CSV · Max 5 MB</p>
      </div>

      {/* Selected file */}
      {file && state.status === "idle" && (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <File size={18} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button onClick={() => { setFile(null); setState({ status: "idle" }); }} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Status */}
      {state.status === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          <AlertCircle size={16} />
          {state.message}
        </div>
      )}

      {state.status === "done" && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg">
          <div className="flex items-center gap-2 font-medium mb-1">
            <CheckCircle size={16} />
            Import klar!
          </div>
          <p className="text-sm">
            {state.imported} transaktioner importerade{state.skipped > 0 ? `, ${state.skipped} dubbletter hoppades över` : ""}.
          </p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => router.push("/bank/reconcile")}
              className="text-sm bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-800"
            >
              Stäm av transaktioner
            </button>
            <button
              onClick={() => { setFile(null); setState({ status: "idle" }); }}
              className="text-sm text-green-700 underline"
            >
              Importera fler
            </button>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && state.status === "idle" && (
        <button
          onClick={handleUpload}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
        >
          Importera transaktioner
        </button>
      )}

      {state.status === "uploading" && (
        <div className="w-full py-2 bg-blue-100 text-blue-700 rounded-md text-center text-sm animate-pulse">
          Importerar...
        </div>
      )}
    </div>
  );
}
