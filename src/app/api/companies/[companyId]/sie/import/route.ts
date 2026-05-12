export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSie } from "@/lib/sie/parser";
import { importSie } from "@/lib/sie/importer";

export async function POST(
  req: Request,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: params.companyId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  if (membership.role === "AUDITOR") return NextResponse.json({ error: "Revisorer kan inte importera" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Ingen fil bifogad" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sie = parseSie(buffer);
    const result = await importSie(params.companyId, session.user.id, sie);

    return NextResponse.json({
      message: "SIE-filen importerades",
      companyName: sie.companyName,
      ...result,
    });
  } catch (err) {
    console.error("SIE import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import misslyckades" },
      { status: 500 }
    );
  }
}
