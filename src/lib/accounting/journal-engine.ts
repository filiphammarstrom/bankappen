import { prisma } from "@/lib/prisma";
import { getVatAccountByRate, getRevenueAccountByRate } from "./bas-accounts";

interface InvoiceForJournal {
  id: string;
  invoiceNumber: string;
  subtotalSek: number | { toNumber: () => number };
  vatAmountSek: number | { toNumber: () => number };
  totalSek: number | { toNumber: () => number };
  customerId: string;
  lines: {
    lineTotal: number | { toNumber: () => number };
    vatAmount: number | { toNumber: () => number };
    vatRate: number | { toNumber: () => number };
    accountNumber?: number | null;
  }[];
}

interface ExpenseForJournal {
  id: string;
  supplierName?: string | null;
  totalSek: number | { toNumber: () => number } | null;
  vatAmountSek: number | { toNumber: () => number } | null;
  subtotalSek: number | { toNumber: () => number } | null;
  accountNumber?: number | null;
}

interface PaymentForJournal {
  id: string;
  amount: number | { toNumber: () => number };
  paymentDate: Date;
}

function toNumber(val: number | { toNumber: () => number } | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
}

async function getNextEntryNumber(companyId: string): Promise<number> {
  const last = await prisma.journalEntry.findFirst({
    where: { companyId },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });
  return (last?.entryNumber ?? 0) + 1;
}

async function getAccountId(companyId: string, accountNumber: number): Promise<string | null> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { companyId_accountNumber: { companyId, accountNumber } },
    select: { id: true },
  });
  return account?.id ?? null;
}

/**
 * Create journal entry for invoice creation
 * DR 1510 Kundfordringar (total incl VAT)
 * CR 3001/3040/3051 Försäljning (per line, ex VAT)
 * CR 2610/2620/2630 Utgående moms (per VAT rate)
 */
export async function createInvoiceJournalEntry(
  invoice: InvoiceForJournal,
  companyId: string
): Promise<string> {
  const entryNumber = await getNextEntryNumber(companyId);
  const totalSek = toNumber(invoice.totalSek);
  const account1510 = await getAccountId(companyId, 1510);

  // Build lines
  const lines: {
    debitAccountId?: string | null;
    creditAccountId?: string | null;
    amountSek: number;
    description?: string;
    vatCode?: string;
  }[] = [];

  // Debit: 1510 Kundfordringar
  if (account1510) {
    lines.push({
      debitAccountId: account1510,
      amountSek: totalSek,
      description: `Faktura ${invoice.invoiceNumber}`,
    });
  }

  // Group lines by VAT rate
  const vatGroups = new Map<number, { subtotal: number; vat: number; accountNumber?: number | null }>();

  for (const line of invoice.lines) {
    const rate = toNumber(line.vatRate);
    const lineTotal = toNumber(line.lineTotal);
    const vatAmount = toNumber(line.vatAmount);
    const exVat = lineTotal - vatAmount;

    const existing = vatGroups.get(rate) ?? { subtotal: 0, vat: 0, accountNumber: line.accountNumber };
    vatGroups.set(rate, {
      subtotal: existing.subtotal + exVat,
      vat: existing.vat + vatAmount,
      accountNumber: line.accountNumber ?? existing.accountNumber,
    });
  }

  for (const [rate, group] of Array.from(vatGroups.entries())) {
    const revenueAccountNum = group.accountNumber ?? getRevenueAccountByRate(rate);
    const vatAccountNum = getVatAccountByRate(rate);

    const revenueAccountId = await getAccountId(companyId, revenueAccountNum);
    const vatAccountId = await getAccountId(companyId, vatAccountNum);

    if (revenueAccountId && group.subtotal > 0) {
      lines.push({
        creditAccountId: revenueAccountId,
        amountSek: Math.round(group.subtotal * 100) / 100,
        description: `Försäljning ${rate}% moms`,
      });
    }

    if (vatAccountId && group.vat > 0) {
      lines.push({
        creditAccountId: vatAccountId,
        amountSek: Math.round(group.vat * 100) / 100,
        description: `Utgående moms ${rate}%`,
        vatCode: rate === 25 ? "MP1" : rate === 12 ? "MP2" : "MP3",
      });
    }
  }

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNumber,
      entryDate: new Date(),
      description: `Faktura ${invoice.invoiceNumber}`,
      source: "INVOICE_CREATED",
      invoiceId: invoice.id,
      lines: {
        create: lines,
      },
    },
  });

  return entry.id;
}

/**
 * Create journal entry for invoice payment
 * DR 1930 Företagskonto
 * CR 1510 Kundfordringar
 */
export async function createPaymentJournalEntry(
  payment: PaymentForJournal,
  invoice: { id: string; invoiceNumber: string },
  companyId: string
): Promise<string> {
  const entryNumber = await getNextEntryNumber(companyId);
  const amount = toNumber(payment.amount);
  const account1930 = await getAccountId(companyId, 1930);
  const account1510 = await getAccountId(companyId, 1510);

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNumber,
      entryDate: payment.paymentDate,
      description: `Betalning faktura ${invoice.invoiceNumber}`,
      source: "INVOICE_PAID",
      invoiceId: invoice.id,
      lines: {
        create: [
          {
            debitAccountId: account1930,
            amountSek: amount,
            description: "Betalning mottagen",
          },
          {
            creditAccountId: account1510,
            amountSek: amount,
            description: `Reglering kundfordran faktura ${invoice.invoiceNumber}`,
          },
        ],
      },
    },
  });

  return entry.id;
}

/**
 * Create journal entry for expense/supplier invoice
 * DR expense account (e.g., 5010)
 * DR 2640 Ingående moms
 * CR 2440 Leverantörsskulder
 */
export async function createExpenseJournalEntry(
  expense: ExpenseForJournal,
  companyId: string
): Promise<string> {
  const entryNumber = await getNextEntryNumber(companyId);
  const totalSek = toNumber(expense.totalSek);
  const vatAmountSek = toNumber(expense.vatAmountSek);
  const subtotalSek = toNumber(expense.subtotalSek);

  const expenseAccountNum = expense.accountNumber ?? 4010;
  const expenseAccountId = await getAccountId(companyId, expenseAccountNum);
  const account2640 = await getAccountId(companyId, 2640);
  const account2440 = await getAccountId(companyId, 2440);

  const lines: {
    debitAccountId?: string | null;
    creditAccountId?: string | null;
    amountSek: number;
    description?: string;
    vatCode?: string;
  }[] = [];

  // Debit expense account
  if (expenseAccountId && subtotalSek > 0) {
    lines.push({
      debitAccountId: expenseAccountId,
      amountSek: subtotalSek,
      description: expense.supplierName ?? "Leverantörsfaktura",
    });
  }

  // Debit ingående moms
  if (account2640 && vatAmountSek > 0) {
    lines.push({
      debitAccountId: account2640,
      amountSek: vatAmountSek,
      description: "Ingående moms",
      vatCode: "I",
    });
  }

  // Credit leverantörsskuld
  if (account2440 && totalSek > 0) {
    lines.push({
      creditAccountId: account2440,
      amountSek: totalSek,
      description: expense.supplierName ?? "Leverantörsskuld",
    });
  }

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNumber,
      entryDate: new Date(),
      description: `Utgift: ${expense.supplierName ?? "Okänd leverantör"}`,
      source: "EXPENSE_BOOKED",
      expenseId: expense.id,
      lines: {
        create: lines,
      },
    },
  });

  return entry.id;
}

/**
 * Create journal entry for paying a supplier invoice
 * DR 2440 Leverantörsskulder
 * CR 1930 Företagskonto
 */
export async function createExpensePaymentJournalEntry(
  expense: { id: string; supplierName?: string | null; totalSek: number | { toNumber: () => number } | null },
  companyId: string,
  paymentDate: Date
): Promise<string> {
  const entryNumber = await getNextEntryNumber(companyId);
  const amount = toNumber(expense.totalSek);
  const account2440 = await getAccountId(companyId, 2440);
  const account1930 = await getAccountId(companyId, 1930);

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNumber,
      entryDate: paymentDate,
      description: `Betalning utgift: ${expense.supplierName ?? "Okänd leverantör"}`,
      source: "EXPENSE_BOOKED",
      expenseId: expense.id,
      lines: {
        create: [
          {
            debitAccountId: account2440,
            amountSek: amount,
            description: "Reglering leverantörsskuld",
          },
          {
            creditAccountId: account1930,
            amountSek: amount,
            description: expense.supplierName ?? "Leverantörsbetalning",
          },
        ],
      },
    },
  });

  return entry.id;
}
