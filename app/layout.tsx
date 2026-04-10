import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magnetar Global Partners Dashboard",
  description: "Energy Asset Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}