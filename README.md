# CafeOps — AI 카페 운영 매니저

> **기록에서 결정으로.** POS·재고·날씨·상권 데이터를 연결해 오늘 무엇을 발주하고, 몇 명을 배치해야 하는지 먼저 제안하는 AI 운영 에이전트.

![CafeOps UI reference](docs/cafeops_ui_reference.png)

## 핵심 데모

- 선제형 Daily Brief: 점주가 찾기 전에 재고/피크 인력/매출 이슈를 감지
- 연결형 의사결정: 날씨 → 수요 → 재고/발주 → 인력 배치를 연쇄 재계산
- 발주 3안 비교: 비용·품절 위험·폐기 위험 trade-off
- Human-in-the-loop: 발주/근무표는 승인 전 draft로만 생성
- 반응형 UI: PC 사이드바 / 모바일 하단 탭

## 빠른 실행

별도 npm 설치 없이 실행되는 정적 ES Module 데모입니다.

```bash
python3 -m http.server 5173 -d frontend
```

브라우저에서 `http://localhost:5173` 접속.

계산 엔진 테스트:

```bash
python3 -m unittest backend.tests.test_engines -v
```

## 저장소 구조

- `frontend/`: Netlify에 바로 배포 가능한 반응형 SPA
- `backend/`: AWS Lambda용 결정론적 계산 및 Agent tool contract
- `docs/`: PRD, 아키텍처, 데이터 계약, UI 규칙

## AWS production target

`Browser → Netlify → API Gateway → Lambda → Bedrock / Forecast / Optimization → DynamoDB/S3`

Bedrock은 숫자를 직접 추측하지 않고, 계산 도구를 선택하고 결과를 설명하는 역할만 맡습니다.

## Netlify

이 저장소를 GitHub에 올린 뒤 Netlify에서 **Import an existing project**를 선택하고 base directory를 `frontend`로 지정하면 됩니다. 프런트는 build command 없이 `frontend` 자체를 publish할 수 있습니다.

## 안전/한계

- 현재 공개 데모 데이터는 synthetic data입니다.
- 실제 POS/날씨/상권 API key는 저장소에 포함하지 않습니다.
- 사업성과 수치는 실제 효과가 아니라 데모 계산/시뮬레이션으로 표시합니다.
