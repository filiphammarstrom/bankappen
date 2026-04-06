import Link from "next/link";
import { BarChart3, TrendingUp, Scale, Calculator } from "lucide-react";

const reports = [
  {
    href: "/reports/profit-loss",
    title: "Resultaträkning",
    description: "Intäkter och kostnader under en vald period",
    icon: <TrendingUp size={24} />,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/reports/balance-sheet",
    title: "Balansräkning",
    description: "Tillgångar, skulder och eget kapital vid ett datum",
    icon: <Scale size={24} />,
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/reports/vat",
    title: "Momsrapport",
    description: "Sammanställning av utgående och ingående moms",
    icon: <Calculator size={24} />,
    color: "bg-orange-50 text-orange-600",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
        <p className="text-gray-500">Ekonomiska rapporter och sammanställningar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-4`}>
              {report.icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
            <p className="text-sm text-gray-500">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
