export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CREDITED"
  | "CANCELLED";

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
  accountNumber?: number;
  sortOrder?: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  deliveryDate?: Date;
  currency?: string;
  reverseCharge?: boolean;
  buyerVatNumber?: string;
  notes?: string;
  ourReference?: string;
  yourReference?: string;
  lines: InvoiceLineInput[];
}

export interface InvoiceWithLines {
  id: string;
  companyId: string;
  customerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  deliveryDate?: Date | null;
  currency: string;
  reverseCharge: boolean;
  buyerVatNumber?: string | null;
  subtotalSek: number;
  vatAmountSek: number;
  totalSek: number;
  paidAmountSek: number;
  notes?: string | null;
  ourReference?: string | null;
  yourReference?: string | null;
  sentAt?: Date | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    orgNumber?: string | null;
    vatNumber?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country: string;
  };
  lines: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
    unit?: string | null;
    accountNumber?: number | null;
    sortOrder: number;
  }[];
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Utkast",
  SENT: "Skickad",
  PARTIALLY_PAID: "Delbetalad",
  PAID: "Betald",
  OVERDUE: "Förfallen",
  CREDITED: "Krediterad",
  CANCELLED: "Makulerad",
};
