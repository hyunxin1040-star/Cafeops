import { store as demoStore, staffing as demoStaffing } from './demo.js';

const STORAGE_KEY = 'cafeops_user_data_v2';
const MODE_KEY = 'cafeops_data_mode';

export const emptyUserData = () => ({
  store: {
    name: demoStore.name,
    address: demoStore.address,
    openTime: '09:00',
    closeTime: '22:00',
  },
  posRows: [],
  recipes: [],
  inventory: [],
  receipts: [],
  employees: [],
  updatedAt: null,
});

export function loadUserData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed ? { ...emptyUserData(), ...parsed } : emptyUserData();
  } catch {
    return emptyUserData();
  }
}

export function saveUserData(data) {
  const next = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getDataMode() {
  return localStorage.getItem(MODE_KEY) || 'demo';
}

export function setDataMode(mode) {
  localStorage.setItem(MODE_KEY, mode === 'user' ? 'user' : 'demo');
}

export function hasUserData(data) {
  return Boolean(
    data.posRows?.length || data.recipes?.length || data.inventory?.length || data.employees?.length
  );
}

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_-]/g, '');
}

function splitCSVLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(current.trim()); current = '';
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((x) => x.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { headers, rows };
}

function findValue(row, aliases) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const found = entries.find(([k]) => normalizeHeader(k) === normalizeHeader(alias));
    if (found) return found[1];
  }
  return undefined;
}

function parseNumber(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function normalizePOSRows(rows) {
  return rows.map((row, index) => {
    const timestamp = findValue(row, ['timestamp', 'datetime', 'date', 'ordered_at', '일시', '주문일시', '주문시간']);
    const menu = findValue(row, ['menu', 'menu_name', 'product', '상품명', '메뉴', '메뉴명']);
    const quantity = parseNumber(findValue(row, ['quantity', 'qty', '수량'])) || 1;
    const unitPrice = parseNumber(findValue(row, ['unit_price', 'price', 'amount', '단가', '가격', '판매가격']));
    const total = parseNumber(findValue(row, ['total', 'sales', 'revenue', 'gross_amount', '매출', '결제금액'])) || unitPrice * quantity;
    const date = timestamp ? new Date(timestamp) : null;
    return {
      id: `pos-${Date.now()}-${index}`,
      timestamp: timestamp || '',
      dateISO: date && !Number.isNaN(date.getTime()) ? date.toISOString() : '',
      menu: menu || '미분류 메뉴',
      quantity,
      unitPrice,
      total,
    };
  }).filter((r) => r.timestamp || r.total || r.menu !== '미분류 메뉴');
}

export function normalizeRecipeRows(rows) {
  return rows.map((row) => ({
    menu: String(findValue(row, ['menu', 'menu_name', '메뉴', '메뉴명']) || '').trim(),
    ingredient: String(findValue(row, ['ingredient', 'ingredient_id', '재료', '원재료']) || '').trim(),
    amount: parseNumber(findValue(row, ['amount', 'qty', 'quantity', '사용량', '소요량'])),
    unit: String(findValue(row, ['unit', '단위']) || 'g').trim(),
    price: parseNumber(findValue(row, ['price', '판매가격', 'menu_price', '메뉴가격'])),
  })).filter((r) => r.menu && r.ingredient && r.amount > 0);
}

export function normalizeInventoryRows(rows) {
  return rows.map((row) => ({
    id: String(findValue(row, ['ingredient_id', 'id']) || '').trim(),
    ingredient: String(findValue(row, ['name', 'ingredient', '재료', '원재료']) || findValue(row, ['ingredient_id']) || '').trim(),
    quantity: parseNumber(findValue(row, ['quantity', 'qty', 'current_qty', '현재고', '재고', '수량'])),
    unit: String(findValue(row, ['unit', '단위']) || 'kg').trim(),
    unitCost: parseNumber(findValue(row, ['unit_cost', 'cost', '원가', '단가'])),
  })).filter((r) => r.ingredient);
}

export function normalizeEmployeeRows(rows) {
  return rows.map((row) => ({
    name: String(findValue(row, ['name', 'employee', '직원', '이름']) || '').trim(),
    wage: parseNumber(findValue(row, ['wage', 'hourly_wage', '시급'])) || 12000,
    available: String(findValue(row, ['available', 'availability', '근무가능시간', '가능시간']) || '09–22').trim(),
    maxHours: parseNumber(findValue(row, ['max_hours', 'max_weekly_hours', '최대근무시간'])) || 8,
  })).filter((r) => r.name);
}

export function seedDemoAsUserData() {
  return saveUserData({
    ...emptyUserData(),
    employees: demoStaffing.employees.map((e) => ({ ...e, maxHours: 8 })),
  });
}
