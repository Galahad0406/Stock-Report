# SEC 13F 상위 20종목 리포트

SEC EDGAR의 **Form 13F 분기 데이터셋 전체**(모든 기관 투자자의 제출 원자료)를 내려받아
종목(CUSIP) 기준으로 보유금액을 합산하고, 상위 20개 종목과 최근 관련 뉴스를 정리해
보여주는 Next.js 사이트입니다. 데이터는 GitHub Actions로 **매달 1일 자동 갱신**되고,
Vercel에 그대로 배포됩니다.

## 먼저 알아둘 것 (중요, 반드시 읽어주세요)

1. **13F는 분기 공시입니다.** SEC는 이 데이터셋을 분기마다 한 번만 갱신하며, 게시 시점도
   분기 마감 후 45일 근처입니다. 그래서 "매달 1일 자동 실행"은 정상적으로 동작하지만,
   같은 분기 안에서는 **보유종목 순위 자체는 그대로**일 수 있습니다 (뉴스 섹션은 매달 새로
   갱신됩니다). 새 분기 데이터가 SEC에 올라오는 즉시 다음 달 실행에서 자동으로 반영됩니다.
2. **뉴스 API는 무료 키가 필요합니다.** 종목별 뉴스는 [Finnhub](https://finnhub.io)
   무료 API를 사용합니다 (가입 후 즉시 키 발급, 신용카드 불필요). 이유: NewsAPI.org의
   무료 플랜은 이용약관상 "개발/테스트 용도"로만 허용되어 실제 배포 사이트에 쓰기
   부적절하므로 채택하지 않았습니다. 필요하면 `scripts/update-data.mjs`의 `attachNews()`
   함수만 다른 뉴스 API로 교체하면 됩니다.
3. **CUSIP → 티커 매핑은 100% 정확하지 않습니다.** [OpenFIGI](https://www.openfigi.com/api)
   무료 매핑을 사용하며, 일부 종목(특히 옵션/우선주/외국 ADR 일부)은 매핑에 실패해
   발행사명과 CUSIP만 표시될 수 있습니다.
4. **VALUE(보유금액) 단위**는 SEC의 13F XML 스키마 개정 시점에 따라 과거 제출분은
   천 달러 단위, 최신 스키마는 실제 달러 단위로 섞여 있을 수 있습니다. 본 프로젝트는
   원자료를 그대로 합산하며, 상세 스펙은 SEC의 [13F Data Sets 문서(PDF)](https://www.sec.gov/dera/data/form-13f)
   를 참고하세요. 절대금액보다는 **상대적 순위**로 해석하는 것을 권장합니다.
5. 이 리포트는 **투자 자문이 아닙니다.** 공개된 13F 공시를 기계적으로 집계·요약한
   참고 자료이며, 13F 자체가 최대 45일 지연 공시라 "지금 이 순간의 보유 현황"과는 다릅니다.

## 프로젝트 구조

```
app/                     Next.js 리포트 페이지 (App Router)
scripts/update-data.mjs  SEC 13F 다운로드 → 집계 → 티커매핑 → 뉴스수집 → JSON 저장
public/data/latest.json  생성된 리포트 데이터 (페이지가 이 파일을 읽음)
.github/workflows/       매달 1일 자동 실행 + 자동 커밋 워크플로
```

## 로컬에서 데이터 한 번 생성해보기

```bash
npm install
cp .env.example .env.local   # 값 채우기 (FINNHUB_API_KEY 등)
npm run update-data          # public/data/latest.json 생성 (몇 분 소요될 수 있음)
npm run dev                  # http://localhost:3000 에서 확인
```

## GitHub에 올리기

1. 새 GitHub 저장소를 만들고 이 폴더 전체를 push 합니다.

   ```bash
   git init
   git add .
   git commit -m "init: sec 13f top20 tracker"
   git branch -M main
   git remote add origin https://github.com/<your-id>/<your-repo>.git
   git push -u origin main
   ```

2. 저장소 **Settings → Secrets and variables → Actions** 에서 아래를 등록합니다.
   - `Secrets`: `FINNHUB_API_KEY`, (선택) `OPENFIGI_API_KEY`
   - `Variables`: `SEC_USER_AGENT` (예: `sec13f-top20-tracker your-email@example.com`)

3. **Actions** 탭에서 `Monthly 13F Top 20 update` 워크플로를 `Run workflow` 버튼으로
   한 번 수동 실행해 `public/data/latest.json`을 채워둡니다. 이후에는 매달 1일 자동 실행됩니다.

## Vercel 배포

1. [vercel.com](https://vercel.com) → **Add New Project** → 방금 만든 GitHub 저장소 선택.
2. 프레임워크가 Next.js로 자동 인식됩니다. 별도 환경변수 설정 없이 **Deploy** 클릭만 하면 됩니다
   (사이트는 저장소에 커밋된 `public/data/latest.json`을 읽을 뿐, 배포 환경에서 직접
   SEC를 스크래핑하지 않습니다 — 무거운 수집 작업은 GitHub Actions가 전담합니다).
3. 이후 GitHub Actions가 매달 `public/data/latest.json`을 갱신해 커밋 → 자동으로
   Vercel이 재배포합니다.

## 커스터마이징 포인트

- 상위 종목 개수: 워크플로 파일의 `TOP_N` 값을 변경 (기본 20).
- 뉴스 기간/개수: `scripts/update-data.mjs`의 `attachNews()`에서 `21 * 24 * 60 * 60 * 1000`
  (3주) 과 `.slice(0, 5)` (종목당 5건) 수정.
- 실행 주기: `.github/workflows/update-data.yml`의 cron 표현식 (`0 0 1 * *` = 매달 1일 UTC 0시).
- 디자인: `tailwind.config.ts`의 색상 토큰, `app/page.tsx`의 레이아웃.
