// Tink API types (stubbed)
export interface TinkAccount {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "OTHER";
  balance: {
    available: { amount: { value: string; currencyCode: string } };
    booked: { amount: { value: string; currencyCode: string } };
  };
  identifiers: {
    iban?: { iban: string };
  };
}

export interface TinkTransaction {
  id: string;
  accountId: string;
  amount: { value: { unscaledValue: string; scale: string }; currencyCode: string };
  dates: {
    booked?: string;
    value?: string;
  };
  descriptions: {
    original: string;
    display?: string;
    detailed?: { unstructured: string };
  };
  merchantInformation?: {
    merchantName?: string;
    merchantCategoryCode?: string;
  };
  status: "BOOKED" | "PENDING";
  types: {
    type: string;
  };
}

export interface TinkConsentResponse {
  code: string;
  sessionId?: string;
}

export interface TinkTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface BankConnectionWithTransactions {
  id: string;
  companyId: string;
  provider: string;
  accountId: string;
  accountName: string;
  iban?: string | null;
  currency: string;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  transactions: BankTransactionRow[];
}

export interface BankTransactionRow {
  id: string;
  bankConnectionId: string;
  externalId: string;
  transactionDate: Date;
  bookingDate?: Date | null;
  description: string;
  amount: number;
  currency: string;
  merchantName?: string | null;
  category?: string | null;
  reconciled: boolean;
  invoiceId?: string | null;
  expenseId?: string | null;
}
