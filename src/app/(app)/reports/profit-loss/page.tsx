import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { getProfitLoss } from "@/lib/accounting/report-engine";
import { ProfitLossTable } from "@/components/reports/ProfitLossTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const now = new Date();
  const from = searchParams.from ? new Date(searchParams.from) : startOfYear(now);
  const to = searchParams.to ? new Date(searchParams.to) : endOfYear(now);

  const report = await getProfitLoss(company.id, from, to);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultaträkning</h1>
          <p className="text-gray-500">
            {format(from, "yyyy-MM-dd")} – {format(to, "yyyy-MM-dd")}
          </p>
        </div>
      </div>

      {/* Period selector */}
      <form className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Från</label>
          <input
            type="date"
            name="from"
            defaultValue={format(from, "yyyy-MM-dd")}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Till</label>
          <input
            type="date"
            name="to"
            defaultValue={format(to, "yyyy-MM-dd")}
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
        <p className="text-sm text-gray-500 mb-6">
          Resultaträkning {format(from, "yyyy-MM-dd")} – {format(to, "yyyy-MM-dd")}
        </p>
        <ProfitLossTable report={report} />
      </div>
    </div>
  );
}
