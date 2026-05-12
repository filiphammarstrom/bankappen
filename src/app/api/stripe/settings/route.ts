export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCompanyAccess } from "@/lib/company-context";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const { companyId, stripeEnabled, disconnect } = await req.json() as {
    companyId: string;
    stripeEnabled?: boolean;
    disconnect?: boolean;
  };

  const hasAccess = await validateCompanyAccess(companyId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(typeof stripeEnabled === "boolean" ? { stripeEnabled } : {}),
      ...(disconnect ? { stripeAccountId: null, stripeEnabled: false } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
