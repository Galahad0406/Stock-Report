import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "13F 상위 20종목 리포트",
  description:
    "SEC EDGAR 13F 데이터를 집계해 기관 투자자들이 가장 많이 보유한 상위 20개 종목과 관련 뉴스를 매달 정리합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
