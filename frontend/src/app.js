import { store as demoStore, kpis as demoKpis, issues as demoIssues, inventory as demoInventory, staffing as demoStaffing, connections as demoConnections, defaultAgentMessages } from './data/demo.js';
import { loadUserData, saveUserData, getDataMode, setDataMode, hasUserData, parseCSV, normalizePOSRows, normalizeRecipeRows, normalizeInventoryRows, normalizeEmployeeRows } from './data/user-store.js';
import { analyzePOS, estimateIngredientUsage, staffingRecommendation, generatePurchaseDraft, agentPlan } from './lib/engine.js';

const state = {
  page: 'home',
  mode: getDataMode(),
  userData: loadUserData(),
  agentMessages: [...defaultAgentMessages],
  selectedScenario: 'recommended',
  audit: JSON.parse(localStorage.getItem('cafeops_audit') || '[]'),
  modal: null,
  editMenuName: null,
  prefillMenu: '',
  promoText: localStorage.getItem('cafeops_promo_text') || '',
};

const navItems = [
  ['home','⌂','홈'], ['assistant','✦','AI 비서'], ['sales','▥','매출 분석'], ['inventory','◫','재고 관리'], ['staffing','♧','근무 관리'], ['menu','☕','메뉴 관리'], ['connections','↔','데이터 연결']
];

const won = (n) => `${Math.round(n).toLocaleString()}원`;
const dateTime = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '아직 없음';
function addAudit(action, detail){ state.audit.unshift({action,detail,at:new Date().toLocaleString('ko-KR')}); state.audit=state.audit.slice(0,20); localStorage.setItem('cafeops_audit', JSON.stringify(state.audit)); }

function context(){
  const useUser = state.mode === 'user' && hasUserData(state.userData);
  const posAnalysis = analyzePOS(useUser ? state.userData.posRows : [], demoStore.weather.delta);
  const dynamicInventory = useUser ? estimateIngredientUsage(state.userData, posAnalysis) : null;
  const inventory = dynamicInventory || demoInventory;
  const staffing = useUser ? staffingRecommendation(posAnalysis, state.userData.employees) : {...demoStaffing, shortage: demoStaffing.slots.find(s=>s.recommended>s.current), summary:'14–17시에 1명 추가 배치를 권장합니다.', estimatedExtraCost:36000};
  const dataSummary = {
    mode: useUser ? 'user' : 'demo', posRows: state.userData.posRows.length, recipes: state.userData.recipes.length,
    inventory: state.userData.inventory.length, employees: state.userData.employees.length,
    completeness: Math.round(([state.userData.posRows.length,state.userData.recipes.length,state.userData.inventory.length,state.userData.employees.length].filter(Boolean).length / 4) * 100),
  };
  return { useUser, posAnalysis, inventory, staffing, dataSummary, weather: demoStore.weather };
}

function currentStore(){ return state.mode==='user' && hasUserData(state.userData) ? {...demoStore,...state.userData.store} : demoStore; }
function layout(content){
  const side = navItems.map(([id,icon,label])=>`<button data-nav="${id}" class="${state.page===id?'active':''}"><span>${icon}</span>${label}</button>`).join('');
  const mobile = [['home','⌂','홈'],['assistant','✦','AI 비서'],['inventory','◫','재고'],['staffing','♧','근무'],['connections','•••','더보기']].map(([id,icon,label])=>`<button data-nav="${id}" class="${state.page===id?'active':''}"><span>${icon}</span>${label}</button>`).join('');
  return `<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">☕</div>CafeOps</div><nav class="nav">${side}</nav></aside><main class="main">${content}</main><nav class="mobile-nav">${mobile}</nav></div>${state.modal ? modalMarkup(state.modal) : ''}`;
}
function header(title,subtitle='오늘도 좋은 하루 되세요. AI가 매장 상황을 먼저 점검했어요.'){
  const s=currentStore(); const c=context();
  return `<div class="topbar"><div><div class="eyebrow">${s.name} · ${c.dataSummary.mode==='user'?'내 데이터 기준':'데모 데이터 기준'}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="weather"><div style="font-size:26px">🌧️</div><div class="weather-copy"><div>${demoStore.today}</div><small>${demoStore.weather.label} · 강수확률 ${demoStore.weather.rainProbability}%</small></div><strong>${demoStore.weather.temp}°</strong></div></div>`;
}
function sourceStrip(){
  const c=context();
  return `<div class="data-strip"><div><strong>${c.dataSummary.mode==='user'?'내 매장 데이터':'CafeOps 데모 데이터'}</strong><small>${c.dataSummary.mode==='user'?`POS ${c.dataSummary.posRows.toLocaleString()}건 · 레시피 ${c.dataSummary.recipes}개 · 재고 ${c.dataSummary.inventory}종 · 직원 ${c.dataSummary.employees}명`:'샘플 데이터로 기능을 체험 중입니다.'}</small></div><div class="data-actions"><span class="badge">데이터 ${c.dataSummary.mode==='user'?`${c.dataSummary.completeness}% 연결`:'DEMO'}</span><button class="btn soft" data-nav="connections">근거 보기</button></div></div>`;
}
function deriveKpis(){
  const c=context(); if(!c.useUser) return demoKpis;
  const riskCount = c.inventory===demoInventory ? 0 : c.inventory.scenarios[1].stockoutRisk > 8 ? 1 : 0;
  const staffRisk = c.staffing.shortage ? 1 : 0;
  return [
    {label:'오늘 예상 매출',value:won(c.posAnalysis.predictedRevenue),change:`최근 데이터 기준 ${Math.round(c.posAnalysis.changeRate*100)}% 날씨 조정`,tone:c.posAnalysis.changeRate<0?'down':'up'},
    {label:'예상 주문 수',value:`${c.posAnalysis.predictedOrders.toLocaleString()}건`,change:`POS ${c.dataSummary.posRows.toLocaleString()}행 반영`,tone:'up'},
    {label:'재고 위험',value:`${riskCount}건`,change:c.inventory===demoInventory?'BOM·재고 등록 필요':`${c.inventory.ingredient} 계산 완료`,tone:riskCount?'warn':'up'},
    {label:'권장 인력',value:`${Math.max(...c.staffing.slots.map(s=>s.recommended))}명`,change:c.staffing.shortage?`${c.staffing.shortage.time} +${c.staffing.shortage.recommended-c.staffing.shortage.current}명`:'현재 배치 유지',tone:c.staffing.shortage?'warn':'up'},
  ];
}
function deriveIssues(){
  const c=context(); if(!c.useUser) return demoIssues;
  const list=[];
  if(c.inventory!==demoInventory) list.push({type:'inventory',title:`${c.inventory.ingredient} 재고는 ${c.inventory.expectedStockout} 소진될 수 있습니다.`,subtitle:`현재 ${c.inventory.currentQty}${c.inventory.unit} · 권장 발주 ${c.inventory.scenarios[1].qty}${c.inventory.unit}`,action:'발주안 검토'});
  else list.push({type:'inventory',title:'메뉴 레시피와 현재 재고를 등록하면 품절 위험을 계산할 수 있습니다.',subtitle:'BOM × POS 판매량으로 이론 재고를 계산합니다.',action:'데이터 등록'});
  if(c.staffing.shortage) list.push({type:'staffing',title:`${c.staffing.shortage.time}에 인력이 ${c.staffing.shortage.recommended-c.staffing.shortage.current}명 부족할 가능성이 있습니다.`,subtitle:`예상 주문 ${c.staffing.shortage.orders}건 · 등록 직원 ${c.dataSummary.employees}명`,action:'근무표 보기'});
  list.push({type:'sales',title:`최근 데이터 기준 다음 영업일 예상 매출은 ${won(c.posAnalysis.predictedRevenue)}입니다.`,subtitle:`분석 기간 ${c.posAnalysis.dateRange} · 메뉴 ${c.posAnalysis.menuCount}종`,action:'매출 분석'});
  return list;
}
function kpiGrid(){ return `<section class="grid-kpi">${deriveKpis().map(k=>`<div class="card kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-change ${k.tone}">${k.change}</div></div>`).join('')}</section>`; }
function trendChart(){
  const {posAnalysis}=context(); const a=posAnalysis.trend,b=posAnalysis.lastTrend; const max=Math.max(...a,...b,1);
  const pts=(arr)=>arr.map((v,i)=>`${(i/(arr.length-1))*100},${100-(v/max)*84}`).join(' ');
  return `<div class="chart"><div class="chart-line"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts(b)}" fill="none" stroke="#cdb9a6" stroke-width="2"/><polyline points="${pts(a)}" fill="none" stroke="#4a372f" stroke-width="2.7"/></svg></div></div><div class="legend"><span><i class="dot light"></i>최근 실적</span><span><i class="dot"></i>예측</span></div>`;
}
function home(){ const is=deriveIssues(); return layout(`${header('안녕하세요, 사장님! 👋')}${sourceStrip()}${kpiGrid()}<div class="two-col"><section class="card section-card"><div class="section-title"><h2>AI가 발견한 오늘의 주요 이슈</h2><span class="badge">자동 감지</span></div><div class="issue-list">${is.map((x,i)=>`<div class="issue"><div class="issue-icon">${i+1}</div><div><strong>${x.title}</strong><small>${x.subtitle}</small></div><button class="btn" data-nav="${x.action==='데이터 등록'?'connections':x.type}">${x.action} →</button></div>`).join('')}</div></section><section class="card section-card"><div class="section-title"><h2>예상 매출 추이</h2><span class="badge">등록 데이터 반영</span></div>${trendChart()}</section></div>`); }

function inventoryPage(){ const inv=context().inventory; const s=inv.scenarios; return layout(`${header('재고 관리','판매 기록과 레시피를 기반으로 재고 소진 시점과 발주 대안을 계산합니다.')}${sourceStrip()}<div class="page-grid"><section class="card section-card"><div class="section-title"><h2>📦 ${inv.ingredient}</h2><span class="badge warn">${inv.expectedStockout}</span></div><div class="metric-row"><div class="metric">현재 재고<div class="value">${inv.currentQty}${inv.unit}</div></div><div class="metric">최근 평균 사용<div class="value">${inv.avgDailyUse}${inv.unit}/일</div></div><div class="metric">수요 보정<div class="value ${inv.demandDelta<0?'down':'up'}">${Math.round(inv.demandDelta*100)}%</div></div><div class="metric">예상 소진<div class="value" style="font-size:15px">${inv.expectedStockout}</div></div></div><div class="section-title" style="margin-top:22px"><h2>발주 시나리오 비교</h2><span class="badge">비용·품절·폐기 균형</span></div><div class="scenario-grid">${s.map(x=>`<div class="scenario ${state.selectedScenario===x.id?'recommended':''}">${x.recommended?'<span class="recommend-tag">AI 권장</span>':''}<h3>${x.label}</h3><div class="qty">${x.qty}${inv.unit}</div><dl><dt>품절 위험</dt><dd>${x.stockoutRisk}%</dd><dt>폐기 위험</dt><dd>${x.wasteRisk}%</dd><dt>예상 비용</dt><dd>${won(x.cost)}</dd></dl><button class="btn ${state.selectedScenario===x.id?'primary':''}" data-scenario="${x.id}">${state.selectedScenario===x.id?'선택됨':'선택'}</button></div>`).join('')}</div></section><aside class="card section-card"><div class="section-title"><h2>추천 근거</h2><span class="badge">설명 가능</span></div><div class="callout"><strong>${inv.ingredient} ${s[1].qty}${inv.unit} 발주 권장</strong><br/>POS 판매량 × 등록 레시피(BOM) × 현재 재고 × 날씨 수요 보정을 함께 계산했습니다.</div><button class="btn primary" style="width:100%;margin-top:12px" id="approvePurchase">선택한 발주안 승인</button><div class="section-title" style="margin-top:20px"><h2 style="font-size:15px">최근 승인 기록</h2><span class="badge">Audit</span></div>${state.audit.length?state.audit.slice(0,4).map(a=>`<div class="audit-item"><strong>${a.action}</strong><div>${a.detail} · ${a.at}</div></div>`).join(''):'<div class="eyebrow">아직 승인 기록이 없습니다.</div>'}</aside></div>`); }

function staffingPage(){ const st=context().staffing; return layout(`${header('근무 관리','예상 주문량과 직원 가능시간을 결합해 서비스 수준을 지키는 최소 인력을 제안합니다.')}${sourceStrip()}<div class="page-grid"><section class="card section-card"><div class="section-title"><h2>${st.date} 시간대별 권장 인원</h2><span class="badge">수요 예측 기반</span></div><table class="schedule-table"><thead><tr><th>시간대</th><th>예상 주문</th><th>현재</th><th>권장</th><th>변화</th></tr></thead><tbody>${st.slots.map(s=>`<tr class="${s.recommended>s.current?'warning':''}"><td data-label="시간대">${s.time}</td><td data-label="예상 주문">${s.orders}건</td><td data-label="현재">${s.current}명</td><td data-label="권장"><strong>${s.recommended}명</strong></td><td data-label="변화" class="${s.recommended>s.current?'warn':''}">${s.recommended>s.current?`+${s.recommended-s.current}명`:'유지'}</td></tr>`).join('')}</tbody></table><button class="btn primary" id="generateSchedule">근무표 자동 생성</button></section><aside class="card section-card"><div class="section-title"><h2>등록 직원</h2><span class="badge">${st.employees.length}명</span></div>${st.employees.map(e=>`<div class="issue compact"><div><strong>${e.name}</strong><small>${e.available}</small></div><strong>${Number(e.wage).toLocaleString()}원/h</strong></div>`).join('')}</aside></div>`); }

function statusFor(id){ const d=state.userData; const map={pos:d.posRows.length?`${d.posRows.length.toLocaleString()}건`:'미등록',bom:d.recipes.length?`${d.recipes.length}개 BOM`:'미등록',inventory:d.inventory.length?`${d.inventory.length}종`:'미등록',employees:d.employees.length?`${d.employees.length}명`:'미등록',weather:'자동 연결',commercial:'자동 연결'}; return map[id]||'미등록'; }
function connectionAction(c){ if(c.id==='weather'||c.id==='commercial') return ''; return `<button class="icon-btn" data-open="${c.id}" title="${c.title} 등록/수정">＋</button>`; }
function connectionsPage(){ const c=context(); return layout(`${header('데이터 연결','각 항목의 + 버튼을 눌러 내 카페 정보를 등록하면 대시보드 계산이 즉시 바뀝니다.')}${sourceStrip()}<div class="mode-switch"><div><strong>데이터 모드</strong><small>데모와 내 매장 데이터를 언제든 비교할 수 있습니다.</small></div><div><button class="btn ${state.mode==='demo'?'primary':''}" data-mode="demo">데모 데이터</button><button class="btn ${state.mode==='user'?'primary':''}" data-mode="user" ${!hasUserData(state.userData)?'disabled':''}>내 매장 데이터</button></div></div><section class="card section-card"><div class="section-title"><h2>내 매장 데이터 연결</h2><span class="badge">마지막 업데이트 ${dateTime(state.userData.updatedAt)}</span></div><div class="connection-list">${demoConnections.map(x=>`<div class="connection"><div class="conn-icon">${x.automatic?'↻':'＋'}</div><div><strong>${x.title}</strong><small>${x.description}</small><div class="status">${statusFor(x.id)}</div></div>${connectionAction(x)}</div>`).join('')}</div><div class="callout" style="margin-top:14px"><strong>등록 즉시 계산에 반영됩니다.</strong><br/>POS CSV는 예상 매출·주문량을, BOM과 재고는 발주 추천을, 직원 정보는 근무 배치 추천을 변경합니다.</div></section><section class="card section-card" style="margin-top:14px"><div class="section-title"><h2>데이터가 계산에 쓰이는 방식</h2><span class="badge">Traceability</span></div><div class="pipeline"><span>POS 주문</span><b>→</b><span>수요 예측</span><b>→</b><span>BOM 재료소모</span><b>→</b><span>재고·발주</span><b>→</b><span>직원 배치</span><b>→</b><span>AI 설명</span></div></section>`); }

function assistantPage(){ const c=context(); return layout(`${header('AI 운영 비서','등록한 매장 데이터와 계산 도구를 사용해 근거가 있는 운영안을 만듭니다.')}${sourceStrip()}<section class="card agent-panel"><div class="agent-head"><div><strong>☕ CafeOps Agent</strong><div class="eyebrow">${c.dataSummary.mode==='user'?`내 데이터 · POS ${c.dataSummary.posRows}건 · BOM ${c.dataSummary.recipes}개 · 직원 ${c.dataSummary.employees}명`:'데모 데이터'}</div></div><span class="badge">${c.dataSummary.mode==='user'?'PERSONALIZED':'DEMO'}</span></div><div class="agent-messages" id="messages">${renderMessages()}</div><form class="agent-input" id="agentForm"><input id="agentInput" autocomplete="off" placeholder="예: 이번 토요일 비 오는데 운영 어떻게 해야 해?"/><button class="btn primary">전송</button></form></section>`); }
function renderMessages(){ return state.agentMessages.map(m=>`<div class="bubble ${m.role}">${m.text}</div>${m.tools?.length?`<div class="tool-row">${m.tools.map(t=>`<span class="tool-chip">✓ ${t}</span>`).join('')}</div>`:''}${m.cards?.length?`<div class="agent-result-grid">${m.cards.map(c=>`<div class="agent-result"><strong>${c.title}: ${c.value}</strong><small>${c.detail}</small></div>`).join('')}</div>`:''}`).join(''); }
function promoTarget(){
  const rows=state.mode==='user'?state.userData.posRows:[];
  if(!rows.length) return '카페라떼';
  const counts=new Map(); rows.forEach(r=>counts.set(r.menu,(counts.get(r.menu)||0)+(Number(r.quantity)||0)));
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'카페라떼';
}
function generatePromoCopy(){
  const c=context(); const menu=promoTarget(); const weather=c.weather?.label||'오늘';
  const copy=`☕ 오늘의 CafeOps 추천 프로모션\n\n${weather}에도 기분 좋은 한 잔, ${menu}와 함께하세요.\n오늘 오후 2시~5시 ${menu} 주문 시 디저트 세트 혜택을 준비했습니다.\n\n매장 데이터 기반 추천 · 예상 수요와 재고 상황을 반영한 프로모션입니다.\n#카페추천 #${menu.replace(/\s/g,'')} #오늘의카페`;
  state.promoText=copy; localStorage.setItem('cafeops_promo_text',copy); addAudit('홍보문 생성',`${menu} 프로모션 문구`); return copy;
}
function salesPage(){ const c=context(); return layout(`${header('매출 분석','업로드한 POS 데이터를 기반으로 예측 기준과 데이터 범위를 확인합니다.')}${sourceStrip()}<div class="two-col"><section class="card section-card"><div class="section-title"><h2>매출 추이</h2><span class="badge">${c.posAnalysis.source==='user'?'내 POS':'데모'}</span></div>${trendChart()}</section><aside class="card section-card"><div class="section-title"><h2>분석 데이터</h2><span class="badge">근거</span></div><div class="metric-list"><div><span>분석 기간</span><strong>${c.posAnalysis.dateRange}</strong></div><div><span>POS 행</span><strong>${c.posAnalysis.rowCount.toLocaleString()}</strong></div><div><span>메뉴 수</span><strong>${c.posAnalysis.menuCount}</strong></div><div><span>최근 일평균 매출</span><strong>${won(c.posAnalysis.dailyAverageRevenue)}</strong></div></div><button class="btn primary" id="generatePromo" style="width:100%;margin-top:16px">홍보문 자동 생성</button></aside></div>${state.promoText?`<section class="card section-card promo-output"><div class="section-title"><div><h2>생성된 홍보문</h2><p class="subtitle">생성 결과는 이 브라우저에 저장되어 새로고침 후에도 유지됩니다.</p></div><div class="data-actions"><button class="btn soft" id="copyPromo">복사</button><button class="btn" id="clearPromo">삭제</button></div></div><div class="promo-copy">${state.promoText.replace(/\n/g,'<br>')}</div></section>`:''}`); }
function groupedMenus(){
  const map=new Map();
  state.userData.recipes.forEach(r=>{const m=map.get(r.menu)||{name:r.menu,price:Number(r.price)||0,ingredients:[]};m.price=m.price||Number(r.price)||0;m.ingredients.push(r);map.set(r.menu,m);});
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
function menuPage(){ const menus=groupedMenus(); return layout(`${header('메뉴 관리','메뉴·가격·레시피(BOM)를 관리하면 재료 소모량과 발주 추천에 즉시 반영됩니다.')}${sourceStrip()}<section class="card section-card"><div class="section-title"><div><h2>메뉴 목록</h2><p class="subtitle">메뉴 가격을 수정하거나 재료를 추가하면 내 매장 데이터 기준 계산에 반영됩니다.</p></div><button class="btn primary" id="addMenu">+ 메뉴 등록</button></div>${menus.length?`<div class="menu-grid">${menus.map(m=>`<article class="menu-card"><div class="menu-card-head"><div><strong>${m.name}</strong><small>${m.price?won(m.price):'가격 미등록'} · 재료 ${m.ingredients.length}개</small></div><div class="menu-actions"><button class="icon-btn small" data-add-ingredient="${m.name}" title="재료 추가">＋</button><button class="icon-btn small" data-edit-menu="${m.name}" title="메뉴 수정">✎</button><button class="icon-btn small danger" data-delete-menu="${m.name}" title="메뉴 삭제">×</button></div></div><div class="ingredient-list">${m.ingredients.map((r,i)=>`<div><span>${r.ingredient}</span><strong>${r.amount}${r.unit}</strong><button class="mini-remove" data-delete-recipe="${m.name}|||${r.ingredient}|||${i}">삭제</button></div>`).join('')}</div></article>`).join('')}</div>`:'<div class="empty-state">아직 등록된 메뉴가 없습니다. 메뉴를 먼저 등록한 뒤 레시피 재료를 추가해 주세요.</div>'}</section>`); }
function placeholder(title){ return layout(`${header(title,'핵심 의사결정 기능과 동일한 데이터 계약으로 확장할 수 있습니다.')}${sourceStrip()}<div class="card section-card"><div class="callout"><strong>확장 영역</strong><br/>현재 대회 MVP에서는 홈·AI 비서·재고·근무·데이터 연결의 실제 계산 흐름에 집중했습니다.</div></div>`); }

function modalMarkup(type){
 const title={pos:'POS 매출 데이터',bom:'메뉴 레시피 (BOM)',inventory:'현재 재고',employees:'직원 정보',menu:'메뉴 등록/수정'}[type]||'데이터 등록';
 const hint={pos:'timestamp, menu, quantity, unit_price 또는 유사한 한글 헤더를 지원합니다.',bom:'menu, ingredient, amount, unit. 같은 메뉴의 여러 재료는 여러 행으로 작성합니다.',inventory:'ingredient, quantity, unit, unit_cost 형식을 권장합니다.',employees:'name, wage, available, max_hours 형식을 권장합니다.',menu:'메뉴명과 판매가격을 등록합니다. 저장 후 재료를 추가해 BOM을 완성할 수 있습니다.'}[type];
 const currentMenu=state.editMenuName?groupedMenus().find(m=>m.name===state.editMenuName):null;
 const direct = type==='menu'?`<div class="direct-form"><input id="fMenuName" placeholder="메뉴명" value="${currentMenu?.name||''}"><input id="fMenuPrice" type="number" placeholder="판매가격" value="${currentMenu?.price||''}"><button class="btn primary" id="addDirect">${currentMenu?'메뉴 수정':'메뉴 등록'}</button></div>`:type==='bom'?`<div class="direct-form"><input id="fMenu" placeholder="메뉴명 (예: 딸기라떼)" value="${state.prefillMenu||''}"><input id="fIngredient" placeholder="재료 (예: 딸기)"><input id="fAmount" type="number" step="0.01" placeholder="사용량"><select id="fUnit"><option>g</option><option>ml</option><option>kg</option><option>L</option><option>개</option></select><button class="btn primary" id="addDirect">직접 추가</button></div>`:type==='inventory'?`<div class="direct-form"><input id="fIngredient" placeholder="재료"><input id="fQty" type="number" step="0.01" placeholder="현재고"><select id="fUnit"><option>kg</option><option>L</option><option>개</option><option>g</option><option>ml</option></select><input id="fCost" type="number" placeholder="단위 원가"><button class="btn primary" id="addDirect">직접 추가</button></div>`:type==='employees'?`<div class="direct-form"><input id="fName" placeholder="직원 이름"><input id="fWage" type="number" placeholder="시급"><input id="fAvailable" placeholder="근무 가능시간 (예: 09–17)"><button class="btn primary" id="addDirect">직접 추가</button></div>`:'';
 return `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>${title}</h2><p>${hint}</p></div><button class="icon-btn" id="closeModal">×</button></div>${direct}${type==='menu'?'':`<div class="upload-box"><strong>CSV 업로드</strong><p>${hint}</p><input type="file" id="modalCsv" accept=".csv,text/csv"><div id="modalStatus" class="eyebrow">파일을 선택하세요.</div></div>`}<div class="modal-actions"><button class="btn" id="closeModal2">닫기</button></div></div></div>`;
}

function render(){ const map={home,assistant:assistantPage,sales:salesPage,inventory:inventoryPage,staffing:staffingPage,connections:connectionsPage,menu:menuPage}; document.getElementById('app').innerHTML=(map[state.page]||home)(); bind(); }
function toast(text){ const t=document.createElement('div');t.className='toast';t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),2600); }
function activateUserMode(){ state.mode='user'; setDataMode('user'); }
function persist(message){ state.userData=saveUserData(state.userData); activateUserMode(); addAudit('데이터 갱신',message); }
function importRows(type, rows, filename){
  if(type==='pos') state.userData.posRows=normalizePOSRows(rows);
  if(type==='bom') state.userData.recipes=normalizeRecipeRows(rows);
  if(type==='inventory') state.userData.inventory=normalizeInventoryRows(rows);
  if(type==='employees') state.userData.employees=normalizeEmployeeRows(rows);
  const count = type==='pos'?state.userData.posRows.length:type==='bom'?state.userData.recipes.length:type==='inventory'?state.userData.inventory.length:state.userData.employees.length;
  persist(`${filename} · ${count}건`); toast(`${count}건을 등록하고 대시보드에 반영했습니다.`); state.modal=null; render();
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{state.page=b.dataset.nav;render();window.scrollTo(0,0)}));
 document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{state.selectedScenario=b.dataset.scenario;render();}));
 document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{state.editMenuName=null;state.prefillMenu='';state.modal=b.dataset.open;render();}));
 document.getElementById('addMenu')?.addEventListener('click',()=>{state.editMenuName=null;state.modal='menu';render();});
 document.querySelectorAll('[data-edit-menu]').forEach(b=>b.addEventListener('click',()=>{state.editMenuName=b.dataset.editMenu;state.modal='menu';render();}));
 document.querySelectorAll('[data-add-ingredient]').forEach(b=>b.addEventListener('click',()=>{state.prefillMenu=b.dataset.addIngredient;state.modal='bom';render();}));
 document.querySelectorAll('[data-delete-menu]').forEach(b=>b.addEventListener('click',()=>{const name=b.dataset.deleteMenu;if(!confirm(`${name} 메뉴와 등록된 레시피를 삭제할까요?`))return;state.userData.recipes=state.userData.recipes.filter(r=>r.menu!==name);persist(`${name} 메뉴 삭제`);toast('메뉴를 삭제했습니다.');render();}));
 document.querySelectorAll('[data-delete-recipe]').forEach(b=>b.addEventListener('click',()=>{const [menu,ingredient]=b.dataset.deleteRecipe.split('|||');const idx=state.userData.recipes.findIndex(r=>r.menu===menu&&r.ingredient===ingredient);if(idx>=0)state.userData.recipes.splice(idx,1);persist(`${menu} - ${ingredient} 레시피 삭제`);toast('레시피 재료를 삭제했습니다.');render();}));
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{const m=b.dataset.mode;if(m==='user'&&!hasUserData(state.userData))return;state.mode=m;setDataMode(m);state.agentMessages=[...defaultAgentMessages];render();}));
 const close=()=>{state.modal=null;state.editMenuName=null;state.prefillMenu='';render();}; document.getElementById('closeModal')?.addEventListener('click',close);document.getElementById('closeModal2')?.addEventListener('click',close);document.getElementById('modalBackdrop')?.addEventListener('click',(e)=>{if(e.target.id==='modalBackdrop')close();});
 document.getElementById('approvePurchase')?.addEventListener('click',()=>{const inv=context().inventory;const s=inv.scenarios.find(x=>x.id===state.selectedScenario);const draft=generatePurchaseDraft(s.qty,inv);addAudit('발주안 승인',`${draft.quantity}${draft.unit} · ${won(draft.total)} · draft 생성`);toast(`${draft.quantity}${draft.unit} 발주서 초안을 생성했습니다.`);render();});
 document.getElementById('generateSchedule')?.addEventListener('click',()=>{const st=context().staffing;addAudit('근무표 초안 승인',st.summary);toast('권장 근무표 초안을 생성했습니다. 실제 적용 전 점주 승인이 필요합니다.');});
 document.getElementById('generatePromo')?.addEventListener('click',()=>{generatePromoCopy();toast('홍보문을 생성했습니다. 아래에서 확인할 수 있어요.');render();});
 document.getElementById('copyPromo')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.promoText);toast('홍보문을 복사했습니다.');}catch{toast('복사에 실패했습니다. 텍스트를 직접 선택해 주세요.');}});
 document.getElementById('clearPromo')?.addEventListener('click',()=>{state.promoText='';localStorage.removeItem('cafeops_promo_text');toast('생성된 홍보문을 삭제했습니다.');render();});
 const modalCsv=document.getElementById('modalCsv'); if(modalCsv){ modalCsv.addEventListener('change',async()=>{const file=modalCsv.files?.[0];if(!file)return;const {rows}=parseCSV(await file.text());document.getElementById('modalStatus').textContent=`${rows.length}행을 읽었습니다. 적용 중...`;importRows(state.modal,rows,file.name);}); }
 document.getElementById('addDirect')?.addEventListener('click',()=>{
   const type=state.modal;
   if(type==='menu'){
     const name=document.getElementById('fMenuName').value.trim(); const price=Number(document.getElementById('fMenuPrice').value)||0; if(!name)return toast('메뉴명을 입력해 주세요.');
     if(state.editMenuName){state.userData.recipes=state.userData.recipes.map(r=>r.menu===state.editMenuName?{...r,menu:name,price}:r);persist(`${state.editMenuName} 메뉴 수정`);}else{state.userData.recipes.push({menu:name,ingredient:'레시피 미등록',amount:0,unit:'g',price});persist(`${name} 메뉴 등록`);} state.editMenuName=null;
   }
   if(type==='bom'){const row={menu:document.getElementById('fMenu').value.trim(),ingredient:document.getElementById('fIngredient').value.trim(),amount:Number(document.getElementById('fAmount').value),unit:document.getElementById('fUnit').value,price:groupedMenus().find(m=>m.name===document.getElementById('fMenu').value.trim())?.price||0};if(!row.menu||!row.ingredient||!row.amount)return toast('메뉴·재료·사용량을 입력해 주세요.');state.userData.recipes=state.userData.recipes.filter(r=>!(r.menu===row.menu&&r.ingredient==='레시피 미등록'));state.userData.recipes.push(row);persist(`${row.menu} BOM 등록`);}
   if(type==='inventory'){const row={ingredient:document.getElementById('fIngredient').value.trim(),quantity:Number(document.getElementById('fQty').value),unit:document.getElementById('fUnit').value,unitCost:Number(document.getElementById('fCost').value)||0};if(!row.ingredient)return toast('재료명을 입력해 주세요.');const i=state.userData.inventory.findIndex(x=>x.ingredient===row.ingredient);if(i>=0)state.userData.inventory[i]=row;else state.userData.inventory.push(row);persist(`${row.ingredient} 재고 등록`);}
   if(type==='employees'){const row={name:document.getElementById('fName').value.trim(),wage:Number(document.getElementById('fWage').value)||12000,available:document.getElementById('fAvailable').value.trim()||'09–22',maxHours:8};if(!row.name)return toast('직원 이름을 입력해 주세요.');state.userData.employees.push(row);persist(`${row.name} 직원 등록`);}
   toast('등록한 정보가 대시보드 계산에 반영됐습니다.');state.modal=null;render();
 });
 const form=document.getElementById('agentForm'); if(form){form.addEventListener('submit',(e)=>{e.preventDefault();const input=document.getElementById('agentInput');const msg=input.value.trim();if(!msg)return;state.agentMessages.push({role:'user',text:msg});state.agentMessages.push({role:'assistant',...agentPlan(msg,context())});render();setTimeout(()=>{const el=document.getElementById('messages');if(el)el.scrollTop=el.scrollHeight},0);});}
}
render();
