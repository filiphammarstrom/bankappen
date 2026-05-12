import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import type { SieFile } from "./parser";

function sieAccountType(num: number): "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" {
  if (num < 2000) return "ASSET";
  if (num < 3000) return (num >= 2080 && num <= 2099) ? "EQUITY" : "LIABILITY";
  if (num < 4000) return "REVENUE";
  if (num < 8000) return "EXPENSE";
  if (num < 8400) return "REVENUE";
  return "EXPENSE";
}

function sieToIsoDate(yyyymmdd: string): Date {
  return new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`);
}

export interface ImportResult {
  accountsCreated: number;
  accountsUpdated: number;
  openingBalancesImported: number;
  verificationsImported: number;
  transactionsImported: number;
  skipped: number;
}

export async function importSie(
  companyId: string,
  userId: string,
  sie: SieFile
): Promise<ImportResult> {
  const result: ImportResult = {
    accountsCreated: 0,
    accountsUpdated: 0,
    openingBalancesImported: 0,
    verificationsImported: 0,
    transactionsImported: 0,
    skipped: 0,
  };

  const validAccounts = sie.accounts.filter((a) => a.number && !isNaN(a.number));

  // 1. Batch upsert accounts
  const existing = await prisma.chartOfAccount.findMany({ where: { companyId } });
  const existingMap = new Map(existing.map((a) => [a.accountNumber, a]));

  const toCreate = validAccounts.filter((a) => !existingMap.has(a.number));
  const toUpdate = validAccounts.filter((a) => existingMap.has(a.number));

  if (toCreate.length > 0) {
    await prisma.chartOfAccount.createMany({
      data: toCreate.map((a) => ({
        companyId,
        accountNumber: a.number,
        name: a.name,
        type: sieAccountType(a.number),
      })),
      skipDuplicates: true,
    });
    result.accountsCreated = toCreate.length;
  }

  // Skip updating existing account names — not worth the per-row round trips
  result.accountsUpdated = toUpdate.length;

  // 2. Build account map
  const allAccounts = await prisma.chartOfAccount.findMany({ where: { companyId } });
  const accountMap = new Map(allAccounts.map((a) => [a.accountNumber, a.id]));

  // 3. Ensure fiscal year
  let fiscalYear = null;
  if (sie.fiscalYearStart && sie.fiscalYearEnd) {
    const start = sieToIsoDate(sie.fiscalYearStart);
    const end = sieToIsoDate(sie.fiscalYearEnd);
    fiscalYear = await prisma.fiscalYear.findFirst({ where: { companyId, startDate: start } });
    if (!fiscalYear) {
      fiscalYear = await prisma.fiscalYear.create({
        data: { companyId, startDate: start, endDate: end },
      });
    }
  }

  // 4. Opening balances
  const ibEntries = sie.openingBalances.filter((b) => b.year === 0 && b.amount !== 0);
  if (ibEntries.length > 0) {
    await prisma.journalEntry.deleteMany({ where: { companyId, source: "OPENING_BALANCE" } });
    const nextNum = await getNextEntryNumber(companyId);
    const ibLines = ibEntries.filter((b) => accountMap.has(b.accountNumber));
    const ibId = randomUUID();

    await prisma.journalEntry.create({
      data: {
        id: ibId,
        companyId,
        fiscalYearId: fiscalYear?.id ?? null,
        entryNumber: nextNum,
        entryDate: sie.fiscalYearStart ? sieToIsoDate(sie.fiscalYearStart) : new Date(),
        description: "Ingående balanser (SIE-import)",
        source: "OPENING_BALANCE",
        createdByUserId: userId,
        lines: {
          create: ibLines.map((b) => {
            const accId = accountMap.get(b.accountNumber)!;
            return b.amount > 0
              ? { debitAccountId: accId, creditAccountId: null, amountSek: b.amount }
              : { debitAccountId: null, creditAccountId: accId, amountSek: Math.abs(b.amount) };
          }),
        },
      },
    });
    result.openingBalancesImported = ibLines.length;
  }

  // 5. Import verifications using createMany for both entries and lines
  await prisma.journalEntry.deleteMany({
    where: { companyId, source: "MANUAL", description: { contains: "[SIE]" } },
  });

  let entryCounter = await getNextEntryNumber(companyId);

  // Build all valid verifications with pre-generated IDs
  const verRows: {
    id: string;
    entryNumber: number;
    entryDate: Date;
    description: string;
    lines: { accountId: string; amount: number; description: string | null; isDebit: boolean }[];
  }[] = [];

  for (const ver of sie.verifications) {
    const validTrans = ver.transactions.filter(
      (t) => t.amount !== 0 && accountMap.has(t.accountNumber)
    );
    if (validTrans.length === 0) { result.skipped++; continue; }

    verRows.push({
      id: randomUUID(),
      entryNumber: entryCounter++,
      entryDate: ver.date ? sieToIsoDate(ver.date) : new Date(),
      description: `[SIE] ${ver.series}${ver.number} ${ver.description}`.trim(),
      lines: validTrans.map((t) => ({
        accountId: accountMap.get(t.accountNumber)!,
        amount: Math.abs(t.amount),
        description: t.description || null,
        isDebit: t.amount > 0,
      })),
    });
  }

  if (verRows.length > 0) {
    // Single createMany for all journal entries
    await prisma.journalEntry.createMany({
      data: verRows.map((v) => ({
        id: v.id,
        companyId,
        fiscalYearId: fiscalYear?.id ?? null,
        entryNumber: v.entryNumber,
        entryDate: v.entryDate,
        description: v.description,
        source: "MANUAL" as const,
        createdByUserId: userId,
      })),
    });

    // Single createMany for all lines
    const allLines = verRows.flatMap((v) =>
      v.lines.map((l) => ({
        journalEntryId: v.id,
        debitAccountId: l.isDebit ? l.accountId : null,
        creditAccountId: l.isDebit ? null : l.accountId,
        amountSek: l.amount,
        description: l.description,
      }))
    );

    // createMany in chunks of 1000 to avoid parameter limits
    for (let i = 0; i < allLines.length; i += 1000) {
      await prisma.journalLine.createMany({ data: allLines.slice(i, i + 1000) });
    }

    result.verificationsImported = verRows.length;
    result.transactionsImported = allLines.length;
  }

  return result;
}

async function getNextEntryNumber(companyId: string): Promise<number> {
  const last = await prisma.journalEntry.findFirst({
    where: { companyId },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });
  return (last?.entryNumber ?? 0) + 1;
}
