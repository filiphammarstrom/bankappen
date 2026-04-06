import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { createPaymentJournalEntry } from "@/lib/accounting/journal-engine";

export async function GET(
  _req: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.invoiceId, companyId: company.id },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: "Faktura hittades inte" }, { status: 404 });

  return NextResponse.json({ invoice });
}

export async function PATCH(
  req: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.invoiceId, companyId: company.id },
  });

  if (!invoice) return NextResponse.json({ error: "Faktura hittades inte" }, { status: 404 });

  const body = await req.json() as {
    status?: string;
    markPaid?: boolean;
  };

  try {
    const updates: Record<string, unknown> = {};

    if (body.status) {
      updates.status = body.status;
    }

    if (body.markPaid && body.status === "PAID") {
      updates.paidAt = new Date();
      updates.paidAmountSek = invoice.totalSek;

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.totalSek,
          paymentDate: new Date(),
          method: "BANK_TRANSFER",
        },
      });

      // Create journal entry for payment
      try {
        await createPaymentJournalEntry(
          { id: payment.id, amount: Number(invoice.totalSek), paymentDate: new Date() },
          { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
          company.id
        );
      } catch (err) {
        console.error("Payment journal entry failed:", err);
      }
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: updates,
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ error: "Kunde inte uppdatera faktura" }, { status: 500 });
  }
}
