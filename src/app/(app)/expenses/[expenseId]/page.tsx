import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { OcrReviewForm } from "@/components/expenses/OcrReviewForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EXPENSE_STATUS_LABELS, EXPENSE_SOURCE_LABELS } from "@/types/expense";
import type { ExpenseStatus, ExpenseSource } from "@/types/expense";

export default async function ExpenseDetailPage({
  params,
}: {
  params: { expenseId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const expense = await prisma.expense.findFirst({
    where: { id: params.expenseId, companyId: company.id },
    include: { supplier: { select: { id: true, name: true, orgNumber: true, vatNumber: true } } },
  });

  if (!expense) notFound();

  // Convert Prisma Decimal to regular numbers
  const expenseData = {
    ...expense,
    subtotalSek: expense.subtotalSek ? Number(expense.subtotalSek) : null,
    vatAmountSek: expense.vatAmountSek ? Number(expense.vatAmountSek) : null,
    totalSek: expense.totalSek ? Number(expense.totalSek) : null,
    vatRate: expense.vatRate ? Number(expense.vatRate) : null,
  };

  const statusColors: Record<ExpenseStatus, string> = {
    PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    REJECTED: "bg-red-100 text-red-700",
    BOOKED: "bg-green-100 text-green-700",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/expenses" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {expense.supplierName ?? "Okänd leverantör"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[expense.status as ExpenseStatus]}`}>
              {EXPENSE_STATUS_LABELS[expense.status as ExpenseStatus]}
            </span>
            <span className="text-xs text-gray-500">
              {EXPENSE_SOURCE_LABELS[expense.source as ExpenseSource]}
            </span>
          </div>
        </div>
      </div>

      {expense.rawImageUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Originalkvitto</p>
          <img
            src={expense.rawImageUrl}
            alt="Kvitto"
            className="max-w-full h-auto rounded border"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Uppgifter</h2>
        <OcrReviewForm expense={expenseData as Parameters<typeof OcrReviewForm>[0]["expense"]} />
      </div>
    </div>
  );
}
