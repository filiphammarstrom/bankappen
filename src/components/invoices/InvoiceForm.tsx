"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { VatRateSelect } from "@/components/shared/VatRateSelect";
import { DatePicker } from "@/components/shared/DatePicker";
import { calculateLineItem, formatSEK } from "@/lib/accounting/vat-calculator";
import { format, addDays } from "date-fns";

interface Customer {
  id: string;
  name: string;
  vatNumber?: string | null;
  paymentTermDays: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: number;
  unit: string;
  accountNumber: string;
}

function newLine(): LineItem {
  return {
    id: Math.random().toString(36).substr(2, 9),
    description: "",
    quantity: "1",
    unitPrice: "",
    vatRate: 25,
    unit: "st",
    accountNumber: "3001",
  };
}

export function InvoiceForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [ourReference, setOurReference] = useState("");
  const [yourReference, setYourReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  // Auto-update due date when customer changes
  useEffect(() => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setDueDate(format(addDays(new Date(issueDate), customer.paymentTermDays), "yyyy-MM-dd"));
    }
  }, [customerId, issueDate, customers]);

  function addLine() {
    setLines([...lines, newLine()]);
  }

  function removeLine(id: string) {
    setLines(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  // Calculate totals
  const lineTotals = lines.map((line) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    return calculateLineItem(qty, price, line.vatRate);
  });

  const subtotal = lineTotals.reduce((s, l) => s + l.subtotal, 0);
  const vatTotal = lineTotals.reduce((s, l) => s + l.vatAmount, 0);
  const total = lineTotals.reduce((s, l) => s + l.lineTotal, 0);

  async function handleSubmit(e: React.FormEvent, sendNow = false) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        customerId,
        issueDate,
        dueDate,
        ourReference,
        yourReference,
        notes,
        lines: lines.map((line, idx) => ({
          description: line.description,
          quantity: parseFloat(line.quantity) || 0,
          unitPrice: parseFloat(line.unitPrice) || 0,
          vatRate: line.vatRate,
          unit: line.unit,
          accountNumber: parseInt(line.accountNumber) || 3001,
          sortOrder: idx,
        })),
        sendNow,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { error?: string; invoice?: { id: string } };

      if (!res.ok) {
        setError(data.error ?? "Kunde inte spara faktura");
        return;
      }

      router.push(`/invoices/${data.invoice?.id}`);
    } catch {
      setError("Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Fakturainformation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Kund *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Välj kund...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fakturadatum</label>
            <DatePicker value={issueDate} onChange={setIssueDate} className="mt-1" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Förfallodatum</label>
            <DatePicker value={dueDate} onChange={setDueDate} className="mt-1" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Vår referens</label>
            <input
              type="text"
              value={ourReference}
              onChange={(e) => setOurReference(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="T.ex. ditt namn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Er referens</label>
            <input
              type="text"
              value={yourReference}
              onChange={(e) => setYourReference(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kundens referens/PO"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Fakturarader</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left font-medium text-gray-600 pr-2 min-w-[200px]">Beskrivning</th>
                <th className="pb-2 text-right font-medium text-gray-600 w-20">Antal</th>
                <th className="pb-2 text-center font-medium text-gray-600 w-16">Enhet</th>
                <th className="pb-2 text-right font-medium text-gray-600 w-28">Á-pris (exkl.)</th>
                <th className="pb-2 text-left font-medium text-gray-600 w-36 pl-2">Moms</th>
                <th className="pb-2 text-right font-medium text-gray-600 w-28">Totalt</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, idx) => {
                const { lineTotal } = lineTotals[idx] ?? { lineTotal: 0 };
                return (
                  <tr key={line.id} className="group">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        required
                        placeholder="Beskrivning av tjänst/vara"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                        step="0.001"
                        min="0"
                        required
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-right focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-center focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="st"
                      />
                    </td>
                    <td className="py-2">
                      <CurrencyInput
                        value={line.unitPrice}
                        onChange={(v) => updateLine(line.id, "unitPrice", v)}
                        placeholder="0,00"
                      />
                    </td>
                    <td className="py-2 pl-2">
                      <VatRateSelect
                        value={line.vatRate}
                        onChange={(r) => updateLine(line.id, "vatRate", r)}
                      />
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatSEK(lineTotal)}
                    </td>
                    <td className="py-2 pl-1">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus size={16} />
          Lägg till rad
        </button>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <div className="space-y-1 text-sm w-64">
            <div className="flex justify-between">
              <span className="text-gray-500">Netto (exkl. moms)</span>
              <span className="font-medium">{formatSEK(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Moms</span>
              <span className="font-medium">{formatSEK(vatTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-300 text-base font-bold">
              <span>Att betala</span>
              <span className="text-blue-700">{formatSEK(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande / Notering</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Eventuellt meddelande till kunden..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Sparar..." : "Spara utkast"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Sparar..." : "Spara och skicka"}
        </button>
      </div>
    </form>
  );
}
