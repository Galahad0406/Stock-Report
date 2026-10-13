"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BellDot,
  Building2,
  ExternalLink,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type NewsArticle = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
};

type TopHolding = {
  rank: number;
  ticker: string;
  cusip: string;
  company: string;
  marketValue: number;
  marketValueLabel: string;
  holders: number;
  recentChange: string;
  summary: string;
  news: NewsArticle[];
};

type Insight = {
  title: string;
  description: string;
  score: number;
};

type LatestData = {
  generatedAt: string;
  source: string;
  period: string;
  methodology: string;
  top10: TopHolding[];
  insights: Insight[];
};

export default function Home() {
  const [data, setData] = useState<LatestData | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/latest.json")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json.top10?.length) {
          setSelectedTicker(json.top10[0].ticker);
        }
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!data?.top10) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.top10;

    return data.top10.filter(
      (item) =>
        item.ticker.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.cusip.toLowerCase().includes(q)
    );
  }, [data, search]);

  const selected =
    filtered.find((item) => item.ticker === selectedTicker) ?? filtered[0] ?? data?.top10[0] ?? null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-lg shadow-slate-900/10">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b7280]">
                  STOCK REPORT
                </p>
                <span className="rounded-full border border-[#dfe3eb] bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[#4b5563]">
                  LIVE
                </span>
              </div>
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-[#111827]">
                SEC 13F Top 10 Report
              </h1>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="티커 / 종목 / CUSIP 검색"
              className="h-11 w-full rounded-full border border-[#dfe3eb] bg-white/80 pl-10 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/15"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="apple-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="apple-badge mb-4">
                <Sparkles className="h-3.5 w-3.5 text-[#0a84ff]" />
                Free institutional signal
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.06em] text-[#111827] sm:text-5xl">
                기관이 가장 많이 담은 종목을 한눈에.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#4b5563]">
                SEC Form 13F 데이터를 기반으로 가장 많이 투자되고 있는 상위 10개의 종목과 뉴스 기반의
                투자 판단을 함께 보여줍니다.
              </p>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                  기준 기간
                </div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{data?.period ?? "2026-Q1"}</div>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                  업데이트
                </div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">월 1일</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="apple-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Top 10</div>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">{data?.top10.length ?? 10}</div>
            <p className="mt-2 text-sm text-[#4b5563]">가장 많이 보유된 종목</p>
          </div>
          <div className="apple-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">뉴스 기반</div>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">3점</div>
            <p className="mt-2 text-sm text-[#4b5563]">실시간 이슈 해석</p>
          </div>
          <div className="apple-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">데이터 소스</div>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">무료</div>
            <p className="mt-2 text-sm text-[#4b5563]">SEC + 공개 뉴스</p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="apple-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#0a84ff]" />
                <h3 className="text-lg font-semibold text-[#111827]">기관 보유 상위 종목</h3>
              </div>
              <span className="text-xs font-medium text-[#6b7280]">{filtered.length}개 표시</span>
            </div>

            <div className="soft-scrollbar max-h-[760px] overflow-auto">
              {filtered.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center p-6 text-[#6b7280]">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.ticker}
                    onClick={() => setSelectedTicker(item.ticker)}
                    className={`flex w-full items-center justify-between gap-4 border-b border-black/5 px-5 py-4 text-left transition hover:bg-[#f8fafc] ${
                      selected?.ticker === item.ticker ? "bg-[#f3f7ff]" : "bg-transparent"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a84ff]/10 text-sm font-bold text-[#0a84ff]">
                        {item.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-[#111827]">{item.ticker}</span>
                          <span className="ticker-pill">{item.holders} holders</span>
                        </div>
                        <div className="truncate text-sm text-[#4b5563]">{item.company}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-semibold text-[#111827]">{item.marketValueLabel}</div>
                      <div className="text-sm font-medium text-[#16a34a]">{item.recentChange}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="apple-panel p-6">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-5">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6b7280]">
                      Selected stock
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#111827]">
                        {selected.company}
                      </h3>
                      <span className="ticker-pill">{selected.ticker}</span>
                    </div>
                    <div className="mt-2 text-sm text-[#6b7280]">CUSIP {selected.cusip}</div>
                  </div>
                  <div className="rounded-2xl bg-[#0a84ff]/10 px-3 py-2 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Change</div>
                    <div className="mt-1 text-base font-semibold text-[#0a84ff]">{selected.recentChange}</div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between text-sm text-[#6b7280]">
                      <span>총 기관 보유 가치</span>
                      <span className="font-semibold text-[#111827]">{selected.marketValueLabel}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-[#6b7280]">
                      <span>기관 보유 수</span>
                      <span className="font-semibold text-[#111827]">{selected.holders}개</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#dfe3eb] bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#111827]">
                      <TrendingUp className="h-4 w-4 text-[#0a84ff]" />
                      왜 상위 10위 안에 들었나?
                    </div>
                    <p className="text-sm leading-7 text-[#4b5563]">{selected.summary}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#111827]">
                    <BellDot className="h-4 w-4 text-[#0a84ff]" />
                    최근 뉴스
                  </div>
                  <div className="space-y-3">
                    {selected.news.map((article, index) => (
                      <a
                        key={`${article.title}-${index}`}
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-3 transition hover:border-[#cfe4ff] hover:bg-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-[#111827]">{article.title}</div>
                          <ArrowUpRight className="h-4 w-4 text-[#6b7280]" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
                          <span>{article.source}</span>
                          <span>{new Date(article.publishedAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center text-[#6b7280]">
                종목을 선택해 주세요.
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 apple-panel p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#0a84ff]" />
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#111827]">
              뉴스 기반 향후 2년 유망 분야
            </h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data?.insights.map((insight) => (
              <article key={insight.title} className="rounded-3xl border border-[#e5e7eb] bg-[#f9fafb] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-[#111827]">{insight.title}</h4>
                  <span className="rounded-full bg-[#0a84ff]/10 px-2.5 py-1 text-xs font-semibold text-[#0a84ff]">
                    {insight.score}/100
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#4b5563]">{insight.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 pb-6 text-center text-xs text-[#6b7280]">
          <div className="flex items-center justify-center gap-2">
            <span>{data?.generatedAt ? new Date(data.generatedAt).toLocaleString("ko-KR") : "2026-10-13"}</span>
            <span>•</span>
            <span>{data?.source ?? "SEC 13F + News summary"}</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>무료 공개 데이터 기반 보고서</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
