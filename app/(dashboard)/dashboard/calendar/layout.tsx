import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar | Judtang",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
