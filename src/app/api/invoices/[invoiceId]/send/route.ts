import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoice-generator";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";
import { uploadFileToDrive } from "@/lib/drive/google-drive";
import React from "react";
import type { ReactElement } from "react";
import Stripe from "stripe";

export async function POST(
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
  if (!invoice.customer.email) {
    return NextResponse.json({ error: "Kunden saknar e-postadress" }, { status: 400 });
  }

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
    // Create Stripe checkout session if configured
    let paymentUrl: string | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankappen.vercel.app";
        const remaining = Number(invoice.totalSek) - Number(invoice.paidAmountSek);
        const session = await stripeClient.checkout.sessions.create({
          mode: "payment",
          currency: "sek",
          line_items: [{
            price_data: {
              currency: "sek",
              unit_amount: Math.round(remaining * 100),
              product_data: { name: `Faktura ${invoice.invoiceNumber}`, description: company.name },
            },
            quantity: 1,
          }],
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, companyId: invoice.companyId },
          customer_email: invoice.customer.email ?? undefined,
          success_url: `${appUrl}/invoices/${invoice.id}?paid=1`,
          cancel_url: `${appUrl}/invoices/${invoice.id}`,
          expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        });
        paymentUrl = session.url;
      } catch (stripeErr) {
        console.warn("Stripe checkout skapades inte:", stripeErr instanceof Error ? stripeErr.message : stripeErr);
      }
    }

    // Generate PDF
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
    const pdfBuffer = Buffer.from(await renderToBuffer(element));

    // Send email
    await sendInvoiceEmail({
      invoice: invoiceForPdf as Parameters<typeof sendInvoiceEmail>[0]["invoice"],
      company: {
        name: company.name,
        email: company.email,
        orgNumber: company.orgNumber,
        bankgiro: company.bankgiro,
      },
      pdfBuffer,
      recipientEmail: invoice.customer.email,
      recipientName: invoice.customer.name,
      paymentUrl,
    });

    // Upload PDF to Google Drive
    let driveFileId: string | undefined;
    let driveUrl: string | undefined;
    try {
      const driveResult = await uploadFileToDrive(
        `faktura-${invoice.invoiceNumber}.pdf`,
        "application/pdf",
        pdfBuffer
      );
      if (driveResult) {
        driveFileId = driveResult.fileId;
        driveUrl = driveResult.webViewLink;
      }
    } catch (driveErr) {
      console.warn("Drive-uppladdning misslyckades (icke-fatal):", driveErr instanceof Error ? driveErr.message : driveErr);
    }

    // Update status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        ...(driveFileId ? { driveFileId, driveUrl } : {}),
      },
    });

    return NextResponse.json({ message: "Faktura skickad!", driveUrl: driveUrl ?? null });
  } catch (error) {
    console.error("Send invoice error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte skicka faktura" },
      { status: 500 }
    );
  }
}
