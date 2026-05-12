export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateCompanyAccess } from "@/lib/company-context";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId krävs" }, { status: 400 });

  const hasAccess = await validateCompanyAccess(companyId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  if (!process.env.STRIPE_CLIENT_ID) {
    return NextResponse.json({ error: "STRIPE_CLIENT_ID saknas" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankappen.vercel.app";
  const state = Buffer.from(JSON.stringify({ companyId, userId: session.user.id })).toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID,
    scope: "read_write",
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state,
  });

  return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params}`);
}
