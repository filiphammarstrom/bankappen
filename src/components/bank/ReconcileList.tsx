"use client";

import { useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface TxRow {
  id: string;
  transactionDate: string;
  description: string;
  merchantName: string | null;
  amount: number;
  reconciled: boolean;
  accountName: string;
}

interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalSek: number;
}

interface OpenExpense {
  id: string;
  supplierName: string;
  totalSek: number;
  invoiceNumber: string | null;
}

interface Props {
  transactions: TxRow[];
  openInvoices: OpenInvoice[];
  openExpenses: OpenExpense[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(amount);
}

export function ReconcileList({ transactions: initial, openInvoices, openExpenses }: Props) {
  const [rows, setRows] = useState(initial);
  const [modalTx, setModalTx] = useState<TxRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function reconcile(txId: string, invoiceId?: string, expenseId?: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/bank/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciled: true, invoiceId: invoiceId ?? null, expenseId: expenseId ?? null }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Fel vid avstämning");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== txId));
      setModalTx(null);
    } catch {
      setError("Nätverksfel");
    } finally {
      setSaving(false);
    }
  }

  async function markNoMatch(txId: string) {
    await reconcile(txId);
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivning</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Belopp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{formatDate(tx.transactionDate)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{tx.merchantName ?? tx.description}</p>
                  {tx.merchantName && <p className="text-xs text-gray-400">{tx.description}</p>}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(tx.amount)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{tx.accountName}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setModalTx(tx)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Matcha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match modal */}
      {modalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">Matcha transaktion</h2>
                <p className="text-sm text-gray-500">
                  {formatDate(modalTx.transactionDate)} · {formatCurrency(modalTx.amount)} · {modalTx.merchantName ?? modalTx.description}
                </p>
              </div>
              <button onClick={() => setModalTx(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Invoices */}
              {openInvoices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Öppna kundfakturor</p>
                  <div className="space-y-1">
                    {openInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => reconcile(modalTx.id, inv.id, undefined)}
                        disabled={saving}
                        className="w-full text-left flex justify-between items-center px-3 py-2 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-sm disabled:opacity-50"
                      >
                        <span>
                          <span className="font-medium">{inv.invoiceNumber}</span>
                          <span className="text-gray-500 ml-2">{inv.customerName}</span>
                        </span>
                        <span className="font-medium text-green-600">{formatCurrency(inv.totalSek)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {openExpenses.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Bokförda leverantörsfakturor</p>
                  <div className="space-y-1">
                    {openExpenses.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => reconcile(modalTx.id, undefined, exp.id)}
                        disabled={saving}
                        className="w-full text-left flex justify-between items-center px-3 py-2 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-sm disabled:opacity-50"
                      >
                        <span>
                          <span className="font-medium">{exp.supplierName}</span>
                          {exp.invoiceNumber && (
                            <span className="text-gray-500 ml-2">#{exp.invoiceNumber}</span>
                          )}
                        </span>
                        <span className="font-medium text-red-600">{formatCurrency(exp.totalSek)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {openInvoices.length === 0 && openExpenses.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Inga öppna fakturor eller bokförda utgifter att matcha mot.
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-between">
              <button
                onClick={() => markNoMatch(modalTx.id)}
                disabled={saving}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Ingen matchning – stäm av ändå
              </button>
              <button
                onClick={() => setModalTx(null)}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
