import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { createHash } from "crypto";

/**
 * Parse a CSV bank statement. Supports common Swedish bank CSV exports:
 * - Semicolon or comma separated
 * - Swedish decimal comma (1 234,56) or period (1234.56)
 * - Auto-detects date, description and amount columns from headers
 */
function parseSwedishCsv(raw: string): { date: string; description: string; amount: number }[] {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";

  const parseLine = (line: string) =>
    line.split(sep).map((c) => c.replace(/^"(.*)"$/, "$1").trim());

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());

  // Map common header names to our fields
  const dateIdx = headers.findIndex((h) =>
    /^(datum|date|transaktionsdatum|bokföringsdatum|bokfdag)/.test(h)
  );
  const descIdx = headers.findIndex((h) =>
    /^(text|beskrivning|description|meddelande|rubrik|namn|merchant)/.test(h)
  );
  const amountIdx = headers.findIndex((h) =>
    /^(belopp|amount|summa|transaktionsbelopp|kr)/.test(h)
  );

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error(
      "Kunde inte hitta kolumner för datum och belopp. Kontrollera att CSV:n har kolumnrubriker."
    );
  }

  const parseAmount = (raw: string): number => {
    // Handle Swedish format: "1 234,56" or "-1 234,56" or "1234.56"
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    return parseFloat(cleaned);
  };

  const results: { date: string; description: string; amount: number }[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseLine(line);
    const dateRaw = cols[dateIdx]?.trim();
    const descRaw = descIdx !== -1 ? (cols[descIdx]?.trim() ?? "") : "";
    const amountRaw = cols[amountIdx]?.trim();

    if (!dateRaw || !amountRaw) continue;

    const amount = parseAmount(amountRaw);
    if (isNaN(amount)) continue;

    // Normalise date: accept YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    let date = dateRaw;
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateRaw)) {
      const [d, m, y] = dateRaw.split(/[/-]/);
      date = `${y}-${m}-${d}`;
    }

    results.push({ date, description: descRaw || "-", amount });
  }

  return results;
}

async function getOrCreateManualConnection(companyId: string): Promise<string> {
  const existing = await prisma.bankConnection.findFirst({
    where: { companyId, provider: "manual_import" },
  });
  if (existing) return existing.id;

  const created = await prisma.bankConnection.create({
    data: {
      companyId,
      provider: "manual_import",
      accountId: "manual",
      accountName: "Manuellt importerat bankutdrag",
      currency: "SEK",
    },
  });
  return created.id;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ogiltig multipart-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Ingen fil bifogad" }, { status: 400 });
  }

  const text = await file.text();

  let rows: { date: string; description: string; amount: number }[];
  try {
    rows = parseSwedishCsv(text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunde inte tolka CSV" },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Inga transaktioner hittades i filen" }, { status: 400 });
  }

  const connectionId = await getOrCreateManualConnection(company.id);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    // Deduplicate using a hash of date+description+amount
    const externalId = createHash("sha1")
      .update(`${row.date}|${row.description}|${row.amount}`)
      .digest("hex")
      .substring(0, 16);

    try {
      await prisma.bankTransaction.upsert({
        where: {
          bankConnectionId_externalId: { bankConnectionId: connectionId, externalId },
        },
        create: {
          bankConnectionId: connectionId,
          externalId,
          transactionDate: new Date(row.date),
          bookingDate: new Date(row.date),
          description: row.description,
          amount: row.amount,
          currency: "SEK",
          reconciled: false,
        },
        update: {},
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, total: rows.length });
}
