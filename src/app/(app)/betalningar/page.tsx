import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { BetalningarPage } from "@/components/betalningar/BetalningarPage";
import { toNumber } from "@/lib/utils";

export default async function Betalningar() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [outgoingInvoices, incomingExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId: company.id,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        companyId: company.id,
        status: "BOOKED",
        // Only booked expenses that haven't been marked paid
        totalSek: { not: null },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return (
    <BetalningarPage
      outgoing={outgoingInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        totalSek: toNumber(inv.totalSek),
        paidAmountSek: toNumber(inv.paidAmountSek),
        dueDate: inv.dueDate.toISOString(),
        status: inv.status,
        overdue: inv.dueDate < today,
      }))}
      incoming={incomingExpenses.map((exp) => ({
        id: exp.id,
        supplierName: exp.supplierName ?? "Okänd leverantör",
        totalSek: toNumber(exp.totalSek),
        dueDate: exp.dueDate?.toISOString() ?? null,
        invoiceNumber: exp.invoiceNumber ?? null,
        overdue: exp.dueDate ? exp.dueDate < today : false,
      }))}
    />
  );
}
