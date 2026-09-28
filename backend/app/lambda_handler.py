from __future__ import annotations
import json
from dataclasses import asdict
from backend.app.agent.orchestrator import plan_tools
from backend.app.forecasting.baseline import forecast_by_hour
from backend.app.optimization.inventory import build_inventory_scenarios
from backend.app.optimization.staffing import staffing_by_slot

DEMO_HISTORY = {
    9: [42, 51, 48, 55], 11: [88, 96, 91, 102], 14: [171, 182, 190, 198],
    17: [122, 130, 136, 141], 20: [55, 62, 59, 66]
}

def _response(status: int, body: dict):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps(body, ensure_ascii=False),
    }


def handler(event, context):
    if event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return _response(200, {'ok': True})

    path = event.get('rawPath', '/')
    method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', 'GET'))

    if path.endswith('/health'):
        return _response(200, {'status': 'ok', 'service': 'cafeops-api'})

    if path.endswith('/forecast') and method == 'POST':
        points = forecast_by_hour(DEMO_HISTORY, rain_probability=.7, temperature_c=18)
        return _response(200, {'points': [asdict(x) for x in points], 'source': 'demo'})

    if path.endswith('/inventory/optimize') and method == 'POST':
        xs = build_inventory_scenarios(current_qty=6.2, expected_use=12.4, unit_cost=7200, min_order_qty=2)
        return _response(200, {'scenarios': [asdict(x) for x in xs], 'requiresApproval': True})

    if path.endswith('/staffing/optimize') and method == 'POST':
        xs = staffing_by_slot([('09-11',58,2),('11-14',132,3),('14-17',198,2),('17-20',141,3),('20-22',62,2)])
        return _response(200, {'slots': [asdict(x) for x in xs], 'requiresApproval': True})

    if path.endswith('/agent/query') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        message = body.get('message', '')
        plan = plan_tools(message)
        # Production: send this tool plan / schema to Amazon Bedrock and execute tools server-side.
        # Demo intentionally returns deterministic evidence rather than fabricated model numbers.
        return _response(200, {
            'summary': '데모 환경에서는 계산 도구의 결정론적 결과를 우선 제공합니다.',
            'intent': plan.intent,
            'toolsUsed': list(plan.tools),
            'riskTier': plan.risk_tier,
            'bedrockReady': True,
        })

    return _response(404, {'error': 'not_found', 'path': path})
