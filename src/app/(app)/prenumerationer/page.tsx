import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { toNumber } from "@/lib/utils";
import { PrenumerationerPage } from "@/components/prenumerationer/PrenumerationerPage";

export default async function Prenumerationer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  // Get all subscription expenses
  const expenses = await prisma.expense.findMany({
    where: { companyId: company.id, isSubscription: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by supplier name
  const grouped = new Map<string, typeof expenses>();
  for (const exp of expenses) {
    const key = exp.supplierName ?? "Okänd";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(exp);
  }

  // Get recent bank transactions for matching
  const bankTxs = await prisma.bankTransaction.findMany({
    where: { bankConnection: { companyId: company.id }, reconciled: false },
    orderBy: { transactionDate: "desc" },
    take: 100,
  });

  const subscriptions = Array.from(grouped.entries()).map(([vendor, exps]) => {
    const latest = exps[0];
    const monthlyAmount = (() => {
      const amt = toNumber(latest.totalSek);
      if (latest.subscriptionInterval === "ANNUAL") return amt / 12;
      if (latest.subscriptionInterval === "QUARTERLY") return amt / 3;
      return amt;
    })();

    // Try to find a matching unreconciled bank transaction
    const matchingTx = bankTxs.find((tx) => {
      const txDesc = (tx.description ?? "").toLowerCase();
      const vendorLower = vendor.toLowerCase();
      return txDesc.includes(vendorLower.split(" ")[0]) &&
        Math.abs(Math.abs(Number(tx.amount)) - toNumber(latest.totalSek)) < 5;
    });

    return {
      vendor,
      latestExpenseId: latest.id,
      latestAmount: toNumber(latest.totalSek),
      monthlyAmount,
      interval: latest.subscriptionInterval ?? "MONTHLY",
      lastCharged: latest.issueDate?.toISOString() ?? latest.createdAt.toISOString(),
      status: latest.status,
      count: exps.length,
      matchingBankTxId: matchingTx?.id ?? null,
      matchingBankTxAmount: matchingTx ? Number(matchingTx.amount) : null,
    };
  });

  const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyAmount, 0);

  return <PrenumerationerPage subscriptions={subscriptions} totalMonthly={totalMonthly} companyId={company.id} />;
}
