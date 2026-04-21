export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateCompanySchema = z.object({
  name: z.string().min(1),
  orgNumber: z.string().min(1),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  bankgiro: z.string().optional(),
  plusgiro: z.string().optional(),
  vatPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  fTaxCertificate: z.union([z.boolean(), z.literal("true"), z.literal("")]).transform((v) => v === true || v === "true").optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
    }

    const body = await req.json() as unknown;
    const data = CreateCompanySchema.parse(body);

    const company = await prisma.company.create({
      data: {
        name: data.name,
        orgNumber: data.orgNumber,
        vatNumber: data.vatNumber || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        email: data.email || null,
        phone: data.phone || null,
        bankgiro: data.bankgiro || null,
        plusgiro: data.plusgiro || null,
        vatPeriod: data.vatPeriod ?? "QUARTERLY",
        fTaxCertificate: data.fTaxCertificate ?? false,
        members: {
          create: {
            userId: session.user.id,
            role: "ADMIN",
          },
        },
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ogiltiga uppgifter", details: error.errors }, { status: 400 });
    }
    console.error("Create company error:", error);
    return NextResponse.json({ error: "Kunde inte skapa företag" }, { status: 500 });
  }
}
