import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateCompanyAccess } from "@/lib/company-context";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InboundEmailBox } from "@/components/expenses/InboundEmailBox";

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

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Företagsnamn</p>
            <p className="font-medium">{company.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Organisationsnummer</p>
            <p className="font-medium">{company.orgNumber}</p>
          </div>
          {company.vatNumber && (
            <div>
              <p className="text-xs text-gray-500">VAT-nummer</p>
              <p className="font-medium">{company.vatNumber}</p>
            </div>
          )}
          {company.email && (
            <div>
              <p className="text-xs text-gray-500">E-post</p>
              <p className="font-medium">{company.email}</p>
            </div>
          )}
          {company.phone && (
            <div>
              <p className="text-xs text-gray-500">Telefon</p>
              <p className="font-medium">{company.phone}</p>
            </div>
          )}
          {company.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Adress</p>
              <p className="font-medium">
                {company.address}, {company.postalCode} {company.city}
              </p>
            </div>
          )}
          {company.bankgiro && (
            <div>
              <p className="text-xs text-gray-500">Bankgiro</p>
              <p className="font-medium">{company.bankgiro}</p>
            </div>
          )}
          {company.plusgiro && (
            <div>
              <p className="text-xs text-gray-500">Plusgiro</p>
              <p className="font-medium">{company.plusgiro}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Momsperiod</p>
            <p className="font-medium">
              {company.vatPeriod === "MONTHLY"
                ? "Månadsvis"
                : company.vatPeriod === "QUARTERLY"
                ? "Kvartal"
                : "Årsvis"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">F-skattsedel</p>
            <p className="font-medium">{company.fTaxCertificate ? "Ja" : "Nej"}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            För att redigera företagsinformation, kontakta systemadministratören eller använd API direkt.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Inkommande e-post</h2>
        <InboundEmailBox companyId={company.id} companyName={company.name} />
      </div>
    </div>
  );
}
