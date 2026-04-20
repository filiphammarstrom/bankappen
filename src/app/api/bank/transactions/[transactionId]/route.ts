export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ReconcileSchema = z.object({
  reconciled: z.boolean(),
  invoiceId: z.string().optional().nullable(),
  expenseId: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { transactionId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const tx = await prisma.bankTransaction.findUnique({
    where: { id: params.transactionId },
    include: { bankConnection: { select: { companyId: true } } },
  });
  if (!tx) return NextResponse.json({ error: "Transaktion hittades inte" }, { status: 404 });

  // Verify company access
  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: {
        companyId: tx.bankConnection.companyId,
        userId: session.user.id,
      },
    },
  });
  if (!membership) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 }); }

  let data: z.infer<typeof ReconcileSchema>;
  try { data = ReconcileSchema.parse(body); } catch (err) {
    return NextResponse.json({ error: "Ogiltiga uppgifter", details: (err as z.ZodError).errors }, { status: 400 });
  }

  const updated = await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: {
      reconciled: data.reconciled,
      invoiceId: data.invoiceId ?? null,
      expenseId: data.expenseId ?? null,
    },
  });

  return NextResponse.json({ transaction: updated });
}
