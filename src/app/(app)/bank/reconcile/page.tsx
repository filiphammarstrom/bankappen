import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReconcileList } from "@/components/bank/ReconcileList";

export default async function ReconcilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const unreconciled = await prisma.bankTransaction.findMany({
    where: {
      bankConnection: { companyId: company.id },
      reconciled: false,
    },
    include: { bankConnection: { select: { accountName: true } } },
    orderBy: { transactionDate: "desc" },
    take: 100,
  });

  const openInvoices = await prisma.invoice.findMany({
    where: { companyId: company.id, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    select: { id: true, invoiceNumber: true, totalSek: true, customer: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  const openExpenses = await prisma.expense.findMany({
    where: { companyId: company.id, status: "BOOKED" },
    select: { id: true, supplierName: true, totalSek: true, invoiceNumber: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bank" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bankavstämning</h1>
          <p className="text-gray-500">Stäm av banktransaktioner mot fakturor och utgifter</p>
        </div>
      </div>

      {unreconciled.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>Inga transaktioner att stämma av.</p>
          <Link href="/bank/import" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Importera bankutdrag
          </Link>
        </div>
      ) : (
        <ReconcileList
          transactions={unreconciled.map((tx) => ({
            id: tx.id,
            transactionDate: tx.transactionDate.toISOString(),
            description: tx.description,
            merchantName: tx.merchantName,
            amount: Number(tx.amount),
            reconciled: tx.reconciled,
            accountName: tx.bankConnection.accountName,
          }))}
          openInvoices={openInvoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customer.name,
            totalSek: Number(inv.totalSek),
          }))}
          openExpenses={openExpenses.map((exp) => ({
            id: exp.id,
            supplierName: exp.supplierName ?? "Okänd",
            totalSek: Number(exp.totalSek ?? 0),
            invoiceNumber: exp.invoiceNumber,
          }))}
        />
      )}
    </div>
  );
}
