/**
 * Dry-run: ดูว่า backfill จะแตะกี่แถว (ไม่แก้ข้อมูล)
 * Usage: npx tsx scripts/backfill-multi-currency-dryrun.ts
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { BASE_CURRENCY } from "../lib/currency";

type CountRow = { c: bigint | number };

async function main(): Promise<void> {
  const thbLeg = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) AS c FROM \`Transaction\`
    WHERE \`baseAmount\` IS NULL
      AND (\`currency\` IS NULL OR TRIM(\`currency\`) = '' OR \`currency\` = ${BASE_CURRENCY})
  `);
  console.log(
    "Transaction rows (THB / empty currency) that will be backfilled:",
    Number(thbLeg[0]?.c ?? 0),
  );

  const fxLeg = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) AS c FROM \`Transaction\`
    WHERE \`baseAmount\` IS NULL
      AND \`currency\` IS NOT NULL
      AND TRIM(\`currency\`) <> ''
      AND \`currency\` <> ${BASE_CURRENCY}
  `);
  console.log(
    "Transaction rows (non-THB) that will be backfilled:",
    Number(fxLeg[0]?.c ?? 0),
  );

  const acc = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) AS c FROM \`FinancialAccount\`
    WHERE \`currency\` IS NULL OR TRIM(\`currency\`) = ''
  `);
  console.log(
    "FinancialAccount rows (empty currency) that will be updated:",
    Number(acc[0]?.c ?? 0),
  );

  const totalNull = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) AS c FROM \`Transaction\` WHERE \`baseAmount\` IS NULL
  `);
  console.log(
    "\nTotal Transaction.baseAmount IS NULL (pre-backfill):",
    Number(totalNull[0]?.c ?? 0),
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
