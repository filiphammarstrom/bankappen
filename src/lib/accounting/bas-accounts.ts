import { BasAccount } from "@/types/accounting";

export const BAS_ACCOUNTS: BasAccount[] = [
  { accountNumber: 1000, name: "Maskiner och andra tekniska anläggningar", type: "ASSET" },
  { accountNumber: 1220, name: "Inventarier och verktyg", type: "ASSET" },
  { accountNumber: 1310, name: "Aktier och andelar i koncernföretag", type: "ASSET" },
  { accountNumber: 1510, name: "Kundfordringar", type: "ASSET" },
  { accountNumber: 1520, name: "Kundfordringar - osäkra", type: "ASSET" },
  { accountNumber: 1630, name: "Avräkning för skatter och avgifter", type: "ASSET" },
  { accountNumber: 1710, name: "Förutbetalda hyreskostnader", type: "ASSET" },
  { accountNumber: 1920, name: "PlusGiro", type: "ASSET" },
  { accountNumber: 1930, name: "Företagskonto/Checkräkningskonto", type: "ASSET" },
  { accountNumber: 1940, name: "Övriga bankkonton", type: "ASSET" },
  { accountNumber: 2091, name: "Balanserat resultat", type: "EQUITY" },
  { accountNumber: 2099, name: "Årets resultat", type: "EQUITY" },
  { accountNumber: 2350, name: "Skulder till kreditinstitut", type: "LIABILITY" },
  { accountNumber: 2440, name: "Leverantörsskulder", type: "LIABILITY" },
  { accountNumber: 2510, name: "Skatteskulder", type: "LIABILITY" },
  { accountNumber: 2610, name: "Utgående moms 25%", type: "LIABILITY", vatCode: "MP1" },
  { accountNumber: 2620, name: "Utgående moms 12%", type: "LIABILITY", vatCode: "MP2" },
  { accountNumber: 2630, name: "Utgående moms 6%", type: "LIABILITY", vatCode: "MP3" },
  { accountNumber: 2640, name: "Ingående moms", type: "ASSET", vatCode: "I" },
  { accountNumber: 2650, name: "Beräknad ingående moms på förvärv från utlandet", type: "ASSET", vatCode: "I_EU" },
  { accountNumber: 2710, name: "Personalskatt", type: "LIABILITY" },
  { accountNumber: 2731, name: "Arbetsgivaravgifter", type: "LIABILITY" },
  { accountNumber: 2820, name: "Semesterlöneskuld", type: "LIABILITY" },
  { accountNumber: 2890, name: "Övriga upplupna kostnader", type: "LIABILITY" },
  { accountNumber: 3001, name: "Försäljning tjänster, 25% moms", type: "REVENUE", vatCode: "MP1" },
  { accountNumber: 3002, name: "Försäljning varor, 25% moms", type: "REVENUE", vatCode: "MP1" },
  { accountNumber: 3040, name: "Försäljning tjänster, 12% moms", type: "REVENUE", vatCode: "MP2" },
  { accountNumber: 3041, name: "Försäljning varor, 12% moms", type: "REVENUE", vatCode: "MP2" },
  { accountNumber: 3051, name: "Försäljning tjänster/varor, 6% moms", type: "REVENUE", vatCode: "MP3" },
  { accountNumber: 3740, name: "Öres- och kronutjämning", type: "REVENUE" },
  { accountNumber: 3980, name: "Erhållna bidrag", type: "REVENUE" },
  { accountNumber: 4010, name: "Inköp varor och material", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 4090, name: "Inköp av varor inom EU", type: "EXPENSE", vatCode: "I_EU" },
  { accountNumber: 5010, name: "Lokalhyra", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 5060, name: "Städning och renhållning", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 5400, name: "Förbrukningsinventarier", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 5410, name: "Förbrukningsmaterial", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 6010, name: "Administrativa kostnader", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 6110, name: "Kontorsmaterial", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 6212, name: "Mobiltelefon", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 6250, name: "Porto och frakt", type: "EXPENSE" },
  { accountNumber: 6420, name: "Styrelsearvoden", type: "EXPENSE" },
  { accountNumber: 6540, name: "IT-tjänster", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 6910, name: "Annonsering", type: "EXPENSE", vatCode: "I" },
  { accountNumber: 7010, name: "Löner till tjänstemän", type: "EXPENSE" },
  { accountNumber: 7090, name: "Övriga löner och ersättningar", type: "EXPENSE" },
  { accountNumber: 7510, name: "Arbetsgivaravgifter", type: "EXPENSE" },
  { accountNumber: 7570, name: "Kostnader för tjänstepension", type: "EXPENSE" },
  { accountNumber: 8310, name: "Ränteintäkter från bank", type: "REVENUE" },
  { accountNumber: 8410, name: "Räntekostnader för banklån", type: "EXPENSE" },
];

export function getAccountByNumber(accountNumber: number): BasAccount | undefined {
  return BAS_ACCOUNTS.find((a) => a.accountNumber === accountNumber);
}

export function getAccountsByType(type: BasAccount["type"]): BasAccount[] {
  return BAS_ACCOUNTS.filter((a) => a.type === type);
}

export function getRevenueAccounts(): BasAccount[] {
  return BAS_ACCOUNTS.filter((a) => a.type === "REVENUE");
}

export function getExpenseAccounts(): BasAccount[] {
  return BAS_ACCOUNTS.filter((a) => a.type === "EXPENSE");
}

export function getAssetAccounts(): BasAccount[] {
  return BAS_ACCOUNTS.filter((a) => a.type === "ASSET");
}

export function getLiabilityAccounts(): BasAccount[] {
  return BAS_ACCOUNTS.filter((a) => a.type === "LIABILITY");
}

// Default VAT account by rate
export function getVatAccountByRate(rate: number): number {
  if (rate === 25) return 2610;
  if (rate === 12) return 2620;
  if (rate === 6) return 2630;
  return 2610; // default to 25%
}

// Default revenue account by VAT rate
export function getRevenueAccountByRate(rate: number): number {
  if (rate === 25) return 3001;
  if (rate === 12) return 3040;
  if (rate === 6) return 3051;
  return 3001;
}
