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
    paymentAmount?: number;
    paymentDate?: string;
    paymentMethod?: string;
    paymentReference?: string;
  };

  try {
    const updates: Record<string, unknown> = {};

    if (body.status) {
      updates.status = body.status;
    }

    if (body.markPaid) {
      const amount = body.paymentAmount ?? Number(invoice.totalSek);
      const alreadyPaid = Number(invoice.paidAmountSek);
      const newPaidTotal = alreadyPaid + amount;
      const remaining = Number(invoice.totalSek) - alreadyPaid;

      if (amount <= 0) {
        return NextResponse.json({ error: "Beloppet måste vara positivt" }, { status: 400 });
      }
      if (amount > remaining + 0.01) {
        return NextResponse.json(
          { error: `Beloppet (${amount} kr) överstiger återstående skuld (${remaining.toFixed(2)} kr)` },
          { status: 400 }
        );
      }

      const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
      const isFullyPaid = newPaidTotal >= Number(invoice.totalSek) - 0.01;

      updates.paidAmountSek = newPaidTotal;
      if (isFullyPaid) {
        updates.status = "PAID";
        updates.paidAt = paymentDate;
      } else {
        updates.status = "PARTIALLY_PAID";
      }

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentDate,
          method: (body.paymentMethod as "BANK_TRANSFER" | "BANKGIRO" | "SWISH" | "CARD" | "OTHER") ?? "BANK_TRANSFER",
          reference: body.paymentReference ?? null,
        },
      });

      try {
        await createPaymentJournalEntry(
          { id: payment.id, amount, paymentDate },
          { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
          company.id
        );
      } catch (err) {
        console.error("Payment journal entry failed:", err instanceof Error ? err.message : err);
      }
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: updates,
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error("Update invoice error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Kunde inte uppdatera faktura" }, { status: 500 });
  }
}
