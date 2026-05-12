export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSie4 } from "@/lib/sie/generator";

export async function GET(
  _req: Request,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: params.companyId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  try {
    const buffer = await generateSie4(params.companyId);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: params.companyId } });
    const filename = `${company.name.replace(/[^a-zA-Z0-9]/g, "_")}_SIE4.se`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("SIE export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export misslyckades" },
      { status: 500 }
    );
  }
}
