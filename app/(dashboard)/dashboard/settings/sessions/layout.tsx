import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sessions | Judtang",
};

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
