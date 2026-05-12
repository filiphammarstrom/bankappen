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

  // 1. Upsert chart of accounts
  for (const acc of sie.accounts) {
    if (!acc.number || isNaN(acc.number)) continue;
    const existing = await prisma.chartOfAccount.findUnique({
      where: { companyId_accountNumber: { companyId, accountNumber: acc.number } },
    });
    if (existing) {
      await prisma.chartOfAccount.update({
        where: { id: existing.id },
        data: { name: acc.name },
      });
      result.accountsUpdated++;
    } else {
      await prisma.chartOfAccount.create({
        data: {
          companyId,
          accountNumber: acc.number,
          name: acc.name,
          type: sieAccountType(acc.number),
        },
      });
      result.accountsCreated++;
    }
  }

  // 2. Resolve account id map
  const allAccounts = await prisma.chartOfAccount.findMany({ where: { companyId } });
  const accountMap = new Map(allAccounts.map((a) => [a.accountNumber, a.id]));

  // 3. Ensure fiscal year exists
  let fiscalYear = null;
  if (sie.fiscalYearStart && sie.fiscalYearEnd) {
    const start = sieToIsoDate(sie.fiscalYearStart);
    const end = sieToIsoDate(sie.fiscalYearEnd);
    fiscalYear = await prisma.fiscalYear.findFirst({
      where: { companyId, startDate: start },
    });
    if (!fiscalYear) {
      fiscalYear = await prisma.fiscalYear.create({
        data: { companyId, startDate: start, endDate: end },
      });
    }
  }

  // 4. Import opening balances (IB year=0 only)
  const ibEntries = sie.openingBalances.filter((b) => b.year === 0 && b.amount !== 0);
  if (ibEntries.length > 0) {
    // Delete old opening balance entry if exists
    await prisma.journalEntry.deleteMany({
      where: { companyId, source: "OPENING_BALANCE" },
    });

    const nextNum = await getNextEntryNumber(companyId);
    const entry = await prisma.journalEntry.create({
      data: {
        companyId,
        fiscalYearId: fiscalYear?.id ?? null,
        entryNumber: nextNum,
        entryDate: sie.fiscalYearStart ? sieToIsoDate(sie.fiscalYearStart) : new Date(),
        description: "Ingående balanser (SIE-import)",
        source: "OPENING_BALANCE",
        createdByUserId: userId,
        lines: {
          create: ibEntries
            .filter((b) => accountMap.has(b.accountNumber))
            .map((b) => {
              const accId = accountMap.get(b.accountNumber)!;
              return b.amount > 0
                ? { debitAccountId: accId, creditAccountId: null, amountSek: b.amount }
                : { debitAccountId: null, creditAccountId: accId, amountSek: Math.abs(b.amount) };
            }),
        },
      },
    });
    result.openingBalancesImported = ibEntries.length;
    void entry;
  }

  // 5. Import verifications
  // Delete existing SIE-imported verifications to allow re-import
  await prisma.journalEntry.deleteMany({
    where: { companyId, source: "MANUAL", description: { contains: "[SIE]" } },
  });

  let entryCounter = await getNextEntryNumber(companyId);

  for (const ver of sie.verifications) {
    const validTrans = ver.transactions.filter(
      (t) => t.amount !== 0 && accountMap.has(t.accountNumber)
    );
    if (validTrans.length === 0) { result.skipped++; continue; }

    const entryDate = ver.date ? sieToIsoDate(ver.date) : new Date();

    await prisma.journalEntry.create({
      data: {
        companyId,
        fiscalYearId: fiscalYear?.id ?? null,
        entryNumber: entryCounter++,
        entryDate,
        description: `[SIE] ${ver.series}${ver.number} ${ver.description}`.trim(),
        source: "MANUAL",
        createdByUserId: userId,
        lines: {
          create: validTrans.map((t) => {
            const accId = accountMap.get(t.accountNumber)!;
            return t.amount > 0
              ? { debitAccountId: accId, creditAccountId: null, amountSek: t.amount, description: t.description || null }
              : { debitAccountId: null, creditAccountId: accId, amountSek: Math.abs(t.amount), description: t.description || null };
          }),
        },
      },
    });

    result.verificationsImported++;
    result.transactionsImported += validTrans.length;
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
