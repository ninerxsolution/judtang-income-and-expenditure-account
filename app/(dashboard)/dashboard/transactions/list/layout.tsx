import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction list | Judtang",
};

export default function TransactionListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
