import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import type { InvoiceStatus } from "@/types/invoice";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const where = {
    companyId: company.id,
    ...(searchParams.status && searchParams.status !== "ALL"
      ? { status: searchParams.status as InvoiceStatus }
      : {}),
    ...(searchParams.search
      ? {
          OR: [
            { invoiceNumber: { contains: searchParams.search, mode: "insensitive" as const } },
            { customer: { name: { contains: searchParams.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statusOptions = [
    { value: "ALL", label: "Alla" },
    { value: "DRAFT", label: "Utkast" },
    { value: "SENT", label: "Skickade" },
    { value: "PAID", label: "Betalda" },
    { value: "OVERDUE", label: "Förfallna" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakturor</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Ny faktura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {statusOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/invoices?status=${opt.value}`}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              (searchParams.status ?? "ALL") === opt.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Inga fakturor hittades.</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              Skapa faktura
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fakturanr</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kund</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Förfaller</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Belopp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{invoice.customer.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.issueDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(toNumber(invoice.totalSek))}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
