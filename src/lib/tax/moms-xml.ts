import type { VatSummary } from "@/types/accounting";
import { format } from "date-fns";

interface MomsDeklarationOptions {
  company: {
    orgNumber: string;
    name: string;
    vatNumber?: string | null;
  };
  vatSummary: VatSummary;
  periodYear: number;
  periodMonth?: number; // 1-12 for monthly, undefined for quarterly
  periodQuarter?: number; // 1-4 for quarterly
}

/**
 * Generate Skatteverket momsdeklaration XML (SKV 4700)
 * Based on the Swedish tax authority's e-filing format.
 *
 * Note: This generates the XML structure. Actual submission
 * must be done through Skatteverket's e-tjänst or authorized
 * accounting software (approved by SKV).
 */
export function generateMomsXml(options: MomsDeklarationOptions): string {
  const { company, vatSummary, periodYear } = options;

  // Format org number without dash
  const orgNum = company.orgNumber.replace("-", "");

  // Determine period code
  let periodCode: string;
  if (options.periodMonth) {
    periodCode = `${periodYear}${String(options.periodMonth).padStart(2, "0")}`;
  } else if (options.periodQuarter) {
    // Q1 = months 01-03, etc.
    const endMonth = options.periodQuarter * 3;
    periodCode = `${periodYear}${String(endMonth).padStart(2, "0")}`;
  } else {
    periodCode = `${periodYear}12`;
  }

  const createdAt = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  // Round all amounts to whole SEK (SKV requires integers)
  const box05 = Math.round(vatSummary.box05);
  const box06 = Math.round(vatSummary.box06);
  const box07 = Math.round(vatSummary.box07);
  const box10 = Math.round(vatSummary.box10);
  const box11 = Math.round(vatSummary.box11);
  const box12 = Math.round(vatSummary.box12);
  const box30 = Math.round(vatSummary.box30);
  const box49 = Math.round(vatSummary.box49);

  return `<?xml version="1.0" encoding="UTF-8"?>
<MomsDeklaration xmlns="http://www.skatteverket.se/momsdeklaration"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.skatteverket.se/momsdeklaration"
  version="6.0">
  <Avsandare>
    <Programnamn>FilipHammarström Bokföring MVP</Programnamn>
    <Organisationsnummer>${orgNum}</Organisationsnummer>
    <SkapadDatum>${createdAt}</SkapadDatum>
  </Avsandare>
  <Blankett>
    <Arendeinformation>
      <Arendeagare>${orgNum}</Arendeagare>
      <Period>${periodCode}</Period>
    </Arendeinformation>
    <Blankettinnehall>
      <MomsDeklarationsskyldig>
        <Organisationsnummer>${orgNum}</Organisationsnummer>
        <Namn>${escapeXml(company.name)}</Namn>
        ${company.vatNumber ? `<MomsregistreringsnummerSE>${company.vatNumber}</MomsregistreringsnummerSE>` : ""}
      </MomsDeklarationsskyldig>
      <UppgifterMoms>
        <!-- Momspliktiga försäljningar -->
        ${box05 > 0 ? `<ForsMomsEjAnmSkskr>${box05}</ForsMomsEjAnmSkskr>` : "<!-- Ruta 05: Momspliktig försäljning 25% = 0 -->"}
        ${box06 > 0 ? `<UttagMomsEjAnmSkskr>${box06}</UttagMomsEjAnmSkskr>` : "<!-- Ruta 06: Momspliktig försäljning 12% = 0 -->"}
        ${box07 > 0 ? `<VaruforsMomsEjAnmSkskr>${box07}</VaruforsMomsEjAnmSkskr>` : "<!-- Ruta 07: Momspliktig försäljning 6% = 0 -->"}

        <!-- Utgående moms -->
        ${box10 > 0 ? `<MomsUtgHog>${box10}</MomsUtgHog>` : "<!-- Ruta 10: Utgående moms 25% = 0 -->"}
        ${box11 > 0 ? `<MomsUtgMellan>${box11}</MomsUtgMellan>` : "<!-- Ruta 11: Utgående moms 12% = 0 -->"}
        ${box12 > 0 ? `<MomsUtgLag>${box12}</MomsUtgLag>` : "<!-- Ruta 12: Utgående moms 6% = 0 -->"}

        <!-- Ingående moms -->
        ${box30 > 0 ? `<MomsIngAvdr>${box30}</MomsIngAvdr>` : "<!-- Ruta 30: Ingående moms = 0 -->"}

        <!-- Momsskuld/Momsfordran -->
        <MomsSkuld>${box49 > 0 ? box49 : 0}</MomsSkuld>
        ${box49 < 0 ? `<MomsFordran>${Math.abs(box49)}</MomsFordran>` : ""}
      </UppgifterMoms>
    </Blankettinnehall>
  </Blankett>
</MomsDeklaration>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a human-readable summary of the VAT return boxes
 */
export function formatVatReturnSummary(vatSummary: VatSummary): string {
  return `
MOMSDEKLARATION
===============
Period: ${format(vatSummary.periodStart, "yyyy-MM-dd")} – ${format(vatSummary.periodEnd, "yyyy-MM-dd")}

MOMSPLIKTIG FÖRSÄLJNING
Ruta 05 (25% moms): ${formatAmount(vatSummary.box05)} kr
Ruta 06 (12% moms): ${formatAmount(vatSummary.box06)} kr
Ruta 07 (6% moms):  ${formatAmount(vatSummary.box07)} kr

UTGÅENDE MOMS
Ruta 10 (25%): ${formatAmount(vatSummary.box10)} kr
Ruta 11 (12%): ${formatAmount(vatSummary.box11)} kr
Ruta 12 (6%):  ${formatAmount(vatSummary.box12)} kr

INGÅENDE MOMS
Ruta 30: ${formatAmount(vatSummary.box30)} kr

SUMMA
Ruta 49 (att betala/återfå): ${formatAmount(vatSummary.box49)} kr
  `.trim();
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
