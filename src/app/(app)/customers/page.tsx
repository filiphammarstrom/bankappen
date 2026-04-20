export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunder</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Ny kund
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Inga kunder ännu.</p>
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              Lägg till kund
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org.nr</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-post</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ort</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fakturor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.orgNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.email ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.city ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{customer._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
