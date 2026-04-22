/**
 * STAGING/PROD backfill (run manually after deploying schema with new columns):
 * - Transaction: fill baseAmount from amount when null; normalize currency/exchangeRate for legacy rows.
 * - FinancialAccount: normalize empty currency to THB.
 *
 * Usage (from repo root, with DATABASE_URL in .env):
 *   npx tsx scripts/backfill-multi-currency.ts
 *
 * Team process: backup DB, deploy app that reads fallbacks, run this script, verify balances, then PROD.
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { BASE_CURRENCY } from "../lib/currency";

async function main(): Promise<void> {
  const thbLeg = await prisma.$executeRaw(Prisma.sql`
    UPDATE \`Transaction\`
    SET
      \`currency\` = ${BASE_CURRENCY},
      \`exchangeRate\` = 1,
      \`baseAmount\` = \`amount\`
    WHERE \`baseAmount\` IS NULL
      AND (\`currency\` IS NULL OR TRIM(\`currency\`) = '' OR \`currency\` = ${BASE_CURRENCY})
  `);
  console.log("Transaction rows (THB / empty currency) backfilled:", Number(thbLeg));

  const fxLeg = await prisma.$executeRaw(Prisma.sql`
    UPDATE \`Transaction\`
    SET \`baseAmount\` = \`amount\` * \`exchangeRate\`
    WHERE \`baseAmount\` IS NULL
      AND \`currency\` IS NOT NULL
      AND TRIM(\`currency\`) <> ''
      AND \`currency\` <> ${BASE_CURRENCY}
  `);
  console.log("Transaction rows (non-THB, had currency+rate) backfilled:", Number(fxLeg));

  const accResult = await prisma.$executeRaw(Prisma.sql`
    UPDATE \`FinancialAccount\`
    SET \`currency\` = ${BASE_CURRENCY}
    WHERE \`currency\` IS NULL OR TRIM(\`currency\`) = ''
  `);
  console.log("FinancialAccount rows updated (currency empty):", Number(accResult));
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
