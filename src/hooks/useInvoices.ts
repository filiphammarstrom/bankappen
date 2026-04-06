"use client";

import { useState, useEffect } from "react";
import type { InvoiceStatus } from "@/types/invoice";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  totalSek: number;
  customer: { name: string; email?: string | null };
}

interface UseInvoicesOptions {
  status?: InvoiceStatus;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);

    fetch(`/api/invoices?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { invoices?: Invoice[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoices(data.invoices ?? []);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [options.status, version]);

  return {
    invoices,
    loading,
    error,
    refetch: () => setVersion((v) => v + 1),
  };
}
