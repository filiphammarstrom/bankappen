-- Enable Row-Level Security on all application tables.
--
-- This app connects via Prisma using the service_role key, which bypasses
-- RLS entirely. Enabling RLS here only blocks unauthenticated access through
-- Supabase's PostgREST API (anon key) — the app itself is unaffected.
--
-- With RLS enabled and no permissive policies, all PostgREST access is denied
-- by default for both anon and authenticated roles.

ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyMember"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiscalYear"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChartOfAccount"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalLine"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankConnection"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankTransaction"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VatReturn"        ENABLE ROW LEVEL SECURITY;
