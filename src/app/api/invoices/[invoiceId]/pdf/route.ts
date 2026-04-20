export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoice-generator";
import React from "react";
import type { ReactElement } from "react";

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
    },
  });

  if (!invoice) return NextResponse.json({ error: "Faktura hittades inte" }, { status: 404 });

  // Convert Prisma Decimal types
  const invoiceForPdf = {
    ...invoice,
    subtotalSek: Number(invoice.subtotalSek),
    vatAmountSek: Number(invoice.vatAmountSek),
    totalSek: Number(invoice.totalSek),
    paidAmountSek: Number(invoice.paidAmountSek),
    lines: invoice.lines.map((line) => ({
      ...line,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      vatRate: Number(line.vatRate),
      vatAmount: Number(line.vatAmount),
      lineTotal: Number(line.lineTotal),
    })),
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(InvoicePdf, {
      invoice: invoiceForPdf as Parameters<typeof InvoicePdf>[0]["invoice"],
      company: {
        name: company.name,
        orgNumber: company.orgNumber,
        vatNumber: company.vatNumber,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        email: company.email,
        phone: company.phone,
        bankgiro: company.bankgiro,
        plusgiro: company.plusgiro,
        fTaxCertificate: company.fTaxCertificate,
      },
    }) as ReactElement<DocumentProps>;

    const pdfBuffer = await renderToBuffer(element);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="faktura-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Kunde inte generera PDF" }, { status: 500 });
  }
}
