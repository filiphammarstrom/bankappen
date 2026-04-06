"use client";

import { BAS_ACCOUNTS } from "@/lib/accounting/bas-accounts";
import type { BasAccount } from "@/types/accounting";

interface AccountSelectorProps {
  value: number;
  onChange: (accountNumber: number) => void;
  filter?: (account: BasAccount) => boolean;
  className?: string;
}

export function AccountSelector({ value, onChange, filter, className }: AccountSelectorProps) {
  const accounts = filter ? BAS_ACCOUNTS.filter(filter) : BAS_ACCOUNTS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className ?? ""}`}
    >
      {accounts.map((acc) => (
        <option key={acc.accountNumber} value={acc.accountNumber}>
          {acc.accountNumber} – {acc.name}
        </option>
      ))}
    </select>
  );
}
