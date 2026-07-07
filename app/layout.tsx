import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norn: variant interpretation copilot",
  description:
    "Norn drafts ACMG/AMP evidence for a human curator: it gathers public genomics data, adjudicates each criterion with Claude, and applies the ClinGen points framework. Research and demonstration only.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
