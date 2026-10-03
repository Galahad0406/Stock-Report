import { createWriteStream, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import unzipper from "unzipper";
import Parser from "rss-parser";

const parser = new Parser();
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || "sec13f-tracker research-contact@example.com";
const OPENFIGI_API_KEY = process.env.OPENFIGI_API_KEY || "";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
const TOP_N = Number(process.env.TOP_N || 20);
const OUT_PATH = path.join(process.cwd(), "public", "data", "latest.json");

function candidateQuarters(count = 4) {
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1 - 1;
  if (q === 0) {
    q = 4;
    y -= 1;
  }
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(`\({y}q\){q}`);
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
    try {
      const res = await fetchWithUA(url, { method: "HEAD" });
      if (res.ok) return { tag, url };
    } catch {
      // 무시하고 다음 시도
    }
    console.log(`[info] ${tag} 데이터셋 확인 실패, 이전 분기 시도...`);
  }
  throw new Error("사용 가능한 13F 데이터셋을 찾지 못했습니다.");
}

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
    throw new Error("INFOTABLE.tsv를 ZIP 내에서 찾지 못했습니다.");
  }

  const totals = new Map();
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

async function mapCusipsToTickers(items) {
  const jobs = items.map((it) => ({ idType: "ID_CUSIP", idValue: it.cusip }));
  const results = [];
  const batchSize = OPENFIGI_API_KEY ? 100 : 10;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    try {
      const res = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(OPENFIGI_API_KEY ? { "X-OPENFIGI-APIKEY": OPENFIGI_API_KEY } : {}),
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        const data = await res.json();
        for (const row of data) {
          if (row?.data?.length) {
            const best = row.data[0];
            results.push({ ticker: best.ticker, exchange: best.exchCode, securityName: best.name });
          } else {
            results.push(null);
          }
        }
      } else {
        results.push(...batch.map(() => null));
      }
    } catch {
      results.push(...batch.map(() => null));
    }
    await new Promise((r) => setTimeout(r, OPENFIGI_API_KEY ? 200 : 1000));
  }
  return items.map((it, i) => ({ ...it, ...(results[i] || {}) }));
}

// Google News RSS 수집 함수
async function fetchGoogleNews(query) {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(rssUrl);
    return feed.items.slice(0, 3).map((item) => ({
      headline: item.title,
      summary: item.contentSnippet || "",
      source: item.creator || "Google News",
      url: item.link,
      publishedAt: item.isoDate || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function attachNews(items) {
  const out = [];
  for (const it of items) {
    const query = it.ticker ? `${it.ticker} stock` : it.issuerName;
    const news = await fetchGoogleNews(query);
    out.push({ ...it, news });
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

async function main() {
  console.log("[1/4] 최신 13F 데이터셋 확인...");
  const { tag, url } = await findAvailableDataset();

  console.log("[2/4] INFOTABLE.tsv 합산 중...");
  const { ranked, totalRowsProcessed, totalUniqueCusips } = await aggregateHoldings(url);

  console.log("[3/4] CUSIP -> 티커 매핑 중...");
  const withTickers = await mapCusipsToTickers(ranked);

  console.log("[4/4] Google News 수집 중...");
  const withNews = await attachNews(withTickers);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceQuarter: tag,
    sourceDatasetUrl: url,
    methodology: "SEC Form 13F 데이터셋을 파싱하고 Google News RSS를 수집하여 생성되었습니다.",
    totalRowsProcessed,
    totalUniqueCusips,
    holdings: withNews,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[완료] ${OUT_PATH} 저장 완료`);
}

main().catch((err) => {
  console.error("[오류]", err);
  process.exit(1);
});
