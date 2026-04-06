"use client";

import { SWEDISH_VAT_RATES } from "@/lib/accounting/vat-calculator";
import { cn } from "@/lib/utils";

interface VatRateSelectProps {
  value: number;
  onChange: (rate: number) => void;
  className?: string;
  disabled?: boolean;
}

const vatLabels: Record<number, string> = {
  25: "25% (Standard)",
  12: "12% (Mat, hotell)",
  6: "6% (Böcker, tidningar)",
  0: "0% (Momsfri)",
};

export function VatRateSelect({ value, onChange, className, disabled }: VatRateSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={cn(
        "block w-full px-3 py-2 border border-gray-300 rounded-md",
        "focus:outline-none focus:ring-blue-500 focus:border-blue-500",
        "disabled:bg-gray-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {SWEDISH_VAT_RATES.map((rate) => (
        <option key={rate} value={rate}>
          {vatLabels[rate]}
        </option>
      ))}
    </select>
  );
}
