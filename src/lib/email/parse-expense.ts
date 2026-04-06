import type { OcrData } from "@/types/expense";

interface EmailWebhookPayload {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: {
    filename: string;
    content: string; // base64
    contentType: string;
  }[];
}

interface ParsedExpenseData {
  supplierName?: string;
  supplierEmail?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  vatAmount?: number;
  currency?: string;
  rawEmailId?: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
}

/**
 * Parse incoming email for expense data.
 * This is a basic parser - in production you'd use an NLP service or more sophisticated parsing.
 */
export function parseExpenseEmail(payload: EmailWebhookPayload): ParsedExpenseData {
  const result: ParsedExpenseData = {};

  // Extract sender name from "From" field
  const fromMatch = payload.from.match(/^(.+?)\s*<(.+)>$/);
  if (fromMatch) {
    result.supplierName = fromMatch[1].trim().replace(/"/g, "");
    result.supplierEmail = fromMatch[2].trim();
  } else {
    result.supplierEmail = payload.from.trim();
  }

  const text = payload.text ?? stripHtml(payload.html ?? "");

  // Extract invoice number
  const invoiceMatch = text.match(/faktura(?:nummer|nr)?[\s:]*([A-Z0-9-]+)/i);
  if (invoiceMatch) {
    result.invoiceNumber = invoiceMatch[1];
  }

  // Extract dates (Swedish format YYYY-MM-DD or DD/MM/YYYY)
  const dateMatches = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (dateMatches && dateMatches.length > 0) {
    result.issueDate = dateMatches[0];
    if (dateMatches.length > 1) {
      result.dueDate = dateMatches[1];
    }
  }

  // Extract total amount
  const totalMatch = text.match(/(?:totalt?|att betala|summa|total)[\s:]*([0-9\s,.]+)\s*(?:kr|SEK|sek)/i);
  if (totalMatch) {
    const cleanAmount = totalMatch[1].replace(/\s/g, "").replace(",", ".");
    result.totalAmount = parseFloat(cleanAmount);
    result.currency = "SEK";
  }

  // Extract VAT
  const vatMatch = text.match(/(?:moms|vat|mervärdesskatt)[\s:]*([0-9\s,.]+)\s*(?:kr|SEK|sek)/i);
  if (vatMatch) {
    const cleanAmount = vatMatch[1].replace(/\s/g, "").replace(",", ".");
    result.vatAmount = parseFloat(cleanAmount);
  }

  // Find PDF attachment
  const pdfAttachment = payload.attachments?.find(
    (a) =>
      a.contentType === "application/pdf" ||
      a.filename?.toLowerCase().endsWith(".pdf")
  );
  if (pdfAttachment) {
    result.attachmentBase64 = pdfAttachment.content;
    result.attachmentFilename = pdfAttachment.filename;
  }

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsedExpenseToOcrData(parsed: ParsedExpenseData): OcrData {
  return {
    supplierName: parsed.supplierName,
    invoiceNumber: parsed.invoiceNumber,
    issueDate: parsed.issueDate,
    dueDate: parsed.dueDate,
    totalAmount: parsed.totalAmount,
    vatAmount: parsed.vatAmount,
    currency: parsed.currency ?? "SEK",
    rawText: "Parsad från e-post",
    confidence: 0.7,
  };
}
