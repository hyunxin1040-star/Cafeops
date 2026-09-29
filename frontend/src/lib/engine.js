import { inventory as demoInventory, staffing as demoStaffing, store as demoStore, salesTrend as demoTrend, salesTrendLast as demoTrendLast } from '../data/demo.js';

function round(n, digits = 0) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function convertToBase(amount, unit) {
  const u = String(unit || '').toLowerCase();
  if (u === 'g') return { amount: amount / 1000, unit: 'kg' };
  if (u === 'ml') return { amount: amount / 1000, unit: 'L' };
  return { amount, unit: unit || 'kg' };
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

export function analyzePOS(rows, rainDelta = demoStore.weather.delta) {
  if (!rows?.length) {
    return {
      source: 'demo',
      predictedRevenue: 1210000,
      predictedOrders: 420,
      changeRate: -0.08,
      trend: demoTrend,
      lastTrend: demoTrendLast,
      dateRange: '데모 8주',
      menuCount: 10,
      rowCount: 0,
      dailyAverageRevenue: 1315000,
    };
  }

  const valid = rows.map((r) => ({ ...r, date: r.dateISO ? new Date(r.dateISO) : new Date(r.timestamp) }))
    .filter((r) => r.date && !Number.isNaN(r.date.getTime()));
  const daily = new Map();
  valid.forEach((r) => {
    const key = dayKey(r.date);
    const d = daily.get(key) || { revenue: 0, orders: 0 };
    d.revenue += Number(r.total) || 0;
    d.orders += Number(r.quantity) || 0;
    daily.set(key, d);
  });
  const dates = [...daily.keys()].sort();
  const recentDates = dates.slice(-28);
  const recent = recentDates.map((d) => daily.get(d));
  const avgRevenue = recent.length ? recent.reduce((a, b) => a + b.revenue, 0) / recent.length : 0;
  const avgOrders = recent.length ? recent.reduce((a, b) => a + b.orders, 0) / recent.length : 0;
  const predictedRevenue = Math.round(avgRevenue * (1 + rainDelta));
  const predictedOrders = Math.max(1, Math.round(avgOrders * (1 + rainDelta)));
  const baseTrend = dates.slice(-7).map((d) => Math.round((daily.get(d)?.revenue || 0) / 10000));
  while (baseTrend.length < 7) baseTrend.unshift(baseTrend[0] || Math.round(avgRevenue / 10000));
  const forecastTrend = baseTrend.map((v, i) => Math.max(1, Math.round(v * (1 + (i === 6 ? rainDelta : 0.02)))));
  const menus = new Set(rows.map((r) => r.menu).filter(Boolean));
  return {
    source: 'user', predictedRevenue, predictedOrders, changeRate: rainDelta,
    trend: forecastTrend, lastTrend: baseTrend,
    dateRange: dates.length ? `${dates[0]} ~ ${dates.at(-1)}` : '날짜 인식 불가',
    menuCount: menus.size, rowCount: rows.length, dailyAverageRevenue: Math.round(avgRevenue),
  };
}

export function estimateIngredientUsage(userData, posAnalysis) {
  const recipes = userData.recipes || [];
  const inventory = userData.inventory || [];
  if (!recipes.length || !inventory.length || !userData.posRows?.length) return null;
  const strawberryInv = inventory.find((x) => /딸기|strawberry/i.test(x.ingredient)) || inventory[0];
  const ingredientName = strawberryInv.ingredient;
  const matchingRecipes = recipes.filter((r) => r.ingredient === ingredientName || r.ingredient === strawberryInv.id || String(r.ingredient).includes(ingredientName) || String(ingredientName).includes(r.ingredient));
  if (!matchingRecipes.length) return null;

  const dates = userData.posRows.map((r) => r.dateISO && r.dateISO.slice(0,10)).filter(Boolean);
  const uniqueDays = Math.max(1, new Set(dates).size);
  let historicalUse = 0;
  matchingRecipes.forEach((recipe) => {
    const menuSold = userData.posRows.filter((r) => r.menu === recipe.menu).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const base = convertToBase(recipe.amount, recipe.unit);
    historicalUse += menuSold * base.amount;
  });
  const avgDailyUse = historicalUse / uniqueDays;
  const adjustedDailyUse = avgDailyUse * (1 + posAnalysis.changeRate);
  const current = convertToBase(Number(strawberryInv.quantity) || 0, strawberryInv.unit);
  const horizonDays = 2;
  const need = adjustedDailyUse * horizonDays;
  const shortage = Math.max(0, need - current.amount);
  const recommendedQty = Math.max(1, Math.ceil(shortage || adjustedDailyUse));
  const unitCost = Number(strawberryInv.unitCost) || 7200;
  const quantities = [Math.max(1, Math.round(recommendedQty * .75)), recommendedQty, Math.max(recommendedQty + 1, Math.round(recommendedQty * 1.25))];
  const scenarios = quantities.map((qty, i) => {
    const finalStock = current.amount + qty - need;
    const stockoutRisk = Math.max(2, Math.round(45 * Math.exp(-Math.max(0, finalStock + .2))));
    const wasteRisk = Math.max(2, Math.min(40, Math.round(Math.max(0, finalStock) / Math.max(need, 1) * 32)));
    return { id: ['safe','recommended','aggressive'][i], label: ['보수적','권장','공격적'][i], qty, stockoutRisk, wasteRisk, cost: qty * unitCost, recommended: i === 1 };
  });
  return {
    ingredient: ingredientName,
    currentQty: round(current.amount, 1), unit: current.unit,
    avgDailyUse: round(avgDailyUse, 1), demandDelta: posAnalysis.changeRate,
    expectedStockout: avgDailyUse > 0 ? `약 ${round(current.amount / avgDailyUse, 1)}일 후` : '계산 불가',
    unitCost, scenarios,
  };
}

export function staffingRecommendation(posAnalysis, employees = []) {
  if (!employees.length) return { ...demoStaffing, source: 'demo', shortage: demoStaffing.slots.find((s) => s.recommended > s.current), estimatedExtraCost: 36000 };
  const ratios = [0.12, 0.27, 0.30, 0.21, 0.10];
  const times = ['09–11','11–14','14–17','17–20','20–22'];
  const availableCount = employees.length;
  const slots = times.map((time, i) => {
    const orders = Math.max(1, Math.round(posAnalysis.predictedOrders * ratios[i]));
    const recommended = Math.max(1, Math.ceil(orders / 62));
    const current = Math.min(availableCount, i === 2 ? Math.max(1, recommended - 1) : recommended);
    return { time, orders, current, recommended };
  });
  const shortage = slots.find((s) => s.recommended > s.current);
  const avgWage = employees.reduce((a, e) => a + (Number(e.wage) || 12000), 0) / employees.length;
  return {
    date: '다음 영업일', slots, employees, source: 'user', shortage,
    summary: shortage ? `${shortage.time}에 ${shortage.recommended - shortage.current}명 추가 배치를 권장합니다.` : '현재 배치로 예상 수요를 충족합니다.',
    estimatedExtraCost: shortage ? Math.round((shortage.recommended - shortage.current) * 3 * avgWage) : 0,
  };
}

export function generatePurchaseDraft(qty, inventory) {
  const unitCost = inventory?.unitCost || demoInventory.unitCost;
  return { title: `${inventory?.ingredient || '딸기'} 발주서 초안`, quantity: qty, unit: inventory?.unit || 'kg', unitCost, total: qty * unitCost, supplier: '등록 공급업체', status: 'draft' };
}

export function agentPlan(message, context) {
  const normalized = message.replace(/\s/g, '');
  const { posAnalysis, inventory, staffing, dataSummary, weather = demoStore.weather } = context;
  const tools = [];
  const cards = [];
  const sourceNote = dataSummary.mode === 'user' ? `내 매장 데이터 ${dataSummary.posRows.toLocaleString()}건을 기준으로` : 'CafeOps 데모 데이터를 기준으로';

  if (/비|날씨|토요일|주말|운영/.test(normalized)) {
    tools.push('날씨 조회', '수요 예측', '재고 최적화', '인력 최적화');
    cards.push({ title: '예상 매출', value: `${Math.round(posAnalysis.predictedRevenue / 10000)}만원`, detail: `${sourceNote} · 날씨 조정 ${Math.round(posAnalysis.changeRate*100)}%` });
    if (inventory) cards.push({ title: '재고', value: `${inventory.ingredient} ${inventory.scenarios[1].qty}${inventory.unit} 발주 검토`, detail: `현재고 ${inventory.currentQty}${inventory.unit} · 품절 위험 ${inventory.scenarios[1].stockoutRisk}%` });
    if (staffing?.shortage) cards.push({ title: '인력', value: staffing.summary, detail: `추가 인건비 약 ${staffing.estimatedExtraCost.toLocaleString()}원` });
    return { text: `${sourceNote} 다시 계산했어요. 예상 주문은 약 ${posAnalysis.predictedOrders}건입니다.${inventory ? ` ${inventory.ingredient}는 ${inventory.scenarios[1].qty}${inventory.unit} 발주안이 현재 조건에서 가장 균형적입니다.` : ' 레시피와 현재고를 등록하면 발주량까지 계산할 수 있습니다.'}${staffing?.shortage ? ` ${staffing.summary}` : ''}`, tools, cards };
  }

  if (/딸기|재고|발주/.test(normalized)) {
    tools.push('재고 조회', '재고 최적화');
    if (!inventory) return { text: '현재 내 매장 데이터에는 계산 가능한 레시피(BOM)와 재고가 부족합니다. 데이터 연결에서 메뉴 레시피와 현재 재고를 등록해 주세요.', tools, cards: [] };
    return { text: `${sourceNote} ${inventory.ingredient} ${inventory.scenarios[1].qty}${inventory.unit} 발주를 권장합니다. 더 적게 주문할 경우 품절 위험이 ${inventory.scenarios[0].stockoutRisk}% 수준으로 높아집니다.`, tools, cards: inventory.scenarios.map((s) => ({ title: `${s.label} 발주`, value: `${s.qty}${inventory.unit}`, detail: `품절 ${s.stockoutRisk}% · 폐기 ${s.wasteRisk}%` })) };
  }

  if (/직원|인력|근무|스케줄/.test(normalized)) {
    tools.push('수요 예측', '인력 최적화');
    return { text: `${sourceNote} ${staffing.summary || '현재 배치로 예상 수요를 충족합니다.'}`, tools, cards: staffing.slots.map((s) => ({ title: s.time, value: `${s.recommended}명`, detail: `예상 주문 ${s.orders}건` })) };
  }

  return { text: `현재 ${sourceNote} 답변하고 있어요. 날씨·수요, 재고·발주, 직원 배치를 함께 물어보면 등록한 데이터를 다시 계산해 답변합니다.`, tools: [], cards: [] };
}
