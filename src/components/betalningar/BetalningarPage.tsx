"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface OutgoingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalSek: number;
  paidAmountSek: number;
  dueDate: string;
  status: string;
  overdue: boolean;
}

interface IncomingExpense {
  id: string;
  supplierName: string;
  totalSek: number;
  dueDate: string | null;
  invoiceNumber: string | null;
  overdue: boolean;
}

interface Props {
  outgoing: OutgoingInvoice[];
  incoming: IncomingExpense[];
}

export function BetalningarPage({ outgoing, incoming }: Props) {
  const [paidOutgoing, setPaidOutgoing] = useState<Set<string>>(new Set());
  const [paidIncoming, setPaidIncoming] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  async function markInvoicePaid(invoiceId: string, totalSek: number) {
    setLoading(invoiceId);
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: totalSek,
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: "BANK_TRANSFER",
        }),
      });
      setPaidOutgoing((prev) => new Set(Array.from(prev).concat(invoiceId)));
    } finally {
      setLoading(null);
    }
  }

  async function markExpensePaid(expenseId: string) {
    setLoading(expenseId);
    try {
      await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markPaid: true,
          paymentDate: new Date().toISOString().slice(0, 10),
        }),
      });
      setPaidIncoming((prev) => new Set(Array.from(prev).concat(expenseId)));
    } finally {
      setLoading(null);
    }
  }

  const pendingOutgoing = outgoing.filter((i) => !paidOutgoing.has(i.id));
  const pendingIncoming = incoming.filter((e) => !paidIncoming.has(e.id));

  const totalToReceive = pendingOutgoing.reduce((s, i) => s + (i.totalSek - i.paidAmountSek), 0);
  const totalToPay = pendingIncoming.reduce((s, e) => s + e.totalSek, 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Betalningar</h1>
        <p className="text-sm text-gray-500 mt-1">Månatlig översikt över vad som ska betalas och inkasseras</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
          <TrendingUp className="text-green-600 flex-shrink-0" size={28} />
          <div>
            <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Att inkassera</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalToReceive)}</p>
            <p className="text-xs text-green-600">{pendingOutgoing.length} fakturor</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
          <TrendingDown className="text-red-600 flex-shrink-0" size={28} />
          <div>
            <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Att betala</p>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(totalToPay)}</p>
            <p className="text-xs text-red-600">{pendingIncoming.length} leverantörsfakturor</p>
          </div>
        </div>
      </div>

      {/* Outgoing invoices */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" />
          Kundfakturor — väntar på betalning
        </h2>
        {pendingOutgoing.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-6 text-center">
            Inga utestående kundfakturor
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pendingOutgoing.map((inv) => {
              const remaining = inv.totalSek - inv.paidAmountSek;
              const isLoading = loading === inv.id;
              return (
                <div key={inv.id} className="flex items-center gap-4 px-4 py-3">
                  <button
                    onClick={() => markInvoicePaid(inv.id, remaining)}
                    disabled={isLoading}
                    className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors disabled:opacity-40"
                    title="Markera som betald"
                  >
                    {isLoading ? (
                      <Circle size={22} className="animate-pulse" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{inv.customerName}</span>
                      {inv.overdue && (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertCircle size={12} />
                          Förfallen
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </span>
                      <span className="text-xs text-gray-400">Förfaller {formatDate(new Date(inv.dueDate))}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(remaining)}</p>
                    {inv.paidAmountSek > 0 && (
                      <p className="text-xs text-gray-400">av {formatCurrency(inv.totalSek)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Incoming expenses */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingDown size={16} className="text-red-600" />
          Leverantörsfakturor — ska betalas
        </h2>
        {pendingIncoming.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-6 text-center">
            Inga obetalta leverantörsfakturor
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pendingIncoming.map((exp) => {
              const isLoading = loading === exp.id;
              return (
                <div key={exp.id} className="flex items-center gap-4 px-4 py-3">
                  <button
                    onClick={() => markExpensePaid(exp.id)}
                    disabled={isLoading}
                    className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors disabled:opacity-40"
                    title="Markera som betald"
                  >
                    {isLoading ? (
                      <Circle size={22} className="animate-pulse" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{exp.supplierName}</span>
                      {exp.overdue && (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertCircle size={12} />
                          Förfallen
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {exp.invoiceNumber && (
                        <span className="text-xs text-gray-500">{exp.invoiceNumber}</span>
                      )}
                      {exp.dueDate && (
                        <span className="text-xs text-gray-400">Förfaller {formatDate(new Date(exp.dueDate))}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(exp.totalSek)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Done state */}
      {paidOutgoing.size + paidIncoming.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-sm text-green-800">
            {paidOutgoing.size + paidIncoming.size} poster markerade som betalda — ladda om sidan för att uppdatera listan.
          </p>
        </div>
      )}
    </div>
  );
}
