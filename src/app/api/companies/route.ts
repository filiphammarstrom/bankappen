export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCompanies, getActiveCompany } from "@/lib/company-context";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const [companies, activeCompany] = await Promise.all([
    getUserCompanies(session.user.id),
    getActiveCompany(session.user.id),
  ]);

  return NextResponse.json({ companies, activeCompany });
}
