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

async function getData(): Promise<ReportData> {
  const filePath = path.join(process.cwd(), "public", "data", "latest.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function formatUSD(n: number) {
  if (!n) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "아직 실행되지 않음";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function Home() {
  const data = await getData();
  const hasData = data.holdings && data.holdings.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="mb-12">
        <p className="font-mono text-xs text-ledger/70">SEC EDGAR FORM 13F · 기관투자자 보유종목 집계</p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-ink sm:text-5xl">
          이번 분기, 기관들이 가장 많이 담은 20개 종목
        </h1>
        <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink/70">
          SEC에 제출된 모든 Form 13F 분기 공시(INFOTABLE)를 종목(CUSIP) 기준으로 합산해
          기관 투자자 전체의 보유금액 상위 20개 종목을 추립니다. 각 종목 아래에는 최근 관련
          뉴스를 함께 정리해, 왜 이 종목이 기관 자금을 끌어들였는지 가늠할 수 있는 단서를 제공합니다.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-4 rule-line pt-6 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink/50">기준 분기</dt>
            <dd className="mt-1 font-mono text-ink">{data.sourceQuarter ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink/50">최근 업데이트</dt>
            <dd className="mt-1 font-mono text-ink">{formatDate(data.generatedAt)}</dd>
          </div>
          <div>
            <dt className="text-ink/50">처리한 보고 행 수</dt>
            <dd className="mt-1 font-mono text-ink">
              {data.totalRowsProcessed ? data.totalRowsProcessed.toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">고유 종목 수</dt>
            <dd className="mt-1 font-mono text-ink">
              {data.totalUniqueCusips ? data.totalUniqueCusips.toLocaleString() : "—"}
            </dd>
          </div>
        </dl>
      </header>

      {!hasData && (
        <div className="rounded-sm border border-brass/40 bg-brass/5 px-5 py-4 text-sm text-ink/80">
          아직 리포트 데이터가 생성되지 않았습니다. <code className="font-mono">npm run update-data</code>를
          로컬 또는 GitHub Actions에서 한 번 실행하면 이 페이지가 채워집니다.
        </div>
      )}

      <ol className="mt-4 divide-y divide-rule">
        {data.holdings.map((h, i) => (
          <li key={h.cusip} className="py-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-brass">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-display text-2xl font-medium text-ink">
                  {h.issuerName}
                  {h.ticker && <span className="ticker-badge ml-3 align-middle">{h.ticker}</span>}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg text-ledger">{formatUSD(h.aggregateReportedValue)}</div>
                <div className="text-xs text-ink/50">{h.filerCount.toLocaleString()}개 기관 보고 합산</div>
              </div>
            </div>

            <p className="mt-2 font-mono text-xs text-ink/40">CUSIP {h.cusip}</p>

            {h.news && h.news.length > 0 ? (
              <div className="mt-4 space-y-3 border-l-2 border-rule pl-5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">관련 뉴스</p>
                {h.news.map((n) => (
                  <a
                    key={n.url}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm leading-relaxed text-ink/80 hover:text-ledger"
                  >
                    <span className="font-medium text-ink">{n.headline}</span>
                    {n.summary && <span className="text-ink/60"> — {n.summary}</span>}
                    <span className="ml-2 text-xs text-ink/40">
                      {n.source} · {new Date(n.publishedAt).toLocaleDateString("ko-KR")}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-4 pl-5 text-sm text-ink/40">관련 뉴스가 수집되지 않았습니다.</p>
            )}
          </li>
        ))}
      </ol>

      <footer className="mt-16 rule-line pt-8 text-xs leading-relaxed text-ink/50">
        <p>{data.methodology}</p>
        {data.sourceDatasetUrl && (
          <p className="mt-2">
            원본 데이터셋:{" "}
            <a href={data.sourceDatasetUrl} className="underline" target="_blank" rel="noreferrer">
              {data.sourceDatasetUrl}
            </a>
          </p>
        )}
        <p className="mt-2">
          본 리포트는 투자 자문이 아니며, 공개된 13F 공시를 기계적으로 집계·요약한 참고 자료입니다.
          13F는 최대 45일의 보고 지연이 있어 실제 현재 보유 현황과 다를 수 있습니다.
        </p>
      </footer>
    </main>
  );
}

export const revalidate = 0;
