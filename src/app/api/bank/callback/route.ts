import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tinkClient } from "@/lib/bank/tink-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function redirect(path: string) {
  return NextResponse.redirect(`${APP_URL}${path}`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return redirect("/login");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return redirect(`/bank?error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return redirect("/bank?error=missing_params");
  }

  // Decode state to recover companyId
  let companyId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8")) as {
      companyId: string;
    };
    companyId = decoded.companyId;
  } catch {
    return redirect("/bank?error=invalid_state");
  }

  // Verify access
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: session.user.id } },
  });
  if (!membership) return redirect("/bank?error=access_denied");

  try {
    const tokens = await tinkClient.exchangeCodeForToken(code);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const accounts = await tinkClient.getAccounts(tokens.access_token);

    for (const account of accounts) {
      const existing = await prisma.bankConnection.findFirst({
        where: { companyId, accountId: account.id, provider: "tink" },
        select: { id: true },
      });

      const connectionData = {
        accountName: account.name,
        iban: account.identifiers?.iban?.iban ?? null,
        currency: account.balance.booked.amount.currencyCode,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt,
      };

      if (existing) {
        await prisma.bankConnection.update({ where: { id: existing.id }, data: connectionData });
      } else {
        await prisma.bankConnection.create({
          data: {
            companyId,
            provider: "tink",
            accountId: account.id,
            ...connectionData,
          },
        });
      }
    }

    return redirect("/bank?connected=1");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return redirect(`/bank?error=${encodeURIComponent(msg)}`);
  }
}
