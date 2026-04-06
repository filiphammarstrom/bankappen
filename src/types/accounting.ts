export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface BasAccount {
  accountNumber: number;
  name: string;
  type: AccountType;
  vatCode?: string;
}

export interface JournalEntryLine {
  debitAccountNumber?: number;
  creditAccountNumber?: number;
  amountSek: number;
  description?: string;
  vatCode?: string;
}

export interface ProfitLossReport {
  revenue: AccountTotal[];
  expenses: AccountTotal[];
  totalRevenue: number;
  totalExpenses: number;
  netResult: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface BalanceSheetReport {
  assets: AccountTotal[];
  liabilities: AccountTotal[];
  equity: AccountTotal[];
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  asOf: Date;
}

export interface AccountTotal {
  accountNumber: number;
  accountName: string;
  amount: number;
}

export interface VatSummary {
  box05: number; // Momspliktig försäljning 25%
  box06: number; // Momspliktig försäljning 12%
  box07: number; // Momspliktig försäljning 6%
  box10: number; // Utgående moms 25%
  box11: number; // Utgående moms 12%
  box12: number; // Utgående moms 6%
  box30: number; // Ingående moms
  box49: number; // Moms att betala/återfå
  periodStart: Date;
  periodEnd: Date;
}
