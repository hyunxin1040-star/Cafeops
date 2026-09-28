# Architecture

## Runtime split

- **Netlify**: 정적 반응형 프런트엔드
- **AWS API Gateway + Lambda**: 인증 뒤의 API 및 tool 실행
- **Amazon Bedrock**: 자연어 의도 파악, tool selection, 근거 기반 설명
- **결정론적 도구**: Forecasting / Inventory / Staffing
- **DynamoDB/S3 (production target)**: 매장 메타데이터, 추천·승인 로그, raw import

## Agent flow

1. 사용자 자연어 입력
2. Planner가 intent를 구조화
3. 필요한 도구만 호출
4. 계산 결과 validation
5. 위험도 분류
6. 대안·근거 표시
7. 비용/인력 변경은 explicit approval

## Failure policy

- 외부 데이터 실패 → 마지막 성공 시점 표시 + demo/baseline fallback
- 최적화 infeasible → 가능한 제약 위반을 설명하고 자동 추측 금지
- Bedrock unavailable → 결정론적 분석 화면은 계속 동작
