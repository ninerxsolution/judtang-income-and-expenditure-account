import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BASE_CURRENCY } from "@/lib/currency";

type SumRow = { total: Prisma.Decimal | null };

/**
 * Sum THB-equivalent for transactions using COALESCE(baseAmount, synthetic from amount/rate).
 * Matches semantics of getEffectiveBaseAmountThb for rows missing baseAmount.
 */
export async function sumTransactionThbInRange(params: {
  userId: string;
  types: TransactionType[];
  from?: Date;
  to?: Date;
  financialAccountId?: string;
}): Promise<number> {
  const { userId, types, from, to, financialAccountId } = params;
  if (types.length === 0) return 0;

  const typeList = Prisma.join(types);

  if (financialAccountId && from && to) {
    const rows = await prisma.$queryRaw<SumRow[]>`
      SELECT COALESCE(SUM(
        COALESCE(\`baseAmount\`, IF(\`currency\` = ${BASE_CURRENCY}, \`amount\`, \`amount\` * \`exchangeRate\`))
      ), 0) AS total
      FROM \`Transaction\`
      WHERE \`userId\` = ${userId}
        AND \`type\` IN (${typeList})
        AND \`financialAccountId\` = ${financialAccountId}
        AND \`occurredAt\` >= ${from}
        AND \`occurredAt\` <= ${to}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  if (financialAccountId) {
    const rows = await prisma.$queryRaw<SumRow[]>`
      SELECT COALESCE(SUM(
        COALESCE(\`baseAmount\`, IF(\`currency\` = ${BASE_CURRENCY}, \`amount\`, \`amount\` * \`exchangeRate\`))
      ), 0) AS total
      FROM \`Transaction\`
      WHERE \`userId\` = ${userId}
        AND \`type\` IN (${typeList})
        AND \`financialAccountId\` = ${financialAccountId}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  if (from && to) {
    const rows = await prisma.$queryRaw<SumRow[]>`
      SELECT COALESCE(SUM(
        COALESCE(\`baseAmount\`, IF(\`currency\` = ${BASE_CURRENCY}, \`amount\`, \`amount\` * \`exchangeRate\`))
      ), 0) AS total
      FROM \`Transaction\`
      WHERE \`userId\` = ${userId}
        AND \`type\` IN (${typeList})
        AND \`occurredAt\` >= ${from}
        AND \`occurredAt\` <= ${to}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  const rows = await prisma.$queryRaw<SumRow[]>`
    SELECT COALESCE(SUM(
      COALESCE(\`baseAmount\`, IF(\`currency\` = ${BASE_CURRENCY}, \`amount\`, \`amount\` * \`exchangeRate\`))
    ), 0) AS total
    FROM \`Transaction\`
    WHERE \`userId\` = ${userId}
      AND \`type\` IN (${typeList})
  `;
  return Number(rows[0]?.total ?? 0);
}

export async function sumExpenseByCategoryThbForMonth(params: {
  userId: string;
  from: Date;
  to: Date;
}): Promise<Map<string | null, number>> {
  const { userId, from, to } = params;
  type Row = { categoryId: string | null; total: Prisma.Decimal | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT \`categoryId\`,
      COALESCE(SUM(
        COALESCE(\`baseAmount\`, IF(\`currency\` = ${BASE_CURRENCY}, \`amount\`, \`amount\` * \`exchangeRate\`))
      ), 0) AS total
    FROM \`Transaction\`
    WHERE \`userId\` = ${userId}
      AND \`type\` = 'EXPENSE'
      AND \`occurredAt\` >= ${from}
      AND \`occurredAt\` <= ${to}
    GROUP BY \`categoryId\`
  `;
  const map = new Map<string | null, number>();
  for (const r of rows) {
    map.set(r.categoryId ?? null, Number(r.total ?? 0));
  }
  return map;
}
