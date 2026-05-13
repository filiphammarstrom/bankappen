import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { tinkClient } from "@/lib/bank/tink-client";

function tinkAmountToNumber(tx: {
  amount: { value: { unscaledValue: string; scale: string } };
}): number {
  const { unscaledValue, scale } = tx.amount.value;
  return Number(unscaledValue) / Math.pow(10, Number(scale));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const { connectionId } = (await req.json()) as { connectionId?: string };

  const where = connectionId
    ? { id: connectionId, companyId: company.id }
    : { companyId: company.id, provider: "tink" };

  const connections = await prisma.bankConnection.findMany({ where });

  if (connections.length === 0) {
    return NextResponse.json({ error: "Inga bankkopplingar hittades" }, { status: 404 });
  }

  let totalImported = 0;

  for (const conn of connections) {
    if (!conn.accessToken) continue;

    let accessToken = conn.accessToken;

    // Refresh token if expired
    if (conn.tokenExpiresAt && conn.refreshToken && conn.tokenExpiresAt < new Date()) {
      try {
        const refreshed = await tinkClient.refreshToken(conn.refreshToken);
        accessToken = refreshed.access_token;
        await prisma.bankConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? conn.refreshToken,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          },
        });
      } catch {
        continue;
      }
    }

    const transactions = await tinkClient.getTransactions(accessToken, conn.accountId, {
      pageSize: 250,
    });

    for (const tx of transactions) {
      const amount = tinkAmountToNumber(tx);
      const bookedDate = tx.dates.booked ?? tx.dates.value;
      if (!bookedDate) continue;

      await prisma.bankTransaction.upsert({
        where: {
          bankConnectionId_externalId: { bankConnectionId: conn.id, externalId: tx.id },
        },
        create: {
          bankConnectionId: conn.id,
          externalId: tx.id,
          transactionDate: new Date(bookedDate),
          bookingDate: tx.dates.booked ? new Date(tx.dates.booked) : null,
          description: tx.descriptions.display ?? tx.descriptions.original,
          amount,
          currency: tx.amount.currencyCode,
          merchantName: tx.merchantInformation?.merchantName ?? null,
          category: tx.merchantInformation?.merchantCategoryCode ?? null,
          reconciled: false,
        },
        update: {
          description: tx.descriptions.display ?? tx.descriptions.original,
          merchantName: tx.merchantInformation?.merchantName ?? null,
        },
      });
      totalImported++;
    }

    await prisma.bankConnection.update({
      where: { id: conn.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  return NextResponse.json({ imported: totalImported, connections: connections.length });
}
