import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tobirama Financial OS",
  description: "Sistema Control de Activos de Alta Gerencia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-black text-[#f8fafc]">{children}</body>
    </html>
  );
}
