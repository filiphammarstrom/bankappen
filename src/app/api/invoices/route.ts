import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { createInvoiceJournalEntry } from "@/lib/accounting/journal-engine";
import { calculateLineItem } from "@/lib/accounting/vat-calculator";
import { z } from "zod";

const InvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  unit: z.string().optional().default("st"),
  accountNumber: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
});

const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string(),
  deliveryDate: z.string().optional(),
  currency: z.string().default("SEK"),
  reverseCharge: z.boolean().default(false),
  buyerVatNumber: z.string().optional(),
  notes: z.string().optional(),
  ourReference: z.string().optional(),
  yourReference: z.string().optional(),
  lines: z.array(InvoiceLineSchema).min(1),
  sendNow: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId: company.id,
      ...(status ? { status: status as "DRAFT" } : {}),
    },
    include: { customer: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  try {
    const body = await req.json() as unknown;
    const data = CreateInvoiceSchema.parse(body);

    // Verify customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId: company.id },
    });
    if (!customer) {
      return NextResponse.json({ error: "Kund hittades inte" }, { status: 404 });
    }

    // Calculate totals
    let subtotal = 0;
    let vatTotal = 0;

    const lineData = data.lines.map((line) => {
      const { subtotal: lineSub, vatAmount, lineTotal } = calculateLineItem(
        line.quantity,
        line.unitPrice,
        line.vatRate
      );
      subtotal += lineSub;
      vatTotal += vatAmount;
      return { ...line, lineSub, vatAmount, lineTotal };
    });

    const total = subtotal + vatTotal;

    // Generate invoice number
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { invoiceCounter: { increment: 1 } },
      select: { invoiceCounter: true },
    });

    const year = new Date().getFullYear();
    const invoiceNumber = `${year}-${String(updatedCompany.invoiceCounter).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: data.customerId,
        invoiceNumber,
        status: data.sendNow ? "SENT" : "DRAFT",
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        currency: data.currency,
        reverseCharge: data.reverseCharge,
        buyerVatNumber: data.buyerVatNumber || null,
        notes: data.notes || null,
        ourReference: data.ourReference || null,
        yourReference: data.yourReference || null,
        subtotalSek: subtotal,
        vatAmountSek: vatTotal,
        totalSek: total,
        sentAt: data.sendNow ? new Date() : null,
        lines: {
          create: lineData.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            vatAmount: line.vatAmount,
            lineTotal: line.lineTotal,
            unit: line.unit,
            accountNumber: line.accountNumber,
            sortOrder: line.sortOrder,
          })),
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    // Create journal entry
    try {
      await createInvoiceJournalEntry(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          subtotalSek: subtotal,
          vatAmountSek: vatTotal,
          totalSek: total,
          customerId: invoice.customerId,
          lines: invoice.lines.map((l) => ({
            lineTotal: Number(l.lineTotal),
            vatAmount: Number(l.vatAmount),
            vatRate: Number(l.vatRate),
            accountNumber: l.accountNumber,
          })),
        },
        company.id
      );
    } catch (journalError) {
      console.error("Journal entry creation failed:", journalError);
      // Don't fail the invoice creation
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ogiltiga uppgifter", details: error.errors }, { status: 400 });
    }
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Kunde inte skapa faktura" }, { status: 500 });
  }
}
