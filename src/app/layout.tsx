import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "VoltMatch — Energy Efficiency Assessment",
  description:
    "Accurate electricity rate classification and energy efficiency measure analysis for Ontario commercial buildings",
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
