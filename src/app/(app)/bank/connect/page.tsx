"use client";

import Link from "next/link";
import { ArrowLeft, AlertCircle, ExternalLink, Link2 } from "lucide-react";

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

      {/* CTA */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Anslut ditt företagskonto</h3>
        <p className="text-sm text-gray-600 mb-4">
          Klicka nedan för att ansluta din bank via Tink Open Banking. Du omdirigeras till Tinks
          säkra inloggning och godkänner åtkomst till dina kontotransaktioner.
        </p>
        <a
          href="/api/bank/connect"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
        >
          <Link2 size={16} />
          Anslut bank via Tink
        </a>
        <p className="text-xs text-gray-400 mt-3">
          Kräver att <code className="bg-gray-100 px-1 rounded">TINK_ENABLED=true</code> och Tink-uppgifter
          är konfigurerade. Om Tink inte är aktiverat visas ett felmeddelande.
        </p>
      </div>

      {/* Setup guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Konfigurationsinstruktioner</h3>
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
                Konfigurera dessa värden i din{" "}
                <code className="bg-amber-100 px-1 rounded">.env</code>:
                <pre className="mt-2 bg-amber-100 p-2 rounded text-xs font-mono whitespace-pre-wrap">
{`TINK_ENABLED=true
TINK_CLIENT_ID=your-client-id
TINK_CLIENT_SECRET=your-client-secret
TINK_REDIRECT_URI=https://yourdomain.com/api/bank/callback`}
                </pre>
              </li>
              <li>Starta om applikationen</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Vad du får med bankintegration</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Automatisk import av banktransaktioner",
            "Stäm av transaktioner mot fakturor och utgifter",
            "Automatisk kategorisering av utgifter",
            "Realtidsöversikt av kassaflöde",
            "Identifiering av återkommande prenumerationer",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
