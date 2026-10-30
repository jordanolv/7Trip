-- AlterTable: until now every expense was in the trip's currency.
ALTER TABLE "Expense" ADD COLUMN     "rateToBase" DECIMAL(20,10) NOT NULL DEFAULT 1,
ADD COLUMN     "baseAmountMinor" INTEGER;
UPDATE "Expense" SET "baseAmountMinor" = "amountMinor";
ALTER TABLE "Expense" ALTER COLUMN "baseAmountMinor" SET NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseShare" ADD COLUMN     "originalMinor" INTEGER;
UPDATE "ExpenseShare" SET "originalMinor" = "amountMinor";
ALTER TABLE "ExpenseShare" ALTER COLUMN "originalMinor" SET NOT NULL;
