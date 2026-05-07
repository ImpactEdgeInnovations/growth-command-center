import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Command Center",
  description: "Multi-company Growth OS for founders, teams, investor outreach, and AI-assisted execution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
