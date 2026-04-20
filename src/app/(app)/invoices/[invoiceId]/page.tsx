export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { InvoiceStatus } from "@/types/invoice";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.invoiceId, companyId: company.id },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!invoice) notFound();

  const vatGroups = new Map<number, { base: number; vat: number }>();
  for (const line of invoice.lines) {
    const rate = toNumber(line.vatRate);
    const lineTotal = toNumber(line.lineTotal);
    const vatAmount = toNumber(line.vatAmount);
    const existing = vatGroups.get(rate) ?? { base: 0, vat: 0 };
    vatGroups.set(rate, {
      base: existing.base + (lineTotal - vatAmount),
      vat: existing.vat + vatAmount,
    });
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Faktura {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
              {invoice.sentAt && (
                <span className="text-xs text-gray-500">
                  Skickad {formatDate(invoice.sentAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <InvoiceActions invoice={{ id: invoice.id, status: invoice.status as InvoiceStatus, invoiceNumber: invoice.invoiceNumber, totalSek: toNumber(invoice.totalSek), paidAmountSek: toNumber(invoice.paidAmountSek), customer: { email: invoice.customer.email ?? "" } }} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500">Fakturadatum</p>
            <p className="font-medium">{formatDate(invoice.issueDate)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Förfallodatum</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="grid grid-cols-2 gap-6 py-4 border-t border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Kund</p>
            <p className="font-semibold">{invoice.customer.name}</p>
            {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
            {(invoice.customer.postalCode || invoice.customer.city) && (
              <p className="text-sm text-gray-600">
                {[invoice.customer.postalCode, invoice.customer.city].filter(Boolean).join(" ")}
              </p>
            )}
            {invoice.customer.vatNumber && (
              <p className="text-sm text-gray-500">VAT: {invoice.customer.vatNumber}</p>
            )}
          </div>
          <div>
            {invoice.ourReference && (
              <div className="mb-2">
                <p className="text-xs text-gray-500">Vår referens</p>
                <p className="text-sm">{invoice.ourReference}</p>
              </div>
            )}
            {invoice.yourReference && (
              <div>
                <p className="text-xs text-gray-500">Er referens</p>
                <p className="text-sm">{invoice.yourReference}</p>
              </div>
            )}
          </div>
        </div>

        {/* Lines */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-600">Beskrivning</th>
              <th className="pb-2 text-right font-medium text-gray-600">Antal</th>
              <th className="pb-2 text-center font-medium text-gray-600">Enhet</th>
              <th className="pb-2 text-right font-medium text-gray-600">Á-pris</th>
              <th className="pb-2 text-right font-medium text-gray-600">Moms</th>
              <th className="pb-2 text-right font-medium text-gray-600">Totalt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-2">{line.description}</td>
                <td className="py-2 text-right">{toNumber(line.quantity)}</td>
                <td className="py-2 text-center text-gray-500">{line.unit ?? "st"}</td>
                <td className="py-2 text-right">{formatCurrency(toNumber(line.unitPrice))}</td>
                <td className="py-2 text-right text-gray-500">{toNumber(line.vatRate)}%</td>
                <td className="py-2 text-right font-medium">{formatCurrency(toNumber(line.lineTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Netto</span>
              <span>{formatCurrency(toNumber(invoice.subtotalSek))}</span>
            </div>
            {Array.from(vatGroups.entries()).map(([rate, { vat }]) => (
              <div key={rate} className="flex justify-between">
                <span className="text-gray-500">Moms {rate}%</span>
                <span>{formatCurrency(vat)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-bold text-base">
              <span>Att betala</span>
              <span className="text-blue-700">{formatCurrency(toNumber(invoice.totalSek))}</span>
            </div>
            {toNumber(invoice.paidAmountSek) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Betalt</span>
                <span>-{formatCurrency(toNumber(invoice.paidAmountSek))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Meddelande</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900 mb-2">Betalningar</p>
            <div className="space-y-1">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{formatDate(payment.paymentDate)}</span>
                  <span className="font-medium text-green-600">{formatCurrency(toNumber(payment.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
