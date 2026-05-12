"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import Link from "next/link";

interface Subscription {
  vendor: string;
  latestExpenseId: string;
  latestAmount: number;
  monthlyAmount: number;
  interval: string;
  lastCharged: string;
  status: string;
  count: number;
  matchingBankTxId: string | null;
  matchingBankTxAmount: number | null;
}

interface Props {
  subscriptions: Subscription[];
  totalMonthly: number;
  companyId: string;
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "Månadsvis",
  ANNUAL: "Årsvis",
  QUARTERLY: "Kvartalsvis",
  WEEKLY: "Veckovis",
};

export function PrenumerationerPage({ subscriptions, totalMonthly }: Props) {
  const [reconciled, setReconciled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  async function reconcileTx(vendor: string, expenseId: string, bankTxId: string) {
    setLoading(vendor);
    try {
      await fetch(`/api/bank/transactions/${bankTxId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId }),
      });
      await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BOOKED" }),
      });
      setReconciled((prev) => new Set(Array.from(prev).concat(vendor)));
    } finally {
      setLoading(null);
    }
  }

  const pending = subscriptions.filter((s) => !reconciled.has(s.vendor));
  const withMatch = pending.filter((s) => s.matchingBankTxId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prenumerationer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatiskt identifierade återkommande tjänster
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Totalt/månad</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tjänster</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{subscriptions.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 uppercase tracking-wide">Väntar matchning</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{withMatch.length}</p>
        </div>
      </div>

      {/* Matches waiting */}
      {withMatch.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Link2 size={14} className="text-amber-500" />
            Banktransaktioner att koppla ihop
          </h2>
          <div className="bg-white border border-amber-200 rounded-lg divide-y divide-gray-100">
            {withMatch.map((sub) => (
              <div key={sub.vendor} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{sub.vendor}</p>
                  <p className="text-xs text-gray-500">
                    Faktura: {formatCurrency(sub.latestAmount)} · Bank: {formatCurrency(Math.abs(sub.matchingBankTxAmount ?? 0))}
                  </p>
                </div>
                <button
                  onClick={() => reconcileTx(sub.vendor, sub.latestExpenseId, sub.matchingBankTxId!)}
                  disabled={loading === sub.vendor}
                  className="flex items-center gap-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  <Link2 size={12} />
                  Koppla ihop
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All subscriptions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Alla prenumerationer</h2>
        {pending.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-green-400" size={24} />
            Allt är hanterat
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pending.map((sub) => (
              <div key={sub.vendor} className="flex items-center gap-4 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700">
                    {sub.vendor.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{sub.vendor}</p>
                    {sub.status === "PENDING_REVIEW" && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle size={11} />
                        Granskas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {INTERVAL_LABEL[sub.interval] ?? sub.interval} · Senast {formatDate(new Date(sub.lastCharged))} · {sub.count} fakturor
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(sub.latestAmount)}</p>
                  {sub.interval !== "MONTHLY" && (
                    <p className="text-xs text-gray-400">≈ {formatCurrency(sub.monthlyAmount)}/mån</p>
                  )}
                </div>
                <Link
                  href={`/expenses/${sub.latestExpenseId}`}
                  className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  <RefreshCw size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
