import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools | Judtang",
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
