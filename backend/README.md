# CafeOps backend engines

대회 데모의 숫자 근거가 되는 결정론적 Python 모듈입니다.

- `forecasting/baseline.py`: 동일 시간대 이력 + 제한된 날씨 보정
- `optimization/inventory.py`: 발주 시나리오 생성
- `optimization/staffing.py`: 시간대별 최소 인력 계산
- `agent/orchestrator.py`: 자연어 intent → 도구 계획, 숫자 검증

실행:

```bash
python3 -m unittest backend.tests.test_engines -v
```

실서비스에서는 이 모듈들을 AWS Lambda tool endpoint로 감싸고 Amazon Bedrock tool calling에서 호출합니다.
