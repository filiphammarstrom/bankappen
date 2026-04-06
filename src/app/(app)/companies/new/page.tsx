"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json() as { error?: string; company?: { id: string } };

      if (!res.ok) {
        setError(json.error ?? "Kunde inte skapa företag");
        return;
      }

      router.push("/companies");
    } catch {
      setError("Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/companies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nytt företag</h1>
          <p className="text-gray-500">Registrera ett nytt företag</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Företagsnamn *</label>
            <input
              name="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Demo AB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Organisationsnummer *</label>
            <input
              name="orgNumber"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="556123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">VAT-nummer</label>
            <input
              name="vatNumber"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="SE556123456701"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Adress</label>
            <input
              name="address"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Storgatan 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Postnummer</label>
            <input
              name="postalCode"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 45"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stad</label>
            <input
              name="city"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Stockholm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-post</label>
            <input
              name="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="info@foretag.se"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              name="phone"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="08-123 45 67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bankgiro</label>
            <input
              name="bankgiro"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Plusgiro</label>
            <input
              name="plusgiro"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345-6"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Momsperiod</label>
            <select
              name="vatPeriod"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="QUARTERLY">Kvartal</option>
              <option value="MONTHLY">Månadsvis</option>
              <option value="YEARLY">Årsvis</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              name="fTaxCertificate"
              id="fTaxCertificate"
              value="true"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="fTaxCertificate" className="text-sm font-medium text-gray-700">
              Innehar F-skattsedel
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Skapar..." : "Skapa företag"}
          </button>
          <Link href="/companies" className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  );
}
