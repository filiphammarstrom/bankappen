export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as postmark from "postmark";

export async function GET(req: Request) {
  // Vercel signs cron requests with this header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.POSTMARK_SERVER_TOKEN) {
    return NextResponse.json({ error: "POSTMARK_SERVER_TOKEN saknas" }, { status: 500 });
  }

  const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all users and their companies
  const users = await prisma.user.findMany({
    where: { email: { not: undefined } },
    include: {
      memberships: {
        include: { company: true },
      },
    },
  });

  let sent = 0;

  for (const user of users) {
    if (!user.email) continue;

    const companies = user.memberships.map((m) => m.company);
    if (companies.length === 0) continue;

    const sections: string[] = [];

    for (const company of companies) {
      const [outgoing, incoming] = await Promise.all([
        prisma.invoice.findMany({
          where: { companyId: company.id, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
          include: { customer: { select: { name: true } } },
          orderBy: { dueDate: "asc" },
        }),
        prisma.expense.findMany({
          where: { companyId: company.id, status: "BOOKED", totalSek: { not: null } },
          orderBy: { dueDate: "asc" },
        }),
      ]);

      if (outgoing.length === 0 && incoming.length === 0) continue;

      const totalReceive = outgoing.reduce((s, i) => s + (Number(i.totalSek) - Number(i.paidAmountSek)), 0);
      const totalPay = incoming.reduce((s, e) => s + Number(e.totalSek ?? 0), 0);

      const fmt = (n: number) =>
        new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

      const outgoingRows = outgoing
        .map((inv) => {
          const remaining = Number(inv.totalSek) - Number(inv.paidAmountSek);
          const overdue = inv.dueDate < today;
          return `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${inv.customer.name}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280">${inv.invoiceNumber}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280">${inv.dueDate.toLocaleDateString("sv-SE")}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:${overdue ? "#dc2626" : "#111827"}">${fmt(remaining)} kr${overdue ? " ⚠️" : ""}</td>
          </tr>`;
        })
        .join("");

      const incomingRows = incoming
        .map((exp) => {
          const overdue = exp.dueDate ? exp.dueDate < today : false;
          return `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${exp.supplierName ?? "Okänd"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280">${exp.invoiceNumber ?? "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280">${exp.dueDate?.toLocaleDateString("sv-SE") ?? "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:${overdue ? "#dc2626" : "#111827"}">${fmt(Number(exp.totalSek ?? 0))} kr${overdue ? " ⚠️" : ""}</td>
          </tr>`;
        })
        .join("");

      sections.push(`
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin:24px 0 8px">${company.name}</h2>

        ${outgoing.length > 0 ? `
        <p style="font-size:13px;font-weight:600;color:#059669;margin:12px 0 4px">Att inkassera — ${fmt(totalReceive)} kr</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f9fafb">
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Kund</th>
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Faktura</th>
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Förfaller</th>
            <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:500">Belopp</th>
          </tr></thead>
          <tbody>${outgoingRows}</tbody>
        </table>` : ""}

        ${incoming.length > 0 ? `
        <p style="font-size:13px;font-weight:600;color:#dc2626;margin:16px 0 4px">Att betala — ${fmt(totalPay)} kr</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f9fafb">
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Leverantör</th>
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Faktura</th>
            <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:500">Förfaller</th>
            <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:500">Belopp</th>
          </tr></thead>
          <tbody>${incomingRows}</tbody>
        </table>` : ""}
      `);
    }

    if (sections.length === 0) continue;

    const month = today.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankappen.vercel.app";

    const html = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:20px">
  <div style="background:#1d4ed8;color:white;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:18px">Månadsöversikt — ${month}</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe">Dina betalningar och utestående fakturor</p>
  </div>
  <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    ${sections.join('<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">')}
    <div style="margin-top:24px;text-align:center">
      <a href="${appUrl}/betalningar" style="background:#1d4ed8;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
        Öppna betalningar i appen
      </a>
    </div>
  </div>
  <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px">
    Skickas automatiskt den 1:a varje månad av Bankappen
  </p>
</body>
</html>`;

    await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL ?? "bokforing@noreply.se",
      To: user.email,
      Subject: `Månadsöversikt ${month} — betalningar`,
      HtmlBody: html,
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
