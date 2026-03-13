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
      {/* Apply saved theme before paint to prevent flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tunilert_theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
