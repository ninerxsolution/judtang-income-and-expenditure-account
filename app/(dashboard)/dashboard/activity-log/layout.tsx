import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Log | Judtang",
};

export default function ActivityLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
