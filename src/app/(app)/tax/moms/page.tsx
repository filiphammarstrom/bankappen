import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { getVatSummary } from "@/lib/accounting/report-engine";
import { VatSummaryTable } from "@/components/reports/VatSummaryTable";
import Link from "next/link";
import { ArrowLeft, Download, AlertCircle } from "lucide-react";
import { format, startOfQuarter, endOfQuarter } from "date-fns";

export default async function MomsPage({
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
        <Link href="/tax" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Momsdeklaration</h1>
          <p className="text-gray-500">
            {format(from, "yyyy-MM-dd")} – {format(to, "yyyy-MM-dd")}
          </p>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">XML-exportfunktion</p>
          <p>
            Nedanstående XML-fil genereras enligt Skatteverkets format för elektronisk
            momsdeklaration. Granska alltid uppgifterna med din revisor innan inlämning.
            Inlämning sker via{" "}
            <a href="https://www.skatteverket.se" target="_blank" rel="noopener noreferrer" className="underline">
              Skatteverkets e-tjänst
            </a>.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <form className="flex items-center gap-3 flex-wrap bg-white rounded-lg border border-gray-200 p-4">
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
            Beräkna
          </button>
        </div>
        <div className="mt-4">
          <a
            href={`/api/tax/moms?from=${format(from, "yyyy-MM-dd")}&to=${format(to, "yyyy-MM-dd")}&format=xml`}
            download={`momsdeklaration-${format(from, "yyyyMM")}.xml`}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50"
          >
            <Download size={14} />
            Ladda ned XML
          </a>
        </div>
      </form>

      {/* VAT Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{company.name}</h2>
        <p className="text-sm text-gray-500 mb-2">
          Org.nr: {company.orgNumber} · VAT: {company.vatNumber ?? "Ej angivet"}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Momsperiod: {format(from, "yyyy-MM-dd")} – {format(to, "yyyy-MM-dd")}
        </p>
        <VatSummaryTable summary={summary} />
      </div>

      {/* Quick period links */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Snabbval:</span>
        {[
          { label: "Q1 2026", from: "2026-01-01", to: "2026-03-31" },
          { label: "Q4 2025", from: "2025-10-01", to: "2025-12-31" },
          { label: "Q3 2025", from: "2025-07-01", to: "2025-09-30" },
        ].map((q) => (
          <Link
            key={q.label}
            href={`/tax/moms?from=${q.from}&to=${q.to}`}
            className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
          >
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
