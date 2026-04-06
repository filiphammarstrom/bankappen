import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { z } from "zod";

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  orgNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("SE"),
  paymentTermDays: z.number().int().min(0).default(30),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  try {
    const body = await req.json() as unknown;
    const data = CreateCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        name: data.name,
        orgNumber: data.orgNumber || null,
        vatNumber: data.vatNumber || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        country: data.country,
        paymentTermDays: data.paymentTermDays,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ogiltiga uppgifter", details: error.errors }, { status: 400 });
    }
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Kunde inte skapa kund" }, { status: 500 });
  }
}
