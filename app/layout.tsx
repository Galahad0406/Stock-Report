import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Report | SEC 13F Top 10",
  description: "SEC 13F 보유 상위 종목과 실시간 뉴스 기반 투자 설명 보고서",
  applicationName: "Stock Report",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stock Report",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
