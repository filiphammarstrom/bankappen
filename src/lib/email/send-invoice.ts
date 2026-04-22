import * as postmark from "postmark";
import type { InvoiceWithLines } from "@/types/invoice";

let _client: postmark.ServerClient | null = null;
function getClient(): postmark.ServerClient {
  if (!_client) {
    if (!process.env.POSTMARK_SERVER_TOKEN) {
      throw new Error("POSTMARK_SERVER_TOKEN inte konfigurerad");
    }
    _client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
  }
  return _client;
}

interface SendInvoiceOptions {
  invoice: InvoiceWithLines;
  company: {
    name: string;
    email?: string | null;
    orgNumber: string;
    bankgiro?: string | null;
  };
  pdfBuffer: Buffer;
  recipientEmail: string;
  recipientName: string;
}

export async function sendInvoiceEmail({
  invoice,
  company,
  pdfBuffer,
  recipientEmail,
  recipientName,
}: SendInvoiceOptions): Promise<{ id: string }> {
  const fromEmail = company.email ?? process.env.POSTMARK_FROM_EMAIL ?? "faktura@noreply.se";
  const client = getClient();
  const total = typeof invoice.totalSek === "number" ? invoice.totalSek : Number(invoice.totalSek);
  const formattedTotal = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
  }).format(total);

  const dueDate = new Date(invoice.dueDate).toLocaleDateString("sv-SE");

  const html = `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1d4ed8; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .invoice-box { background: white; padding: 16px; border-radius: 4px; border: 1px solid #e5e7eb; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: bold; font-size: 14px; }
    .total { font-size: 18px; color: #1d4ed8; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0">Faktura från ${company.name}</h2>
    </div>
    <div class="content">
      <p>Hej ${recipientName},</p>
      <p>Vi skickar härmed bifogad faktura. Se detaljer nedan:</p>

      <div class="invoice-box">
        <div class="row">
          <span class="label">Fakturanummer</span>
          <span class="value">${invoice.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Förfallodatum</span>
          <span class="value">${dueDate}</span>
        </div>
        ${invoice.yourReference ? `
        <div class="row">
          <span class="label">Er referens</span>
          <span class="value">${invoice.yourReference}</span>
        </div>` : ""}
        <div class="row" style="border-bottom:none">
          <span class="label">Att betala</span>
          <span class="value total">${formattedTotal} SEK</span>
        </div>
      </div>

      ${company.bankgiro ? `<p><strong>Bankgiro:</strong> ${company.bankgiro}<br><strong>OCR:</strong> ${invoice.invoiceNumber}</p>` : ""}

      ${invoice.notes ? `<p><em>${invoice.notes}</em></p>` : ""}

      <p>Fakturan finns bifogad som PDF.</p>
      <p>Vid frågor, vänligen kontakta oss.</p>

      <p>Med vänliga hälsningar,<br>${company.name}</p>
    </div>
    <div class="footer">
      <p>${company.name} | Org.nr: ${company.orgNumber}</p>
    </div>
  </div>
</body>
</html>`;

  const result = await client.sendEmail({
    From: `${company.name} <${fromEmail}>`,
    To: recipientEmail,
    Subject: `Faktura ${invoice.invoiceNumber} från ${company.name}`,
    HtmlBody: html,
    Attachments: [
      {
        Name: `faktura-${invoice.invoiceNumber}.pdf`,
        Content: pdfBuffer.toString("base64"),
        ContentType: "application/pdf",
      },
    ],
  });

  return { id: String(result.MessageID) };
}
