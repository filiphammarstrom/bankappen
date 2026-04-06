"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  orgNumber: string;
  role: string;
}

export function CompanySwitcher() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data: { companies?: Company[]; activeCompany?: Company }) => {
        setCompanies(data.companies ?? []);
        setActiveCompany(data.activeCompany ?? null);
      })
      .catch(() => {});
  }, []);

  async function switchCompany(companyId: string) {
    await fetch("/api/companies/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    window.location.reload();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-gray-800 transition-colors"
      >
        <Building2 size={16} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">Aktivt företag</p>
          <p className="text-sm font-medium text-white truncate">
            {activeCompany?.name ?? "Välj företag"}
          </p>
        </div>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => {
                switchCompany(company.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                company.id === activeCompany?.id ? "text-blue-400" : "text-gray-300"
              }`}
            >
              <div className="font-medium">{company.name}</div>
              <div className="text-xs text-gray-500">{company.orgNumber}</div>
            </button>
          ))}
          <Link
            href="/companies/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
          >
            <Plus size={14} />
            Nytt företag
          </Link>
        </div>
      )}
    </div>
  );
}
