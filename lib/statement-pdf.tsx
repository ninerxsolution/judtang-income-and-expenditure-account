import path from "path";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

// Register Sarabun (Thai-supporting font) from @fontsource/sarabun
const sarabunWoff400 = path.join(
  process.cwd(),
  "node_modules/@fontsource/sarabun/files/sarabun-thai-400-normal.woff",
);
const sarabunWoff700 = path.join(
  process.cwd(),
  "node_modules/@fontsource/sarabun/files/sarabun-thai-700-normal.woff",
);

Font.register({
  family: "Sarabun",
  fonts: [
    { src: sarabunWoff400, fontWeight: 400 },
    { src: sarabunWoff700, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Sarabun",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  summaryLabel: {
    width: 120,
    fontWeight: 700,
  },
  summaryValue: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e5e5",
    padding: 6,
    marginTop: 12,
    fontSize: 9,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    fontSize: 9,
  },
  colDate: { width: "14%" },
  colType: { width: "12%" },
  colDesc: { width: "28%" },
  colAccount: { width: "18%" },
  colDebit: { width: "14%", textAlign: "right" },
  colCredit: { width: "14%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
});

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export type StatementPdfData = {
  user: { name: string | null; email: string | null };
  account?: { name: string; type: string };
  fromDate: Date | null;
  toDate: Date | null;
  generatedAt: Date;
  openingBalance: number | null;
  totalCredits: number;
  totalDebits: number;
  closingBalance: number | null;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    category: string | null;
    note: string | null;
    occurredAt: Date;
    debit: number;
    credit: number;
    accountName?: string;
    transferAccountName?: string | null;
  }>;
  locale: string;
};

const TYPE_LABELS: Record<string, { th: string; en: string }> = {
  INCOME: { th: "รายรับ", en: "Income" },
  EXPENSE: { th: "รายจ่าย", en: "Expense" },
  TRANSFER: { th: "โอน", en: "Transfer" },
  PAYMENT: { th: "ชำระ", en: "Payment" },
  INTEREST: { th: "ดอกเบี้ย", en: "Interest" },
  ADJUSTMENT: { th: "ปรับ", en: "Adjustment" },
};

function getTypeLabel(type: string, locale: string): string {
  return TYPE_LABELS[type]?.[locale === "th" ? "th" : "en"] ?? type;
}

function StatementDocument({ data }: { data: StatementPdfData }) {
  const { user, account, fromDate, toDate, generatedAt, locale } = data;
  const {
    openingBalance,
    totalCredits,
    totalDebits,
    closingBalance,
    transactions,
  } = data;

  const dateRange =
    fromDate && toDate
      ? `${formatDate(fromDate, locale)} – ${formatDate(toDate, locale)}`
      : locale === "th"
        ? "ทั้งหมด"
        : "All";

  const userName = user.name?.trim() || user.email || "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Judtang</Text>
          <Text style={styles.subtitle}>
            {locale === "th" ? "ใบยอดบัญชี" : "Statement"}
          </Text>
          <Text style={styles.subtitle}>
            {locale === "th" ? "ผู้ใช้" : "User"}: {userName}
          </Text>
          {account && (
            <Text style={styles.subtitle}>
              {locale === "th" ? "บัญชี" : "Account"}: {account.name} ({account.type})
            </Text>
          )}
          <Text style={styles.subtitle}>
            {locale === "th" ? "ช่วงวันที่" : "Period"}: {dateRange}
          </Text>
          <Text style={styles.subtitle}>
            {locale === "th" ? "พิมพ์เมื่อ" : "Generated"}:{" "}
            {formatDateTime(generatedAt, locale)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {locale === "th" ? "ยอดยกมา" : "Opening balance"}:
          </Text>
          <Text style={styles.summaryValue}>
            {openingBalance != null ? `฿${formatAmount(openingBalance)}` : "—"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {locale === "th" ? "รายรับรวม" : "Total credits"}:
          </Text>
          <Text style={styles.summaryValue}>฿{formatAmount(totalCredits)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {locale === "th" ? "รายจ่ายรวม" : "Total debits"}:
          </Text>
          <Text style={styles.summaryValue}>฿{formatAmount(totalDebits)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {locale === "th" ? "ยอดปิดบัญชี" : "Closing balance"}:
          </Text>
          <Text style={styles.summaryValue}>
            {closingBalance != null ? `฿${formatAmount(closingBalance)}` : "—"}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>
            {locale === "th" ? "วันที่" : "Date"}
          </Text>
          <Text style={styles.colType}>
            {locale === "th" ? "ประเภท" : "Type"}
          </Text>
          <Text style={styles.colDesc}>
            {locale === "th" ? "รายละเอียด" : "Description"}
          </Text>
          {!account && (
            <Text style={styles.colAccount}>
              {locale === "th" ? "บัญชี" : "Account"}
            </Text>
          )}
          <Text style={styles.colDebit}>
            {locale === "th" ? "เดบิต" : "Debit"}
          </Text>
          <Text style={styles.colCredit}>
            {locale === "th" ? "เครดิต" : "Credit"}
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>
              {locale === "th" ? "ไม่มีรายการ" : "No transactions"}
            </Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const desc = [tx.category, tx.note].filter(Boolean).join(" — ") || "—";
            const accountLabel = account
              ? undefined
              : tx.transferAccountName
                ? `→ ${tx.transferAccountName}`
                : tx.accountName ?? "—";

            return (
              <View key={tx.id} style={styles.tableRow}>
                <Text style={styles.colDate}>
                  {formatDate(tx.occurredAt, locale)}
                </Text>
                <Text style={styles.colType}>
                  {getTypeLabel(tx.type, locale)}
                </Text>
                <Text style={styles.colDesc}>{desc}</Text>
                {!account && (
                  <Text style={styles.colAccount}>{accountLabel}</Text>
                )}
                <Text style={styles.colDebit}>
                  {tx.debit > 0 ? formatAmount(tx.debit) : ""}
                </Text>
                <Text style={styles.colCredit}>
                  {tx.credit > 0 ? formatAmount(tx.credit) : ""}
                </Text>
              </View>
            );
          })
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${locale === "th" ? "หน้า" : "Page"} ${pageNumber} / ${totalPages} · Generated by Judtang`
          }
        />
      </Page>
    </Document>
  );
}

export async function renderStatementPdf(data: StatementPdfData): Promise<Buffer> {
  const doc = React.createElement(StatementDocument, { data });
  // StatementDocument renders <Document><Page>...</Page></Document>; cast for renderToBuffer
  type DocElement = Parameters<typeof renderToBuffer>[0];
  return await renderToBuffer(doc as DocElement);
}
