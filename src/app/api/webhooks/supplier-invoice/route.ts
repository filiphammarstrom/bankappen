export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExpenseEmail, parsedExpenseToOcrData } from "@/lib/email/parse-expense";
import { extractReceiptData } from "@/lib/ocr/google-vision";
import { uploadFileToDrive } from "@/lib/drive/google-drive";

/**
 * Inbound email webhook for supplier invoices.
 *
 * Configure Postmark Inbound to POST to /api/webhooks/supplier-invoice.
 * Each company's supplier invoice address:  faktura+{companyId}@{NEXT_PUBLIC_POSTMARK_INBOUND_DOMAIN}
 *
 * The webhook secret in X-Webhook-Secret must match WEBHOOK_SECRET env var.
 */

interface PostmarkInboundPayload {
  From?: string;
  FromFull?: { Email?: string; Name?: string };
  To?: string;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  MailboxHash?: string; // value after "+" in the to-address
  MessageID?: string;
  Attachments?: {
    Name?: string;
    Content?: string; // base64
    ContentType?: string;
  }[];
}

interface GenericPayload {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  mailboxHash?: string;
  messageId?: string;
  attachments?: { filename?: string; content?: string; contentType?: string }[];
}

function normalise(body: unknown) {
  const pm = body as PostmarkInboundPayload;
  const gn = body as GenericPayload;

  const from =
    pm.FromFull?.Email
      ? `${pm.FromFull.Name ?? ""} <${pm.FromFull.Email}>`
      : (pm.From ?? gn.from ?? "");

  const to = pm.To ?? gn.to ?? "";
  const subject = pm.Subject ?? gn.subject ?? "";
  const text = pm.TextBody ?? gn.text ?? "";
  const html = pm.HtmlBody ?? gn.html ?? "";
  const messageId = pm.MessageID ?? gn.messageId ?? "";

  // Extract companyId from mailbox hash (faktura+{companyId}@...)
  const hashFromHeader = pm.MailboxHash ?? gn.mailboxHash;
  const hashFromTo = to.match(/\+([^@]+)@/)?.[1];
  const companyId = hashFromHeader ?? hashFromTo ?? null;

  const rawAttachments = pm.Attachments ?? gn.attachments ?? [];
  const attachments = rawAttachments.map((a) => {
    const pm = a as { Name?: string; Content?: string; ContentType?: string };
    const gn = a as { filename?: string; content?: string; contentType?: string };
    return {
      filename: pm.Name ?? gn.filename ?? "attachment",
      content: pm.Content ?? gn.content ?? "",
      contentType: pm.ContentType ?? gn.contentType ?? "application/octet-stream",
    };
  });

  return { from, to, subject, text, html, messageId, companyId, attachments };
}

export async function POST(req: Request) {
  // Validate webhook secret
  const secret = req.headers.get("x-webhook-secret") ?? req.headers.get("x-postmark-inbound-webhook-token");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Ogiltig webhook-nyckel" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const { from, subject, text, html, messageId, companyId, attachments } = normalise(rawBody);

  if (!companyId) {
    return NextResponse.json({ error: "Kunde inte bestämma företag från e-postadressen" }, { status: 400 });
  }

  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Företag hittades inte" }, { status: 404 });
  }

  // Parse email body for basic data
  const parsed = parseExpenseEmail({
    from,
    to: `faktura+${companyId}@`,
    subject,
    text,
    html,
    attachments,
  });

  let ocrData = parsedExpenseToOcrData(parsed);

  // Find PDF attachment
  const pdfAttachment = attachments.find(
    (a) => a.contentType === "application/pdf" || a.filename?.toLowerCase().endsWith(".pdf")
  );

  // OCR the PDF if present
  if (pdfAttachment?.content) {
    try {
      const pdfBuffer = Buffer.from(pdfAttachment.content, "base64");
      const visionData = await extractReceiptData(pdfBuffer, "application/pdf");
      // Merge — Vision results take precedence where available
      ocrData = {
        ...ocrData,
        ...Object.fromEntries(
          Object.entries(visionData).filter(([, v]) => v !== undefined && v !== "" && v !== 0)
        ),
      };
    } catch (err) {
      console.warn("OCR misslyckades, fortsätter med e-postparsning:", err instanceof Error ? err.message : err);
    }
  }

  // Upload PDF to Google Drive
  let driveFileId: string | null = null;
  let driveUrl: string | null = null;
  if (pdfAttachment?.content) {
    const pdfBuffer = Buffer.from(pdfAttachment.content, "base64");
    const filename = pdfAttachment.filename ?? `leverantörsfaktura-${Date.now()}.pdf`;
    const result = await uploadFileToDrive(filename, "application/pdf", pdfBuffer);
    if (result) {
      driveFileId = result.fileId;
      driveUrl = result.webViewLink;
    }
  }

  // Find or create supplier
  let supplierId: string | null = null;
  if (parsed.supplierEmail || parsed.supplierName) {
    const existingSupplier = parsed.supplierEmail
      ? await prisma.supplier.findFirst({
          where: { companyId, email: parsed.supplierEmail },
        })
      : null;

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else if (parsed.supplierName) {
      const newSupplier = await prisma.supplier.create({
        data: {
          companyId,
          name: parsed.supplierName,
          email: parsed.supplierEmail ?? null,
        },
      });
      supplierId = newSupplier.id;
    }
  }

  // Create expense record (pending review)
  const expense = await prisma.expense.create({
    data: {
      companyId,
      supplierId,
      source: "EMAIL_PARSED",
      status: "PENDING_REVIEW",
      rawEmailId: messageId || null,
      ocrData: ocrData as object,
      supplierName: ocrData.supplierName ?? parsed.supplierName ?? null,
      invoiceNumber: ocrData.invoiceNumber ?? null,
      issueDate: ocrData.issueDate ? new Date(ocrData.issueDate) : null,
      dueDate: ocrData.dueDate ? new Date(ocrData.dueDate) : null,
      totalSek: ocrData.totalAmount ?? null,
      vatAmountSek: ocrData.vatAmount ?? null,
      currency: ocrData.currency ?? "SEK",
      driveFileId,
      driveUrl,
    },
  });

  return NextResponse.json({ ok: true, expenseId: expense.id }, { status: 201 });
}
