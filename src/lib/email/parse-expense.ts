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
  const invoiceMatch = text.match(/(?:faktura(?:nummer|nr)?|order(?:nummer|nr)?|kvitto(?:nummer|nr)?|ref(?:erensnummer)?)[\s:#]*([A-Z0-9-]+)/i);
  if (invoiceMatch) {
    result.invoiceNumber = invoiceMatch[1];
  }

  // Extract dates (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
  const isoDate = text.match(/\d{4}-\d{2}-\d{2}/g);
  const seDate = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (isoDate && isoDate.length > 0) {
    result.issueDate = isoDate[0];
    if (isoDate.length > 1) result.dueDate = isoDate[1];
  } else if (seDate) {
    result.issueDate = `${seDate[3]}-${seDate[2]}-${seDate[1]}`;
  }

  // Extract total amount — many common Swedish phrasings + bare amounts
  const totalMatch = text.match(
    /(?:totalt?|att betala|summa|total|belopp|pris|kostnad|debiteras|betalt?|charged|amount)[\s:]*([0-9\s]+[,.]?\d*)\s*(?:kr|:-|SEK|sek)?/i
  ) ?? text.match(/([0-9]+[,.]?\d*)\s*(?:kr|:-|SEK)\b/i);
  if (totalMatch) {
    const cleanAmount = totalMatch[1].replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(cleanAmount);
    if (!isNaN(parsed) && parsed > 0) {
      result.totalAmount = parsed;
      result.currency = "SEK";
    }
  }

  // Extract VAT
  const vatMatch = text.match(/(?:moms|vat|mervärdesskatt)[\s:]*([0-9\s,.]+)\s*(?:kr|:-|SEK|sek)/i);
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
