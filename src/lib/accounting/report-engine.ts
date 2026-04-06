import { prisma } from "@/lib/prisma";
import type { ProfitLossReport, BalanceSheetReport, VatSummary, AccountTotal } from "@/types/accounting";

export async function getProfitLoss(
  companyId: string,
  from: Date,
  to: Date
): Promise<ProfitLossReport> {
  // Get all journal lines within the period
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId,
        entryDate: { gte: from, lte: to },
      },
    },
    include: {
      journalEntry: true,
      debitAccount: true,
      creditAccount: true,
    },
  });

  const revenueMap = new Map<string, AccountTotal>();
  const expenseMap = new Map<string, AccountTotal>();

  for (const line of lines) {
    const amount = typeof line.amountSek === "number" ? line.amountSek : (line.amountSek as unknown as { toNumber: () => number }).toNumber();

    // Credit to REVENUE accounts = revenue
    if (line.creditAccount?.type === "REVENUE") {
      const key = line.creditAccount.id;
      const existing = revenueMap.get(key);
      revenueMap.set(key, {
        accountNumber: line.creditAccount.accountNumber,
        accountName: line.creditAccount.name,
        amount: (existing?.amount ?? 0) + amount,
      });
    }

    // Debit to REVENUE accounts = negative revenue (credit note)
    if (line.debitAccount?.type === "REVENUE") {
      const key = line.debitAccount.id;
      const existing = revenueMap.get(key);
      revenueMap.set(key, {
        accountNumber: line.debitAccount.accountNumber,
        accountName: line.debitAccount.name,
        amount: (existing?.amount ?? 0) - amount,
      });
    }

    // Debit to EXPENSE accounts = expense
    if (line.debitAccount?.type === "EXPENSE") {
      const key = line.debitAccount.id;
      const existing = expenseMap.get(key);
      expenseMap.set(key, {
        accountNumber: line.debitAccount.accountNumber,
        accountName: line.debitAccount.name,
        amount: (existing?.amount ?? 0) + amount,
      });
    }

    // Credit to EXPENSE accounts = negative expense (reversal)
    if (line.creditAccount?.type === "EXPENSE") {
      const key = line.creditAccount.id;
      const existing = expenseMap.get(key);
      expenseMap.set(key, {
        accountNumber: line.creditAccount.accountNumber,
        accountName: line.creditAccount.name,
        amount: (existing?.amount ?? 0) - amount,
      });
    }
  }

  const revenue = Array.from(revenueMap.values()).sort((a, b) => a.accountNumber - b.accountNumber);
  const expenses = Array.from(expenseMap.values()).sort((a, b) => a.accountNumber - b.accountNumber);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netResult: totalRevenue - totalExpenses,
    periodStart: from,
    periodEnd: to,
  };
}

export async function getBalanceSheet(
  companyId: string,
  asOf: Date
): Promise<BalanceSheetReport> {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId,
        entryDate: { lte: asOf },
      },
    },
    include: {
      debitAccount: true,
      creditAccount: true,
    },
  });

  const assetMap = new Map<string, AccountTotal>();
  const liabilityMap = new Map<string, AccountTotal>();
  const equityMap = new Map<string, AccountTotal>();

  for (const line of lines) {
    const amount = typeof line.amountSek === "number" ? line.amountSek : (line.amountSek as unknown as { toNumber: () => number }).toNumber();

    // Assets: debit increases, credit decreases
    if (line.debitAccount?.type === "ASSET") {
      const key = line.debitAccount.id;
      const existing = assetMap.get(key);
      assetMap.set(key, {
        accountNumber: line.debitAccount.accountNumber,
        accountName: line.debitAccount.name,
        amount: (existing?.amount ?? 0) + amount,
      });
    }
    if (line.creditAccount?.type === "ASSET") {
      const key = line.creditAccount.id;
      const existing = assetMap.get(key);
      assetMap.set(key, {
        accountNumber: line.creditAccount.accountNumber,
        accountName: line.creditAccount.name,
        amount: (existing?.amount ?? 0) - amount,
      });
    }

    // Liabilities: credit increases, debit decreases
    if (line.creditAccount?.type === "LIABILITY") {
      const key = line.creditAccount.id;
      const existing = liabilityMap.get(key);
      liabilityMap.set(key, {
        accountNumber: line.creditAccount.accountNumber,
        accountName: line.creditAccount.name,
        amount: (existing?.amount ?? 0) + amount,
      });
    }
    if (line.debitAccount?.type === "LIABILITY") {
      const key = line.debitAccount.id;
      const existing = liabilityMap.get(key);
      liabilityMap.set(key, {
        accountNumber: line.debitAccount.accountNumber,
        accountName: line.debitAccount.name,
        amount: (existing?.amount ?? 0) - amount,
      });
    }

    // Equity: credit increases, debit decreases
    if (line.creditAccount?.type === "EQUITY") {
      const key = line.creditAccount.id;
      const existing = equityMap.get(key);
      equityMap.set(key, {
        accountNumber: line.creditAccount.accountNumber,
        accountName: line.creditAccount.name,
        amount: (existing?.amount ?? 0) + amount,
      });
    }
    if (line.debitAccount?.type === "EQUITY") {
      const key = line.debitAccount.id;
      const existing = equityMap.get(key);
      equityMap.set(key, {
        accountNumber: line.debitAccount.accountNumber,
        accountName: line.debitAccount.name,
        amount: (existing?.amount ?? 0) - amount,
      });
    }
  }

  const assets = Array.from(assetMap.values())
    .filter((a) => a.amount !== 0)
    .sort((a, b) => a.accountNumber - b.accountNumber);
  const liabilities = Array.from(liabilityMap.values())
    .filter((a) => a.amount !== 0)
    .sort((a, b) => a.accountNumber - b.accountNumber);
  const equity = Array.from(equityMap.values())
    .filter((a) => a.amount !== 0)
    .sort((a, b) => a.accountNumber - b.accountNumber);

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.amount, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.amount, 0);

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    asOf,
  };
}

export async function getVatSummary(
  companyId: string,
  from: Date,
  to: Date
): Promise<VatSummary> {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId,
        entryDate: { gte: from, lte: to },
      },
    },
    include: {
      journalEntry: true,
      debitAccount: true,
      creditAccount: true,
    },
  });

  let box10 = 0; // Utgående moms 25%
  let box11 = 0; // Utgående moms 12%
  let box12 = 0; // Utgående moms 6%
  let box30 = 0; // Ingående moms
  let box05 = 0; // Momspliktig försäljning 25%
  let box06 = 0; // Momspliktig försäljning 12%
  let box07 = 0; // Momspliktig försäljning 6%

  for (const line of lines) {
    const amount = typeof line.amountSek === "number" ? line.amountSek : (line.amountSek as unknown as { toNumber: () => number }).toNumber();

    // Utgående moms accounts (credited = VAT collected)
    if (line.creditAccount?.accountNumber === 2610) box10 += amount;
    if (line.creditAccount?.accountNumber === 2620) box11 += amount;
    if (line.creditAccount?.accountNumber === 2630) box12 += amount;

    // Ingående moms (2640 debited = VAT paid to suppliers)
    if (line.debitAccount?.accountNumber === 2640) box30 += amount;

    // Revenue accounts for sales base
    if (line.creditAccount?.type === "REVENUE") {
      const vatCode = line.creditAccount.vatCode;
      if (vatCode === "MP1") box05 += amount;
      else if (vatCode === "MP2") box06 += amount;
      else if (vatCode === "MP3") box07 += amount;
    }
  }

  // Box 49 = total VAT to pay (utgående - ingående)
  const box49 = box10 + box11 + box12 - box30;

  return {
    box05: Math.round(box05 * 100) / 100,
    box06: Math.round(box06 * 100) / 100,
    box07: Math.round(box07 * 100) / 100,
    box10: Math.round(box10 * 100) / 100,
    box11: Math.round(box11 * 100) / 100,
    box12: Math.round(box12 * 100) / 100,
    box30: Math.round(box30 * 100) / 100,
    box49: Math.round(box49 * 100) / 100,
    periodStart: from,
    periodEnd: to,
  };
}
