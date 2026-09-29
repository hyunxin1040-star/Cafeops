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

## Personalized store data flow

`데이터 연결` 화면의 `+` 버튼에서 점주가 직접 매장 데이터를 등록할 수 있습니다.

- POS 주문 CSV → 예상 매출·예상 주문·매출 추이
- 메뉴 레시피(BOM) → 판매 메뉴를 원재료 소모량으로 변환
- 현재 재고 CSV/직접 입력 → 품절·폐기 위험과 발주 시나리오
- 직원 CSV/직접 입력 → 시간대별 권장 인력

등록 데이터는 브라우저 `localStorage`에 보관되며, 등록 즉시 `내 매장 데이터` 모드로 전환되어 홈·재고·근무·AI 운영 비서가 같은 데이터 원천을 사용합니다. 대회 MVP에서는 별도 백엔드 계정 없이 개인화 흐름을 시연할 수 있고, production에서는 동일한 데이터 계약을 DynamoDB/S3 등으로 교체할 수 있습니다.

### 지원 CSV 예시

POS: `timestamp/menu/quantity/unit_price` 또는 `ordered_at/menu_name/quantity/gross_amount`

BOM: `menu/ingredient/amount/unit` 또는 `menu_name/ingredient_id/quantity/unit`

재고: `ingredient/quantity/unit/unit_cost` 또는 `ingredient_id/name/current_qty/unit/unit_cost`

직원: `name/wage/available/max_hours` 또는 `name/hourly_wage/availability/max_weekly_hours`
