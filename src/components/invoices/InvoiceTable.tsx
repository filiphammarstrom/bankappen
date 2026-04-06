"use client";

import Link from "next/link";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import type { InvoiceStatus } from "@/types/invoice";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date | string;
  dueDate: Date | string;
  totalSek: number | string;
  customer: { name: string };
}

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">Inga fakturor hittades</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kund</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Belopp</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:underline font-medium">
                {invoice.invoiceNumber}
              </Link>
            </td>
            <td className="px-4 py-3">{invoice.customer.name}</td>
            <td className="px-4 py-3 text-gray-500">{formatDate(invoice.issueDate)}</td>
            <td className="px-4 py-3 text-right font-medium">{formatCurrency(toNumber(invoice.totalSek))}</td>
            <td className="px-4 py-3">
              <InvoiceStatusBadge status={invoice.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
