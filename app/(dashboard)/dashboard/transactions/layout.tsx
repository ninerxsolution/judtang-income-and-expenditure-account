import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transactions | Judtang",
};

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
