import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCompanyAccess } from "@/lib/company-context";
import { createExpenseJournalEntry, createExpensePaymentJournalEntry } from "@/lib/accounting/journal-engine";
import { z } from "zod";

const UpdateExpenseSchema = z.object({
  supplierName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  totalSek: z.number().positive().optional(),
  vatAmountSek: z.number().min(0).optional(),
  subtotalSek: z.number().min(0).optional(),
  accountNumber: z.number().int().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "BOOKED"]).optional(),
  createJournalEntry: z.boolean().optional(),
  markPaid: z.boolean().optional(),
  paymentDate: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const expense = await prisma.expense.findUnique({
    where: { id: params.expenseId },
  });
  if (!expense) return NextResponse.json({ error: "Utgift hittades inte" }, { status: 404 });

  const hasAccess = await validateCompanyAccess(expense.companyId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  if (expense.status === "BOOKED") {
    return NextResponse.json({ error: "Bokförda utgifter kan inte ändras" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  let data: z.infer<typeof UpdateExpenseSchema>;
  try {
    data = UpdateExpenseSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Ogiltiga uppgifter", details: (err as z.ZodError).errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }

  const { createJournalEntry, ...fields } = data;

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      ...fields,
      issueDate: fields.issueDate ? new Date(fields.issueDate) : undefined,
      dueDate: fields.dueDate ? new Date(fields.dueDate) : undefined,
      reviewedAt: fields.status === "APPROVED" || fields.status === "BOOKED" ? new Date() : undefined,
      reviewedByUserId: fields.status === "APPROVED" || fields.status === "BOOKED" ? session.user.id : undefined,
    },
  });

  if (createJournalEntry && updated.status === "BOOKED") {
    try {
      await createExpenseJournalEntry(
        {
          id: updated.id,
          supplierName: updated.supplierName,
          totalSek: updated.totalSek,
          vatAmountSek: updated.vatAmountSek,
          subtotalSek: updated.subtotalSek,
          accountNumber: updated.accountNumber,
        },
        expense.companyId
      );
    } catch (err) {
      console.error("Journal entry för utgift misslyckades:", err instanceof Error ? err.message : err);
    }
  }

  if (data.markPaid && updated.status === "BOOKED") {
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    try {
      await createExpensePaymentJournalEntry(
        { id: updated.id, supplierName: updated.supplierName, totalSek: updated.totalSek },
        expense.companyId,
        paymentDate
      );
    } catch (err) {
      console.error("Betalnings-journal entry för utgift misslyckades:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ expense: updated });
}
