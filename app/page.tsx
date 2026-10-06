"use client";

import { useEffect, useMemo, useState } from "react";

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
  rowsSelected?: number;
  totalUniqueCusips: number;
  filerCount?: number;
  newsProvider?: string;
  newsDays?: number;
  holdings: Holding[];
};

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatShares(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US");
}

export default function Home() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/latest.json", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`데이터 요청 실패 (${response.status})`);
        return response.json();
      })
      .then((json: unknown) => {
        if (!json || typeof json !== "object" || !Array.isArray((json as ReportData).holdings)) {
          throw new Error("데이터 파일 형식이 올바르지 않습니다.");
        }
        setData(json as ReportData);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const filteredHoldings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.holdings ?? []).filter((item) =>
      [item.issuerName, item.cusip, item.ticker ?? "", item.securityName ?? ""]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [data, search]);

  if (loading) {
    return <main className="mx-auto max-w-5xl p-8 text-center text-appleSubText">리포트 데이터를 불러오는 중…</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">데이터를 불러오지 못했습니다</h1>
        <p className="mt-3 text-appleSubText">{error}</p>
        <button className="mt-5 rounded-xl bg-appleAccent px-4 py-2 text-black" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-appleAccent">SEC EDGAR · FORM 13F</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">기관 투자자 보유 종목 Top 20</h1>
        <p className="mt-3 text-sm text-appleSubText">SEC 공식 13F와 최근 뉴스를 자동 집계한 참고용 리포트입니다.</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["보고기간", data?.sourceQuarter || "데이터 없음"],
          ["기관 수", (data?.filerCount ?? 0).toLocaleString()],
          ["처리 행", (data?.totalRowsProcessed ?? 0).toLocaleString()],
          ["고유 CUSIP", (data?.totalUniqueCusips ?? 0).toLocaleString()],
        ].map(([label, value]) => (
          <div className="apple-card p-4" key={label}>
            <p className="text-sm text-appleSubText">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-xl font-semibold">상위 보유 종목 <span className="text-sm text-appleSubText">({filteredHoldings.length})</span></h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="회사명, 티커, CUSIP 검색"
          aria-label="종목 검색"
          className="w-full rounded-xl border border-white/10 bg-appleCard px-4 py-3 outline-none focus:border-appleAccent sm:max-w-sm"
        />
      </div>

      <div className="grid gap-3">
        {filteredHoldings.map((holding, index) => (
          <button
            key={holding.cusip}
            onClick={() => setSelectedHolding(holding)}
            className="apple-card grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 p-4 text-left sm:grid-cols-[3rem_1fr_9rem_9rem]"
          >
            <span className="text-lg font-semibold text-appleSubText">{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{holding.issuerName}</span>
              <span className="mt-1 block text-xs text-appleSubText">
                {holding.ticker || holding.cusip}{holding.exchange ? ` · ${holding.exchange}` : ""}
              </span>
            </span>
            <span className="hidden text-right sm:block">
              <span className="block font-semibold">{formatCurrency(holding.aggregateReportedValue)}</span>
              <span className="text-xs text-appleSubText">보고 금액</span>
            </span>
            <span className="text-right">
              <span className="block font-semibold">{holding.filerCount.toLocaleString()}</span>
              <span className="text-xs text-appleSubText">기관 수</span>
            </span>
          </button>
        ))}
        {filteredHoldings.length === 0 && <p className="rounded-xl border border-white/10 p-8 text-center text-appleSubText">검색 결과가 없습니다.</p>}
      </div>

      <footer className="mt-8 border-t border-white/10 pt-4 text-xs text-appleSubText">
        데이터 생성: {formatDate(data?.generatedAt)} · 뉴스: {data?.newsProvider || "GDELT"} · 투자 자문이 아닙니다.
      </footer>

      {selectedHolding && (
        <div role="presentation" onClick={() => setSelectedHolding(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <section role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-appleCard p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="detail-title" className="text-xl font-bold">{selectedHolding.issuerName}</h2>
                <p className="mt-1 text-sm text-appleSubText">{selectedHolding.ticker || selectedHolding.cusip}</p>
              </div>
              <button onClick={() => setSelectedHolding(null)} aria-label="닫기" className="rounded-lg px-3 py-1 text-appleSubText hover:bg-white/10">닫기 ✕</button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-appleSubText">합산 보고 금액</p><p className="mt-1 font-semibold">{formatCurrency(selectedHolding.aggregateReportedValue)}</p></div>
              <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-appleSubText">합산 주식 수</p><p className="mt-1 font-semibold">{formatShares(selectedHolding.aggregateShares)}</p></div>
            </div>

            <h3 className="mt-6 font-semibold">관련 뉴스</h3>
            <div className="mt-2 space-y-3">
              {selectedHolding.news?.length ? selectedHolding.news.map((news, index) => (
                <article key={`${news.url}-${index}`} className="border-t border-white/10 pt-3">
                  <a href={news.url} target="_blank" rel="noopener noreferrer" className="font-medium text-appleAccent hover:underline">{news.headline}</a>
                  {news.summary && <p className="mt-1 text-sm text-appleSubText">{news.summary}</p>}
                  <p className="mt-1 text-xs text-appleSubText">{news.source || "GDELT"} · {formatDate(news.publishedAt)}</p>
                </article>
              )) : <p className="text-sm text-appleSubText">등록된 뉴스가 없습니다.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
