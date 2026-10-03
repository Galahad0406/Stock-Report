import { readFile } from "node:fs/promises";
import path from "node:path";

type NewsItem = {
  headline: string;
  summary?: string;
  source?: string;
  url: string;
  publishedAt: string;
};

type Holding = {
  cusip: string;
  issuerName: string;
  aggregateReportedValue: number;
  aggregateShares: number;
  filerCount: number;
  ticker?: string;
  exchange?: string;
  securityName?: string;
  news: NewsItem[];
};

type ReportData = {
  generatedAt: string | null;
  sourceQuarter: string | null;
  sourceDatasetUrl: string | null;
  methodology: string;
  totalRowsProcessed: number;
  totalUniqueCusips: number;
  holdings: Holding[];
};

async function getData(): Promise {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "latest.json");
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      generatedAt: null,
      sourceQuarter: null,
      sourceDatasetUrl: null,
      methodology: "데이터 로딩 실패",
      totalRowsProcessed: 0,
      totalUniqueCusips: 0,
      holdings: [],
    };
  }
}

function formatUSD(n: number) {
  if (!n) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "업데이트 안 됨";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const data = await getData();
  const hasData = data.holdings && data.holdings.length > 0;

  return (
    
      {/* iOS 스타일 헤더 */}
