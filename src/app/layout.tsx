import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "くすりログ - 服薬管理アプリ",
  description:
    "家族・少人数向けの服薬管理Webアプリ。LINEリマインドで飲み忘れを防止します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
