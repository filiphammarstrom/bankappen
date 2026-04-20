export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import Link from "next/link";
import { FileText, TrendingUp, AlertCircle, Clock } from "lucide-react";

async function getDashboardData(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    invoices,
    overdueInvoices,
    expensesPendingReview,
    recentInvoices,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { totalSek: true, status: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: now },
      },
      select: { totalSek: true, paidAmountSek: true },
    }),
    prisma.expense.count({
      where: { companyId, status: "PENDING_REVIEW" },
    }),
    prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const revenueThisMonth = invoices
    .filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED")
    .reduce((sum, i) => sum + toNumber(i.totalSek), 0);

  const unpaidTotal = overdueInvoices.reduce(
    (sum, i) => sum + toNumber(i.totalSek) - toNumber(i.paidAmountSek),
    0
  );

  return {
    revenueThisMonth,
    unpaidTotal,
    overdueCount: overdueInvoices.length,
    expensesPendingReview,
    recentInvoices,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Välkommen!</h2>
          <p className="text-gray-500 mb-4">Du har inga företag ännu. Skapa ett nytt för att komma igång.</p>
          <Link
            href="/companies/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Skapa företag
          </Link>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Översikt</h1>
        <p className="text-gray-500">{company.name} · {new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Intäkter denna månad</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.revenueThisMonth)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Obetalda fakturor</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.unpaidTotal)}
              </p>
              {data.overdueCount > 0 && (
                <p className="text-xs text-red-500 mt-1">{data.overdueCount} förfallen</p>
              )}
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Utgifter att granska</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.expensesPendingReview}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Senaste faktura</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.recentInvoices[0]?.invoiceNumber ?? "–"}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Senaste fakturor</h2>
          <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-700">
            Visa alla
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentInvoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500">
              Inga fakturor ännu.{" "}
              <Link href="/invoices/new" className="text-blue-600 hover:text-blue-700">
                Skapa din första faktura
              </Link>
            </div>
          ) : (
            data.recentInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{invoice.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(toNumber(invoice.totalSek))}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/invoices/new", label: "Ny faktura", color: "bg-blue-600 hover:bg-blue-700" },
          { href: "/expenses/upload", label: "Ladda upp kvitto", color: "bg-green-600 hover:bg-green-700" },
          { href: "/reports/profit-loss", label: "Resultatrapport", color: "bg-purple-600 hover:bg-purple-700" },
          { href: "/tax/moms", label: "Momsdeklaration", color: "bg-orange-600 hover:bg-orange-700" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`${action.color} text-white text-sm font-medium px-4 py-3 rounded-lg text-center transition-colors`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
