/**
 * INK2 - Inkomstdeklaration 2 (Corporate Tax Return) - STUB
 *
 * This is a stub for generating the corporate income tax return (INK2)
 * for Swedish limited companies (aktiebolag).
 *
 * Full implementation requires:
 * - Complete P&L and balance sheet data
 * - Tax adjustments (skattemässiga justeringar)
 * - Appendices (bilagor): N3A, N3B, N4, N6, N7, etc.
 * - Skatteverket's official XML schema
 *
 * Integration with Skatteverket's e-filing system is pending.
 */

import type { ProfitLossReport, BalanceSheetReport } from "@/types/accounting";

export interface INK2Data {
  companyName: string;
  orgNumber: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  profitLoss: ProfitLossReport;
  balanceSheet: BalanceSheetReport;
}

export interface INK2Summary {
  // Inkomst av näringsverksamhet
  netResult: number; // Årets resultat before tax
  taxAdjustments: number; // Skattemässiga justeringar (stub = 0)
  taxableIncome: number; // Beskattningsbar inkomst
  estimatedTax: number; // Beräknad skatt (20.6% for AB)

  // Additional info
  revenue: number;
  expenses: number;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

const CORPORATE_TAX_RATE = 0.206; // 20.6% for Swedish AB

/**
 * Calculate estimated INK2 summary from financial reports.
 * This is a simplified calculation - actual tax calculation
 * requires many more adjustments.
 */
export function calculateINK2Summary(data: INK2Data): INK2Summary {
  const { profitLoss, balanceSheet } = data;

  const netResult = profitLoss.netResult;

  // Stub: no tax adjustments
  // In reality: depreciation differences, non-deductible expenses, etc.
  const taxAdjustments = 0;

  const taxableIncome = netResult + taxAdjustments;
  const estimatedTax = taxableIncome > 0 ? taxableIncome * CORPORATE_TAX_RATE : 0;

  return {
    netResult,
    taxAdjustments,
    taxableIncome,
    estimatedTax: Math.round(estimatedTax),
    revenue: profitLoss.totalRevenue,
    expenses: profitLoss.totalExpenses,
    totalAssets: balanceSheet.totalAssets,
    totalLiabilitiesAndEquity: balanceSheet.totalLiabilitiesAndEquity,
  };
}

/**
 * Generate INK2 XML stub - NOT for actual submission.
 * Returns a placeholder XML with the calculated values.
 */
export function generateINK2XmlStub(data: INK2Data, summary: INK2Summary): string {
  const orgNum = data.orgNumber.replace("-", "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ====================================================
     VIKTIG INFORMATION / IMPORTANT NOTICE
     ====================================================
     Detta är ett UTKAST för INK2 (Inkomstdeklaration 2).
     Filen är INTE godkänd för inlämning till Skatteverket.

     Inlämning av inkomstdeklaration måste göras via:
     - Skatteverkets e-tjänst: https://www.skatteverket.se
     - Auktoriserat redovisningsprogram
     - Deklarationsombud

     This is a DRAFT INK2 (Corporate Tax Return).
     DO NOT submit this file to Skatteverket.
     ==================================================== -->
<INK2 xmlns="http://www.skatteverket.se/ink2" version="1.0">
  <Foretag>
    <Organisationsnummer>${orgNum}</Organisationsnummer>
    <Namn>${escapeXml(data.companyName)}</Namn>
    <Rakenskapsaret>
      <Fran>${data.fiscalYearStart}</Fran>
      <Till>${data.fiscalYearEnd}</Till>
    </Rakenskapsaret>
  </Foretag>

  <ResultatRakning>
    <Intakter>${Math.round(summary.revenue)}</Intakter>
    <Kostnader>${Math.round(summary.expenses)}</Kostnader>
    <ResultatForeBokslutsdispositioner>${Math.round(summary.netResult)}</ResultatForeBokslutsdispositioner>
  </ResultatRakning>

  <Balansrakning>
    <SummaTillgangar>${Math.round(summary.totalAssets)}</SummaTillgangar>
    <SummaEgetKapitalOchSkulder>${Math.round(summary.totalLiabilitiesAndEquity)}</SummaEgetKapitalOchSkulder>
  </Balansrakning>

  <SkattemaessigBerakning>
    <RedovisatResultat>${Math.round(summary.netResult)}</RedovisatResultat>
    <SkattemaessigaJusteringar>${Math.round(summary.taxAdjustments)}</SkattemaessigaJusteringar>
    <BeskattningsbarInkomst>${Math.round(summary.taxableIncome)}</BeskattningsbarInkomst>
    <BeraknadSkattSats>20.6</BeraknadSkattSats>
    <BeraknadSkatt>${summary.estimatedTax}</BeraknadSkatt>
  </SkattemaessigBerakning>

  <!-- STUB: Bilagor (N3A, N3B, N4, N6, N7) ej implementerade -->
</INK2>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
