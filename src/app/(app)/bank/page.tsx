export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import Link from "next/link";
import { Landmark, Link2, AlertCircle } from "lucide-react";

export default async function BankPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const connections = await prisma.bankConnection.findMany({
    where: { companyId: company.id },
    include: {
      transactions: {
        orderBy: { transactionDate: "desc" },
        take: 10,
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/bank/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Importera bankutdrag
          </Link>
          <Link
            href="/bank/connect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Link2 size={16} />
            Anslut bank
          </Link>
        </div>
      </div>

      {/* Stub notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Bankintegration (Tink) – Under utveckling</p>
          <p className="text-sm text-amber-700 mt-1">
            Bankintegration via Tink är konfigurerad men kräver ett aktivt Tink-konto.
            Sätt <code className="bg-amber-100 px-1 rounded">TINK_ENABLED=true</code> och konfigurera
            dina Tink-uppgifter för att aktivera funktionen.
          </p>
          <p className="text-sm text-amber-700 mt-1">
            <a href="https://console.tink.com" target="_blank" rel="noopener noreferrer" className="underline">
              Registrera dig på Tink Console →
            </a>
          </p>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inga bankkonton anslutna</h3>
          <p className="text-gray-500 mb-4">
            Anslut ditt företagskonto för att importera transaktioner och stämma av mot fakturor.
          </p>
          <Link
            href="/bank/connect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Link2 size={16} />
            Anslut bank
          </Link>
        </div>
      ) : (
        connections.map((conn) => (
          <div key={conn.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">{conn.accountName}</h3>
                <p className="text-sm text-gray-500">
                  {conn.provider} · {conn.iban ?? "IBAN ej angiven"}
                </p>
                {conn.lastSyncedAt && (
                  <p className="text-xs text-gray-400">Senast synkad: {formatDate(conn.lastSyncedAt)}</p>
                )}
              </div>
              <Link
                href="/bank/reconcile"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Stämma av
              </Link>
            </div>

            {/* Recent transactions */}
            <div className="divide-y divide-gray-100">
              {conn.transactions.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-500">Inga transaktioner</p>
              ) : (
                conn.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.merchantName ?? tx.description}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(tx.transactionDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${toNumber(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(toNumber(tx.amount))}
                      </p>
                      {tx.reconciled && (
                        <span className="text-xs text-green-500">Avstämd</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
