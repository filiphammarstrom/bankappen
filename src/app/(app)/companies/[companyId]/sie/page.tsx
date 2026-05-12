export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateCompanyAccess } from "@/lib/company-context";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiePage } from "@/components/sie/SiePage";

export default async function CompanySiePage({
  params,
}: {
  params: { companyId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const hasAccess = await validateCompanyAccess(params.companyId, session.user.id);
  if (!hasAccess) notFound();

  const company = await prisma.company.findUnique({ where: { id: params.companyId } });
  if (!company) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/companies/${params.companyId}/settings`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIE-import / export</h1>
          <p className="text-gray-500">{company.name}</p>
        </div>
      </div>
      <SiePage companyId={params.companyId} />
    </div>
  );
}
