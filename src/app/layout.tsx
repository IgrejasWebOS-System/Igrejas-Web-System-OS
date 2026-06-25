import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IgrejasWeb System OS",
  description: "Sistema de gestão eclesiástica multi-tenant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
