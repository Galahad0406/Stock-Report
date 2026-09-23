// scripts/update-data.mjs
//
// 이 스크립트가 하는 일 (월간 자동 실행, .github/workflows/update-data.yml 참고):
//   1) SEC EDGAR의 공식 Form 13F 분기 데이터셋(ZIP)을 내려받는다.
//      (https://www.sec.gov/dera/data/form-13f — 모든 13F 제출 기관의 원본 데이터)
//   2) 그 안의 INFOTABLE.tsv (기관별 보유 종목 명세)를 스트리밍으로 읽으며
//      CUSIP 기준으로 전체 기관 투자자의 보유금액(VALUE)을 합산한다.
//   3) 합산 금액 기준 상위 20개 종목을 추린다.
//   4) OpenFIGI API로 CUSIP → 티커/거래소를 매핑한다.
//   5) Finnhub 뉴스 API로 각 종목의 최근 뉴스를 가져온다.
//   6) 결과를 public/data/latest.json 으로 저장한다. (Next.js 앱이 이 파일을 읽어 리포트를 렌더링)
//
// 중요한 현실적 제약 (README.md에도 설명):
//   - SEC 13F는 분기 공시이며, 이 데이터셋 자체는 "분기 1회"만 갱신된다.
//     즉 매달 1일 실행되어도 같은 분기 안에서는 순위(보유종목)가 바뀌지 않을 수 있다.
//     대신 뉴스 섹션은 매달 최신 뉴스로 갱신된다.
//   - VALUE 컬럼 단위는 SEC 포맷 개정 시점에 따라 다를 수 있다(과거: 천달러 단위,
//     2023년 XML 스키마 개정 이후: 실제 달러 단위인 제출 건 혼재 가능).
//     본 스크립트는 원본 값을 그대로 합산하고, 화면에는 "SEC 원자료 합산 기준"이라고 표기한다.
//     정밀한 금액이 필요하면 SEC의 13F Data Sets 문서(PDF)로 해당 분기 스키마를 확인할 것.
//   - CUSIP→티커 매핑은 OpenFIGI의 공개 매핑에 의존하며, 모든 CUSIP이 100% 매핑되지는 않는다.
//     매핑 실패 종목은 발행사명(NAMEOFISSUER)과 CUSIP만 표시된다.

import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import unzipper from "unzipper";

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || "sec13f-top20-tracker research-contact@example.com";
const OPENFIGI_API_KEY = process.env.OPENFIGI_API_KEY || ""; // 없어도 동작(속도만 느림)
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ""; // 없으면 뉴스는 생략
const TOP_N = Number(process.env.TOP_N || 20);
const OUT_PATH = path.join(process.cwd(), "public", "data", "latest.json");

// ---------- 1. 최신 사용 가능한 분기 결정 ----------
// SEC는 분기 마감 후 약간의 지연을 두고 데이터셋을 올리므로, "오늘" 기준으로
// 가장 최근에 이미 게시되었을 가능성이 높은 분기부터 최신순으로 시도한다.
function candidateQuarters(count = 4) {
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1; // 1~4
  // 이번 분기는 아직 데이터셋이 없을 가능성이 높으므로 하나 이전 분기부터 시작
  q -= 1;
  if (q === 0) {
    q = 4;
    y -= 1;
  }
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(`${y}q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return list;
}

function datasetUrl(tag) {
  return `https://www.sec.gov/files/structureddata/data/form-13f-data-sets/${tag}_form13f.zip`;
}

async function fetchWithUA(url, init = {}) {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": SEC_USER_AGENT,
      Accept: "*/*",
      ...(init.headers || {}),
    },
  });
}

async function findAvailableDataset() {
  for (const tag of candidateQuarters(4)) {
    const url = datasetUrl(tag);
    const res = await fetchWithUA(url, { method: "HEAD" });
    if (res.ok) return { tag, url };
    console.log(`[info] ${tag} 데이터셋 없음 (status ${res.status}), 이전 분기 시도...`);
  }
  throw new Error("최근 4개 분기 내에서 사용 가능한 13F 데이터셋을 찾지 못했습니다.");
}

// ---------- 2~3. INFOTABLE.tsv 스트리밍 파싱 + CUSIP 합산 ----------
async function aggregateHoldings(zipUrl) {
  const res = await fetchWithUA(zipUrl);
  if (!res.ok || !res.body) {
    throw new Error(`13F 데이터셋 다운로드 실패: ${res.status}`);
  }

  const tmpZipPath = path.join(process.cwd(), ".cache-13f.zip");
  mkdirSync(path.dirname(tmpZipPath), { recursive: true });
  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmpZipPath);
    res.body.pipe(out);
    res.body.on("error", reject);
    out.on("finish", resolve);
  });

  const directory = await unzipper.Open.file(tmpZipPath);
  const infoTableEntry = directory.files.find((f) => /INFOTABLE\.tsv$/i.test(f.path));
  if (!infoTableEntry) {
    throw new Error("ZIP 안에서 INFOTABLE.tsv를 찾지 못했습니다.");
  }

  const totals = new Map(); // cusip -> { name, valueSum, sharesSum, filers:Set }
  const stream = infoTableEntry.stream();
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerCols = null;
  let idx = {};
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (!headerCols) {
      headerCols = cols.map((c) => c.trim().toUpperCase());
      idx = {
        accession: headerCols.indexOf("ACCESSION_NUMBER"),
        name: headerCols.indexOf("NAMEOFISSUER"),
        cusip: headerCols.indexOf("CUSIP"),
        value: headerCols.indexOf("VALUE"),
        shares: headerCols.indexOf("SSHPRNAMT"),
      };
      continue;
    }
    const cusip = cols[idx.cusip]?.trim();
    if (!cusip) continue;
    const value = Number(cols[idx.value]) || 0;
    const shares = Number(cols[idx.shares]) || 0;
    const name = cols[idx.name]?.trim() || cusip;
    const accession = cols[idx.accession]?.trim();

    let entry = totals.get(cusip);
    if (!entry) {
      entry = { cusip, name, valueSum: 0, sharesSum: 0, filers: new Set() };
      totals.set(cusip, entry);
    }
    entry.valueSum += value;
    entry.sharesSum += shares;
    if (accession) entry.filers.add(accession);

    if (lineNo % 500000 === 0) {
      console.log(`[info] ${lineNo.toLocaleString()}행 처리, 종목 수 ${totals.size.toLocaleString()}`);
    }
  }

  const ranked = [...totals.values()]
    .sort((a, b) => b.valueSum - a.valueSum)
    .slice(0, TOP_N)
    .map((e) => ({
      cusip: e.cusip,
      issuerName: e.name,
      aggregateReportedValue: e.valueSum,
      aggregateShares: e.sharesSum,
      filerCount: e.filers.size,
    }));

  return { ranked, totalRowsProcessed: lineNo - 1, totalUniqueCusips: totals.size };
}

// ---------- 4. CUSIP -> 티커 매핑 (OpenFIGI) ----------
async function mapCusipsToTickers(items) {
  const jobs = items.map((it) => ({ idType: "ID_CUSIP", idValue: it.cusip }));
  const results = [];
  const batchSize = OPENFIGI_API_KEY ? 100 : 10; // 키 없으면 무료 한도가 더 낮음
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const res = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OPENFIGI_API_KEY ? { "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.warn(`[warn] OpenFIGI 매핑 실패 (status ${res.status}) — 해당 배치는 티커 없이 진행`);
      results.push(...batch.map(() => null));
      continue;
    }
    const data = await res.json();
    for (const row of data) {
      if (row?.data?.length) {
        const best = row.data[0];
        results.push({ ticker: best.ticker, exchange: best.exchCode, securityName: best.name });
      } else {
        results.push(null);
      }
    }
    // 무료 한도 보호를 위한 간단한 딜레이
    await new Promise((r) => setTimeout(r, OPENFIGI_API_KEY ? 300 : 1500));
  }

  return items.map((it, i) => ({ ...it, ...(results[i] || {}) }));
}

// ---------- 5. 종목별 최근 뉴스 (Finnhub) ----------
async function attachNews(items) {
  if (!FINNHUB_API_KEY) {
    console.warn("[warn] FINNHUB_API_KEY가 없어 뉴스 수집을 건너뜁니다.");
    return items.map((it) => ({ ...it, news: [] }));
  }
  const to = new Date();
  const from = new Date(to.getTime() - 21 * 24 * 60 * 60 * 1000); // 최근 3주
  const fmt = (d) => d.toISOString().slice(0, 10);

  const out = [];
  for (const it of items) {
    if (!it.ticker) {
      out.push({ ...it, news: [] });
      continue;
    }
    try {
      const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
        it.ticker
      )}&from=${fmt(from)}&to=${fmt(to)}&token=${FINNHUB_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const articles = await res.json();
      const news = (Array.isArray(articles) ? articles : [])
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 5)
        .map((a) => ({
          headline: a.headline,
          summary: a.summary,
          source: a.source,
          url: a.url,
          publishedAt: new Date(a.datetime * 1000).toISOString(),
        }));
      out.push({ ...it, news });
    } catch (e) {
      console.warn(`[warn] ${it.ticker} 뉴스 수집 실패: ${e.message}`);
      out.push({ ...it, news: [] });
    }
    await new Promise((r) => setTimeout(r, 250)); // Finnhub 무료 한도 보호
  }
  return out;
}

// ---------- 실행 ----------
async function main() {
  console.log("[1/5] 사용 가능한 최신 13F 분기 데이터셋 확인 중...");
  const { tag, url } = await findAvailableDataset();
  console.log(`[info] 사용 데이터셋: ${tag} (${url})`);

  console.log("[2/5] INFOTABLE.tsv 다운로드 및 CUSIP별 합산 중... (파일이 커서 몇 분 걸릴 수 있음)");
  const { ranked, totalRowsProcessed, totalUniqueCusips } = await aggregateHoldings(url);
  console.log(`[info] ${totalRowsProcessed.toLocaleString()}건 처리, 고유 종목 ${totalUniqueCusips.toLocaleString()}개`);

  console.log("[3/5] CUSIP → 티커 매핑 중...");
  const withTickers = await mapCusipsToTickers(ranked);

  console.log("[4/5] 종목별 최근 뉴스 수집 중...");
  const withNews = await attachNews(withTickers);

  console.log("[5/5] 결과 저장 중...");
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceQuarter: tag,
    sourceDatasetUrl: url,
    methodology:
      "SEC EDGAR Form 13F 분기 데이터셋의 INFOTABLE.tsv를 전량 스트리밍 파싱하여, 모든 기관 투자자가 보고한 VALUE를 CUSIP 기준으로 합산한 뒤 상위 종목을 추출했습니다.",
    totalRowsProcessed,
    totalUniqueCusips,
    holdings: withNews,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[done] ${OUT_PATH} 저장 완료 (${withNews.length}개 종목)`);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
