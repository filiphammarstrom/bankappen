import { prisma } from "@/lib/prisma";
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

  // 1. Batch upsert accounts — one query to fetch existing, then createMany + batch updates
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

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((a) =>
        prisma.chartOfAccount.update({
          where: { id: existingMap.get(a.number)!.id },
          data: { name: a.name },
        })
      )
    );
    result.accountsUpdated = toUpdate.length;
  }

  // 2. Resolve account id map (re-fetch after creates)
  const allAccounts = await prisma.chartOfAccount.findMany({ where: { companyId } });
  const accountMap = new Map(allAccounts.map((a) => [a.accountNumber, a.id]));

  // 3. Ensure fiscal year exists
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

  // 4. Import opening balances
  const ibEntries = sie.openingBalances.filter((b) => b.year === 0 && b.amount !== 0);
  if (ibEntries.length > 0) {
    await prisma.journalEntry.deleteMany({ where: { companyId, source: "OPENING_BALANCE" } });

    const nextNum = await getNextEntryNumber(companyId);
    const ibLines = ibEntries.filter((b) => accountMap.has(b.accountNumber));

    await prisma.journalEntry.create({
      data: {
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

  // 5. Import verifications in batches to avoid timeouts
  await prisma.journalEntry.deleteMany({
    where: { companyId, source: "MANUAL", description: { contains: "[SIE]" } },
  });

  let entryCounter = await getNextEntryNumber(companyId);

  // Build valid verification list first
  const validVers = sie.verifications
    .map((ver) => ({
      ver,
      lines: ver.transactions.filter((t) => t.amount !== 0 && accountMap.has(t.accountNumber)),
    }))
    .filter(({ lines }) => lines.length > 0);

  result.skipped = sie.verifications.length - validVers.length;

  // Process in batches of 50 to avoid transaction size limits
  const BATCH = 50;
  for (let i = 0; i < validVers.length; i += BATCH) {
    const chunk = validVers.slice(i, i + BATCH);
    await prisma.$transaction(
      chunk.map(({ ver, lines }) => {
        const entryDate = ver.date ? sieToIsoDate(ver.date) : new Date();
        return prisma.journalEntry.create({
          data: {
            companyId,
            fiscalYearId: fiscalYear?.id ?? null,
            entryNumber: entryCounter++,
            entryDate,
            description: `[SIE] ${ver.series}${ver.number} ${ver.description}`.trim(),
            source: "MANUAL",
            createdByUserId: userId,
            lines: {
              create: lines.map((t) => {
                const accId = accountMap.get(t.accountNumber)!;
                return t.amount > 0
                  ? { debitAccountId: accId, creditAccountId: null, amountSek: t.amount, description: t.description || null }
                  : { debitAccountId: null, creditAccountId: accId, amountSek: Math.abs(t.amount), description: t.description || null };
              }),
            },
          },
        });
      })
    );
    result.verificationsImported += chunk.length;
    result.transactionsImported += chunk.reduce((s, { lines }) => s + lines.length, 0);
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
