export type ExpenseStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "BOOKED";
export type ExpenseSource = "MANUAL" | "PHOTO_OCR" | "EMAIL_PARSED" | "BANK_IMPORT";

export interface OcrData {
  supplierName?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  vatAmount?: number;
  currency?: string;
  rawText?: string;
  confidence?: number;
  [key: string]: unknown; // Allow JSON serialization
}

export interface ExpenseWithSupplier {
  id: string;
  companyId: string;
  supplierId?: string | null;
  status: ExpenseStatus;
  source: ExpenseSource;
  rawImageUrl?: string | null;
  rawEmailId?: string | null;
  ocrData?: OcrData | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  issueDate?: Date | null;
  dueDate?: Date | null;
  currency: string;
  subtotalSek?: number | null;
  vatAmountSek?: number | null;
  totalSek?: number | null;
  vatRate?: number | null;
  accountNumber?: number | null;
  description?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier?: {
    id: string;
    name: string;
    orgNumber?: string | null;
    vatNumber?: string | null;
  } | null;
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING_REVIEW: "Väntar granskning",
  APPROVED: "Godkänd",
  REJECTED: "Avvisad",
  BOOKED: "Bokförd",
};

export const EXPENSE_SOURCE_LABELS: Record<ExpenseSource, string> = {
  MANUAL: "Manuell",
  PHOTO_OCR: "Foto/OCR",
  EMAIL_PARSED: "E-post",
  BANK_IMPORT: "Bankimport",
};
