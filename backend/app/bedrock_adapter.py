"""Bedrock adapter contract.

This file is credential-safe: no key or secret is committed. In AWS Lambda, boto3 uses the
execution role. The local demo can run without Bedrock credentials.
"""
from __future__ import annotations
import os

SYSTEM_PROMPT = """당신은 CafeOps의 AI 운영 비서입니다.
- 숫자를 추측하지 마세요. 수요, 재고, 인력 숫자는 반드시 연결된 tool 결과만 사용합니다.
- 계산 도구 실패 시 실패 사실과 필요한 입력을 명시합니다.
- 발주 확정이나 근무표 확정은 사용자 승인 전 실행하지 않습니다.
- 상관관계를 인과관계로 단정하지 않습니다.
- 응답은 결론 → 근거 → 대안 → 승인 필요 여부 순으로 간결하게 구성합니다.
"""

def config() -> dict:
    return {
        'model_id': os.getenv('BEDROCK_MODEL_ID', 'SET_IN_AWS'),
        'region': os.getenv('AWS_REGION', 'ap-northeast-2'),
        'system_prompt': SYSTEM_PROMPT,
    }
