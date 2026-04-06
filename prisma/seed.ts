import { PrismaClient, AccountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BAS_ACCOUNTS = [
  { accountNumber: 1000, name: "Maskiner och andra tekniska anläggningar", type: AccountType.ASSET },
  { accountNumber: 1220, name: "Inventarier och verktyg", type: AccountType.ASSET },
  { accountNumber: 1310, name: "Aktier och andelar i koncernföretag", type: AccountType.ASSET },
  { accountNumber: 1510, name: "Kundfordringar", type: AccountType.ASSET },
  { accountNumber: 1520, name: "Kundfordringar - osäkra", type: AccountType.ASSET },
  { accountNumber: 1630, name: "Avräkning för skatter och avgifter", type: AccountType.ASSET },
  { accountNumber: 1710, name: "Förutbetalda hyreskostnader", type: AccountType.ASSET },
  { accountNumber: 1920, name: "PlusGiro", type: AccountType.ASSET },
  { accountNumber: 1930, name: "Företagskonto/Checkräkningskonto", type: AccountType.ASSET },
  { accountNumber: 1940, name: "Övriga bankkonton", type: AccountType.ASSET },
  { accountNumber: 2091, name: "Balanserat resultat", type: AccountType.EQUITY },
  { accountNumber: 2099, name: "Årets resultat", type: AccountType.EQUITY },
  { accountNumber: 2350, name: "Skulder till kreditinstitut", type: AccountType.LIABILITY },
  { accountNumber: 2440, name: "Leverantörsskulder", type: AccountType.LIABILITY },
  { accountNumber: 2510, name: "Skatteskulder", type: AccountType.LIABILITY },
  { accountNumber: 2610, name: "Utgående moms 25%", type: AccountType.LIABILITY, vatCode: "MP1" },
  { accountNumber: 2620, name: "Utgående moms 12%", type: AccountType.LIABILITY, vatCode: "MP2" },
  { accountNumber: 2630, name: "Utgående moms 6%", type: AccountType.LIABILITY, vatCode: "MP3" },
  { accountNumber: 2640, name: "Ingående moms", type: AccountType.ASSET, vatCode: "I" },
  { accountNumber: 2650, name: "Beräknad ingående moms på förvärv från utlandet", type: AccountType.ASSET, vatCode: "I_EU" },
  { accountNumber: 2710, name: "Personalskatt", type: AccountType.LIABILITY },
  { accountNumber: 2731, name: "Arbetsgivaravgifter", type: AccountType.LIABILITY },
  { accountNumber: 2820, name: "Semesterlöneskuld", type: AccountType.LIABILITY },
  { accountNumber: 2890, name: "Övriga upplupna kostnader", type: AccountType.LIABILITY },
  { accountNumber: 3001, name: "Försäljning tjänster, 25% moms", type: AccountType.REVENUE, vatCode: "MP1" },
  { accountNumber: 3002, name: "Försäljning varor, 25% moms", type: AccountType.REVENUE, vatCode: "MP1" },
  { accountNumber: 3040, name: "Försäljning tjänster, 12% moms", type: AccountType.REVENUE, vatCode: "MP2" },
  { accountNumber: 3041, name: "Försäljning varor, 12% moms", type: AccountType.REVENUE, vatCode: "MP2" },
  { accountNumber: 3051, name: "Försäljning tjänster/varor, 6% moms", type: AccountType.REVENUE, vatCode: "MP3" },
  { accountNumber: 3740, name: "Öres- och kronutjämning", type: AccountType.REVENUE },
  { accountNumber: 3980, name: "Erhållna bidrag", type: AccountType.REVENUE },
  { accountNumber: 4010, name: "Inköp varor och material", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 4090, name: "Inköp av varor inom EU", type: AccountType.EXPENSE, vatCode: "I_EU" },
  { accountNumber: 5010, name: "Lokalhyra", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 5060, name: "Städning och renhållning", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 5400, name: "Förbrukningsinventarier", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 5410, name: "Förbrukningsmaterial", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 6010, name: "Administrativa kostnader", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 6110, name: "Kontorsmaterial", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 6212, name: "Mobiltelefon", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 6250, name: "Porto och frakt", type: AccountType.EXPENSE },
  { accountNumber: 6420, name: "Styrelsearvoden", type: AccountType.EXPENSE },
  { accountNumber: 6540, name: "IT-tjänster", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 6910, name: "Annonsering", type: AccountType.EXPENSE, vatCode: "I" },
  { accountNumber: 7010, name: "Löner till tjänstemän", type: AccountType.EXPENSE },
  { accountNumber: 7090, name: "Övriga löner och ersättningar", type: AccountType.EXPENSE },
  { accountNumber: 7510, name: "Arbetsgivaravgifter", type: AccountType.EXPENSE },
  { accountNumber: 7570, name: "Kostnader för tjänstepension", type: AccountType.EXPENSE },
  { accountNumber: 8310, name: "Ränteintäkter från bank", type: AccountType.REVENUE },
  { accountNumber: 8410, name: "Räntekostnader för banklån", type: AccountType.EXPENSE },
];

async function main() {
  console.log("Seed startar...");

  // Create demo user
  const passwordHash = await bcrypt.hash("demo123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo Användare",
      passwordHash,
    },
  });

  console.log(`Användare skapad: ${user.email}`);

  // Create demo company
  const company = await prisma.company.upsert({
    where: { orgNumber: "556123-4567" },
    update: {},
    create: {
      name: "Demo AB",
      orgNumber: "556123-4567",
      vatNumber: "SE556123456701",
      address: "Storgatan 1",
      city: "Stockholm",
      postalCode: "111 22",
      email: "info@demo-ab.se",
      phone: "08-123 45 67",
      bankgiro: "123-4567",
      fTaxCertificate: true,
      vatPeriod: "QUARTERLY",
    },
  });

  console.log(`Företag skapat: ${company.name}`);

  // Add user as owner
  await prisma.companyMember.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // Create BAS accounts for demo company
  for (const account of BAS_ACCOUNTS) {
    await prisma.chartOfAccount.upsert({
      where: {
        companyId_accountNumber: {
          companyId: company.id,
          accountNumber: account.accountNumber,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        accountNumber: account.accountNumber,
        name: account.name,
        type: account.type,
        vatCode: account.vatCode,
        isSystem: true,
      },
    });
  }

  console.log(`${BAS_ACCOUNTS.length} BAS-konton skapade`);

  // Create fiscal year
  const currentYear = new Date().getFullYear();
  await prisma.fiscalYear.upsert({
    where: { id: `fy-${company.id}-${currentYear}` },
    update: {},
    create: {
      id: `fy-${company.id}-${currentYear}`,
      companyId: company.id,
      startDate: new Date(`${currentYear}-01-01`),
      endDate: new Date(`${currentYear}-12-31`),
    },
  });

  // Create a demo customer
  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Kund AB",
      orgNumber: "556789-0123",
      vatNumber: "SE556789012301",
      email: "faktura@kund-ab.se",
      address: "Kundgatan 5",
      city: "Göteborg",
      postalCode: "412 51",
      paymentTermDays: 30,
    },
  });

  console.log(`Demokund skapad: ${customer.name}`);

  console.log("Seed klar!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
