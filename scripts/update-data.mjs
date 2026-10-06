import { createWriteStream, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

const SEC_USER_AGENT = process.env.SEC_USER_AGENT || "Stock-Report/1.0 contact@example.com";
const TOP_N = Math.max(1, Number(process.env.TOP_N || 20));
const NEWS_PER_STOCK = Math.max(1, Math.min(10, Number(process.env.NEWS_PER_STOCK || 5)));
const NEWS_DAYS = Math.max(1, Math.min(90, Number(process.env.NEWS_DAYS || 31)));
const OUT_PATH = path.join(process.cwd(), "public", "data", "latest.json");
const CACHE_DIR = path.join(process.cwd(), ".cache");
const TMP_ZIP_PATH = path.join(CACHE_DIR, "13f.zip");

const DATASET_PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().toUpperCase();
}

function parseDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{2})-([A-Z]{3})-(\d{4})$/i);
  if (!match) return new Date(text);
  const months = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const month = months[match[2].toUpperCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

function dateKey(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

async function findAvailableDataset() {
  const response = await fetchWithUA(DATASET_PAGE);
  if (!response.ok) throw new Error(`SEC 데이터셋 페이지 접근 실패: HTTP ${response.status}`);
  const html = await response.text();
  const matches = [...html.matchAll(/href=["']([^"']+_form13f\.zip)["']/gi)]
    .map((match) => new URL(match[1], DATASET_PAGE).href)
    .filter((url) => url.startsWith("https://www.sec.gov/"));
  const unique = [...new Set(matches)];
  if (!unique.length) throw new Error(`SEC 13F ZIP 링크를 찾지 못했습니다. ${DATASET_PAGE}`);
  const url = unique[0];
  const filename = url.split("/").pop() || "SEC 13F";
  return { tag: filename.replace(/_form13f\.zip$/i, ""), url };
}

async function downloadDataset(url) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const res = await fetchWithUA(url);
  if (!res.ok || !res.body) throw new Error(`13F 데이터셋 다운로드 실패: HTTP ${res.status}`);
  const output = createWriteStream(TMP_ZIP_PATH);
  await pipeline(Readable.fromWeb(res.body), output);
  return TMP_ZIP_PATH;
}

function buildColumnIndex(columns) {
  const index = {};
  columns.forEach((column, i) => { index[normalizeHeader(column)] = i; });
  return index;
}

async function readSubmissionMetadata(directory) {
  const entry = directory.files.find((file) => /(?:^|\/)SUBMISSION\.tsv$/i.test(file.path));
  if (!entry) throw new Error("SUBMISSION.tsv를 ZIP 내에서 찾지 못했습니다.");

  const submissions = new Map();
  const rl = readline.createInterface({ input: entry.stream(), crlfDelay: Infinity });
  let index = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (!index) {
      index = buildColumnIndex(cols);
      continue;
    }

    const accession = cols[index.ACCESSION_NUMBER]?.trim();
    const type = cols[index.SUBMISSIONTYPE]?.trim().toUpperCase();
    const cik = cols[index.CIK]?.trim();
    const period = parseDate(cols[index.PERIODOFREPORT]);
    const filingDate = parseDate(cols[index.FILING_DATE]);
    if (!accession || !cik || !period || !filingDate) continue;
    if (!["13F-HR", "13F-HR/A"].includes(type)) continue;

    const row = { accession, cik, type, period, filingDate };
    const existing = submissions.get(cik);
    if (!existing || filingDate > existing.filingDate || (filingDate.getTime() === existing.filingDate.getTime() && type === "13F-HR/A")) {
      submissions.set(cik, row);
    }
  }

  if (!submissions.size) throw new Error("13F-HR 제출 데이터를 찾지 못했습니다.");
  const latestPeriod = [...submissions.values()].reduce((max, row) => row.period > max ? row.period : max, new Date(0));
  const selected = new Set([...submissions.values()].filter((row) => row.period.getTime() === latestPeriod.getTime()).map((row) => row.accession));
  return { selectedAccessions: selected, latestPeriod, managerCount: selected.size };
}

async function aggregateHoldings(directory, selectedAccessions) {
  const entry = directory.files.find((file) => /(?:^|\/)INFOTABLE\.tsv$/i.test(file.path));
  if (!entry) throw new Error("INFOTABLE.tsv를 ZIP 내에서 찾지 못했습니다.");

  const totals = new Map();
  const rl = readline.createInterface({ input: entry.stream(), crlfDelay: Infinity });
  let index = null;
  let rowsProcessed = 0;
  let rowsSelected = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (!index) {
      index = buildColumnIndex(cols);
      continue;
    }

    rowsProcessed++;
    const accession = cols[index.ACCESSION_NUMBER]?.trim();
    if (!accession || !selectedAccessions.has(accession)) continue;
    rowsSelected++;

    const cusip = cols[index.CUSIP]?.trim();
    if (!cusip) continue;
    const issuerName = cols[index.NAMEOFISSUER]?.trim() || cusip;
    const titleOfClass = cols[index.TITLEOFCLASS]?.trim() || "";
    const value = Number(cols[index.VALUE]) || 0;
    const shareAmount = Number(cols[index.SSHPRNAMT]) || 0;
    const shareType = cols[index.SSHPRNAMTTYPE]?.trim().toUpperCase() || "";
    const putCall = cols[index.PUTCALL]?.trim().toUpperCase() || "";

    // Keep the same security CUSIP together, but do not add option/principal amounts to share counts.
    let item = totals.get(cusip);
    if (!item) {
      item = { cusip, issuerName, valueSum: 0, sharesSum: 0, filers: new Set(), classes: new Set() };
      totals.set(cusip, item);
    }
    item.valueSum += value;
    if (shareType === "SH" && !putCall) item.sharesSum += shareAmount;
    item.filers.add(accession);
    if (titleOfClass) item.classes.add(titleOfClass);
  }

  const ranked = [...totals.values()]
    .sort((a, b) => b.valueSum - a.valueSum)
    .slice(0, TOP_N)
    .map((item) => ({
      cusip: item.cusip,
      issuerName: item.issuerName,
      aggregateReportedValue: item.valueSum,
      aggregateShares: item.sharesSum,
      filerCount: item.filers.size,
      securityName: [...item.classes].slice(0, 3).join(" / "),
    }));

  return {
    ranked,
    totalRowsProcessed: rowsProcessed,
    rowsSelected,
    totalUniqueCusips: totals.size,
  };
}

async function mapCusipsToTickers(items) {
  const results = new Array(items.length).fill(null);
  const batchSize = 10;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize).map((item) => ({ idType: "ID_CUSIP", idValue: item.cusip }));
    try {
      const response = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (response.ok) {
        const data = await response.json();
        data.forEach((row, offset) => {
          const best = row?.data?.[0];
          if (best) results[i + offset] = { ticker: best.ticker, exchange: best.exchCode, securityName: best.name };
        });
      }
    } catch (error) {
      console.log(`[warn] OpenFIGI 매핑 실패: ${error instanceof Error ? error.message : error}`);
    }
    if (i + batchSize < items.length) await sleep(500);
  }
  return items.map((item, i) => ({ ...item, ...(results[i] || {}) }));
}

async function fetchGdeltNews(item) {
  const terms = [item.ticker, item.issuerName].filter(Boolean).map((v) => `"${String(v).replaceAll('"', "")}"`);
  const query = `${terms.join(" OR ")} stock`;
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(Math.max(10, NEWS_PER_STOCK * 3)));
  url.searchParams.set("timespan", `${NEWS_DAYS}d`);
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("sourcelang", "eng");

  try {
    const response = await fetch(url, { headers: { "User-Agent": "Stock-Report/1.0" } });
    if (!response.ok) return [];
    const payload = await response.json();
    const articles = Array.isArray(payload?.articles) ? payload.articles : [];
    const seen = new Set();
    return articles.filter((article) => {
      const articleUrl = article?.url;
      if (!articleUrl || seen.has(articleUrl)) return false;
      seen.add(articleUrl);
      return true;
    }).slice(0, NEWS_PER_STOCK).map((article) => ({
      headline: article.title || "Untitled",
      summary: article.domain ? `Source: ${article.domain}` : "",
      source: article.domain || "GDELT",
      url: article.url,
      publishedAt: article.seendate ? parseGdeltDate(article.seendate) : new Date().toISOString(),
    }));
  } catch (error) {
    console.log(`[warn] GDELT 뉴스 실패 (${item.ticker || item.issuerName}): ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

function parseGdeltDate(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return new Date().toISOString();
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]))).toISOString();
}

async function attachNews(items) {
  const out = [];
  for (const item of items) {
    const news = await fetchGdeltNews(item);
    out.push({ ...item, news });
    await sleep(250);
  }
  return out;
}

async function main() {
  console.log("[1/5] SEC 최신 13F 데이터셋 확인...");
  const dataset = await findAvailableDataset();
  console.log(`[info] 선택 데이터셋: ${dataset.tag}`);

  console.log("[2/5] 13F 데이터셋 다운로드...");
  await downloadDataset(dataset.url);

  console.log("[3/5] 최신 보고분기 기준으로 기관별 최신 13F를 선택하고 보유종목 합산...");
  const directory = await unzipper.Open.file(TMP_ZIP_PATH);
  const { selectedAccessions, latestPeriod, managerCount } = await readSubmissionMetadata(directory);
  const aggregate = await aggregateHoldings(directory, selectedAccessions);
  console.log(`[info] 보고기간 ${dateKey(latestPeriod)}, 기관 ${managerCount}, 선택 행 ${aggregate.rowsSelected}`);

  console.log("[4/5] CUSIP → 티커 매핑...");
  const withTickers = await mapCusipsToTickers(aggregate.ranked);

  console.log("[5/5] GDELT 무료 뉴스 수집...");
  const withNews = await attachNews(withTickers);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceQuarter: dateKey(latestPeriod),
    sourceDatasetUrl: dataset.url,
    sourceDatasetPage: DATASET_PAGE,
    methodology: "SEC 공식 Form 13F 데이터셋에서 최신 보고기간의 기관별 최신 13F-HR/13F-HR/A를 선택하고 CUSIP별 보고 시장가치를 합산한 뒤 OpenFIGI로 티커를 매핑하고 GDELT의 최근 뉴스를 연결합니다.",
    totalRowsProcessed: aggregate.totalRowsProcessed,
    rowsSelected: aggregate.rowsSelected,
    totalUniqueCusips: aggregate.totalUniqueCusips,
    filerCount: managerCount,
    newsProvider: "GDELT",
    newsDays: NEWS_DAYS,
    holdings: withNews,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2), "utf-8");

  if (existsSync(TMP_ZIP_PATH)) unlinkSync(TMP_ZIP_PATH);
  console.log(`[완료] ${OUT_PATH}`);
}

main().catch(async (error) => {
  console.error("[오류]", error);
  try { if (existsSync(TMP_ZIP_PATH)) unlinkSync(TMP_ZIP_PATH); } catch {}
  process.exit(1);
});
