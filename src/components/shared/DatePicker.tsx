"use client";

import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function DatePicker({ value, onChange, className, disabled, min, max }: DatePickerProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      max={max}
      className={cn(
        "block w-full px-3 py-2 border border-gray-300 rounded-md",
        "focus:outline-none focus:ring-blue-500 focus:border-blue-500",
        "disabled:bg-gray-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}
