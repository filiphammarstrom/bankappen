// Swedish VAT (moms) rates
export const SWEDISH_VAT_RATES = [0, 6, 12, 25] as const;
export type SwedishVatRate = (typeof SWEDISH_VAT_RATES)[number];

export function isValidSwedishVatRate(rate: number): rate is SwedishVatRate {
  return (SWEDISH_VAT_RATES as readonly number[]).includes(rate);
}

/**
 * Calculate VAT amount from ex-VAT price
 * @param exVatAmount - Amount excluding VAT
 * @param vatRate - VAT rate as percentage (e.g., 25 for 25%)
 */
export function calculateVatAmount(exVatAmount: number, vatRate: number): number {
  return Math.round(exVatAmount * (vatRate / 100) * 100) / 100;
}

/**
 * Calculate total (inc VAT) from ex-VAT price
 */
export function calculateTotalWithVat(exVatAmount: number, vatRate: number): number {
  return Math.round(exVatAmount * (1 + vatRate / 100) * 100) / 100;
}

/**
 * Reverse-calculate ex-VAT amount from total including VAT
 * @param totalWithVat - Amount including VAT
 * @param vatRate - VAT rate as percentage
 */
export function calculateExVatAmount(totalWithVat: number, vatRate: number): number {
  return Math.round((totalWithVat / (1 + vatRate / 100)) * 100) / 100;
}

/**
 * Reverse-calculate VAT from total including VAT
 */
export function extractVatFromTotal(totalWithVat: number, vatRate: number): number {
  const exVat = calculateExVatAmount(totalWithVat, vatRate);
  return Math.round((totalWithVat - exVat) * 100) / 100;
}

/**
 * Calculate line item totals
 */
export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  vatRate: number
): {
  subtotal: number;
  vatAmount: number;
  lineTotal: number;
} {
  const subtotal = Math.round(quantity * unitPrice * 100) / 100;
  const vatAmount = calculateVatAmount(subtotal, vatRate);
  const lineTotal = subtotal + vatAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
  };
}

/**
 * Get VAT rate label in Swedish
 */
export function getVatRateLabel(rate: number): string {
  if (rate === 0) return "0% (Momsfri)";
  return `${rate}% moms`;
}

/**
 * Format amount as Swedish currency
 */
export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount as number with Swedish locale
 */
export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
