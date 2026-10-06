# SEC 13F Top 20 Stock Report

SEC 공식 Form 13F 데이터와 무료 GDELT 뉴스 데이터를 이용해 기관투자자 보유 종목 Top 20을 자동 생성하는 Next.js 프로젝트입니다.

## 데이터 구조

- **13F:** SEC 공식 Form 13F Data Sets에서 가장 최근에 공개된 데이터셋을 자동 선택합니다.
- 같은 보고기간에 여러 번 제출한 기관은 해당 기관의 **가장 최근 13F-HR/13F-HR/A**만 사용합니다.
- CUSIP별 보유 시장가치(`VALUE`)를 합산해 Top 20을 계산합니다.
- `VALUE`는 SEC 현재 스키마 기준 달러 단위입니다. SEC 문서상 2023년 1월 3일부터 시장가치는 가장 가까운 달러로 보고됩니다.
- **티커:** OpenFIGI 무료 API를 사용합니다. 매핑되지 않는 종목은 CUSIP/발행사명으로 표시됩니다.
- **뉴스:** GDELT DOC 2.0 API를 사용하며 API 키가 필요 없습니다. 각 종목의 최근 31일 뉴스 최대 5건을 저장합니다.

SEC의 13F 데이터셋은 분기별로 업데이트되며, 현재 공개 데이터셋은 SEC가 직접 제공합니다.

## 자동 업데이트

`.github/workflows/update-data.yml`이 매월 1일 미국 Pacific Time 기준으로 실행됩니다.

1. GitHub Actions가 최신 SEC 13F 데이터셋을 찾습니다.
2. 데이터셋을 다운로드합니다.
3. 최신 보고기간의 기관별 최신 13F를 선택합니다.
4. CUSIP 기준 Top 20을 계산합니다.
5. OpenFIGI로 티커를 매핑합니다.
6. GDELT에서 최근 뉴스를 가져옵니다.
7. `public/data/latest.json`을 갱신합니다.
8. 변경사항을 GitHub에 자동 commit/push합니다.
9. GitHub 저장소와 연결된 Vercel은 새 commit을 감지해 사이트를 재배포합니다.

### SEC User-Agent

GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 다음 Secret을 추가하는 것을 권장합니다.

- Name: `SEC_USER_AGENT`
- Value: `Stock-Report/1.0 (your-email@example.com)`

비어 있어도 기본 User-Agent가 사용되지만, SEC 자동 접근에는 연락 가능한 식별 정보를 넣는 것이 좋습니다.

## 수동 실행

GitHub 저장소의 **Actions → Monthly Stock Report Data Update → Run workflow**로 즉시 실행할 수 있습니다.

로컬에서는:

```bash
npm install
npm run update-data
npm run dev
```

생성 파일:

```text
public/data/latest.json
```

## 주의

13F는 실시간 포트폴리오가 아닙니다. SEC 규정상 분기 말 보유현황을 사후 공시하므로, 월간 자동 실행은 새 13F 데이터가 공개되었을 때 이를 반영하기 위한 것입니다. 뉴스는 업데이트가 실행되는 시점의 최근 뉴스로 교체됩니다.
