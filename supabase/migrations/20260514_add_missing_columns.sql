-- Add columns that exist in the Prisma schema but are missing from the database.
-- Uses IF NOT EXISTS so the script is safe to re-run.

-- Company: Stripe integration + invoice counter
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "invoiceCounter"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stripeEnabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;

-- Expense: Google Drive attachment + subscription detection
ALTER TABLE "Expense"
  ADD COLUMN IF NOT EXISTS "driveFileId"           TEXT,
  ADD COLUMN IF NOT EXISTS "driveUrl"              TEXT,
  ADD COLUMN IF NOT EXISTS "isSubscription"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subscriptionInterval"  TEXT;
