"use client";

import { formatCurrency } from "@/lib/utils";
import type { ProfitLossReport } from "@/types/accounting";

export function ProfitLossTable({ report }: { report: ProfitLossReport }) {
  return (
    <div className="space-y-6">
      {/* Revenue */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Intäkter</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {report.revenue.map((item) => (
              <tr key={item.accountNumber}>
                <td className="py-2 text-gray-500 w-16">{item.accountNumber}</td>
                <td className="py-2">{item.accountName}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            {report.revenue.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400">Inga intäkter under perioden</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold">
              <td className="py-2" colSpan={2}>Summa intäkter</td>
              <td className="py-2 text-right text-green-700">{formatCurrency(report.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Expenses */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Kostnader</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {report.expenses.map((item) => (
              <tr key={item.accountNumber}>
                <td className="py-2 text-gray-500 w-16">{item.accountNumber}</td>
                <td className="py-2">{item.accountName}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
            {report.expenses.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400">Inga kostnader under perioden</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold">
              <td className="py-2" colSpan={2}>Summa kostnader</td>
              <td className="py-2 text-right text-red-700">{formatCurrency(report.totalExpenses)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Net result */}
      <div className={`rounded-lg p-4 ${report.netResult >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">Årets resultat</span>
          <span className={`font-bold text-xl ${report.netResult >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(report.netResult)}
          </span>
        </div>
      </div>
    </div>
  );
}
