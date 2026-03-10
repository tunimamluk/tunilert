import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tunilert – Israel Red Alert Statistics",
  description: "Real-time and historical statistics for Israeli red alerts (Tzeva Adom)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#09090f]">{children}</body>
    </html>
  );
}
