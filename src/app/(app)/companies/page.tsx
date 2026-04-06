import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCompanies } from "@/lib/company-context";
import Link from "next/link";
import { Building2, Plus, Settings } from "lucide-react";

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const companies = await getUserCompanies(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Företag</h1>
          <p className="text-gray-500">Hantera dina företag</p>
        </div>
        <Link
          href="/companies/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Nytt företag
        </Link>
      </div>

      <div className="grid gap-4">
        {companies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Inga företag ännu.</p>
            <Link
              href="/companies/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} />
              Skapa ditt första företag
            </Link>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{company.name}</p>
                  <p className="text-sm text-gray-500">Org.nr: {company.orgNumber}</p>
                  {company.vatNumber && (
                    <p className="text-sm text-gray-500">VAT: {company.vatNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {company.role === "OWNER" ? "Ägare" : company.role === "ADMIN" ? "Admin" : "Medlem"}
                </span>
                <Link
                  href={`/companies/${company.id}/settings`}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <Settings size={18} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
