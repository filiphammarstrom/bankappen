import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateCompanySchema = z.object({
  name: z.string().min(1, "Företagsnamn krävs"),
  orgNumber: z.string().min(1, "Organisationsnummer krävs"),
  vatNumber: z.string().optional().nullable(),
  email: z.string().email("Ogiltig e-postadress").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  bankgiro: z.string().optional().nullable(),
  plusgiro: z.string().optional().nullable(),
  vatPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  fTaxCertificate: z.boolean(),
  fiscalYearStart: z.number().int().min(1).max(12),
});

export async function PATCH(
  req: Request,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: { companyId: params.companyId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  if (membership.role === "AUDITOR") {
    return NextResponse.json({ error: "Revisorer kan inte redigera företagsinformation" }, { status: 403 });
  }

  try {
    const body = await req.json() as unknown;
    const data = UpdateCompanySchema.parse(body);

    // Normalise empty strings to null for optional fields
    const company = await prisma.company.update({
      where: { id: params.companyId },
      data: {
        name: data.name,
        orgNumber: data.orgNumber,
        vatNumber: data.vatNumber || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        bankgiro: data.bankgiro || null,
        plusgiro: data.plusgiro || null,
        vatPeriod: data.vatPeriod,
        fTaxCertificate: data.fTaxCertificate,
        fiscalYearStart: data.fiscalYearStart,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ogiltiga uppgifter", details: error.errors }, { status: 400 });
    }
    console.error("Update company error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Kunde inte uppdatera företaget" }, { status: 500 });
  }
}
