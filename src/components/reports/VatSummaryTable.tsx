"use client";

import { formatCurrency } from "@/lib/utils";
import type { VatSummary } from "@/types/accounting";

export function VatSummaryTable({ summary }: { summary: VatSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Momspliktig försäljning */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Momspliktig försäljning</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-2 text-gray-500">Ruta 05 (25% moms)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box05)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Ruta 06 (12% moms)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box06)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Ruta 07 (6% moms)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box07)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Utgående moms */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Utgående moms</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-2 text-gray-500">Ruta 10 (25%)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box10)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Ruta 11 (12%)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box11)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Ruta 12 (6%)</td>
                <td className="py-2 text-right font-medium">{formatCurrency(summary.box12)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingående moms och summa */}
      <div className="bg-gray-50 rounded-lg p-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-2 text-gray-500">Ruta 30 – Ingående moms</td>
              <td className="py-2 text-right font-medium text-green-600">-{formatCurrency(summary.box30)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Box 49 */}
      <div className={`rounded-lg p-4 border ${summary.box49 >= 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-900">Ruta 49 – Moms att betala/återfå</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.box49 >= 0 ? "Belopp att betala till Skatteverket" : "Belopp att återfå från Skatteverket"}
            </p>
          </div>
          <p className={`text-2xl font-bold ${summary.box49 >= 0 ? "text-red-700" : "text-green-700"}`}>
            {formatCurrency(Math.abs(summary.box49))}
          </p>
        </div>
      </div>
    </div>
  );
}
