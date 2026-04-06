"use client";

import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import type { BankTransactionRow } from "@/types/bank";

interface TransactionListProps {
  transactions: BankTransactionRow[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500 py-4">Inga transaktioner</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {tx.merchantName ?? tx.description}
            </p>
            <p className="text-xs text-gray-500">{formatDate(tx.transactionDate)}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${toNumber(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(toNumber(tx.amount))}
            </p>
            {tx.reconciled && (
              <span className="text-xs text-green-500">Avstämd</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
