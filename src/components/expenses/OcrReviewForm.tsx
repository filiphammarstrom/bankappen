"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BAS_ACCOUNTS } from "@/lib/accounting/bas-accounts";
import type { ExpenseWithSupplier } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";

interface OcrReviewFormProps {
  expense: ExpenseWithSupplier;
}

export function OcrReviewForm({ expense }: OcrReviewFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [supplierName, setSupplierName] = useState(expense.supplierName ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(expense.invoiceNumber ?? "");
  const [issueDate, setIssueDate] = useState(
    expense.issueDate ? new Date(expense.issueDate).toISOString().split("T")[0] : ""
  );
  const [totalSek, setTotalSek] = useState(expense.totalSek?.toString() ?? "");
  const [vatAmountSek, setVatAmountSek] = useState(expense.vatAmountSek?.toString() ?? "");
  const [accountNumber, setAccountNumber] = useState(expense.accountNumber?.toString() ?? "4010");
  const [description, setDescription] = useState(expense.description ?? "");

  const expenseAccounts = BAS_ACCOUNTS.filter((a) => a.type === "EXPENSE");

  async function handleApprove() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          invoiceNumber,
          issueDate: issueDate || undefined,
          totalSek: parseFloat(totalSek) || undefined,
          vatAmountSek: parseFloat(vatAmountSek) || undefined,
          subtotalSek: totalSek && vatAmountSek
            ? (parseFloat(totalSek) - parseFloat(vatAmountSek)).toFixed(2)
            : undefined,
          accountNumber: parseInt(accountNumber) || 4010,
          description,
          status: "APPROVED",
        }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kunde inte spara");
        return;
      }

      router.refresh();
    } catch {
      setError("Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          invoiceNumber,
          issueDate: issueDate || undefined,
          totalSek: parseFloat(totalSek) || undefined,
          vatAmountSek: parseFloat(vatAmountSek) || undefined,
          subtotalSek: totalSek && vatAmountSek
            ? (parseFloat(totalSek) - parseFloat(vatAmountSek)).toFixed(2)
            : undefined,
          accountNumber: parseInt(accountNumber) || 4010,
          description,
          status: "BOOKED",
          createJournalEntry: true,
        }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kunde inte bokföra");
        return;
      }

      router.push("/expenses");
    } catch {
      setError("Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {expense.ocrData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">OCR-tolkade uppgifter</p>
          <p className="text-xs text-blue-600">
            Granska och korrigera nedanstående uppgifter innan bokföring.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Leverantör</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fakturanummer</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fakturadatum</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Totalt belopp (inkl. moms)</label>
          <div className="mt-1 relative">
            <input
              type="number"
              step="0.01"
              value={totalSek}
              onChange={(e) => setTotalSek(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-3 top-2 text-gray-400 text-sm">kr</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Momsbelopp</label>
          <div className="mt-1 relative">
            <input
              type="number"
              step="0.01"
              value={vatAmountSek}
              onChange={(e) => setVatAmountSek(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-3 top-2 text-gray-400 text-sm">kr</span>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Konto</label>
          <select
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {expenseAccounts.map((acc) => (
              <option key={acc.accountNumber} value={acc.accountNumber}>
                {acc.accountNumber} – {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Beskriv utgiften..."
          />
        </div>
      </div>

      {/* Summary */}
      {totalSek && vatAmountSek && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Netto (exkl. moms)</span>
            <span>{formatCurrency(parseFloat(totalSek) - parseFloat(vatAmountSek))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Moms</span>
            <span>{formatCurrency(parseFloat(vatAmountSek))}</span>
          </div>
          <div className="flex justify-between font-medium mt-1 pt-1 border-t border-gray-200">
            <span>Totalt</span>
            <span>{formatCurrency(parseFloat(totalSek))}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={loading || expense.status === "BOOKED"}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
        >
          Spara
        </button>
        <button
          onClick={handleBook}
          disabled={loading || expense.status === "BOOKED"}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {expense.status === "BOOKED" ? "Redan bokförd" : "Bokför"}
        </button>
      </div>
    </div>
  );
}
