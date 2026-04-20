export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, AlertCircle, ExternalLink } from "lucide-react";

export default function BankConnectPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bank" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anslut bank</h1>
          <p className="text-gray-500">Via Tink Open Banking</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Tink-integration kräver konfiguration</h3>
            <p className="text-sm text-amber-700 mb-3">
              Bankintegration via Tink är inte aktiverad. För att aktivera:
            </p>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
              <li>
                Registrera ett konto på{" "}
                <a href="https://console.tink.com" target="_blank" rel="noopener noreferrer"
                  className="underline font-medium">
                  console.tink.com
                </a>
              </li>
              <li>Skapa en applikation och hämta Client ID och Secret</li>
              <li>
                Konfigurera dessa värden i din <code className="bg-amber-100 px-1 rounded">.env</code>:
                <pre className="mt-2 bg-amber-100 p-2 rounded text-xs font-mono">
{`TINK_ENABLED=true
TINK_CLIENT_ID=your-client-id
TINK_CLIENT_SECRET=your-client-secret
TINK_REDIRECT_URI=${process.env.NEXT_PUBLIC_APP_URL}/api/bank/callback`}
                </pre>
              </li>
              <li>Starta om applikationen</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Vad kan du göra med bankintegration?</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Importera banktransaktioner automatiskt",
            "Stäm av transaktioner mot fakturor och utgifter",
            "Automatisk kategorisering av utgifter",
            "Realtidsöversikt av kassaflöde",
            "Exportera till bokföring",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <a
            href="https://docs.tink.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink size={14} />
            Tink API-dokumentation
          </a>
        </div>
      </div>
    </div>
  );
}
