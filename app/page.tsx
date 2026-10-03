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
      methodology: "데이터 대기 중",
      totalRowsProcessed: 0,
      totalUniqueCusips: 0,
      holdings: [],
    };
  }
}

export default async function Home() {
  const data = await getData();

  return (
