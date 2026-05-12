export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook-konfiguration saknas" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Ogiltig webhook-signatur" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) return NextResponse.json({ ok: true });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return NextResponse.json({ ok: true });

    const paidAmount = (session.amount_total ?? 0) / 100;
    const newPaidTotal = Number(invoice.paidAmountSek) + paidAmount;
    const remaining = Number(invoice.totalSek) - newPaidTotal;

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmountSek: newPaidTotal,
          status: remaining <= 0.01 ? "PAID" : "PARTIALLY_PAID",
          paidAt: remaining <= 0.01 ? new Date() : null,
        },
      }),
      prisma.payment.create({
        data: {
          invoiceId,
          amount: paidAmount,
          paymentDate: new Date(),
          method: "CARD",
          reference: session.payment_intent as string ?? null,
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
