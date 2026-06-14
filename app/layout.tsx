import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirScout — AI Flight Deal Engine",
  description: "Autonomous AI agents scan global inventories for the cheapest way there.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
