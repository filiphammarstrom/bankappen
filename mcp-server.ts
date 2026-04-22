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
          totalSek: { type: "number" },
          vatSek: { type: "number" },
          issueDate: { type: "string", description: "YYYY-MM-DD" },
          dueDate: { type: "string", description: "YYYY-MM-DD" },
          description: { type: "string" },
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
          ...(a.status ? { status: a.status as string } : {}),
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
          ...(a.status ? { status: a.status as string } : {}),
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
          vatSek: (a.vatSek as number | undefined) ?? null,
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
