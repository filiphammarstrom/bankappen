export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/company-context";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
  }

  const { companyId } = await req.json() as { companyId: string };

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_COMPANY_COOKIE, companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
