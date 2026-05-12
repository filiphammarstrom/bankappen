"use client";

import { useState } from "react";
import { CreditCard, Check, Link2, Link2Off, ExternalLink } from "lucide-react";

interface Props {
  companyId: string;
  stripeEnabled: boolean;
  stripeAccountId: string | null;
  stripeConfigured: boolean;
}

export function StripeSettings({ companyId, stripeEnabled: initialEnabled, stripeAccountId, stripeConfigured }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggleEnabled(val: boolean) {
    setSaving(true);
    await fetch("/api/stripe/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, stripeEnabled: val }),
    });
    setEnabled(val);
    setSaving(false);
  }

  async function disconnect() {
    if (!confirm("Koppla bort Stripe från det här företaget?")) return;
    setSaving(true);
    await fetch("/api/stripe/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, disconnect: true }),
    });
    window.location.reload();
  }

  if (!stripeConfigured) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        Stripe Connect är inte konfigurerat. Lägg till <code className="bg-gray-100 px-1 rounded">STRIPE_CLIENT_ID</code> på Vercel för att aktivera.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {stripeAccountId ? (
        <>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Stripe kopplat</p>
              <p className="text-xs text-gray-500 font-mono">{stripeAccountId}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Aktivt på fakturor</p>
              <p className="text-xs text-gray-500">Lägg till "Betala nu"-knapp i fakturamail</p>
            </div>
            <button
              onClick={() => toggleEnabled(!enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <a
              href={`https://dashboard.stripe.com/${stripeAccountId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              <ExternalLink size={12} />
              Öppna Stripe-dashboard
            </a>
            <span className="text-gray-300">·</span>
            <button
              onClick={disconnect}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
            >
              <Link2Off size={12} />
              Koppla bort
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <CreditCard size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Koppla ditt Stripe-konto</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Kunder kan betala fakturor med kort direkt i mejlet. Fungerar med ditt befintliga Stripe-konto.
              </p>
            </div>
          </div>
          <a
            href={`/api/stripe/connect?companyId=${companyId}`}
            className="inline-flex items-center gap-2 bg-[#635BFF] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4F46E5] transition-colors"
          >
            <Link2 size={15} />
            Koppla Stripe
          </a>
        </>
      )}
    </div>
  );
}
