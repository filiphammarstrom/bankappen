"use client";

import { useState } from "react";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import type { BankTransactionRow } from "@/types/bank";
import { CheckCircle } from "lucide-react";

interface ReconcileRowProps {
  transaction: BankTransactionRow;
  onReconcile?: (transactionId: string) => void;
}

export function ReconcileRow({ transaction, onReconcile }: ReconcileRowProps) {
  const [reconciling, setReconciling] = useState(false);

  async function handleReconcile() {
    setReconciling(true);
    try {
      // In a real implementation, this would match the transaction to an invoice/expense
      await new Promise((r) => setTimeout(r, 500));
      onReconcile?.(transaction.id);
    } finally {
      setReconciling(false);
    }
  }

  const amount = toNumber(transaction.amount);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{formatDate(transaction.transactionDate)}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{transaction.merchantName ?? transaction.description}</p>
        {transaction.category && (
          <p className="text-xs text-gray-400">{transaction.category}</p>
        )}
      </td>
      <td className={`px-4 py-3 text-sm font-medium text-right ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
        {formatCurrency(amount)}
      </td>
      <td className="px-4 py-3">
        {transaction.reconciled ? (
          <span className="flex items-center gap-1 text-green-600 text-xs">
            <CheckCircle size={14} />
            Avstämd
          </span>
        ) : (
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {reconciling ? "Stämmer av..." : "Stäm av"}
          </button>
        )}
      </td>
    </tr>
  );
}
