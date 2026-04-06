"use client";

import { useState, useEffect } from "react";

interface Company {
  id: string;
  name: string;
  orgNumber: string;
  vatNumber?: string | null;
  role: string;
}

interface UseCompanyReturn {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  error: string | null;
  switchCompany: (companyId: string) => Promise<void>;
  refetch: () => void;
}

export function useCompany(): UseCompanyReturn {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data: { companies?: Company[]; activeCompany?: Company; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCompanies(data.companies ?? []);
          setActiveCompany(data.activeCompany ?? null);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [version]);

  async function switchCompany(companyId: string) {
    await fetch("/api/companies/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setVersion((v) => v + 1);
  }

  return {
    activeCompany,
    companies,
    loading,
    error,
    switchCompany,
    refetch: () => setVersion((v) => v + 1),
  };
}
