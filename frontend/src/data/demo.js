export const store = {
  id: 'store-001',
  name: '소보로 카페 안암점',
  address: '서울 성북구 안암로 145',
  today: '10월 12일 (토)',
  weather: { temp: 18, label: '비', rainProbability: 70, delta: -0.08 },
  connected: { pos: true, weather: true, commercial: true, bom: true, employees: true },
};

export const kpis = [
  { label: '오늘 예상 매출', value: '1,210,000원', change: '평소 토요일 대비 -8%', tone: 'down' },
  { label: '예상 주문 수', value: '420건', change: '비 예보 반영 -15%', tone: 'down' },
  { label: '재고 위험', value: '2건', change: '딸기·우유 주의', tone: 'warn' },
  { label: '권장 인력', value: '5명', change: '14~17시 +1명', tone: 'up' },
];

export const issues = [
  {
    id: 'inventory-strawberry',
    type: 'inventory',
    severity: 'critical',
    title: '딸기 재고가 내일 오전 중 소진될 가능성이 높습니다.',
    subtitle: '현재 6.2kg · 주말 예상 수요 +8% · 비 예보 반영',
    action: '발주안 검토',
  },
  {
    id: 'staffing-peak',
    type: 'staffing',
    severity: 'warning',
    title: '토요일 14~17시 인력이 1명 부족할 가능성이 높습니다.',
    subtitle: '예상 주문량 24% 증가 · 현재 2명 배치',
    action: '근무표 보기',
  },
  {
    id: 'sales-latte',
    type: 'sales',
    severity: 'info',
    title: '금요일 오후 카페라떼 판매가 전주보다 18% 낮았습니다.',
    subtitle: '같은 시간대 아이스티 판매 +28%',
    action: '원인 보기',
  },
];

export const salesTrend = [72, 104, 86, 132, 98, 121, 78];
export const salesTrendLast = [58, 75, 80, 96, 116, 108, 70];

export const inventory = {
  ingredient: '딸기 (국내산)',
  currentQty: 6.2,
  unit: 'kg',
  avgDailyUse: 4.8,
  demandDelta: 0.08,
  expectedStockout: '10월 13일 (일) 오전 11시',
  unitCost: 7200,
  scenarios: [
    { id: 'safe', label: '보수적', qty: 6, stockoutRisk: 18, wasteRisk: 3, cost: 43200 },
    { id: 'recommended', label: '권장', qty: 8, stockoutRisk: 5, wasteRisk: 7, cost: 57600, recommended: true },
    { id: 'aggressive', label: '공격적', qty: 10, stockoutRisk: 2, wasteRisk: 14, cost: 72000 },
  ],
};

export const staffing = {
  date: '10월 12일 (토)',
  slots: [
    { time: '09–11', orders: 58, current: 2, recommended: 2 },
    { time: '11–14', orders: 132, current: 3, recommended: 3 },
    { time: '14–17', orders: 198, current: 2, recommended: 3 },
    { time: '17–20', orders: 141, current: 3, recommended: 3 },
    { time: '20–22', orders: 62, current: 2, recommended: 2 },
  ],
  employees: [
    { name: '지민', wage: 12500, available: '09–17' },
    { name: '수아', wage: 12000, available: '09–17' },
    { name: '현우', wage: 13000, available: '11–22' },
    { name: '민지', wage: 12000, available: '14–22' },
    { name: '도윤', wage: 12500, available: '17–22' },
    { name: '하린', wage: 12000, available: '09–14' },
  ],
};

export const connections = [
  { id: 'pos', title: 'POS · 토스플레이스', description: '주문·결제·상품 데이터를 자동 수집', status: '연결됨', automatic: true },
  { id: 'bom', title: '메뉴 레시피 (BOM)', description: '메뉴별 재료 구성과 사용량', status: '등록 완료', automatic: false },
  { id: 'inventory', title: '입고 내역', description: '현재고·입고·폐기 보정', status: '3시간 전 갱신', automatic: false },
  { id: 'employees', title: '직원 정보', description: '시급·근무 가능시간·최대시간', status: '5명 등록', automatic: false },
  { id: 'weather', title: '기상청 단기예보', description: '기온·강수·하늘 상태', status: '연결됨', automatic: true },
  { id: 'commercial', title: '서울시 상권 데이터', description: '상권 baseline·점포·유동 데이터', status: '연결됨', automatic: true },
];

export const defaultAgentMessages = [
  { role: 'assistant', text: '안녕하세요, 사장님. 오늘은 비 예보가 있어 평소와 다른 운영이 필요해 보여요. 제가 먼저 확인한 이슈 3건을 정리해두었습니다.' },
];
