import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import type { InvoiceStatus } from "@/types/invoice";

export default async function CustomerDetailPage({
  params,
}: {
  params: { customerId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, companyId: company.id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) notFound();

  const totalRevenue = customer.invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + toNumber(i.totalSek), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Kontaktinformation</h2>
          <dl className="space-y-2 text-sm">
            {customer.orgNumber && (
              <div><dt className="text-gray-500">Org.nr</dt><dd>{customer.orgNumber}</dd></div>
            )}
            {customer.vatNumber && (
              <div><dt className="text-gray-500">VAT-nr</dt><dd>{customer.vatNumber}</dd></div>
            )}
            {customer.email && (
              <div><dt className="text-gray-500">E-post</dt><dd>{customer.email}</dd></div>
            )}
            {customer.phone && (
              <div><dt className="text-gray-500">Telefon</dt><dd>{customer.phone}</dd></div>
            )}
            {customer.address && (
              <div>
                <dt className="text-gray-500">Adress</dt>
                <dd>{customer.address}, {customer.postalCode} {customer.city}</dd>
              </div>
            )}
            <div><dt className="text-gray-500">Betalningstid</dt><dd>{customer.paymentTermDays} dagar</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Statistik</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Totalt fakturerat</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Antal fakturor</p>
              <p className="text-xl font-bold">{customer.invoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Fakturor</h2>
          <Link
            href={`/invoices/new`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Ny faktura
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {customer.invoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500">
              <FileText size={32} className="mx-auto text-gray-300 mb-2" />
              Inga fakturor ännu
            </div>
          ) : (
            customer.invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-blue-600">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                  <span className="text-sm font-medium">{formatCurrency(toNumber(invoice.totalSek))}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
