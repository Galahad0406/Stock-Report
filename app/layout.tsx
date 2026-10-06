import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "13F Institutional Holdings Top 20",
  description: "SEC EDGAR Form 13F 기관 투자자 보유 종목 Top 20 및 관련 뉴스 보고서",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "13F Tracker" },
};
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
