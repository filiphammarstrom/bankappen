import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewInvoicePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      vatNumber: true,
      paymentTermDays: true,
    },
  });

  if (customers.length === 0) {
    return (
      <div className="max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h2 className="font-semibold text-yellow-800 mb-2">Inga kunder</h2>
          <p className="text-yellow-700 text-sm mb-4">
            Du behöver lägga till minst en kund innan du kan skapa fakturor.
          </p>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
          >
            Lägg till kund
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ny faktura</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
      </div>

      <InvoiceForm customers={customers} />
    </div>
  );
}
