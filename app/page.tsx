"use client";

import { useEffect, useState } from "react";
import { Building2, FileText, Search, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";

type Holder = {
  filerName: string;
  shrs: number;
  val: number;
  change: string;
};

type Holding = {
  cusip: string;
  ticker: string;
  name: string;
  totalValue: number;
  totalShares: number;
  filerCount: number;
  quarter: string;
  topHolders: Holder[];
};

type LatestData = {
  generatedAt: string | null;
  sourceQuarter: string | null;
  sourceDatasetUrl: string | null;
  methodology: string;
  totalRowsProcessed: number;
  totalUniqueCusips: number;
  holdings: Holding[];
};

export default function Home() {
  const [data, setData] = useState<LatestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  useEffect(() => {
    fetch("/data/latest.json")
      .then(res => res.json())
      .then(json => {
        setData(json);
        if (json.holdings && json.holdings.length > 0) {
          setSelectedHolding(json.holdings[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load 13F data:", err);
        setLoading(false);
      });
  }, []);

  const filteredHoldings = data?.holdings.filter(h =>
    h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.cusip.includes(searchQuery)
  ) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                SEC 13F Institutional Tracker
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  Main Report
                </span>
              </h1>
              <p className="text-xs text-slate-400">기관 투자자 보유 지분 공시(Form 13F) 대시보드</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="티커, 종목명, CUSIP 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium mb-1">기준 분기</div>
              <div className="text-lg font-bold text-white">{data?.sourceQuarter || "2026-Q1"}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium mb-1">분석된 종목 수</div>
              <div className="text-lg font-bold text-blue-400">{data?.totalUniqueCusips || 0} CUSIPs</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium mb-1">데이터 제공처</div>
              <div className="text-sm font-semibold text-slate-200 truncate">SEC EDGAR Form 13F</div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                기관 보유 상위 종목 목록
              </h2>
              <span className="text-xs text-slate-400">총 {filteredHoldings.length}개 종목</span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-500">데이터를 불러오는 중입니다...</div>
            ) : filteredHoldings.length === 0 ? (
              <div className="py-20 text-center text-slate-500">검색 결과가 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-6">종목 / CUSIP</th>
                      <th className="py-3 px-6 text-right">총 평가금액 ($)</th>
                      <th className="py-3 px-6 text-right">보유 주식수</th>
                      <th className="py-3 px-6 text-center">보고 기관수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm">
                    {filteredHoldings.map(h => (
                      <tr
                        key={h.cusip}
                        onClick={() => setSelectedHolding(h)}
                        className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${
                          selectedHolding?.cusip === h.cusip ? "bg-blue-600/10 border-l-2 border-blue-500" : ""
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{h.ticker}</span>
                            <span className="text-xs font-normal text-slate-400">({h.name})</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">CUSIP: {h.cusip}</div>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-slate-200">
                          ${(h.totalValue * 1000).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-300 font-mono">
                          {h.totalShares.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full text-xs font-medium">
                            {h.filerCount}개 기관
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Details Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sticky top-24 shadow-xl">
            {selectedHolding ? (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-6">
                  <div>
                    <div className="text-xs text-blue-400 font-semibold mb-1">선택된 종목 상세 분석</div>
                    <h3 className="text-xl font-bold text-white">{selectedHolding.name} ({selectedHolding.ticker})</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">CUSIP: {selectedHolding.cusip}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-xs text-slate-400">총 기관 평가액</span>
                    <span className="font-bold text-white">${(selectedHolding.totalValue * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-xs text-slate-400">총 보유 주식</span>
                    <span className="font-bold text-slate-200 font-mono">{selectedHolding.totalShares.toLocaleString()} 주</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    주요 보유 기관 (Top Holders)
                  </h4>
                  <div className="space-y-3">
                    {selectedHolding.topHolders.map((holder, idx) => (
                      <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="font-semibold text-slate-200 flex justify-between items-center">
                          <span className="truncate max-w-[180px]">{holder.filerName}</span>
                          <span className={`font-mono px-1.5 py-0.5 rounded ${
                            holder.change.startsWith("+") ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {holder.change}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 font-mono">
                          <span>보유주: {holder.shrs.toLocaleString()}</span>
                          <span>평가액: ${(holder.val * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {data?.sourceDatasetUrl && (
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <a
                      href={data.sourceDatasetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-medium transition-colors"
                    >
                      SEC EDGAR 공식 공시 원문 바로가기
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-slate-500 text-sm">
                목록에서 종목을 선택하시면 상세한 13F 기관 보유 내역을 확인하실 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30 py-6 text-center text-xs text-slate-500">
        <p>SEC 13F Institutional Holdings Dashboard. Designed for regulatory and institutional asset tracking.</p>
      </footer>
    </div>
  );
}
