"use client";

import { formatCurrency } from "@/lib/utils";
import type { BalanceSheetReport } from "@/types/accounting";

export function BalanceSheetTable({ report }: { report: BalanceSheetReport }) {
  return (
    <div className="space-y-6">
      {/* Assets */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tillgångar</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {report.assets.map((item) => (
              <tr key={item.accountNumber}>
                <td className="py-2 text-gray-500 w-16">{item.accountNumber}</td>
                <td className="py-2">{item.accountName}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            {report.assets.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Inga tillgångar</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold">
              <td className="py-2" colSpan={2}>Summa tillgångar</td>
              <td className="py-2 text-right">{formatCurrency(report.totalAssets)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Liabilities */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Skulder</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {report.liabilities.map((item) => (
              <tr key={item.accountNumber}>
                <td className="py-2 text-gray-500 w-16">{item.accountNumber}</td>
                <td className="py-2">{item.accountName}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            {report.liabilities.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Inga skulder</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Equity */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Eget kapital</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {report.equity.map((item) => (
              <tr key={item.accountNumber}>
                <td className="py-2 text-gray-500 w-16">{item.accountNumber}</td>
                <td className="py-2">{item.accountName}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            {report.equity.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Inget eget kapital</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold">
              <td className="py-2" colSpan={2}>Summa skulder och eget kapital</td>
              <td className="py-2 text-right">{formatCurrency(report.totalLiabilitiesAndEquity)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Balance check */}
      <div className={`rounded-lg p-4 ${
        Math.abs(report.totalAssets - report.totalLiabilitiesAndEquity) < 0.01
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">
            {Math.abs(report.totalAssets - report.totalLiabilitiesAndEquity) < 0.01
              ? "Balansen stämmer"
              : "OBS: Balansen stämmer ej"}
          </span>
          <span>
            Differens: {formatCurrency(report.totalAssets - report.totalLiabilitiesAndEquity)}
          </span>
        </div>
      </div>
    </div>
  );
}
