export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "list_invoices",
    description: "List invoices for the active company. Returns invoice number, customer name, amount, status and due date.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"],
          description: "Filter by invoice status (optional)",
        },
        limit: {
          type: "number",
          description: "Max number of invoices to return (default 10, max 50)",
        },
      },
    },
  },
  {
    name: "list_customers",
    description: "List customers for the active company.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Max number of customers to return (default 20)",
        },
      },
    },
  },
  {
    name: "list_expenses",
    description: "List expenses/supplier invoices for the active company.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["PENDING_REVIEW", "APPROVED", "REJECTED", "BOOKED"],
          description: "Filter by expense status (optional)",
        },
        limit: {
          type: "number",
          description: "Max number of expenses to return (default 10, max 50)",
        },
      },
    },
  },
  {
    name: "get_financial_summary",
    description: "Get a financial overview for the active company: total invoiced revenue, total expenses, and outstanding receivables.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_customer",
    description: "Create a new customer for the active company.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Customer name (required)" },
        email: { type: "string", description: "Customer email address" },
        phone: { type: "string", description: "Customer phone number" },
        orgNumber: { type: "string", description: "Organization number" },
        address: { type: "string", description: "Street address" },
        city: { type: "string", description: "City" },
        postalCode: { type: "string", description: "Postal code" },
        paymentTermDays: { type: "number", description: "Payment term in days (default 30)" },
      },
      required: ["name"],
    },
  },
];

async function runTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  companyId: string
): Promise<string> {
  if (toolName === "list_invoices") {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        ...(input.status ? { status: input.status } : {}),
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: Math.min(input.limit ?? 10, 50),
    });
    return JSON.stringify(
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer.name,
        totalSek: Number(inv.totalSek),
        paidAmountSek: Number(inv.paidAmountSek),
        status: inv.status,
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        issueDate: inv.issueDate.toISOString().slice(0, 10),
      }))
    );
  }

  if (toolName === "list_customers") {
    const customers = await prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      take: Math.min(input.limit ?? 20, 100),
    });
    return JSON.stringify(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        paymentTermDays: c.paymentTermDays,
      }))
    );
  }

  if (toolName === "list_expenses") {
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(input.limit ?? 10, 50),
    });
    return JSON.stringify(
      expenses.map((e) => ({
        id: e.id,
        supplierName: e.supplierName,
        totalSek: Number(e.totalSek),
        vatAmountSek: Number(e.vatAmountSek),
        status: e.status,
        issueDate: e.issueDate?.toISOString().slice(0, 10),
        dueDate: e.dueDate?.toISOString().slice(0, 10),
        description: e.description,
      }))
    );
  }

  if (toolName === "get_financial_summary") {
    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId },
        select: { totalSek: true, paidAmountSek: true, status: true },
      }),
      prisma.expense.findMany({
        where: { companyId },
        select: { totalSek: true, status: true },
      }),
    ]);

    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.totalSek), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + Number(i.paidAmountSek), 0);
    const outstanding = totalInvoiced - totalPaid;
    const totalExpenses = expenses
      .filter((e) => e.status === "BOOKED")
      .reduce((sum, e) => sum + Number(e.totalSek), 0);

    return JSON.stringify({
      totalInvoicedSek: totalInvoiced,
      totalPaidSek: totalPaid,
      outstandingReceivablesSek: outstanding,
      totalBookedExpensesSek: totalExpenses,
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
    });
  }

  if (toolName === "create_customer") {
    if (!input.name) return JSON.stringify({ error: "name is required" });
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        orgNumber: input.orgNumber ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        country: "SE",
        paymentTermDays: input.paymentTermDays ?? 30,
      },
    });
    return JSON.stringify({ success: true, customerId: customer.id, name: customer.name });
  }

  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const { messages } = (await req.json()) as { messages: Anthropic.MessageParam[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages krävs" }, { status: 400 });
  }

  const systemPrompt = `Du är en hjälpsam assistent inbyggd i ${company.name}s bokföringssystem (Bankappen).
Du hjälper användaren med att hantera fakturor, kunder, utgifter och ekonomisk information.
Svara alltid på svenska. Var koncis och direkt.
Aktuellt datum: ${new Date().toLocaleDateString("sv-SE")}.
Aktivt företag: ${company.name} (org.nr: ${company.orgNumber ?? "okänt"}).`;

  const msgs: Anthropic.MessageParam[] = [...messages];

  // Agentic loop - max 5 iterations to prevent runaway
  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: msgs,
    });

    if (response.stop_reason === "end_turn") {
      const textContent = response.content.find((c) => c.type === "text");
      return NextResponse.json({ message: textContent?.text ?? "" });
    }

    if (response.stop_reason === "tool_use") {
      msgs.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            company.id
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      msgs.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return NextResponse.json({ message: "Kunde inte bearbeta förfrågan." });
}
