export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { getVatSummary } from "@/lib/accounting/report-engine";
import { VatSummaryTable } from "@/components/reports/VatSummaryTable";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { format, startOfQuarter, endOfQuarter } from "date-fns";

export default async function VatReportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const now = new Date();
  const from = searchParams.from ? new Date(searchParams.from) : startOfQuarter(now);
  const to = searchParams.to ? new Date(searchParams.to) : endOfQuarter(now);

  const summary = await getVatSummary(company.id, from, to);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Momsrapport</h1>
          <p className="text-gray-500">
            {format(from, "yyyy-MM-dd")} – {format(to, "yyyy-MM-dd")}
          </p>
        </div>
      </div>

      <form className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Från</label>
          <input type="date" name="from" defaultValue={format(from, "yyyy-MM-dd")}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Till</label>
          <input type="date" name="to" defaultValue={format(to, "yyyy-MM-dd")}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="mt-4">
          <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            Uppdatera
          </button>
        </div>
        <div className="mt-4 ml-auto">
          <a
            href={`/api/reports/vat/export?from=${format(from, "yyyy-MM-dd")}&to=${format(to, "yyyy-MM-dd")}`}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50"
          >
            <Download size={14} />
            Exportera XML
          </a>
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{company.name}</h2>
        <p className="text-sm text-gray-500 mb-6">Momsrapport · {company.vatNumber}</p>
        <VatSummaryTable summary={summary} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">Tips: Momsdeklaration</p>
        <p>Gå till <Link href="/tax/moms" className="underline">Skatt → Momsdeklaration</Link> för att skapa och exportera XML-fil till Skatteverket.</p>
      </div>
    </div>
  );
}
