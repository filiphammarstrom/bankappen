import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
          Inga transaktioner att stämma av.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivning</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Belopp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unreconciled.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(tx.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{tx.merchantName ?? tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.bankConnection.accountName}</p>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${toNumber(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(toNumber(tx.amount))}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {tx.category ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-600 hover:text-blue-700">
                      Matcha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
