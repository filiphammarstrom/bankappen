#!/usr/bin/env node
/**
 * Bankappen MCP Server
 *
 * Kör lokalt och koppla till Claude Desktop via claude_desktop_config.json:
 *
 * {
 *   "mcpServers": {
 *     "bankappen": {
 *       "command": "npx",
 *       "args": ["ts-node", "--compiler-options", "{\"module\":\"CommonJS\"}", "mcp-server.ts"],
 *       "cwd": "/path/to/bankappen",
 *       "env": {
 *         "DATABASE_URL": "din-databas-url",
 *         "MCP_USER_EMAIL": "din@email.se"
 *       }
 *     }
 *   }
 * }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";
import * as postmark from "postmark";

const prisma = new PrismaClient();

async function getDefaultCompanyId(userId: string): Promise<string | null> {
  const m = await prisma.companyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return m?.companyId ?? null;
}

async function resolveUser() {
  const email = process.env.MCP_USER_EMAIL;
  if (!email) throw new Error("MCP_USER_EMAIL saknas i miljövariabler");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Ingen användare hittad med e-post: ${email}`);
  return user;
}

const server = new Server(
  { name: "bankappen", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_companies",
      description: "Lista alla företag användaren är medlem i",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_financial_summary",
      description: "Hämta ekonomisk översikt för ett företag: öppna fakturor, obetalda utgifter, banksaldo",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string", description: "Företags-ID (lämna tomt för standardföretag)" },
        },
      },
    },
    {
      name: "list_invoices",
      description: "Lista fakturor för ett företag",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          status: { type: "string", description: "DRAFT | SENT | PAID | OVERDUE | CANCELLED" },
          limit: { type: "number", default: 20 },
        },
      },
    },
    {
      name: "list_expenses",
      description: "Lista utgifter/leverantörsfakturor för ett företag",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          status: { type: "string", description: "PENDING_REVIEW | BOOKED | PAID" },
          limit: { type: "number", default: 20 },
        },
      },
    },
    {
      name: "list_customers",
      description: "Lista kunder för ett företag",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
      },
    },
    {
      name: "create_customer",
      description: "Skapa en ny kund",
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: {
          companyId: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          postalCode: { type: "string" },
          vatNumber: { type: "string" },
        },
      },
    },
    {
      name: "create_expense",
      description: "Skapa en ny utgift/leverantörsfaktura",
      inputSchema: {
        type: "object",
        required: ["supplierName", "totalSek"],
        properties: {
          companyId: { type: "string" },
          supplierName: { type: "string" },
          invoiceNumber: { type: "string" },
          totalSek: { type: "number", description: "Totalt belopp inkl. moms i SEK" },
          issueDate: { type: "string", description: "YYYY-MM-DD" },
          dueDate: { type: "string", description: "YYYY-MM-DD" },
          description: { type: "string", description: "Fritext, t.ex. 'Hyra april. Moms: 1 500 kr'" },
        },
      },
    },
    {
      name: "list_bank_transactions",
      description: "Lista banktransaktioner för ett företag",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          onlyUnreconciled: { type: "boolean", default: false },
          limit: { type: "number", default: 20 },
        },
      },
    },
    {
      name: "create_invoice",
      description: "Skapa en ny faktura med rader. Returnerar faktura-ID och nummer.",
      inputSchema: {
        type: "object",
        required: ["customerId", "dueDate", "lines"],
        properties: {
          companyId: { type: "string" },
          customerId: { type: "string", description: "Kund-ID (hämta från list_customers)" },
          issueDate: { type: "string", description: "Fakturadatum YYYY-MM-DD (standard: idag)" },
          dueDate: { type: "string", description: "Förfallodatum YYYY-MM-DD" },
          notes: { type: "string", description: "Meddelande på fakturan" },
          ourReference: { type: "string" },
          yourReference: { type: "string" },
          lines: {
            type: "array",
            description: "Fakturarader",
            items: {
              type: "object",
              required: ["description", "quantity", "unitPrice", "vatRate"],
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number", description: "Pris exkl. moms" },
                vatRate: { type: "number", description: "Momssats i procent, t.ex. 25" },
                unit: { type: "string", description: "Enhet, t.ex. st, tim, mån" },
              },
            },
          },
        },
      },
    },
    {
      name: "send_invoice",
      description: "Skicka en faktura via e-post till kunden. Markerar fakturan som Skickad.",
      inputSchema: {
        type: "object",
        required: ["invoiceId"],
        properties: {
          invoiceId: { type: "string", description: "Faktura-ID" },
        },
      },
    },
    {
      name: "send_supplier_request",
      description: "Skicka ett underlag via e-post till en leverantör/underkonsult så att de kan fakturera oss. Innehåller detaljer om utfört arbete, belopp och betalningsinfo.",
      inputSchema: {
        type: "object",
        required: ["supplierEmail", "supplierName", "description", "amountSek"],
        properties: {
          companyId: { type: "string" },
          supplierEmail: { type: "string", description: "Leverantörens e-postadress" },
          supplierName: { type: "string", description: "Leverantörens namn" },
          description: { type: "string", description: "Beskrivning av utfört arbete/leverans" },
          amountSek: { type: "number", description: "Belopp exkl. moms i SEK" },
          vatRate: { type: "number", description: "Momssats i procent (standard: 25)" },
          dueDate: { type: "string", description: "Önskat förfallodatum YYYY-MM-DD" },
          ourReference: { type: "string", description: "Vår referens som ska anges på fakturan" },
          notes: { type: "string", description: "Övrig information" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    const user = await resolveUser();
    const companyId =
      (a.companyId as string | undefined) ?? (await getDefaultCompanyId(user.id));
    if (!companyId && name !== "list_companies") {
      return { content: [{ type: "text", text: "Inget företag hittades. Ange companyId." }] };
    }

    if (name === "list_companies") {
      const memberships = await prisma.companyMember.findMany({
        where: { userId: user.id },
        include: { company: true },
      });
      const companies = memberships.map((m) => ({
        id: m.company.id,
        name: m.company.name,
        orgNumber: m.company.orgNumber,
        role: m.role,
      }));
      return { content: [{ type: "text", text: JSON.stringify(companies, null, 2) }] };
    }

    if (name === "get_financial_summary") {
      const [invoices, expenses, transactions] = await Promise.all([
        prisma.invoice.findMany({
          where: { companyId: companyId!, status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] } },
          select: { invoiceNumber: true, totalSek: true, paidAmountSek: true, status: true, dueDate: true, customer: { select: { name: true } } },
        }),
        prisma.expense.findMany({
          where: { companyId: companyId!, status: { in: ["PENDING_REVIEW", "BOOKED"] } },
          select: { supplierName: true, totalSek: true, status: true, dueDate: true },
        }),
        prisma.bankTransaction.findMany({
          where: { bankConnection: { companyId: companyId! }, reconciled: false },
          select: { amount: true, transactionDate: true, description: true },
          orderBy: { transactionDate: "desc" },
          take: 5,
        }),
      ]);

      const outstandingReceivables = invoices.reduce(
        (sum, inv) => sum + (Number(inv.totalSek) - Number(inv.paidAmountSek)), 0
      );
      const unpaidExpenses = expenses
        .filter((e) => e.status === "BOOKED")
        .reduce((sum, e) => sum + Number(e.totalSek ?? 0), 0);

      const summary = {
        öppnaKundfakturor: invoices.length,
        outstandingReceivablesSek: outstandingReceivables,
        ogranskadeUtgifter: expenses.filter((e) => e.status === "PENDING_REVIEW").length,
        obetaldaleverantörsfakturorSek: unpaidExpenses,
        ej_avstämdaBanktransaktioner: transactions.length,
        senasteBanktransaktioner: transactions.map((t) => ({
          datum: t.transactionDate,
          belopp: Number(t.amount),
          beskrivning: t.description,
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }

    if (name === "list_invoices") {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId: companyId!,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(a.status ? { status: a.status as any } : {}),
        },
        include: { customer: { select: { name: true } } },
        orderBy: { issueDate: "desc" },
        take: (a.limit as number | undefined) ?? 20,
      });
      return {
        content: [{
          type: "text", text: JSON.stringify(invoices.map((inv) => ({
            id: inv.id,
            nummer: inv.invoiceNumber,
            kund: inv.customer.name,
            status: inv.status,
            totalSek: Number(inv.totalSek),
            paidAmountSek: Number(inv.paidAmountSek),
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
          })), null, 2),
        }],
      };
    }

    if (name === "list_expenses") {
      const expenses = await prisma.expense.findMany({
        where: {
          companyId: companyId!,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(a.status ? { status: a.status as any } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: (a.limit as number | undefined) ?? 20,
      });
      return {
        content: [{
          type: "text", text: JSON.stringify(expenses.map((e) => ({
            id: e.id,
            leverantör: e.supplierName,
            fakturanummer: e.invoiceNumber,
            status: e.status,
            totalSek: Number(e.totalSek ?? 0),
            dueDate: e.dueDate,
          })), null, 2),
        }],
      };
    }

    if (name === "list_customers") {
      const customers = await prisma.customer.findMany({
        where: { companyId: companyId! },
        orderBy: { name: "asc" },
      });
      return {
        content: [{
          type: "text", text: JSON.stringify(customers.map((c) => ({
            id: c.id, namn: c.name, email: c.email, telefon: c.phone,
          })), null, 2),
        }],
      };
    }

    if (name === "create_customer") {
      const customer = await prisma.customer.create({
        data: {
          companyId: companyId!,
          name: a.name as string,
          email: (a.email as string | undefined) ?? null,
          phone: (a.phone as string | undefined) ?? null,
          address: (a.address as string | undefined) ?? null,
          city: (a.city as string | undefined) ?? null,
          postalCode: (a.postalCode as string | undefined) ?? null,
          vatNumber: (a.vatNumber as string | undefined) ?? null,
        },
      });
      return { content: [{ type: "text", text: `Kund skapad: ${customer.name} (${customer.id})` }] };
    }

    if (name === "create_expense") {
      const expense = await prisma.expense.create({
        data: {
          companyId: companyId!,
          supplierName: a.supplierName as string,
          invoiceNumber: (a.invoiceNumber as string | undefined) ?? null,
          totalSek: a.totalSek as number,
          issueDate: a.issueDate ? new Date(a.issueDate as string) : null,
          dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
          description: (a.description as string | undefined) ?? null,
          source: "MANUAL",
          status: "PENDING_REVIEW",
        },
      });
      return { content: [{ type: "text", text: `Utgift skapad: ${expense.id} – ${expense.supplierName} ${expense.totalSek} kr` }] };
    }

    if (name === "list_bank_transactions") {
      const txs = await prisma.bankTransaction.findMany({
        where: {
          bankConnection: { companyId: companyId! },
          ...(a.onlyUnreconciled ? { reconciled: false } : {}),
        },
        orderBy: { transactionDate: "desc" },
        take: (a.limit as number | undefined) ?? 20,
      });
      return {
        content: [{
          type: "text", text: JSON.stringify(txs.map((t) => ({
            id: t.id,
            datum: t.transactionDate,
            belopp: Number(t.amount),
            beskrivning: t.description,
            avstämd: t.reconciled,
          })), null, 2),
        }],
      };
    }

    if (name === "create_invoice") {
      const lines = a.lines as Array<{
        description: string; quantity: number; unitPrice: number;
        vatRate: number; unit?: string;
      }>;

      let subtotal = 0;
      let vatTotal = 0;
      const lineData = lines.map((l, i) => {
        const lineSub = Math.round(l.quantity * l.unitPrice * 100) / 100;
        const vatAmount = Math.round(lineSub * (l.vatRate / 100) * 100) / 100;
        const lineTotal = lineSub + vatAmount;
        subtotal += lineSub;
        vatTotal += vatAmount;
        return { ...l, lineSub, vatAmount, lineTotal, sortOrder: i };
      });
      const total = subtotal + vatTotal;

      const updatedCompany = await prisma.company.update({
        where: { id: companyId! },
        data: { invoiceCounter: { increment: 1 } },
        select: { invoiceCounter: true },
      });
      const year = new Date().getFullYear();
      const invoiceNumber = `${year}-${String(updatedCompany.invoiceCounter).padStart(4, "0")}`;

      const issueDate = a.issueDate ? new Date(a.issueDate as string) : new Date();
      const invoice = await prisma.invoice.create({
        data: {
          companyId: companyId!,
          customerId: a.customerId as string,
          invoiceNumber,
          status: "DRAFT",
          issueDate,
          dueDate: new Date(a.dueDate as string),
          notes: (a.notes as string | undefined) ?? null,
          ourReference: (a.ourReference as string | undefined) ?? null,
          yourReference: (a.yourReference as string | undefined) ?? null,
          subtotalSek: subtotal,
          vatAmountSek: vatTotal,
          totalSek: total,
          lines: {
            create: lineData.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              vatRate: l.vatRate,
              vatAmount: l.vatAmount,
              lineTotal: l.lineTotal,
              unit: l.unit ?? "st",
              sortOrder: l.sortOrder,
            })),
          },
        },
      });
      return {
        content: [{
          type: "text",
          text: `Faktura skapad: ${invoiceNumber} (ID: ${invoice.id})\nTotal: ${total.toFixed(2)} kr inkl. moms\nStatus: Utkast — använd send_invoice för att skicka den.`,
        }],
      };
    }

    if (name === "send_invoice") {
      const invoiceId = a.invoiceId as string;
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          lines: { orderBy: { sortOrder: "asc" } },
          company: true,
        },
      });
      if (!invoice) return { content: [{ type: "text", text: "Faktura hittades inte." }] };
      if (invoice.companyId !== companyId) return { content: [{ type: "text", text: "Åtkomst nekad." }] };
      if (!invoice.customer.email) return { content: [{ type: "text", text: `Kunden ${invoice.customer.name} saknar e-postadress.` }] };

      // Call the web app's send endpoint via HTTP
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mcp-secret": process.env.MCP_SECRET ?? "",
        },
      });

      if (!res.ok) {
        // Fallback: send a plain notification email directly via Postmark
        if (process.env.POSTMARK_SERVER_TOKEN) {
          const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
          const total = Number(invoice.totalSek);
          const fromEmail = invoice.company.email ?? process.env.POSTMARK_FROM_EMAIL ?? "faktura@noreply.se";
          await client.sendEmail({
            From: `${invoice.company.name} <${fromEmail}>`,
            To: invoice.customer.email,
            Subject: `Faktura ${invoice.invoiceNumber} från ${invoice.company.name}`,
            TextBody: `Hej ${invoice.customer.name},\n\nBifogat finner du faktura ${invoice.invoiceNumber} på ${total.toFixed(2)} SEK.\nFörfallodatum: ${invoice.dueDate.toISOString().slice(0, 10)}\n\nMed vänliga hälsningar,\n${invoice.company.name}`,
          });
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: "SENT", sentAt: new Date() },
          });
          return { content: [{ type: "text", text: `Faktura ${invoice.invoiceNumber} skickad till ${invoice.customer.email} (utan PDF — öppna appen för att skicka med PDF).` }] };
        }
        return { content: [{ type: "text", text: `Kunde inte skicka faktura: ${await res.text()}` }] };
      }

      return { content: [{ type: "text", text: `Faktura ${invoice.invoiceNumber} skickad till ${invoice.customer.email}.` }] };
    }

    if (name === "send_supplier_request") {
      if (!process.env.POSTMARK_SERVER_TOKEN) {
        return { content: [{ type: "text", text: "POSTMARK_SERVER_TOKEN saknas — kan inte skicka e-post." }] };
      }

      const company = await prisma.company.findUnique({ where: { id: companyId! } });
      if (!company) return { content: [{ type: "text", text: "Företag hittades inte." }] };

      const vatRate = (a.vatRate as number | undefined) ?? 25;
      const amountSek = a.amountSek as number;
      const vatSek = Math.round(amountSek * (vatRate / 100) * 100) / 100;
      const totalSek = amountSek + vatSek;
      const dueDate = (a.dueDate as string | undefined) ?? "";
      const fromEmail = company.email ?? process.env.POSTMARK_FROM_EMAIL ?? "info@noreply.se";

      const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
      await client.sendEmail({
        From: `${company.name} <${fromEmail}>`,
        To: a.supplierEmail as string,
        Subject: `Underlag för fakturering – ${company.name}`,
        HtmlBody: `
<p>Hej ${a.supplierName as string},</p>
<p>Vi ber dig fakturera oss för följande:</p>
<table style="border-collapse:collapse;width:100%;max-width:500px">
  <tr><td style="padding:6px;border:1px solid #ddd"><strong>Beskrivning</strong></td><td style="padding:6px;border:1px solid #ddd">${a.description as string}</td></tr>
  <tr><td style="padding:6px;border:1px solid #ddd">Belopp exkl. moms</td><td style="padding:6px;border:1px solid #ddd">${amountSek.toFixed(2)} SEK</td></tr>
  <tr><td style="padding:6px;border:1px solid #ddd">Moms (${vatRate}%)</td><td style="padding:6px;border:1px solid #ddd">${vatSek.toFixed(2)} SEK</td></tr>
  <tr><td style="padding:6px;border:1px solid #ddd"><strong>Totalt inkl. moms</strong></td><td style="padding:6px;border:1px solid #ddd"><strong>${totalSek.toFixed(2)} SEK</strong></td></tr>
  ${dueDate ? `<tr><td style="padding:6px;border:1px solid #ddd">Önskat förfallodatum</td><td style="padding:6px;border:1px solid #ddd">${dueDate}</td></tr>` : ""}
  ${a.ourReference ? `<tr><td style="padding:6px;border:1px solid #ddd">Vår referens</td><td style="padding:6px;border:1px solid #ddd">${a.ourReference as string}</td></tr>` : ""}
</table>
${a.notes ? `<p>${a.notes as string}</p>` : ""}
<p>Fakturamottagare:<br><strong>${company.name}</strong>${company.orgNumber ? `<br>Org.nr: ${company.orgNumber}` : ""}${company.address ? `<br>${company.address}` : ""}</p>
<p>Tack!</p>
<p>${company.name}</p>`,
        TextBody: `Hej ${a.supplierName as string},\n\nVi ber dig fakturera oss för:\n${a.description as string}\n\nBelopp exkl. moms: ${amountSek.toFixed(2)} SEK\nMoms ${vatRate}%: ${vatSek.toFixed(2)} SEK\nTotalt: ${totalSek.toFixed(2)} SEK\n${dueDate ? `Förfallodatum: ${dueDate}\n` : ""}${a.ourReference ? `Vår referens: ${a.ourReference as string}\n` : ""}\nFakturamottagare: ${company.name}${company.orgNumber ? ` (org.nr ${company.orgNumber})` : ""}\n\nTack!\n${company.name}`,
      });

      return {
        content: [{
          type: "text",
          text: `Underlag skickat till ${a.supplierEmail as string}.\nBelopp: ${amountSek.toFixed(2)} + moms = ${totalSek.toFixed(2)} SEK.`,
        }],
      };
    }

    return { content: [{ type: "text", text: `Okänt verktyg: ${name}` }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Fel: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
