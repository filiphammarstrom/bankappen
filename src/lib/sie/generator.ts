import { prisma } from "@/lib/prisma";

function sieDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function sieStr(s: string | null | undefined): string {
  return `"${(s ?? "").replace(/"/g, "'")}"`;
}

function sieAmount(n: number | string): string {
  return Number(n).toFixed(2);
}

export async function generateSie4(companyId: string): Promise<Buffer> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  const fiscalYear = await prisma.fiscalYear.findFirst({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyId },
    orderBy: { accountNumber: "asc" },
  });

  const journalEntries = await prisma.journalEntry.findMany({
    where: { companyId },
    include: {
      lines: {
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      },
    },
    orderBy: { entryDate: "asc" },
  });

  const lines: string[] = [];
  const today = sieDate(new Date());

  // Header
  lines.push("#FLAGGA 0");
  lines.push("#FORMAT PC8");
  lines.push("#SIETYP 4");
  lines.push(`#PROGRAM ${sieStr("Bankappen")} ${sieStr("1.0")}`);
  lines.push(`#GEN ${today}`);
  lines.push(`#FNAMN ${sieStr(company.name)}`);
  lines.push(`#ORGNR ${company.orgNumber}`);

  if (fiscalYear) {
    lines.push(`#RAR 0 ${sieDate(fiscalYear.startDate)} ${sieDate(fiscalYear.endDate)}`);
  }

  lines.push("");

  // Chart of accounts
  for (const acc of accounts) {
    lines.push(`#KONTO ${acc.accountNumber} ${sieStr(acc.name)}`);
  }

  lines.push("");

  // Verifications
  let verNum = 1;
  for (const entry of journalEntries) {
    if (entry.source === "OPENING_BALANCE") continue; // skip IB entry, handled separately below

    const verLines: string[] = [];
    for (const line of entry.lines) {
      if (line.debitAccountId && line.debitAccount) {
        verLines.push(
          `\t#TRANS ${line.debitAccount.accountNumber} {} ${sieAmount(line.amountSek)} "" ${sieStr(line.description ?? "")} 0`
        );
      }
      if (line.creditAccountId && line.creditAccount) {
        verLines.push(
          `\t#TRANS ${line.creditAccount.accountNumber} {} -${sieAmount(line.amountSek)} "" ${sieStr(line.description ?? "")} 0`
        );
      }
    }

    if (verLines.length === 0) continue;

    lines.push(
      `#VER A ${verNum++} ${sieDate(entry.entryDate)} ${sieStr(entry.description)}`
    );
    lines.push("{");
    lines.push(...verLines);
    lines.push("}");
    lines.push("");
  }

  // Opening balances from OPENING_BALANCE journal entries
  const ibEntry = journalEntries.find((e) => e.source === "OPENING_BALANCE");
  if (ibEntry) {
    for (const line of ibEntry.lines) {
      if (line.debitAccountId && line.debitAccount) {
        lines.push(`#IB 0 ${line.debitAccount.accountNumber} ${sieAmount(line.amountSek)} 0`);
      }
      if (line.creditAccountId && line.creditAccount) {
        lines.push(`#IB 0 ${line.creditAccount.accountNumber} -${sieAmount(line.amountSek)} 0`);
      }
    }
  }

  const content = lines.join("\r\n");
  // Output as Latin-1 for maximum compatibility with Swedish accounting software
  return Buffer.from(content, "latin1");
}
