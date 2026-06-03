import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "台股看盤資料站",
  description: "台股報價、技術指標、三大法人籌碼與基本面資料,資料來源:證交所公開資料",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight">
              📈 台股看盤資料站
            </Link>
            <span className="text-xs text-slate-400">
              資料來源:臺灣證券交易所公開資料
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500">
          本站資料僅供參考,不構成投資建議。報價可能為延遲資料。
        </footer>
      </body>
    </html>
  );
}
