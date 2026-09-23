import os
import json
from datetime import datetime
from openai import OpenAI

# OpenAI 설정
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def generate_13f_report():
    print("SEC 13F 데이터 수집 및 분석 시작...")
    
    # [참고] 실제 구동 시 edgar-tools 라이브러리를 사용하여 워런 버핏 등 펀드의 13F를 가져옴
    # 여기서는 전체 구조를 잡기 위한 샘플 분석 로직을 수행합니다.
    
    prompt = """
    당신은 월스트리트 수석 금융 애널리스트입니다.
    최근 버크셔 하서웨이(Berkshire Hathaway)의 SEC 13F 공시 데이터를 바탕으로 
    1. Top 10 보유 종목 (종목명, 비중, 보유 주식수)
    2. 왜 이 종목들을 매수/보유하게 되었는지에 대한 경제적 배경 및 최근 뉴스 분석
    3. 앞으로의 투자 진행 방향 및 전망
    위 내용을 포함하여 전문적이고 가독성 좋은 마크다운 리포트를 작성해주세요.
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", content: prompt}],
    )
    
    report_content = response.choices[0].message.content

    # data 폴더 생성 후 json으로 저장
    os.makedirs("data", exist_ok=True)
    output_data = {
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "fundName": "Berkshire Hathaway (Warren Buffett)",
        "content": report_content
    }

    with open("data/latest-report.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print("리포트 생성 완료 및 저장 성공!")

if __name__ == "__main__":
    generate_13f_report()
