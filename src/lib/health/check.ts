import { prisma } from "@/lib/prisma";

export interface HealthIssue {
  severity: "error" | "warning" | "info";
  message: string;
  link?: string;
}

export async function runHealthCheck(companyId: string): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const now = new Date();

  const [company, fiscalYears, accounts, customers, overdueInvoices, stalePendingExpenses] =
    await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.fiscalYear.findMany({ where: { companyId } }),
      prisma.chartOfAccount.count({ where: { companyId } }),
      prisma.customer.findMany({
        where: { companyId },
        select: { id: true, name: true, email: true },
      }),
      prisma.invoice.findMany({
        where: { companyId, status: "SENT", dueDate: { lt: now } },
        select: { id: true, invoiceNumber: true },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          status: "PENDING_REVIEW",
          createdAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      }),
    ]);

  if (!company) return issues;

  // --- Company info ---
  if (!company.vatNumber) {
    issues.push({
      severity: "warning",
      message: "Momsregistreringsnummer (VAT) saknas — krävs på fakturor till EU-kunder",
      link: `/companies/${companyId}/settings`,
    });
  }
  if (!company.bankgiro && !company.plusgiro) {
    issues.push({
      severity: "warning",
      message: "Bankgiro/Plusgiro saknas — kunder kan inte betala via bankgiro",
      link: `/companies/${companyId}/settings`,
    });
  }
  if (!company.email) {
    issues.push({
      severity: "warning",
      message: "Företagets e-postadress saknas — används som avsändare på fakturor",
      link: `/companies/${companyId}/settings`,
    });
  }
  if (!company.address || !company.postalCode || !company.city) {
    issues.push({
      severity: "info",
      message: "Företagsadress är ofullständig — visas på fakturor",
      link: `/companies/${companyId}/settings`,
    });
  }

  // --- Accounting setup ---
  if (fiscalYears.length === 0) {
    issues.push({
      severity: "error",
      message: "Inget räkenskapsår är inställt — rapporter och bokföring fungerar inte korrekt",
      link: `/companies/${companyId}/settings`,
    });
  } else {
    const currentFY = fiscalYears.find(
      (fy) => fy.startDate <= now && fy.endDate >= now
    );
    if (!currentFY) {
      issues.push({
        severity: "warning",
        message: "Inget räkenskapsår täcker dagens datum",
        link: `/companies/${companyId}/settings`,
      });
    }
  }

  if (accounts === 0) {
    issues.push({
      severity: "error",
      message: "Kontoplanen är tom — importera en SIE-fil eller lägg till konton manuellt",
      link: `/companies/${companyId}/sie`,
    });
  }

  // --- Invoices ---
  if (overdueInvoices.length > 0) {
    issues.push({
      severity: "warning",
      message: `${overdueInvoices.length} faktura${overdueInvoices.length > 1 ? "r" : ""} har passerat förfallodatum utan betalning`,
      link: "/betalningar",
    });
  }

  // --- Expenses ---
  if (stalePendingExpenses.length > 0) {
    issues.push({
      severity: "info",
      message: `${stalePendingExpenses.length} utgift${stalePendingExpenses.length > 1 ? "er" : ""} har legat ogranskat i mer än 14 dagar`,
      link: "/expenses",
    });
  }

  // --- Customers ---
  const customersWithoutEmail = customers.filter((c) => !c.email);
  if (customersWithoutEmail.length > 0) {
    issues.push({
      severity: "info",
      message: `${customersWithoutEmail.length} kund${customersWithoutEmail.length > 1 ? "er" : ""} saknar e-postadress — fakturor kan inte skickas till dem`,
      link: "/customers",
    });
  }

  return issues;
}
