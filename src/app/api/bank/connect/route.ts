import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveCompany } from "@/lib/company-context";
import { tinkClient } from "@/lib/bank/tink-client";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect("/login");
  }

  const company = await getActiveCompany(session.user.id);
  if (!company) {
    return NextResponse.redirect("/companies/new");
  }

  if (!tinkClient.isEnabled()) {
    return NextResponse.json(
      { error: "Tink-integration är inte aktiverad. Sätt TINK_ENABLED=true och konfigurera Tink-uppgifter." },
      { status: 503 }
    );
  }

  // Encode companyId + nonce in state to recover it in callback
  const nonce = randomBytes(8).toString("hex");
  const state = Buffer.from(JSON.stringify({ companyId: company.id, nonce })).toString("base64url");

  const authUrl = tinkClient.getAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}
