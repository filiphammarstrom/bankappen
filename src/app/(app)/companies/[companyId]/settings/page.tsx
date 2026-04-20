export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateCompanyAccess } from "@/lib/company-context";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InboundEmailBox } from "@/components/expenses/InboundEmailBox";
import { CompanySettingsForm } from "@/components/companies/CompanySettingsForm";

export default async function CompanySettingsPage({
  params,
}: {
  params: { companyId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const hasAccess = await validateCompanyAccess(params.companyId, session.user.id);
  if (!hasAccess) notFound();

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
  });

  if (!company) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/companies" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Företagsinställningar</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
      </div>

      <CompanySettingsForm
        company={{
          id: company.id,
          name: company.name,
          orgNumber: company.orgNumber,
          vatNumber: company.vatNumber,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          postalCode: company.postalCode,
          bankgiro: company.bankgiro,
          plusgiro: company.plusgiro,
          vatPeriod: company.vatPeriod,
          fTaxCertificate: company.fTaxCertificate,
          fiscalYearStart: company.fiscalYearStart,
        }}
      />

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Inkommande e-post</h2>
        <InboundEmailBox companyId={company.id} companyName={company.name} />
      </div>
    </div>
  );
}
