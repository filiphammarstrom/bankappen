export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/client";


export async function POST(
  _req: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { customer: true, company: true },
  });
  if (!invoice) return NextResponse.json({ error: "Faktura hittades inte" }, { status: 404 });

  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: invoice.companyId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const remaining = Number(invoice.totalSek) - Number(invoice.paidAmountSek);
  if (remaining <= 0) return NextResponse.json({ error: "Fakturan är redan betald" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankappen.vercel.app";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "sek",
    line_items: [
      {
        price_data: {
          currency: "sek",
          unit_amount: Math.round(remaining * 100),
          product_data: {
            name: `Faktura ${invoice.invoiceNumber}`,
            description: `${invoice.company.name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
    },
    customer_email: invoice.customer.email ?? undefined,
    success_url: `${appUrl}/invoices/${invoice.id}?paid=1`,
    cancel_url: `${appUrl}/invoices/${invoice.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json({ url: checkoutSession.url });
}
