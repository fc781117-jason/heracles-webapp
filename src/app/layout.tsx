import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heracles 自主進化系統",
  description: "Heracles × 今天吃什麼：英雄試煉式健康管理 Web App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-[#0f172a] text-slate-50">{children}</body>
    </html>
  );
}
