"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  disabled,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "block w-full px-3 py-2 border border-gray-300 rounded-md text-right",
        "focus:outline-none focus:ring-blue-500 focus:border-blue-500",
        "disabled:bg-gray-50 disabled:cursor-not-allowed",
        focused && "ring-1 ring-blue-500",
        className
      )}
    />
  );
}
