"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  orgNumber: string;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  vatPeriod: "MONTHLY" | "QUARTERLY" | "YEARLY";
  fTaxCertificate: boolean;
  fiscalYearStart: number;
}

export function CompanySettingsForm({ company }: { company: Company }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(company.name);
  const [orgNumber, setOrgNumber] = useState(company.orgNumber);
  const [vatNumber, setVatNumber] = useState(company.vatNumber ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [postalCode, setPostalCode] = useState(company.postalCode ?? "");
  const [city, setCity] = useState(company.city ?? "");
  const [bankgiro, setBankgiro] = useState(company.bankgiro ?? "");
  const [plusgiro, setPlusgiro] = useState(company.plusgiro ?? "");
  const [vatPeriod, setVatPeriod] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">(company.vatPeriod);
  const [fTaxCertificate, setFTaxCertificate] = useState(company.fTaxCertificate);
  const [fiscalYearStart, setFiscalYearStart] = useState(String(company.fiscalYearStart));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim()) { setError("Företagsnamn krävs"); return; }
    if (!orgNumber.trim()) { setError("Organisationsnummer krävs"); return; }

    const fiscalStart = parseInt(fiscalYearStart, 10);
    if (isNaN(fiscalStart) || fiscalStart < 1 || fiscalStart > 12) {
      setError("Räkenskapsårets startmånad måste vara 1–12");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          orgNumber: orgNumber.trim(),
          vatNumber: vatNumber.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          postalCode: postalCode.trim() || null,
          bankgiro: bankgiro.trim() || null,
          plusgiro: plusgiro.trim() || null,
          vatPeriod,
          fTaxCertificate,
          fiscalYearStart: fiscalStart,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Något gick fel");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Nätverksfel – försök igen");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Required fields */}
        <div>
          <label className={labelClass}>Företagsnamn *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Organisationsnummer *</label>
          <input
            type="text"
            value={orgNumber}
            onChange={(e) => setOrgNumber(e.target.value)}
            placeholder="556000-0000"
            className={inputClass}
            required
          />
        </div>

        {/* Contact */}
        <div>
          <label className={labelClass}>E-post</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div className="col-span-2">
          <label className={labelClass}>Adress</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Postnummer</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="123 45"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ort</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Tax / VAT */}
        <div>
          <label className={labelClass}>VAT-nummer</label>
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="SE556000000001"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Momsperiod</label>
          <select
            value={vatPeriod}
            onChange={(e) => setVatPeriod(e.target.value as "MONTHLY" | "QUARTERLY" | "YEARLY")}
            className={inputClass}
          >
            <option value="MONTHLY">Månadsvis</option>
            <option value="QUARTERLY">Kvartal</option>
            <option value="YEARLY">Årsvis</option>
          </select>
        </div>

        {/* Payment */}
        <div>
          <label className={labelClass}>Bankgiro</label>
          <input
            type="text"
            value={bankgiro}
            onChange={(e) => setBankgiro(e.target.value)}
            placeholder="123-4567"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Plusgiro</label>
          <input
            type="text"
            value={plusgiro}
            onChange={(e) => setPlusgiro(e.target.value)}
            placeholder="12 34 56-7"
            className={inputClass}
          />
        </div>

        {/* Fiscal year */}
        <div>
          <label className={labelClass}>Räkenskapsårets startmånad</label>
          <select
            value={fiscalYearStart}
            onChange={(e) => setFiscalYearStart(e.target.value)}
            className={inputClass}
          >
            {[
              [1, "Januari"], [2, "Februari"], [3, "Mars"], [4, "April"],
              [5, "Maj"], [6, "Juni"], [7, "Juli"], [8, "Augusti"],
              [9, "September"], [10, "Oktober"], [11, "November"], [12, "December"],
            ].map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* F-tax */}
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="fTaxCertificate"
            checked={fTaxCertificate}
            onChange={(e) => setFTaxCertificate(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="fTaxCertificate" className="text-sm text-gray-700">
            F-skattsedel
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Företagsinformationen har sparats.
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Sparar..." : "Spara ändringar"}
        </button>
      </div>
    </form>
  );
}
