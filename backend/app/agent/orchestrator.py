from __future__ import annotations
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class ToolPlan:
    intent: str
    tools: tuple[str, ...]
    risk_tier: str


def plan_tools(message: str) -> ToolPlan:
    text = ''.join(message.lower().split())
    if any(k in text for k in ('비', '날씨', '주말', '토요일')):
        return ToolPlan('weather_operations', ('get_weather','forecast_demand','optimize_inventory','optimize_staffing'), 'medium')
    if any(k in text for k in ('딸기', '재고', '발주')):
        return ToolPlan('inventory', ('get_inventory','optimize_inventory'), 'high')
    if any(k in text for k in ('직원', '근무', '인력', '스케줄')):
        return ToolPlan('staffing', ('forecast_demand','optimize_staffing'), 'medium')
    return ToolPlan('general', ('get_sales_summary',), 'low')


def validate_numeric_result(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if 'stockout_risk' in payload and not 0 <= payload['stockout_risk'] <= 100:
        errors.append('stockout_risk must be between 0 and 100')
    if 'waste_risk' in payload and not 0 <= payload['waste_risk'] <= 100:
        errors.append('waste_risk must be between 0 and 100')
    if 'cost' in payload and payload['cost'] < 0:
        errors.append('cost must be non-negative')
    return errors
