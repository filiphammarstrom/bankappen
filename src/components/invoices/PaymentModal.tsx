"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface PaymentModalProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    totalSek: number;
    paidAmountSek: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Banköverföring" },
  { value: "BANKGIRO", label: "Bankgiro" },
  { value: "SWISH", label: "Swish" },
  { value: "CARD", label: "Kort" },
  { value: "OTHER", label: "Annat" },
];

export function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const remaining = invoice.totalSek - invoice.paidAmountSek;
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(today);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Ange ett giltigt belopp");
      return;
    }
    if (!paymentDate) {
      setError("Ange betalningsdatum");
      return;
    }

    setLoading(true);
    try {
      const isFullPayment = parsedAmount >= remaining - 0.01;
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markPaid: true,
          status: isFullPayment ? "PAID" : "PARTIALLY_PAID",
          paymentAmount: parsedAmount,
          paymentDate,
          paymentMethod: method,
          paymentReference: reference.trim() || undefined,
        }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kunde inte registrera betalning");
        return;
      }
      onSuccess();
    } catch {
      setError("Nätverksfel – försök igen");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Registrera betalning — {invoice.invoiceNumber}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {remaining < invoice.totalSek && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              Redan betalt: {invoice.paidAmountSek.toFixed(2)} kr — återstår {remaining.toFixed(2)} kr
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Belopp (kr)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Betalningsdatum</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Betalningssätt</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Referens <span className="text-gray-400">(valfritt)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bankref, OCR-nr..."
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Sparar..." : "Registrera betalning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
