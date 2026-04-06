import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE = "activeCompanyId";

export async function getActiveCompanyId(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? null;
}

export async function getActiveCompany(userId: string) {
  const companyId = await getActiveCompanyId();

  if (!companyId) {
    // Return first company user is member of
    const membership = await prisma.companyMember.findFirst({
      where: { userId },
      include: { company: true },
      orderBy: { createdAt: "asc" },
    });
    return membership?.company ?? null;
  }

  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
    include: { company: true },
  });

  return membership?.company ?? null;
}

export async function validateCompanyAccess(
  companyId: string,
  userId: string
): Promise<boolean> {
  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  });
  return !!membership;
}

export async function getUserCompanies(userId: string) {
  const memberships = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.company, role: m.role }));
}
