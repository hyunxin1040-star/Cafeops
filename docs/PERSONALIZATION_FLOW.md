# CafeOps Personalized Data Flow

## Goal
점주가 자기 매장의 POS, BOM, 재고, 직원 정보를 등록하면 동일한 데이터 source가 Dashboard, 발주 최적화, 근무 배치, AI Agent 답변까지 연쇄적으로 반영되도록 한다.

## Storage
MVP: browser localStorage (`cafeops_user_data_v2`)

Production migration target: API Gateway → Lambda → DynamoDB/S3.

## Pipeline
1. CSV 또는 직접 입력
2. 헤더 alias 정규화
3. 브라우저 저장
4. 사용자 데이터 모드 활성화
5. 수요 예측 재계산
6. BOM 기반 재료 소모 계산
7. 재고/발주 시나리오 계산
8. 직원 배치 계산
9. AI Agent가 동일 계산 결과를 설명

## Traceability
UI는 현재 사용 중인 데이터 모드, POS 행 수, BOM 수, 재고 수, 직원 수를 화면 상단에 노출한다. 이를 통해 어떤 데이터가 추천에 반영되었는지 사용자가 확인할 수 있다.
