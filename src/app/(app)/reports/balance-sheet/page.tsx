import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { getBalanceSheet } from "@/lib/accounting/report-engine";
import { BalanceSheetTable } from "@/components/reports/BalanceSheetTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const asOf = searchParams.date ? new Date(searchParams.date) : new Date();
  const report = await getBalanceSheet(company.id, asOf);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balansräkning</h1>
          <p className="text-gray-500">Per {format(asOf, "yyyy-MM-dd")}</p>
        </div>
      </div>

      <form className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Per datum</label>
          <input
            type="date"
            name="date"
            defaultValue={format(asOf, "yyyy-MM-dd")}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Uppdatera
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{company.name}</h2>
        <p className="text-sm text-gray-500 mb-6">Balansräkning per {format(asOf, "yyyy-MM-dd")}</p>
        <BalanceSheetTable report={report} />
      </div>
    </div>
  );
}
