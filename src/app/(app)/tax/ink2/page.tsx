import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { getProfitLoss, getBalanceSheet } from "@/lib/accounting/report-engine";
import { calculateINK2Summary } from "@/lib/tax/ink2-stub";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Download } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";

export default async function INK2Page({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const year = parseInt(searchParams.year ?? String(new Date().getFullYear()));
  const from = startOfYear(new Date(year, 0, 1));
  const to = endOfYear(new Date(year, 0, 1));

  const [profitLoss, balanceSheet] = await Promise.all([
    getProfitLoss(company.id, from, to),
    getBalanceSheet(company.id, to),
  ]);

  const summary = calculateINK2Summary({
    companyName: company.name,
    orgNumber: company.orgNumber,
    fiscalYearStart: format(from, "yyyy-MM-dd"),
    fiscalYearEnd: format(to, "yyyy-MM-dd"),
    profitLoss,
    balanceSheet,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tax" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">INK2 – Inkomstdeklaration</h1>
          <p className="text-gray-500">Räkenskapsår {year}</p>
        </div>
      </div>

      {/* Stub warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">
          <p className="font-bold mb-1">STUB – Inte för inlämning</p>
          <p>
            INK2-funktionen är ett <strong>utkast under utveckling</strong>.
            Beräkningarna är förenklade och tar inte hänsyn till skattemässiga
            justeringar, bilagor (N3A, N3B etc.) eller koncernförhållanden.
          </p>
          <p className="mt-2">
            <strong>Lämna alltid in inkomstdeklarationen via Skatteverkets e-tjänst
            eller med hjälp av auktoriserad revisor.</strong>
          </p>
        </div>
      </div>

      {/* Year selector */}
      <form className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Räkenskapsår</label>
          <select
            name="year"
            defaultValue={year}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {[2026, 2025, 2024, 2023].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            Beräkna
          </button>
        </div>
        <div className="mt-4">
          <a
            href={`/api/tax/ink2?year=${year}`}
            download={`ink2-${year}.xml`}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50"
          >
            <Download size={14} />
            Ladda ned XML (utkast)
          </a>
        </div>
      </form>

      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
        <p className="text-sm text-gray-500">Org.nr: {company.orgNumber} · Räkenskapsår {year}</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {[
            { label: "Totala intäkter", value: summary.revenue, color: "text-green-700" },
            { label: "Totala kostnader", value: summary.expenses, color: "text-red-700" },
            { label: "Redovisat resultat", value: summary.netResult, color: summary.netResult >= 0 ? "text-green-700" : "text-red-700" },
            { label: "Skattemässiga justeringar (stub: 0)", value: summary.taxAdjustments, color: "text-gray-700" },
            { label: "Beskattningsbar inkomst", value: summary.taxableIncome, color: "text-gray-900" },
            { label: "Beräknad skatt (20,6%)", value: summary.estimatedTax, color: "text-red-700" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Balansräkning</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Summa tillgångar</span>
              <span className="font-medium">{formatCurrency(summary.totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Skulder + eget kapital</span>
              <span className="font-medium">{formatCurrency(summary.totalLiabilitiesAndEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
