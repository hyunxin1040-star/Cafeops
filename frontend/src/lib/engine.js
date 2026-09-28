import { inventory, staffing, store } from '../data/demo.js';

export function recalcInventoryForWeather(rain = true) {
  const baseDelta = rain ? 0.03 : 0.21;
  const qty = rain ? 8 : 10;
  return {
    demandDelta: baseDelta,
    scenarios: inventory.scenarios.map((s) => ({
      ...s,
      stockoutRisk: Math.max(1, Math.round(s.stockoutRisk * (rain ? 0.72 : 1.18))),
      wasteRisk: Math.max(1, Math.round(s.wasteRisk * (rain ? 1.15 : 0.92))),
      recommended: s.qty === qty,
    })),
    recommendedQty: qty,
  };
}

export function generatePurchaseDraft(qty) {
  return {
    title: '딸기 발주서 초안',
    quantity: qty,
    unit: 'kg',
    unitCost: inventory.unitCost,
    total: qty * inventory.unitCost,
    supplier: '데모 공급업체',
    status: 'draft',
  };
}

export function staffingRecommendation() {
  const shortage = staffing.slots.find((s) => s.recommended > s.current);
  return {
    shortage,
    summary: shortage
      ? `${shortage.time}에 ${shortage.recommended - shortage.current}명 추가 배치를 권장합니다.`
      : '현재 배치로 예상 수요를 충족합니다.',
    estimatedExtraCost: shortage ? (shortage.recommended - shortage.current) * 3 * 12000 : 0,
  };
}

export function agentPlan(message) {
  const normalized = message.replace(/\s/g, '');
  const tools = [];
  const cards = [];

  if (/비|날씨|토요일|주말/.test(normalized)) {
    tools.push('날씨 조회', '수요 예측');
    const inv = recalcInventoryForWeather(true);
    tools.push('재고 최적화', '인력 최적화');
    const staff = staffingRecommendation();
    cards.push({
      title: '예상 매출',
      value: '121만원',
      detail: '평소 토요일 대비 -8% · 비 예보 반영',
    });
    cards.push({
      title: '재고',
      value: `딸기 ${inv.recommendedQty}kg 발주 검토`,
      detail: '현재고 6.2kg · 품절 위험을 5% 수준으로 낮춤',
    });
    cards.push({
      title: '인력',
      value: staff.summary,
      detail: `추가 인건비 약 ${staff.estimatedExtraCost.toLocaleString()}원`,
    });
    return {
      text: `토요일 비 예보(${store.weather.rainProbability}%)를 반영해 다시 계산했어요. 예상 주문은 평소 토요일보다 약 15% 낮지만, 14~17시는 여전히 피크라 추가 인력 1명이 필요합니다. 딸기는 8kg 발주안이 품절과 폐기 위험의 균형이 가장 좋습니다.`,
      tools,
      cards,
    };
  }

  if (/딸기|재고|발주/.test(normalized)) {
    tools.push('재고 조회', '재고 최적화');
    return {
      text: '딸기 현재고 6.2kg과 이번 주말 예상 수요를 기준으로 8kg 발주를 권장합니다. 6kg로 줄이면 품절 위험이 약 18%까지 높아집니다.',
      tools,
      cards: inventory.scenarios.map((s) => ({ title: `${s.label} 발주`, value: `${s.qty}kg`, detail: `품절 ${s.stockoutRisk}% · 폐기 ${s.wasteRisk}%` })),
    };
  }

  if (/직원|인력|근무|스케줄/.test(normalized)) {
    const result = staffingRecommendation();
    tools.push('수요 예측', '인력 최적화');
    return {
      text: `${result.summary} 예상 서비스 수준을 유지하면서 추가 인건비는 약 ${result.estimatedExtraCost.toLocaleString()}원입니다.`,
      tools,
      cards: staffing.slots.map((s) => ({ title: s.time, value: `${s.recommended}명`, detail: `예상 주문 ${s.orders}건` })),
    };
  }

  return {
    text: '현재 데모에서는 날씨·수요, 재고·발주, 직원 배치 질문을 계산 도구와 연결해 답변할 수 있어요. 예: “이번 토요일 비 오는데 운영 어떻게 해야 해?”',
    tools: [],
    cards: [],
  };
}
