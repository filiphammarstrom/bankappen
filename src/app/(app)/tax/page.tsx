import Link from "next/link";
import { FileText, Calculator, AlertCircle } from "lucide-react";

const taxItems = [
  {
    href: "/tax/moms",
    title: "Momsdeklaration",
    description: "Beräkna och exportera momsdeklaration (XML-fil för Skatteverket)",
    icon: <Calculator size={24} />,
    color: "bg-blue-50 text-blue-600",
    status: "Funktionell",
    statusColor: "bg-green-100 text-green-700",
  },
  {
    href: "/tax/ink2",
    title: "INK2 – Inkomstdeklaration",
    description: "Beräkning av inkomstskatt för aktiebolag (INK2 – stub)",
    icon: <FileText size={24} />,
    color: "bg-purple-50 text-purple-600",
    status: "Stub / Under utveckling",
    statusColor: "bg-yellow-100 text-yellow-700",
  },
];

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skatt</h1>
        <p className="text-gray-500">Skattedeklarationer och rapporter</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-medium mb-1">Viktigt: Verifiering krävs</p>
          <p>
            Alla skatteberäkningar och deklarationsfiler bör granskas av en auktoriserad revisor
            eller redovisningskonsult innan inlämning till Skatteverket.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taxItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}>
                {item.icon}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.statusColor}`}>
                {item.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
