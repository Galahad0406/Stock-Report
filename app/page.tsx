import fs from 'fs';
import path from 'path';

// 서버에서 최신 리포트 불러오기
async function getReportData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'latest-report.json');
    if (!fs.existsSync(filePath)) {
      return { 
        updatedAt: null, 
        fundName: "Loading...", 
        content: "아직 생성된 13F 리포트가 없습니다. 잠시 후 데이터를 불러오거나 수동 업데이트를 실행해주세요." 
      };
    }
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    return { 
      updatedAt: null, 
      fundName: "Error", 
      content: "데이터를 읽어오는 중 오류가 발생했습니다." 
    };
  }
}

export default async function Home() {
  const report = await getReportData();

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* 상단 헤더 영역 */}
        <header className="bg-slate-900 text-white p-8">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider bg-indigo-600 px-3 py-1 rounded-full">
              SEC EDGAR Automated Report
            </span>
            <span className="text-sm text-slate-400">
              {report.updatedAt ? `갱신: ${new Date(report.updatedAt).toLocaleDateString()}` : ''}
            </span>
          </div>
          <h1 className="text-3xl font-bold mt-4">
            📊 {report.fundName} 13F 투자 분석 리포트
          </h1>
          <p className="text-slate-300 text-sm mt-2">
            미국 SEC 공시 데이터를 기반으로 상위 종목, 뉴스, 투자 인사이트를 매월 자동으로 분석합니다.
          </p>
        </header>

        {/* 본문 리포트 내용 영역 */}
        <article className="p-8 prose max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
          {report.content}
        </article>

        {/* 하단 푸터 */}
        <footer className="bg-slate-50 border-t border-slate-200 p-6 text-center text-xs text-slate-500">
          Powered by SEC.gov, GitHub Actions & Vercel
        </footer>
      </div>
    </main>
  );
}
