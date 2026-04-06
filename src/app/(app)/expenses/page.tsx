import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import Link from "next/link";
import { Upload, Receipt } from "lucide-react";
import type { ExpenseStatus } from "@/types/expense";
import { EXPENSE_STATUS_LABELS, EXPENSE_SOURCE_LABELS } from "@/types/expense";
import { InboundEmailBox } from "@/components/expenses/InboundEmailBox";

const statusColors: Record<ExpenseStatus, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  BOOKED: "bg-green-100 text-green-700",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const where = {
    companyId: company.id,
    ...(searchParams.status && searchParams.status !== "ALL"
      ? { status: searchParams.status as ExpenseStatus }
      : {}),
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statusOptions = [
    { value: "ALL", label: "Alla" },
    { value: "PENDING_REVIEW", label: "Väntar granskning" },
    { value: "APPROVED", label: "Godkända" },
    { value: "BOOKED", label: "Bokförda" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utgifter</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
        <Link
          href="/expenses/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Upload size={16} />
          Ladda upp kvitto
        </Link>
      </div>

      <InboundEmailBox companyId={company.id} companyName={company.name} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {statusOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/expenses?status=${opt.value}`}
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

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Receipt size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Inga utgifter hittades.</p>
            <Link
              href="/expenses/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Upload size={16} />
              Ladda upp kvitto
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leverantör</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Källa</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Belopp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${expense.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      {expense.supplierName ?? expense.supplier?.name ?? "Okänd leverantör"}
                    </Link>
                    {expense.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{expense.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(expense.issueDate)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {EXPENSE_SOURCE_LABELS[expense.source as keyof typeof EXPENSE_SOURCE_LABELS]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {expense.totalSek ? formatCurrency(toNumber(expense.totalSek)) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[expense.status as ExpenseStatus]}`}>
                      {EXPENSE_STATUS_LABELS[expense.status as ExpenseStatus]}
                    </span>
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
