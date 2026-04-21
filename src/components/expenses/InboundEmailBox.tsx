"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";

interface InboundEmailBoxProps {
  companyId: string;
  companyName: string;
}

export function InboundEmailBox({ companyId, companyName }: InboundEmailBoxProps) {
  const [copied, setCopied] = useState(false);

  const inboundAddress =
    process.env.NEXT_PUBLIC_POSTMARK_INBOUND_ADDRESS ?? "";

  const emailAddress = inboundAddress.includes("@")
    ? inboundAddress.replace("@", `+${companyId}@`)
    : `kvitton+${companyId}@inbound.postmarkapp.com`;

  const isConfigured = !!inboundAddress;

  function handleCopy() {
    navigator.clipboard.writeText(emailAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Mail size={20} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Skicka fakturor direkt till appen
          </p>
          <p className="text-xs text-blue-700 mb-3">
            Be dina leverantörer skicka fakturor till adressen nedan för{" "}
            <span className="font-medium">{companyName}</span>. De hamnar automatiskt
            under utgifter och väntar på din granskning.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white border border-blue-200 rounded px-3 py-2 text-blue-800 font-mono truncate">
              {emailAddress}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Kopierad!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Kopiera
                </>
              )}
            </button>
          </div>
          {!isConfigured && (
            <p className="text-xs text-blue-600 mt-2">
              Kräver att Postmark Inbound är konfigurerat och{" "}
              <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_POSTMARK_INBOUND_ADDRESS</code>{" "}
              är satt i miljövariabler.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
