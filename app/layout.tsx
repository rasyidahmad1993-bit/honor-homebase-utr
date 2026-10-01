import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Honor Homebase UTR",
  description: "Kalkulator & database honor homebase dosen struktural Universitas Tangerang Raya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Source+Sans+3:wght@400;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
