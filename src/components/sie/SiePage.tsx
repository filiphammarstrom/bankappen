"use client";

import { useState, useRef } from "react";
import { Upload, Download, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  companyName?: string;
  accountsCreated: number;
  accountsUpdated: number;
  openingBalancesImported: number;
  verificationsImported: number;
  transactionsImported: number;
  skipped: number;
}

export function SiePage({ companyId }: { companyId: string }) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(`/api/companies/${companyId}/sie/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok && res.headers.get("content-type")?.includes("text/html")) {
        setImportError(`Servern svarade med fel ${res.status} – filen kan vara för stor eller ta för lång tid`);
        return;
      }
      const data = await res.json() as ImportResult & { error?: string };
      if (!res.ok) {
        setImportError(data.error ?? "Import misslyckades");
      } else {
        setImportResult(data);
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setImportError("Nätverksfel – försök igen");
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    window.location.href = `/api/companies/${companyId}/sie/export`;
  }

  return (
    <div className="space-y-6">
      {/* Import */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Importera SIE-fil</h2>
        <p className="text-sm text-gray-500 mb-4">
          Importera en SIE 4-fil (t.ex. från Fortnox, Visma eller Bokio) för att ladda in
          kontoplan, ingående balanser och verifikationer.
        </p>

        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <FileText className="mx-auto mb-2 text-gray-400" size={32} />
          {selectedFile ? (
            <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Klicka för att välja SIE-fil (.se)</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".se,.si,.SIE,.SI"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {importError && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            {importError}
          </div>
        )}

        {importResult && (
          <div className="mt-3 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle size={16} />
              Import klar{importResult.companyName ? ` — ${importResult.companyName}` : ""}
            </div>
            <ul className="space-y-0.5 text-green-700">
              <li>Konton skapade: {importResult.accountsCreated}</li>
              <li>Konton uppdaterade: {importResult.accountsUpdated}</li>
              <li>Ingående balanser: {importResult.openingBalancesImported}</li>
              <li>Verifikationer: {importResult.verificationsImported}</li>
              <li>Transaktionsrader: {importResult.transactionsImported}</li>
              {importResult.skipped > 0 && <li>Hoppade över: {importResult.skipped}</li>}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} />
            {importing ? "Importerar..." : "Importera"}
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Exportera SIE 4-fil</h2>
        <p className="text-sm text-gray-500 mb-4">
          Exportera all bokföring som en SIE 4-fil att skicka till din ekonomibyrå eller
          importera i annat bokföringsprogram.
        </p>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          <Download size={16} />
          Ladda ner SIE 4
        </button>
      </div>
    </div>
  );
}
