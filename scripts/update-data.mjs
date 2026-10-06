import fs from 'fs';
import path from 'path';
import axios from 'axios';

const SYMBOLS = ['TSLA', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META'];

async function fetchStockData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) {
      console.warn(`[Warning] No data found for ${symbol}`);
      return null;
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    return {
      symbol,
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      currency: meta.currency || 'USD'
    };
  } catch (error) {
    console.error(`[Error] Failed to fetch data for ${symbol}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Starting stock data update...');
  
  const stocks = [];
  for (const symbol of SYMBOLS) {
    const data = await fetchStockData(symbol);
    if (data) {
      stocks.push(data);
    }
    // API 차단 방지를 위한 미세 딜레이
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const outputData = {
    updatedAt: new Date().toISOString(),
    stocks
  };

  // public/data 디렉터리가 존재하는지 안전하게 확인 및 생성
  const dirPath = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, 'latest.json');
  fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2), 'utf-8');
  
  console.log(`Successfully updated \({stocks.length} stocks data to\){filePath}`);
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
