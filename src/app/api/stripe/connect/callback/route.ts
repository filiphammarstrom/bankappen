export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankappen.vercel.app";

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/companies?stripe_error=1`);
  }

  let companyId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    companyId = decoded.companyId;
  } catch {
    return NextResponse.redirect(`${appUrl}/companies?stripe_error=1`);
  }

  try {
    const response = await stripe.oauth.token({ grant_type: "authorization_code", code });
    const accountId = response.stripe_user_id;

    await prisma.company.update({
      where: { id: companyId },
      data: { stripeAccountId: accountId, stripeEnabled: true },
    });

    return NextResponse.redirect(`${appUrl}/companies/${companyId}/settings?stripe_connected=1`);
  } catch {
    return NextResponse.redirect(`${appUrl}/companies/${companyId}/settings?stripe_error=1`);
  }
}
