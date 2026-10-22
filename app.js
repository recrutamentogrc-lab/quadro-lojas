/* =====================================================================
 * QUADRO DE LOJAS · GRC — Frontend
 * ===================================================================== */
(function () {
'use strict';
const CFG = window.GRC_CONFIG || {};
const QS = new URLSearchParams(location.search);
const DEMO = QS.has('demo');
const API_OK = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '');

const LC = { MATRIZ: '#22d3ee', MESSEJANA: '#a78bfa', TORRA: '#f59e0b', EUSEBIO: '#34d399', GRC: '#f5c451', SUPERFRALDAS: '#f472b6', MONITORAMENTO: '#60a5fa', CASA_CONSTRUCAO: '#fb923c' };
const LOJA_NOMES = { MATRIZ: 'Matriz', MESSEJANA: 'Messejana', TORRA: 'Torra', EUSEBIO: 'Eusébio', GRC: 'GRC (Adm.)', SUPERFRALDAS: 'Super Fraldas', MONITORAMENTO: 'Monitoramento', CASA_CONSTRUCAO: 'Casa & Construção' };
const PERFIS = { ADMIN: 'Administrador', EDITOR: 'Editor (gestão)', RECRUTADOR: 'Recrutador', LEITOR: 'Gestor / Líder', DP: 'Departamento Pessoal' };
const GATED = { saveRow: 1, abrirVaga: 1, preencherVaga: 1, addPosicao: 1, removerPosicao: 1, addContratacao: 1, saveContratacao: 1, alocar: 1, desligar: 1, marcarDesligadoContr: 1, desligarLote: 1, contrBulkSet: 1, cruzarContr: 1, setPadrao: 1, setVagaInfo: 'etapas', setVagaInfoLote: 'etapas' , movimentar: 1 };
const GATED_EDITOR = { setPadrao: 1, addPosicao: 1 };
const MOTIVOS_REQ = ['Substituição (desligamento)', 'Troca / transferência', 'Vaga em aberto (já existe no quadro)', 'Aumento de quadro', 'Temporário / sazonal', 'Abertura de loja', 'Outro'];
const TIPOS_DESL = ['Pedido de demissão', 'Dispensa sem justa causa', 'Dispensa por justa causa', 'Término de contrato de experiência', 'Acordo entre as partes', 'Término de contrato (aprendiz/estágio)', 'Outro'];
const DEF_OPC = {
  situacao: ['OK', 'VAGA', 'EM AVISO', 'TROCA', 'ANÁLISE'],
  tag: ['CIPA', 'PCD', 'APRENDIZ', 'Lider Trainee'],
  contrato: ['INTEGRAL', 'PARCIAL', 'ESTÁGIO', 'APRENDIZ', 'JOVEM APRENDIZ', 'RATEIO', 'PCD', 'APOIO']
};

const S = { cfg: null, notif: { items: [], unread: 0, pendentes: 0 }, pendRows: {}, desl: new Set(), token: null, user: null, data: null, charts: [], f: {}, view: {}, sort: {}, tot: null, all: [] };

/* ---------------- utils ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const fmt = (n, d = 2) => (Math.round((+n || 0) * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: d });
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const sum = (a, f) => a.reduce((x, y) => x + (f ? f(y) : y), 0);
const uniq = a => [...new Set(a.filter(x => x !== '' && x != null))];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const initials = n => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseBR = s => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], m[2] - 1, +m[1]) : null; };
const parseISO = s => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
const daysTo = d => d ? Math.round((d - today0()) / 864e5) : null;
const isoToBR = s => { const d = parseISO(s); return d ? d.toLocaleDateString('pt-BR') : ''; };
const brToISO = s => { const d = parseBR(s); return d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : ''; };
const lojaKey = t => { const u = norm(t); if (!u) return ''; { const ex = Object.keys(LOJA_NOMES).find(k => !['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO', 'GRC'].includes(k) && (u === k || u.includes(norm(LOJA_NOMES[k])) || u.includes(k.replace(/_/g, ' ')))); if (ex) return ex; } if (/MATRIZ|SANTA ROSA/.test(u)) return 'MATRIZ'; if (/MESSEJANA/.test(u)) return 'MESSEJANA'; if (/TORRA/.test(u)) return 'TORRA'; if (/FRALDA/.test(u)) return 'SUPERFRALDAS'; if (/MONITORAMENTO/.test(u)) return 'MONITORAMENTO'; if (/EUSEBIO/.test(u)) return 'EUSEBIO'; if (/GRC|ADM/.test(u)) return 'GRC'; return u; };
const splitMulti = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const lojaPill = k => `<span class="loja-pill" style="--lc:${LC[k] || '#94a3b8'}"><i></i>${h(LOJA_NOMES[k] || k)}</span>`;

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  userplus: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  collapse: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 10l-2 2 2 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M15 8l2 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  accessibility: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8l7 1.5L19 8M12 9.5V14M12 14l-3.5 7M12 14l3.5 7"/>',
  grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  eraser: '<path d="M20 20H8.5L3.6 15.1a2 2 0 0 1 0-2.8L13 3l8 8-8.5 9"/><path d="M6 11l7 7"/>',
  door: '<path d="M14 3H6a1 1 0 0 0-1 1v17h14V4a1 1 0 0 0-1-1h-1"/><path d="M14 3v18M11 12h.01"/>',
  spark: '<path d="M12 3l1.9 5.8L20 10l-5 3.7L16.8 20 12 16.4 7.2 20 9 13.7 4 10l6.1-1.2z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  chevl: '<path d="M15 18l-6-6 6-6"/>',
  chevl2: '<path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h4"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M5 11h14"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;

// foto do colaborador: guardada na configuração (chave foto_NOME); usuário logado usa a foto do perfil
const fotoKey = nome => 'foto_' + norm(nome).replace(/[^A-Z0-9]+/g, '_');
const chaveNome = n => String(n || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
const fotoDe = n => (typeof S !== 'undefined' && S.fotos && S.fotos[chaveNome(n)]) || '';
function fotoColab(nome) {
  if (!nome) return '';
  if (fotoDe(nome)) return fotoDe(nome);
  const f = (typeof S !== 'undefined' && S.cfg && S.cfg[fotoKey(nome)]) || '';
  if (f) return f;
  return (typeof S !== 'undefined' && S.user && S.user.foto && norm(S.user.nome) === norm(nome)) ? S.user.foto : '';
}
function avatar(name, foto, cls = '') {
  if (!foto) foto = fotoColab(name);
  return `<div class="avatar ${cls}">${foto ? `<img src="${h(foto)}" alt="">` : h(initials(name))}</div>`;
}

/* ---------------- feedback ---------------- */
function toast(msg, err) {
  if (!msg) return;
  if (!err && S.muteUntil && Date.now() < S.muteUntil) return;
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, err ? 5200 : 3000);
}
let busyN = 0;
function busy(on) { busyN += on ? 1 : -1; $('#topline').classList.toggle('on', busyN > 0); }

function modal({ title, body, foot, wide, onMount, locked, icon, onClose }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="modal-h">${icon ? `<div class="kpi" style="padding:0"><div class="ico" style="--kc:var(--accent)">${ic(icon)}</div></div>` : ''}<h3>${title}</h3>${locked ? '' : `<button class="btn ghost icon" data-x>${ic('x')}</button>`}</div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
  document.body.appendChild(ov);
  let closed = false;
  const close = () => { if (closed) return; closed = true; ov.remove(); document.removeEventListener('keydown', esc); if (onClose) try { onClose(); } catch (e) {} };
  const esc = e => { if (e.key === 'Escape' && !locked && $$('.overlay').pop() === ov) { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', esc);
  if (!locked) {
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    $('[data-x]', ov).onclick = close;
  }
  $$('[data-close]', ov).forEach(b => b.onclick = close);
  const m = { el: ov, close };
  if (onMount) onMount(m);
  const first = $('input:not([type=hidden]):not([readonly]),select,textarea', ov);
  if (first) setTimeout(() => first.focus(), 60);
  return m;
}
function confirmBox(msg, okLabel = 'Confirmar', danger) {
  return new Promise(res => {
    modal({
      title: 'Confirmação', body: `<p style="margin:0;line-height:1.6">${msg}</p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${okLabel}</button>`,
      onClose: () => res(false),
      onMount: m => { $('[data-ok]', m.el).onclick = () => { res(true); m.close(); }; }
    });
  });
}

/* ---------------- gravação otimista ---------------- */
const OTIMISTA = { saveRow: 1, abrirVaga: 1, setVagaInfo: 1, alocar: 1, desligar: 1, marcarDesligadoContr: 1, saveContratacao: 1, preencherVaga: 1 };
const PEND_MS = 150000; // mantém a alteração na tela até a publicação no Firebase chegar
const PEND = [];
const LOTE_PEND = { desligarLote: 1, setVagaInfoLote: 1, contrBulkSet: 1 };
const MUDA_LINHAS = { setPadrao: 1, addPosicao: 1, removerPosicao: 1, addContratacao: 1, movimentar: 1 }; // ações que mudam a numeração das linhas
const ESCRITA = Object.assign({ setVagaInfoLote: 1, saveUser: 1, deleteUser: 1, saveConfig: 1, saveProfile: 1, saveUserFoto: 1, saveFotoColab: 1, setLiderSetor: 1, saveSelecao: 1, deleteSelecao: 1, setSelecoesAcesso: 1, criarLoja: 1, criarQuadroAdm: 1 }, MUDA_LINHAS); // gravações que não passam pela fila otimista
let filaEnvio = Promise.resolve(), pendentesEnvio = 0, pubT = null;
function reaplicarPend_() {
  const agora = Date.now();
  for (let i = PEND.length - 1; i >= 0; i--) if (PEND[i].ate && PEND[i].ate < agora) PEND.splice(i, 1);
  const fops = FB_OK && !DEMO && S.data ? filaOverlay_(S.data.ultimaOp).filter(o => LOCAL[o.action]) : [];
  if (!S.data || (!PEND.length && !fops.length)) return;
  try { derive(); } catch (e) { return; }
  fops.forEach(op => {
    try {
      const p = op.payload || {};
      if (p.expect && p.row != null && p.loja) { const r = findRow(p.loja, p.row); if (!r || norm(r.nome) !== norm(p.expect.nome) || norm(r.funcao) !== norm(p.expect.funcao)) return; }
      LOCAL[op.action](p, filaJ_(op));
      if (MUDA_LINHAS[op.action]) derive();
    } catch (e) { console.warn('fila overlay', e); }
  });
  PEND.forEach(op => {
    try {
      let p = op.payload;
      if (p.expect && p.row != null && p.loja) { const r = findRow(p.loja, p.row); if (!r || norm(r.nome) !== norm(p.expect.nome) || norm(r.funcao) !== norm(p.expect.funcao)) return; }
      if (op.action === 'marcarDesligadoContr') p = Object.assign({}, p, { rows: (p.rows || []).filter(x => { const c = (S.data.contratacoes.rows || []).find(y => y.row === x.row); return c && (!S.ck.status || c[S.ck.status] !== 'Desligado'); }) });
      LOCAL[op.action](p, op.j || {});
    } catch (e) { console.warn('reaplicar', e); }
  });
}
function refazerTela_() {
  if (liveOn) { applyLive(); return; }
  loadAll(false, true);
}
function otimista_(action, payload) {
  const op = { action, payload, j: {}, ate: 0 };
  PEND.push(op);
  try { LOCAL[action](payload, {}); derive(); updateShell(); route(true); } catch (e) { console.warn('local', e); }
  pendentesEnvio++; syncPend_();
  filaEnvio = filaEnvio.then(async () => {
    busy(true);
    try {
      const j = await send_(action, payload);
      if (j.auth === false) { logout(true); throw new Error(j.error || 'Sessão expirada'); }
      if (!j.ok) throw new Error(j.error || 'Erro desconhecido');
      op.j = j; op.ate = Date.now() + PEND_MS;
      if (j.pendente) { const i = PEND.indexOf(op); if (i >= 0) PEND.splice(i, 1); refazerTela_(); toast('Enviado para aprovação do administrador.'); }
      if (j.publicar) publicarBg_();
    } catch (e) {
      const i = PEND.indexOf(op); if (i >= 0) PEND.splice(i, 1);
      toast('Não foi possível salvar (' + (e.message || e) + '). A alteração foi desfeita na tela.', true);
      refazerTela_();
    } finally { busy(false); pendentesEnvio--; syncPend_(); }
  });
  return Promise.resolve({ ok: true, otimista: true });
}
function syncPend_() { try { document.body.classList.toggle('salvando', pendentesEnvio > 0); } catch (e) {} }
// pede ao servidor para publicar no Firebase sem fazer o usuário esperar
function publicarBg_() {
  clearTimeout(pubT);
  pubT = setTimeout(() => { filaEnvio.then(() => send_('publicar', {}).catch(() => {})); }, 800);
}
window.addEventListener('beforeunload', e => { if (pendentesEnvio > 0) { e.preventDefault(); e.returnValue = 'Ainda há alterações sendo salvas.'; return e.returnValue; } });
// se a sessão do servidor venceu, entra de novo sozinho com o acesso lembrado neste aparelho
async function send_(action, payload) {
  let j = await sendRaw_(action, payload);
  if (j && j.auth === false && action !== 'login' && action !== 'logout' && !DEMO && await reautenticar_()) j = await sendRaw_(action, payload);
  return j;
}
async function sendRaw_(action, payload) {
  if (DEMO) return window.GRC_MOCK.call(action, payload);
  if (!API_OK) throw new Error('Sistema ainda não conectado: configure a URL do Apps Script no arquivo config.js.');
  if (S.loginP && action !== 'login') { try { await S.loginP; } catch (e) {} }
  let uid = '';
  if (FB_OK && (action === 'login' || action === 'cadastroConvite' || action === 'me' || action === 'bootstrap' || action === 'logout')) { try { uid = await Promise.race([fbUid_(), new Promise(r => setTimeout(() => r(''), 5000))]); } catch (e) {} }
  const body = JSON.stringify(Object.assign({ action, token: S.token, uid, rid: Date.now().toString(36) + Math.random().toString(36).slice(2, 10) }, payload));
  for (let tent = 1; ; tent++) {
    let txt = '', j;
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 75000);
    try { const r = await fetch(CFG.API_URL, { method: 'POST', body, signal: ac.signal }); txt = await r.text(); j = JSON.parse(txt); } catch (e) { j = null; } finally { clearTimeout(to); }
    if (j && !(j.app && j.versao && !('error' in j) && Object.keys(j).length <= 3)) return j;
    if (tent >= 5) throw new Error('O servidor do Google não respondeu corretamente. Tente novamente em instantes.');
    await new Promise(res => setTimeout(res, 700 * tent));
  }
}

/* ---------------- API ---------------- */
async function api(action, payload = {}, opt = {}) {
  const gated = !!(S.user && ((GATED[action] && S.user.perfil === 'RECRUTADOR' && (GATED[action] === 1 || (S.cfg && S.cfg.aprovarEtapas))) || (GATED_EDITOR[action] && S.user.perfil === 'EDITOR')));
  if (gated) payload = Object.assign({ resumo: describe(action, payload) }, payload);
  // gravação instantânea pela fila do Firebase (a planilha é atualizada em segundo plano)
  if (!opt.sync && S.data && filaPronta_() && (FILA_ASYNC[action] || FILA_SYNC[action])) {
    if (action === 'saveSelecao' && payload.data && !payload.data.id && !payload.data.novoId) payload = Object.assign({}, payload, { data: Object.assign({}, payload.data, { novoId: 's' + Date.now() }) });
    if (action === 'mobSave' && payload.data && !payload.data.id && !payload.data.novoId) payload = Object.assign({}, payload, { data: Object.assign({}, payload.data, { novoId: 'm' + Date.now() + Math.floor(Math.random() * 1000) }) });
    const instant = FILA_ASYNC[action] && !(action === 'mobSave' && !(+(payload.data || {}).km > 0 && S.mob && S.mob.cfg));
    if (instant) {
      const { salvo } = filaEnviar_(action, payload, false, gated);
      if (!gated && LOCAL[action]) { try { LOCAL[action](payload, filaJ_({ action, payload })); derive(); updateShell(); route(true); } catch (e) { console.warn('local', e); } }
      const resp = filaResposta_(action, payload, gated);
      salvo.catch(e => { console.warn('fila', e); filaOff = true; legacyEnviar_(action, payload); });
      if (gated) { toast('Enviado para aprovação do administrador. Você será notificado da decisão.'); S.muteUntil = Date.now() + 2500; }
      return resp;
    }
    if (FILA_SYNC[action] && !(action === 'cruzarContr' && payload.simular)) {
      if (!opt.silent) busy(true);
      let enfileirou = true, j = null;
      try {
        const env = filaEnviar_(action, payload, true, gated);
        try { await env.salvo; } catch (e) { enfileirou = false; filaOff = true; console.warn('fila', e); }
        if (enfileirou) j = await filaAguardar_(env.id);
      } finally { if (!opt.silent) busy(false); }
      if (enfileirou) {
        if (j.pendente) { toast('Enviado para aprovação do administrador. Você será notificado da decisão.'); S.muteUntil = Date.now() + 2500; }
        else if (!liveOn && LOCAL[action] && S.data) { try { LOCAL[action](payload, j); derive(); updateShell(); route(true); } catch (e) { console.warn('local', e); } }
        if (MUDA_LINHAS[action] && !j.pendente) {
          for (let i = PEND.length - 1; i >= 0; i--) if (PEND[i].ate) PEND.splice(i, 1);
          if (!liveOn && !DEMO) { try { await loadAll(false, true, true); } catch (e) {} }
        }
        return j;
      }
    }
  }
  // gravação otimista: aplica na tela na hora e envia ao servidor em segundo plano (fila, na ordem)
  if (OTIMISTA[action] && !gated && !DEMO && LOCAL[action] && S.data && !opt.sync) return otimista_(action, payload);
  if (!opt.silent) busy(true);
  try {
    let j;
    // gravações que não são otimistas esperam a fila terminar, para o servidor receber tudo na ordem certa
    if ((ESCRITA[action] || GATED[action] || GATED_EDITOR[action]) && pendentesEnvio > 0) await filaEnvio.catch(() => {});
    j = await send_(action, payload);
    if (j.auth === false) { logout(true); throw new Error(j.error || 'Sessão expirada'); }
    if (!j.ok) throw new Error(j.error || 'Erro desconhecido');
    if (action === 'changePassword' && payload.nova) { const c = ls.get(CRED_K, null); if (c) credSalvar_(c.login, payload.nova); lembrarLer_().then(r => { if (r) lembrarSalvar_(r.login, payload.nova); }); }
    if (action === 'listSelecoes' && j.selecoes) j.selecoes = overlaySel_(j.selecoes);
    if (action === 'mobList' && j.simulacoes) j.simulacoes = overlayMob_(j.simulacoes);
    if (action === 'listFotosColab') overlayFotos_(j);
    if (j.pendente) { toast('Enviado para aprovação do administrador. Você será notificado da decisão.'); S.muteUntil = Date.now() + 2500; }
    else if (LOCAL[action] && S.data) { try { LOCAL[action](payload, j); derive(); updateShell(); route(true); if (OTIMISTA[action] || LOTE_PEND[action]) PEND.push({ action, payload, j, ate: Date.now() + PEND_MS }); } catch (e) { console.warn('local', e); } }
    if (MUDA_LINHAS[action] && !j.pendente) {
      for (let i = PEND.length - 1; i >= 0; i--) if (PEND[i].ate) PEND.splice(i, 1);
      // a numeração das linhas mudou: recarrega direto da planilha antes de permitir novas edições
      if (!DEMO) { try { await loadAll(false, true, true); } catch (e) {} }
    }
    if (j.publicar) publicarBg_();
    return j;
  } finally { if (!opt.silent) busy(false); }
}
async function run(btn, fn) {
  if (btn) { btn.disabled = true; btn.dataset.lbl = btn.innerHTML; btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span>'; }
  try { return await fn(); }
  catch (e) { toast(e.message, true); throw e; }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = btn.dataset.lbl; } }
}

/* ---------------- permissions ---------------- */
const isAdmin = () => S.user && S.user.perfil === 'ADMIN';
const canEdit = k => S.user && (S.user.perfil === 'ADMIN' || ((S.user.perfil === 'EDITOR' || S.user.perfil === 'RECRUTADOR') && (!k || S.user.lojas.includes(k))));
const isRecrut = () => S.user && S.user.perfil === 'RECRUTADOR';
const isGestor = () => S.user && S.user.perfil === 'LEITOR';
const isDP = () => S.user && S.user.perfil === 'DP';
// DP: quadro só leitura; contratações/admissões com edição nas lojas liberadas
const canContr = k => canEdit(k) || (isDP() && (!k || S.user.lojas.includes(k)));
const cfgv = (k, d) => (S.cfg && S.cfg[k]) || d;
function brandHTML(dark) { const lg = cfgv('logo', ''); return lg ? `<div class="brand-img ${dark ? 'on-dark' : ''}"><img src="${h(lg)}" alt="logo"></div>` : '<div class="brand-logo">GRC</div>'; }
function applyFavicon() { try { applyAppIcon(); } catch (e) {} }

/* =====================================================================
 * BOOT / LOGIN
 * ===================================================================== */
function init() {
  S.token = DEMO ? 'demo' : ls.get('grc_token', null);
  S.collapsed = ls.get('grc_sb', false);
  S.f = ls.get('grc_filters', {});
  S.view = ls.get('grc_views', {});
  S.cfg = ls.get('grc_cfg', null);
  applyFavicon();
  if (S.token) {
    const cache = DEMO ? null : ls.get('grc_data', null);
    if (cache && cache.data && cache.data.user) {
      // abre na hora com os últimos dados salvos no aparelho e atualiza em segundo plano
      try {
        S.data = cache.data; S.user = cache.data.user; S.fromCache = true;
        if (S.cfg && S.data.cfg && S.data.cfg.logoSame) S.data.cfg.logo = S.cfg.logo;
        derive(); renderShell(); route(); syncBadge(true);
        loadAll(false, true);
      } catch (e) { console.warn('cache', e); S.data = null; loadAll(true); }
    } else loadAll(true);
  } else if (QS.get('convite') && !DEMO) {
    renderConvite(QS.get('convite')); refreshPublicCfg();
  } else {
    renderLogin(); refreshPublicCfg();
    // acesso lembrado neste aparelho: entra sozinho, sem digitar
    lembrarLer_().then(c => { const f = $('#loginForm'); if (!c || !f || S.user) return; f.login.value = c.login; f.senha.value = c.senha; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); });
  }
  window.addEventListener('hashchange', () => { if (S.data) route(); });
}

async function refreshPublicCfg() {
  try {
    const j = await api('publicConfig', { logoHash: cfgv('logoHash', '') }, { silent: true });
    if (j.logoSame) j.logo = cfgv('logo', '');
    const changed = JSON.stringify([j.logo, j.empresa, j.sistema]) !== JSON.stringify([cfgv('logo'), cfgv('empresa'), cfgv('sistema')]);
    S.cfg = Object.assign({}, S.cfg || {}, { logo: j.logo, logoHash: j.logoHash, empresa: j.empresa, sistema: j.sistema, siteUrl: j.siteUrl });
    ls.set('grc_cfg', S.cfg); applyFavicon();
    if (changed && !S.user && $('#loginForm') && !$('#loginForm input[name=login]').value) renderLogin();
  } catch (e) {}
}
function renderLogin(msg) {
  $('#root').innerHTML = `
  <div class="login-wrap">
    <section class="login-hero">
      <div class="grid-bg"></div><div class="orb"></div>
      <div class="brand" style="position:relative;color:#fff">${brandHTML(true)}<div>${h(cfgv('empresa', CFG.EMPRESA || 'Grupo R Center'))}<small>Recursos Humanos</small></div></div>
      <div style="position:relative">
        <h1>Quadro de lojas,<br><span>vagas e seleção</span><br>num só lugar.</h1>
        <p>Acompanhe o quadro ideal × atual de cada loja, abra e feche vagas, controle aprendizes, PCD e contratos de experiência — tudo sincronizado com a planilha oficial.</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${todasLojas().length} lojas</b><span>${todasLojas().map(k => h(LOJA_NOMES[k])).join(' · ')}</span></div>
        <div class="hero-stat"><b>Tempo real</b><span>Salva na hora · cópia automática na planilha</span></div>
      </div>
    </section>
    <section class="login-box">
      <form class="login-card" id="loginForm" autocomplete="on">
        <div class="brand mobile-only">${brandHTML()}<div>${h(cfgv('sistema', CFG.SISTEMA || 'Quadro de Lojas'))}<small>${h(cfgv('empresa', CFG.EMPRESA || ''))}</small></div></div>
        <h2>Bem-vindo de volta</h2>
        <p class="muted" style="margin:0 0 26px">Entre com seu login para acessar o painel.</p>
        ${!API_OK && !DEMO ? `<div class="badge b-warn" style="display:flex;white-space:normal;line-height:1.5;padding:10px 12px;margin-bottom:16px">${ic('alert')} O sistema ainda não está conectado à planilha. Configure a URL do Apps Script em <b>config.js</b>.</div>` : ''}
        ${msg ? `<div class="badge b-bad" style="display:flex;padding:10px 12px;margin-bottom:16px;white-space:normal">${h(msg)}</div>` : ''}
        <div class="field"><label>Login</label><div class="input-icon">${ic('users')}<input class="input" name="login" autocomplete="username" required placeholder="seu.login"></div></div>
        <div class="field"><label>Senha</label><div class="input-icon">${ic('key')}<input class="input" type="password" name="senha" autocomplete="current-password" required placeholder="••••••••"></div></div>
        <div id="loginErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div>
        <button class="btn primary block" type="submit">Entrar ${ic('logout')}</button>
        ${!API_OK || DEMO ? `<a class="btn ghost block" style="margin-top:10px" href="?demo">${ic('eye')} Ver demonstração com dados fictícios</a>` : ''}
        <p class="faint" style="font-size:12px;margin-top:26px;text-align:center">Esqueceu a senha? <a href="#" id="forgot" style="color:var(--accent);font-weight:600">Receber nova senha por e-mail</a></p>
      </form>
    </section>
  </div>`;
  if (FB_OK) fbUid_().catch(() => {}); // já conecta ao Firebase enquanto a pessoa digita
  $('#forgot').onclick = e => { e.preventDefault(); forgotPassword($('#loginForm input[name=login]').value); };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = $('button[type=submit]', e.target);
    const err = $('#loginErr');
    err.classList.add('hidden');
    btn.disabled = true;
    try {
      if (!DEMO && await entrarInstantaneo_(fd.get('login'), fd.get('senha'))) return;
      const j = await api('login', { login: fd.get('login'), senha: fd.get('senha') });
      S.token = j.token; if (!DEMO) { ls.set('grc_token', j.token); if (j.keys) ls.set('grc_keys', j.keys); credSalvar_(fd.get('login'), fd.get('senha')); lembrarSalvar_(fd.get('login'), fd.get('senha')); ls.del('grc_last_data'); ls.del('grc_last_keys'); } if (j.user) S.user = j.user;
      await loadAll();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    finally { btn.disabled = false; }
  };
}

/* ---------------- link de convite: o líder cria o próprio acesso ---------------- */
function semConviteNaUrl_() { try { const u = new URL(location.href); u.searchParams.delete('convite'); history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || '')); } catch (e) {} }
async function renderConvite(codigo) {
  $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Abrindo convite…</div></div></div>`;
  let info = null, erro = '';
  try { const j = await sendRaw_('conviteInfo', { codigo }); if (j && j.ok) info = j.convite; else erro = (j && j.error) || 'Link de convite inválido.'; } catch (e) { erro = e.message; }
  const setTxt = info && info.setores && info.setores.length ? info.setores.join(' · ') : 'Todos os setores';
  $('#root').innerHTML = `
  <div class="login-wrap">
    <section class="login-hero">
      <div class="grid-bg"></div><div class="orb"></div>
      <div class="brand" style="position:relative;color:#fff">${brandHTML(true)}<div>${h(cfgv('empresa', CFG.EMPRESA || 'Grupo R Center'))}<small>Recursos Humanos</small></div></div>
      <div style="position:relative"><h1>Seu acesso ao<br><span>quadro da sua equipe</span></h1><p>Acompanhe o quadro do seu setor, as vagas em aberto e faça requisições de vaga para o RH.</p></div>
    </section>
    <section class="login-box">
      <form class="login-card" id="cvForm" autocomplete="on">
        <div class="brand mobile-only">${brandHTML()}<div>${h(cfgv('sistema', CFG.SISTEMA || 'Quadro de Lojas'))}<small>${h(cfgv('empresa', CFG.EMPRESA || ''))}</small></div></div>
        ${info ? `<h2>Criar meu acesso</h2>
        <div class="card" style="background:var(--surface2);padding:12px 14px;margin:6px 0 18px"><div class="muted" style="font-size:12px">Convite para</div><b>${h(info.lojaNome)}</b><div style="font-size:13px">${h(setTxt)}</div></div>
        <div class="field"><label>Nome completo</label><input class="input" name="nome" required autocomplete="name" placeholder="Seu nome"></div>
        <div class="field"><label>Cargo</label><input class="input" name="cargo" placeholder="Ex.: Líder de Frente de Loja"></div>
        <div class="field"><label>E-mail (opcional, para recuperar a senha)</label><input class="input" name="email" type="email" autocomplete="email" placeholder="nome@email.com"></div>
        <div class="field"><label>Login</label><input class="input" name="login" required autocomplete="username" placeholder="nome.sobrenome"></div>
        <div class="row2"><div class="field"><label>Senha</label><input class="input" name="senha" type="password" required autocomplete="new-password" placeholder="mín. 6 caracteres"></div><div class="field"><label>Repetir senha</label><input class="input" name="senha2" type="password" required autocomplete="new-password"></div></div>
        <div id="cvErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div>
        <button class="btn primary block" type="submit">Criar acesso e entrar</button>` : `<h2>Convite indisponível</h2><div class="badge b-bad" style="display:flex;padding:10px 12px;margin:10px 0 16px;white-space:normal">${h(erro)}</div><p class="muted">Peça um novo link ao RH.</p>`}
        <p class="faint" style="font-size:12px;margin-top:22px;text-align:center">Já tem acesso? <a href="#" id="cvLogin" style="color:var(--accent);font-weight:600">Entrar</a></p>
      </form>
    </section>
  </div>`;
  $('#cvLogin').onclick = e => { e.preventDefault(); semConviteNaUrl_(); renderLogin(); };
  const f = $('#cvForm'); if (!info) return;
  f.nome.addEventListener('input', () => { if (f.login.dataset.touched) return; const p = norm(f.nome.value).toLowerCase().split(/\s+/).filter(Boolean); f.login.value = p.length > 1 ? p[0] + '.' + p[p.length - 1] : (p[0] || ''); });
  f.login.addEventListener('input', () => { f.login.dataset.touched = 1; });
  f.onsubmit = async e => {
    e.preventDefault();
    const err = $('#cvErr'), btn = $('button[type=submit]', f); err.classList.add('hidden');
    const d = { nome: f.nome.value.trim(), cargo: f.cargo.value.trim(), email: f.email.value.trim(), login: f.login.value.trim().toLowerCase(), senha: f.senha.value };
    if (d.senha !== f.senha2.value) { err.textContent = 'As senhas não conferem.'; err.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'Criando acesso…';
    try {
      const j = await sendRaw_('cadastroConvite', { codigo, data: d });
      if (!j || !j.ok) throw new Error((j && j.error) || 'Não foi possível criar o acesso.');
      S.token = j.token; ls.set('grc_token', j.token); if (j.keys) ls.set('grc_keys', j.keys); if (j.user) S.user = j.user;
      credSalvar_(d.login, d.senha); lembrarSalvar_(d.login, d.senha); ls.del('grc_last_data'); ls.del('grc_last_keys');
      semConviteNaUrl_(); location.hash = '#/inicio';
      await loadAll(true);
      toast('Acesso criado! Bem-vindo(a), ' + d.nome.split(' ')[0] + '.');
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Criar acesso e entrar'; }
  };
}
// administrador: gera e gerencia os links de convite
function conviteUrl_(c) { const base = cfgv('siteUrl', '') || (location.origin + location.pathname); return base.replace(/\/+$/, '') + '/?convite=' + c; }
function compartilharConvite_(c, lojaNome, setores) {
  const url = conviteUrl_(c), txt = `Olá! Segue o link para você criar seu acesso ao Quadro de Lojas (${lojaNome}${setores && setores.length ? ' · ' + setores.join(', ') : ''}): ${url}`;
  if (navigator.share) { navigator.share({ title: 'Acesso ao Quadro de Lojas', text: txt }).catch(() => {}); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
function copiarTexto_(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Link copiado'), () => { prompt('Copie o link:', t); }); }
async function openConvites() {
  const L = S.data.lojas;
  let lista = [];
  modal({
    title: 'Links de convite', icon: 'link', wide: true,
    body: `<p class="muted" style="margin-top:0">Gere um link e mande para o líder (WhatsApp, e-mail…). Ao abrir, ele mesmo cria o login e a senha e já entra vendo <b>só o quadro da loja e dos setores escolhidos</b>, com a opção de requisitar vagas.</p>
      <div class="card" style="background:var(--surface2);padding:14px">
        <div class="field"><label>Lojas <span class="muted">(marque várias para coordenadores que atendem mais de uma loja)</span></label><div id="cvL">${chipPicker('cvlojas', L.map(l => l.key), L[0] ? L[0].key : '')}</div></div>
        <div class="field"><label>Título (opcional)</label><input class="input" id="cvT" placeholder="Ex.: Coordenadora de Frente de Loja"></div>
        <div class="field"><label>Setores que o líder vai ver <span class="muted">(nenhum marcado = todos)</span></label><div id="cvS"></div></div>
        <div class="row2"><div class="field"><label>Validade do link</label><select class="input" id="cvD"><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option></select></div>
        <div class="field"><label>Quantas pessoas podem usar</label><select class="input" id="cvM"><option value="1">1 pessoa</option><option value="0" selected>Sem limite</option><option value="5">até 5</option><option value="10">até 10</option></select></div></div>
        <button class="btn primary" id="cvNew">${ic('plus')} Gerar link</button>
      </div>
      <div id="cvRes"></div>
      ${isAdmin() ? `<div class="card mt" style="padding:14px"><b>${ic('shield')} Quem também pode gerar links</b><p class="muted" style="margin:4px 0 10px;font-size:12.5px">Libere para pessoas que não são administradoras. Elas veem a opção <b>Links de convite</b> no menu e só convidam para as lojas e setores do próprio acesso.</p><div id="cvAc"><div class="sk" style="height:40px"></div></div><button class="btn sm primary mt" id="cvAcOk">Salvar quem pode gerar links</button></div>` : ''}
      <h3 style="margin:18px 0 8px;font-size:14px">${isAdmin() ? 'Links criados' : 'Links criados por você'}</h3><div id="cvList"><div class="sk" style="height:80px"></div></div>`,
    foot: `<button class="btn" data-close>Fechar</button>`,
    onMount: m => {
      const lojasSel = () => splitMulti(pickVal($('#cvL', m.el), 'cvlojas'));
      bindPickers($('#cvL', m.el));
      $$('#cvL .chip', m.el).forEach(c => c.textContent = LOJA_NOMES[c.dataset.v] || (L.find(l => l.key === c.dataset.v) || {}).nome || c.dataset.v);
      const drawSet = () => {
        const marcados = splitMulti(pickVal($('#cvS', m.el), 'cvset'));
        const nomes = uniq(L.filter(l => lojasSel().includes(l.key)).flatMap(l => (l.setores || []).map(s => s.nome)));
        $('#cvS', m.el).innerHTML = nomes.length ? chipPicker('cvset', nomes, marcados.filter(x => nomes.includes(x)).join(', ')) : '<span class="muted" style="font-size:12.5px">Escolha ao menos uma loja.</span>';
        bindPickers($('#cvS', m.el));
      };
      $('#cvL', m.el).addEventListener('click', e => { if (e.target.closest('.chip')) setTimeout(drawSet, 0); });
      drawSet();
      const nomeL = k => String(k || '').split(',').filter(Boolean).map(x => (L.find(l => l.key === x) || {}).nome || LOJA_NOMES[x] || x).join(', ');
      const drawList = () => {
        const el = $('#cvList', m.el); if (!el) return;
        el.innerHTML = lista.length ? `<div class="alist" style="max-height:none">${lista.map(c => `<div class="aitem" style="align-items:center"><div style="flex:1;min-width:0"><b>${h(c.titulo || nomeL(c.loja))}</b><span style="display:block">${h(nomeL(c.loja))} · ${h(c.setores.length ? c.setores.join(', ') : 'todos os setores')}</span><span class="faint" style="display:block;font-size:11.5px">${c.usos} uso(s)${c.maxUsos ? ' de ' + c.maxUsos : ''} · válido até ${h(isoToBR(c.validade))} · por ${h(c.criadoPor)}</span></div>${c.ativo ? `<button class="btn sm" data-cp="${c.codigo}" title="Copiar link">${ic('copy')}</button><button class="btn sm primary" data-sh="${c.codigo}">${ic('share')} Enviar</button><button class="btn sm danger ghost" data-off="${c.codigo}" title="Desativar">${ic('x')}</button>` : '<span class="badge">desativado</span>'}</div>`).join('')}</div>` : '<div class="muted" style="font-size:13px">Nenhum link criado ainda.</div>';
        $$('[data-cp]', el).forEach(b => b.onclick = () => copiarTexto_(conviteUrl_(b.dataset.cp)));
        $$('[data-sh]', el).forEach(b => b.onclick = () => { const c = lista.find(x => x.codigo === b.dataset.sh); compartilharConvite_(c.codigo, nomeL(c.loja), c.setores); });
        $$('[data-off]', el).forEach(b => b.onclick = async () => { if (!await confirmBox('Desativar este link? Quem já criou o acesso continua entrando normalmente.', 'Desativar', true)) return; try { lista = (await api('desativarConvite', { codigo: b.dataset.off })).convites; drawList(); toast('Link desativado'); } catch (e) { toast(e.message, true); } });
      };
      $('#cvNew', m.el).onclick = e => run(e.currentTarget, async () => {
        const lojas = lojasSel(), setores = splitMulti(pickVal($('#cvS', m.el), 'cvset'));
        if (!lojas.length) throw new Error('Escolha ao menos uma loja.');
        const j = await api('criarConvite', { data: { loja: lojas[0], lojas, setores, titulo: $('#cvT', m.el).value.trim(), dias: +$('#cvD', m.el).value, maxUsos: +$('#cvM', m.el).value } });
        lista = j.convites || []; drawList();
        const c = lista[0]; if (!c) return;
        const url = conviteUrl_(c.codigo);
        $('#cvRes', m.el).innerHTML = `<div class="card mt" style="border-color:var(--accent)"><b>${ic('check')} Link pronto</b><div class="mono" style="font-size:12.5px;word-break:break-all;margin:8px 0">${h(url)}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="cvShare">${ic('share')} Enviar pelo WhatsApp</button><button class="btn" id="cvCopy">${ic('copy')} Copiar link</button></div></div>`;
        $('#cvShare', m.el).onclick = () => compartilharConvite_(c.codigo, nomeL(c.loja), c.setores);
        $('#cvCopy', m.el).onclick = () => copiarTexto_(url);
      });
      if (isAdmin()) (async () => {
        const el = $('#cvAc', m.el);
        try {
          const us = (usersCache_() || await usersBuscar_()).filter(u => u.perfil !== 'ADMIN' && u.ativo);
          const ids = (await api('convitesAcesso', {}, { silent: true })).ids || [];
          if (!$('#cvAc', m.el)) return;
          el.innerHTML = us.length ? chipPicker('cvac', us.map(u => u.id), ids.join(', ')) : '<span class="muted" style="font-size:12.5px">Nenhum usuário sem perfil de administrador.</span>';
          bindPickers(el);
          $$('[data-picker=cvac] .chip', el).forEach(c => { const u = us.find(x => x.id === c.dataset.v); c.textContent = u ? u.nome + (u.cargo ? ' · ' + u.cargo : '') : c.dataset.v; });
        } catch (e) { el.innerHTML = `<span class="muted">${h(e.message)}</span>`; }
        $('#cvAcOk', m.el).onclick = ev => run(ev.currentTarget, async () => { await api('setConvitesAcesso', { ids: splitMulti(pickVal(el, 'cvac')) }); toast('Permissões salvas. A pessoa vê a opção ao entrar de novo ou atualizar.'); });
      })();
      api('listConvites', {}, { silent: true }).then(j => { lista = j.convites || []; drawList(); }).catch(e => { const el = $('#cvList', m.el); if (el) el.innerHTML = `<div class="muted">${h(e.message)}</div>`; });
    }
  });
}

/* ---------------- login instantâneo neste aparelho ----------------
 * Depois do primeiro login, o aparelho guarda só um resumo criptografado (PBKDF2) da senha e os
 * últimos dados. No próximo login, se a senha confere, o painel abre na hora e o servidor confirma
 * em segundo plano; se o servidor recusar (senha trocada/usuário bloqueado), a pessoa é desconectada. */
const CRED_K = 'grc_cred';
const loginNorm_ = v => String(v || '').trim().toLowerCase();
async function credHash_(login, senha, salt) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
  const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt + '|' + login), iterations: 60000, hash: 'SHA-256' }, k, 256);
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function credSalvar_(login, senha) {
  try { if (!window.crypto || !crypto.subtle) return; const l = loginNorm_(login), salt = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set(CRED_K, { login: l, salt, hash: await credHash_(l, senha, salt) }); } catch (e) {}
}
async function entrarInstantaneo_(login, senha) {
  try {
    const c = ls.get(CRED_K, null);
    if (!c || !window.crypto || !crypto.subtle || c.login !== loginNorm_(login)) return false;
    const last = ls.get('grc_last_data', null), keys = ls.get('grc_last_keys', null);
    if (!last || !last.data || !last.data.user || !keys || !keys.G || (last.data.user.login && loginNorm_(last.data.user.login) !== c.login)) return false;
    if ((await credHash_(c.login, senha, c.salt)) !== c.hash) return false;
    S.data = last.data; S.user = last.data.user; S.fromCache = true;
    if (S.cfg && S.data.cfg && S.data.cfg.logoSame) S.data.cfg.logo = S.cfg.logo;
    try { localStorage.setItem('grc_data', JSON.stringify(last)); } catch (e) {}
    ls.set('grc_keys', keys);
    derive(); renderShell(); route(); syncBadge(true);
    if (FB_OK) startLive(keys).then(ok => { if (ok && !S.loginP) syncBadge(false); }).catch(() => {});
    // confirma com o servidor em segundo plano (as gravações esperam esta confirmação)
    const p = S.loginP = send_('login', { login, senha }).then(j => {
      if (S.loginP === p) S.loginP = null;
      if (!j || !j.ok) { ls.del(CRED_K); ls.del(LEMB_K); logout(true, (j && j.error) || 'Não foi possível confirmar seu acesso. Entre novamente.'); return; }
      S.token = j.token; ls.set('grc_token', j.token); lembrarSalvar_(login, senha); if (j.keys) ls.set('grc_keys', j.keys); if (j.user) { S.user = j.user; if (S.data) S.data.user = j.user; }
      loadAll(false, true);
    }).catch(e => { if (S.loginP === p) S.loginP = null; syncBadge(false); toast('Sem conexão com o servidor: ' + (e.message || e), true); });
    return true;
  } catch (e) { console.warn('login rápido', e); return false; }
}

/* ---------------- manter conectado (principalmente no app do celular) ----------------
 * O login e a senha ficam guardados criptografados (AES-GCM) com uma chave que não sai do aparelho
 * (IndexedDB, não exportável). Só são apagados quando a pessoa clica em Sair ou a senha deixa de valer. */
const LEMB_K = 'grc_lembrar';
let lembKeyP = null, reauthP = null;
function lembChave_() {
  if (!lembKeyP) lembKeyP = new Promise((res, rej) => {
    if (!window.indexedDB || !window.crypto || !crypto.subtle) return rej(new Error('sem suporte'));
    const rq = indexedDB.open('grc_sec', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('k');
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const db = rq.result, g = db.transaction('k').objectStore('k').get('lembrar');
      g.onerror = () => rej(g.error);
      g.onsuccess = async () => {
        if (g.result) return res(g.result);
        try {
          const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
          const t = db.transaction('k', 'readwrite'); t.objectStore('k').put(k, 'lembrar');
          t.oncomplete = () => res(k); t.onerror = () => rej(t.error);
        } catch (e) { rej(e); }
      };
    };
  }).catch(e => { lembKeyP = null; throw e; });
  return lembKeyP;
}
const b64_ = u8 => btoa(String.fromCharCode(...u8)), unb64_ = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function lembrarSalvar_(login, senha) {
  if (DEMO) return;
  try {
    const k = await lembChave_(), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify({ login: String(login).trim(), senha: String(senha) })));
    ls.set(LEMB_K, { iv: b64_(iv), ct: b64_(new Uint8Array(ct)) });
  } catch (e) {}
}
async function lembrarLer_() {
  try {
    const x = ls.get(LEMB_K, null); if (!x || DEMO) return null;
    const k = await lembChave_();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64_(x.iv) }, k, unb64_(x.ct));
    const r = JSON.parse(new TextDecoder().decode(pt)); return r && r.login && r.senha ? r : null;
  } catch (e) { return null; }
}
function reautenticar_() {
  if (!reauthP) reauthP = (async () => {
    const c = await lembrarLer_(); if (!c) return false;
    let j; try { j = await sendRaw_('login', c); } catch (e) { return false; }
    if (!j || !j.ok || !j.token) { if (j && j.ok === false) { ls.del(LEMB_K); ls.del(CRED_K); } return false; }
    S.token = j.token; ls.set('grc_token', j.token); if (j.keys) ls.set('grc_keys', j.keys);
    if (j.user) { S.user = j.user; if (S.data) S.data.user = j.user; }
    return true;
  })().finally(() => { setTimeout(() => { reauthP = null; }, 0); });
  return reauthP;
}

async function logout(expired, msg) {
  if (!expired && pendentesEnvio > 0) { toast('Aguardando terminar de salvar as alterações…'); await filaEnvio.catch(() => {}); }
  if (S.token && !expired && !DEMO) api('logout').catch(() => {});
  $$('.overlay').forEach(o => o.remove());
  PEND.length = 0; S.sel = null; S.selCache = null; S.mob = null;
  try { if (window.OneSignal && window.OneSignal.logout) window.OneSignal.logout(); } catch (e) {}
  try { fbStop(); } catch (e) {} try { filaStop_(); } catch (e) {} liveBooted = false;
  if (!DEMO && ls.get(CRED_K, null)) { try { const d = localStorage.getItem('grc_data'), k = localStorage.getItem('grc_keys'); if (d && k) { localStorage.setItem('grc_last_data', d); localStorage.setItem('grc_last_keys', k); } } catch (e) {} }
  if (!expired) ls.del(LEMB_K);
  S.loginP = null; S.token = null; S.user = null; S.data = null; ls.del('grc_token'); ls.del('grc_data'); ls.del('grc_keys');
  if (DEMO) { location.href = location.pathname; return; }
  renderLogin(msg || (expired ? 'Sua sessão expirou. Entre novamente.' : ''));
}

function syncBadge(on) {
  let b = document.getElementById('syncBadge');
  if (!on) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'syncBadge'; b.className = 'sync-badge'; document.body.appendChild(b); }
  b.innerHTML = '<span class="spin" style="width:12px;height:12px;border-width:2px"></span> Atualizando dados…';
}
/* ---------------- Firebase (leitura rápida em tempo real) ---------------- */
const FB_OK = !DEMO && !!(window.firebase && CFG.FIREBASE);
let fbDb = null, fbUnsubs = [], fbKeysSig = '', live = {}, liveOn = false, liveBooted = false;
function fbStop() { fbUnsubs.forEach(u => { try { u(); } catch (e) {} }); fbUnsubs = []; live = {}; liveOn = false; fbKeysSig = ''; liveSel = {}; liveSelOn = false; S.selRaw = null; S.mobRaw = null; S.mobLive = false; }
let liveSel = {}, liveSelOn = false;
// recrutamento e mobilidade: lista vinda do Firebase + gravações ainda na fila
function selMobLive_(semTela) {
  if (liveSelOn) {
    S.selRaw = [].concat(...Object.values(liveSel)).sort((a, b) => String(b.data).localeCompare(String(a.data)));
    S.selCache = overlaySel_(S.selRaw);
    if (!semTela && /^#\/recrutamento/.test(location.hash) && openSelecao.after && !$('.overlay')) openSelecao.after(S.selCache);
  }
  if (S.mobLive && S.mobRaw) {
    S.mob = S.mob || {};
    S.mob.sims = overlayMob_(S.mobRaw);
    if (!semTela && /^#\/mobilidade/.test(location.hash) && openMobSim.after && !$('.overlay')) openMobSim.after(S.mob.sims);
  }
}
/* ---------------- fila de gravações (Firebase → planilha em segundo plano) ----------------
 * As gravações vão direto para a coleção "fila" do Firestore (instantâneo) e aparecem na hora
 * para todos que estão com o sistema aberto. O Apps Script aplica cada alteração na planilha
 * em segundo plano, na ordem e com as mesmas regras de antes, e publica o resultado.
 * Ninguém mais espera a planilha para continuar trabalhando. */
const FILA_ASYNC = { escalaSet: 1, addPosicao: 1, removerPosicao: 1, setPadrao: 1, movimentar: 1, saveRow: 1, abrirVaga: 1, preencherVaga: 1, setVagaInfo: 1, setVagaInfoLote: 1, alocar: 1, desligar: 1, desligarLote: 1, marcarDesligadoContr: 1, saveContratacao: 1, addContratacao: 1, contrBulkSet: 1, saveSelecao: 1, deleteSelecao: 1, mobSave: 1, mobDelete: 1, saveFotoColab: 1, setLiderSetor: 1 };
const FILA_SYNC = { decidirSolicitacao: 1, iniciarSLA: 1, criarLoja: 1, criarQuadroAdm: 1, cruzarContr: 1 };
let filaSnap = [], filaLocal = [], filaUnsub = null, filaVivo = false, filaTent = 0, filaKickT = null, filaOff = false, fbUidP = null, filaRedraw = null;
const filaEspera = {}, filaAvisados = new Set();
function fbInit_() { if (!fbDb) { firebase.initializeApp(CFG.FIREBASE); fbDb = firebase.firestore(); } return fbDb; }
function fbUid_() {
  if (!FB_OK || !firebase.auth) return Promise.resolve('');
  if (!fbUidP) fbUidP = new Promise(res => {
    fbInit_();
    const a = firebase.auth(); let ok = false;
    const fim = uid => { if (!ok) { ok = true; res(uid || ''); } };
    const un = a.onAuthStateChanged(u => {
      un();
      if (u) fim(u.uid);
      else a.signInAnonymously().then(c => fim(c.user && c.user.uid)).catch(e => { console.warn('auth', e); fim(''); });
    });
    setTimeout(() => fim(a.currentUser ? a.currentUser.uid : ''), 10000);
  }).then(uid => { if (!uid) fbUidP = null; return uid; });
  return fbUidP;
}
const filaPronta_ = () => FB_OK && !DEMO && !filaOff && filaVivo && !!(S.user && S.user.id);
function filaParse_(d) {
  const x = d.data({ serverTimestamps: 'estimate' }) || {};
  let p = {}; try { p = JSON.parse(x.payload || '{}'); } catch (e) {}
  return { id: d.id, uid: x.uid, userId: x.userId, action: x.action, payload: p, status: x.status || 'pendente', sync: !!x.sync, gated: !!x.gated, erro: x.erro || '', resultado: x.resultado || '', criadoMs: x.criado && x.criado.toMillis ? x.criado.toMillis() : (x.cliT || Date.now()) };
}
function filaTodas_() {
  const ids = new Set(filaSnap.map(o => o.id));
  const agora = Date.now();
  filaLocal = filaLocal.filter(o => !ids.has(o.id) && !o.visto && agora - o.criadoMs < 15 * 60000);
  return filaSnap.concat(filaLocal).sort((a, b) => a.criadoMs - b.criadoMs || (a.id < b.id ? -1 : 1));
}
// operações ainda não incluídas nos dados publicados (aplicadas por cima, na ordem)
function filaOverlay_(ult) {
  return filaTodas_().filter(o => o.status !== 'erro' && !o.gated && (o.status === 'pendente' || o.criadoMs > (ult || 0)));
}
function filaStop_() { if (filaUnsub) { try { filaUnsub(); } catch (e) {} } filaUnsub = null; filaVivo = false; filaSnap = []; filaLocal = []; }
async function filaStart_() {
  if (!FB_OK || DEMO || filaOff || filaUnsub || !S.user || !firebase.auth) return;
  const uid = await fbUid_(); if (!uid || filaUnsub) return;
  filaUnsub = fbInit_().collection('fila').orderBy('criado').limit(400).onSnapshot(sn => {
    filaVivo = true; filaTent = 0;
    const ids = new Set();
    filaSnap = sn.docs.map(d => { ids.add(d.id); return filaParse_(d); });
    filaLocal.forEach(o => { if (ids.has(o.id)) o.visto = true; });
    filaSnap.forEach(o => {
      const w = filaEspera[o.id];
      if (w && (o.status === 'ok' || o.status === 'aplicado')) { delete filaEspera[o.id]; let r = {}; try { r = JSON.parse(o.resultado || '{}'); } catch (e) {} w.res(Object.assign({ ok: true }, r)); }
      else if (w && o.status === 'erro') { delete filaEspera[o.id]; w.rej(new Error(o.erro || 'Erro ao salvar')); }
      else if (o.status === 'erro' && !o.sync && String(o.userId) === String(S.user && S.user.id) && o.uid === uid && !filaAvisados.has(o.id)) {
        filaAvisados.add(o.id);
        toast('Não foi possível salvar (' + (o.erro || 'erro') + '). A alteração foi desfeita na tela.', true);
      }
    });
    clearTimeout(filaRedraw);
    filaRedraw = setTimeout(() => { if (liveOn) applyLive(); selMobLive_(); }, 60);
  }, err => {
    console.warn('fila', err); filaUnsub = null; filaVivo = false;
    if (++filaTent <= 6) setTimeout(() => { meRefreshSessao_().finally(filaStart_); }, 3000 * filaTent);
  });
}
// garante que a sessão do Firebase está registrada no servidor (renova pelo "me")
function meRefreshSessao_() { return send_('me', {}).catch(() => {}); }
function filaKick_() {
  clearTimeout(filaKickT);
  filaKickT = setTimeout(() => { try { fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'processarFila' }) }).catch(() => {}); } catch (e) {} }, 300);
}
// grava a operação na fila; devolve { id, salvo } (salvo = promessa da confirmação do Firestore)
function filaEnviar_(action, payload, sync, gated) {
  const db = fbInit_();
  const ref = db.collection('fila').doc();
  const op = { id: ref.id, uid: '', userId: String(S.user.id), action, payload, status: 'pendente', sync: !!sync, gated: !!gated, criadoMs: Date.now() };
  filaLocal.push(op);
  pendentesEnvio++; syncPend_();
  const salvo = (async () => {
    const uid = await fbUid_();
    if (!uid) throw new Error('Não foi possível conectar ao Firebase.');
    op.uid = uid;
    const doc = { uid, userId: String(S.user.id), action, payload: JSON.stringify(payload), criado: firebase.firestore.FieldValue.serverTimestamp(), cliT: Date.now(), status: 'pendente', sync: !!sync, gated: !!gated };
    // sem tempo limite: se a internet cair, o Firebase guarda e envia quando voltar (evita gravar duas vezes)
    const grava = () => ref.set(doc);
    try { await grava(); }
    catch (e) {
      if (e && (e.code === 'permission-denied' || e.code === 'unauthenticated')) { await meRefreshSessao_(); await grava(); }
      else throw e;
    }
    filaKick_();
    return ref.id;
  })();
  salvo.catch(() => { filaLocal = filaLocal.filter(o => o !== op); }).finally(() => { pendentesEnvio--; syncPend_(); });
  return { id: ref.id, salvo };
}
// operações que mudam a estrutura: grava na fila e espera o servidor aplicar (mantém a ordem)
function filaAguardar_(id) {
  return new Promise((res, rej) => {
    filaEspera[id] = { res, rej };
    let n = 0;
    const tick = setInterval(() => {
      if (!filaEspera[id]) return clearInterval(tick);
      n++; filaKick_();
      if (n > 24) { clearInterval(tick); delete filaEspera[id]; rej(new Error('O servidor ainda está processando esta alteração. Ela será concluída em instantes — atualize a página em 1 minuto.')); }
    }, 10000);
  });
}
// caminho antigo (envio direto ao Apps Script), usado se o Firebase não estiver disponível
function legacyEnviar_(action, payload) {
  pendentesEnvio++; syncPend_();
  filaEnvio = filaEnvio.then(async () => {
    try {
      const j = await send_(action, payload);
      if (j.auth === false) { logout(true); throw new Error(j.error || 'Sessão expirada'); }
      if (!j.ok) throw new Error(j.error || 'Erro desconhecido');
      if (j.publicar) publicarBg_();
    } catch (e) { toast('Não foi possível salvar (' + (e.message || e) + ').', true); refazerTela_(); }
    finally { pendentesEnvio--; syncPend_(); }
  });
}
// resposta imediata (calculada no aparelho) para as gravações instantâneas
function filaResposta_(action, payload, gated) {
  if (gated) return { ok: true, pendente: true };
  if (action === 'addContratacao') return { ok: true, row: filaProxLinha_(), alocado: !!(payload.vaga && payload.vaga.row) };
  if (action === 'saveSelecao' || action === 'deleteSelecao') return { ok: true, selecoes: overlaySel_(S.selRaw || S.selCache || []) };
  if (action === 'mobSave' || action === 'mobDelete') return { ok: true, simulacoes: overlayMob_(S.mobRaw || (S.mob && S.mob.sims) || []) };
  if (action === 'setPadrao') return { ok: true, otimista: true, criadas: payload.novas && +payload.novas.qtd > 0 ? Math.min(30, +payload.novas.qtd) : 0, removidas: (payload.remover || []).length };
  if (action === 'saveFotoColab') return { ok: true, chave: chaveNome(payload.nome), foto: payload.foto || '' };
  return { ok: true, otimista: true };
}
function filaProxLinha_() { const rs = ((S.data && S.data.contratacoes && S.data.contratacoes.rows) || []).concat((S.data && S.data.contratacoes && S.data.contratacoes.excluidas) || []); const hr = (S.data && S.data.contratacoes && S.data.contratacoes.headerRow) || 1; return rs.length ? Math.max(...rs.map(r => +r.row || 0)) + 1 : hr + 1; }
function filaJ_(op) { return op.action === 'addContratacao' ? { row: filaProxLinha_(), alocado: !!(op.payload.vaga && op.payload.vaga.row) } : {}; }
// listas que não ficam no Firebase (seleções, mobilidade, fotos): aplica as gravações ainda na fila
function filaListaOps_(acts) { return filaTodas_().filter(o => acts[o.action] && o.status !== 'erro' && !o.gated); }
function selLocal_(d, list) {
  const id = String(d.id || d.novoId || '');
  const ant = (list || []).find(s => String(s.id) === id) || {};
  const agora = new Date().toLocaleString('pt-BR').replace(',', '').slice(0, 16);
  const n = v => v === '' || v == null ? '' : Math.max(0, Math.round(+v)) || 0;
  const t = v => String(v == null ? '' : v).trim();
  return Object.assign({}, ant, {
    id, loja: t(d.loja).toUpperCase(), setor: t(d.setor), funcao: t(d.funcao), vagas: n(d.vagas), data: t(d.data).slice(0, 10), horario: t(d.horario).slice(0, 5), local: t(d.local), responsavel: t(d.responsavel), origem: t(d.origem),
    chamados: n(d.chamados), confirmados: n(d.confirmados), compareceram: n(d.compareceram), aprov_lider: n(d.aprov_lider), aprov_rh: n(d.aprov_rh), admitidos: n(d.admitidos), banco_talentos: n(d.banco_talentos),
    status: SEL_STATUS.includes(d.status) ? d.status : 'Agendada', obs: t(d.obs), criado_por: ant.criado_por || S.user.nome, criado_em: ant.criado_em || agora, atualizado_por: ant.id ? S.user.nome : (ant.atualizado_por || ''), atualizado_em: ant.id ? agora : (ant.atualizado_em || '')
  });
}
function overlaySel_(list) {
  let l = (list || []).slice();
  filaListaOps_({ saveSelecao: 1, deleteSelecao: 1 }).forEach(o => {
    const p = o.payload || {};
    if (o.action === 'deleteSelecao') l = l.filter(s => String(s.id) !== String(p.id));
    else { const r = selLocal_(p.data || {}, l); const i = l.findIndex(s => String(s.id) === r.id); if (i >= 0) l[i] = r; else l.unshift(r); }
  });
  return l.sort((a, b) => String(b.data).localeCompare(String(a.data)));
}
function mobLocal_(d, list) {
  const id = String(d.id || d.novoId || '');
  const ant = (list || []).find(s => String(s.id) === id) || {};
  const agora = new Date().toLocaleString('pt-BR').replace(',', '').slice(0, 16);
  const t = v => String(v == null ? '' : v).trim();
  const km = Math.round(+d.km * 100) / 100, dias = Math.round(+d.dias), tipo = t(d.tipo).toUpperCase();
  const c = mobCalc(km, dias, tipo, S.mob && S.mob.cfg);
  return Object.assign({}, ant, {
    id, nome: t(d.nome).toUpperCase(), cargo: t(d.cargo).toUpperCase(), loja: t(d.loja).toUpperCase(), tipo, rua: t(d.rua), numero: t(d.numero), bairro: t(d.bairro), cep: t(d.cep), cidade: t(d.cidade),
    dias, km, sugerido: c ? c.valor : '', validado: d.validado === '' || d.validado == null ? '' : +d.validado, status: d.status || 'Simulação', obs: t(d.obs),
    criado_em: ant.criado_em || agora, criado_por: ant.criado_por || S.user.nome, atualizado_em: ant.id ? agora : (ant.atualizado_em || ''), atualizado_por: ant.id ? S.user.nome : (ant.atualizado_por || '')
  });
}
function overlayMob_(list) {
  let l = (list || []).slice();
  filaListaOps_({ mobSave: 1, mobDelete: 1 }).forEach(o => {
    const p = o.payload || {};
    if (o.action === 'mobDelete') l = l.filter(s => String(s.id) !== String(p.id));
    else { const r = mobLocal_(p.data || {}, l); const i = l.findIndex(s => String(s.id) === r.id); if (i >= 0) l[i] = r; else l.unshift(r); }
  });
  return l;
}
function overlayFotos_(j) {
  j.fotos = Object.assign({}, j.fotos || {}); j.lideres = Object.assign({}, j.lideres || {});
  filaListaOps_({ saveFotoColab: 1, setLiderSetor: 1 }).forEach(o => {
    const p = o.payload || {};
    if (o.action === 'saveFotoColab') { const k = chaveNome(p.nome); if (p.foto) j.fotos[k] = p.foto; else delete j.fotos[k]; }
    else { const k = p.loja + '|' + p.setor; if (p.nome) j.lideres[k] = { nome: p.nome }; else delete j.lideres[k]; }
  });
  return j;
}
function startLive(keys) {
  const sig = JSON.stringify(keys);
  if (liveOn && sig === fbKeysSig) return Promise.resolve(true);
  fbInit_();
  fbStop(); fbKeysSig = sig;
  const ids = { G: keys.G }; if (keys.X) ids.X = keys.X;
  Object.keys(keys.lojas || {}).forEach(k => { ids['L_' + k] = keys.lojas[k]; });
  const need = Object.keys(ids);
  return new Promise(resolve => {
    let done = false;
    const fim = ok => { if (!done) { done = true; resolve(ok); } };
    need.forEach(n => fbUnsubs.push(fbDb.collection('pub').doc(ids[n]).onSnapshot(sn => {
      let v = null; if (sn.exists) { try { v = JSON.parse(sn.data().json); v._t = Number(sn.data().t) || 0; } catch (e) {} }
      live[n] = v;
      if (!need.every(x => x in live)) return;
      if (need.some(x => !live[x])) return fim(false); // ainda não publicado → usa o caminho antigo
      liveOn = true; applyLive(); fim(true);
    }, err => { console.warn('firebase', err); fim(false); })));
    const sk = keys.sel ? Object.keys(keys.sel) : [];
    sk.forEach(lk => fbUnsubs.push(fbDb.collection('pub').doc(keys.sel[lk]).onSnapshot(sn => {
      let v = null; if (sn.exists) { try { v = JSON.parse(sn.data().json); } catch (e) {} }
      liveSel[lk] = (v && v.sel) || [];
      if (sk.every(x => x in liveSel)) { liveSelOn = true; selMobLive_(); }
    }, () => {})));
    if (keys.M) fbUnsubs.push(fbDb.collection('pub').doc(keys.M).onSnapshot(sn => {
      let v = null; if (sn.exists) { try { v = JSON.parse(sn.data().json); } catch (e) {} }
      if (!v) return;
      S.mob = S.mob || {}; S.mob.cfg = v.cfg || S.mob.cfg; S.mobRaw = v.sims || []; S.mobLive = true; selMobLive_();
    }, () => {}));
    if (keys.L) fbUnsubs.push(fbDb.collection('pub').doc(keys.L).onSnapshot(sn => {
      if (!sn.exists) return; let v = null; try { v = JSON.parse(sn.data().json); } catch (e) { return; }
      if (v && v.logoHash !== cfgv('logoHash', '-')) { S.cfg = Object.assign({}, S.cfg || {}, { logo: v.logo, logoHash: v.logoHash }); saveCfgLocal(); applyFavicon(); if ($('.app')) updateShell(); }
    }, () => {}));
    setTimeout(() => fim(false), 15000);
  });
}
// redesenha a tela após uma atualização automática, sem atrapalhar quem está digitando
// e sem recarregar páginas que buscam dados no servidor (Histórico, Acessos, Aprovações...)
function rerender_() {
  if ($('.overlay')) return;
  const pg = (location.hash.replace(/^#/, '') || '/inicio').split('/')[1];
  if (/^(historico|admin|aprovacoes|solicitacoes|perfil|recrutamento|mobilidade)$/.test(pg)) return;
  const a = document.activeElement;
  if (a && a.matches && a.matches('input,textarea,select') && $('#view') && $('#view').contains(a)) {
    if (!a.__grcRR) { a.__grcRR = 1; a.addEventListener('blur', () => { a.__grcRR = 0; setTimeout(rerender_, 50); }, { once: true }); }
    return;
  }
  route(true);
}
// fotos dos colaboradores (aba _FOTOS) e líderes dos setores (aba _LIDERES) — cache no aparelho
try { S.fotos = JSON.parse(localStorage.getItem('grc_fotos') || '{}'); S.lideres = JSON.parse(localStorage.getItem('grc_lideres') || '{}'); } catch (e) { S.fotos = {}; S.lideres = {}; }
function guardarFotos_() { try { localStorage.setItem('grc_fotos', JSON.stringify(S.fotos || {})); localStorage.setItem('grc_lideres', JSON.stringify(S.lideres || {})); } catch (e) {} }
async function carregarFotos() {
  if (DEMO) return;
  try {
    const j = await api('listFotosColab', {}, { silent: true });
    const mudou = JSON.stringify([j.fotos || {}, j.lideres || {}]) !== JSON.stringify([S.fotos || {}, S.lideres || {}]);
    S.fotos = j.fotos || {}; S.lideres = j.lideres || {}; guardarFotos_();
    if (mudou && $('.app')) rerender_();
  } catch (e) {}
}
function saveCfgLocal() { const c = S.cfg || {}; ls.set('grc_cfg', { logo: c.logo, logoHash: c.logoHash, empresa: c.empresa, sistema: c.sistema, siteUrl: c.siteUrl }); }
function assembleLive() {
  const cp = o => o ? JSON.parse(JSON.stringify(o)) : o; // cópia: alterações locais não podem sujar o cache do Firebase
  const G = cp(live.G); if (!G) return null;
  const ks = Object.keys(live).filter(n => n.indexOf('L_') === 0);
  const parts = ks.map(n => cp(live[n])).filter(Boolean);
  const X = cp(live.X) || { contr: [], exps: [], desl: [] };
  const prev = S.data || {};
  const cat = f => [].concat(...parts.map(p => p[f] || []));
  return {
    user: S.user, cfg: Object.assign({}, G.cfg, { logo: cfgv('logo', '') }),
    lojas: parts.map(p => p.loja),
    contratacoes: Object.assign({}, G.contrMeta, { rows: cat('contr').concat(X.contr || []).sort((a, b) => a.row - b.row) }),
    experiencias: cat('exps').concat(X.exps || []),
    etapas: G.etapas,
    vagasFechadas: cat('fechadas'),
    desligados: cat('desl').concat(X.desl || []),
    pendentes: prev.pendentes || [], notif: prev.notif, log: prev.log || [], ultimaOp: Number(G.ultimaOp) || 0,
    atualizadoEm: (() => { const t = Math.max(...Object.values(live).filter(Boolean).map(x => x._t || 0)); return t ? new Date(t).toLocaleString('pt-BR').replace(',', '').slice(0, 16) : G.atualizadoEm; })()
  };
}
function saveDataLocal(j) {
  if (DEMO) return;
  try { const c = Object.assign({}, j, { cfg: Object.assign({}, j.cfg, { logo: undefined, logoSame: true }) }); localStorage.setItem('grc_data', JSON.stringify({ t: Date.now(), data: c })); } catch (e) { ls.del('grc_data'); }
}
function applyLive() {
  const d = assembleLive(); if (!d || !S.user) return;
  S.data = d; S.fromCache = false; reaplicarPend_();
  const lg = cfgv('logo', ''), lh = cfgv('logoHash', '');
  S.cfg = Object.assign({}, d.cfg, { logo: lg, logoHash: d.cfg.logoHash || lh });
  saveCfgLocal(); saveDataLocal(d);
  derive();
  if (!$('.app')) { renderShell(); route(); } else { updateShell(); rerender_(); }
  syncBadge(false);
}
async function meRefresh() {
  try {
    const j = await api('me', {}, { silent: true });
    S.user = j.user; if (S.data) { S.data.user = j.user; S.data.pendentes = j.pendentes || []; S.data.log = j.log || []; }
    if (j.notif) S.notif = j.notif;
    if (j.keys) { ls.set('grc_keys', j.keys); if (FB_OK && JSON.stringify(j.keys) !== fbKeysSig) startLive(j.keys); }
    if (j.cruzamento && ((j.cruzamento.alocados || []).length || (j.cruzamento.desligados || []).length)) toast(`Cruzamento automático: ${j.cruzamento.alocados.length} contratação(ões) marcada(s) como alocada(s) e ${j.cruzamento.desligados.length} como desligada(s).`);
    if (S.data) { saveDataLocal(S.data); updateShell(); rerender_(); }
    afterBoot();
  } catch (e) { if (S.token) console.warn('me', e.message); }
}
function afterBoot() {
  if (liveBooted) return; liveBooted = true;
  startPolling(); initOneSignal(); carregarAcessoSel(); carregarAcessoMob(); carregarFotos(); filaStart_();
  if (isAdmin() && !DEMO) setTimeout(() => usersBuscar_().catch(() => {}), 4000); // deixa a aba Acessos pronta
  if (S.user && S.user.trocarSenha && !DEMO) forcePassword();
  else if (S.user && !S.user.foto && !DEMO && Date.now() - (ls.get('grc_fotoAdiada_' + S.user.id, 0) || 0) > 3 * 864e5) setTimeout(() => { if (!$('.overlay')) askFoto(); }, 2500);
}
async function loadAll(first, keep, force) {
  const keys = ls.get('grc_keys', null);
  if (FB_OK && keys && keys.G && S.token && !force) {
    if (liveOn) { meRefresh(); return; }
    if (first && !$('.app')) $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Carregando quadro das lojas…</div></div></div>`;
    if (!S.user) S.user = (ls.get('grc_data', null) || {}).data ? ls.get('grc_data', null).data.user : null;
    if (S.user) {
      const ok = await startLive(keys);
      if (ok) { meRefresh(); return; }
    }
  }
  if (first && !$('.app')) $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Carregando quadro das lojas…</div></div></div>`;
  try {
    const j = await api('bootstrap', { logoHash: cfgv('logoHash', '') }, { silent: !first && S.fromCache });
    if (j.cfg && j.cfg.logoSame) j.cfg.logo = cfgv('logo', '');
    S.data = j; S.user = j.user; S.fromCache = false; reaplicarPend_();
    if (j.cfg) { S.cfg = j.cfg; saveCfgLocal(); applyFavicon(); }
    saveDataLocal(j);
    syncBadge(false);
    if (j.notif) S.notif = j.notif;
    if (j.cruzamento && ((j.cruzamento.alocados || []).length || (j.cruzamento.desligados || []).length)) setTimeout(() => toast(`Cruzamento automático: ${j.cruzamento.alocados.length} contratação(ões) marcada(s) como alocada(s) e ${j.cruzamento.desligados.length} como desligada(s).`), 800);
    derive();
    if (!$('.app')) renderShell(); else updateShell();
    route(keep);
    afterBoot();
    // já tem as chaves? liga o tempo real para as próximas atualizações
    if (FB_OK && !liveOn) { const k2 = ls.get('grc_keys', null); if (k2 && k2.G) startLive(k2); else meRefresh(); }
  } catch (e) {
    syncBadge(false);
    if (!S.token) return;
    if (first && !$('.app')) renderLogin(e.message);
    else toast(e.message, true);
  }
}
async function refresh(silentToast) { const b = $('#btnRefresh'); if (b) b.disabled = true; try { await loadAll(false, true, true); if (!silentToast) toast('Dados atualizados'); } finally { if (b) b.disabled = false; } }

/* =====================================================================
 * DERIVE
 * ===================================================================== */
function enrich(r) {
  const sit = norm(r.situacao);
  r.isVaga = sit.includes('VAGA');
  r.vagaAberta = r.isVaga && !r.nome;
  r.vagaFutura = r.isVaga && !!r.nome;
  r.aviso = sit.includes('AVISO');
  r.troca = sit.includes('TROCA');
  r.analise = sit.includes('ANALISE');
  r.tags = splitMulti(r.tag);
  const ct = norm(r.contrato + ' ' + r.tag);
  r.aprendiz = !!r.nome && /APRENDIZ/.test(ct);
  r.pcd = !!r.nome && /PCD/.test(ct);
  r.estagio = !!r.nome && /ESTAGIO/.test(ct);
  r.cipa = /CIPA/.test(norm(r.tag));
  r.trainee = /TRAIN/.test(norm(r.tag + ' ' + r.funcao));
  r.treino = !!r.nome && /TREINAMENTO/.test(norm(r.tag));
  r.dias = r.info && r.info.abertura && parseISO(r.info.abertura) ? Math.max(0, -daysTo(parseISO(r.info.abertura))) : null;
  r.etapa = r.isVaga ? ((r.info && r.info.etapa) || 'Aberta') : '';
}
const CORES_EXTRA = ['#f472b6', '#60a5fa', '#fb923c', '#a3e635', '#e879f9', '#2dd4bf', '#facc15', '#f87171'];
function registrarLojas_(lojas) {
  (lojas || []).forEach((l, i) => {
    if (!l || !l.key) return;
    if (l.nome) LOJA_NOMES[l.key] = l.nome;
    if (!LC[l.key]) LC[l.key] = CORES_EXTRA[(Object.keys(LC).length + i) % CORES_EXTRA.length];
  });
  if (lojas && lojas.length) ls.set('grc_lojas', lojas.map(l => ({ key: l.key, nome: l.nome })));
}
const todasLojas = () => { const c = ls.get('grc_lojas', null); return c && c.length ? c.map(x => x.key) : ['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO']; };
try { registrarLojas_(JSON.parse(localStorage.getItem('grc_lojas') || '[]')); } catch (e) {}
function derive() {
  const D = S.data; S.all = [];
  // líder com setores definidos (link de convite): vê só o quadro dos seus setores
  const meusSet = S.user && S.user.perfil !== 'ADMIN' && Array.isArray(S.user.setores) && S.user.setores.length ? S.user.setores.map(norm) : null;
  if (meusSet) (D.lojas || []).forEach(l => { const f = (l.setores || []).filter(x => meusSet.indexOf(norm(x.nome)) >= 0); if (f.length) l.setores = f; });
  registrarLojas_(D.lojas);
  D.lojas.forEach(l => {
    l.color = LC[l.key]; l.rows = [];
    l.setores.forEach(s => {
      s.linhas.forEach(r => { r.loja = l.key; r.setor = s.nome; enrich(r); l.rows.push(r); });
      s.ocup = sum(s.linhas.filter(r => r.nome), r => r.qt);
      s.nVagas = s.linhas.filter(r => r.vagaAberta).length;
      s.nFut = s.linhas.filter(r => r.vagaFutura).length;
      s.pad = s.padrao || sum(s.linhas, r => r.qt);
    });
    const R = l.rows, colab = R.filter(r => r.nome);
    const st = {
      ideal: Math.round(sum(l.setores, s => s.pad) * 100) / 100, // sempre a soma dos padrões dos setores (o valor fixo da planilha ficava desatualizado)
      idealPlanilha: l.ideal,
      atual: sum(l.setores, s => s.ocup),
      atualPlanilha: l.atual,
      vagas: R.filter(r => r.vagaAberta).length,
      vagasQt: sum(R.filter(r => r.vagaAberta), r => r.qt),
      futuras: R.filter(r => r.vagaFutura).length,
      aviso: R.filter(r => r.aviso).length,
      colab: colab.length,
      posicoes: R.length,
      aprendiz: R.filter(r => r.aprendiz).length,
      aprendizVagas: R.filter(r => r.vagaAberta && /APRENDIZ/.test(norm(r.contrato))).length,
      pcd: R.filter(r => r.pcd).length,
      estagio: R.filter(r => r.estagio).length,
      cipa: R.filter(r => r.cipa).length,
      trainee: R.filter(r => r.trainee && r.nome).length,
      troca: R.filter(r => r.troca).length,
      tempoMedio: (() => { const m = colab.map(r => r.meses).filter(x => x != null); return m.length ? sum(m) / m.length : null; })()
    };
    st.ocup = pct(st.atual, st.ideal);
    st.cotaAprendiz = Math.ceil(st.colab * ((l.cotas && l.cotas.aprendiz) || .05));
    st.cotaPcd = Math.ceil(st.colab * ((l.cotas && l.cotas.pcd) || .02));
    st.preench = pct(R.filter(r => r.nome).length, R.length);
    l.st = st;
    S.all.push(...R);
  });
  const L = D.lojas;
  S.tot = {};
  ['ideal', 'atual', 'vagas', 'vagasQt', 'futuras', 'aviso', 'colab', 'aprendiz', 'pcd', 'estagio', 'cipa', 'trainee', 'cotaAprendiz', 'cotaPcd', 'posicoes'].forEach(k => S.tot[k] = sum(L, l => l.st[k]));
  S.tot.ocup = pct(S.tot.atual, S.tot.ideal);

  // pendências e desligados
  S.pendRows = {};
  (D.pendentes || []).forEach(p => { const pl = p.payload || {}; if (pl.loja && pl.row) S.pendRows[pl.loja + '|' + pl.row] = p; });
  S.desl = new Set((D.desligados || []).map(d => norm(d.nome)));
  // SLA
  S.all.forEach(r => { r.sla = r.vagaAberta || r.vagaFutura ? slaInfo(r) : null; });
  S.slaEst = S.all.filter(r => r.vagaAberta && r.sla && r.sla.st === 'est').length;
  S.nomesQuadro = new Set(S.all.filter(r => r.nome).map(r => norm(r.nome)));
  // contratações — detectar colunas
  const C = D.contratacoes || { header: [], rows: [] };
  const H = C.header || [];
  const find = re => H.find(x => re.test(norm(x))) || '';
  S.ck = { data: H[0] || 'DATA', loja: find(/^LOJA/), colab: find(/COLABORADOR|NOME/), setor: find(/SETOR/), funcao: find(/FUNC/), aso: find(/ASO/), hcm: find(/HCM|EXPORT/), contrato: find(/CONTRATO/), status: find(/STATUS/), dp: find(/SOLICIT|\bDP\b/) };
  // contratações excluídas (desistência na contratação) somem do sistema; ficam só registradas na planilha
  if (S.ck.status && C.rows) { const ex = r => /EXCLU/.test(norm(r[S.ck.status])); if (C.rows.some(ex)) { C.excluidas = (C.excluidas || []).concat(C.rows.filter(ex)); C.rows = C.rows.filter(r => !ex(r)); } }
  (C.rows || []).forEach(r => {
    r._loja = lojaKey(r[S.ck.loja]);
    r._deslig = /DESLIG/.test(norm(r[S.ck.status]));
    r._pend = !/ALOCAD/.test(norm(r[S.ck.status])) && !r._deslig;
    r._data = parseBR(r[S.ck.data]);
    r._consta = r._pend && S.desl.has(norm(r[S.ck.colab]));
    r._noQuadro = !!S.nomesQuadro && S.nomesQuadro.has(norm(r[S.ck.colab]));
    r._chk = chkSteps(r); r._chkOk = r._chk.filter(x => x.ok).length;
    r._falta = r._chk.find(x => !x.ok) || null;
  });
  // experiências
  (D.experiencias || []).forEach(e => {
    e._loja = lojaKey(e.loja);
    e._d30 = daysTo(parseBR(e.venc30)); e._d90 = daysTo(parseBR(e.venc90));
    if (e._d30 != null && e._d30 >= 0) { e._prox = '30'; e._dias = e._d30; e._data = e.venc30; }
    else if (e._d90 != null && e._d90 >= 0) { e._prox = '90'; e._dias = e._d90; e._data = e.venc90; }
    else { e._prox = ''; e._dias = null; }
    e._exp = e._prox !== '';
    e._deslig = S.desl.has(norm(e.nome));
    if (e._deslig) { e._exp = false; }
  });
}
const lojaBy = k => S.data.lojas.find(l => l.key === k);
// Eusébio e Super Fraldas: tag para quem ainda está em treinamento
const TREINO_LOJAS = ['EUSEBIO', 'SUPERFRALDAS'], TREINO_TAG = 'EM TREINAMENTO';
const lojaTreino = k => TREINO_LOJAS.includes(k);
const opc = (l, k) => {
  const o = (l && l.opcoes && l.opcoes[k]) || [];
  // tags padrão (CIPA, PCD, Aprendiz, Lider Trainee) sempre disponíveis em todas as lojas
  const base = k === 'tag' ? [...(isAdmLoja(l) ? SEN.map(x => x.k) : []), ...o, ...DEF_OPC.tag, ...(l && lojaTreino(l.key) ? [TREINO_TAG] : [])] : [...o, ...(o.length ? [] : DEF_OPC[k] || [])];
  const vistos = new Set(); return uniq(base).filter(x => { const n = norm(x); if (vistos.has(n)) return false; vistos.add(n); return true; });
};
const allFuncoes = () => uniq(S.all.map(r => r.funcao)).sort();

/* =====================================================================
 * SHELL
 * ===================================================================== */
function navItem(href, icon, label, extra = '') { return `<a class="nav" href="#${href}" data-nav="${href}" title="${h(label)}">${icon}<span class="lbl">${h(label)}</span>${extra}</a>`; }
function renderShell() {
  const nl = S.data.lojas;
  $('#root').innerHTML = `
  ${DEMO ? '<div class="demo-banner">MODO DEMONSTRAÇÃO — dados fictícios, nada é gravado na planilha</div>' : ''}
  <div class="app">
    <div class="sb-backdrop" id="sbBack"></div>
    <aside class="sidebar ${S.collapsed ? 'collapsed' : ''}" id="sb">
      <div class="sb-head">
        <div class="brand" id="sbBrand">${brandHTML()}<div class="brand-txt">${h(cfgv('sistema', 'Quadro de Lojas'))}<small>${h(cfgv('empresa', 'Grupo R Center'))}</small></div></div>
        <button class="btn ghost icon desk-only sb-arrow" id="sbToggle" title="Recolher / expandir menu">${ic('chevl2')}</button>
        <button class="btn ghost icon mobile-only sb-arrow" id="sbClose" title="Fechar menu">${ic('chevl2')}</button>
      </div>
      <div class="sb-scroll" id="sbNav"></div>
      <div class="sb-foot">
        <div class="me" id="meBox" title="Meu perfil"></div>
        <a class="nav mobile-only" id="btnTheme2" style="margin-top:4px">${ic('moon')}<span class="lbl">Tema claro/escuro</span></a>
        <a class="nav" id="btnLogout" style="margin-top:4px">${ic('logout')}<span class="lbl logout-txt">Sair</span></a>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="btn ghost icon mobile-only" id="sbOpen">${ic('menu')}</button>
        <div><div class="crumb" id="crumb"></div><h1 id="title"></h1></div>
        <button class="btn ghost icon mobile-only" id="btnGs" title="Buscar">${ic('search')}</button>
        <div class="gsearch"><div class="input-icon">${ic('search')}<input class="input" id="gq" placeholder="Buscar colaborador, função…  ( / )" autocomplete="off"></div><div class="results hidden" id="gres"></div></div>
        ${!isAdmin() && !isDP() && S.user.lojas.length ? `<button class="btn primary sm" id="btnReq" title="Requisitar vaga">${ic('plus')}<span class="desk-only">Requisitar vaga</span></button>` : ''}
        <div class="bell-wrap"><button class="btn ghost icon" id="btnBell" title="Notificações">${ic('bell')}<span class="bell-n hidden" id="bellN"></span></button><div class="bell-panel hidden" id="bellPanel"></div></div>
        <button class="btn ghost icon desk-only" id="btnTheme" title="Tema claro/escuro">${ic(document.documentElement.dataset.theme === 'light' ? 'moon' : 'sun')}</button>
        <button class="btn ghost icon" id="btnRefresh" title="Atualizar dados">${ic('refresh')}</button>
      </header>
      <main class="content" id="view"></main>
    </div>
  </div>
  <nav class="mbar">
    <a href="#/inicio" data-nav="/inicio">${ic('home')}<span>Início</span></a>
    <a href="#/vagas" data-nav="/vagas">${ic('briefcase')}<span>Vagas</span></a>
    ${isAdmin() ? `<a href="#/aprovacoes" data-nav="/aprovacoes">${ic('check')}<span>Aprovar</span><i class="mb-n hidden" id="mbAp"></i></a>` : isDP() ? `<a href="#/contratacoes" data-nav="/contratacoes">${ic('userplus')}<span>Admissões</span></a>` : `<a id="mbReq">${ic('plus')}<span>Requisitar</span></a>`}
    <a id="mbBellBtn">${ic('bell')}<span>Alertas</span><i class="mb-n hidden" id="mbBell"></i></a>
    <a id="mbMenu">${ic('menu')}<span>Menu</span></a>
  </nav>`;
  updateShell();
  $('#sbToggle').onclick = () => { S.collapsed = !S.collapsed; ls.set('grc_sb', S.collapsed); $('#sb').classList.toggle('collapsed', S.collapsed); setTimeout(() => S.charts.forEach(c => c.resize()), 260); };
  const sbOpen = on => { $('#sb').classList.toggle('open', on); $('#sbBack').classList.toggle('on', on); };
  $('#sbOpen').onclick = () => sbOpen(true);
  $('#btnGs').onclick = () => { const tb = $('.topbar'); tb.classList.toggle('gs-open'); if (tb.classList.contains('gs-open')) $('#gq').focus(); else { $('#gq').value = ''; $('#gq').dispatchEvent(new Event('input')); } };
  $('#sbClose').onclick = () => sbOpen(false);
  $('#sbBack').onclick = () => sbOpen(false);
  let tx0 = null;
  $('#sb').addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
  $('#sb').addEventListener('touchend', e => { if (tx0 != null && tx0 - e.changedTouches[0].clientX > 60) sbOpen(false); tx0 = null; }, { passive: true });
  $('#btnLogout').onclick = () => confirmBox('Deseja sair do sistema?', 'Sair').then(ok => ok && logout());
  $('#btnRefresh').onclick = () => refresh();
  $('#btnTheme2').onclick = () => $('#btnTheme').click();
  $('#meBox').onclick = () => location.hash = '#/perfil';
  $('#btnTheme').onclick = () => {
    const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t; try { localStorage.setItem('grc_theme', t); } catch (e) {}
    $('#btnTheme').innerHTML = ic(t === 'light' ? 'moon' : 'sun');
    route();
  };
  setupGlobalSearch();
  setupBell();
  $('#mbMenu').onclick = () => { $('#sb').classList.add('open'); $('#sbBack').classList.add('on'); };
  $('#mbBellBtn').onclick = e => { e.stopPropagation(); window.scrollTo(0, 0); $('#btnBell').click(); };
  if ($('#mbReq')) $('#mbReq').onclick = () => openRequisicao();
  if ($('#btnReq')) $('#btnReq').onclick = () => openRequisicao();
  if (!window.__grcSlash) window.__grcSlash = 1, document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#gq').focus(); } });
}
function updateShell() {
  const nl = S.data.lojas;
  const nC = (S.data.contratacoes.rows || []).filter(r => r._pend).length;
  const nE = (S.data.experiencias || []).filter(e => e._exp && e._dias <= 7).length;
  $('#sbNav').innerHTML = `
    <div class="sb-label">Visão geral</div>
    ${navItem('/inicio', ic('home'), 'Dashboard')}
    <div class="sb-label">Lojas</div>
    ${nl.filter(l => !isAdmLoja(l)).map(l => navItem('/loja/' + l.key, `<span class="dot" style="background:${l.color}">${l.num}</span>`, l.nome, (l.nova ? '<span class="new">NOVA</span>' : '') + (l.st.vagas ? `<span class="cnt ${l.st.vagas > 5 ? 'hot' : ''}" title="Vagas abertas">${l.st.vagas}</span><span class="badge-mini"></span>` : ''))).join('')}
    ${nl.filter(isAdmLoja).map(l => navItem('/loja/' + l.key, `<span class="dot" style="background:linear-gradient(135deg,#fde68a,#f5c451 45%,#b8860b);color:#1a1204;font-size:11px">★</span>`, 'Administrativo', l.st.vagas ? `<span class="cnt">${l.st.vagas}</span>` : '')).join('')}
    ${isAdmin() && !nl.some(isAdmLoja) ? `<a class="nav" href="#" id="navAdm" title="Criar o quadro do administrativo"><span class="dot" style="background:linear-gradient(135deg,#fde68a,#f5c451 45%,#b8860b);color:#1a1204;font-size:11px">★</span><span class="lbl">Criar quadro ADM</span></a>` : ''}
    ${isAdmin() ? `<a class="nav" href="#" id="navNovaLoja" title="Criar nova loja"><span class="dot" style="background:transparent;border:1.5px dashed var(--border2);color:var(--muted)">+</span><span class="lbl">Nova loja</span></a>` : ''}
    ${podeEscala() ? `<div class="sb-label">Planejamento</div>${navItem('/escalas', ic('calendar'), 'Simulador de escalas', '<span class="new">5x2</span>')}` : ''}
    <div class="sb-label">Recrutamento</div>
    ${navItem('/vagas', ic('briefcase'), 'Vagas', `<span class="cnt hot">${S.tot.vagas}</span><span class="badge-mini"></span>`)}
    ${navItem('/contratacoes', ic('userplus'), 'Contratações', nC ? `<span class="cnt">${nC}</span>` : '')}
    ${temMob() ? navItem('/mobilidade', ic('car'), 'Mobilidade') : ''}
    ${navItem('/experiencias', ic('clock'), 'Experiências', nE ? `<span class="cnt hot">${nE}</span>` : '')}
    ${navItem('/desligamentos', ic('door'), 'Desligamentos')}
    ${!isAdmin() && S.user.podeConvidar ? `<a class="nav" href="#" id="navConv" title="Links de convite">${ic('link')}<span class="lbl">Links de convite</span></a>` : ''}
    ${isAdmin() ? `<div class="sb-label">Administração</div>${navItem('/aprovacoes', ic('check'), 'Aprovações', S.notif.pendentes ? `<span class="cnt hot">${S.notif.pendentes}</span><span class="badge-mini"></span>` : '')}${navItem('/admin', ic('shield'), 'Acessos e configurações')}${navItem('/historico', ic('history'), 'Histórico')}` : `<div class="sb-label">Solicitações</div>${navItem('/solicitacoes', ic('file'), 'Minhas solicitações', (S.data.pendentes || []).length ? `<span class="cnt">${S.data.pendentes.length}</span>` : '')}`}
  `;
  const sb = $('#sbBrand'); if (sb) sb.innerHTML = `${brandHTML()}<div class="brand-txt">${h(cfgv('sistema', 'Quadro de Lojas'))}<small>${h(cfgv('empresa', 'Grupo R Center'))}</small></div>`;
  const nlB = $('#navNovaLoja'); if (nlB) nlB.onclick = e => { e.preventDefault(); openNovaLoja(); };
  const ncB = $('#navConv'); if (ncB) ncB.onclick = e => { e.preventDefault(); openConvites(); };
  const naB = $('#navAdm'); if (naB) naB.onclick = async e => {
    e.preventDefault();
    if (!await confirmBox('Criar o <b>quadro do Administrativo</b>? O sistema monta uma aba nova na planilha (QUADRO ADM) com os colaboradores e setores da aba ADMINISTRATIVO e a senioridade que já está registrada na aba GRC. As abas ADMINISTRATIVO e GRC não são alteradas.', 'Criar quadro')) return;
    try { busy(true); const j = await api('criarQuadroAdm', {}); toast(`Quadro do Administrativo criado: ${j.colaboradores} colaboradores em ${j.setores} setores`); await loadAll(false, true, true); location.hash = '#/loja/GRC'; }
    catch (er) { toast(er.message, true); } finally { busy(false); }
  };
  updateBell();
  const ma = $('#mbAp'); if (ma) { ma.textContent = S.notif.pendentes || ''; ma.classList.toggle('hidden', !S.notif.pendentes); }
  $$('.mbar a[data-nav]').forEach(a => a.classList.toggle('active', (location.hash.replace(/^#/, '') || '/inicio').startsWith(a.dataset.nav)));
  $('#meBox').innerHTML = `${avatar(S.user.nome, S.user.foto)}<div class="who"><b>${h(S.user.nome)}</b><span>${h(S.user.cargo || PERFIS[S.user.perfil] || '')}</span></div>`;
  $$('#sbNav .nav').forEach(a => a.addEventListener('click', () => { $('#sb').classList.remove('open'); const bk = $('#sbBack'); if (bk) bk.classList.remove('on'); }));
}
function setTitle(t, crumb) { $('#title').textContent = t; $('#crumb').textContent = crumb || ''; document.title = t + ' · Quadro GRC'; }

function setupGlobalSearch() {
  const q = $('#gq'), box = $('#gres');
  let sel = 0, items = [];
  const draw = () => {
    const t = norm(q.value);
    if (t.length < 2) { box.classList.add('hidden'); return; }
    items = S.all.filter(r => norm(r.nome).includes(t) || norm(r.funcao).includes(t)).slice(0, 12);
    const cs = (S.data.contratacoes.rows || []).filter(r => norm(r[S.ck.colab]).includes(t)).slice(0, 4).map(r => ({ _c: r }));
    items = items.concat(cs);
    box.innerHTML = items.length ? items.map((r, i) => r._c
      ? `<div class="res ${i === sel ? 'sel' : ''}" data-i="${i}">${avatar(r._c[S.ck.colab], '', 'sm soft')}<div style="flex:1;min-width:0"><b style="font-size:13px">${h(r._c[S.ck.colab])}</b><div class="muted" style="font-size:11.5px">Contratação · ${h(r._c[S.ck.funcao])}</div></div>${lojaPill(r._c._loja)}</div>`
      : `<div class="res ${i === sel ? 'sel' : ''}" data-i="${i}">${r.nome ? avatar(r.nome, '', 'sm soft') : `<div class="avatar sm vaga-av">${ic('briefcase')}</div>`}<div style="flex:1;min-width:0"><b style="font-size:13px">${h(r.nome || 'Vaga em aberto')}</b><div class="muted" style="font-size:11.5px">${h(r.funcao)} · ${h(r.setor)}</div></div>${lojaPill(r.loja)}</div>`).join('')
      : '<div class="empty" style="padding:18px">Nada encontrado</div>';
    box.classList.remove('hidden');
    $$('.res', box).forEach(el => el.onmousedown = e => { e.preventDefault(); go(items[+el.dataset.i]); });
  };
  const go = r => {
    if (!r) return;
    q.value = ''; box.classList.add('hidden'); q.blur();
    if (r._c) { location.hash = '#/contratacoes'; return; }
    S.hl = r.row;
    const f = getF('loja_' + r.loja); Object.keys(f).forEach(k => f[k] = ''); saveF();
    if (location.hash === '#/loja/' + r.loja) route(); else location.hash = '#/loja/' + r.loja;
  };
  q.oninput = () => { sel = 0; draw(); };
  q.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') go(items[sel]);
    else if (e.key === 'Escape') { q.value = ''; box.classList.add('hidden'); q.blur(); }
  };
  q.onblur = () => setTimeout(() => box.classList.add('hidden'), 150);
}

const podeEscala = () => !!(S.user && (isAdmin() || isDP() || S.user.perfil === 'EDITOR'));
/* =====================================================================
 * SIMULADOR DE ESCALAS — motor (5x2 e 12x36) · fim da escala 6x1 (EC 141/2026)
 * ===================================================================== */
const ESC_DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const ESC_ETAPAS = {
  hoje: { L: 44, lbl: 'Hoje · 44h (6x1)', curto: 'Hoje (44h)' },
  e42: { L: 42, lbl: 'A partir de 15/12/2026 · 42h', curto: '15/12/2026 (42h)' },
  e40: { L: 40, lbl: 'A partir de dez/2027 · 40h', curto: 'Dez/2027 (40h)' }
};
const escHora = x => { const m = String(x || '').match(/^(\d{1,2}):?(\d{2})?$/); return m ? +m[1] + (+(m[2] || 0)) / 60 : null; };
const escHHMM = x => { x = ((x % 24) + 24) % 24; let hh = Math.floor(x + 1e-9), mm = Math.round((x - hh) * 60); if (mm === 60) { hh = (hh + 1) % 24; mm = 0; } return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
const escDur = x => { const hh = Math.floor(x + 1e-9), mm = Math.round((x - hh) * 60); return hh + 'h' + (mm ? String(mm).padStart(2, '0') : ''); };
// jornada diária (horas trabalhadas) por escala e etapa
function escJornada(escala, L, cct) {
  if (escala === '6x1') return L / 6;
  if (L >= 44) return 8.8;              // 5x2 compensando o sábado (só existe hoje)
  if (L >= 42) return cct ? 8.4 : 8;    // transição: 8h24 só com convenção/acordo coletivo
  return 8;
}
// horas em que o setor funciona no dia (aceita virada da noite)
function escHorasDia(abre, fecha) { const a = escHora(abre), f = escHora(fecha); if (a == null || f == null) return 0; let d = f - a; if (d <= 0) d += 24; return d; }
// turnos necessários para cobrir o horário: cada turno fica no local jornada + 1h de intervalo
function escTurnosDia(horas, jornada) { return horas > 0 ? Math.ceil(horas / (jornada + 1) - 1e-9) : 0; }

/* dias do mês, completados até semanas cheias (segunda a domingo) */
function escDiasMes(ano, mes) {
  const ini = new Date(ano, mes, 1), fim = new Date(ano, mes + 1, 0);
  const d0 = new Date(ini); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
  const d1 = new Date(fim); d1.setDate(d1.getDate() + (6 - ((d1.getDay() + 6) % 7)));
  const out = []; for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return { dias: out, ini, fim };
}

/* ---------------- 5x2: gerador de folgas ----------------
 * P pessoas, dem[7] = pessoas necessárias trabalhando (Seg..Dom), W semanas, N = folga no domingo a cada N semanas.
 * Regras: 2 folgas por semana; nunca 7 dias seguidos; domingo de folga pelo menos 1 a cada N semanas.
 * Retorna grid[p][dia] = 1 (trabalha) / 0 (folga) */
function escGerar5x2(P, dem, W, N, semente) {
  semente = semente || 0;
  const grid = Array.from({ length: P }, () => []);
  const streak = Array.from({ length: P }, (_, i) => N > 1 ? (i % N) : 0); // domingos seguidos trabalhados
  const run = new Array(P).fill(0);                                        // dias seguidos trabalhados até ontem
  const pares = []; for (let a = 0; a < 6; a++) { pares.push([a]); for (let b = a + 1; b < 6; b++) pares.push([a, b]); }
  for (let w = 0; w < W; w++) {
    const off = Array.from({ length: P }, () => new Array(7).fill(false));
    // 1) domingo
    const precisa = [], idx = [...Array(P).keys()];
    idx.forEach(i => { if (N <= 1 || streak[i] >= N - 1) precisa.push(i); });
    let k = Math.max(0, P - dem[6]);
    const ordem = idx.sort((a, b) => (streak[b] - streak[a]) || (((a + w + semente) % P) - ((b + w + semente) % P)));
    const nOff = Math.max(k, precisa.length);
    const folgaDom = new Set(precisa);
    for (const i of ordem) { if (folgaDom.size >= nOff) break; folgaDom.add(i); }
    folgaDom.forEach(i => off[i][6] = true);
    // 2) segunda a sábado
    const slack = dem.slice(0, 6).map(d => P - d);
    const ord2 = [...Array(P).keys()].sort((a, b) => (run[b] - run[a]) || ((folgaDom.has(a) ? 1 : 0) - (folgaDom.has(b) ? 1 : 0)) || (((a * 7 + w * 3 + semente) % P) - ((b * 7 + w * 3 + semente) % P)));
    for (const i of ord2) {
      const need = off[i][6] ? 1 : 2;
      let best = null, bs = null;
      for (const pr of pares) {
        if (pr.length !== need) continue;
        // não pode passar de 6 dias seguidos: 1ª folga até o dia (6 - run)
        if (run[i] + pr[0] > 6) continue;
        const neg = pr.filter(d => slack[d] - 1 < 0).length;
        const sl = sum(pr, d => slack[d]);
        const lo = pr[pr.length - 1];
        const trail = off[i][6] ? 0 : 6 - lo;               // dias trabalhados depois da última folga até domingo
        const pen = trail >= 6 ? 3 : trail >= 5 ? .4 : 0;
        const juntas = pr.length === 2 && pr[1] - pr[0] === 1 ? -.05 : 0; // leve preferência por folgas separadas
        const rot = ((pr[0] + i + w * 2 + semente) % 6) / 100;
        const sc = [neg, -(sl) + pen + juntas + rot];
        if (!bs || sc[0] < bs[0] || (sc[0] === bs[0] && sc[1] < bs[1])) { bs = sc; best = pr; }
      }
      if (!best) { // sem opção legal: folga no 1º dia possível
        best = need === 1 ? [0] : [0, 1];
      }
      best.forEach(d => { off[i][d] = true; slack[d]--; });
    }
    // 3) grava e atualiza contadores
    for (let i = 0; i < P; i++) {
      for (let d = 0; d < 7; d++) { const t = off[i][d] ? 0 : 1; grid[i].push(t); run[i] = t ? run[i] + 1 : 0; }
      streak[i] = off[i][6] ? 0 : streak[i] + 1;
    }
  }
  return grid;
}
function escCobertura(grid, nDias) { const c = new Array(nDias).fill(0); grid.forEach(r => r.forEach((t, d) => { if (t) c[d]++; })); return c; }
// conferência legal de cada pessoa
function escConferir(grid, N) {
  const prob = [];
  grid.forEach((r, i) => {
    let run = 0, maxRun = 0, domSeg = 0, maxDom = 0;
    for (let d = 0; d < r.length; d++) { run = r[d] ? run + 1 : 0; maxRun = Math.max(maxRun, run); if (d % 7 === 6) { domSeg = r[d] ? domSeg + 1 : 0; maxDom = Math.max(maxDom, domSeg); } }
    const semanas = []; for (let w = 0; w < r.length / 7; w++) semanas.push(r.slice(w * 7, w * 7 + 7).filter(x => !x).length);
    if (maxRun > 6) prob.push({ i, t: `${maxRun} dias seguidos de trabalho` });
    if (semanas.some(x => x < 2)) prob.push({ i, t: 'semana com menos de 2 folgas' });
    if (N > 0 && maxDom >= N) prob.push({ i, t: `${maxDom} domingos seguidos sem folga` });
  });
  return prob;
}
// menor equipe que cobre a demanda sem quebrar as regras
function escMinimo5x2(dem, N) {
  const tot = sum(dem);
  if (!tot) return { P: 0, grid: [], lb: 0 };
  const lb = Math.max(Math.ceil(tot / 5 - 1e-9), N > 1 ? Math.ceil(dem[6] * N / (N - 1) - 1e-9) : (dem[6] ? Infinity : 0), Math.max(...dem));
  if (!isFinite(lb)) return { P: null, grid: [], lb };
  const W = 6;
  for (let P = lb; P <= lb + 8; P++) {
    for (let s = 0; s < 4; s++) {
      const g = escGerar5x2(P, dem, W, N, s);
      const c = escCobertura(g, W * 7);
      const ok = c.every((x, d) => x >= dem[d % 7]) && !escConferir(g, N).length;
      if (ok) return { P, lb, semente: s };
    }
  }
  return { P: lb + 8, lb, semente: 0, aprox: true };
}

/* ---------------- 12x36 ---------------- */
// postos: p24 (24h: diurno + noturno), p12 (12h diurno). h = horas por plantão (12 com intervalo indenizado; 11 com intervalo de 1h)
function esc12Calc(p24, p12, h, L) {
  const slots = p24 * 2 + p12, base = slots * 2, media = 3.5 * h;
  const ratio = Math.max(0, 1 - L / media);
  const folg = ratio > 0 ? Math.ceil(base * 3.5 * ratio / (L / h) - 1e-9) : 0;
  return { slots, base, media, ratio, folg, P: base + folg };
}
function escGerar12x36(p24, p12, h, L, dias, mesIni, mesFim) {
  const slots = []; for (let i = 0; i < p24; i++) { slots.push({ c: 'D', n: i + 1 }); slots.push({ c: 'N', n: i + 1 }); } for (let i = 0; i < p12; i++) slots.push({ c: 'D', n: p24 + i + 1 });
  const ratio = Math.max(0, 1 - L / (3.5 * h));
  const dn = d => Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5);
  const noMes = d => d >= mesIni && d <= mesFim;
  const nMes = dias.filter(noMes).length;
  const pessoas = [], fe = [], usados = new Set();
  let k = 0;
  slots.forEach((s, si) => {
    [0, 1].forEach(par => {
      const cells = dias.map(d => (dn(d) + par + si) % 2 === 0 ? s.c : 'F');
      const trab = cells.map((c, i) => c !== 'F' && noMes(dias[i]) ? i : -1).filter(i => i >= 0);
      const e = ratio > 0 ? Math.max(1, Math.round(trab.length * ratio)) : 0;
      for (let q = 0; q < e; q++) {
        const alvo = Math.min(trab.length - 1, Math.floor((q + ((k * 0.381966 + .2) % 1)) * trab.length / e));
        const cand = trab.map((d, ix) => [d, Math.abs(ix - alvo)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
        const pos = cand.find(d => cells[d] !== 'FE' && !usados.has(d - 1) && !usados.has(d) && !usados.has(d + 1)) ?? cand.find(d => cells[d] !== 'FE');
        if (pos == null) continue;
        usados.add(pos); fe.push({ d: pos, c: cells[pos] }); cells[pos] = 'FE';
      }
      pessoas.push({ slot: s, cells }); k++;
    });
  });
  // folguistas cobrem as folgas extras (sem plantões em dias seguidos e dentro do limite de horas do mês)
  const lim = Math.floor(L * nMes / 7 / h + 1e-9), folg = [];
  fe.sort((a, b) => a.d - b.d).forEach(x => {
    let f = folg.find(f => f.n < lim && f.cells[x.d] === 'F' && (x.d === 0 || f.cells[x.d - 1] === 'F') && (x.d === dias.length - 1 || f.cells[x.d + 1] === 'F'));
    if (!f) { f = { cells: dias.map(() => 'F'), n: 0 }; folg.push(f); }
    f.cells[x.d] = x.c; f.n++;
  });
  return { pessoas, folg, lim };
}

/* ---------------- parâmetros por setor ---------------- */
const escParKey = (lk, setor) => lk + '|' + norm(setor);
// parâmetros ficam no servidor (Propriedades do Apps Script, sem planilha); gravações chegam na hora pela fila do Firebase
const escSemMeta = o => o ? Object.keys(o).filter(k => k[0] !== '_').sort().reduce((r, k) => (r[k] = o[k], r), {}) : null;
function escParTodos() {
  if (DEMO) return Object.assign({}, ls.get('grc_escPar', {}));
  if (!S.escPar) S.escPar = ls.get('grc_escParSrv', {});
  let mudou = false;
  filaListaOps_({ escalaSet: 1 }).forEach(o => {
    const p = o.payload || {}; if (!p.chave) return;
    if (p.par == null) { if (S.escPar[p.chave]) { delete S.escPar[p.chave]; mudou = true; } }
    else if (JSON.stringify(escSemMeta(S.escPar[p.chave])) !== JSON.stringify(escSemMeta(p.par))) { S.escPar[p.chave] = Object.assign({ _por: '', _em: 'agora' }, p.par); mudou = true; }
  });
  if (mudou) ls.set('grc_escParSrv', S.escPar);
  return Object.assign({}, S.escPar);
}
async function escParCarregar(redesenhar) {
  if (DEMO || escParCarregar.on) return;
  escParCarregar.on = true;
  try {
    const j = await api('escalaGet', {}, { silent: true });
    S.escPar = j.par || {}; ls.set('grc_escParSrv', S.escPar);
    // parâmetros que ficaram só neste aparelho (versão anterior): envia para o servidor
    const loc = ls.get('grc_escPar', {});
    if (podeEscala()) Object.keys(loc).forEach(k => { if (!S.escPar[k]) escParEnviar(k, loc[k]); });
    ls.del('grc_escPar');
    if (redesenhar && /^#\/escalas/.test(location.hash) && !$('.overlay')) rerender_();
  } catch (e) { console.warn('escala', e); } finally { escParCarregar.on = false; }
}
function escParEnviar(chave, par) {
  if (DEMO) { const loc = ls.get('grc_escPar', {}); if (par == null) delete loc[chave]; else loc[chave] = par; ls.set('grc_escPar', loc); return Promise.resolve(); }
  S.escPar = S.escPar || {};
  if (par == null) delete S.escPar[chave]; else S.escPar[chave] = Object.assign({}, par, { _por: S.user.nome, _em: 'agora' });
  ls.set('grc_escParSrv', S.escPar);
  const limpo = escSemMeta(par);
  return api('escalaSet', { chave, par: limpo }, { silent: true }).then(j => { if (j && j.par && !j.otimista) { S.escPar[chave] = j.par; ls.set('grc_escParSrv', S.escPar); } })
    .catch(e => { toast('Não foi possível salvar os parâmetros: ' + e.message, true); escParCarregar(true); });
}
function escParDef(l, setor) {
  const s = norm(setor + ' ' + l.key);
  const atual = /MONITORAMENTO|VIGIA|PORTARIA/.test(s) ? '12x36' : isAdmLoja(l) ? '5x2' : '6x1';
  return {
    modo: 'auto', atual, alvo: atual === '12x36' ? '12x36' : '5x2', domN: 3, cct: false, reserva: 9, aprendiz: false, parcial: .5, base: 'padrao', fora: [],
    h: { sem: { a: '07:00', f: '22:00' }, sab: { a: '07:00', f: '22:00' }, dom: { a: '07:00', f: '13:00' } },
    p: { sem: 2, sab: 3, dom: 2 },
    p24: 1, p12: 0, h12: 12
  };
}
function escPar(l, setor) {
  const d = escParDef(l, setor), s = escParTodos()[escParKey(l.key, setor)] || {};
  return Object.assign(d, s, { h: Object.assign({}, d.h, s.h || {}), p: Object.assign({}, d.p, s.p || {}) });
}
/* ---------------- dados do setor ---------------- */
function escPessoas(l, sec, par) {
  const fora = new Set((par.fora || []).map(norm));
  const rows = sec.linhas.filter(r => !fora.has(norm(r.funcao)));
  const conta = r => !(r.estagio || (r.aprendiz && !par.aprendiz));
  const peso = r => (+r.qt || 0) * (/PARCIAL/.test(norm(r.contrato)) ? (+par.parcial || 0) : 1);
  const ocup = rows.filter(r => r.nome && conta(r));
  const padraoRows = rows.filter(r => !r.nome ? !/APRENDIZ|ESTAGIO/.test(norm(r.contrato)) || par.aprendiz : conta(r));
  const pessoas = ocup.filter(r => (+r.qt || 0) >= .5).sort((a, b) => String(a.funcao).localeCompare(b.funcao) || String(a.nome).localeCompare(b.nome));
  return {
    rows, funcoes: uniq(sec.linhas.map(r => r.funcao)).sort(),
    padrao: Math.round(sum(padraoRows, peso) * 100) / 100,
    ocupado: Math.round(sum(ocup, peso) * 100) / 100,
    vagas: rows.filter(r => r.vagaAberta).length,
    aviso: rows.filter(r => r.aviso && r.nome).length,
    fora: sec.linhas.filter(r => r.nome && fora.has(norm(r.funcao))).length,
    aprend: rows.filter(r => r.nome && r.aprendiz).length,
    pessoas
  };
}
// demanda por dia (Seg..Dom) a partir do quadro de hoje (modo automático)
function escDemAuto(par, B, N) {
  B = Math.max(0, Math.round(B));
  if (par.atual === '5x2') return [B, B, B, B, B, 0, 0];
  if (par.atual === '12x36') return null;
  const dom = N > 1 ? Math.floor(B * (N - 1) / N) : 0;
  const rest = 6 * B - dom, base = Math.floor(rest / 6), r = rest - base * 6;
  const ordem = [5, 4, 3, 2, 1, 0], dem = [base, base, base, base, base, base, dom]; // sobra vai para sáb, sex, qui…
  for (let i = 0; i < r; i++) dem[ordem[i]]++;
  return dem;
}
function escPostos12(par, B) { if (par.modo === 'manual' || par.atual !== '12x36') return { p24: +par.p24 || 0, p12: +par.p12 || 0 }; const sl = Math.max(1, Math.round(B / 2)); return { p24: Math.floor(sl / 2), p12: sl % 2 }; }

/* ---------------- cálculo principal ---------------- */
function escCalc(l, sec, par, etKey) {
  const et = ESC_ETAPAS[etKey], L = et.L, N = Math.max(1, +par.domN || 3);
  const dad = escPessoas(l, sec, par);
  const B = par.base === 'ocupado' ? dad.ocupado : dad.padrao;
  const res = { et, etKey, L, N, dad, B, alvo: par.alvo, notas: [], grupos: [], reserva: 0 };
  const manual = par.modo === 'manual';
  if (par.alvo === '12x36') {
    const pp = escPostos12(par, B), h = +par.h12 || 12;
    const c = esc12Calc(pp.p24, pp.p12, h, etKey === 'hoje' ? 44 : L);
    Object.assign(res, { p24: pp.p24, p12: pp.p12, h12: h, d12: c, P: c.P, frac: c.base + (c.ratio > 0 ? c.base * 3.5 * c.ratio / ((etKey === 'hoje' ? 44 : L) / h) : 0) });
    res.reserva = manual ? Math.ceil(c.base * (+par.reserva || 0) / 100 - 1e-9) : 0;
    res.total = res.P + res.reserva;
    if (c.ratio > 0) res.notas.push(`No 12x36 a média é de ${fmt(c.media, 1)}h por semana, acima do limite de ${L}h: cada pessoa precisa de cerca de ${fmt(3.5 * c.ratio * 4.33, 1)} folga(s) extra(s) por mês, cobertas por folguista.`);
    else res.notas.push(`No 12x36 a média é de ${fmt(c.media, 1)}h por semana, dentro do limite de ${etKey === 'hoje' ? 44 : L}h.`);
    res.notas.push('O 12x36 depende de previsão em convenção ou acordo coletivo (CLT, art. 59-A); confirmar na CCT após a EC 141/2026.');
    return res;
  }
  // 5x2
  const esc = etKey === 'hoje' ? '6x1' : '5x2';
  const j = escJornada(esc, L, par.cct);
  res.jornada = j; res.esc = esc;
  let postos = null; // [{H:[7], n:[7]}]
  if (manual) {
    const tipo = d => d < 5 ? 'sem' : d === 5 ? 'sab' : 'dom';
    postos = [{ H: [0, 1, 2, 3, 4, 5, 6].map(d => escHorasDia(par.h[tipo(d)].a, par.h[tipo(d)].f)), n: [0, 1, 2, 3, 4, 5, 6].map(d => Math.max(0, +par.p[tipo(d)] || 0)), ini: [0, 1, 2, 3, 4, 5, 6].map(d => escHora(par.h[tipo(d)].a)) }];
  } else if (par.atual === '12x36') {
    const pp = escPostos12(par, B);
    postos = [];
    if (pp.p24) postos.push({ H: new Array(7).fill(24), n: new Array(7).fill(pp.p24), ini: new Array(7).fill(7) });
    if (pp.p12) postos.push({ H: new Array(7).fill(12), n: new Array(7).fill(pp.p12), ini: new Array(7).fill(7) });
    res.notas.push(`Conversão do 12x36 atual (${pp.p24 ? pp.p24 + ' posto(s) 24h' : ''}${pp.p24 && pp.p12 ? ' + ' : ''}${pp.p12 ? pp.p12 + ' posto(s) 12h' : ''}) para turnos de ${escDur(j)}. Turno noturno tem hora reduzida e adicional (CLT, art. 73).`);
  }
  if (postos) {
    const G = Math.max(0, ...postos.flatMap(p => p.H.map(H => escTurnosDia(H, j))));
    for (let g = 0; g < G; g++) {
      const dem = [0, 1, 2, 3, 4, 5, 6].map(d => sum(postos, p => g < escTurnosDia(p.H[d], j) ? p.n[d] : 0));
      const t = postos[0], T0 = escTurnosDia(t.H[0], j), span = j + 1;
      let ini = t.ini[0] != null ? t.ini[0] : 7;
      if (T0 > 1) ini = ini + g * (t.H[0] - span) / (T0 - 1); else ini = ini + g * span;
      res.grupos.push({ cod: G > 1 ? String.fromCharCode(65 + g) : 'T', dem, ini: escHHMM(ini), fim: escHHMM(ini + span) });
    }
  } else {
    const dem = escDemAuto(par, B, N);
    res.grupos.push({ cod: 'T', dem, ini: '', fim: '' });
  }
  res.grupos.forEach(g => {
    if (esc === '6x1') { const tot = sum(g.dem); g.P = tot ? Math.max(Math.ceil(tot / 6 - 1e-9), N > 1 ? Math.ceil(g.dem[6] * N / (N - 1) - 1e-9) : 0, Math.max(...g.dem)) : 0; g.semente = 0; }
    else { const m = escMinimo5x2(g.dem, N); g.P = m.P || 0; g.semente = m.semente || 0; g.aprox = m.aprox; }
  });
  res.P = sum(res.grupos, g => g.P);
  const dv = esc === '6x1' ? 6 : 5;
  res.frac = sum(res.grupos, g => Math.max(sum(g.dem) / dv, N > 1 ? g.dem[6] * N / (N - 1) : 0, Math.max(...g.dem)));
  res.reserva = manual ? Math.ceil(res.P * (+par.reserva || 0) / 100 - 1e-9) : 0;
  res.total = res.P + res.reserva;
  res.frac += res.reserva;
  res.dem = [0, 1, 2, 3, 4, 5, 6].map(d => sum(res.grupos, g => g.dem[d]));
  if (esc === '5x2') {
    if (L === 42) res.notas.push(par.cct ? 'Jornada de 8h24 por dia (42h em 5 dias): só vale se a convenção ou acordo coletivo autorizar, no ano de transição.' : 'Sem autorização da convenção para 8h24, a conta usa 8h por dia (40h em 5 dias) já a partir de 15/12/2026.');
    if (!manual && par.atual === '6x1') res.notas.push('Modo automático: mantém, em cada dia, a mesma quantidade de pessoas trabalhando que o quadro padrão dá hoje na 6x1. Cada pessoa passa de 6 para 5 dias por semana.');
    if (!manual && par.atual === '5x2') res.notas.push('O setor já folga sábado e domingo: as pessoas são as mesmas, mas a jornada diária cai de 8h48 para ' + escDur(j) + '. Se o horário de atendimento precisar ser mantido, use o modo manual.');
  }
  return res;
}
const escSaldoBadge = (s, big) => s >= 0 ? `<span class="badge b-ok" ${big ? 'style="font-size:13px;padding:5px 10px"' : ''}>${s > 0 ? '+' + fmt(s) + ' a mais' : 'Cobre exato'}</span>` : `<span class="badge b-bad" ${big ? 'style="font-size:13px;padding:5px 10px"' : ''}>Faltam ${fmt(-s)}</span>`;

/* ---------------- grade do mês ---------------- */
function escGrade(res, par, ano, mes, vis) {
  const { dias, ini, fim } = escDiasMes(ano, mes);
  const noMes = d => d >= ini && d <= fim;
  const pess = res.dad.pessoas.slice();
  const linhas = []; // {nome, funcao, turno, cells[], tipo}
  let conf = [], dem = null, cov = null, excedentes = [];
  const pegar = () => { const r = pess.shift(); return r ? { nome: r.nome, funcao: r.funcao } : null; };
  let nContr = 0;
  if (res.alvo === '12x36') {
    const L = res.etKey === 'hoje' ? 44 : res.L;
    const g = escGerar12x36(res.p24, res.p12, res.h12, L, dias, ini, fim);
    g.pessoas.forEach(p => { const r = pegar(); linhas.push({ nome: r ? r.nome : vis === 'atual' ? 'SEM COBERTURA' : 'A CONTRATAR ' + (++nContr), funcao: r ? r.funcao : '', turno: p.slot.c === 'D' ? 'Diurno ' + p.slot.n : 'Noturno ' + p.slot.n, cells: p.cells, tipo: r ? '' : vis === 'atual' ? 'desc' : 'nova' }); });
    g.folg.forEach((f, i) => { const r = vis === 'atual' ? pegar() : (pess.length ? pegar() : null); linhas.push({ nome: r ? r.nome : vis === 'atual' ? 'SEM COBERTURA' : 'A CONTRATAR ' + (++nContr), funcao: r ? r.funcao : '', turno: 'Folguista', cells: f.cells, tipo: r ? '' : vis === 'atual' ? 'desc' : 'nova' }); });
    excedentes = pess;
    const slots = res.p24 * 2 + res.p12;
    dem = dias.map(() => slots);
    cov = dias.map((d, i) => linhas.filter(x => x.tipo !== 'desc' && /^(D|N)$/.test(x.cells[i])).length);
    return { dias, ini, fim, noMes, linhas, conf, dem, cov, excedentes, legenda: [['D', 'Plantão diurno 12h'], ['N', 'Plantão noturno 12h'], ['F', 'Folga'], ['FE', 'Folga extra (limite de ' + L + 'h)']] };
  }
  if (res.esc !== '5x2') return null;
  const W = dias.length / 7;
  let Ps = res.grupos.map(g => g.P);
  if (vis === 'atual') { // divide o quadro atual entre os turnos, na proporção do necessário
    const C = pess.length, T = sum(Ps) || 1;
    const q = Ps.map(p => C * p / T), b = q.map(Math.floor); let r = C - sum(b);
    q.map((x, i) => [x - b[i], i]).sort((a, z) => z[0] - a[0]).forEach(([, i]) => { if (r > 0) { b[i]++; r--; } });
    Ps = b;
  }
  dem = dias.map(() => 0); cov = dias.map(() => 0);
  res.grupos.forEach((g, gi) => {
    const P = Ps[gi]; if (!P && !sum(g.dem)) return;
    const grid = P ? escGerar5x2(P, g.dem, W, res.N, vis === 'atual' ? 0 : g.semente) : [];
    conf = conf.concat(escConferir(grid, res.N).map(x => Object.assign(x, { g: gi })));
    const off = linhas.length;
    grid.forEach((row, i) => {
      const r = pegar();
      linhas.push({ nome: r ? r.nome : 'A CONTRATAR ' + (++nContr), funcao: r ? r.funcao : '', turno: g.cod === 'T' ? '' : 'Turno ' + g.cod + (g.ini ? ' · ' + g.ini + '–' + g.fim : ''), cells: row.map(t => t ? g.cod : 'F'), tipo: r ? '' : 'nova' });
    });
    conf.forEach(x => { if (x.g === gi && x.l == null) x.l = off + x.i; });
    dias.forEach((d, i) => { dem[i] += g.dem[i % 7]; cov[i] += grid.filter(rw => rw[i]).length; });
  });
  excedentes = pess;
  const leg = []; res.grupos.forEach(g => leg.push([g.cod, g.cod === 'T' ? 'Trabalha' : 'Turno ' + g.cod + (g.ini ? ' (' + g.ini + '–' + g.fim + ', ' + escDur(res.jornada) + ' + 1h intervalo)' : '')]));
  leg.push(['F', 'Folga']);
  return { dias, ini, fim, noMes, linhas, conf, dem, cov, excedentes, legenda: leg };
}
function escCss() {
  if (document.getElementById('escCss')) return;
  const st = document.createElement('style'); st.id = 'escCss';
  st.textContent = `
  .esc-par summary{cursor:pointer;font-weight:700;display:flex;align-items:center;gap:8px;list-style:none}
  .esc-par summary::-webkit-details-marker{display:none}
  .esc-par[open] summary .chev{transform:rotate(180deg)}
  .esc-par .chev{margin-left:auto;transition:.2s}
  .esc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-top:14px}
  .esc-grid .field{margin:0}
  .esc-hr{display:grid;grid-template-columns:1fr 1fr 70px;gap:6px;align-items:center}
  .esc-hr span{font-size:12px;font-weight:700;color:var(--muted)}
  .esc-ver{display:flex;gap:14px;align-items:flex-start}
  .esc-ver .ico{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--kc) 15%,transparent);color:var(--kc)}
  .esc-ver h3{margin:0 0 4px;font-size:16px}
  .esc-ver p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
  .esc-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .esc-dia{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 6px;text-align:center}
  .esc-dia b{display:block;font-size:20px;letter-spacing:-.02em}
  .esc-dia span{font-size:11px;color:var(--muted);font-weight:700}
  .esc-dia.dom{border-color:color-mix(in srgb,#ef4444 45%,transparent)}
  .esc-dia small{display:block;font-size:10.5px;color:var(--faint);margin-top:2px}
  .esc-tbl{border-collapse:separate;border-spacing:0;font-size:11.5px;min-width:100%}
  .esc-tbl th,.esc-tbl td{border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:0;text-align:center;height:30px;min-width:30px}
  .esc-tbl thead th{position:sticky;top:0;background:#1F3864;color:#fff;font-weight:700;font-size:10.5px;z-index:2;padding:3px 0;line-height:1.15}
  .esc-tbl thead th.dom{background:#9C3A3A}
  .esc-tbl .nm{position:sticky;left:0;background:var(--surface);text-align:left;padding:4px 10px;min-width:190px;max-width:230px;z-index:1}
  .esc-tbl thead .nm{z-index:3;background:#1F3864}
  .esc-tbl .nm b{display:block;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .esc-tbl .nm small{color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
  .esc-tbl tr.nova .nm b{color:var(--warn)} .esc-tbl tr.desc .nm b{color:var(--bad)}
  .esc-tbl td.c{font-weight:800}
  .esc-tbl td.cF{background:#FCE4D6;color:#C00000}
  .esc-tbl td.cFE{background:#FFE0B2;color:#9a3412;font-size:10px}
  .esc-tbl td.cW{background:color-mix(in srgb,var(--ok) 12%,transparent);color:var(--ok)}
  .esc-tbl td.cW.dom{background:#FFE0B2;color:#375623}
  .esc-tbl tr.desc td.cW{background:var(--bad-bg);color:var(--bad)}
  .esc-tbl tr.cov td{font-weight:800;font-size:11px;background:var(--surface2)}
  .esc-tbl tr.cov td.falta{background:var(--bad-bg);color:var(--bad)}
  .esc-tbl tr.cov .nm{background:var(--surface2)}
  .esc-tbl tr.sep td{height:8px;background:var(--surface2)}
  .esc-leg{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--muted);margin-top:10px}
  .esc-leg i{display:inline-grid;place-items:center;min-width:24px;height:20px;border-radius:5px;font-style:normal;font-weight:800;font-size:11px;margin-right:4px}
  .esc-rules{margin:0;padding-left:18px;color:var(--muted);font-size:12.5px;line-height:1.7}
  @media (max-width:860px){.esc-dias{gap:4px}.esc-dia{padding:8px 2px}.esc-dia b{font-size:16px}.esc-tbl .nm{min-width:130px;max-width:150px}.esc-ver{flex-direction:column}}
  `;
  document.head.appendChild(st);
}
const ESC_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function escMesPadrao(etKey) {
  const t = new Date(); let a = t.getFullYear(), m = t.getMonth() + 1; if (m > 11) { m = 0; a++; }
  const min = etKey === 'e42' ? [2026, 11] : etKey === 'e40' ? [2027, 11] : null;
  if (min && (a < min[0] || (a === min[0] && m < min[1]))) { a = min[0]; m = min[1]; }
  return a + '-' + String(m + 1).padStart(2, '0');
}

/* ---------------- página ---------------- */
function pgEscala() {
  escCss();
  setTitle('Simulador de escalas', '5x2 e 12x36 · fim da escala 6x1 (EC 141/2026)');
  if (!DEMO && (!S.escParT || Date.now() - S.escParT > 60000)) { S.escParT = Date.now(); escParCarregar(true); }
  const f = getF('escala');
  const lojas = S.data.lojas;
  if (!f.loja || !lojaBy(f.loja)) f.loja = (lojas.find(l => !isAdmLoja(l)) || lojas[0] || {}).key;
  const l = lojaBy(f.loja); if (!l) { $('#view').innerHTML = `<div class="empty">${ic('store')}<div>Nenhuma loja disponível</div></div>`; return; }
  if (!ESC_ETAPAS[f.et]) f.et = 'e42';
  if (f.setor && !l.setores.some(s => s.nome === f.setor)) f.setor = '';
  if (!/^\d{4}-\d{2}$/.test(f.mes || '')) f.mes = escMesPadrao(f.et);
  if (!f.vis) f.vis = 'nec';
  const sec = f.setor ? l.setores.find(s => s.nome === f.setor) : null;
  const v = $('#view');
  v.innerHTML = `
  <div class="toolbar" style="margin-top:0">
    <select class="input" id="eLoja">${lojas.map(x => `<option value="${x.key}" ${x.key === l.key ? 'selected' : ''}>${h(isAdmLoja(x) ? 'Administrativo' : x.nome)}</option>`).join('')}</select>
    <select class="input" id="eSetor" style="min-width:220px"><option value="">Visão da loja (todos os setores)</option>${l.setores.map(s => `<option ${s.nome === f.setor ? 'selected' : ''}>${h(s.nome)}</option>`).join('')}</select>
    <div class="seg" id="eEt">${Object.keys(ESC_ETAPAS).map(k => `<button data-v="${k}" class="${f.et === k ? 'on' : ''}">${h(ESC_ETAPAS[k].curto)}</button>`).join('')}</div>
    <span class="spacer"></span>
    ${sec ? '' : `<button class="btn" id="eExpL">${ic('download')} Exportar</button>`}
  </div>
  <div id="eBody"></div>`;
  $('#eLoja').onchange = e => { f.loja = e.target.value; f.setor = ''; saveF(); route(); };
  $('#eSetor').onchange = e => { f.setor = e.target.value; saveF(); route(); };
  $$('#eEt button').forEach(b => b.onclick = () => { f.et = b.dataset.v; f.mes = escMesPadrao(f.et); saveF(); route(true); });
  if (!sec) return escVisaoLoja(l, f);
  escSetor(l, sec, f);
}
function escVisaoLoja(l, f) {
  const body = $('#eBody');
  const linhas = l.setores.map(s => {
    const par = escPar(l, s.nome), r = escCalc(l, s, par, f.et);
    return { s, par, r, saldo: Math.round((r.dad.ocupado - r.total) * 100) / 100, saldoPad: Math.round((r.dad.padrao - r.total) * 100) / 100 };
  }).filter(x => x.r.dad.rows.length);
  const tot = k => Math.round(sum(linhas, x => k(x)) * 100) / 100;
  const nec = tot(x => x.r.total), oc = tot(x => x.r.dad.ocupado), pad = tot(x => x.r.dad.padrao), minC = Math.ceil(tot(x => x.r.frac || 0) - 1e-9);
  const falta = linhas.filter(x => x.saldo < 0);
  body.innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Quadro padrão hoje', val: fmt(pad), sub: 'soma dos setores (FTE)', icon: 'grid', c: 'c-slate' })}
    ${kpi({ lbl: 'Ocupado hoje', val: fmt(oc), sub: 'sem aprendizes e estagiários', icon: 'users', c: 'c-cyan' })}
    ${kpi({ lbl: 'Necessário · ' + ESC_ETAPAS[f.et].curto, val: fmt(nec), sub: `${nec - pad >= 0 ? '+' : ''}${fmt(nec - pad)} vs padrão · mínimo ${minC} com folguistas entre setores`, icon: 'calendar', title: 'O necessário arredonda cada setor para cima. O mínimo considera folguistas que cobrem folgas de mais de um setor.', c: 'c-violet' })}
    ${kpi({ lbl: 'Saldo do quadro atual', val: (oc - nec >= 0 ? '+' : '') + fmt(oc - nec), sub: falta.length ? `${falta.length} setor(es) sem cobertura` : 'todos os setores cobertos', icon: oc - nec >= 0 ? 'check' : 'alert', c: oc - nec >= 0 ? 'c-green' : 'c-red' })}
  </div>
  <div class="card mt" style="margin-top:16px">
    <div class="card-h"><div><h3>${h(isAdmLoja(l) ? 'Administrativo' : l.nome)} · setores</h3><div class="sub">Toque em um setor para ver a escala montada, ajustar horários e postos</div></div></div>
    <div id="eTbl"></div>
  </div>`;
  table($('#eTbl'), 'escLoja', [
    { t: 'Setor', k: 'set', r: x => `<b>${h(x.s.nome)}</b><div class="faint" style="font-size:11.5px">${x.par.modo === 'manual' ? 'Horários e postos informados' : 'Automático pelo quadro'}</div>`, sort: x => x.s.nome },
    { t: 'Escala', k: 'esc', r: x => `<span class="badge">${h(x.par.atual)}</span> → <span class="badge b-acc">${h(f.et === 'hoje' ? (x.par.alvo === '12x36' ? '12x36' : '6x1') : x.par.alvo)}</span>`, sort: x => x.par.alvo },
    { t: 'Padrão', k: 'pad', r: x => fmt(x.r.dad.padrao), sort: x => x.r.dad.padrao },
    { t: 'Ocupado', k: 'oc', r: x => fmt(x.r.dad.ocupado), sort: x => x.r.dad.ocupado },
    { t: 'Necessário', k: 'nec', r: x => `<b>${fmt(x.r.total)}</b>${x.r.reserva ? `<div class="faint" style="font-size:11px">${x.r.P} + ${x.r.reserva} reserva</div>` : ''}`, sort: x => x.r.total },
    { t: 'Equivalente', k: 'fr', r: x => `<span class="muted">${fmt(x.r.frac || 0, 1)}</span>`, sort: x => x.r.frac || 0 },
    { t: 'Saldo', k: 'sal', r: x => escSaldoBadge(x.saldo), sort: x => x.saldo }
  ], linhas, x => { f.setor = x.s.nome; saveF(); route(); });
    const exp = $('#eExpL'); if (exp) exp.onclick = () => exportCSV('escala_' + l.key, ['Setor', 'Escala hoje', 'Escala alvo', 'Padrão', 'Ocupado', 'Necessário', 'Reserva', 'Saldo'], linhas.map(x => [x.s.nome, x.par.atual, x.par.alvo, fmt(x.r.dad.padrao), fmt(x.r.dad.ocupado), x.r.P, x.r.reserva, fmt(x.saldo)]));
}
function escSetor(l, sec, f) {
  const body = $('#eBody');
  const par = escPar(l, sec.nome);
  const res = escCalc(l, sec, par, f.et);
  const dad = res.dad;
  const set = (k, val) => { if (!podeEscala()) return; par[k] = val; escParEnviar(escParKey(l.key, sec.nome), par); route(true); };
  const saldo = Math.round((dad.ocupado - res.total) * 100) / 100, saldoPad = Math.round((dad.padrao - res.total) * 100) / 100;
  const futuro = Math.round((dad.ocupado - dad.aviso - res.total) * 100) / 100;
  // comparativo por etapa
  const etapas = Object.keys(ESC_ETAPAS).map(k => ({ k, r: k === f.et ? res : escCalc(l, sec, par, k) }));
  let alt = null;
  if (par.alvo === '12x36' && f.et !== 'hoje') alt = escCalc(l, sec, Object.assign({}, par, { alvo: '5x2', atual: '12x36', modo: par.modo === 'manual' ? 'auto' : par.modo }), f.et);
  const [ano, mes] = f.mes.split('-').map(Number);
  const gr = escGrade(res, par, ano, mes - 1, f.vis);
  const domFolga = par.domN > 1 ? `um domingo de folga a cada ${par.domN} semanas` : 'folga em todos os domingos';
  // veredito
  let vt, vc, vi;
  if (!res.total) { vt = 'Sem demanda calculada'; vc = 'c-slate'; vi = 'alert'; }
  else if (saldo >= 0) { vt = saldo > 0 ? `O quadro de hoje cobre, com ${fmt(saldo)} a mais` : 'O quadro de hoje cobre exatamente'; vc = 'c-green'; vi = 'check'; }
  else { vt = `O quadro de hoje não cobre: faltam ${fmt(-saldo)} pessoa(s)`; vc = 'c-red'; vi = 'alert'; }
  const limDom = res.grupos && res.grupos.length && res.N > 1 && res.esc === '5x2' && res.grupos.some(g => g.P === Math.ceil(g.dem[6] * res.N / (res.N - 1) - 1e-9) && g.P > Math.ceil(sum(g.dem) / 5 - 1e-9));
  const vtxt = res.alvo === '12x36'
    ? `${res.slots || res.d12.slots} posto(s) de 12h por dia (${res.p24} de 24h e ${res.p12} de 12h) pedem ${res.d12.base} plantonistas${res.d12.folg ? ` e ${res.d12.folg} folguista(s)` : ''}${res.reserva ? `, mais ${res.reserva} de reserva para férias` : ''}. Hoje há ${fmt(dad.ocupado)} ocupado(s) e ${fmt(dad.padrao)} no padrão.`
    : `Na ${res.esc === '6x1' ? 'escala 6x1 atual' : 'escala 5x2'} (${escDur(res.jornada)} por dia${res.esc === '5x2' ? ', 2 folgas por semana' : ''}, ${domFolga}), o setor precisa de <b>${res.P}</b> pessoa(s) na grade${res.reserva ? ` + <b>${res.reserva}</b> de reserva para férias e faltas` : ''}. Hoje há <b>${fmt(dad.ocupado)}</b> ocupado(s) e <b>${fmt(dad.padrao)}</b> no padrão (${saldoPad >= 0 ? 'o padrão cobre' : 'o padrão precisa de +' + fmt(-saldoPad)}).${limDom ? ' O domingo é o que limita: com a regra de folga dominical, só parte da equipe pode trabalhar em cada domingo.' : ''}${dad.aviso ? ` Há ${dad.aviso} pessoa(s) em aviso prévio: depois das saídas, o saldo fica em ${fmt(futuro)}.` : ''}`;
  const tipoTxt = { auto: 'Automático pelo quadro', manual: 'Horários e postos informados' };
  const hr = (k, lbl) => `<div class="esc-hr" style="margin-bottom:6px"><span style="grid-column:1/-1">${lbl}</span><small class="faint">Abre</small><small class="faint">Fecha</small><small class="faint">Postos</small><input class="input" type="time" data-h="${k}.a" value="${h(par.h[k].a)}"><input class="input" type="time" data-h="${k}.f" value="${h(par.h[k].f)}"><input class="input" type="number" min="0" data-p="${k}" value="${h(par.p[k])}" title="Pessoas trabalhando ao mesmo tempo (postos)"></div>`;
  body.innerHTML = `
  <details class="card esc-par" id="ePar" ${f.parOpen ? 'open' : ''}>
    <summary>${ic('settings')} Parâmetros do setor <span class="badge b-acc" style="margin-left:6px">${h(tipoTxt[par.modo])}</span><span class="badge">${h(par.atual)} → ${h(par.alvo)}</span><span class="chev">${ic('chevron')}</span></summary>
    <div class="esc-grid">
      <div class="field"><label>Como calcular</label><div class="seg" id="pModo"><button data-v="auto" class="${par.modo === 'auto' ? 'on' : ''}">Automático</button><button data-v="manual" class="${par.modo === 'manual' ? 'on' : ''}">Manual</button></div></div>
      <div class="field"><label>Escala de hoje</label><select class="input" id="pAtual"><option value="6x1" ${par.atual === '6x1' ? 'selected' : ''}>6x1 (44h)</option><option value="5x2" ${par.atual === '5x2' ? 'selected' : ''}>5x2 seg–sex (44h)</option><option value="12x36" ${par.atual === '12x36' ? 'selected' : ''}>12x36</option></select></div>
      <div class="field"><label>Escala nova</label><select class="input" id="pAlvo"><option value="5x2" ${par.alvo === '5x2' ? 'selected' : ''}>5x2</option><option value="12x36" ${par.alvo === '12x36' ? 'selected' : ''}>12x36</option></select></div>
      <div class="field"><label>Folga no domingo a cada (semanas)</label><input class="input" type="number" min="1" max="8" id="pDom" value="${h(par.domN)}"></div>
      ${par.modo === 'auto' ? `<div class="field"><label>Base do cálculo</label><select class="input" id="pBase"><option value="padrao" ${par.base === 'padrao' ? 'selected' : ''}>Quadro padrão (${fmt(dad.padrao)})</option><option value="ocupado" ${par.base === 'ocupado' ? 'selected' : ''}>Ocupado hoje (${fmt(dad.ocupado)})</option></select></div>` : `<div class="field"><label>Reserva p/ férias e faltas (%)</label><input class="input" type="number" min="0" max="50" id="pRes" value="${h(par.reserva)}"></div>`}
      <div class="field"><label>Contrato parcial conta como</label><select class="input" id="pParc">${[[1, '1 pessoa'], [.5, '0,5 pessoa'], [0, 'Não conta']].map(([x, t]) => `<option value="${x}" ${+par.parcial === x ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px">
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" id="pCct" style="width:auto" ${par.cct ? 'checked' : ''}> Convenção autoriza 8h24 por dia na transição (42h)</label>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" id="pApr" style="width:auto" ${par.aprendiz ? 'checked' : ''}> Contar aprendizes${dad.aprend ? ` (${dad.aprend})` : ''}</label>
    </div>
    ${par.modo === 'manual' && par.alvo === '5x2' ? `<div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Funcionamento do setor e pessoas ao mesmo tempo</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">${hr('sem', 'Segunda a sexta')}${hr('sab', 'Sábado')}${hr('dom', 'Domingo')}</div>
      <div class="faint" style="font-size:11.5px">Postos = pessoas que precisam estar trabalhando ao mesmo tempo. Cada turno cobre ${escDur(res.jornada || 8)} + 1h de intervalo; o sistema calcula quantos turnos o horário pede.</div></div>` : ''}
    ${par.alvo === '12x36' || (par.atual === '12x36' && par.modo === 'manual') ? `<div class="esc-grid">
      <div class="field"><label>Postos 24h (diurno + noturno)</label><input class="input" type="number" min="0" id="p24" value="${h(res.p24 != null ? res.p24 : par.p24)}" ${par.modo === 'auto' ? 'disabled title="No automático vem do quadro; mude para Manual para editar"' : ''}></div>
      <div class="field"><label>Postos 12h (só diurno)</label><input class="input" type="number" min="0" id="p12" value="${h(res.p12 != null ? res.p12 : par.p12)}" ${par.modo === 'auto' ? 'disabled' : ''}></div>
      <div class="field"><label>Horas por plantão</label><select class="input" id="pH12"><option value="12" ${+par.h12 === 12 ? 'selected' : ''}>12h (intervalo indenizado)</option><option value="11" ${+par.h12 === 11 ? 'selected' : ''}>11h (1h de intervalo)</option></select></div>
    </div>` : ''}
    <div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Funções consideradas</div>
      <div class="chips" id="pFun">${dad.funcoes.map(fn => `<span class="chip ${(par.fora || []).map(norm).includes(norm(fn)) ? '' : 'on'}" data-fn="${h(fn)}">${h(fn)}</span>`).join('')}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      <button class="btn" id="pReset">${ic('eraser')} Restaurar padrão</button>
      <span class="faint" style="font-size:11.5px;align-self:center">${ic('check')} Salvo automaticamente para todos${par._por ? ` · última alteração: ${h(par._por)}${par._em && par._em !== 'agora' ? ' em ' + h(par._em) : ''}` : ''}</span>
    </div>
  </details>

  <div class="grid g4" style="margin-top:16px">
    ${kpi({ lbl: 'Quadro padrão hoje', val: fmt(dad.padrao), sub: `${dad.vagas} vaga(s) em aberto`, icon: 'grid', c: 'c-slate' })}
    ${kpi({ lbl: 'Ocupado hoje', val: fmt(dad.ocupado), sub: dad.aviso ? `${dad.aviso} em aviso prévio` : 'sem aprendizes e estagiários', icon: 'users', c: 'c-cyan' })}
    ${kpi({ lbl: 'Necessário · ' + res.et.curto, val: `${res.total}`, title: `Equivale a ${fmt(res.frac || 0, 1)} pessoa(s) em tempo integral; a diferença para o número inteiro pode ser coberta por folguista de outro setor.`, sub: res.reserva ? `${res.P} na grade + ${res.reserva} reserva` : res.alvo === '12x36' ? `${res.d12.base} plantonistas + ${res.d12.folg} folguista(s)` : `${res.grupos.length > 1 ? res.grupos.map(g => g.cod + ': ' + g.P).join(' · ') : 'pessoas na grade'}`, icon: 'calendar', c: 'c-violet' })}
    ${kpi({ lbl: 'Saldo do quadro atual', val: (saldo >= 0 ? '+' : '') + fmt(saldo), sub: saldo >= 0 ? 'cobre a escala' : 'precisa contratar', icon: saldo >= 0 ? 'check' : 'alert', c: saldo >= 0 ? 'c-green' : 'c-red' })}
  </div>

  <div class="card" style="margin-top:16px"><div class="esc-ver ${vc}"><div class="ico">${ic(vi)}</div><div><h3>${h(vt)}</h3><p>${vtxt}</p>${res.notas.length ? `<ul class="esc-rules" style="margin-top:8px">${res.notas.map(n => `<li>${h(n)}</li>`).join('')}</ul>` : ''}</div></div></div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="card-h"><div><h3>Comparativo por etapa</h3><div class="sub">O que muda até a jornada de 40h</div></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Etapa</th><th>Escala</th><th>Necessário</th><th>Saldo</th></tr></thead><tbody>
      ${etapas.map(x => { const sl = Math.round((dad.ocupado - x.r.total) * 100) / 100; return `<tr ${x.k === f.et ? 'style="background:var(--acc-bg)"' : ''}><td><b>${h(x.r.et.curto)}</b></td><td>${x.r.alvo === '12x36' ? '12x36' : h(x.r.esc) + ' · ' + escDur(x.r.jornada) + '/dia'}</td><td><b>${x.r.total}</b></td><td>${escSaldoBadge(sl)}</td></tr>`; }).join('')}
      ${alt ? `<tr><td><b>Alternativa</b></td><td>5x2 · ${escDur(alt.jornada)}/dia em turnos</td><td><b>${alt.total}</b></td><td>${escSaldoBadge(Math.round((dad.ocupado - alt.total) * 100) / 100)}</td></tr>` : ''}
      </tbody></table></div></div>
    <div class="card"><div class="card-h"><div><h3>Pessoas por dia</h3><div class="sub">${res.alvo === '12x36' ? 'Plantonistas por dia' : 'Necessário trabalhando × grade do mês (1ª semana)'}</div></div></div>
      <div class="esc-dias">${ESC_DIAS.map((d, i) => { const need = res.alvo === '12x36' ? (res.p24 * 2 + res.p12) : res.dem ? res.dem[i] : 0; const w0 = gr ? gr.dias.findIndex((x, k) => k % 7 === i && gr.noMes(x)) : -1; const cv = gr && w0 >= 0 ? gr.cov[w0] : null; return `<div class="esc-dia ${i === 6 ? 'dom' : ''}"><span>${d}</span><b>${need}</b>${cv != null ? `<small style="${cv < need ? 'color:var(--bad)' : ''}">grade: ${cv}</small>` : ''}</div>`; }).join('')}</div>
      ${res.grupos && res.grupos.length > 1 ? `<div class="faint" style="font-size:11.5px;margin-top:10px">${res.grupos.map(g => `Turno ${g.cod}: ${g.ini}–${g.fim}`).join(' · ')}</div>` : ''}
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card-h" style="flex-wrap:wrap"><div><h3>Escala do mês</h3><div class="sub">${gr ? `${ESC_MESES[mes - 1]} de ${ano} · montada automaticamente` : 'Selecione a etapa de 15/12/2026 ou dez/2027 para montar a 5x2'}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input class="input" type="month" id="eMes" value="${h(f.mes)}" style="width:auto;padding:7px 10px">
        <div class="seg" id="eVis"><button data-v="nec" class="${f.vis === 'nec' ? 'on' : ''}">Necessário</button><button data-v="atual" class="${f.vis === 'atual' ? 'on' : ''}">Só quem já está</button></div>
        ${gr ? `<button class="btn" id="eXls" title="Excel">${ic('download')}</button><button class="btn" id="ePdf" title="PDF para o quadro de avisos">${ic('file')} PDF</button>` : ''}
      </div></div>
    <div id="eGrade">${gr ? escGradeHTML(gr) : `<div class="empty">${ic('calendar')}<div>A grade de folgas é montada para a escala nova.</div></div>`}</div>
    ${gr ? `<div class="esc-leg">${gr.legenda.map(([c, t]) => `<span><i style="${escCorLeg(c)}">${h(c)}</i>${h(t)}</span>`).join('')}</div>` : ''}
    ${gr ? escConfHTML(gr, res, f) : ''}
  </div>

  <div class="card" style="margin-top:16px"><div class="card-h"><div><h3>Regras usadas no cálculo</h3><div class="sub">Confirmar sempre com a convenção coletiva (SECVGAF) e o jurídico</div></div></div>
    <ul class="esc-rules">
      <li>EC 141/2026: 2 dias de descanso por semana, um deles preferencialmente no domingo; 42h a partir de 15/12/2026 e 40h após 14 meses, sem redução de salário.</li>
      <li>Jornada de até 8h por dia; 8h24 só com convenção ou acordo coletivo durante a transição.</li>
      <li>Folga no domingo: ${h(domFolga)} (parâmetro do setor; Lei 10.101/2000 e convenção coletiva).</li>
      <li>Nunca 7 dias seguidos de trabalho (OJ 410 do TST); a grade é conferida pessoa a pessoa.</li>
      <li>11h de descanso entre jornadas (CLT, art. 66): cada pessoa fica em turno fixo e só a folga gira.</li>
      <li>Domingo ou feriado trabalhado sem folga compensatória é pago em dobro (Súmula 146 do TST). Feriados não entram nesta simulação.</li>
      <li>A escala do mês deve ser publicada antes do início do mês (CLT, art. 67, parágrafo único).</li>
    </ul></div>`;
  // eventos
  $('#ePar').ontoggle = e => { f.parOpen = e.target.open; saveF(); };
  $$('#pModo button').forEach(b => b.onclick = () => set('modo', b.dataset.v));
  $('#pAtual').onchange = e => { par.atual = e.target.value; if (e.target.value === '12x36') par.alvo = '12x36'; set('atual', par.atual); };
  $('#pAlvo').onchange = e => set('alvo', e.target.value);
  $('#pDom').onchange = e => set('domN', Math.max(1, Math.min(8, Math.round(+e.target.value || 3))));
  if ($('#pBase')) $('#pBase').onchange = e => set('base', e.target.value);
  if ($('#pRes')) $('#pRes').onchange = e => set('reserva', Math.max(0, Math.min(50, +e.target.value || 0)));
  $('#pParc').onchange = e => set('parcial', +e.target.value);
  $('#pCct').onchange = e => set('cct', e.target.checked);
  $('#pApr').onchange = e => set('aprendiz', e.target.checked);
  $$('[data-h]', body).forEach(i => i.onchange = () => { const [k, q] = i.dataset.h.split('.'); par.h[k] = Object.assign({}, par.h[k], { [q]: i.value }); set('h', par.h); });
  $$('[data-p]', body).forEach(i => i.onchange = () => { par.p[i.dataset.p] = Math.max(0, Math.round(+i.value || 0)); set('p', par.p); });
  if ($('#p24')) $('#p24').onchange = e => set('p24', Math.max(0, Math.round(+e.target.value || 0)));
  if ($('#p12')) $('#p12').onchange = e => set('p12', Math.max(0, Math.round(+e.target.value || 0)));
  if ($('#pH12')) $('#pH12').onchange = e => set('h12', +e.target.value);
  $$('#pFun .chip').forEach(c => c.onclick = () => { const fn = norm(c.dataset.fn), fo = (par.fora || []).map(norm); set('fora', fo.includes(fn) ? (par.fora || []).filter(x => norm(x) !== fn) : (par.fora || []).concat(c.dataset.fn)); });
  $('#pReset').onclick = async () => { if (!await confirmBox('Voltar os parâmetros deste setor para o padrão?', 'Restaurar')) return; escParEnviar(escParKey(l.key, sec.nome), null); route(true); };
  $('#eMes').onchange = e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { f.mes = e.target.value; saveF(); route(true); } };
  $$('#eVis button').forEach(b => b.onclick = () => { f.vis = b.dataset.v; saveF(); route(true); });
  if (gr) {
    const nomeArq = 'escala_' + l.key + '_' + norm(sec.nome).replace(/[^A-Z0-9]+/g, '_') + '_' + f.mes;
    const diasM = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
    $('#eXls').onclick = () => downloadCSV(nomeArq, ['Colaborador', 'Função', 'Turno', ...diasM.map(([d]) => d.getDate() + ' ' + ESC_DIAS[(d.getDay() + 6) % 7])], gr.linhas.map(x => [x.nome, x.funcao, x.turno, ...diasM.map(([, i]) => x.cells[i])]));
    $('#ePdf').onclick = () => escPDF(gr, res, l, sec, ano, mes - 1);
  }
}
function escCorLeg(c) { return c === 'F' ? 'background:#FCE4D6;color:#C00000' : c === 'FE' ? 'background:#FFE0B2;color:#9a3412' : 'background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok)'; }
function escGradeHTML(gr) {
  const idx = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
  const head = `<tr><th class="nm">Colaborador</th>${idx.map(([d]) => `<th class="${d.getDay() === 0 ? 'dom' : ''}">${ESC_DIAS[(d.getDay() + 6) % 7].slice(0, 3)}<br>${d.getDate()}</th>`).join('')}</tr>`;
  let ultimoTurno = null;
  const rows = gr.linhas.map(x => {
    const sep = ultimoTurno !== null && x.turno !== ultimoTurno ? `<tr class="sep"><td class="nm"></td>${idx.map(() => '<td></td>').join('')}</tr>` : '';
    ultimoTurno = x.turno;
    return sep + `<tr class="${x.tipo}"><td class="nm"><b title="${h(x.nome)}">${h(x.nome)}</b><small>${h([x.funcao, x.turno].filter(Boolean).join(' · '))}</small></td>${idx.map(([d, i]) => { const c = x.cells[i]; const k = c === 'F' ? 'cF' : c === 'FE' ? 'cFE' : 'cW'; return `<td class="c ${k} ${d.getDay() === 0 ? 'dom' : ''}">${h(c)}</td>`; }).join('')}</tr>`;
  }).join('');
  const cov = `<tr class="cov"><td class="nm"><b>Trabalhando / necessário</b></td>${idx.map(([, i]) => `<td class="${gr.cov[i] < gr.dem[i] ? 'falta' : ''}" title="${gr.cov[i]} de ${gr.dem[i]}">${gr.cov[i]}<span class="faint">/${gr.dem[i]}</span></td>`).join('')}</tr>`;
  return `<div class="tbl-wrap" style="max-height:70vh"><table class="esc-tbl"><thead>${head}</thead><tbody>${rows}${cov}</tbody></table></div>`;
}
function escConfHTML(gr, res, f) {
  const idx = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
  const falta = idx.filter(([, i]) => gr.cov[i] < gr.dem[i]);
  const desc = gr.linhas.filter(x => x.tipo === 'desc').length;
  const novos = gr.linhas.filter(x => x.tipo === 'nova').length;
  const it = [];
  if (res.alvo !== '12x36') it.push(gr.conf.length ? `<span class="badge b-bad">${gr.conf.length} alerta(s) legal(is)</span> ${h(uniq(gr.conf.map(x => (gr.linhas[x.l] || {}).nome + ': ' + x.t)).slice(0, 4).join(' · '))}` : `<span class="badge b-ok">${ic('check')} Conferida</span> 2 folgas por semana, no máximo 6 dias seguidos e folga dominical dentro da regra para todos.`);
  if (falta.length) it.push(`<span class="badge b-bad">${falta.length} dia(s) descoberto(s)</span> ${f.vis === 'atual' ? 'Com só quem já está no setor faltam pessoas nesses dias.' : 'Revise os postos ou aumente a equipe.'}`);
  else it.push(`<span class="badge b-ok">${ic('check')} Cobertura</span> Todos os dias do mês com a quantidade necessária.`);
  if (novos) it.push(`<span class="badge b-warn">${novos} a contratar</span> Linhas “A CONTRATAR” são as vagas que a escala pede além do quadro ocupado.`);
  if (desc) it.push(`<span class="badge b-bad">${desc} posição(ões) sem pessoa</span> Plantões sem cobertura com o quadro atual.`);
  if (gr.excedentes.length && f.vis === 'nec') it.push(`<span class="badge b-info">${gr.excedentes.length} além do necessário</span> ${h(gr.excedentes.slice(0, 6).map(r => r.nome).join(', '))}${gr.excedentes.length > 6 ? '…' : ''}`);
  return `<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;font-size:12.5px">${it.map(x => `<div>${x}</div>`).join('')}</div>`;
}
function escPDF(gr, res, l, sec, ano, mes) {
  const esc = h, logo = cfgv('logo', ''), agora = new Date();
  const idx = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
  const cor = c => c === 'F' ? 'background:#FCE4D6;color:#C00000' : c === 'FE' ? 'background:#FFE0B2;color:#9a3412' : '';
  const titulo = `Escala ${res.alvo === '12x36' ? '12x36' : '5x2'} · ${isAdmLoja(l) ? 'Administrativo' : l.nome} · ${sec.nome}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · ${ESC_MESES[mes]} ${ano}</title>
  <style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0f172a;margin:0;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{padding:12px}header{display:flex;align-items:center;gap:12px;margin-bottom:8px}header img{height:38px;max-width:120px;object-fit:contain}
  h1{margin:0;font-size:15px;background:#1F3864;color:#fff;padding:8px 12px;border-radius:4px;flex:1}
  table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #9ca3af;text-align:center;padding:2px 0;height:17px}
  th{background:#1F3864;color:#fff;font-size:8px}th.dom{background:#9C3A3A}td.nm{text-align:left;padding:2px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:150px}th.nm{width:150px}
  td{font-weight:700}tbody tr:nth-child(even) td.nm{background:#DDEBF7}td.dom{background:#FFE0B2;color:#375623}
  .leg{margin-top:8px;font-size:9px;color:#475569}.ass{display:flex;gap:40px;margin-top:28px}.ass div{flex:1;border-top:1px solid #0f172a;text-align:center;padding-top:4px}
  .bar{position:sticky;top:0;background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center}.bar button{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:700}
  @media print{.bar{display:none}.wrap{padding:0}}</style></head><body>
  <div class="bar"><span>Pré-visualização · escolha <b>Salvar como PDF</b></span><button onclick="window.print()">Imprimir / PDF</button></div>
  <div class="wrap"><header>${logo && /^(data:image\/|https:)/.test(logo) ? `<img src="${esc(logo)}">` : ''}<h1>${esc(titulo)} · ${ESC_MESES[mes]} de ${ano}</h1></header>
  <table><thead><tr><th class="nm">Colaborador</th>${idx.map(([d]) => `<th class="${d.getDay() === 0 ? 'dom' : ''}">${ESC_DIAS[(d.getDay() + 6) % 7].slice(0, 3)}<br>${d.getDate()}</th>`).join('')}</tr></thead>
  <tbody>${gr.linhas.map(x => `<tr><td class="nm"><b>${esc(x.nome)}</b>${x.turno ? ' · ' + esc(x.turno) : ''}</td>${idx.map(([d, i]) => `<td class="${d.getDay() === 0 && !/^F/.test(x.cells[i]) ? 'dom' : ''}" style="${cor(x.cells[i])}">${esc(x.cells[i])}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="leg">${gr.legenda.map(([c, t]) => `<b>${esc(c)}</b> = ${esc(t)}`).join(' · ')} · Gerado em ${agora.toLocaleString('pt-BR').slice(0, 17)} por ${esc(S.user.nome)}</div>
  <div class="ass"><div>Responsável pelo setor</div><div>Recursos Humanos</div></div></div>
  <script>setTimeout(function(){try{window.print()}catch(e){}},600)</script></body></html>`;
  const w = window.open('', '_blank'); if (!w) { toast('Permita pop-ups para gerar o PDF', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/* ---------------- router ---------------- */
function route(keep) {
  S.rt = (S.rt || 0) + 1;
  const sy = window.scrollY;
  S.charts.forEach(c => c.destroy()); S.charts = [];
  const hash = location.hash.replace(/^#/, '') || '/inicio';
  const [, page, arg] = hash.split('/');
  $$('#sbNav .nav, .mbar a[data-nav]').forEach(a => a.classList.toggle('active', hash.startsWith(a.dataset.nav)));
  const v = $('#view');
  v.innerHTML = '';
  try {
    if (page === 'loja' && lojaBy(arg)) pgLoja(lojaBy(arg));
    else if (page === 'vagas') pgVagas();
    else if (page === 'contratacoes') pgContr();
    else if (page === 'experiencias') pgExp();
    else if (page === 'admin' && isAdmin()) pgAdmin();
    else if (page === 'historico' && isAdmin()) pgLog();
    else if (page === 'perfil') pgPerfil();
    else if (page === 'desligamentos') pgDesl();
    else if (page === 'mobilidade' && temMob()) pgMob();
    else if (page === 'escalas' && podeEscala()) pgEscala();
    else if (page === 'aprovacoes' && isAdmin()) pgAprov();
    else if (page === 'solicitacoes') pgSolic();
    else pgDash();
    window.scrollTo(0, keep ? sy : 0);
  } catch (e) { console.error(e); v.innerHTML = `<div class="empty">${ic('alert')}<div>Erro ao montar a página: ${h(e.message)}</div></div>`; }
}
function getF(k) { return S.f[k] || (S.f[k] = {}); }
function saveF() { ls.set('grc_filters', S.f); }
function getV(k, d) { return S.view[k] || d; }
function setV(k, v) { S.view[k] = v; ls.set('grc_views', S.view); }

/* ---------------- charts ---------------- */
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function chart(canvas, cfg) {
  if (!window.Chart || !canvas) return;
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--border');
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 700 }, plugins: {} }, cfg.options || {});
  cfg.options.plugins = Object.assign({ legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', padding: 14 } }, tooltip: { backgroundColor: css('--surface3'), titleColor: css('--text'), bodyColor: css('--text'), borderColor: css('--border2'), borderWidth: 1, padding: 10, cornerRadius: 10, boxPadding: 4 } }, cfg.options.plugins);
  const c = new Chart(canvas, cfg);
  S.charts.push(c);
  return c;
}

/* ---------------- shared bits ---------------- */
function kpi({ lbl, val, sub, icon, c = 'c-cyan', bar, href, title }) {
  return `<div class="card kpi ${c}" ${href ? `style="cursor:pointer" onclick="location.hash='${href}'"` : ''} ${title ? `title="${h(title)}"` : ''}>
    <div class="top"><span class="lbl">${lbl}</span><div class="ico">${ic(icon)}</div></div>
    <div class="val">${val}</div>
    ${bar != null ? `<div class="bar"><i style="width:${Math.min(100, Math.max(0, bar))}%"></i></div>` : ''}
    ${sub ? `<div class="foot">${sub}</div>` : ''}
  </div>`;
}
function pendBadge(r) { const p = S.pendRows[r.loja + '|' + r.row]; return p ? `<span class="badge b-warn" title="${h(p.resumo)} — ${h(p.solicitante)}">${ic('clock')} Aguardando aprovação</span>` : ''; }
function sitBadge(r) {
  if (r.vagaAberta) return pendBadge(r) + '<span class="badge b-bad">VAGA</span>';
  const out = [];
  if (r.aviso) out.push('<span class="badge b-warn">EM AVISO</span>');
  if (r.troca) out.push('<span class="badge b-info">TROCA</span>');
  if (r.analise) out.push('<span class="badge b-violet">ANÁLISE</span>');
  if (r.vagaFutura && !r.aviso && !r.troca) out.push('<span class="badge b-warn">VAGA FUTURA</span>');
  if (!out.length) out.push('<span class="badge b-ok">OK</span>');
  return pendBadge(r) + out.join('');
}
function tagBadges(r) {
  const b = [];
  r.tags.forEach(t => {
    const n = norm(t);
    b.push(`<span class="badge ${/PCD/.test(n) ? 'b-pink' : /CIPA/.test(n) ? 'b-info' : /APRENDIZ/.test(n) ? 'b-violet' : 'b-acc'}">${h(t)}</span>`);
  });
  const ct = norm(r.contrato);
  if (ct && ct !== 'INTEGRAL' && !(/APRENDIZ/.test(ct) && r.tags.some(t => /APRENDIZ/i.test(t)))) b.push(`<span class="badge">${h(r.contrato)}</span>`);
  return b.join('');
}
function etapaBadge(e) {
  const m = { 'Aberta': 'b-bad', 'Divulgação': 'b-warn', 'Triagem': 'b-info', 'Entrevista': 'b-violet', 'Aprovado': 'b-acc', 'Admissão': 'b-ok' };
  return `<span class="badge ${m[e] || ''}">${h(e)}</span>`;
}
function diasBadge(d) {
  if (d == null) return '<span class="faint">—</span>';
  return `<span class="badge ${d > 30 ? 'b-bad' : d > 15 ? 'b-warn' : 'b-ok'}">${d} d</span>`;
}
function selectHTML(id, label, values, cur, allLabel = 'Todos') {
  return `<select class="input" id="${id}" title="${h(label)}"><option value="">${h(label)}: ${allLabel}</option>${values.map(v => `<option ${v === cur ? 'selected' : ''} value="${h(v)}">${h(v)}</option>`).join('')}</select>`;
}
const EXP_TIT = { vagas: 'Vagas', experiencias: 'Contratos de experiência', historico: 'Histórico de alterações', sla_vagas_abertas: 'SLA · vagas abertas', sla_vagas_fechadas: 'SLA · vagas fechadas', desligamentos: 'Desligamentos', contratacoes: 'Contratações' };
function expTitulo(name) { if (/_treino$/.test(name)) return expTitulo(name.replace(/_treino$/, '')) + ' · Em treinamento'; return EXP_TIT[name] || (name.indexOf('quadro_') === 0 ? 'Quadro · ' + ((lojaBy(name.slice(7).toUpperCase()) || {}).nome || name.slice(7)) : name); }
function exportCSV(name, head, rows) {
  if (!rows.length) return toast('Nada para exportar com esses filtros', true);
  modal({
    title: 'Exportar', icon: 'download',
    body: `<p class="muted" style="margin:0 0 14px">${h(expTitulo(name))} · ${rows.length} registro(s) com os filtros atuais</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn" data-f="xls" style="padding:18px 10px;flex-direction:column;gap:6px;height:auto">${ic('download')}<b>Excel</b><span class="faint" style="font-size:11px">planilha .csv</span></button>
        <button class="btn primary" data-f="pdf" style="padding:18px 10px;flex-direction:column;gap:6px;height:auto">${ic('file')}<b>PDF</b><span style="font-size:11px;opacity:.8">para compartilhar</span></button>
      </div>`,
    onMount: m => {
      $('[data-f=xls]', m.el).onclick = () => { m.close(); downloadCSV(name, head, rows); };
      $('[data-f=pdf]', m.el).onclick = () => { m.close(); tablePDF(expTitulo(name), head, rows); };
    }
  });
}
function tablePDF(titulo, head, rows) {
  const esc = h, logo = cfgv('logo', ''), agora = new Date();
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · ${agora.toLocaleDateString('pt-BR')}</title>
  <style>
  @page{size:A4 landscape;margin:12mm}
  *{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:1150px;margin:0 auto;padding:18px}
  header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #6366f1;padding-bottom:12px;margin-bottom:14px}
  header img{height:46px;max-width:140px;object-fit:contain}
  .mark{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#6366f1,#a855f7);color:#fff;display:grid;place-items:center;font-weight:800}
  header h1{margin:0;font-size:20px}header .meta{color:#5b6785;font-size:11px;margin-top:2px}
  .tot{margin-left:auto;text-align:right}.tot b{font-size:26px;color:#4f46e5;display:block;line-height:1}.tot span{color:#5b6785;font-size:10px;font-weight:700;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#0f172a;color:#fff;text-align:left;padding:6px 7px;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em}
  td{padding:5px 7px;border-bottom:1px solid #e5e7eb;vertical-align:top}tr{page-break-inside:avoid}tbody tr:nth-child(even) td{background:#f8fafc}
  footer{margin-top:14px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between}
  .bar{position:sticky;top:0;background:#0f172a;color:#fff;padding:10px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between}
  .bar button{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}
  @media print{.bar{display:none}.wrap{padding:0}}
  </style></head><body>
  <div class="bar"><span>Pré-visualização do PDF · escolha <b>Salvar como PDF</b> na impressão</span><button onclick="window.print()">Baixar / imprimir PDF</button></div>
  <div class="wrap">
  <header>${logo && /^(data:image\/|https:)/.test(logo) ? `<img src="${esc(logo)}">` : '<div class="mark">GRC</div>'}<div><h1>${esc(titulo)}</h1><div class="meta">${esc(cfgv('empresa', 'Grupo R Center'))} · Recursos Humanos · gerado em ${agora.toLocaleString('pt-BR').slice(0, 17)} por ${esc(S.user.nome)}</div></div><div class="tot"><b>${rows.length}</b><span>REGISTROS</span></div></header>
  <table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r => `<tr>${r.map(v => `<td>${esc(v == null ? '' : String(v))}</td>`).join('')}</tr>`).join('')}
  </tbody></table>
  <footer><span>${esc(cfgv('sistema', 'Quadro de Lojas'))}</span><span>Dados conforme filtros aplicados no sistema</span></footer>
  </div><script>setTimeout(function(){try{window.print()}catch(e){}},600)</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Permita pop-ups para gerar o PDF', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
function downloadCSV(name, head, rows) {
  const esc = v => { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+([.,]\d+)?$/.test(v)) v = "'" + v; return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = '﻿' + [head, ...rows].map(r => r.map(esc).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '_' + isoD(new Date()) + '.csv';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
/** tabela ordenável */
function table(el, key, cols, data, onRow) {
  const st = S.sort[key] || (S.sort[key] = { i: -1, d: 1 });
  const draw = () => {
    let rows = data.slice();
    if (st.i >= 0) {
      const c = cols[st.i]; const f = c.sort || (r => r[c.k]);
      rows.sort((a, b) => { const x = f(a), y = f(b); return (x == null ? 1e12 : x) > (y == null ? 1e12 : y) ? st.d : (x == null ? 1e12 : x) < (y == null ? 1e12 : y) ? -st.d : 0; });
    }
    el.innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr>${cols.map((c, i) => `<th data-i="${i}" class="${st.i === i ? 'sorted' : ''}" style="${c.w ? 'width:' + c.w : ''}">${c.th || h(c.t)}${st.i === i ? (st.d > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((r, ri) => `<tr data-ri="${ri}" class="${onRow ? 'click' : ''}">${cols.map(c => `<td data-l="${h(c.t || '')}">${c.r ? c.r(r) : h(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="card empty">${ic('search')}<div>Nenhum registro com esses filtros.</div></div>`;
    $$('th', el).forEach(th => th.onclick = () => { const i = +th.dataset.i; if (cols[i].nosort) return; st.d = st.i === i ? -st.d : 1; st.i = i; draw(); });
    if (onRow) $$('tbody tr', el).forEach(tr => tr.onclick = e => { if (e.target.closest('[data-stop]')) return; onRow(rows[+tr.dataset.ri], e); });
    el._rows = rows;
  };
  draw();
}

/* =====================================================================
 * DASHBOARD
 * ===================================================================== */
function pgDash() {
  setTitle('Dashboard', 'Visão geral de todas as lojas');
  const T = S.tot, L = S.data.lojas, D = S.data;
  const hr = new Date().getHours();
  const saud = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const contrPend = (D.contratacoes.rows || []).filter(r => r._pend);
  const expV = (D.experiencias || []).filter(e => e._exp && e._dias <= 15);
  const fech30 = (D.vagasFechadas || []).filter(v => { const d = daysTo(parseISO(v.fechamento)); return d != null && d >= -30; });
  const tFech = (D.vagasFechadas || []).filter(v => parseISO(v.abertura) && parseISO(v.fechamento)).map(v => (parseISO(v.fechamento) - parseISO(v.abertura)) / 864e5).filter(x => isFinite(x) && x >= 0);
  const tMedioFech = tFech.length ? Math.round(sum(tFech) / tFech.length) : null;

  // alertas
  const alerts = [];
  (D.experiencias || []).filter(e => e._exp && e._dias <= 7).sort((a, b) => a._dias - b._dias).forEach(e => alerts.push({ c: e._dias <= 2 ? 'c-red' : 'c-amber', i: 'clock', t: `${e.nome}`, s: `Experiência de ${e._prox} dias vence ${e._dias === 0 ? 'hoje' : 'em ' + e._dias + ' dia(s)'} · ${LOJA_NOMES[e._loja] || e.loja}`, href: '#/experiencias' }));
  L.forEach(l => {
    if (l.st.aprendiz < l.st.cotaAprendiz) alerts.push({ c: 'c-violet', i: 'grad', t: `${l.nome}: aprendizes abaixo da meta`, s: `${l.st.aprendiz} de ${l.st.cotaAprendiz} (${Math.round(((l.cotas || {}).aprendiz || .05) * 100)}% do quadro)`, href: '#/loja/' + l.key });
    if (l.st.pcd < l.st.cotaPcd) alerts.push({ c: 'c-pink', i: 'accessibility', t: `${l.nome}: PCD abaixo da meta`, s: `${l.st.pcd} de ${l.st.cotaPcd} (${Math.round(((l.cotas || {}).pcd || .02) * 100)}% do quadro)`, href: '#/loja/' + l.key });
  });
  const velhas = S.all.filter(r => r.vagaAberta && r.dias != null && r.dias > 30);
  if (velhas.length) alerts.push({ c: 'c-red', i: 'briefcase', t: `${velhas.length} vaga(s) abertas há mais de 30 dias`, s: 'Revise o andamento da seleção', href: '#/vagas' });
  if (isAdmin() && S.notif.pendentes) alerts.unshift({ c: 'c-amber', i: 'check', t: `${S.notif.pendentes} solicitação(ões) aguardando sua aprovação`, s: 'Requisições de vaga e alterações de recrutadores', href: '#/aprovacoes' });
  if (contrPend.length) alerts.push({ c: 'c-blue', i: 'userplus', t: `${contrPend.length} contratação(ões) aguardando alocação`, s: 'Vincule ao quadro da loja', href: '#/contratacoes' });

  const nova = L.find(l => l.nova);
  const v = $('#view');
  v.innerHTML = `
  <div class="hero" style="--lc:#6366f1">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;position:relative;z-index:1">
      ${avatar(S.user.nome, S.user.foto, 'lg')}
      <div style="flex:1;min-width:220px">
        <div class="muted" style="font-weight:600">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <h2>${saud}, ${h(S.user.nome.split(' ')[0])}!</h2>
        <div class="muted" style="margin-top:4px">Atualizado em ${h(D.atualizadoEm || '')} · ${L.length} lojas no seu acesso</div>
        ${!S.user.foto ? `<a class="btn sm" href="#/perfil" style="margin-top:10px">${ic('camera')} Adicionar minha foto</a>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="#/vagas">${ic('briefcase')} Ver vagas</a>
        ${canContr() ? `<a class="btn primary" href="#/contratacoes">${ic('userplus')} Contratações</a>` : ''}
      </div>
    </div>
    <div class="stats">
      <div><b>${fmt(T.ideal)}</b><span>QUADRO IDEAL</span></div>
      <div><b>${fmt(T.atual)}</b><span>QUADRO ATUAL</span></div>
      <div><b>${T.ocup}%</b><span>OCUPAÇÃO</span></div>
      <div><b>${T.colab}</b><span>COLABORADORES NO QUADRO</span></div>
      <div><b style="color:var(--bad)">${T.vagas}</b><span>VAGAS EM ABERTO</span></div>
    </div>
  </div>

  <div class="grid g4 mt">
    ${kpi({ lbl: 'Vagas em aberto', val: `${T.vagas} <small>posições</small>`, sub: `${fmt(T.vagasQt)} em quadro (FTE) · ${T.futuras} futuras`, icon: 'briefcase', c: 'c-red', href: '#/vagas' })}
    ${kpi({ lbl: 'Ocupação do quadro', val: `${T.ocup}%`, bar: T.ocup, sub: `${fmt(T.atual)} de ${fmt(T.ideal)} posições`, icon: 'target', c: 'c-cyan' })}
    ${kpi({ lbl: 'Aprendizes', val: `${T.aprendiz} <small>/ meta ${T.cotaAprendiz}</small>`, bar: pct(T.aprendiz, T.cotaAprendiz), sub: T.aprendiz >= T.cotaAprendiz ? `${ic('check')} Meta atingida` : `Faltam ${T.cotaAprendiz - T.aprendiz} para a meta`, icon: 'grad', c: 'c-violet' })}
    ${kpi({ lbl: 'PCD', val: `${T.pcd} <small>/ meta ${T.cotaPcd}</small>`, bar: pct(T.pcd, T.cotaPcd), sub: T.pcd >= T.cotaPcd ? `${ic('check')} Meta atingida` : `Faltam ${T.cotaPcd - T.pcd} para a meta`, icon: 'accessibility', c: 'c-pink' })}
    ${kpi({ lbl: 'Em aviso prévio', val: T.aviso, sub: 'Vagas que vão abrir', icon: 'door', c: 'c-amber' })}
    ${kpi({ lbl: 'Contratações pendentes', val: contrPend.length, sub: 'Aguardando alocação no quadro', icon: 'userplus', c: 'c-blue', href: '#/contratacoes' })}
    ${kpi({ lbl: 'Experiências a vencer', val: `${expV.length} <small>em 15 dias</small>`, sub: `${(D.experiencias || []).filter(e => e._exp && e._dias <= 7).length} nos próximos 7 dias`, icon: 'clock', c: 'c-amber', href: '#/experiencias' })}
    ${kpi({ lbl: 'Vagas fechadas (30d)', val: fech30.length, sub: tMedioFech != null ? `Tempo médio p/ fechar: ${tMedioFech} dias` : 'Histórico começa a contar pelo sistema', icon: 'trend', c: 'c-green' })}
  </div>

  <div class="grid g4 mt">${L.map(storeCard).join('')}</div>

  <div class="grid g-dash mt">
    <div class="card"><div class="card-h"><div><h3>Vagas abertas por setor</h3><div class="sub">Empilhado por loja</div></div><a class="btn sm" href="#/vagas">Detalhar</a></div><div class="chart-box" style="height:320px"><canvas id="chSetor"></canvas></div></div>
    <div class="card"><div class="card-h"><div><h3>Alertas</h3><div class="sub">O que precisa da sua atenção</div></div><span class="badge ${alerts.length ? 'b-bad' : 'b-ok'}">${alerts.length}</span></div>
      <div class="alist">${alerts.length ? alerts.map(a => `<a class="aitem ${a.c}" href="${a.href}" style="text-decoration:none"><div class="ai" style="background:color-mix(in srgb,var(--kc) 15%,transparent);color:var(--kc)">${ic(a.i)}</div><div><b>${h(a.t)}</b><span>${h(a.s)}</span></div></a>`).join('') : `<div class="empty">${ic('check')}<div>Tudo em dia!</div></div>`}</div>
    </div>
  </div>

  <div class="grid g3 mt">
    <div class="card"><div class="card-h"><h3>Ideal × Atual por loja</h3></div><div class="chart-box sm"><canvas id="chIdeal"></canvas></div></div>
    <div class="card"><div class="card-h"><h3>Composição do quadro</h3><span class="sub">por tipo de contrato</span></div><div class="chart-box sm"><canvas id="chContr"></canvas></div></div>
    <div class="card"><div class="card-h"><h3>Tempo de casa</h3><span class="sub">colaboradores</span></div><div class="chart-box sm"><canvas id="chTempo"></canvas></div></div>
  </div>

  <div class="grid g-dash mt">
    ${nova ? eusebioCard(nova) : '<div></div>'}
    <div class="card"><div class="card-h"><h3>Atividade recente</h3>${isAdmin() ? '<a class="btn sm" href="#/historico">Ver tudo</a>' : ''}</div>
      <div class="alist">${(D.log || []).length ? D.log.slice(0, 12).map(l => `<div class="aitem"><div class="ai" style="background:var(--surface3)">${ic(/Abriu|posição/.test(l.acao) ? 'briefcase' : /Preencheu|contrata/i.test(l.acao) ? 'userplus' : /acesso|senha/i.test(l.acao) ? 'shield' : 'edit')}</div><div><b>${h(l.acao)}${l.loja ? ' · ' + h(LOJA_NOMES[l.loja] || l.loja) : ''}</b><span>${h(l.detalhe)}<br>${h(l.usuario)} · ${h(l.data)}</span></div></div>`).join('') : '<div class="empty">Sem registros ainda</div>'}</div>
    </div>
  </div>`;
  $$('.store', v).forEach(el => el.onclick = () => location.hash = '#/loja/' + el.dataset.k);

  // charts
  const vagas = S.all.filter(r => r.vagaAberta);
  const setorNorm = s => norm(s).replace(/PREVENCAO DE PERDAS/, 'PREVENCAO').replace(/DEPOSITO/, 'DEPOSITO').replace(/ACOUGUE.*/, 'ACOUGUE');
  const setores = uniq(vagas.map(r => setorNorm(r.setor)));
  setores.sort((a, b) => vagas.filter(r => setorNorm(r.setor) === b).length - vagas.filter(r => setorNorm(r.setor) === a).length);
  const top = setores.slice(0, 10);
  chart($('#chSetor'), {
    type: 'bar',
    data: { labels: top.map(s => s.replace('FRENTE DE LOJA - ', 'F.L. ').replace('LOGISTICA - ', '')), datasets: L.map(l => ({ label: l.nome, data: top.map(s => vagas.filter(r => r.loja === l.key && setorNorm(r.setor) === s).length), backgroundColor: l.color, borderRadius: 6, maxBarThickness: 22 })) },
    options: { indexAxis: 'y', scales: { x: { stacked: true, grid: { color: css('--border') }, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } }
  });
  chart($('#chIdeal'), {
    type: 'bar',
    data: { labels: L.map(l => l.nome), datasets: [{ label: 'Ideal', data: L.map(l => l.st.ideal), backgroundColor: css('--surface3'), borderRadius: 8, maxBarThickness: 30 }, { label: 'Atual', data: L.map(l => l.st.atual), backgroundColor: L.map(l => l.color), borderRadius: 8, maxBarThickness: 30 }] },
    options: { scales: { y: { grid: { color: css('--border') } }, x: { grid: { display: false } } } }
  });
  const ctMap = {};
  S.all.filter(r => r.nome).forEach(r => { let c = norm(r.contrato); c = /APRENDIZ/.test(c) ? 'Aprendiz' : /ESTAGIO/.test(c) ? 'Estágio' : /PARCIAL/.test(c) ? 'Parcial' : /RATEIO/.test(c) ? 'Rateio' : /INTEGRAL/.test(c) || !c ? 'Integral' : 'Outros'; ctMap[c] = (ctMap[c] || 0) + 1; });
  const ctK = Object.keys(ctMap).sort((a, b) => ctMap[b] - ctMap[a]);
  chart($('#chContr'), {
    type: 'doughnut',
    data: { labels: ctK, datasets: [{ data: ctK.map(k => ctMap[k]), backgroundColor: ['#6366f1', '#a78bfa', '#22d3ee', '#f59e0b', '#f472b6', '#94a3b8'], borderColor: css('--surface'), borderWidth: 3 }] },
    options: { cutout: '68%', plugins: { legend: { position: 'right' } } }
  });
  const faixas = [['< 3 meses', 0, 3], ['3–12 m', 3, 12], ['1–2 anos', 12, 24], ['2–5 anos', 24, 60], ['5+ anos', 60, 1e4]];
  const ms = S.all.filter(r => r.nome && r.meses != null).map(r => r.meses);
  chart($('#chTempo'), {
    type: 'bar',
    data: { labels: faixas.map(f => f[0]), datasets: [{ label: 'Colaboradores', data: faixas.map(f => ms.filter(m => m >= f[1] && m < f[2]).length), backgroundColor: ['#f87171', '#fbbf24', '#22d3ee', '#6366f1', '#34d399'], borderRadius: 8, maxBarThickness: 40 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: css('--border') }, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
  });
  if (nova) {
    const nv = nova.setores.filter(s => s.linhas.length).map(s => ({ n: s.nome, p: s.linhas.length, o: s.linhas.filter(r => r.nome).length }));
    chart($('#chNova'), {
      type: 'bar',
      data: { labels: nv.map(x => x.n.replace('FRENTE DE LOJA - ', 'F.L. ').replace('LOGISTICA - ', '')), datasets: [{ label: 'Preenchidas', data: nv.map(x => x.o), backgroundColor: nova.color, borderRadius: 6 }, { label: 'Em aberto', data: nv.map(x => x.p - x.o), backgroundColor: css('--surface3'), borderRadius: 6 }] },
      options: { scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 50, minRotation: 40, font: { size: 10 } } }, y: { stacked: true, grid: { color: css('--border') }, ticks: { precision: 0 } } } }
    });
  }
}
function storeCard(l) {
  const s = l.st;
  return `<div class="card store" data-k="${l.key}" style="--lc:${l.color}">
    <div class="stripe"></div>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="num">${l.num}</div>
      <div style="flex:1;min-width:0"><b style="font-size:15px">${h(l.nome)}</b> ${l.nova ? '<span class="badge b-ok">NOVA</span>' : ''}<div class="muted" style="font-size:12px">${h(l.sub)}</div></div>
      <div class="ring" style="--p:${Math.min(100, s.ocup)};--c:${l.color}" data-v="${s.ocup}%" title="Ocupação"></div>
    </div>
    <div class="nums">
      <div><b>${fmt(s.ideal)}</b><span>Ideal</span></div>
      <div><b>${fmt(s.atual)}</b><span>Atual</span></div>
      <div><b style="color:${s.vagas ? 'var(--bad)' : 'var(--ok)'}">${s.vagas}</b><span>Vagas</span></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
      <span class="badge ${s.aprendiz >= s.cotaAprendiz ? 'b-violet' : 'b-bad'}" title="Aprendizes / meta">${ic('grad', '')}${s.aprendiz}/${s.cotaAprendiz}</span>
      <span class="badge ${s.pcd >= s.cotaPcd ? 'b-pink' : 'b-bad'}" title="PCD / meta">${ic('accessibility')}${s.pcd}/${s.cotaPcd}</span>
      ${s.aviso ? `<span class="badge b-warn" title="Em aviso prévio">${ic('door')}${s.aviso}</span>` : ''}
      ${s.cipa ? `<span class="badge b-info" title="CIPA">CIPA ${s.cipa}</span>` : ''}
    </div>
  </div>`;
}
function eusebioCard(l) {
  const filled = l.rows.filter(r => r.nome).length, tot = l.rows.length;
  const p = pct(filled, tot);
  return `<div class="card" style="--lc:${l.color};border-color:color-mix(in srgb,${l.color} 35%,transparent)">
    <div class="card-h"><div><h3>${ic('spark')} Implantação · Loja ${l.num} ${h(l.nome)}</h3><div class="sub">Acompanhamento da seleção da loja nova</div></div><a class="btn sm primary" href="#/vagas" onclick="window.__grcVagaLoja='${l.key}'">Ir para seleção</a></div>
    <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:10px;flex-wrap:wrap">
      <div><div style="font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1">${p}%</div><div class="muted" style="font-size:12px">${filled} de ${tot} posições preenchidas</div></div>
      <div style="flex:1;min-width:200px"><div class="big-bar"><i style="width:${p}%;background:${l.color}"></i></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${ETAPAS().map(e => { const n = l.rows.filter(r => r.vagaAberta && r.etapa === e).length; return n ? `${etapaBadge(e)}<span class="faint" style="font-size:12px;margin-right:6px">${n}</span>` : ''; }).join('')}</div></div>
    </div>
    <div class="chart-box sm"><canvas id="chNova"></canvas></div>
  </div>`;
}
const ETAPAS = () => S.data.etapas || ['Aberta', 'Divulgação', 'Triagem', 'Entrevista', 'Aprovado', 'Admissão'];

/* =====================================================================
 * LOJA
 * ===================================================================== */
/* =====================================================================
 * QUADRO ADMINISTRATIVO — visão executiva com senioridade
 * ===================================================================== */
const isAdmLoja = l => !!l && l.key === 'GRC';
const SEN = [
  { k: 'SÊNIOR', lbl: 'Sênior', c: '#f5c451', c2: '#b8860b', ico: '★★★' },
  { k: 'PLENO', lbl: 'Pleno', c: '#a78bfa', c2: '#6d28d9', ico: '★★' },
  { k: 'JÚNIOR', lbl: 'Júnior', c: '#22d3ee', c2: '#0e7490', ico: '★' }
];
const SEN_NADA = { k: '', lbl: 'Sem senioridade', c: '#64748b', c2: '#334155', ico: '·' };
const senRank = s => s === SEN_NADA ? 9 : SEN.indexOf(s);
const senOf = r => { const t = (r.tags || []).map(norm); return SEN.find(s => t.includes(norm(s.k))) || SEN_NADA; };
const SETOR_CORES = ['#f5c451', '#a78bfa', '#22d3ee', '#f472b6', '#34d399', '#fb923c', '#60a5fa', '#e879f9', '#facc15', '#2dd4bf'];
function admCss() {
  if (document.getElementById('admCss')) return;
  const st = document.createElement('style'); st.id = 'admCss';
  st.textContent = `
  .adm-hero{position:relative;overflow:hidden;border-radius:24px;padding:26px 28px;color:#f8fafc;
    background:radial-gradient(1200px 400px at -10% -40%,rgba(245,196,81,.35),transparent 60%),radial-gradient(800px 380px at 110% 120%,rgba(167,139,250,.35),transparent 60%),linear-gradient(135deg,#0b1122 0%,#151b3a 55%,#1d1240 100%);
    border:1px solid rgba(245,196,81,.35);box-shadow:0 20px 60px -20px rgba(245,196,81,.25),inset 0 1px 0 rgba(255,255,255,.06)}
  .adm-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent);pointer-events:none}
  .adm-hero .shine{position:absolute;top:-50%;left:-30%;width:40%;height:200%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.08),transparent);transform:rotate(12deg);animation:admShine 7s ease-in-out infinite;pointer-events:none}
  @keyframes admShine{0%,60%{left:-40%}100%{left:130%}}
  .adm-top{display:flex;gap:18px;align-items:center;flex-wrap:wrap;position:relative;z-index:1}
  .adm-crest{width:66px;height:66px;border-radius:20px;display:grid;place-items:center;font-weight:900;font-size:18px;letter-spacing:.5px;color:#1a1204;background:linear-gradient(135deg,#fde68a,#f5c451 45%,#b8860b);box-shadow:0 10px 30px -8px rgba(245,196,81,.7),inset 0 2px 0 rgba(255,255,255,.5)}
  .adm-kicker{font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#f5c451}
  .adm-title{font-size:30px;font-weight:900;line-height:1.05;margin:4px 0 2px;background:linear-gradient(90deg,#fff,#fde68a 60%,#f5c451);-webkit-background-clip:text;background-clip:text;color:transparent}
  .adm-sub{color:rgba(248,250,252,.7);font-size:13px}
  .adm-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:22px;position:relative;z-index:1}
  .adm-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:12px 14px;backdrop-filter:blur(6px)}
  .adm-stat b{display:block;font-size:24px;font-weight:900;color:#fff}.adm-stat span{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(248,250,252,.6);font-weight:700}
  .adm-donut{width:132px;height:132px;border-radius:50%;position:relative;flex:none;margin-left:auto;box-shadow:0 0 0 6px rgba(255,255,255,.04)}
  .adm-donut::after{content:"";position:absolute;inset:14px;border-radius:50%;background:#10162e}
  .adm-donut .c{position:absolute;inset:0;display:grid;place-items:center;z-index:1;text-align:center;font-weight:900;font-size:26px;color:#fff;line-height:1;align-content:center}
  .adm-donut .c small{display:block;font-size:9px;letter-spacing:.5px;color:rgba(248,250,252,.6);font-weight:700;margin-top:3px}
  .adm-leg{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:rgba(248,250,252,.85)}
  .adm-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px}
  .adm-ladder{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
  .adm-step{border-radius:18px;padding:16px;position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--sc) 35%,var(--border));background:linear-gradient(160deg,color-mix(in srgb,var(--sc) 16%,var(--surface)) 0%,var(--surface) 75%);cursor:pointer;transition:transform .15s,box-shadow .15s}
  .adm-step:hover{transform:translateY(-2px);box-shadow:0 14px 30px -14px var(--sc)}
  .adm-step.on{outline:2px solid var(--sc)}
  .adm-step .h{display:flex;justify-content:space-between;align-items:center}
  .adm-step .t{font-weight:900;font-size:15px;color:var(--sc)}.adm-step .st{font-size:12px;color:var(--sc);letter-spacing:2px}
  .adm-step .n{font-size:34px;font-weight:900;margin:6px 0 8px}
  .adm-step .n small{font-size:13px;color:var(--muted);font-weight:700;margin-left:6px}
  .adm-faces{display:flex}.adm-faces .avatar{width:30px;height:30px;font-size:11px;margin-left:-8px;border:2px solid var(--surface)}.adm-faces .avatar:first-child{margin-left:0}
  .adm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
  .adm-sec{border-radius:20px;border:1px solid var(--border);background:var(--surface);overflow:hidden;position:relative}
  .adm-sec .sh{padding:16px 18px 14px;position:relative;background:linear-gradient(120deg,color-mix(in srgb,var(--sc) 22%,var(--surface)) 0%,var(--surface) 80%);border-bottom:1px solid var(--border)}
  .adm-sec .sh::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--sc),color-mix(in srgb,var(--sc) 30%,transparent))}
  .adm-sec .sh h4{margin:0;font-size:15px;font-weight:900;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
  .adm-sec .sh .meta{font-size:12px;color:var(--muted);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}
  .adm-sec .bar{height:6px;border-radius:9px;background:var(--surface2);margin-top:10px;overflow:hidden;display:flex}
  .adm-sec .bar i{display:block;height:100%}
  .adm-people{padding:10px;display:flex;flex-direction:column;gap:8px}
  .adm-p{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--surface2);border:1px solid transparent;transition:border-color .15s,transform .15s;position:relative}
  .adm-p.click{cursor:pointer}.adm-p.click:hover{border-color:color-mix(in srgb,var(--pc) 55%,transparent);transform:translateX(2px)}
  .adm-p .avatar{width:42px;height:42px;font-size:14px;flex:none;box-shadow:0 0 0 2px var(--surface2),0 0 0 4px var(--pc)}
  .adm-p .who{flex:1;min-width:0}.adm-p .who b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm-p .who span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .adm-sen{font-size:10.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding:5px 9px;border-radius:999px;color:#0b1122;background:linear-gradient(135deg,var(--pc),var(--pc2));white-space:nowrap;box-shadow:0 4px 14px -6px var(--pc)}
  .adm-sen.none{background:transparent;color:var(--muted);border:1px dashed var(--border2);box-shadow:none}
  .adm-p .side{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
  .adm-p .tm{font-size:11px;color:var(--muted)}
  .adm-p.vaga{background:transparent;border:1.5px dashed color-mix(in srgb,var(--bad) 55%,transparent)}
  .adm-p.vaga .avatar{background:color-mix(in srgb,var(--bad) 15%,transparent);color:var(--bad);box-shadow:none}
  .adm-mini{display:flex;gap:4px;flex-wrap:wrap}.adm-mini .badge{font-size:10px;padding:2px 6px}
  @media (max-width:900px){.adm-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.adm-ladder{grid-template-columns:1fr}.adm-donut{margin-left:0}.adm-title{font-size:24px}.adm-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
}
function admHero(l) {
  admCss();
  const P = l.rows.filter(r => r.nome), tot = P.length || 1;
  const cnt = s => P.filter(r => senOf(r) === s).length;
  const parts = [...SEN, SEN_NADA].map(s => ({ s, n: cnt(s) }));
  let acc = 0;
  const grad = parts.filter(p => p.n).map(p => { const a = acc; acc += p.n / tot * 360; return `${p.s.c} ${a}deg ${acc}deg`; }).join(',') || '#334155 0deg 360deg';
  const st = l.st;
  return `<div class="adm-hero"><div class="shine"></div>
    <div class="adm-top">
      <div class="adm-crest">ADM</div>
      <div style="flex:1;min-width:220px"><div class="adm-kicker">Quadro executivo · Grupo R Center</div><div class="adm-title">${h(l.nome)}</div><div class="adm-sub">${h(l.sub || 'Escritório')} · ${l.setores.length} setores · senioridade por colaborador</div></div>
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        <div class="adm-donut" style="background:conic-gradient(${grad})"><div class="c">${P.length}<small>PESSOAS</small></div></div>
        <div class="adm-leg">${parts.map(p => `<div><i style="background:${p.s.c}"></i>${p.s.lbl} <b>${p.n}</b> <span style="opacity:.6">${Math.round(p.n / tot * 100)}%</span></div>`).join('')}</div>
      </div>
    </div>
    <div class="adm-stats">
      <div class="adm-stat"><b>${fmt(st.ideal)}</b><span>Quadro ideal</span></div>
      <div class="adm-stat"><b>${fmt(st.atual)}</b><span>Quadro atual</span></div>
      <div class="adm-stat"><b style="color:${st.vagas ? '#fca5a5' : '#fff'}">${st.vagas}</b><span>Vagas abertas</span></div>
      <div class="adm-stat"><b>${st.tempoMedio != null ? fmt(st.tempoMedio / 12, 1) + ' anos' : '—'}</b><span>Tempo médio de casa</span></div>
      <div class="adm-stat"><b>${Math.round(cnt(SEN[0]) / tot * 100)}%</b><span>Time sênior</span></div>
    </div>
  </div>`;
}
function admBoard(l, rows, f, ed) {
  admCss();
  const P = rows.filter(r => r.nome);
  const ladder = SEN.map(s => { const ps = l.rows.filter(r => r.nome && senOf(r) === s); return `<div class="adm-step ${f.sen === s.k ? 'on' : ''}" data-sen="${h(s.k)}" style="--sc:${s.c}"><div class="h"><span class="t">${s.lbl}</span><span class="st">${s.ico}</span></div><div class="n">${ps.length}<small>${ps.length === 1 ? 'pessoa' : 'pessoas'}</small></div><div class="adm-faces">${ps.slice(0, 9).map(r => avatar(r.nome, '', '')).join('')}${ps.length > 9 ? `<div class="avatar" style="background:var(--surface2);color:var(--muted)">+${ps.length - 9}</div>` : ''}</div></div>`; }).join('');
  const sem = l.rows.filter(r => r.nome && senOf(r) === SEN_NADA).length;
  const secs = l.setores.map((sec, i) => ({ sec, cor: SETOR_CORES[i % SETOR_CORES.length], rows: rows.filter(r => r.setor === sec.nome) })).filter(x => x.rows.length);
  const pessoa = r => {
    if (!r.nome) return `<div class="adm-p vaga ${ed ? 'click' : ''}" data-row="${r.row}"><div class="avatar">${ic('briefcase')}</div><div class="who"><b style="color:var(--bad)">Vaga em aberto</b><span>${h(r.funcao)}${r.etapa ? ' · ' + h(r.etapa) : ''}</span></div><div class="side">${r.dias != null ? diasBadge(r.dias) : ''}</div></div>`;
    const s = senOf(r);
    const extra = (r.tags || []).filter(t => !SEN.some(x => norm(x.k) === norm(t)));
    return `<div class="adm-p ${ed ? 'click' : ''}" data-row="${r.row}" style="--pc:${s.c};--pc2:${s.c2}">${avatar(r.nome, '', '')}<div class="who"><b>${h(r.nome)}</b><span>${h(r.funcao)}</span>${extra.length || r.aviso || (r.contrato && norm(r.contrato) !== 'INTEGRAL') ? `<div class="adm-mini" style="margin-top:4px">${r.aviso ? '<span class="badge b-warn">EM AVISO</span>' : ''}${norm(r.contrato) !== 'INTEGRAL' && r.contrato ? `<span class="badge">${h(r.contrato)}</span>` : ''}${extra.map(t => `<span class="badge b-acc">${h(t)}</span>`).join('')}</div>` : ''}</div><div class="side"><span class="adm-sen ${s === SEN_NADA ? 'none' : ''}">${s === SEN_NADA ? 'definir' : s.lbl}</span>${r.tempo ? `<span class="tm">${h(r.tempo.replace(/ e 0 m[eê]s(es)?/, '').replace('0 anos e ', ''))}</span>` : ''}</div></div>`;
  };
  return `<div class="adm-ladder">${ladder}</div>
    ${sem ? `<div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;border-style:dashed;cursor:pointer" data-sen="__none">${ic('alert')}<div><b>${sem} colaborador(es) sem senioridade definida.</b> <span class="muted">Clique para ver e defina Júnior, Pleno ou Sênior na tag de cada um.</span></div></div>` : ''}
    ${secs.length ? `<div class="adm-grid">${secs.map(({ sec, cor, rows: rs }) => {
      const pp = rs.filter(r => r.nome), seg = [...SEN, SEN_NADA].map(s => ({ s, n: pp.filter(r => senOf(r) === s).length })).filter(x => x.n);
      return `<div class="adm-sec" style="--sc:${cor}"><div class="sh"><h4>${h(sec.nome)}</h4><div class="meta"><span><b>${pp.length}</b> pessoa(s)</span><span>padrão <b>${fmt(sec.pad)}</b> · atual <b>${fmt(sec.ocup)}</b></span>${sec.nVagas ? `<span style="color:var(--bad)"><b>${sec.nVagas}</b> vaga(s)</span>` : ''}</div><div class="bar">${seg.map(x => `<i style="width:${x.n / (pp.length || 1) * 100}%;background:${x.s.c}" title="${x.s.lbl}: ${x.n}"></i>`).join('')}</div></div><div class="adm-people">${rs.slice().sort((a, b) => (!a.nome) - (!b.nome) || senRank(senOf(a)) - senRank(senOf(b)) || (b.meses || 0) - (a.meses || 0)).map(pessoa).join('')}</div></div>`;
    }).join('')}</div>` : `<div class="card empty">${ic('search')}<div>Ninguém com esses filtros.</div></div>`}`;
}

function pgLoja(l) {
  const adm = isAdmLoja(l);
  if (adm) setTitle('Administrativo', 'Quadro do escritório · senioridade Júnior, Pleno e Sênior'); else
  setTitle(`Loja ${l.num} · ${l.nome}`, l.titulo || 'Quadro da loja');
  const fk = 'loja_' + l.key, f = getF(fk);
  const s = l.st, ed = canEdit(l.key);
  const v = $('#view');
  v.innerHTML = `${adm ? admHero(l) + (!isAdmin() && !isDP() ? `<div style="margin-top:12px"><button class="btn primary" id="lReq">${ic('plus')} Requisitar vaga</button></div>` : '') : `
  <div class="hero" style="--lc:${l.color}">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;position:relative;z-index:1">
      <div class="store" style="--lc:${l.color};cursor:default"><div class="num" style="width:54px;height:54px;font-size:20px;border-radius:16px">${l.num}</div></div>
      <div style="flex:1;min-width:200px"><div class="muted" style="font-weight:600">${h(l.sub)} ${l.nova ? '<span class="badge b-ok">LOJA NOVA</span>' : ''}</div><h2>${h(l.nome)}</h2></div>
      ${!isAdmin() && !isDP() ? `<button class="btn primary" id="lReq">${ic('plus')} Requisitar vaga</button>` : ''}
      <div class="ring" style="--p:${Math.min(100, s.ocup)};--c:${l.color};width:78px;height:78px" data-v="${s.ocup}%"></div>
    </div>
    <div class="stats">
      <div><b>${fmt(s.ideal)}</b><span>QUADRO IDEAL</span></div>
      <div><b>${fmt(s.atual)}</b><span>QUADRO ATUAL</span></div>
      <div><b style="color:var(--bad)">${s.vagas}</b><span>VAGAS ABERTAS</span></div>
      <div><b>${s.colab}</b><span>COLABORADORES</span></div>
      <div><b>${s.aprendiz}<small class="muted" style="font-size:13px">/${s.cotaAprendiz}</small></b><span>APRENDIZES</span></div>
      <div><b>${s.pcd}<small class="muted" style="font-size:13px">/${s.cotaPcd}</small></b><span>PCD</span></div>
      <div><b>${s.aviso}</b><span>EM AVISO</span></div>
      <div><b>${s.cipa}</b><span>CIPA</span></div>
      <div><b>${s.tempoMedio != null ? fmt(s.tempoMedio / 12, 1) + 'a' : '—'}</b><span>TEMPO MÉDIO DE CASA</span></div>
    </div>
  </div>`}
  <div class="toolbar">
    <div class="input-icon search">${ic('search')}<input class="input" id="fq" placeholder="Buscar nome ou função" value="${h(f.q || '')}" style="width:100%"></div>
    ${selectHTML('fSetor', 'Setor', l.setores.map(x => x.nome), f.setor)}
    ${selectHTML('fFunc', 'Função', uniq(l.rows.map(r => r.funcao)).sort(), f.func, 'Todas')}
    ${selectHTML('fContr', 'Contrato', uniq(l.rows.map(r => r.contrato)).sort(), f.contr)}
    ${selectHTML('fTag', 'Tag', uniq(l.rows.flatMap(r => r.tags)).sort(), f.tag, 'Todas')}
    <span class="spacer"></span>
    ${ed ? `<button class="btn ${SEL.on[fk] ? 'primary' : ''}" id="selTog" title="Selecionar várias posições">${ic('check')}<span class="desk-only">${SEL.on[fk] ? 'Selecionando' : 'Selecionar'}</span></button>` : ''}
    ${getV(fk, adm ? 'exec' : 'sec') === 'sec' ? `<button class="btn" id="secAll" title="Expandir / recolher todos os setores">${ic('chevron')}<span class="desk-only">Expandir todos</span></button>` : ''}
    <div class="seg" id="vw">${adm ? `<button data-v="exec" title="Visão executiva">${ic('spark')}<span class="desk-only">Executiva</span></button>` : ''}<button data-v="sec" title="Por setor">${ic('grid')}<span class="desk-only">Setores</span></button><button data-v="tbl" title="Tabela">${ic('table')}<span class="desk-only">Tabela</span></button></div>
    <button class="btn" id="exp" title="Exportar Excel / PDF">${ic('download')}</button>
  </div>
  <div class="chips" id="sitChips" style="margin-bottom:16px"></div>
  <div id="lBulk" class="bulk hidden"></div>
  <div id="lojaBody"></div>`;
  selScope(fk);
  const selOn = !!SEL.on[fk];
  const SIT = [['', 'Todos', () => true], ['ok', 'Ocupadas', r => r.nome && !r.isVaga], ['vaga', 'Vagas abertas', r => r.vagaAberta], ['fut', 'Vagas futuras', r => r.vagaFutura], ['aviso', 'Em aviso', r => r.aviso], ['aprendiz', 'Aprendizes', r => r.aprendiz], ['pcd', 'PCD', r => r.pcd], ['cipa', 'CIPA', r => r.cipa], ['estagio', 'Estágio', r => r.estagio], ['trainee', 'Trainee', r => r.trainee]].concat(lojaTreino(l.key) ? [['treino', 'Em treinamento', r => r.treino]] : []);
  const filt = () => {
    const q = norm(f.q);
    const sf = (SIT.find(x => x[0] === (f.sit || '')) || SIT[0])[2];
    return l.rows.filter(r => (!adm || !f.sen || (f.sen === '__none' ? (r.nome && senOf(r) === SEN_NADA) : (r.nome && senOf(r).k === f.sen))) && (!q || norm(r.nome).includes(q) || norm(r.funcao).includes(q)) && (!f.setor || r.setor === f.setor) && (!f.func || r.funcao === f.func) && (!f.contr || r.contrato === f.contr) && (!f.tag || r.tags.includes(f.tag)) && sf(r));
  };
  const drawChips = () => {
    $('#sitChips').innerHTML = SIT.map(([k, t, fn]) => { const n = l.rows.filter(fn).length; return (k && !n) ? '' : `<span class="chip ${(f.sit || '') === k ? 'on' : ''}" data-k="${k}">${t} <span class="n">${n}</span></span>`; }).join('') + (Object.values(f).some(Boolean) ? `<span class="chip" id="clr">${ic('eraser')} Limpar filtros</span>` : '');
    $$('#sitChips .chip[data-k]').forEach(c => c.onclick = () => { f.sit = c.dataset.k; saveF(); drawChips(); draw(); });
    const clr = $('#clr'); if (clr) clr.onclick = () => { Object.keys(f).forEach(k => f[k] = ''); saveF(); route(); };
  };
  const view = getV(fk, adm ? 'exec' : 'sec');
  $$('#vw button').forEach(b => { b.classList.toggle('on', b.dataset.v === view); b.onclick = () => { setV(fk, b.dataset.v); route(); }; });
  let draw = () => {
    const rows = filt();
    const body = $('#lojaBody');
    const filtered = Object.entries(f).some(([k, x]) => x);
    if (view === 'exec' && adm) {
      body.innerHTML = admBoard(l, rows, f, ed);
      $$('[data-sen]', body).forEach(c => c.onclick = () => { f.sen = f.sen === c.dataset.sen ? '' : c.dataset.sen; saveF(); drawChips(); draw(); });
      if (ed) $$('.adm-p[data-row]', body).forEach(c => c.onclick = () => { const r = l.rows.find(x => x.row === +c.dataset.row); if (r) openRow(l, r); });
      return;
    }
    if (view === 'tbl') {
      table(body, fk, [
        ...(selOn ? [{ t: '', k: '', nosort: true, w: '30px', th: `<input type="checkbox" id="selAll" ${rows.length && rows.every(r => SEL.set.has(selKey(r))) ? 'checked' : ''}>`, r: r => `<input type="checkbox" data-stop data-qsel="${r.row}" ${SEL.set.has(selKey(r)) ? 'checked' : ''}>` }] : []),
        { t: 'Setor', k: 'setor' },
        { t: 'Colaborador', k: 'nome', r: r => `<div class="cell-person">${r.nome ? avatar(r.nome, '', 'sm soft') : `<div class="avatar sm vaga-av">${ic('briefcase')}</div>`}<b ${r.nome ? '' : 'style="color:var(--bad);font-style:italic"'}>${h(r.nome || 'Vaga em aberto')}</b></div>` },
        { t: 'Função', k: 'funcao' },
        { t: 'Contrato', k: 'contrato' },
        { t: 'Situação', k: 'situacao', r: sitBadge },
        { t: 'Tags', k: 'tag', r: r => r.tags.map(t => `<span class="badge">${h(t)}</span>`).join(' ') },
        { t: 'QT', k: 'qt', r: r => fmt(r.qt) },
        { t: 'Tempo de empresa', k: 'tempo', sort: r => r.meses }
      ], rows, r => selOn ? toggleSel(r) : openRow(l, r));
      $$('[data-qsel]', body).forEach(c => c.onchange = () => toggleSel(l.rows.find(x => x.row === +c.dataset.qsel)));
      const sa = $('#selAll', body); if (sa) sa.onchange = () => { rows.forEach(r => sa.checked ? SEL.set.add(selKey(r)) : SEL.set.delete(selKey(r))); draw(); };
    } else {
      const secs = l.setores.map(sec => ({ sec, rows: rows.filter(r => r.setor === sec.nome) })).filter(x => x.rows.length || (!filtered));
      // Setores começam recolhidos; com busca/filtro ativo, abrem automaticamente os que têm resultado
      const expKey = 'grc_exp_' + l.key;
      const expanded = ls.get(expKey, {});
      const autoOpen = filtered || selOn;
      const isOpen = nm => autoOpen || !!expanded[nm];
      const resumo = rr => {
        const oc = rr.filter(r => r.nome && !r.isVaga).length, vg = rr.filter(r => r.vagaAberta).length, fu = rr.filter(r => r.vagaFutura).length, av = rr.filter(r => r.aviso).length;
        const pess = rr.filter(r => r.nome), mx = 5;
        const stack = pess.slice(0, mx).map(r => `<span class="sx" title="${h(r.nome)}">${fotoColab(r.nome) ? `<img src="${h(fotoColab(r.nome))}" alt="">` : h(initials(r.nome))}</span>`).join('') + (pess.length > mx ? `<span class="sx more">+${pess.length - mx}</span>` : '');
        return `<div class="sec-sum" data-tog><div class="stack">${stack}</div><div class="pills">
          <span class="pl ok" title="Ocupadas">${oc} ocup.</span>
          ${vg ? `<span class="pl bad" title="Vagas abertas">${vg} vaga${vg > 1 ? 's' : ''}</span>` : ''}
          ${fu ? `<span class="pl info" title="Vagas futuras">${fu} futura${fu > 1 ? 's' : ''}</span>` : ''}
          ${av ? `<span class="pl warn" title="Em aviso">${av} aviso</span>` : ''}
        </div></div>`;
      };
      body.innerHTML = secs.length ? `<div class="sections">${secs.map(({ sec, rows: rr }) => {
        const p = pct(sec.ocup, sec.pad);
        return `<div class="card sec ${isOpen(sec.nome) ? '' : 'collapsed'} ${sec.nVagas ? 'has-vaga' : ''}" data-sec="${h(sec.nome)}">
          <div class="sec-h" data-tog>
            <div style="flex:1;min-width:0"><h4>${h(sec.nome)}</h4><div class="meta">Padrão ${fmt(sec.pad)} · Atual ${fmt(sec.ocup)} ${sec.nVagas ? `· <span style="color:var(--bad);font-weight:700">${sec.nVagas} vaga(s)</span>` : ''}</div>${liderChip(l, sec.nome, ed)}</div>
            <span class="badge ${p >= 100 ? 'b-ok' : p >= 85 ? 'b-warn' : 'b-bad'}">${p}%</span>
            ${ed ? `<button class="btn sm ghost" data-pad="${h(sec.nome)}" title="Editar quadro padrão do setor">${ic('edit')}</button><button class="btn sm ghost" data-add="${h(sec.nome)}" title="Adicionar posição">${ic('plus')}</button>` : ''}
            ${ic('chevron')}
          </div>
          <div class="sec-prog"><i style="width:${Math.min(100, p)}%;background:${p >= 100 ? 'var(--ok)' : p >= 85 ? 'var(--warn)' : 'var(--bad)'}"></i></div>
          ${resumo(rr)}
          <div class="sec-body">${rr.map(r => `
            <div class="prow ${r.vagaAberta ? 'vaga' : ''} ${S.hl === r.row ? 'hl' : ''} ${selOn && SEL.set.has(selKey(r)) ? 'sel' : ''}" data-row="${r.row}">
              ${selOn ? `<input type="checkbox" class="pchk" ${SEL.set.has(selKey(r)) ? 'checked' : ''}>` : ''}
              ${r.nome ? avatar(r.nome, '', 'sm soft') : `<div class="avatar sm vaga-av">${ic('briefcase')}</div>`}
              <div class="info"><b>${h(r.nome || 'Vaga em aberto')}</b><span>${h(r.funcao)}${r.tempo ? ' · ' + h(r.tempo) : ''}${r.vagaAberta && r.info ? ' · ' + h(r.etapa) + (r.dias != null ? ' há ' + r.dias + 'd' : '') : ''}</span></div>
              <div class="tags">${tagBadges(r)}${sitBadge(r)}</div>
            </div>`).join('') || '<div class="empty" style="padding:16px">Sem posições</div>'}</div>
        </div>`;
      }).join('')}</div>` : `<div class="card empty">${ic('search')}<div>Nenhuma posição com esses filtros.</div></div>`;
      $$('.prow', body).forEach(el => el.onclick = () => { const r = l.rows.find(x => x.row === +el.dataset.row); if (!r) return; if (selOn) toggleSel(r); else openRow(l, r); });
      if (selOn) $$('.sec-h', body).forEach(hd => { const b = document.createElement('button'); b.className = 'btn sm ghost'; b.textContent = 'Todos'; b.title = 'Selecionar todo o setor'; b.onclick = e => { e.stopPropagation(); const nm = hd.closest('.sec').dataset.sec; const rr = rows.filter(r => r.setor === nm); const all = rr.every(r => SEL.set.has(selKey(r))); rr.forEach(r => all ? SEL.set.delete(selKey(r)) : SEL.set.add(selKey(r))); draw(); }; hd.insertBefore(b, hd.querySelector(':scope > .badge')); });
      $$('[data-tog]', body).forEach(el => el.onclick = e => {
        if (e.target.closest('[data-add],[data-pad],[data-lider]')) return;
        const card = el.closest('.sec'); card.classList.toggle('collapsed');
        if (!autoOpen) { const c = ls.get(expKey, {}); if (card.classList.contains('collapsed')) delete c[card.dataset.sec]; else c[card.dataset.sec] = 1; ls.set(expKey, c); }
        syncAllBtn();
      });
      const syncAllBtn = () => {
        const b = $('#secAll'); if (!b) return;
        const anyClosed = $$('.sec.collapsed', body).length > 0;
        b.querySelector('span').textContent = anyClosed ? 'Expandir todos' : 'Recolher todos';
        b.classList.toggle('open', !anyClosed);
      };
      const allBtn = $('#secAll');
      if (allBtn) allBtn.onclick = () => {
        const cards = $$('.sec', body); const abrir = cards.some(c => c.classList.contains('collapsed'));
        cards.forEach(c => c.classList.toggle('collapsed', !abrir));
        if (!autoOpen) { const c = {}; if (abrir) cards.forEach(x => c[x.dataset.sec] = 1); ls.set(expKey, c); }
        syncAllBtn();
      };
      syncAllBtn();
      $$('[data-add]', body).forEach(b => b.onclick = e => { e.stopPropagation(); openAddPos(l, l.setores.find(x => x.nome === b.dataset.add)); });
      $$('[data-pad]', body).forEach(b => b.onclick = e => { e.stopPropagation(); openPadrao(l, l.setores.find(x => x.nome === b.dataset.pad)); });
      $$('[data-lider]', body).forEach(b => b.onclick = e => { e.stopPropagation(); if (ed) openLider(l, b.dataset.lider, draw, !!b.dataset.trainee); });
      if (S.hl) { const el = $(`.prow[data-row="${S.hl}"]`, body); if (el) el.closest('.sec').classList.remove('collapsed'); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); S.hl = null; }
    }
  };
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); drawChips(); draw(); }; };
  bind('fq', 'q'); bind('fSetor', 'setor'); bind('fFunc', 'func'); bind('fContr', 'contr'); bind('fTag', 'tag');
  $('#exp').onclick = () => exportCSV('quadro_' + l.key.toLowerCase() + (f.sit === 'treino' || /TREINAMENTO/.test(norm(f.tag)) ? '_treino' : ''), ['Loja', 'Setor', 'QT', 'Colaborador', 'Função', 'Contrato', 'Situação', 'Tag', 'Tempo de empresa'], filt().map(r => [l.nome, r.setor, fmt(r.qt), r.nome, r.funcao, r.contrato, r.situacao, r.tag, r.tempo]));
  if ($('#lReq')) $('#lReq').onclick = () => openRequisicao({ loja: l.key });
  if ($('#selTog')) $('#selTog').onclick = () => { SEL.on[fk] = !SEL.on[fk]; if (!SEL.on[fk]) SEL.set.clear(); route(true); };
  const toggleSel = r => { const k = selKey(r); SEL.set.has(k) ? SEL.set.delete(k) : SEL.set.add(k); draw(); };
  const draw0 = draw;
  draw = () => { draw0(); quadroBulk($('#lBulk'), () => draw()); };
  drawChips(); draw();
}

/* ---------------- modais da posição ---------------- */
function chipPicker(name, options, value, multi = true) {
  const cur = splitMulti(value);
  const opts = uniq([...options, ...cur]);
  return `<div class="optchips" data-picker="${name}" data-multi="${multi ? 1 : 0}">${opts.map(o => `<span class="chip ${cur.includes(o) ? 'on' : ''}" data-v="${h(o)}">${h(o)}</span>`).join('')}</div>`;
}
function bindPickers(root) {
  $$('[data-picker]', root).forEach(p => {
    const multi = p.dataset.multi === '1';
    $$('.chip', p).forEach(c => c.onclick = () => {
      if (!multi) $$('.chip', p).forEach(x => x !== c && x.classList.remove('on'));
      c.classList.toggle('on');
    });
  });
}
const pickVal = (root, name) => $$(`[data-picker="${name}"] .chip.on`, root).map(c => c.dataset.v).join(', ');
const expectOf = r => ({ nome: r.nome, funcao: r.funcao });

function openRow(l, r) {
  const ed = canEdit(l.key);
  if (r.nome && ed) setTimeout(() => bindFotoColab(r.nome, l.key), 0);
  const funcs = allFuncoes();
  const info = r.info || {};
  modal({
    title: r.nome ? h(r.nome) : 'Vaga em aberto', icon: r.nome ? 'users' : 'briefcase', wide: true,
    body: `
      ${r.nome && ed ? `<label class="photo-drop" id="cfDrop" for="cfFile" style="margin-bottom:16px"><span id="cfAv">${avatar(r.nome, '', 'lg')}</span><div><b>${ic('camera')} ${fotoColab(r.nome) ? 'Trocar foto' : 'Colocar foto'}</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem. Ela aparece no lugar das iniciais em todo o sistema.</div>${cfgv(fotoKey(r.nome), '') ? '<button class="btn sm danger" id="cfRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="cfFile" accept="image/*" hidden></label>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">${lojaPill(l.key)}<span class="badge">${h(r.setor)}</span>${sitBadge(r)}${tagBadges(r)}${r.tempo ? `<span class="badge">${ic('clock')} ${h(r.tempo)}</span>` : ''}<span class="badge faint">Linha ${r.row} da aba ${h(l.sheet)}</span></div>
      ${r.isVaga ? `<div class="card" style="background:var(--surface2);margin-bottom:16px;padding:14px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b style="flex:1">Acompanhamento da vaga</b>${etapaBadge(r.etapa)} ${diasBadge(r.dias)}${ed ? `<button class="btn sm" data-act="info">${ic('edit')} Editar</button>` : ''}</div>
          <div class="muted" style="font-size:12.5px;margin-top:8px;line-height:1.7">Abertura: <b>${info.abertura ? isoToBR(info.abertura) : '—'}</b> · Responsável: <b>${h(info.responsavel || '—')}</b> · Candidatos: <b>${h(info.candidatos || '0')}</b>${info.previsao ? ` · Previsão: <b>${isoToBR(info.previsao)}</b>` : ''}${info.motivo ? `<br>Motivo: ${h(info.motivo)}` : ''}${info.obs ? `<br>Obs.: ${h(info.obs)}` : ''}</div>
        </div>` : ''}
      <div class="row2">
        <div class="field"><label>Colaborador</label><input class="input" id="eNome" value="${h(r.nome)}" ${ed ? '' : 'readonly'} placeholder="(vaga)"></div>
        <div class="field"><label>Função</label><input class="input" id="eFunc" list="dlFunc" value="${h(r.funcao)}" ${ed ? '' : 'readonly'}><datalist id="dlFunc">${funcs.map(x => `<option value="${h(x)}">`).join('')}</datalist></div>
      </div>
      <div class="field"><label>Contrato</label>${chipPicker('contrato', opc(l, 'contrato'), r.contrato)}</div>
      <div class="field"><label>Situação</label>${chipPicker('situacao', opc(l, 'situacao'), r.situacao)}</div>
      <div class="field"><label>Tag</label>${chipPicker('tag', opc(l, 'tag'), r.tag)}</div>
      <div class="field" style="max-width:180px"><label>QT (peso no quadro)</label><input class="input" id="eQt" type="number" step="0.01" value="${r.qt}" ${ed ? '' : 'readonly'}></div>
      ${r.nome ? '<div id="rowMov"></div>' : ''}`,
    foot: ed ? `
      ${isAdmin() ? `<button class="btn danger" data-act="del" style="margin-right:auto">${ic('trash')} Remover posição</button>` : ''}
      ${r.nome ? `<button class="btn danger" data-act="desl">${ic('door')} Desligar colaborador</button>` : ''}
      ${r.nome && !r.isVaga ? `<button class="btn" data-act="abrir">${ic('door')} Aviso prévio</button>` : ''}
      ${r.nome && !r.vagaAberta ? `<button class="btn ok" data-act="mov">${ic('swap')} Movimentar</button>` : ''}
      ${r.isVaga ? `<button class="btn ok" data-act="fill">${ic('check')} Preencher vaga</button>` : ''}
      <button class="btn primary" data-act="save">Salvar alterações</button>` : `<button class="btn" data-close>Fechar</button>`,
    onMount: m => {
      if (!ed) $$('.optchips .chip', m.el).forEach(c => c.style.pointerEvents = 'none'); else bindPickers(m.el);
      // quadro ADM: só uma senioridade por pessoa (Júnior, Pleno ou Sênior)
      if (ed && isAdmLoja(l)) { const SK = SEN.map(x => norm(x.k)); $$('[data-picker="tag"] .chip', m.el).forEach(c => { if (!SK.includes(norm(c.dataset.v))) return; const orig = c.onclick; c.onclick = () => { $$('[data-picker="tag"] .chip', m.el).forEach(x => { if (x !== c && SK.includes(norm(x.dataset.v))) x.classList.remove('on'); }); orig(); }; }); }
      const act = a => $(`[data-act="${a}"]`, m.el);
      if (act('save')) act('save').onclick = e => run(e.currentTarget, async () => {
        await api('saveRow', { loja: l.key, row: r.row, expect: expectOf(r), data: { nome: $('#eNome', m.el).value.trim().toUpperCase(), funcao: $('#eFunc', m.el).value.trim(), contrato: pickVal(m.el, 'contrato'), situacao: pickVal(m.el, 'situacao'), tag: pickVal(m.el, 'tag'), qt: +$('#eQt', m.el).value !== +r.qt ? $('#eQt', m.el).value : '' } });
        m.close(); toast('Posição atualizada'); S.hl = r.row; bgReload();
      });
      if (act('abrir')) act('abrir').onclick = () => { m.close(); openAbrirVaga(l, r); };
      if (act('mov')) act('mov').onclick = () => { m.close(); openMovimentar(l, r); };
      if (r.nome && $('#rowMov', m.el)) api('listMovimentacoes', { nome: r.nome, n: 20 }, { silent: true }).then(j => { const el = $('#rowMov', m.el); if (!el || !(j.movimentacoes || []).length) return; movCss(); el.innerHTML = `<label style="font-weight:700;font-size:12.5px">${ic('history')} Movimentações</label><div class="mv-hist">${j.movimentacoes.map(x => `<div><b>${h(x.tipo)}</b> · ${h(x.efetiva ? isoToBR(x.efetiva) : x.data.slice(0, 10))}<br><span class="muted">${h(LOJA_NOMES[x.deLoja] || x.deLoja)} · ${h(x.deSetor)} · ${h(x.deFuncao)} → ${h(LOJA_NOMES[x.paraLoja] || x.paraLoja)} · ${h(x.paraSetor)} · ${h(x.paraFuncao)}</span>${x.obs ? `<br><span class="faint">${h(x.obs)}</span>` : ''}</div>`).join('')}</div>`; }).catch(() => {});
      if (act('desl')) act('desl').onclick = () => { m.close(); openDesligar(l, r); };
      if (act('fill')) act('fill').onclick = () => { m.close(); openFill(l, r); };
      if (act('info')) act('info').onclick = () => { m.close(); openVagaInfo(l, r); };
      if (act('del')) act('del').onclick = async () => {
        if (!await confirmBox(`Remover definitivamente a linha <b>${h(r.funcao)}${r.nome ? ' — ' + h(r.nome) : ''}</b> da aba ${h(l.sheet)}?<br><span class="muted">Isso apaga a linha na planilha e altera o quadro padrão do setor.</span>`, 'Remover', true)) return;
        await run(null, async () => { await api('removerPosicao', { loja: l.key, row: r.row, expect: expectOf(r) }); m.close(); toast('Posição removida'); if (!liveOn) await loadAll(); });
      };
    }
  });
}

/* =====================================================================
 * MOVIMENTAR COLABORADOR — transferência de setor/loja, promoção, mudança de função
 * ===================================================================== */
const MOV_TIPOS = [
  { k: 'Transferência de setor', ic: 'swap', d: 'Mesma loja, outro setor' },
  { k: 'Transferência de loja', ic: 'store', d: 'Vai para outra loja' },
  { k: 'Promoção', ic: 'trend', d: 'Sobe de cargo' },
  { k: 'Mudança de função', ic: 'edit', d: 'Troca de função' }
];
function openMovimentar(l, r) {
  movCss();
  const lojasEd = S.data.lojas.filter(x => canEdit(x.key));
  const st = { tipo: 'Transferência de setor', loja: l.key, setor: r.setor, dest: '' };
  const tagsIni = r.tag;
  modal({
    title: 'Movimentar colaborador', icon: 'swap', wide: true,
    body: `
      <div class="mv-who">${avatar(r.nome, '', '')}<div><b>${h(r.nome)}</b><div class="muted" style="font-size:12.5px">${lojaPill(l.key)} · ${h(r.setor)} · ${h(r.funcao)}${r.tempo ? ' · ' + h(r.tempo) : ''}</div></div></div>
      <div class="field"><label>Tipo de movimentação</label><div class="mv-tipos" id="mvT">${MOV_TIPOS.map(t => `<button type="button" class="mv-tipo" data-t="${h(t.k)}">${ic(t.ic)}<b>${h(t.k)}</b><span>${h(t.d)}</span></button>`).join('')}</div></div>
      <div class="row2">
        <div class="field"><label>Para qual loja</label><select class="input" id="mvL">${lojasEd.map(x => `<option value="${h(x.key)}">${h(x.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>Para qual setor</label><select class="input" id="mvS"></select></div>
      </div>
      <div class="field"><label>Posição de destino</label><div class="mv-dest" id="mvD"></div></div>
      <div class="field hidden" id="mvFw"><label id="mvFl">Função na nova posição</label><input class="input" id="mvF" list="mvFd" placeholder="Ex.: ENCARREGADO(A)"><datalist id="mvFd">${allFuncoes().map(x => `<option value="${h(x)}">`).join('')}</datalist></div>
      <div class="field"><label>Tags no destino</label><div id="mvTag"></div></div>
      <div class="field" id="mvOw"><label>E a posição que ele deixa?</label><div class="seg" id="mvO" style="flex-wrap:wrap"><button type="button" data-o="vaga" class="on">${ic('briefcase')} Abrir vaga para repor</button>${isAdmin() ? `<button type="button" data-o="remover">${ic('trash')} Remover a posição</button>` : ''}</div></div>
      <div class="row2">
        <div class="field"><label>Data efetiva</label><input class="input" type="date" id="mvDt" value="${isoD(new Date())}"></div>
        <div class="field"><label>Observação</label><input class="input" id="mvOb" placeholder="Ex.: promoção aprovada pela diretoria"></div>
      </div>
      <div class="mv-resumo" id="mvR"></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="mvOk">${ic('check')} Confirmar movimentação</button>`,
    onMount: m => {
      const $m = s => $(s, m.el);
      let origem = 'vaga';
      const lojaD = () => lojaBy($m('#mvL').value);
      const drawTipos = () => $$('.mv-tipo', m.el).forEach(b => b.classList.toggle('on', b.dataset.t === st.tipo));
      const drawSetores = () => { const L = lojaD(); $m('#mvS').innerHTML = L.setores.map(s => `<option ${s.nome === st.setor ? 'selected' : ''}>${h(s.nome)}</option>`).join(''); if (!L.setores.some(s => s.nome === st.setor)) st.setor = L.setores[0] ? L.setores[0].nome : ''; };
      const drawTags = () => { const L = lojaD(); const cur = $m('#mvTag').dataset.init ? pickVal(m.el, 'tag') : tagsIni; $m('#mvTag').innerHTML = chipPicker('tag', opc(L, 'tag'), cur); $m('#mvTag').dataset.init = 1; bindPickers($m('#mvTag'));
        if (isAdmLoja(L)) { const SK = SEN.map(x => norm(x.k)); $$('[data-picker="tag"] .chip', m.el).forEach(c => { if (!SK.includes(norm(c.dataset.v))) return; const orig = c.onclick; c.onclick = () => { $$('[data-picker="tag"] .chip', m.el).forEach(x => { if (x !== c && SK.includes(norm(x.dataset.v))) x.classList.remove('on'); }); orig(); drawResumo(); }; }); } };
      const vagasDest = () => { const L = lojaD(); return L.rows.filter(x => x.setor === st.setor && x.vagaAberta && !(L.key === l.key && x.row === r.row)); };
      const drawDest = () => {
        const V = vagasDest(), mesma = lojaD().key === l.key && st.setor === r.setor && /Promo|Mudan/.test(st.tipo);
        const opts = V.map(v => `<button type="button" class="mv-op" data-d="${v.row}">${ic('briefcase')}<div><b>${h(v.funcao)}</b><span>Vaga aberta${v.dias != null ? ' há ' + v.dias + ' dia(s)' : ''}${v.etapa ? ' · ' + h(v.etapa) : ''}${v.contrato && norm(v.contrato) !== 'INTEGRAL' ? ' · ' + h(v.contrato) : ''}</span></div></button>`);
        if (mesma) opts.unshift(`<button type="button" class="mv-op" data-d="mesma">${ic('edit')}<div><b>Mesma posição</b><span>Continua no mesmo lugar, só muda a função</span></div></button>`);
        if (isAdmin()) opts.push(`<button type="button" class="mv-op" data-d="nova">${ic('plus')}<div><b>Criar nova posição</b><span>Aumenta o quadro do setor de destino</span></div></button>`);
        $m('#mvD').innerHTML = opts.length ? opts.join('') : `<div class="muted" style="font-size:13px;padding:10px 0">Não há vaga aberta neste setor. ${isAdmin() ? '' : 'Peça ao administrador para abrir uma posição.'}</div>`;
        if (!$(`.mv-op[data-d="${st.dest}"]`, m.el)) { const pri = $('.mv-op:not([data-d="nova"])', m.el); st.dest = pri ? pri.dataset.d : ''; } // "criar nova posição" só quando clicado
        $$('.mv-op', m.el).forEach(b => { b.classList.toggle('on', b.dataset.d === st.dest); b.onclick = () => { st.dest = b.dataset.d; drawDest(); }; });
        const precisaF = st.dest === 'nova' || st.dest === 'mesma';
        $m('#mvFw').classList.toggle('hidden', !precisaF);
        $m('#mvFl').textContent = st.dest === 'mesma' ? 'Nova função' : 'Função na nova posição';
        if (precisaF && !$m('#mvF').value) $m('#mvF').value = st.dest === 'nova' ? r.funcao : '';
        $m('#mvOw').classList.toggle('hidden', st.dest === 'mesma');
        drawResumo();
      };
      const destInfo = () => { const L = lojaD(); if (st.dest === 'mesma') return { L: lojaBy(l.key), setor: r.setor, funcao: $m('#mvF').value.trim() }; if (st.dest === 'nova') return { L, setor: st.setor, funcao: $m('#mvF').value.trim() }; const v = L.rows.find(x => x.row === +st.dest); return v ? { L, setor: v.setor, funcao: v.funcao, v } : null; };
      const drawResumo = () => {
        const d = destInfo();
        $m('#mvR').innerHTML = d ? `<div class="mv-flow"><div class="mv-box"><span>DE</span><b>${h(l.nome)}</b><small>${h(r.setor)}</small><small>${h(r.funcao)}</small></div><div class="mv-arrow">${ic('swap')}<em>${h(st.tipo)}</em></div><div class="mv-box to"><span>PARA</span><b>${h(d.L.nome)}</b><small>${h(d.setor)}</small><small>${h(d.funcao || '—')}</small></div></div>${st.dest !== 'mesma' ? `<div class="muted" style="font-size:12px;margin-top:8px;text-align:center">${origem === 'remover' ? 'A posição de origem será removida do quadro.' : `A posição de ${h(r.funcao)} em ${h(r.setor)} vira <b>vaga aberta</b> (motivo: ${h(st.tipo)}).`}</div>` : ''}` : '';
      };
      $$('.mv-tipo', m.el).forEach(b => b.onclick = () => {
        st.tipo = b.dataset.t; drawTipos();
        if (st.tipo === 'Transferência de loja' && $m('#mvL').value === l.key) { const outra = lojasEd.find(x => x.key !== l.key); if (outra) { $m('#mvL').value = outra.key; drawSetores(); drawTags(); } }
        if (st.tipo !== 'Transferência de loja' && $m('#mvL').value !== l.key && lojasEd.some(x => x.key === l.key) && st.tipo === 'Transferência de setor') { $m('#mvL').value = l.key; drawSetores(); drawTags(); }
        drawDest();
      });
      $m('#mvL').value = l.key;
      $m('#mvL').onchange = () => { drawSetores(); drawTags(); drawDest(); };
      $m('#mvS').onchange = () => { st.setor = $m('#mvS').value; drawDest(); };
      $m('#mvF').oninput = drawResumo;
      $$('#mvO button', m.el).forEach(b => b.onclick = () => { origem = b.dataset.o; $$('#mvO button', m.el).forEach(x => x.classList.toggle('on', x === b)); drawResumo(); });
      // começa sugerindo outro setor quando for transferência de setor
      const outros = lojaD().setores.filter(s => s.nome !== r.setor);
      if (outros.length) st.setor = (outros.find(s => s.linhas.some(x => x.vagaAberta)) || outros[0]).nome;
      drawTipos(); drawSetores(); drawTags(); drawDest();
      $m('#mvOk').onclick = e => run(e.currentTarget, async () => {
        const d = destInfo();
        if (!d) throw new Error('Escolha a posição de destino');
        if ((st.dest === 'nova' || st.dest === 'mesma') && !d.funcao) throw new Error('Informe a função');
        if (st.dest === 'mesma' && norm(d.funcao) === norm(r.funcao)) throw new Error('A nova função é igual à atual');
        const payload = {
          tipo: st.tipo, origemAcao: origem, dataEfetiva: $m('#mvDt').value, obs: $m('#mvOb').value.trim(), responsavel: S.user.nome,
          origem: { loja: l.key, row: r.row, setor: r.setor, expect: expectOf(r) },
          destino: st.dest === 'mesma' ? { loja: l.key, mesmaPosicao: true, funcao: d.funcao.toUpperCase(), tag: pickVal(m.el, 'tag') }
            : st.dest === 'nova' ? { loja: d.L.key, setor: d.setor, funcao: d.funcao.toUpperCase(), tag: pickVal(m.el, 'tag'), contrato: r.contrato }
            : { loja: d.L.key, row: d.v.row, setor: d.setor, expect: expectOf(d.v), tag: pickVal(m.el, 'tag') }
        };
        const j = await api('movimentar', payload);
        m.close();
        if (!j.pendente) toast(`${r.nome.split(' ')[0]} movimentado(a): ${st.tipo.toLowerCase()} para ${d.L.nome} · ${d.setor}`);
      });
    }
  });
}
function movCss() {
  if (document.getElementById('movCss')) return;
  const s = document.createElement('style'); s.id = 'movCss';
  s.textContent = `
  .mv-who{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);margin-bottom:16px}
  .mv-tipos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .mv-tipo{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px;border-radius:14px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;text-align:left;font:inherit}
  .mv-tipo b{font-size:13px}.mv-tipo span{font-size:11.5px;color:var(--muted)}.mv-tipo .i{color:var(--accent)}
  .mv-tipo.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface))}
  .mv-dest{display:flex;flex-direction:column;gap:6px;max-height:230px;overflow:auto}
  .mv-op{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;text-align:left;font:inherit}
  .mv-op b{display:block;font-size:13px}.mv-op span{font-size:11.5px;color:var(--muted)}
  .mv-op.on{border-color:var(--ok,#34d399);background:color-mix(in srgb,var(--ok,#34d399) 10%,var(--surface))}
  .mv-flow{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;padding:14px;border-radius:16px;background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 10%,var(--surface2)),var(--surface2))}
  .mv-box{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--border)}
  .mv-box span{font-size:10px;font-weight:800;letter-spacing:1.5px;color:var(--muted)}.mv-box b{font-size:14px}.mv-box small{font-size:12px;color:var(--muted)}
  .mv-box.to{border-color:color-mix(in srgb,var(--ok,#34d399) 60%,transparent)}
  .mv-arrow{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--accent)}.mv-arrow em{font-style:normal;font-size:11px;font-weight:700;text-align:center;max-width:110px}
  .mv-hist{display:flex;flex-direction:column;gap:6px;margin-top:6px}
  .mv-hist div{font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--surface2)}
  @media (max-width:700px){.mv-tipos{grid-template-columns:repeat(2,minmax(0,1fr))}.mv-flow{grid-template-columns:1fr}.mv-arrow{flex-direction:row}}`;
  document.head.appendChild(s);
}

function openAbrirVaga(l, r) {
  modal({
    title: 'Abrir vaga (aviso, promoção ou transferência)', icon: 'swap',
    body: `<p class="muted" style="margin-top:0">${h(r.funcao)} · ${h(r.setor)} · ${lojaPill(l.key)}<br>Colaborador atual: <b style="color:var(--text)">${h(r.nome)}</b></p>
      <div class="field"><label>Motivo</label>
        <select class="input" id="aMot">
          <option value="EM AVISO">Em aviso prévio (mantém o nome e marca "EM AVISO, VAGA")</option>
          <option value="Promoção">Promoção / mudança de função</option>
          <option value="Transferência">Transferência de loja</option>
        </select></div>
      <div class="field"><label>Responsável pela seleção</label><input class="input" id="aResp" value="${h(S.user.nome)}"></div>
      <div class="field"><label>Observação</label><textarea class="input" id="aObs" placeholder="Opcional"></textarea></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="aOk">${ic('door')} Abrir vaga</button>`,
    onMount: m => $('#aOk', m.el).onclick = e => run(e.currentTarget, async () => {
      await api('abrirVaga', { loja: l.key, row: r.row, expect: expectOf(r), setor: r.setor, motivo: $('#aMot', m.el).value, responsavel: $('#aResp', m.el).value, obs: $('#aObs', m.el).value });
      m.close(); toast('Vaga aberta e enviada para Vagas'); S.hl = r.row; bgReload();
    })
  });
}

function openFill(l, r, contrPre) {
  const pend = (S.data.contratacoes.rows || []).filter(c => c._pend && c._loja === l.key);
  modal({
    title: 'Preencher vaga', icon: 'userplus',
    body: `<p class="muted" style="margin-top:0">${h(r.funcao)} · ${h(r.setor)} · ${lojaPill(l.key)}</p>
      ${pend.length ? `<div class="field"><label>Vincular a uma contratação pendente (opcional)</label><select class="input" id="fC"><option value="">— Digitar nome manualmente —</option>${pend.map(c => `<option value="${c.row}" ${contrPre && contrPre.row === c.row ? 'selected' : ''}>${h(c[S.ck.colab])} · ${h(c[S.ck.funcao])} · ${h(c[S.ck.data])}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Nome do colaborador</label><input class="input" id="fN" value="${h(contrPre ? contrPre[S.ck.colab] : (r.vagaFutura ? '' : ''))}" placeholder="NOME COMPLETO"></div>
      <div class="field"><label>Contrato</label>${chipPicker('contrato', opc(l, 'contrato'), r.contrato)}</div>
      <div class="field"><label>Tag</label>${chipPicker('tag', opc(l, 'tag'), '')}</div>
      ${r.vagaFutura ? `<div class="badge b-warn" style="white-space:normal;padding:10px">Esta posição ainda está com ${h(r.nome)} (em aviso). O nome será substituído pelo novo colaborador.</div>` : ''}`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn ok" id="fOk">${ic('check')} Confirmar</button>`,
    onMount: m => {
      bindPickers(m.el);
      const sel = $('#fC', m.el);
      if (sel) sel.onchange = () => { const c = pend.find(x => x.row === +sel.value); if (c) $('#fN', m.el).value = c[S.ck.colab]; };
      $('#fOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const contrRow = sel && sel.value ? +sel.value : null;
        if (!$('#fN', m.el).value.trim()) throw new Error('Informe o nome do colaborador');
        const statusOpc = (S.data.contratacoes.opcoes || {})[S.ck.status] || [];
        await api(contrRow ? 'alocar' : 'preencherVaga', { loja: l.key, row: r.row, expect: expectOf(r), setor: r.setor, nome: $('#fN', m.el).value, contrato: pickVal(m.el, 'contrato'), tag: pickVal(m.el, 'tag'), contrRow, statusAlocado: statusOpc.find(x => /ALOCAD/i.test(x)) || 'Alocado' });
        m.close(); toast('Vaga preenchida'); S.hl = r.row; bgReload();
      });
    }
  });
}

function openAddPos(l, sec) {
  const funcs = uniq(sec.linhas.map(x => x.funcao).concat(allFuncoes()));
  modal({
    title: 'Nova posição no quadro', icon: 'plus',
    body: `<p class="muted" style="margin-top:0">${lojaPill(l.key)} · ${h(sec.nome)}<br>A linha será inserida dentro do setor na planilha, já marcada como <b>VAGA</b>.</p>
      <div class="field"><label>Função</label><input class="input" id="nF" list="dlF2" placeholder="Ex.: REPOSITOR(A)"><datalist id="dlF2">${funcs.map(x => `<option value="${h(x)}">`).join('')}</datalist></div>
      <div class="field"><label>Contrato</label>${chipPicker('contrato', opc(l, 'contrato'), 'INTEGRAL')}</div>
      <div class="row2"><div class="field"><label>QT (peso)</label><input class="input" id="nQ" type="number" step="0.01" value="1"></div><div class="field"><label>Quantidade de posições</label><input class="input" id="nN" type="number" min="1" max="20" value="1"></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="nOk">${ic('plus')} Adicionar</button>`,
    onMount: m => {
      bindPickers(m.el);
      $('#nOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const fn = $('#nF', m.el).value.trim().toUpperCase();
        if (!fn) throw new Error('Informe a função');
        const n = Math.min(20, Math.max(1, +$('#nN', m.el).value || 1));
        for (let i = 0; i < n; i++) {
          const fresh = S.data.lojas.find(x => x.key === l.key).setores.find(x => x.nome === sec.nome);
          await api('addPosicao', { loja: l.key, setor: sec.nome, firstRow: fresh.linhas[0] ? fresh.linhas[0].row : sec.row + 3, funcao: fn, contrato: pickVal(m.el, 'contrato') || 'INTEGRAL', qt: $('#nQ', m.el).value });
          if (n > 1 && !liveOn) await loadAll();
        }
        m.close(); toast(n + ' posição(ões) adicionada(s)'); if (!liveOn) await loadAll();
      });
    }
  });
}

function openVagaInfo(l, r) {
  if (!l || !r) return;
  const i = r.info || {};
  const ro = !canEdit(l.key);
  modal({
    title: 'Acompanhamento da vaga', icon: 'briefcase',
    body: `<p class="muted" style="margin-top:0">${h(r.funcao)} · ${h(r.setor)} · ${lojaPill(l.key)}</p>
      <div class="field"><label>Etapa</label>${chipPicker('etapa', ETAPAS(), r.etapa, false)}</div>
      <div class="row2">
        <div class="field"><label>Responsável</label><input class="input" id="vR" value="${h(i.responsavel || S.user.nome)}"></div>
        <div class="field"><label>Nº de candidatos</label><input class="input" id="vC" type="number" min="0" value="${h(i.candidatos || '')}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Data de abertura</label><input class="input" id="vA" type="date" value="${h(i.abertura || isoD(new Date()))}"></div>
        <div class="field"><label>Previsão de fechamento</label><input class="input" id="vP" type="date" value="${h(i.previsao || '')}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea class="input" id="vO">${h(i.obs || '')}</textarea></div>`,
    foot: ro ? `<button class="btn primary" data-close>Fechar</button>` : `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="vOk">Salvar</button>`,
    onMount: m => {
      if (ro) { $$('input,textarea', m.el).forEach(x => x.disabled = true); $$('.chip, [data-v]', m.el).forEach(x => x.style.pointerEvents = 'none'); return; }
      bindPickers(m.el);
      $('#vOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const j = await api('setVagaInfo', { loja: l.key, row: r.row, expect: expectOf(r), setor: r.setor, data: { etapa: pickVal(m.el, 'etapa') || 'Aberta', responsavel: $('#vR', m.el).value, candidatos: $('#vC', m.el).value, abertura: $('#vA', m.el).value, previsao: $('#vP', m.el).value, obs: $('#vO', m.el).value } });
        m.close(); if (!j.pendente) toast('Vaga atualizada'); bgReload();
      });
    }
  });
}

/* =====================================================================
 * VAGAS
 * ===================================================================== */
function agruparVagas(rows) {
  const m = new Map();
  rows.forEach(r => {
    const k = [r.loja, r.setor, r.funcao, r.contrato].join('|');
    let g = m.get(k);
    if (!g) m.set(k, g = { loja: r.loja, setor: r.setor, funcao: r.funcao, contrato: r.contrato, qtd: 0, abertas: 0, futuras: 0, maxDias: null, etapas: {}, resp: new Set(), itens: [] });
    g.qtd++; r.vagaFutura ? g.futuras++ : g.abertas++;
    if (r.dias != null && (g.maxDias == null || r.dias > g.maxDias)) g.maxDias = r.dias;
    if (r.etapa) g.etapas[r.etapa] = (g.etapas[r.etapa] || 0) + 1;
    if (r.info && r.info.responsavel) g.resp.add(r.info.responsavel);
    g.itens.push(r);
  });
  return [...m.values()].map(g => Object.assign(g, { etapasTxt: Object.entries(g.etapas).map(([e, n]) => n > 1 ? e + ' (' + n + ')' : e).join(', '), respTxt: [...g.resp].join(', ') }));
}
function pgVagas() {
  setTitle('Vagas', 'Todas as vagas do quadro, por loja');
  const f = getF('vagas');
  if (window.__grcVagaLoja) { f.loja = window.__grcVagaLoja; window.__grcVagaLoja = null; saveF(); }
  if (f.fut === undefined) f.fut = '1';
  const base = () => S.all.filter(r => r.vagaAberta || (f.fut === '1' && r.vagaFutura));
  const all = base();
  const L = S.data.lojas;
  const abertas = S.all.filter(r => r.vagaAberta);
  const comD = abertas.filter(r => r.dias != null);
  const D = S.data;
  const fech30 = (D.vagasFechadas || []).filter(v => { const d = daysTo(parseISO(v.fechamento)); return d != null && d >= -30; });
  const tF = (D.vagasFechadas || []).filter(v => v.abertura && v.fechamento).map(v => (parseISO(v.fechamento) - parseISO(v.abertura)) / 864e5);
  const view = getV('vagas2', 'agrupado');
  const v = $('#view');
  v.innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Vagas em aberto', val: abertas.length, sub: `${fmt(sum(abertas, r => r.qt))} em peso de quadro`, icon: 'briefcase', c: 'c-red' })}
    ${kpi({ lbl: 'Vagas futuras', val: S.all.filter(r => r.vagaFutura).length, sub: 'Em aviso prévio / troca', icon: 'door', c: 'c-amber' })}
    ${kpi({ lbl: 'Tempo médio em aberto', val: comD.length ? Math.round(sum(comD, r => r.dias) / comD.length) + ' <small>dias</small>' : '—', sub: `${comD.filter(r => r.dias > 30).length} acima de 30 dias`, icon: 'clock', c: 'c-blue' })}
    ${kpi({ lbl: 'Fechadas nos últimos 30 dias', val: fech30.length, sub: tF.length ? `Média de ${Math.round(sum(tF) / tF.length)} dias para fechar` : 'Registradas pelo sistema', icon: 'trend', c: 'c-green' })}
  </div>
  <div class="chips mt" id="lojaChips"></div>
  <div class="toolbar">
    <div class="input-icon search">${ic('search')}<input class="input" id="vq" placeholder="Buscar função ou setor" value="${h(f.q || '')}" style="width:100%"></div>
    ${selectHTML('vSetor', 'Setor', uniq(all.map(r => r.setor)).sort(), f.setor)}
    ${selectHTML('vFunc', 'Função', uniq(all.map(r => r.funcao)).sort(), f.func, 'Todas')}
    ${selectHTML('vEtapa', 'Etapa', ETAPAS(), f.etapa, 'Todas')}
    ${selectHTML('vContr', 'Contrato', uniq(all.map(r => r.contrato)).sort(), f.contr)}
    <label class="chip ${f.fut === '1' ? 'on' : ''}" id="vFut">${ic('door')} Incluir vagas futuras</label>
    <span class="spacer"></span>
    <div class="seg" id="vw"><button data-v="agrupado">${ic('grid')}<span class="desk-only">Agrupado</span></button><button data-v="lista">${ic('list')}<span class="desk-only">Lista</span></button><button data-v="kanban">${ic('kanban')}<span class="desk-only">Funil</span></button><button data-v="funcao">${ic('table')}<span class="desk-only">Por função</span></button></div>
    <button class="btn" id="vPdf" title="Gerar PDF para compartilhar">${ic('file')} PDF</button>
    <button class="btn" id="vExp" title="Exportar Excel / PDF">${ic('download')}</button>
  </div>
  <div id="vBulk" class="bulk hidden"></div>
  <div id="vBody"></div>`;
  const filt = () => { const q = norm(f.q); return base().filter(r => (!f.loja || r.loja === f.loja) && (!q || norm(r.funcao + ' ' + r.setor).includes(q)) && (!f.setor || r.setor === f.setor) && (!f.func || r.funcao === f.func) && (!f.etapa || r.etapa === f.etapa) && (!f.contr || r.contrato === f.contr)); };
  const drawChips = () => {
    $('#lojaChips').innerHTML = `<span class="chip ${!f.loja ? 'on' : ''}" data-k="">Todas as lojas <span class="n">${base().length}</span></span>` + L.map(l => `<span class="chip ${f.loja === l.key ? 'on' : ''}" data-k="${l.key}" style="--lc:${l.color}"><span class="loja-pill" style="--lc:${l.color}"><i></i></span>Loja ${l.num} · ${h(l.nome)} <span class="n">${base().filter(r => r.loja === l.key).length}</span></span>`).join('');
    $$('#lojaChips .chip').forEach(c => c.onclick = () => { f.loja = c.dataset.k; saveF(); drawChips(); draw(); });
  };
  $$('#vw button').forEach(b => { b.classList.toggle('on', b.dataset.v === view); b.onclick = () => { setV('vagas2', b.dataset.v); route(); }; });
  const draw = () => {
    const rows = filt(), body = $('#vBody');
    if (view === 'kanban') return drawKanban(body, rows);
    if (view === 'funcao') return drawMatrix(body, rows);
    if (view === 'agrupado') {
      const G = agruparVagas(rows);
      return table(body, 'vagasG', [
        { t: 'Loja', k: 'loja', r: g => lojaPill(g.loja) },
        { t: 'Setor', k: 'setor' },
        { t: 'Função', k: 'funcao', r: g => `<b>${h(g.funcao)}</b>` },
        { t: 'Contrato', k: 'contrato' },
        { t: 'Qtd', k: 'qtd', r: g => `<span class="badge b-bad" style="font-size:13px;min-width:34px;justify-content:center">${g.qtd}</span>` },
        { t: 'Abertas / futuras', k: 'abertas', r: g => `${g.abertas} aberta(s)${g.futuras ? ` · <span class="muted">${g.futuras} futura(s)</span>` : ''}` },
        { t: 'Mais antiga', k: 'maxDias', r: g => diasBadge(g.maxDias) },
        { t: 'Etapas', k: 'etapasTxt', r: g => h(g.etapasTxt || '—') },
        { t: 'Responsável', k: 'respTxt', r: g => h(g.respTxt || '—') }
      ], G, g => { f.loja = g.loja; f.setor = g.setor; f.func = g.funcao; saveF(); setV('vagas2', 'lista'); route(); });
    }
    selScope('vagas');
    const vsel = canEdit();
    table(body, 'vagas', [
      ...(vsel ? [{ t: '', k: '', nosort: true, w: '30px', th: `<input type="checkbox" id="vSelAll" ${rows.length && rows.every(r => SEL.set.has(selKey(r))) ? 'checked' : ''}>`, r: r => canEdit(r.loja) ? `<input type="checkbox" data-stop data-vsel="${r.loja}|${r.row}" ${SEL.set.has(selKey(r)) ? 'checked' : ''}>` : '' }] : []),
      { t: 'Loja', k: 'loja', r: r => lojaPill(r.loja) },
      { t: 'Setor', k: 'setor' },
      { t: 'Função', k: 'funcao', r: r => `<b>${h(r.funcao)}</b>${r.vagaFutura ? `<div class="muted" style="font-size:11.5px">Sai: ${h(r.nome)}</div>` : ''}` },
      { t: 'Contrato', k: 'contrato' },
      { t: 'Situação', k: 'situacao', r: sitBadge },
      { t: 'Etapa', k: 'etapa', r: r => etapaBadge(r.etapa), sort: r => ETAPAS().indexOf(r.etapa) },
      { t: 'Em aberto', k: 'dias', r: r => diasBadge(r.dias) },
      { t: 'Responsável', k: 'resp', r: r => h((r.info && r.info.responsavel) || '—'), sort: r => (r.info && r.info.responsavel) || '' },
      { t: 'Cand.', k: 'cand', r: r => h((r.info && r.info.candidatos) || '—'), sort: r => +((r.info && r.info.candidatos) || 0) },
      { t: '', k: '', nosort: true, r: r => canEdit(r.loja) ? `<div style="display:flex;gap:6px" data-stop><button class="btn sm" data-info="${r.loja}|${r.row}" title="Acompanhamento">${ic('edit')}</button><button class="btn sm ok" data-fill="${r.loja}|${r.row}">${ic('check')} Preencher</button></div>` : '' }
    ], rows, r => openRow(lojaBy(r.loja), r));
    $$('[data-vsel]', body).forEach(c => c.onchange = () => { c.checked ? SEL.set.add(c.dataset.vsel) : SEL.set.delete(c.dataset.vsel); quadroBulk($('#vBulk'), draw); });
    const va = $('#vSelAll', body); if (va) va.onchange = () => { rows.filter(r => canEdit(r.loja)).forEach(r => va.checked ? SEL.set.add(selKey(r)) : SEL.set.delete(selKey(r))); draw(); };
    quadroBulk($('#vBulk'), draw);
    $$('[data-fill]', body).forEach(b => b.onclick = () => { const [k, row] = b.dataset.fill.split('|'); const l = lojaBy(k); openFill(l, l.rows.find(x => x.row === +row)); });
    $$('[data-info]', body).forEach(b => b.onclick = () => { const [k, row] = b.dataset.info.split('|'); const l = lojaBy(k); openVagaInfo(l, l.rows.find(x => x.row === +row)); });
  };
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('vq', 'q'); bind('vSetor', 'setor'); bind('vFunc', 'func'); bind('vEtapa', 'etapa'); bind('vContr', 'contr');
  $('#vFut').onclick = () => { f.fut = f.fut === '1' ? '0' : '1'; saveF(); route(); };
  $('#vPdf').onclick = () => vagasPDF(filt(), f);
  $('#vExp').onclick = () => view === 'agrupado' ? exportCSV('vagas', ['Loja', 'Setor', 'Função', 'Contrato', 'Quantidade', 'Abertas', 'Futuras', 'Mais antiga (dias)', 'Etapas', 'Responsável'], agruparVagas(filt()).map(g => [LOJA_NOMES[g.loja], g.setor, g.funcao, g.contrato, g.qtd, g.abertas, g.futuras, g.maxDias == null ? '' : g.maxDias, g.etapasTxt, g.respTxt])) : exportCSV('vagas', ['Loja', 'Setor', 'Função', 'Contrato', 'Situação', 'Etapa', 'Dias em aberto', 'Abertura', 'Responsável', 'Candidatos', 'Motivo', 'Obs'], filt().map(r => [LOJA_NOMES[r.loja], r.setor, r.funcao, r.contrato, r.situacao, r.etapa, r.dias == null ? '' : r.dias, r.info ? isoToBR(r.info.abertura) : '', r.info ? r.info.responsavel : '', r.info ? r.info.candidatos : '', r.info ? r.info.motivo : '', r.info ? r.info.obs : '']));
  drawChips(); draw();
}
function drawKanban(body, rows) {
  const E = ETAPAS();
  body.innerHTML = `<div class="kanban">${E.map(e => { const rr = rows.filter(r => r.etapa === e); return `<div class="kcol" data-e="${h(e)}"><div class="kcol-h">${etapaBadge(e)}<span class="muted">${rr.length}</span></div>${rr.map(r => `<div class="vcard" draggable="${canEdit(r.loja)}" data-k="${r.loja}" data-row="${r.row}" style="--lc:${LC[r.loja]}"><div class="lstripe"></div><b>${h(r.funcao)}</b><div class="muted" style="font-size:12px">${h(r.setor)}</div><div class="meta">${lojaPill(r.loja)}${diasBadge(r.dias)}${r.vagaFutura ? '<span class="badge b-warn">futura</span>' : ''}${r.info && r.info.candidatos ? `<span class="badge">${ic('users')}${h(r.info.candidatos)}</span>` : ''}</div></div>`).join('') || '<div class="faint" style="font-size:12px;text-align:center;padding:20px 0">Arraste vagas para cá</div>'}</div>`; }).join('')}</div>`;
  let drag = null;
  $$('.vcard', body).forEach(c => {
    c.ondragstart = e => { drag = c; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; };
    c.ondragend = () => c.classList.remove('dragging');
    c.onclick = () => { const l = lojaBy(c.dataset.k); openVagaInfo(l, l.rows.find(x => x.row === +c.dataset.row)); };
  });
  $$('.kcol', body).forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async e => {
      e.preventDefault(); col.classList.remove('over');
      if (!drag) return;
      const l = lojaBy(drag.dataset.k), r = l.rows.find(x => x.row === +drag.dataset.row), et = col.dataset.e;
      if (!r || r.etapa === et) return;
      if (!canEdit(l.key)) { toast('Seu perfil não pode alterar etapas de vagas', true); return; }
      col.appendChild(drag);
      try { const j = await api('setVagaInfo', { loja: l.key, row: r.row, expect: expectOf(r), setor: r.setor, data: { etapa: et } }); if (!j.pendente) toast(`${r.funcao} → ${et}`); bgReload(); }
      catch (err) { toast(err.message, true); route(); }
    };
  });
}
function drawMatrix(body, rows) {
  const L = S.data.lojas;
  const fs = uniq(rows.map(r => r.funcao)).map(fn => ({ fn, by: L.map(l => rows.filter(r => r.funcao === fn && r.loja === l.key).length) })).map(x => Object.assign(x, { t: sum(x.by) })).sort((a, b) => b.t - a.t);
  body.innerHTML = fs.length ? `<div class="tbl-wrap"><table class="tbl funcmatrix"><thead><tr><th>Função</th>${L.map(l => `<th style="text-align:center">${lojaPill(l.key)}</th>`).join('')}<th style="text-align:center">Total</th><th style="width:30%"></th></tr></thead><tbody>${fs.map(x => `<tr><td><b>${h(x.fn)}</b></td>${x.by.map(n => `<td class="c ${n ? '' : 'z'}">${n || '·'}</td>`).join('')}<td class="c" style="color:var(--bad)">${x.t}</td><td><div class="bar" style="--kc:var(--accent2)"><i style="width:${pct(x.t, fs[0].t)}%;background:var(--grad)"></i></div></td></tr>`).join('')}</tbody></table></div><p class="muted" style="font-size:12px">Use esta visão para planejar processos seletivos em lote (ex.: abrir uma única divulgação para todas as vagas de uma função).</p>` : `<div class="card empty">${ic('check')}<div>Nenhuma vaga com esses filtros.</div></div>`;
}

/* =====================================================================
 * CONTRATAÇÕES
 * ===================================================================== */
function openAlocar(c, force) {
  const K = S.ck, l = lojaBy(c._loja);
  if (!l) return toast('Loja da contratação não reconhecida', true);
  const fn = norm(c[K.funcao]).replace(/[^A-Z]/g, '').slice(0, 5);
  const vagas = l.rows.filter(r => r.isVaga).sort((a, b) => {
    const ma = norm(a.funcao).replace(/[^A-Z]/g, '').startsWith(fn) ? 0 : 1, mb = norm(b.funcao).replace(/[^A-Z]/g, '').startsWith(fn) ? 0 : 1;
    return ma - mb || (a.vagaAberta ? 0 : 1) - (b.vagaAberta ? 0 : 1);
  });
  if (!vagas.length) return toast('Não há vagas abertas em ' + l.nome + '. Crie uma posição antes.', true);
  // alocação automática: mesma função (e mesmo setor, se informado) → aloca direto, sem formulário
  const nf = x => norm(x).replace(/[^A-Z]/g, ''), cf = nf(c[K.funcao]), cs = nf(K.setor ? c[K.setor] : '');
  const score = r => { const rf = nf(r.funcao), rs = nf(r.setor); let sc = 0; if (cf && rf === cf) sc += 4; else if (cf && (rf.startsWith(cf.slice(0, 5)) || cf.startsWith(rf.slice(0, 5)))) sc += 2; if (cs && rs && (rs === cs || rs.includes(cs) || cs.includes(rs))) sc += 3; if (r.vagaAberta) sc += 1; return sc; };
  const cand = vagas.filter(r => r.vagaAberta).map(r => ({ r, sc: score(r) })).filter(x => x.sc - (x.r.vagaAberta ? 1 : 0) >= 2 + (cs ? 3 : 0)).sort((a, b) => b.sc - a.sc || (b.r.dias || 0) - (a.r.dias || 0));
  if (!cand.length && cs) { const sf = vagas.filter(r => r.vagaAberta && score(r) - (r.vagaAberta ? 1 : 0) >= 2); if (sf.length && sf.every(x => nf(x.funcao) === nf(sf[0].funcao) && nf(x.setor) === nf(sf[0].setor))) cand.push({ r: sf.sort((a, b) => (b.vagaAberta ? 1 : 0) - (a.vagaAberta ? 1 : 0) || (b.dias || 0) - (a.dias || 0))[0], sc: 0 }); }
  if (!force && cand.length) {
    const r = cand[0].r, row = r.row;
    const statusOpc = (S.data.contratacoes.opcoes || {})[K.status] || [];
    const ct = c[K.contrato] && opc(l, 'contrato').includes(c[K.contrato]) ? c[K.contrato] : r.contrato;
    if (openAlocar.lock) return; openAlocar.lock = 1;
    toast(`Alocando ${c[K.colab]}…`);
    return api('alocar', { loja: l.key, row, expect: expectOf(r), setor: r.setor, nome: c[K.colab], contrato: ct, tag: /APRENDIZ/.test(norm(ct)) ? 'APRENDIZ' : '', contrRow: c.row, statusAlocado: statusOpc.find(x => /ALOCAD/i.test(x)) || 'Alocado' })
      .then(j => { if (!j.pendente) toast(`${c[K.colab]} alocado(a) em ${r.funcao} · ${r.setor} (${l.nome})`); bgReload(); })
      .catch(e => toast(e.message || String(e), true)).finally(() => { openAlocar.lock = 0; });
  }
  modal({
    title: 'Alocar no quadro', icon: 'swap', wide: true,
    body: `<p class="muted" style="margin-top:0"><b style="color:var(--text)">${h(c[K.colab])}</b> · ${h(c[K.funcao])}${K.setor && c[K.setor] ? ' · ' + h(c[K.setor]) : ''} · ${lojaPill(l.key)}<br>${force ? '' : '<b style="color:var(--warn)">Não encontrei vaga aberta com a mesma função/setor.</b> '}Escolha a vaga que este colaborador vai ocupar. A linha do quadro será preenchida e a contratação marcada como alocada.</p>
      <div class="alist" style="max-height:420px">${vagas.map((r, i) => `<label class="aitem" style="cursor:pointer;align-items:center"><input type="radio" name="vg" value="${r.row}" ${i === 0 ? 'checked' : ''}><div class="avatar sm vaga-av">${ic('briefcase')}</div><div style="flex:1"><b>${h(r.funcao)}</b><span>${h(r.setor)}${r.vagaFutura ? ' · substitui ' + h(r.nome) : ''}</span></div>${etapaBadge(r.etapa)}${i === 0 && norm(r.funcao).replace(/[^A-Z]/g, '').startsWith(fn) ? '<span class="badge b-ok">sugerida</span>' : ''}</label>`).join('')}</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn ok" id="alOk">${ic('check')} Alocar</button>`,
    onMount: m => $('#alOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const row = +$('input[name=vg]:checked', m.el).value;
      const r = l.rows.find(x => x.row === row);
      const statusOpc = (S.data.contratacoes.opcoes || {})[K.status] || [];
      const ct = c[K.contrato] && opc(l, 'contrato').includes(c[K.contrato]) ? c[K.contrato] : r.contrato;
      await api('alocar', { loja: l.key, row, expect: expectOf(r), setor: r.setor, nome: c[K.colab], contrato: ct, tag: /APRENDIZ/.test(norm(ct)) ? 'APRENDIZ' : '', contrRow: c.row, statusAlocado: statusOpc.find(x => /ALOCAD/i.test(x)) || 'Alocado' });
      m.close(); toast('Colaborador alocado no quadro'); bgReload();
    })
  });
}

/* =====================================================================
 * EXPERIÊNCIAS
 * ===================================================================== */
function pgExp() {
  setTitle('Contratos de experiência', 'Aba Painel de RH — vencimentos de 30 e 90 dias');
  const E = S.data.experiencias || [], f = getF('exp');
  if (!f.jan) f.jan = 'exp';
  const em = E.filter(e => e._exp);
  const v = $('#view');
  v.innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Em experiência', val: em.length, icon: 'clock', c: 'c-cyan' })}
    ${kpi({ lbl: 'Vencem em até 7 dias', val: em.filter(e => e._dias <= 7).length, icon: 'alert', c: 'c-red' })}
    ${kpi({ lbl: 'Vencem em até 15 dias', val: em.filter(e => e._dias <= 15).length, icon: 'clock', c: 'c-amber' })}
    ${kpi({ lbl: 'Vencem em até 30 dias', val: em.filter(e => e._dias <= 30).length, icon: 'clock', c: 'c-blue' })}
  </div>
  <div class="toolbar">
    <div class="input-icon search">${ic('search')}<input class="input" id="eq" placeholder="Buscar colaborador ou cargo" value="${h(f.q || '')}" style="width:100%"></div>
    ${selectHTML('eLoja', 'Loja', uniq(E.map(e => e._loja)).sort(), f.loja, 'Todas')}
    <select class="input" id="eTipo"><option value="">Vencimento: 30 e 90 dias</option><option value="30" ${f.tipo === '30' ? 'selected' : ''}>Só 1º período (30 dias)</option><option value="90" ${f.tipo === '90' ? 'selected' : ''}>Só 2º período (90 dias)</option></select>
    <span class="spacer"></span>
    <button class="btn" id="eExp" title="Exportar Excel / PDF">${ic('download')}</button>
  </div>
  <div class="chips" id="eChips" style="margin-bottom:14px"></div>
  <div id="eBody"></div>`;
  const J = [['exp', 'Em experiência', e => e._exp], ['7', 'Até 7 dias', e => e._exp && e._dias <= 7], ['15', 'Até 15 dias', e => e._exp && e._dias <= 15], ['30', 'Até 30 dias', e => e._exp && e._dias <= 30], ['conc', 'Concluídos', e => !e._exp && !e._deslig && e.venc90 && e.venc90 !== '-'], ['desl', 'Desligados', e => e._deslig], ['all', 'Ativos (todos)', e => !e._deslig]];
  const filt = () => { const q = norm(f.q); const jf = (J.find(x => x[0] === f.jan) || J[0])[2]; return E.filter(e => jf(e) && (!q || norm(e.nome + ' ' + e.cargo).includes(q)) && (!f.loja || e._loja === f.loja) && (!f.tipo || e._prox === f.tipo)); };
  const drawChips = () => { $('#eChips').innerHTML = J.map(([k, t, fn]) => `<span class="chip ${f.jan === k ? 'on' : ''}" data-k="${k}">${t} <span class="n">${E.filter(fn).length}</span></span>`).join(''); $$('#eChips .chip').forEach(c => c.onclick = () => { f.jan = c.dataset.k; saveF(); drawChips(); draw(); }); };
  const stB = (st, d) => { const n = norm(st); if (!n || n === '-') return '<span class="faint">—</span>'; if (/CONCLU/.test(n)) return '<span class="badge b-ok">Concluído</span>'; return `<span class="badge ${d != null && d <= 7 ? 'b-bad' : d != null && d <= 15 ? 'b-warn' : 'b-info'}">${h(st)}</span>`; };
  const draw = () => table($('#eBody'), 'exp', [
    { t: 'Loja', k: '_loja', r: e => lojaPill(e._loja) },
    { t: 'Colaborador', k: 'nome', r: e => `<div class="cell-person">${avatar(e.nome, '', 'sm soft')}<b>${h(e.nome)}</b></div>` },
    { t: 'Cargo', k: 'cargo' },
    { t: 'Admissão', k: 'admissao', sort: e => { const d = parseBR(e.admissao); return d ? +d : null; } },
    { t: '1º venc. (30d)', k: 'venc30', r: e => `${h(e.venc30)}<br>${stB(e.st30, e._d30)}`, sort: e => e._d30 },
    { t: '2º venc. (90d)', k: 'venc90', r: e => `${h(e.venc90)}<br>${stB(e.st90, e._d90)}`, sort: e => e._d90 },
    { t: 'Próximo', k: '_dias', r: e => e._exp ? `<span class="badge ${e._dias <= 7 ? 'b-bad' : e._dias <= 15 ? 'b-warn' : 'b-info'}">${e._dias === 0 ? 'HOJE' : e._dias + ' dias'}</span> <span class="faint" style="font-size:11px">${e._prox}d</span>` : '<span class="faint">—</span>' },
    { t: 'Tempo de empresa', k: 'tempo' }
  ], filt().sort((a, b) => (a._dias == null ? 1e9 : a._dias) - (b._dias == null ? 1e9 : b._dias)));
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('eq', 'q'); bind('eLoja', 'loja'); bind('eTipo', 'tipo');
  $('#eExp').onclick = () => exportCSV('experiencias', ['Loja', 'Colaborador', 'Cargo', 'Admissão', 'Venc. 30', 'Status 30', 'Venc. 90', 'Status 90', 'Dias p/ próximo', 'Tempo de empresa'], filt().map(e => [e.loja, e.nome, e.cargo, e.admissao, e.venc30, e.st30, e.venc90, e.st90, e._dias == null ? '' : e._dias, e.tempo]));
  drawChips(); draw();
}

/* =====================================================================
 * ADMIN — ACESSOS
 * ===================================================================== */
async function pgLog() {
  setTitle('Histórico', 'Tudo o que foi alterado pelo sistema');
  const v = $('#view');
  v.innerHTML = `<div class="toolbar" style="margin-top:0"><div class="input-icon search">${ic('search')}<input class="input" id="lq" placeholder="Buscar" style="width:100%"></div><select class="input" id="lU"><option value="">Usuário: Todos</option></select><select class="input" id="lA"><option value="">Ação: Todas</option></select><span class="spacer"></span><button class="btn" id="lExp" title="Exportar Excel / PDF">${ic('download')}</button></div><div id="lBody"><div class="sk" style="height:300px"></div></div>`;
  let log = [];
  const rt = S.rt;
  try { log = (await api('getLog', { n: 1000 })).log; } catch (e) { toast(e.message, true); }
  if (rt !== S.rt || !$('#lU')) return;
  $('#lU').innerHTML += uniq(log.map(l => l.usuario)).map(x => `<option>${h(x)}</option>`).join('');
  $('#lA').innerHTML += uniq(log.map(l => l.acao)).map(x => `<option>${h(x)}</option>`).join('');
  const filt = () => { const q = norm($('#lq').value), u = $('#lU').value, a = $('#lA').value; return log.filter(l => (!q || norm(l.detalhe + ' ' + l.loja + ' ' + l.acao).includes(q)) && (!u || l.usuario === u) && (!a || l.acao === a)); };
  const draw = () => table($('#lBody'), 'log', [{ t: 'Data', k: 'data', sort: l => l.iso }, { t: 'Usuário', k: 'usuario' }, { t: 'Ação', k: 'acao', r: l => `<span class="badge b-acc">${h(l.acao)}</span>` }, { t: 'Loja', k: 'loja', r: l => l.loja ? lojaPill(l.loja) : '' }, { t: 'Detalhe', k: 'detalhe' }], filt());
  ['lq', 'lU', 'lA'].forEach(id => $('#' + id).oninput = $('#' + id).onchange = draw);
  $('#lExp').onclick = () => exportCSV('historico', ['Data', 'Usuário', 'Ação', 'Loja', 'Detalhe'], filt().map(l => [l.data, l.usuario, l.acao, l.loja, l.detalhe]));
  draw();
}

/* =====================================================================
 * PERFIL
 * ===================================================================== */
function pgPerfil() {
  setTitle('Meu perfil', 'Foto, nome e senha');
  const u = S.user;
  $('#view').innerHTML = `
  <div class="grid g2">
    <div class="card">
      <div class="card-h"><h3>Dados pessoais</h3></div>
      <label class="photo-drop" id="pDrop" for="pFile">${avatar(u.nome, u.foto, 'lg')}<div><b>${ic('camera')} Alterar foto</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div>${u.foto ? '<button class="btn sm danger" id="pRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="pFile" accept="image/*" hidden></label>
      <div class="field" style="margin-top:18px"><label>Nome de exibição</label><input class="input" id="pN" value="${h(u.nome)}"></div>
      <div class="field"><label>Cargo</label><input class="input" id="pC" value="${h(u.cargo || '')}"></div>
      <button class="btn primary" id="pSave">Salvar</button>
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>${ic('key')} Trocar senha</h3></div>
        <div class="field"><label>Senha atual</label><input class="input" type="password" id="sA" autocomplete="current-password"></div>
        <div class="row2"><div class="field"><label>Nova senha</label><input class="input" type="password" id="sN" autocomplete="new-password"></div><div class="field"><label>Confirmar</label><input class="input" type="password" id="sC" autocomplete="new-password"></div></div>
        <button class="btn" id="sOk">Atualizar senha</button>
      </div>
      <div class="card mt">
        <div class="card-h"><h3>Meu acesso</h3></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>Login: <span class="mono">${h(u.login)}</span></div>
          <div>Perfil: <span class="badge b-violet">${h(PERFIS[u.perfil] || u.perfil)}</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">Lojas: ${u.lojas.map(lojaPill).join(' ')}</div>
          ${u.ultimoAcesso ? `<div class="muted">Último acesso: ${h(u.ultimoAcesso)}</div>` : ''}
        </div>
      </div>
    </div>
  </div>`;
  const file = $('#pFile'), drop = $('#pDrop');
  const handle = async f => {
    if (!f || !/^image\//.test(f.type)) return toast('Escolha uma imagem', true);
    try {
      const data = await resizeImg(f, 240);
      const j = await api('saveProfile', { foto: data });
      S.user = j.user; if (S.data) S.data.user = j.user; saveDataLocal(S.data); updateShell(); route(); toast('Foto atualizada');
    } catch (e) { toast(e.message, true); }
  };
  file.onchange = () => handle(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
  drop.ondragleave = () => drop.style.borderColor = '';
  drop.ondrop = e => { e.preventDefault(); handle(e.dataTransfer.files[0]); };
  const rm = $('#pRm'); if (rm) rm.onclick = e => { e.preventDefault(); e.stopPropagation(); run(rm, async () => { const j = await api('saveProfile', { foto: '' }); S.user = j.user; if (S.data) S.data.user = j.user; saveDataLocal(S.data); updateShell(); route(); toast('Foto removida'); }).catch(() => {}); };
  $('#pSave').onclick = e => run(e.currentTarget, async () => { const j = await api('saveProfile', { nome: $('#pN').value, cargo: $('#pC').value }); S.user = j.user; updateShell(); toast('Perfil salvo'); });
  $('#sOk').onclick = e => run(e.currentTarget, async () => {
    if ($('#sN').value !== $('#sC').value) throw new Error('As senhas não conferem');
    await api('changePassword', { atual: $('#sA').value, nova: $('#sN').value });
    ['sA', 'sN', 'sC'].forEach(i => $('#' + i).value = ''); toast('Senha alterada');
  });
}

/* ---------------- ajuste da foto (enquadrar: arrastar, zoom e girar) ---------------- */
function ajustarFoto(file, size) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagem inválida. Use JPG ou PNG.')); };
    img.onload = () => {
      const V = 280; let rot = 0, z = 1, x = 0, y = 0, base = 1, feito = false;
      const dims = () => rot % 180 ? [img.height, img.width] : [img.width, img.height];
      const m = modal({
        title: 'Ajustar foto', icon: 'camera',
        body: `<p class="muted" style="margin:0 0 12px;font-size:13px">Arraste a foto para enquadrar o rosto e use o zoom.</p>
          <div class="crop-wrap"><div class="crop-vp" id="cpV" style="width:${V}px;height:${V}px"><canvas id="cpC" width="${V * 2}" height="${V * 2}"></canvas><div class="crop-mask"></div></div></div>
          <div class="crop-ctl"><button type="button" class="btn sm ghost" id="cpMenos" title="Diminuir">−</button><input type="range" id="cpZ" min="1" max="4" step="0.01" value="1"><button type="button" class="btn sm ghost" id="cpMais" title="Aumentar">+</button><button type="button" class="btn sm" id="cpRot" title="Girar 90°">${ic('refresh')} Girar</button></div>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cpOk">${ic('check')} Usar foto</button>`,
        onClose: () => { URL.revokeObjectURL(url); if (!feito) rej(new Error('')); }
      });
      const el = m.el, cv = $('#cpC', el), ctx = cv.getContext('2d'), vp = $('#cpV', el), zr = $('#cpZ', el);
      const fit = () => { const [w, h2] = dims(); base = V / Math.min(w, h2); };
      const clamp = () => { const [w, h2] = dims(); const s = base * z; const mx = Math.max(0, (w * s - V) / 2), my = Math.max(0, (h2 * s - V) / 2); x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y)); };
      const drawTo = (c2, N) => { const g = c2.getContext('2d'); const k = N / V; g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.save(); g.translate(N / 2 + x * k, N / 2 + y * k); g.rotate(rot * Math.PI / 180); const s = base * z * k; g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); g.restore(); };
      const draw = () => { clamp(); drawTo(cv, V * 2); };
      fit(); draw();
      const setZ = v => { z = Math.min(4, Math.max(1, v)); zr.value = z; draw(); };
      zr.oninput = () => setZ(+zr.value);
      $('#cpMenos', el).onclick = () => setZ(z - .15); $('#cpMais', el).onclick = () => setZ(z + .15);
      $('#cpRot', el).onclick = () => { rot = (rot + 90) % 360; fit(); x = y = 0; draw(); };
      vp.addEventListener('wheel', e => { e.preventDefault(); setZ(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
      const pts = new Map(); let last = null, pinch = null;
      vp.addEventListener('pointerdown', e => { vp.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z }; } });
      vp.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; setZ(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d); return; }
        x += e.clientX - last[0]; y += e.clientY - last[1]; last = [e.clientX, e.clientY]; draw();
      });
      const up = e => { pts.delete(e.pointerId); pinch = null; const r = [...pts.values()][0]; if (r) last = r; };
      vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
      $('#cpOk', el).onclick = () => {
        let N = size, out;
        for (;;) { const c2 = document.createElement('canvas'); c2.width = c2.height = N; drawTo(c2, N); let q = .85; out = c2.toDataURL('image/jpeg', q); while (out.length > 42000 && q > .35) { q -= .1; out = c2.toDataURL('image/jpeg', q); } if (out.length <= 42000 || N <= 120) break; N = Math.round(N * .8); }
        feito = true; m.close(); res(out);
      };
    };
    img.src = url;
  });
}
// permite escolher o mesmo arquivo de novo (ex.: depois de cancelar o ajuste)
document.addEventListener('change', e => { const t = e.target; if (t && t.type === 'file' && /File$/.test(t.id || '')) setTimeout(() => { try { t.value = ''; } catch (er) {} }, 0); }, true);
(function cropCss() { try { const st = document.createElement('style'); st.textContent = `
  .crop-wrap{display:flex;justify-content:center}
  .crop-vp{position:relative;border-radius:18px;overflow:hidden;touch-action:none;cursor:grab;background:#0b1122;max-width:100%}
  .crop-vp:active{cursor:grabbing}.crop-vp canvas{width:100%;height:100%;display:block}
  .crop-mask{position:absolute;inset:0;pointer-events:none;border-radius:50%;box-shadow:0 0 0 999px rgba(5,8,18,.55);outline:2px solid rgba(255,255,255,.85);outline-offset:-2px}
  .crop-ctl{display:flex;align-items:center;gap:8px;justify-content:center;margin-top:14px}.crop-ctl input[type=range]{width:180px;accent-color:var(--accent)}`; document.head.appendChild(st); } catch (e) {} })();
function resizeImg(file, size) {
  if (!resizeImg.direto) return ajustarFoto(file, size);
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        let q = .85, out = c.toDataURL('image/jpeg', q);
        while (out.length > 45000 && q > .3) { q -= .1; out = c.toDataURL('image/jpeg', q); }
        if (out.length > 45000 && size > 160) return resizeImg(file, Math.round(size * .75)).then(res, rej);
        res(out);
      };
      img.onerror = () => rej(new Error('Imagem inválida'));
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
function fotoMini(file, size = 96) {
  return ajustarFoto(file, size);
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const m = Math.min(img.width, img.height); c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size); res(c.toDataURL('image/jpeg', .72)); }; img.onerror = () => rej(new Error('Imagem inválida')); img.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
function bindFotoColab(nome, loja) {
  const file = $('#cfFile'), drop = $('#cfDrop'); if (!file || !drop) return;
  const paint = () => { $('#cfAv').innerHTML = avatar(nome, '', 'lg'); };
  const salvar = async foto => {
    busy(true);
    try {
      await api('saveFotoColab', { nome, foto, loja: loja || '' }, { silent: true });
      if (foto) S.fotos[chaveNome(nome)] = foto; else delete S.fotos[chaveNome(nome)];
      guardarFotos_();
      toast(foto ? 'Foto de ' + nome.split(' ')[0] + ' salva' : 'Foto removida');
      paint(); if (typeof S.rerender === 'function') S.rerender(); else if (typeof route === 'function') route();
    } catch (e) { toast(e.message, true); } finally { busy(false); }
  };
  const handle = async f => { if (!f || !/^image\//.test(f.type)) return toast('Escolha uma imagem', true); try { await salvar(await fotoMini(f, 160)); } catch (e) { toast(e.message, true); } };
  file.onchange = () => handle(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
  drop.ondragleave = () => drop.style.borderColor = '';
  drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ''; handle(e.dataTransfer.files[0]); };
  const rm = $('#cfRm'); if (rm) rm.onclick = e => { e.preventDefault(); e.stopPropagation(); rm.remove(); salvar(''); };
}
/* ---------------- líder do setor (nome + foto, salvo na configuração) ---------------- */
const liderKey = (lk, setor) => 'lider_' + lk + '_' + norm(setor).replace(/[^A-Z0-9]+/g, '_');
const LIDER_RX = [/GERENTE/, /COORDENAD/, /SUPERVISOR/, /ENCARREGAD/, /LIDER|CHEFE/];
function liderAuto(lk, setor) {
  const l = lojaBy(lk); const sec = l && l.setores.find(s => s.nome === setor); if (!sec) return null;
  const c = sec.linhas.filter(r => r.nome).map(r => ({ r, i: LIDER_RX.findIndex(rx => rx.test(norm(r.funcao))) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)[0];
  return c ? { nome: c.r.nome, funcao: c.r.funcao, auto: true } : null;
}
function traineeAuto(lk, setor) {
  const l = lojaBy(lk); const sec = l && l.setores.find(s => s.nome === setor); if (!sec) return null;
  const r = sec.linhas.find(r => r.nome && /TRAIN/.test(norm(r.tag + ' ' + r.funcao)));
  return r ? { nome: r.nome, funcao: r.funcao, auto: true } : null;
}
function getLider(lk, setor, trainee) {
  if (trainee) { const t = S.lideres && S.lideres[lk + '|' + setor + '|TRAINEE']; if (t && t.nome) return { nome: t.nome, foto: fotoDe(t.nome) }; const a = traineeAuto(lk, setor); return a ? Object.assign(a, { foto: fotoDe(a.nome) }) : null; }
  const m = S.lideres && S.lideres[lk + '|' + setor];
  if (m && m.nome) return { nome: m.nome, foto: fotoDe(m.nome) };
  let v = cfgv(liderKey(lk, setor), null);
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  if (v && v.nome) return v;
  const a = liderAuto(lk, setor); return a ? Object.assign(a, { foto: fotoDe(a.nome) }) : null;
}
function liderChip(l, setor, ed) {
  const curto = n => { const p = String(n).trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1] : p[0]; };
  const ld = getLider(l.key, setor), tr = getLider(l.key, setor, true);
  const a = ld ? `<span class="sec-lider ${ed ? 'click' : ''}" data-lider="${h(setor)}" title="Líder: ${h(ld.nome)}${ed ? ' — clique para alterar' : ''}">${avatar(ld.nome, ld.foto, '')}<b>${h(curto(ld.nome))}</b></span>`
    : ed ? `<span class="sec-lider sec-lider-add click" data-lider="${h(setor)}" title="Definir líder do setor">${ic('plus')} líder</span>` : '';
  const b = tr ? `<span class="sec-lider trainee ${ed ? 'click' : ''}" data-lider="${h(setor)}" data-trainee="1" title="Líder trainee: ${h(tr.nome)}${ed ? ' — clique para alterar' : ''}">${avatar(tr.nome, tr.foto, '')}<b>${h(curto(tr.nome))}</b><i>trainee</i></span>`
    : ed ? `<span class="sec-lider sec-lider-add click" data-lider="${h(setor)}" data-trainee="1" title="Definir líder trainee do setor">${ic('plus')} trainee</span>` : '';
  return a || b ? `<div class="sec-lideres">${a}${b}</div>` : '';
}
function openLider(l, setor, done, trainee) {
  const atual = getLider(l.key, setor, trainee) || { nome: '', foto: '' };
  const papel = trainee ? 'Líder trainee' : 'Líder';
  const chave = setor + (trainee ? '|TRAINEE' : '');
  let foto = atual.foto || '';
  const m = modal({
    title: papel + ' · ' + h(setor), icon: 'camera',
    body: `<label class="photo-drop" id="ldDrop" for="ldFile" style="margin-bottom:16px"><span id="ldAv">${avatar(atual.nome || '?', foto, 'lg')}</span><div><b>${ic('camera')} <span id="ldFtLbl">${foto ? 'Trocar foto' : 'Colocar foto'}</span></b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div><button class="btn sm danger ${foto ? '' : 'hidden'}" id="ldFRm" style="margin-top:10px" type="button">Remover foto</button></div><input type="file" id="ldFile" accept="image/*" hidden></label>
      <div class="field"><label>Nome ${trainee ? 'do líder trainee' : 'do líder'}</label><input class="input" id="ldN" maxlength="60" list="ldNl" placeholder="Comece a digitar o nome" value="${h(atual.nome)}"><datalist id="ldNl">${uniq(l.rows.filter(r => r.nome).map(r => r.nome)).sort().map(n => `<option value="${h(n)}">`).join('')}</datalist></div>
      ${atual.auto ? `<p class="faint" style="font-size:12px;margin:0">Sugestão automática pela ${trainee ? 'tag Lider Trainee' : 'função'} (${h(atual.funcao || '')}). Salve para fixar.</p>` : ''}`,
    foot: `${atual.nome && !atual.auto ? '<button class="btn danger" id="ldDel" style="margin-right:auto">Remover</button>' : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ldOk">Salvar</button>`
  });
  const el = m.el, file = $('#ldFile', el), drop = $('#ldDrop', el);
  const paint = () => { $('#ldAv', el).innerHTML = avatar($('#ldN', el).value.trim() || '?', foto, 'lg'); $('#ldFtLbl', el).textContent = foto ? 'Trocar foto' : 'Colocar foto'; $('#ldFRm', el).classList.toggle('hidden', !foto); };
  const handle = async f => { if (!f || !/^image\//.test(f.type)) return toast('Escolha uma imagem', true); try { foto = await resizeImg(f, 160); paint(); } catch (e) { toast(e.message, true); } };
  file.onchange = () => handle(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
  drop.ondragleave = () => drop.style.borderColor = '';
  drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ''; handle(e.dataTransfer.files[0]); };
  $('#ldFRm', el).onclick = e => { e.preventDefault(); e.stopPropagation(); foto = ''; file.value = ''; paint(); };
  $('#ldN', el).oninput = paint;
  const salvar = async (btn, valor) => run(btn, async () => {
    if (valor && valor.foto !== fotoDe(valor.nome)) { await api('saveFotoColab', { nome: valor.nome, foto: valor.foto || '', loja: l.key }); if (valor.foto) S.fotos[chaveNome(valor.nome)] = valor.foto; else delete S.fotos[chaveNome(valor.nome)]; }
    await api('setLiderSetor', { loja: l.key, setor: chave, nome: valor ? valor.nome : '' });
    S.lideres = S.lideres || {}; if (valor) S.lideres[l.key + '|' + chave] = { nome: valor.nome }; else delete S.lideres[l.key + '|' + chave];
    guardarFotos_();
    toast(valor ? papel + ' de ' + setor + ' salvo' : papel + ' removido');
    m.close(); if (done) done();
  }).catch(() => {});
  $('#ldOk', el).onclick = e => { const nome = $('#ldN', el).value.trim(); if (!nome) return toast('Informe o nome', true); salvar(e.currentTarget, { nome, foto }); };
  const del = $('#ldDel', el); if (del) del.onclick = async e => { if (!await confirmBox(`Remover o ${papel.toLowerCase()} de <b>${h(setor)}</b>?`, 'Remover', true)) return; salvar(null, null); };
}
// foto de outro usuário (somente administrador) — ação 'saveUserFoto' no Apps Script
function bindFotoUsuario(el, u, done) {
  const file = $('#uFile', el), drop = $('#uDrop', el); if (!file || !drop) return;
  const salvar = async foto => {
    busy(true);
    try {
      const j = await api('saveUserFoto', { id: u.id, foto }, { silent: true });
      u.foto = foto;
      $('#uAv', el).innerHTML = avatar(u.nome, foto, 'lg');
      if (S.user && S.user.id === u.id) { S.user.foto = foto; if (S.data) S.data.user = S.user; updateShell(); }
      if (j.users && done) done(j.users);
      toast(foto ? 'Foto de ' + u.nome.split(' ')[0] + ' salva' : 'Foto removida');
    } catch (e) {
      toast(/desconhecid|inv[aá]lid|unknown|n[aã]o (existe|encontrad)/i.test(e.message) ? 'O servidor ainda não tem a função de foto de usuários — falta atualizar o Apps Script.' : e.message, true);
    } finally { busy(false); }
  };
  const handle = async f => {
    if (!f || !/^image\//.test(f.type)) return toast('Escolha uma imagem', true);
    try { await salvar(await resizeImg(f, 240)); } catch (e) { toast(e.message, true); }
  };
  file.onchange = () => handle(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
  drop.ondragleave = () => drop.style.borderColor = '';
  drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ''; handle(e.dataTransfer.files[0]); };
  const rm = $('#uFRm', el); if (rm) rm.onclick = e => { e.preventDefault(); e.stopPropagation(); salvar(''); rm.remove(); };
}
// passo opcional depois da troca de senha / lembrete no início
function askFoto() {
  if (!S.user || S.user.foto || DEMO) return;
  modal({
    title: 'Adicione sua foto', icon: 'camera',
    body: `<p class="muted" style="margin-top:0">Assim a equipe reconhece quem fez cada alteração no quadro. Leva 10 segundos.</p>
      <label class="photo-drop" id="afDrop" for="afFile"><span id="afAv">${avatar(S.user.nome, '', 'lg')}</span><div><b>${ic('camera')} Escolher foto</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem. No celular, dá para tirar na hora.</div></div><input type="file" id="afFile" accept="image/*" hidden></label>`,
    foot: `<button class="btn" data-close>Agora não</button>`,
    onClose: () => ls.set('grc_fotoAdiada_' + S.user.id, Date.now()),
    onMount: m => {
      const drop = $('#afDrop', m.el), file = $('#afFile', m.el);
      const handle = async f => {
        if (!f || !/^image\//.test(f.type)) return toast('Escolha uma imagem', true);
        try {
          busy(true);
          const data = await resizeImg(f, 240);
          const j = await api('saveProfile', { foto: data }, { silent: true });
          S.user = j.user; if (S.data) S.data.user = j.user; saveDataLocal(S.data); updateShell();
          m.close(); toast('Foto salva. Obrigado!'); rerender_();
        } catch (e) { toast(e.message, true); } finally { busy(false); }
      };
      file.onchange = () => handle(file.files[0]);
      drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
      drop.ondragleave = () => drop.style.borderColor = '';
      drop.ondrop = e => { e.preventDefault(); handle(e.dataTransfer.files[0]); };
    }
  });
}
function forcePassword() {
  modal({
    title: 'Defina sua nova senha', icon: 'key', locked: true,
    body: `<p class="muted" style="margin-top:0">Por segurança, troque a senha provisória antes de continuar.</p>
      <div class="field"><label>Senha atual (provisória)</label><input class="input" type="password" id="fA"></div>
      <div class="row2"><div class="field"><label>Nova senha</label><input class="input" type="password" id="fN"></div><div class="field"><label>Confirmar</label><input class="input" type="password" id="fC"></div></div>`,
    foot: `<button class="btn primary" id="fOk">Salvar e continuar</button>`,
    onMount: m => $('#fOk', m.el).onclick = e => run(e.currentTarget, async () => {
      if ($('#fN', m.el).value !== $('#fC', m.el).value) throw new Error('As senhas não conferem');
      if ($('#fN', m.el).value.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres');
      await api('changePassword', { atual: $('#fA', m.el).value, nova: $('#fN', m.el).value });
      S.user.trocarSenha = false; m.close(); toast('Senha definida. Bem-vindo!');
      setTimeout(askFoto, 600);
    })
  });
}

/* =====================================================================
 * v2 — DESCRIÇÃO DE AÇÕES (para aprovações)
 * ===================================================================== */
function describe(action, p) {
  const L = LOJA_NOMES[p.loja] || p.loja || '';
  const e = p.expect || {};
  const d = p.data || {};
  switch (action) {
    case 'saveRow': return `Editar posição ${e.funcao || ''} (${L}): ${e.nome || 'vaga'} → ${d.nome || 'vaga'} · ${d.situacao || ''}${d.tag ? ' · ' + d.tag : ''}`;
    case 'abrirVaga': return `Abrir vaga ${e.funcao || ''} (${L}) — ${p.motivo || ''}${e.nome ? ' · ' + e.nome : ''}`;
    case 'desligar': return `Desligar ${e.nome || ''} — ${e.funcao || ''} (${L}) · ${p.tipo || ''} em ${isoToBR(p.dataDesligamento) || 'hoje'}`;
    case 'preencherVaga': case 'alocar': return `Preencher vaga ${e.funcao || ''} (${L}) com ${String(p.nome || '').toUpperCase()}`;
    case 'addPosicao': return `Nova posição ${p.funcao || ''} em ${p.setor || ''} (${L})`;
    case 'removerPosicao': return `Remover posição ${e.funcao || ''} (${L})`;
    case 'setVagaInfo': return `Vaga ${e.funcao || ''} (${L}) → etapa ${d.etapa || ''}`;
    case 'addContratacao': return `Nova contratação: ${d[S.ck.colab] || ''} — ${d[S.ck.funcao] || ''} (${d[S.ck.loja] || ''})${p.vaga ? ' · alocar no quadro' : ''}`;
    case 'setPadrao': return `Quadro padrão de ${p.setor} (${L}): ${fmt(p.padraoAtual)} → ${fmt(p.padrao)}${p.motivo ? ' · ' + p.motivo : ''}${p.novas ? ' · criar ' + p.novas.qtd + ' vaga(s)' : ''}`;
    case 'saveContratacao': return `Editar contratação de ${p.expectNome || ''}`;
    case 'movimentar': return `${p.tipo || 'Movimentação'}: ${e.nome || (p.origem && p.origem.expect && p.origem.expect.nome) || ''} — ${(LOJA_NOMES[(p.origem || {}).loja] || '')} · ${(p.origem || {}).setor || ''} → ${(LOJA_NOMES[(p.destino || {}).loja] || '')} · ${(p.destino || {}).setor || ''} ${(p.destino || {}).funcao || ''}`;
    case 'marcarDesligadoContr': return `Marcar ${(p.rows || []).length} contratação(ões) como desligada(s): ${(p.rows || []).map(x => x.nome).join(', ')}`;
  }
  return action;
}

async function forgotPassword(login) {
  modal({
    title: 'Receber nova senha', icon: 'mail',
    body: `<p class="muted" style="margin-top:0">Informe seu login ou e-mail cadastrado. Se houver um e-mail vinculado, enviaremos uma senha provisória.</p><div class="field"><label>Login ou e-mail</label><input class="input" id="fgL" value="${h(login || '')}"></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="fgOk">${ic('mail')} Enviar</button>`,
    onMount: m => $('#fgOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const v = $('#fgL', m.el).value.trim(); if (!v) throw new Error('Informe o login ou e-mail');
      await api('esqueciSenha', { login: v });
      m.close(); toast('Se o login tiver e-mail cadastrado, a nova senha foi enviada. Verifique sua caixa de entrada.');
    })
  });
}

/* =====================================================================
 * NOTIFICAÇÕES
 * ===================================================================== */
const NOTIF_IC = { APROVACAO: ['check', 'c-amber'], REQUISICAO: ['plus', 'c-violet'], DECISAO: ['shield', 'c-green'], QUADRO: ['edit', 'c-cyan'], ACESSO: ['key', 'c-slate'] };
function setupBell() {
  const btn = $('#btnBell'), panel = $('#bellPanel');
  btn.onclick = e => { e.stopPropagation(); panel.classList.toggle('hidden'); if (!panel.classList.contains('hidden')) renderBellPanel(); };
  if (!window.__grcBellDoc) { window.__grcBellDoc = 1; document.addEventListener('click', e => { const p = $('#bellPanel'); if (p && !e.target.closest('.bell-wrap')) p.classList.add('hidden'); }); }
}
function updateBell() {
  const n = $('#bellN'); if (!n) return;
  const u = S.notif.unread || 0;
  n.textContent = u > 9 ? '9+' : u; n.classList.toggle('hidden', !u);
  const mb = $('#mbBell'); if (mb) { mb.textContent = u > 9 ? '9+' : u; mb.classList.toggle('hidden', !u); }
}
function renderBellPanel() {
  const p = $('#bellPanel'); const it = S.notif.items || [];
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  p.innerHTML = `<div class="bp-h"><b>Notificações</b>${S.notif.unread ? `<button class="btn sm ghost" id="bpRead">${ic('check')} Marcar como lidas</button>` : ''}</div>
    ${perm === 'default' ? `<div class="bp-perm"><span>${ic('bell')} Receba alertas no celular e no computador</span><button class="btn sm primary" id="bpPerm">Ativar</button></div>` : ''}
    ${isAdmin() && S.notif.pendentes ? `<a class="bp-item hot" href="#/aprovacoes"><div class="ai" style="background:var(--warn-bg);color:var(--warn)">${ic('clock')}</div><div><b>${S.notif.pendentes} aprovação(ões) pendente(s)</b><span>Toque para revisar</span></div></a>` : ''}
    <div class="bp-list">${it.length ? it.map(n => { const x = NOTIF_IC[n.tipo] || ['bell', 'c-slate']; return `<a class="bp-item ${n.nova ? 'new' : ''} ${x[1]}" href="${h(n.link || '#/inicio')}"><div class="ai" style="background:color-mix(in srgb,var(--kc) 15%,transparent);color:var(--kc)">${ic(x[0])}</div><div><b>${h(n.titulo)}</b><span>${h(n.texto)}</span><span class="faint">${h(n.autor || '')} · ${h(n.data)}</span></div></a>`; }).join('') : `<div class="empty" style="padding:26px">${ic('bell')}<div>Nenhuma notificação</div></div>`}</div>`;
  const r = $('#bpRead', p); if (r) r.onclick = async e => { e.stopPropagation(); try { S.notif = await api('marcarLidas', {}, { silent: true }); updateBell(); renderBellPanel(); } catch (er) { toast(er.message, true); } };
  const pr = $('#bpPerm', p); if (pr) pr.onclick = async e => { e.stopPropagation(); await askNotifPermission(); renderBellPanel(); };
  $$('.bp-item', p).forEach(a => a.addEventListener('click', () => { p.classList.add('hidden'); if (S.notif.unread) api('marcarLidas', {}, { silent: true }).then(j => { S.notif = j; updateBell(); }).catch(() => {}); }));
}
async function askNotifPermission() {
  if (!('Notification' in window)) return toast('Este navegador não suporta notificações. No iPhone, instale o app na tela inicial primeiro.', true);
  if (window.OneSignal && window.OneSignal.Notifications) { try { await window.OneSignal.Notifications.requestPermission(); } catch (e) {} }
  else await Notification.requestPermission();
  if (Notification.permission === 'granted') { toast('Notificações ativadas neste aparelho'); localNotify('Notificações ativadas', 'Você receberá os alertas do Quadro de Lojas aqui.'); }
}
async function localNotify(title, body, link) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    const opt = { body, icon: cfgv('logo', '') || 'icon-192.png', badge: 'icon-192.png', data: { url: link || '#/inicio' }, tag: 'grc-' + Date.now() };
    if (reg) reg.showNotification(title, opt); else new Notification(title, opt);
  } catch (e) {}
}
let pollT = null;
function startPolling() {
  if (pollT) return;
  pollT = setInterval(pollNotifs, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollNotifs(); });
}
async function pollNotifs() {
  if (!S.token || !S.user) return;
  try {
    const j = await api('notifs', {}, { silent: true });
    const prevTs = Math.max(0, ...(S.notif.items || []).map(i => i.ts || 0));
    const primeira = !S.notifOk; S.notifOk = true;
    const novas = primeira ? [] : (j.items || []).filter(i => i.nova && i.ts > prevTs);
    const pendChanged = j.pendentes !== S.notif.pendentes;
    S.notif = j; updateBell();
    if (novas.length) {
      const n = novas[0];
      toast(`${n.titulo}: ${n.texto}`.slice(0, 160));
      if (document.visibilityState !== 'visible' && !(S.cfg && S.cfg.onesignalAppId)) localNotify(n.titulo, n.texto, n.link);
      if (!$('.overlay') && !document.activeElement.matches('input,textarea,select')) loadAll(false, true);
    } else if (pendChanged) updateShell();
  } catch (e) {}
}

/* =====================================================================
 * SLA
 * ===================================================================== */
function slaMeta(funcao) {
  const ex = (S.cfg && S.cfg.slaExcecoes) || [];
  const f = norm(funcao);
  const m = ex.find(x => x.funcao && (norm(x.funcao) === f || f.startsWith(norm(x.funcao).replace(/\(.*\)/, '').trim())));
  return m ? +m.dias : ((S.cfg && S.cfg.slaPadrao) || 20);
}
function slaInfo(r) {
  const meta = slaMeta(r.funcao);
  if (r.dias == null) return { meta, dias: null, pct: null, st: 'sem' };
  const pc = Math.round(r.dias / meta * 100);
  return { meta, dias: r.dias, pct: pc, st: pc > 100 ? 'est' : pc >= 75 ? 'atn' : 'ok', resta: meta - r.dias };
}
const SLA_LBL = { ok: ['No prazo', 'b-ok'], atn: ['Atenção', 'b-warn'], est: ['Estourado', 'b-bad'], sem: ['Sem data', ''] };
function slaBadge(r) {
  const s = r.sla; if (!s) return '';
  if (s.st === 'sem') return '<span class="badge" title="Defina a data de abertura para iniciar o SLA">Sem data</span>';
  return `<span class="badge ${SLA_LBL[s.st][1]}" title="Meta ${s.meta} dias">${s.dias}/${s.meta}d</span>`;
}

function pgSLA() {
  setTitle('SLA de vagas', 'Tempo de fechamento das vagas × meta');
  const f = getF('sla');
  const L = S.data.lojas;
  const abertas = S.all.filter(r => r.vagaAberta);
  const com = abertas.filter(r => r.sla && r.sla.st !== 'sem');
  const sem = abertas.filter(r => !r.sla || r.sla.st === 'sem');
  const fech = (S.data.vagasFechadas || []).map(v => { const a = parseISO(v.abertura), fe = parseISO(v.fechamento); const dias = a && fe ? Math.round((fe - a) / 864e5) : null; const meta = slaMeta(v.funcao); return Object.assign({}, v, { dias, meta, noPrazo: dias != null && dias <= meta, _fe: fe }); }).filter(v => v.dias != null);
  const fech90 = fech.filter(v => daysTo(v._fe) >= -90);
  const tm = fech90.length ? Math.round(sum(fech90, v => v.dias) / fech90.length) : null;
  const pctPrazo = fech90.length ? pct(fech90.filter(v => v.noPrazo).length, fech90.length) : null;
  const v = $('#view');
  v.innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Vagas com SLA em andamento', val: com.length, sub: `${sem.length} vaga(s) ainda sem data de abertura`, icon: 'gauge', c: 'c-cyan' })}
    ${kpi({ lbl: 'Dentro do prazo', val: `${pct(com.filter(r => r.sla.st === 'ok').length, com.length)}%`, bar: pct(com.filter(r => r.sla.st === 'ok').length, com.length), sub: `${com.filter(r => r.sla.st === 'atn').length} em atenção (≥ 75% da meta)`, icon: 'check', c: 'c-green' })}
    ${kpi({ lbl: 'SLA estourado', val: com.filter(r => r.sla.st === 'est').length, sub: 'Vagas acima da meta de dias', icon: 'alert', c: 'c-red' })}
    ${kpi({ lbl: 'Tempo médio p/ fechar (90d)', val: tm != null ? tm + ' <small>dias</small>' : '—', sub: pctPrazo != null ? `${pctPrazo}% fechadas dentro da meta` : 'Calculado com as vagas fechadas pelo sistema', icon: 'trend', c: 'c-violet' })}
  </div>
  ${sem.length && isAdmin() ? `<div class="card mt" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-color:color-mix(in srgb,var(--warn) 40%,transparent)"><div class="ai" style="color:var(--warn)">${ic('alert')}</div><div style="flex:1;min-width:220px"><b>${sem.length} vaga(s) sem data de abertura</b><div class="muted" style="font-size:12.5px">Vagas que já existiam na planilha. Defina uma data de início para que entrem no indicador de SLA.</div></div><button class="btn primary" id="slaIni">${ic('calendar')} Iniciar SLA</button></div>` : ''}
  <div class="grid g3 mt">
    <div class="card"><div class="card-h"><h3>Status do SLA por loja</h3></div><div class="chart-box sm"><canvas id="chSlaLoja"></canvas></div></div>
    <div class="card"><div class="card-h"><h3>Tempo médio de fechamento</h3><span class="sub">por mês (dias)</span></div><div class="chart-box sm"><canvas id="chSlaMes"></canvas></div></div>
    <div class="card"><div class="card-h"><h3>Dias médios por etapa</h3><span class="sub">onde o processo trava</span></div><div class="chart-box sm"><canvas id="chSlaEtapa"></canvas></div></div>
  </div>
  <div class="toolbar">
    <div class="seg" id="slaTab"><button data-v="abertas">Em andamento <span class="faint">${abertas.length}</span></button><button data-v="fechadas">Fechadas <span class="faint">${fech.length}</span></button></div>
    ${selectHTML('sLoja', 'Loja', L.map(l => l.key), f.loja, 'Todas')}
    <select class="input" id="sSt"><option value="">Status: Todos</option>${Object.entries(SLA_LBL).map(([k, x]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${x[0]}</option>`).join('')}</select>
    ${selectHTML('sResp', 'Responsável', uniq(abertas.map(r => r.info && r.info.responsavel).concat(fech.map(x => x.responsavel))).sort(), f.resp)}
    <span class="spacer"></span><button class="btn" id="sExp" title="Exportar Excel / PDF">${ic('download')}</button>
  </div>
  <div id="sBody"></div>
  <p class="muted" style="font-size:12px">Meta padrão: <b>${(S.cfg && S.cfg.slaPadrao) || 20} dias</b>${((S.cfg && S.cfg.slaExcecoes) || []).length ? ' · Exceções: ' + S.cfg.slaExcecoes.map(x => `${h(x.funcao)} ${x.dias}d`).join(' · ') : ''}${isAdmin() ? ' · <a href="#/admin" onclick="window.__grcAdmTab=\'sla\'" style="color:var(--accent)">ajustar metas</a>' : ''}</p>`;
  const tab = getV('slaTab', 'abertas');
  $$('#slaTab button').forEach(b => { b.classList.toggle('on', b.dataset.v === tab); b.onclick = () => { setV('slaTab', b.dataset.v); route(); }; });
  const filtA = () => abertas.filter(r => (!f.loja || r.loja === f.loja) && (!f.st || (r.sla ? r.sla.st : 'sem') === f.st) && (!f.resp || (r.info && r.info.responsavel) === f.resp));
  const filtF = () => fech.filter(x => (!f.loja || x.loja === f.loja) && (!f.resp || x.responsavel === f.resp) && (!f.st || (f.st === 'ok' ? x.noPrazo : f.st === 'est' ? !x.noPrazo : true)));
  const etapaDias = r => { const hs = (r.info && r.info.hist) || []; const last = hs[hs.length - 1]; return last ? -daysTo(parseISO(last.d)) : r.dias; };
  const draw = () => {
    if (tab === 'abertas') table($('#sBody'), 'slaA', [
      { t: 'Loja', k: 'loja', r: r => lojaPill(r.loja) },
      { t: 'Função', k: 'funcao', r: r => `<b>${h(r.funcao)}</b><div class="muted" style="font-size:11.5px">${h(r.setor)}</div>` },
      { t: 'Abertura', k: 'ab', r: r => r.info && r.info.abertura ? isoToBR(r.info.abertura) : '<span class="faint">—</span>', sort: r => r.dias },
      { t: 'Etapa', k: 'etapa', r: r => `${etapaBadge(r.etapa)}<div class="faint" style="font-size:11px">${etapaDias(r) != null ? etapaDias(r) + 'd na etapa' : ''}</div>`, sort: r => ETAPAS().indexOf(r.etapa) },
      { t: 'Progresso do SLA', k: 'pct', w: '240px', sort: r => r.sla && r.sla.pct != null ? r.sla.pct : -1, r: r => r.sla && r.sla.st !== 'sem' ? `<div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1;--kc:${r.sla.st === 'est' ? 'var(--bad)' : r.sla.st === 'atn' ? 'var(--warn)' : 'var(--ok)'}"><i style="width:${Math.min(100, r.sla.pct)}%"></i></div><span style="font-size:12px;font-weight:700;width:62px">${r.sla.dias}/${r.sla.meta}d</span></div>` : '<span class="faint">Sem data</span>' },
      { t: 'Status', k: 'st', r: r => { const s = r.sla ? r.sla.st : 'sem'; return `<span class="badge ${SLA_LBL[s][1]}">${SLA_LBL[s][0]}</span>${r.sla && r.sla.resta != null && r.sla.resta >= 0 ? `<div class="faint" style="font-size:11px">${r.sla.resta}d restantes</div>` : ''}`; }, sort: r => ({ est: 0, atn: 1, ok: 2, sem: 3 })[r.sla ? r.sla.st : 'sem'] },
      { t: 'Responsável', k: 'resp', r: r => h((r.info && r.info.responsavel) || '—'), sort: r => (r.info && r.info.responsavel) || '' }
    ], filtA().sort((a, b) => ((b.sla && b.sla.pct) || -1) - ((a.sla && a.sla.pct) || -1)), r => openVagaInfo(lojaBy(r.loja), r));
    else table($('#sBody'), 'slaF', [
      { t: 'Loja', k: 'loja', r: x => lojaPill(x.loja) },
      { t: 'Função', k: 'funcao', r: x => `<b>${h(x.funcao)}</b><div class="muted" style="font-size:11.5px">${h(x.setor || '')}</div>` },
      { t: 'Abertura', k: 'abertura', r: x => isoToBR(x.abertura) },
      { t: 'Fechamento', k: 'fechamento', r: x => isoToBR(x.fechamento) },
      { t: 'Dias', k: 'dias', r: x => `<b>${x.dias}</b> <span class="faint">/ ${x.meta}</span>` },
      { t: 'Resultado', k: 'noPrazo', r: x => x.noPrazo ? '<span class="badge b-ok">No prazo</span>' : '<span class="badge b-bad">Fora do prazo</span>' },
      { t: 'Contratado', k: 'por' }, { t: 'Responsável', k: 'responsavel' }
    ], filtF().sort((a, b) => (b._fe || 0) - (a._fe || 0)));
  };
  const bind = (id, k) => { const el = $('#' + id); el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('sLoja', 'loja'); bind('sSt', 'st'); bind('sResp', 'resp');
  $('#sExp').onclick = () => tab === 'abertas'
    ? exportCSV('sla_vagas_abertas', ['Loja', 'Setor', 'Função', 'Abertura', 'Dias', 'Meta', '% SLA', 'Status', 'Etapa', 'Responsável'], filtA().map(r => [LOJA_NOMES[r.loja], r.setor, r.funcao, r.info ? isoToBR(r.info.abertura) : '', r.dias == null ? '' : r.dias, r.sla.meta, r.sla.pct == null ? '' : r.sla.pct, SLA_LBL[r.sla.st][0], r.etapa, r.info ? r.info.responsavel : '']))
    : exportCSV('sla_vagas_fechadas', ['Loja', 'Setor', 'Função', 'Abertura', 'Fechamento', 'Dias', 'Meta', 'No prazo', 'Contratado', 'Responsável'], filtF().map(x => [LOJA_NOMES[x.loja], x.setor, x.funcao, isoToBR(x.abertura), isoToBR(x.fechamento), x.dias, x.meta, x.noPrazo ? 'Sim' : 'Não', x.por, x.responsavel]));
  if ($('#slaIni')) $('#slaIni').onclick = () => openIniciarSLA(sem.length);
  draw();
  // gráficos
  chart($('#chSlaLoja'), { type: 'bar', data: { labels: L.map(l => l.nome), datasets: [['ok', '#34d399', 'No prazo'], ['atn', '#fbbf24', 'Atenção'], ['est', '#f87171', 'Estourado'], ['sem', css('--surface3'), 'Sem data']].map(([k, c, n]) => ({ label: n, data: L.map(l => abertas.filter(r => r.loja === l.key && (r.sla ? r.sla.st : 'sem') === k).length), backgroundColor: c, borderRadius: 5 })) }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 }, grid: { color: css('--border') } } } } });
  const meses = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(d); }
  chart($('#chSlaMes'), { type: 'line', data: { labels: meses.map(d => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')), datasets: [{ label: 'Dias para fechar', data: meses.map(d => { const xs = fech.filter(x => x._fe && x._fe.getMonth() === d.getMonth() && x._fe.getFullYear() === d.getFullYear()); return xs.length ? Math.round(sum(xs, x => x.dias) / xs.length) : null; }), borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,.15)', fill: true, tension: .35, spanGaps: true, pointRadius: 4 }, { label: 'Meta padrão', data: meses.map(() => (S.cfg && S.cfg.slaPadrao) || 20), borderColor: '#f87171', borderDash: [6, 4], pointRadius: 0 }] }, options: { scales: { y: { beginAtZero: true, grid: { color: css('--border') } }, x: { grid: { display: false } } } } });
  const E = ETAPAS(); const acc = {}; const cnt = {};
  const addHist = (hs, endD) => { for (let i = 0; i < hs.length; i++) { const a = parseISO(hs[i].d), b = i + 1 < hs.length ? parseISO(hs[i + 1].d) : endD; if (!a || !b) continue; const dd = Math.max(0, (b - a) / 864e5); acc[hs[i].e] = (acc[hs[i].e] || 0) + dd; cnt[hs[i].e] = (cnt[hs[i].e] || 0) + 1; } };
  abertas.forEach(r => r.info && r.info.hist && addHist(r.info.hist, today0()));
  fech.forEach(x => x.hist && addHist(x.hist, x._fe));
  chart($('#chSlaEtapa'), { type: 'bar', data: { labels: E, datasets: [{ label: 'Dias médios', data: E.map(e => cnt[e] ? Math.round(acc[e] / cnt[e] * 10) / 10 : 0), backgroundColor: ['#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#22d3ee', '#34d399'], borderRadius: 8 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: css('--border') } }, y: { grid: { display: false } } } } });
}
function openIniciarSLA(n) {
  modal({
    title: 'Iniciar SLA das vagas sem data', icon: 'calendar',
    body: `<p class="muted" style="margin-top:0">${n} vaga(s) abertas não têm data de abertura registrada. Escolha a data a partir da qual o SLA será contado.</p>
      <div class="row2"><div class="field"><label>Data de início</label><input class="input" type="date" id="siD" value="${isoD(new Date())}"></div>
      <div class="field"><label>Loja</label><select class="input" id="siL"><option value="">Todas as lojas</option>${S.data.lojas.map(l => `<option value="${l.key}">${h(l.nome)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Responsável pela seleção</label><input class="input" id="siR" value="${h(S.user.nome)}"></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="siOk">Iniciar SLA</button>`,
    onMount: m => $('#siOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const j = await api('iniciarSLA', { data: $('#siD', m.el).value, loja: $('#siL', m.el).value, responsavel: $('#siR', m.el).value });
      m.close(); toast(`SLA iniciado para ${j.total} vaga(s)`); bgReload();
    })
  });
}

/* =====================================================================
 * REQUISIÇÃO DE VAGA (gestores / líderes)
 * ===================================================================== */
function openRequisicao(pre = {}) {
  const lojas = S.data.lojas;
  const lk0 = pre.loja || (lojas[0] && lojas[0].key);
  modal({
    title: 'Requisitar vaga', icon: 'plus', wide: true,
    body: `<p class="muted" style="margin-top:0">A requisição será enviada para aprovação do RH. Você acompanha o andamento em <b>Minhas solicitações</b>.</p>
      <div class="row3">
        <div class="field"><label>Loja</label><select class="input" id="rqL">${lojas.map(l => `<option value="${l.key}" ${l.key === lk0 ? 'selected' : ''}>Loja ${l.num} · ${h(l.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>Setor</label><select class="input" id="rqS"></select></div>
        <div class="field"><label>Função</label><input class="input" id="rqF" list="dlRqF" placeholder="Ex.: REPOSITOR(A)"><datalist id="dlRqF"></datalist></div>
      </div>
      <div class="row3">
        <div class="field"><label>Quantidade</label><input class="input" id="rqQ" type="number" min="1" max="20" value="1"></div>
        <div class="field"><label>Motivo</label><select class="input" id="rqM">${MOTIVOS_REQ.map(x => `<option>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Urgência</label><select class="input" id="rqU"><option>Normal</option><option>Alta</option><option>Urgente</option></select></div>
      </div>
      <div class="row3">
        <div class="field"><label>Substitui (nome, se houver)</label><input class="input" id="rqSub" placeholder="Opcional"></div>
        <div class="field"><label>Turno / horário</label><input class="input" id="rqT" placeholder="Ex.: 07h–15h20"></div>
        <div class="field"><label>Data desejada</label><input class="input" id="rqDt" type="date"></div>
      </div>
      <div class="field"><label>Contrato</label>${chipPicker('contrato', ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO', 'PCD'], 'INTEGRAL')}</div>
      <div class="field"><label>Perfil desejado / observações</label><textarea class="input" id="rqO" placeholder="Experiência, competências, disponibilidade…"></textarea></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rqOk">${ic('check')} Enviar requisição</button>`,
    onMount: m => {
      bindPickers(m.el);
      const fill = () => {
        const l = lojaBy($('#rqL', m.el).value);
        $('#rqS', m.el).innerHTML = l.setores.map(s => `<option ${pre.setor === s.nome ? 'selected' : ''}>${h(s.nome)}</option>`).join('');
        fillF();
      };
      const fillF = () => {
        const l = lojaBy($('#rqL', m.el).value); const sec = l.setores.find(s => s.nome === $('#rqS', m.el).value);
        $('#dlRqF', m.el).innerHTML = uniq((sec ? sec.linhas.map(r => r.funcao) : []).concat(allFuncoes())).map(x => `<option value="${h(x)}">`).join('');
      };
      $('#rqL', m.el).onchange = fill; $('#rqS', m.el).onchange = fillF; fill();
      $('#rqOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const d = { loja: $('#rqL', m.el).value, setor: $('#rqS', m.el).value, funcao: $('#rqF', m.el).value.trim().toUpperCase(), qtd: $('#rqQ', m.el).value, motivo: $('#rqM', m.el).value, urgencia: $('#rqU', m.el).value, substitui: $('#rqSub', m.el).value.trim(), turno: $('#rqT', m.el).value.trim(), dataDesejada: isoToBR($('#rqDt', m.el).value), contrato: pickVal(m.el, 'contrato') || 'INTEGRAL', obs: $('#rqO', m.el).value.trim() };
        if (!d.funcao) throw new Error('Informe a função');
        await api('solicitarVaga', { data: d });
        m.close(); toast('Requisição enviada para aprovação do RH'); bgReload();
      });
    }
  });
}

/* =====================================================================
 * DESLIGAMENTO
 * ===================================================================== */
function openDesligar(l, r) {
  modal({
    title: 'Desligar colaborador', icon: 'door',
    body: `<div class="card" style="background:var(--surface2);display:flex;gap:12px;align-items:center;padding:14px;margin-bottom:16px">${avatar(r.nome, '', 'soft')}<div><b>${h(r.nome)}</b><div class="muted" style="font-size:12.5px">${h(r.funcao)} · ${h(r.setor)} · ${h(l.nome)}${r.tempo ? ' · ' + h(r.tempo) : ''}</div></div></div>
      <div class="row2">
        <div class="field"><label>Data do desligamento</label><input class="input" type="date" id="dsD" value="${isoD(new Date())}"></div>
        <div class="field"><label>Tipo</label><select class="input" id="dsT">${TIPOS_DESL.map(t => `<option>${t}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Responsável pela nova seleção</label><input class="input" id="dsR" value="${h(S.user.nome)}"></div>
      <div class="field"><label>Observação</label><textarea class="input" id="dsO" placeholder="Opcional"></textarea></div>
      <div class="badge b-warn" style="white-space:normal;padding:10px 12px;line-height:1.5;display:block">O nome sai do quadro da loja, a posição vira <b>VAGA</b> e o colaborador deixa de aparecer em contratações pendentes e contratos de experiência. O registro fica no histórico de desligamentos.</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn danger" id="dsOk">${ic('door')} Confirmar desligamento</button>`,
    onMount: m => $('#dsOk', m.el).onclick = e => run(e.currentTarget, async () => {
      await api('desligar', { loja: l.key, row: r.row, expect: expectOf(r), setor: r.setor, dataDesligamento: $('#dsD', m.el).value, tipo: $('#dsT', m.el).value, responsavel: $('#dsR', m.el).value, obs: $('#dsO', m.el).value });
      m.close(); toast('Colaborador desligado e vaga aberta'); S.hl = r.row; bgReload();
    })
  });
}
/* =====================================================================
 * RECRUTAMENTO — controle de seleções / entrevistas (aba liberada por usuário)
 * ===================================================================== */
const SEL_STATUS = ['Agendada', 'Realizada', 'Cancelada'];
const SEL_ORIGENS = ['Banco de talentos', 'Indicação', 'Instagram', 'WhatsApp', 'Indeed', 'SINE', 'Placa na loja', 'Agência', 'Outro'];
const temSel = () => !!(S.user && (isAdmin() || (S.sel ? S.sel.acesso : ls.get('grc_selAcesso_' + S.user.id, false))));
async function carregarAcessoSel() {
  if (!S.user || DEMO) { S.sel = { acesso: isAdmin(), admin: isAdmin(), ids: [] }; return; }
  try {
    const j = await api('selecoesAcesso', {}, { silent: true });
    const antes = temSel();
    S.sel = { acesso: !!j.acesso, admin: !!j.admin, ids: j.ids || [] };
    ls.set('grc_selAcesso_' + S.user.id, S.sel.acesso);
    if (antes !== temSel() && $('.app')) { updateShell(); if (!temSel() && /^#\/recrutamento/.test(location.hash)) location.hash = '#/inicio'; }
  } catch (e) { /* servidor sem a função ainda: mantém como está */ }
}
const selNum = v => (v === '' || v == null) ? null : +v;
const selFalt = s => (selNum(s.chamados) != null && selNum(s.compareceram) != null) ? Math.max(0, s.chamados - s.compareceram) : null;
const selPct = (a, b) => (a != null && b) ? Math.round(a / b * 100) : null;
function selStatusBadge(st) { return `<span class="badge ${st === 'Realizada' ? 'b-ok' : st === 'Cancelada' ? 'b-bad' : 'b-info'}">${h(st || 'Agendada')}</span>`; }

async function pgRecrut() {
  setTitle('Recrutamento', 'Controle de seleções e entrevistas');
  const f = getF('sel');
  const v = $('#view');
  const lojasUser = isAdmin() ? todasLojas() : S.user.lojas;
  v.innerHTML = `
  <div class="grid g4" id="selKpi">${'<div class="sk" style="height:118px"></div>'.repeat(4)}</div>
  <div class="toolbar">
    <div class="input-icon search">${ic('search')}<input class="input" id="sq" placeholder="Buscar setor, função, responsável" value="${h(f.q || '')}" style="width:100%"></div>
    <select class="input" id="sLoja"><option value="">Loja: Todas</option>${lojasUser.map(k => `<option value="${k}" ${f.loja === k ? 'selected' : ''}>${h(LOJA_NOMES[k] || k)}</option>`).join('')}</select>
    <select class="input" id="sSt"><option value="">Status: Todos</option>${SEL_STATUS.map(s => `<option ${f.st === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <select class="input" id="sPer"><option value="">Período: Tudo</option><option value="7" ${f.per === '7' ? 'selected' : ''}>Últimos 7 dias</option><option value="30" ${f.per === '30' ? 'selected' : ''}>Últimos 30 dias</option><option value="mes" ${f.per === 'mes' ? 'selected' : ''}>Este mês</option><option value="prox" ${f.per === 'prox' ? 'selected' : ''}>Próximas (agendadas)</option></select>
    <span class="spacer"></span>
    ${isAdmin() ? `<button class="btn" id="sAcc" title="Quem pode ver esta aba">${ic('key')} Acessos</button>` : ''}
    <button class="btn" id="sExp" title="Exportar Excel / PDF">${ic('download')}</button>
    <button class="btn primary" id="sNew">${ic('plus')} Nova seleção</button>
  </div>
  <div id="sBody"><div class="sk" style="height:220px"></div></div>
  <div class="card mt" id="sResumo" style="display:none"></div>`;
  const rt = S.rt;
  let list = S.selCache || [];
  const filt = () => {
    const q = norm(f.q), hoje = today0();
    return list.filter(s => {
      if (f.loja && s.loja !== f.loja) return false;
      if (f.st && s.status !== f.st) return false;
      if (q && !norm([s.setor, s.funcao, s.responsavel, s.local, s.origem, s.obs].join(' ')).includes(q)) return false;
      const d = parseISO(s.data), dd = d ? Math.round((d - hoje) / 864e5) : null;
      if (f.per === '7' && !(dd != null && dd >= -7 && dd <= 0)) return false;
      if (f.per === '30' && !(dd != null && dd >= -30 && dd <= 0)) return false;
      if (f.per === 'mes' && !(d && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear())) return false;
      if (f.per === 'prox' && !(dd != null && dd >= 0 && s.status !== 'Cancelada' && s.status !== 'Realizada')) return false;
      return true;
    });
  };
  const draw = () => {
    if (rt !== S.rt || !$('#sBody')) return;
    const R = filt(), real = R.filter(s => s.status !== 'Cancelada');
    const tot = k => sum(real, s => +s[k] || 0);
    // taxas só com seleções que já têm o comparecimento lançado
    const feitas = real.filter(s => selNum(s.compareceram) != null && selNum(s.chamados) != null);
    const cham = sum(feitas, s => +s.chamados || 0), comp = sum(feitas, s => +s.compareceram || 0), falt = sum(feitas, s => selFalt(s) || 0), apL = tot('aprov_lider'), apR = tot('aprov_rh'), adm = tot('admitidos');
    const agend = R.filter(s => s.status === 'Agendada' && (daysTo(parseISO(s.data)) ?? -1) >= 0).length;
    $('#selKpi').innerHTML = `
      ${kpi({ lbl: 'Seleções', val: R.length, sub: `${agend} agendada(s) a partir de hoje`, icon: 'calendar', c: 'c-cyan' })}
      ${kpi({ lbl: 'Comparecimento', val: comp + ` <span class="muted" style="font-size:15px">de ${cham} chamados</span>`, sub: `${selPct(comp, cham) ?? 0}% compareceram · ${falt} faltaram`, icon: 'users', c: 'c-blue', bar: selPct(comp, cham) || 0 })}
      ${kpi({ lbl: 'Aprovados', val: `${apL} <span class="muted" style="font-size:15px">liderança</span> · ${apR} <span class="muted" style="font-size:15px">RH</span>`, sub: `${selPct(apR, comp) ?? 0}% dos que compareceram aprovados pelo RH`, icon: 'check', c: 'c-green' })}
      ${kpi({ lbl: 'Admitidos', val: adm, sub: `${selPct(adm, cham) ?? 0}% dos chamados (seleções realizadas) viraram admissão`, icon: 'userplus', c: 'c-violet' })}`;
    table($('#sBody'), 'selecoes', [
      { t: 'Data', k: 'data', r: s => `<b>${h(isoToBR(s.data))}</b>${s.horario ? `<div class="muted" style="font-size:11.5px">${h(s.horario)}</div>` : ''}`, sort: s => { const d = parseISO(s.data); return d ? +d : null; } },
      { t: 'Loja', k: 'loja', r: s => lojaPill(s.loja) },
      { t: 'Setor / função', k: 'funcao', r: s => `<b>${h(s.funcao || s.setor)}</b>${s.funcao && s.setor ? `<div class="muted" style="font-size:11.5px">${h(s.setor)}</div>` : ''}` },
      { t: 'Vagas', k: 'vagas', sort: s => selNum(s.vagas) },
      { t: 'Chamados', k: 'chamados', sort: s => selNum(s.chamados) },
      { t: 'Vieram', k: 'compareceram', r: s => s.compareceram === '' ? '<span class="faint">—</span>' : `${h(s.compareceram)}${selPct(selNum(s.compareceram), selNum(s.chamados)) != null ? ` <span class="faint" style="font-size:11px">${selPct(selNum(s.compareceram), selNum(s.chamados))}%</span>` : ''}`, sort: s => selNum(s.compareceram) },
      { t: 'Faltaram', k: '_f', r: s => { const x = selFalt(s); return x == null ? '<span class="faint">—</span>' : x ? `<span class="badge b-warn">${x}</span>` : '0'; }, sort: s => selFalt(s) },
      { t: 'Aprov. liderança', k: 'aprov_lider', sort: s => selNum(s.aprov_lider) },
      { t: 'Aprov. RH', k: 'aprov_rh', sort: s => selNum(s.aprov_rh) },
      { t: 'Admitidos', k: 'admitidos', sort: s => selNum(s.admitidos) },
      { t: 'Status', k: 'status', r: s => selStatusBadge(s.status) },
      { t: 'Responsável', k: 'responsavel' }
    ], R, s => openSelecao(s));
    // resumo por loja e setor
    const grp = new Map();
    real.forEach(s => { const k = s.loja + '|' + (s.setor || s.funcao); const g = grp.get(k) || { loja: s.loja, setor: s.setor || s.funcao, n: 0, cham: 0, comp: 0, apL: 0, apR: 0, adm: 0 }; g.n++; if (selNum(s.compareceram) != null && selNum(s.chamados) != null) { g.cham += +s.chamados || 0; g.comp += +s.compareceram || 0; } g.apL += +s.aprov_lider || 0; g.apR += +s.aprov_rh || 0; g.adm += +s.admitidos || 0; grp.set(k, g); });
    const rs = $('#sResumo');
    if (grp.size > 1) {
      rs.style.display = '';
      rs.innerHTML = `<div class="card-h"><h3>${ic('trend')} Resumo por setor</h3><span class="muted" style="font-size:12px">sem as canceladas</span></div><div id="sResT"></div>`;
      table($('#sResT'), 'selResumo', [
        { t: 'Loja', k: 'loja', r: g => lojaPill(g.loja) }, { t: 'Setor', k: 'setor' }, { t: 'Seleções', k: 'n' }, { t: 'Chamados', k: 'cham', th: 'Chamados <span class="faint" style="font-weight:500;text-transform:none">(realizadas)</span>' },
        { t: 'Compareceram', k: 'comp', r: g => `${g.comp} <span class="faint" style="font-size:11px">${selPct(g.comp, g.cham) ?? 0}%</span>` },
        { t: 'Faltaram', k: '_f', r: g => g.cham - g.comp, sort: g => g.cham - g.comp }, { t: 'Aprov. liderança', k: 'apL' }, { t: 'Aprov. RH', k: 'apR' }, { t: 'Admitidos', k: 'adm' }
      ], [...grp.values()].sort((a, b) => b.cham - a.cham));
    } else rs.style.display = 'none';
  };
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('sq', 'q'); bind('sLoja', 'loja'); bind('sSt', 'st'); bind('sPer', 'per');
  const atualizar = l => { list = S.selCache = l || []; draw(); };
  $('#sNew').onclick = () => openSelecao(null, atualizar);
  if ($('#sAcc')) $('#sAcc').onclick = () => openAcessoSel();
  $('#sExp').onclick = () => exportCSV('recrutamento', ['Data', 'Horário', 'Loja', 'Setor', 'Função', 'Vagas', 'Local', 'Origem', 'Chamados', 'Confirmados', 'Compareceram', 'Faltaram', 'Aprov. liderança', 'Aprov. RH', 'Admitidos', 'Banco de talentos', 'Status', 'Responsável', 'Observações'],
    filt().map(s => [isoToBR(s.data), s.horario, LOJA_NOMES[s.loja] || s.loja, s.setor, s.funcao, s.vagas, s.local, s.origem, s.chamados, s.confirmados, s.compareceram, selFalt(s) ?? '', s.aprov_lider, s.aprov_rh, s.admitidos, s.banco_talentos, s.status, s.responsavel, s.obs]));
  openSelecao.after = atualizar;
  if (list.length) draw();
  if (liveSelOn) return; // lista já vem do Firebase em tempo real
  try {
    const j = await api('listSelecoes', {}, { silent: !!list.length });
    if (rt !== S.rt) return;
    atualizar(j.selecoes);
  } catch (e) {
    if (rt !== S.rt) return;
    toast(e.message, true);
    if (!list.length) $('#sBody').innerHTML = `<div class="card empty">${ic('alert')}<div>${h(e.message)}</div></div>`;
  }
}

function openSelecao(s, done) {
  done = done || openSelecao.after || (() => {});
  const lojasUser = isAdmin() ? todasLojas() : S.user.lojas;
  const lk0 = s ? s.loja : (getF('sel').loja || (lojasUser.length === 1 ? lojasUser[0] : ''));
  const opcs = lk => { const l = lojaBy(lk); return l ? { setores: uniq(l.setores.map(x => x.nome)).sort(), funcoes: uniq(l.rows.map(r => r.funcao)).sort() } : { setores: [], funcoes: [] }; };
  const n = (id, lbl, val) => `<div class="field"><label>${lbl}</label><input class="input" id="${id}" type="number" min="0" inputmode="numeric" value="${h(val == null ? '' : val)}"></div>`;
  modal({
    title: s ? 'Editar seleção' : 'Nova seleção', icon: 'target', wide: true,
    body: `
      <div class="row2">
        <div class="field"><label>Loja</label><select class="input" id="zL"><option value="">Escolha…</option>${lojasUser.map(k => `<option value="${k}" ${lk0 === k ? 'selected' : ''}>${h(LOJA_NOMES[k] || k)}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="input" id="zSt">${SEL_STATUS.map(x => `<option ${(s ? s.status : 'Agendada') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Setor marcado</label><input class="input" id="zS" list="zSl" value="${h(s ? s.setor : '')}" placeholder="Ex.: FRENTE DE CAIXA"><datalist id="zSl"></datalist></div>
        <div class="field"><label>Função</label><input class="input" id="zF" list="zFl" value="${h(s ? s.funcao : '')}" placeholder="Ex.: OPERADOR(A) DE CAIXA"><datalist id="zFl"></datalist></div>
      </div>
      <div class="row2">
        <div class="field"><label>Data da seleção</label><input class="input" id="zD" type="date" value="${h(s ? s.data : isoD(new Date()))}"></div>
        <div class="field"><label>Horário</label><input class="input" id="zH" type="time" value="${h(s ? s.horario : '')}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Local</label><input class="input" id="zLo" value="${h(s ? s.local : '')}" placeholder="Ex.: Sala do RH — Matriz"></div>
        <div class="field"><label>Responsável</label><input class="input" id="zR" value="${h(s ? s.responsavel : S.user.nome)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Vagas a preencher</label><input class="input" id="zV" type="number" min="0" value="${h(s ? s.vagas : '')}"></div>
        <div class="field"><label>Origem dos candidatos</label><input class="input" id="zO" list="zOl" value="${h(s ? s.origem : '')}" placeholder="Ex.: Banco de talentos"><datalist id="zOl">${SEL_ORIGENS.map(o => `<option value="${h(o)}">`).join('')}</datalist></div>
      </div>
      <div class="card" style="background:var(--surface2);padding:14px;margin:4px 0 14px">
        <div style="font-weight:700;margin-bottom:10px">${ic('users')} Candidatos</div>
        <div class="row2">${n('zC', 'Chamados', s ? s.chamados : '')}${n('zCf', 'Confirmaram presença', s ? s.confirmados : '')}</div>
        <div class="row2">${n('zCp', 'Compareceram', s ? s.compareceram : '')}<div class="field"><label>Faltaram</label><input class="input" id="zFt" readonly tabindex="-1" style="opacity:.8"></div></div>
        <div class="row2">${n('zAL', 'Aprovados pela liderança', s ? s.aprov_lider : '')}${n('zAR', 'Aprovados pelo RH', s ? s.aprov_rh : '')}</div>
        <div class="row2">${n('zAd', 'Admitidos', s ? s.admitidos : '')}${n('zBT', 'Foram para o banco de talentos', s ? s.banco_talentos : '')}</div>
        <div class="muted" id="zRes" style="font-size:12.5px"></div>
      </div>
      <div class="field"><label>Observações</label><textarea class="input" id="zOb" placeholder="Ex.: 2 desistiram após a dinâmica; candidata X fica no banco para fiscal">${h(s ? s.obs : '')}</textarea></div>
      ${s ? `<p class="faint" style="font-size:11.5px;margin:0">Criada por ${h(s.criado_por || '—')} em ${h(s.criado_em || '—')}${s.atualizado_por ? ` · última alteração: ${h(s.atualizado_por)} em ${h(s.atualizado_em)}` : ''}</p>` : ''}`,
    foot: `${s ? `<button class="btn danger" id="zDel" style="margin-right:auto">${ic('trash')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="zOk">${ic('check')} Salvar</button>`,
    onMount: m => {
      const $m = id => $('#' + id, m.el);
      const fillLists = () => { const o = opcs($m('zL').value); $m('zSl').innerHTML = o.setores.map(x => `<option value="${h(x)}">`).join(''); $m('zFl').innerHTML = o.funcoes.map(x => `<option value="${h(x)}">`).join(''); };
      const calc = () => {
        const c = $m('zC').value, p = $m('zCp').value;
        $m('zFt').value = c !== '' && p !== '' ? Math.max(0, c - p) : '';
        const pc = c && p !== '' ? Math.round(p / c * 100) : null, ar = $m('zAR').value;
        $m('zRes').textContent = pc != null ? `Comparecimento de ${pc}%` + (ar !== '' && +p ? ` · aprovação RH de ${Math.round(ar / p * 100)}% dos presentes` : '') : '';
      };
      $m('zL').onchange = fillLists; fillLists();
      ['zC', 'zCp', 'zAR'].forEach(id => $m(id).oninput = calc); calc();
      $m('zOk').onclick = e => run(e.currentTarget, async () => {
        const gv = id => $m(id).value;
        if (!gv('zL')) throw new Error('Escolha a loja');
        if (!gv('zS').trim() && !gv('zF').trim()) throw new Error('Informe o setor ou a função');
        if (!gv('zD')) throw new Error('Informe a data da seleção');
        const N = id => gv(id) === '' ? '' : +gv(id);
        if (N('zCp') !== '' && N('zC') !== '' && N('zCp') > N('zC')) throw new Error('Compareceram não pode ser maior que chamados');
        if (N('zCp') !== '' && ((N('zAL') !== '' && N('zAL') > N('zCp')) || (N('zAR') !== '' && N('zAR') > N('zCp')))) throw new Error('Aprovados não pode ser maior que quem compareceu');
        const j = await api('saveSelecao', { data: { id: s ? s.id : '', loja: gv('zL'), status: gv('zSt'), setor: gv('zS').trim().toUpperCase(), funcao: gv('zF').trim().toUpperCase(), data: gv('zD'), horario: gv('zH'), local: gv('zLo'), responsavel: gv('zR'), vagas: N('zV'), origem: gv('zO'), chamados: N('zC'), confirmados: N('zCf'), compareceram: N('zCp'), aprov_lider: N('zAL'), aprov_rh: N('zAR'), admitidos: N('zAd'), banco_talentos: N('zBT'), obs: gv('zOb') } });
        m.close(); toast(s ? 'Seleção atualizada' : 'Seleção registrada'); done(j.selecoes);
      });
      const del = $m('zDel');
      if (del) del.onclick = async () => {
        if (!await confirmBox(`Excluir a seleção de <b>${h(s.funcao || s.setor)}</b> do dia <b>${h(isoToBR(s.data))}</b>?`, 'Excluir', true)) return;
        await run(del, async () => { const j = await api('deleteSelecao', { id: s.id }); m.close(); toast('Seleção excluída'); done(j.selecoes); }).catch(() => {});
      };
    }
  });
}

async function openAcessoSel() {
  if (openAcessoSel.lock) return; openAcessoSel.lock = 1;
  const btn = $('#sAcc'); if (btn) { btn.disabled = true; btn.dataset.lbl = btn.innerHTML; btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span> Carregando…'; }
  const fim = () => { openAcessoSel.lock = 0; if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = btn.dataset.lbl; } };
  let users = [], ids = (S.sel && S.sel.ids) || [];
  try { busy(true); users = usersCache_() || await usersBuscar_(); if (usersCache_()) usersBuscar_().catch(() => {}); const a = await api('selecoesAcesso', {}, { silent: true }); ids = a.ids || ids; }
  catch (e) { fim(); return toast(e.message, true); } finally { busy(false); }
  fim();
  const ativos = users.filter(u => u.ativo);
  modal({
    title: 'Quem acessa o Recrutamento', icon: 'key',
    body: `<p class="muted" style="margin-top:0">Marque os acessos ativos que podem ver e lançar seleções. Cada pessoa vê apenas as lojas liberadas no acesso dela. Depois de salvar, ela só precisa atualizar a página.</p>
      <div style="display:flex;flex-direction:column;gap:8px">${ativos.map(u => `<label class="card" style="display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:${u.perfil === 'ADMIN' ? 'default' : 'pointer'}">
        <input type="checkbox" data-uid="${h(u.id)}" ${u.perfil === 'ADMIN' || ids.includes(u.id) ? 'checked' : ''} ${u.perfil === 'ADMIN' ? 'disabled' : ''}>
        ${avatar(u.nome, u.foto, 'sm')}<div style="flex:1"><b>${h(u.nome)}</b><div class="muted" style="font-size:11.5px">${h(PERFIS[u.perfil] || u.perfil)} · ${u.lojas.length >= todasLojas().length ? 'todas as lojas' : u.lojas.map(k => LOJA_NOMES[k] || k).join(', ')}</div></div>
        ${u.perfil === 'ADMIN' ? '<span class="badge b-violet">sempre</span>' : ''}</label>`).join('')}</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="aOk">Salvar acessos</button>`,
    onMount: m => {
      $('#aOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const sel = $$('[data-uid]', m.el).filter(c => c.checked && !c.disabled).map(c => c.dataset.uid);
        const j = await api('setSelecoesAcesso', { ids: sel });
        S.sel = Object.assign({}, S.sel, { ids: j.ids });
        m.close(); toast(`Acesso salvo: ${j.ids.length} pessoa(s) além do administrador`);
      });
    }
  });
}


/* =====================================================================
 * MOBILIDADE — ajuda de combustível / transporte (antiga planilha MOBILIDADE GRC)
 * Acesso restrito: só o responsável e quem ele liberar em "Acessos".
 * ===================================================================== */
const MOB_TIPOS = ['MOTO', 'CARRO', 'UBER'];
const MOB_STATUS = ['Simulação', 'Validado', 'Cancelado'];
const MOB_LOJAS = ['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO', 'GRC'];
const MOB_TIPO_C = { MOTO: 'b-info', CARRO: 'b-violet', UBER: 'b-warn' };
const brl = n => (n === '' || n == null || isNaN(+n)) ? '—' : 'R$ ' + (+n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = n => (n === '' || n == null || isNaN(+n)) ? '—' : 'R$ ' + Math.round(+n).toLocaleString('pt-BR');
const kmTxt = n => (n === '' || n == null || isNaN(+n)) ? '—' : (+n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km';
const numBR = v => { if (v === '' || v == null) return ''; const x = Number(String(v).replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(x) ? x : NaN; };
const temMob = () => !!(S.user && (S.mob ? S.mob.acesso : ls.get('grc_mobAcesso_' + S.user.id, false)));
const mobDono = () => !!(S.mob && S.mob.dono);
const mobAdm = () => !!(S.mob && (S.mob.dono || S.mob.adm));
const mobTipoBadge = t => t ? `<span class="badge ${MOB_TIPO_C[t] || ''}">${h(t)}</span>` : '<span class="faint">—</span>';
const mobStBadge = s => `<span class="badge ${s === 'Validado' ? 'b-ok' : s === 'Cancelado' ? 'b-bad' : ''}">${h(s || 'Simulação')}</span>`;
// mesma regra da planilha: km × 2 (ida e volta) × (dias × semanas/mês) × R$/km, arredondado
function mobCalc(km, dias, tipo, cfg) {
  cfg = cfg || (S.mob && S.mob.cfg); if (!cfg) return null;
  const t = cfg.taxas[tipo];
  if (!(km > 0) || !(dias > 0) || t == null) return null;
  const diasMes = dias * cfg.semanas, bruto = km * 2 * diasMes * t;
  return { diasMes, taxa: t, bruto, valor: Math.round(bruto / cfg.arred) * cfg.arred };
}
const mobLojaKey = s => { const n = norm(s); if (/MATRIZ|SANTA ROSA/.test(n)) return 'MATRIZ'; if (/MESSEJANA/.test(n)) return 'MESSEJANA'; if (/TORRA/.test(n)) return 'TORRA'; if (/EUSEBIO/.test(n)) return 'EUSEBIO'; if (/ADM|GRC/.test(n)) return 'GRC'; return n; };

async function carregarAcessoMob() {
  if (!S.user || DEMO) { S.mob = Object.assign(S.mob || {}, { acesso: false, dono: false }); return; }
  try {
    const j = await api('mobAcesso', {}, { silent: true });
    const antes = temMob();
    S.mob = Object.assign(S.mob || {}, { acesso: !!j.acesso, dono: !!j.dono, adm: !!j.adm, ids: j.ids || [], adms: j.adms || [] });
    ls.set('grc_mobAcesso_' + S.user.id, S.mob.acesso);
    if (antes !== temMob() && $('.app')) { updateShell(); if (/^#\/mobilidade/.test(location.hash)) { if (!temMob()) location.hash = '#/inicio'; else route(); } }
  } catch (e) { /* servidor sem a função ainda */ }
}

async function pgMob() {
  setTitle('Mobilidade', 'Ajuda de combustível e transporte · acesso restrito');
  const f = getF('mob'); if (!f.aba) f.aba = 'sim';
  const v = $('#view'), rt = S.rt;
  S.mob = S.mob || {};
  v.innerHTML = `
  <div class="grid g4" id="mKpi">${'<div class="sk" style="height:118px"></div>'.repeat(4)}</div>
  <div class="toolbar">
    <div class="seg" id="mAba"><button data-a="sim" class="${f.aba === 'sim' ? 'on' : ''}">${ic('calc')}<span>Simulações</span></button><button data-a="cen" class="${f.aba === 'cen' ? 'on' : ''}">${ic('users')}<span>Cenário atual</span></button></div>
    <div class="input-icon search">${ic('search')}<input class="input" id="mq" placeholder="Buscar nome, cargo, cidade" value="${h(f.q || '')}" style="width:100%"></div>
    <select class="input" id="mLoja"><option value="">Loja: Todas</option>${MOB_LOJAS.map(k => `<option value="${k}" ${f.loja === k ? 'selected' : ''}>${h(LOJA_NOMES[k] || k)}</option>`).join('')}</select>
    <select class="input" id="mTipo"><option value="">Tipo: Todos</option>${MOB_TIPOS.map(t => `<option ${f.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select class="input" id="mSt" ${f.aba === 'cen' ? 'style="display:none"' : ''}><option value="">Status: Todos</option>${MOB_STATUS.map(s => `<option ${f.st === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <span class="spacer"></span>
    <span id="mDonoBtns"></span>
    <button class="btn" id="mExp" title="Exportar Excel">${ic('download')}</button>
    <button class="btn primary" id="mNew">${ic('plus')} Nova simulação</button>
  </div>
  <div id="mBody"><div class="sk" style="height:220px"></div></div>
  <div class="card mt" id="mResumo" style="display:none"></div>`;
  let sims = S.mob.sims || [], cen = S.mob.cen || null;
  const q = () => norm(f.q);
  const fSim = () => sims.filter(s => (!f.loja || s.loja === f.loja) && (!f.tipo || s.tipo === f.tipo) && (!f.st || s.status === f.st)
    && (!q() || norm([s.nome, s.cargo, s.cidade, s.bairro, s.rua].join(' ')).includes(q())));
  const fCen = () => (cen ? cen.cenario : []).filter(c => (!f.loja || mobLojaKey(c.loja) === f.loja) && (!f.tipo || c.tipo === f.tipo)
    && (!q() || norm([c.nome, c.cargo, c.loja].join(' ')).includes(q())));
  const donoBtns = () => { $('#mDonoBtns').innerHTML = mobAdm() ? `<button class="btn" id="mRg" title="Valores por km, semanas e endereços das lojas">${ic('settings')} Regras</button> <button class="btn" id="mAcc" title="Quem pode ver esta aba">${ic('key')} Acessos</button>` : '';
    if ($('#mRg')) $('#mRg').onclick = () => openMobRegras(() => draw()); if ($('#mAcc')) $('#mAcc').onclick = () => openMobAcesso(); };
  const kpis = () => {
    const R = fSim().filter(s => s.status !== 'Cancelado'), C = fCen();
    const sug = sum(R, s => +s.sugerido || 0), val = sum(R.filter(s => s.validado !== ''), s => +s.validado || 0), nVal = R.filter(s => s.validado !== '').length;
    const totC = sum(C, c => +c.valor || 0);
    $('#mKpi').innerHTML = `
      ${kpi({ lbl: 'Simulações', val: R.length, sub: `${R.filter(s => s.status === 'Validado').length} validada(s) · sem as canceladas`, icon: 'calc', c: 'c-cyan' })}
      ${kpi({ lbl: 'Sugerido / mês', val: brl0(sug), sub: R.length ? `média de ${brl0(sug / R.length)} por pessoa` : 'pela regra de km', icon: 'trend', c: 'c-blue' })}
      ${kpi({ lbl: 'Validado / mês', val: brl0(val), sub: nVal ? `${nVal} com valor validado · ${val - sum(R.filter(s => s.validado !== ''), s => +s.sugerido || 0) >= 0 ? '+' : ''}${brl0(val - sum(R.filter(s => s.validado !== ''), s => +s.sugerido || 0))} vs sugerido` : 'nenhum valor validado ainda', icon: 'check', c: 'c-green' })}
      ${kpi({ lbl: 'Cenário atual', val: cen ? brl0(totC) : '…', sub: cen ? `${C.length} pessoa(s) recebendo hoje${cen.atualizado ? ' · ' + h(cen.atualizado) : ''}` : 'carregando…', icon: 'users', c: 'c-violet' })}`;
  };
  const drawSim = () => {
    const R = fSim();
    if (!R.length) { $('#mBody').innerHTML = `<div class="card empty">${ic('calc')}<div>${sims.length ? 'Nenhuma simulação com esses filtros.' : 'Nenhuma simulação ainda. Clique em <b>Nova simulação</b>.'}</div></div>`; $('#mResumo').style.display = 'none'; return; }
    table($('#mBody'), 'mobSim', [
      { t: 'Colaborador', k: 'nome', r: s => `<b>${h(s.nome)}</b>${s.cargo ? `<div class="muted" style="font-size:11.5px">${h(s.cargo)}</div>` : ''}` },
      { t: 'Local de trabalho', k: 'loja', r: s => lojaPill(s.loja) },
      { t: 'Tipo', k: 'tipo', r: s => mobTipoBadge(s.tipo) },
      { t: 'Origem', k: 'cidade', r: s => `${h([s.rua, s.numero].filter(Boolean).join(', ') || '—')}<div class="muted" style="font-size:11.5px">${h([s.bairro, s.cidade].filter(Boolean).join(' · '))}</div>` },
      { t: 'Escala', k: 'dias', r: s => s.dias ? `${s.dias}x/sem` : '—', sort: s => +s.dias || null },
      { t: 'KM (ida)', k: 'km', r: s => kmTxt(s.km), sort: s => +s.km || null },
      { t: 'Sugerido', k: 'sugerido', r: s => `<b>${brl0(s.sugerido)}</b>`, sort: s => +s.sugerido || null },
      { t: 'Validado', k: 'validado', r: s => s.validado === '' ? '<span class="faint">—</span>' : `<b style="color:var(--ok)">${brl0(s.validado)}</b>${+s.validado !== +s.sugerido && s.sugerido !== '' ? `<div class="faint" style="font-size:11px">${+s.validado > +s.sugerido ? '+' : ''}${brl0(s.validado - s.sugerido)}</div>` : ''}`, sort: s => s.validado === '' ? null : +s.validado },
      { t: 'Status', k: 'status', r: s => mobStBadge(s.status) }
    ], R, s => openMobSim(s, atualizar));
    $('#mResumo').style.display = 'none';
  };
  const drawCen = () => {
    if (!cen) { $('#mBody').innerHTML = '<div class="sk" style="height:220px"></div>'; return; }
    const C = fCen();
    if (!C.length) { $('#mBody').innerHTML = `<div class="card empty">${ic('users')}<div>Ninguém encontrado com esses filtros.</div></div>`; $('#mResumo').style.display = 'none'; return; }
    table($('#mBody'), 'mobCen', [
      { t: 'Colaborador', k: 'nome', r: c => `<b>${h(c.nome)}</b><div class="muted" style="font-size:11.5px">${h(c.cargo)}</div>` },
      { t: 'Loja', k: 'loja', r: c => { const k = mobLojaKey(c.loja); return LOJA_NOMES[k] ? lojaPill(k) : h(c.loja); } },
      { t: 'CPF', k: 'cpf', r: c => c.cpf ? h(c.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')) : '<span class="faint">—</span>' },
      { t: 'Tipo', k: 'tipo', r: c => mobTipoBadge(c.tipo) },
      { t: 'Valor / mês', k: 'valor', r: c => `<b>${brl0(c.valor)}</b>`, sort: c => +c.valor || 0 }
    ], C);
    // resumo por loja × tipo
    const g = new Map();
    C.forEach(c => { const k = mobLojaKey(c.loja) + '|' + (c.tipo || '—'); const x = g.get(k) || { loja: mobLojaKey(c.loja), tipo: c.tipo || '—', n: 0, tot: 0 }; x.n++; x.tot += +c.valor || 0; g.set(k, x); });
    const rs = $('#mResumo'); rs.style.display = '';
    rs.innerHTML = `<div class="card-h"><h3>${ic('trend')} Resumo por loja e tipo</h3><span class="muted" style="font-size:12px">use como referência na hora de validar</span></div><div id="mResT"></div>`;
    table($('#mResT'), 'mobCenRes', [
      { t: 'Loja', k: 'loja', r: x => LOJA_NOMES[x.loja] ? lojaPill(x.loja) : h(x.loja) }, { t: 'Tipo', k: 'tipo', r: x => mobTipoBadge(x.tipo) },
      { t: 'Pessoas', k: 'n' }, { t: 'Total / mês', k: 'tot', r: x => brl0(x.tot) }, { t: 'Média', k: '_m', r: x => brl0(x.tot / x.n), sort: x => x.tot / x.n }
    ], [...g.values()].sort((a, b) => b.tot - a.tot));
  };
  const draw = () => {
    if (rt !== S.rt || !$('#mBody')) return;
    kpis(); donoBtns();
    $('#mSt').style.display = f.aba === 'cen' ? 'none' : '';
    $('#mNew').style.display = f.aba === 'cen' ? 'none' : '';
    if (f.aba === 'cen') drawCen(); else drawSim();
  };
  const atualizar = l => { if (l) sims = S.mob.sims = l; draw(); };
  openMobSim.after = atualizar;
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('mq', 'q'); bind('mLoja', 'loja'); bind('mTipo', 'tipo'); bind('mSt', 'st');
  $$('#mAba button').forEach(b => b.onclick = () => { f.aba = b.dataset.a; saveF(); $$('#mAba button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#mNew').onclick = () => openMobSim(null, atualizar);
  $('#mExp').onclick = () => f.aba === 'cen'
    ? exportCSV('mobilidade_cenario_atual', ['Nome', 'Loja', 'Cargo', 'CPF', 'Tipo', 'Valor/mês'], fCen().map(c => [c.nome, c.loja, c.cargo, c.cpf, c.tipo, c.valor]))
    : exportCSV('mobilidade_simulacoes', ['Nome', 'Cargo', 'Local de trabalho', 'Tipo', 'Rua', 'Nº', 'Bairro', 'CEP', 'Cidade', 'Dias/semana', 'KM (ida)', 'Sugerido', 'Validado', 'Status', 'Observações', 'Criado por', 'Criado em'],
      fSim().map(s => [s.nome, s.cargo, LOJA_NOMES[s.loja] || s.loja, s.tipo, s.rua, s.numero, s.bairro, s.cep, s.cidade, s.dias, s.km, s.sugerido, s.validado, s.status, s.obs, s.criado_por, s.criado_em]));
  if (sims.length || cen) draw();
  if (!S.mobLive) try {
    const j = await api('mobList', {}, { silent: !!sims.length });
    if (rt !== S.rt) return;
    S.mob.cfg = j.cfg; S.mob.dono = !!j.dono; S.mob.adm = !!j.adm;
    atualizar(j.simulacoes);
  } catch (e) {
    if (rt !== S.rt) return;
    toast(e.message, true);
    if (!sims.length) $('#mBody').innerHTML = `<div class="card empty">${ic('alert')}<div>${h(e.message)}</div></div>`;
    return;
  }
  try {
    const c = await api('mobCenario', {}, { silent: true });
    if (rt !== S.rt) return;
    cen = S.mob.cen = c; draw();
  } catch (e) { if (rt === S.rt) { cen = S.mob.cen = { cenario: [], atualizado: '', erro: e.message }; draw(); toast('Cenário atual: ' + e.message, true); } }
}

function openMobSim(s, done) {
  done = done || openMobSim.after || (() => {});
  const cfg = S.mob && S.mob.cfg;
  if (!cfg) return toast('Aguarde carregar as regras da Mobilidade', true);
  const val = (k, d = '') => s && s[k] !== undefined && s[k] !== '' ? s[k] : d;
  modal({
    title: s ? 'Editar simulação' : 'Nova simulação de mobilidade', icon: 'calc', wide: true,
    body: `
      <div class="row2">
        <div class="field"><label>Nome do colaborador / candidato</label><input class="input" id="oN" value="${h(val('nome'))}" placeholder="Nome completo"></div>
        <div class="field"><label>Cargo</label><input class="input" id="oC" value="${h(val('cargo'))}" placeholder="Ex.: REPOSITOR(A)"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Local de trabalho</label><select class="input" id="oL"><option value="">Escolha…</option>${MOB_LOJAS.filter(k => cfg.destinos[k]).map(k => `<option value="${k}" ${val('loja') === k ? 'selected' : ''}>${h(LOJA_NOMES[k] || k)}</option>`).join('')}</select><div class="faint" id="oLd" style="font-size:11.5px"></div></div>
        <div class="row2">
          <div class="field"><label>Tipo</label><select class="input" id="oT">${MOB_TIPOS.map(t => `<option ${val('tipo', 'MOTO') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Escala semanal</label><select class="input" id="oD">${[6, 5, 4, 3].map(d => `<option value="${d}" ${+val('dias', 6) === d ? 'selected' : ''}>${d} dias</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="card" style="background:var(--surface2);padding:14px;margin:4px 0 14px">
        <div style="font-weight:700;margin-bottom:10px">${ic('home')} Endereço do colaborador (origem)</div>
        <div class="row2">
          <div class="field"><label>Rua</label><input class="input" id="oR" value="${h(val('rua'))}" placeholder="Ex.: Rua Denise Ferreira"></div>
          <div class="row2">
            <div class="field"><label>Nº</label><input class="input" id="oNu" value="${h(val('numero'))}"></div>
            <div class="field"><label>CEP</label><input class="input" id="oCe" value="${h(val('cep'))}" placeholder="00000-000" inputmode="numeric"></div>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>Bairro</label><input class="input" id="oB" value="${h(val('bairro'))}"></div>
          <div class="field"><label>Cidade</label><input class="input" id="oCi" value="${h(val('cidade', 'Fortaleza'))}" list="oCil"><datalist id="oCil">${['Fortaleza', 'Eusébio', 'Aquiraz', 'Itaitinga', 'Maracanaú', 'Caucaia', 'Pacatuba', 'Horizonte'].map(c => `<option value="${c}">`).join('')}</datalist></div>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="margin:0;flex:0 1 180px"><label>Distância (só ida)</label><input class="input" id="oK" value="${h(s && s.km !== '' ? String(s.km).replace('.', ',') : '')}" placeholder="km" inputmode="decimal"></div>
          <button class="btn" id="oKc" type="button">${ic('gauge')} Calcular pelo Google Maps</button>
          <a class="btn" id="oMap" target="_blank" rel="noopener" style="display:none">${ic('eye')} Ver rota</a>
        </div>
        <div class="faint" style="font-size:11.5px;margin-top:6px">Rota de carro até a loja. Se o Maps não achar, digite os km manualmente.</div>
      </div>
      <div class="card" id="oCalc" style="padding:14px;margin:0 0 14px;border-color:var(--accent)"></div>
      <div class="row2">
        <div class="field"><label>Valor validado (R$ / mês)</label><div style="display:flex;gap:8px"><input class="input" id="oV" value="${h(s && s.validado !== '' ? String(s.validado).replace('.', ',') : '')}" placeholder="vazio = ainda não validado" inputmode="decimal"><button class="btn" id="oVs" type="button" title="Usar o valor sugerido">= sugerido</button></div></div>
        <div class="field"><label>Status</label><select class="input" id="oS">${MOB_STATUS.map(x => `<option ${val('status', 'Simulação') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Observações</label><textarea class="input" id="oO" placeholder="Ex.: combinado R$ 150 por ser escala 6x1 com folga no domingo">${h(val('obs'))}</textarea></div>
      ${s ? `<p class="faint" style="font-size:11.5px;margin:0">Criada por ${h(s.criado_por || '—')} em ${h(s.criado_em || '—')}${s.atualizado_por ? ` · última alteração: ${h(s.atualizado_por)} em ${h(s.atualizado_em)}` : ''}</p>` : ''}`,
    foot: `${s ? `<button class="btn danger" id="oDel" style="margin-right:auto">${ic('trash')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="oOk">${ic('check')} Salvar</button>`,
    onMount: m => {
      const $m = id => $('#' + id, m.el), gv = id => $m(id).value;
      const end = o => [o.rua, o.numero, o.bairro, o.cep, o.cidade].filter(x => String(x || '').trim()).join(', ');
      const origem = () => ({ rua: gv('oR').trim(), numero: gv('oNu').trim(), bairro: gv('oB').trim(), cep: gv('oCe').trim(), cidade: gv('oCi').trim() });
      let sugAtual = null;
      const recalc = () => {
        const L = gv('oL'), d = cfg.destinos[L];
        $m('oLd').textContent = d ? end(d) : '';
        const o = origem();
        if (d && o.rua && o.cidade) { $m('oMap').style.display = ''; $m('oMap').href = 'https://www.google.com/maps/dir/' + encodeURIComponent(end(o)) + '/' + encodeURIComponent(end(d)); } else $m('oMap').style.display = 'none';
        const km = numBR(gv('oK')), c = mobCalc(km, +gv('oD'), gv('oT'), cfg);
        sugAtual = c ? c.valor : null;
        // referência do cenário atual: média de quem já recebe na mesma loja e tipo
        const cen = (S.mob.cen && S.mob.cen.cenario || []).filter(x => mobLojaKey(x.loja) === L && x.tipo === gv('oT') && +x.valor > 0);
        const ref = cen.length ? `<div class="muted" style="font-size:12px;margin-top:8px">${ic('users')} Hoje, ${cen.length} pessoa(s) de ${h(LOJA_NOMES[L] || L)} recebem ${h(gv('oT'))}: média de <b>${brl0(sum(cen, x => +x.valor) / cen.length)}</b> (de ${brl0(Math.min(...cen.map(x => +x.valor)))} a ${brl0(Math.max(...cen.map(x => +x.valor)))})</div>` : '';
        $m('oCalc').innerHTML = c
          ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><div class="muted" style="font-size:12px">Cálculo do valor sugerido</div>
              <div style="font-size:13px;margin-top:4px">${kmTxt(km)} × 2 (ida e volta) × ${fmt(c.diasMes, 1)} dias/mês × ${brl(c.taxa)}/km = <b>${brl(c.bruto)}</b></div></div>
              <div style="text-align:right"><div class="muted" style="font-size:12px">Sugerido (arred. ${brl0(cfg.arred)})</div><div style="font-size:24px;font-weight:800">${brl0(c.valor)}</div></div></div>${ref}`
          : `<div class="muted" style="font-size:13px">${ic('calc')} Informe a loja, o tipo, a escala e a distância (ou calcule pelo Maps) para ver o valor sugerido.</div>${ref}`;
      };
      ['oL', 'oT', 'oD', 'oK', 'oR', 'oNu', 'oB', 'oCe', 'oCi'].forEach(id => { $m(id).addEventListener('input', recalc); $m(id).addEventListener('change', recalc); });
      $m('oCe').addEventListener('input', () => { const d = gv('oCe').replace(/\D/g, '').slice(0, 8); $m('oCe').value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; });
      recalc();
      $m('oKc').onclick = e => run(e.currentTarget, async () => {
        if (!gv('oL')) throw new Error('Escolha o local de trabalho');
        const o = origem(); if (!o.rua || !o.cidade) throw new Error('Informe pelo menos a rua e a cidade');
        const j = await api('mobCalcKm', { loja: gv('oL'), origem: o }, { silent: true });
        $m('oK').value = String(j.km).replace('.', ','); recalc(); toast(`Distância: ${kmTxt(j.km)}`);
      }).catch(() => {});
      $m('oVs').onclick = () => { if (sugAtual != null) { $m('oV').value = sugAtual; if (gv('oS') === 'Simulação') $m('oS').value = 'Validado'; } else toast('Ainda não há valor sugerido', true); };
      $m('oOk').onclick = e => run(e.currentTarget, async () => {
        if (!gv('oN').trim()) throw new Error('Informe o nome');
        if (!gv('oL')) throw new Error('Escolha o local de trabalho');
        const km = numBR(gv('oK')); if (gv('oK') && !(km > 0)) throw new Error('Distância inválida');
        const vv = numBR(gv('oV')); if (gv('oV') && !(vv >= 0)) throw new Error('Valor validado inválido');
        const j = await api('mobSave', { data: Object.assign({ id: s ? s.id : '', nome: gv('oN'), cargo: gv('oC'), loja: gv('oL'), tipo: gv('oT'), dias: +gv('oD'), km: km === '' ? '' : km, validado: vv === '' ? '' : vv, status: gv('oS'), obs: gv('oO') }, origem()) });
        m.close(); toast(s ? 'Simulação atualizada' : 'Simulação salva'); done(j.simulacoes);
      });
      const del = $m('oDel');
      if (del) del.onclick = async () => {
        if (!await confirmBox(`Excluir a simulação de <b>${h(s.nome)}</b>?`, 'Excluir', true)) return;
        await run(del, async () => { const j = await api('mobDelete', { id: s.id }); m.close(); toast('Simulação excluída'); done(j.simulacoes); }).catch(() => {});
      };
    }
  });
}

function openMobRegras(done) {
  const c = S.mob && S.mob.cfg; if (!c) return;
  const v2 = n => String(n).replace('.', ',');
  modal({
    title: 'Regras da Mobilidade', icon: 'settings', wide: true,
    body: `<p class="muted" style="margin-top:0">Fórmula: <b>km × 2 (ida e volta) × (dias por semana × semanas no mês) × R$ por km</b>, arredondado. As simulações já salvas mantêm o valor sugerido da época; abra e salve de novo para recalcular.</p>
      <div class="row3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${MOB_TIPOS.map(t => `<div class="field"><label>${t} — R$ por km</label><input class="input" data-tx="${t}" value="${h(v2(c.taxas[t]))}" inputmode="decimal"></div>`).join('')}</div>
      <div class="row2"><div class="field"><label>Semanas no mês</label><input class="input" id="rgS" value="${h(v2(c.semanas))}" inputmode="decimal"></div><div class="field"><label>Arredondar para múltiplos de (R$)</label><input class="input" id="rgA" value="${h(v2(c.arred))}" inputmode="decimal"></div></div>
      <div style="font-weight:700;margin:6px 0 10px">${ic('store')} Endereço das lojas (destino)</div>
      ${Object.keys(c.destinos).map(k => { const d = c.destinos[k]; return `<div class="card" style="background:var(--surface2);padding:10px 12px;margin-bottom:8px"><div style="margin-bottom:8px">${lojaPill(k)}</div>
        <div style="display:grid;grid-template-columns:2fr .7fr 1fr 1.3fr;gap:8px" data-dst="${h(k)}"><input class="input" data-f="rua" value="${h(d.rua)}" placeholder="Rua"><input class="input" data-f="numero" value="${h(d.numero)}" placeholder="Nº"><input class="input" data-f="cep" value="${h(d.cep)}" placeholder="CEP"><input class="input" data-f="cidade" value="${h(d.cidade)}" placeholder="Cidade - UF"></div></div>`; }).join('')}`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rgOk">${ic('check')} Salvar regras</button>`,
    onMount: m => {
      $('#rgOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const taxas = {}; $$('[data-tx]', m.el).forEach(i => { const x = numBR(i.value); if (!(x >= 0)) throw new Error('Valor por km inválido em ' + i.dataset.tx); taxas[i.dataset.tx] = x; });
        const destinos = {}; $$('[data-dst]', m.el).forEach(g => { const o = {}; $$('[data-f]', g).forEach(i => o[i.dataset.f] = i.value.trim()); destinos[g.dataset.dst] = o; });
        const j = await api('mobSetCfg', { cfg: { taxas, semanas: numBR($('#rgS', m.el).value), arred: numBR($('#rgA', m.el).value), destinos } });
        S.mob.cfg = j.cfg; m.close(); toast('Regras salvas'); if (done) done();
      });
    }
  });
}

async function openMobAcesso() {
  if (openMobAcesso.lock) return; openMobAcesso.lock = 1;
  let j;
  try { busy(true); j = await api('mobUsuarios', {}, { silent: true }); }
  catch (e) { return toast(e.message, true); } finally { busy(false); openMobAcesso.lock = 0; }
  const ids = j.ids || [], adms = j.adms || [], souDono = !!j.souDono;
  const dono = (j.users || []).find(u => u.id === j.dono);
  const ativos = (j.users || []).filter(u => u.ativo && u.id !== j.dono).sort((a, b) => (adms.includes(b.id) - adms.includes(a.id)) || (ids.includes(b.id) - ids.includes(a.id)) || String(a.nome).localeCompare(b.nome));
  const nivel = u => adms.includes(u.id) ? 'adm' : ids.includes(u.id) ? 'ver' : '';
  const NIV = [['', 'Sem acesso'], ['ver', 'Acesso'], ['adm', 'Adm. secundário']];
  modal({
    title: 'Quem acessa a Mobilidade', icon: 'key',
    body: `<p class="muted" style="margin-top:0;line-height:1.55"><b>Dono</b>: administrador máximo, faz tudo. <b>Adm. secundário</b>: lança simulações, edita as regras e libera acessos. <b>Acesso</b>: vê e lança simulações. Administradores do Quadro não entram sem estar marcados aqui.${souDono ? '' : ' Só o dono altera os administradores secundários.'}</p>
      ${dono ? `<div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px">${avatar(dono.nome, dono.foto, 'sm')}<div style="flex:1"><b>${h(dono.nome)}</b><div class="muted" style="font-size:11.5px">${h(dono.cargo || PERFIS[dono.perfil] || '')}</div></div><span class="badge b-violet">Dono</span></div>` : ''}
      <div class="input-icon search" style="margin:10px 0">${ic('search')}<input class="input" id="maq" placeholder="Buscar pessoa" style="width:100%"></div>
      <div style="display:flex;flex-direction:column;gap:8px" id="maL">${ativos.map(u => `<div class="card" data-nm="${h(norm(u.nome))}" style="display:flex;align-items:center;gap:12px;padding:10px 12px">
        ${avatar(u.nome, u.foto, 'sm')}<div style="flex:1;min-width:0"><b>${h(u.nome)}</b><div class="muted" style="font-size:11.5px">${h(PERFIS[u.perfil] || u.perfil)}${u.cargo ? ' · ' + h(u.cargo) : ''}</div></div>
        <select class="input" data-uid="${h(u.id)}" style="width:auto;padding:7px 9px;font-size:12.5px" ${!souDono && nivel(u) === 'adm' ? 'disabled' : ''}>${NIV.filter(n => souDono || n[0] !== 'adm' || nivel(u) === 'adm').map(n => `<option value="${n[0]}" ${nivel(u) === n[0] ? 'selected' : ''}>${n[1]}</option>`).join('')}</select></div>`).join('') || '<div class="empty">Nenhum outro acesso ativo.</div>'}</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="maOk">Salvar acessos</button>`,
    onMount: m => {
      $('#maq', m.el).oninput = e => { const t = norm(e.target.value); $$('#maL [data-nm]', m.el).forEach(l => l.style.display = !t || l.dataset.nm.includes(t) ? '' : 'none'); };
      $('#maOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const sels = $$('[data-uid]', m.el);
        const pl = { ids: sels.filter(c => c.value === 'ver').map(c => c.dataset.uid) };
        if (souDono) pl.adms = sels.filter(c => c.value === 'adm').map(c => c.dataset.uid);
        const r = await api('mobSetAcesso', pl);
        S.mob.ids = r.ids; S.mob.adms = r.adms; m.close();
        toast(`Acessos salvos: ${r.adms.length} adm. secundário(s) e ${r.ids.length} com acesso`);
      });
    }
  });
}

/* =====================================================================
 * NOVA LOJA — cria um novo quadro a partir de uma loja modelo
 * ===================================================================== */
function openNovaLoja() {
  const L = S.data.lojas;
  modal({
    title: 'Nova loja', icon: 'store',
    body: `<p class="muted" style="margin-top:0">Cria um novo quadro no sistema e uma aba nova na planilha, copiando os setores e as posições de uma loja que já existe. As posições entram como <b>vagas abertas</b>, sem colaboradores; depois é só ajustar o quadro padrão, incluir ou remover posições.</p>
      <div class="row2">
        <div class="field"><label>Nome da loja</label><input class="input" id="nlN" placeholder="Ex.: Aquiraz"></div>
        <div class="field"><label>Descrição (aparece embaixo do nome)</label><input class="input" id="nlS" placeholder="Ex.: Loja 5 · Centro"></div>
      </div>
      <div class="field"><label>Copiar estrutura de</label><select class="input" id="nlB">${L.map(l => `<option value="${h(l.key)}" ${l.nova ? 'selected' : ''}>${h(l.nome)} — ${l.setores.length} setores · ${l.rows.length} posições</option>`).join('')}</select></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="nlNova" checked> Marcar como loja NOVA no menu</label>
      <p class="faint" style="font-size:12px;margin-bottom:0">Quem tem acesso a "todas as lojas" passa a ver a nova loja automaticamente. Para os demais, libere em Acessos e configurações.</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="nlOk">${ic('plus')} Criar loja</button>`,
    onMount: m => {
      $('#nlOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const nome = $('#nlN', m.el).value.trim();
        if (nome.length < 2) throw new Error('Informe o nome da loja');
        if (todasLojas().some(k => norm(LOJA_NOMES[k]) === norm(nome))) throw new Error('Já existe uma loja com esse nome');
        const j = await api('criarLoja', { data: { nome, sub: $('#nlS', m.el).value.trim(), base: $('#nlB', m.el).value, nova: $('#nlNova', m.el).checked } });
        m.close(); toast(`Loja ${nome} criada. Carregando o novo quadro…`);
        await loadAll(false, true, true);
        if (j.loja && lojaBy(j.loja.key)) location.hash = '#/loja/' + j.loja.key;
      });
    }
  });
}

function pgDesl() {
  setTitle('Desligamentos', 'Histórico de colaboradores desligados pelo sistema');
  const dtD = d => parseISO(d.data) || parseBR(d.data);
  const D = (S.data.desligados || []).map((d, i) => Object.assign({ _i: i }, d)).sort((a, b) => ((dtD(b) || 0) - (dtD(a) || 0)) || (b._i - a._i)), f = getF('desl');
  $('#view').innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Desligamentos registrados', val: D.length, icon: 'door', c: 'c-red' })}
    ${kpi({ lbl: 'Últimos 30 dias', val: D.filter(d => { const x = daysTo(dtD(d)); return x != null && x >= -30 && x <= 0; }).length, icon: 'calendar', c: 'c-amber' })}
    ${kpi({ lbl: 'Pedidos de demissão', val: D.filter(d => /PEDIDO/i.test(d.tipo)).length, icon: 'users', c: 'c-blue' })}
    ${kpi({ lbl: 'Término de experiência', val: D.filter(d => /EXPERI/i.test(d.tipo)).length, icon: 'clock', c: 'c-violet' })}
  </div>
  <div class="toolbar"><div class="input-icon search">${ic('search')}<input class="input" id="dq" placeholder="Buscar nome ou função" value="${h(f.q || '')}" style="width:100%"></div>${selectHTML('dL', 'Loja', uniq(D.map(d => d.loja)), f.loja, 'Todas')}${selectHTML('dT', 'Tipo', uniq(D.map(d => d.tipo)), f.tipo)}<span class="spacer"></span><button class="btn" id="dExp" title="Exportar Excel / PDF">${ic('download')}</button></div>
  <div id="dBody"></div>`;
  const filt = () => { const q = norm(f.q); return D.filter(d => (!q || norm(d.nome + ' ' + d.funcao).includes(q)) && (!f.loja || d.loja === f.loja) && (!f.tipo || d.tipo === f.tipo)); };
  const draw = () => table($('#dBody'), 'desl', [
    { t: 'Data', k: 'data', r: d => h(isoToBR(d.data) || d.data || ''), sort: d => { const x = dtD(d); return x ? +x : null; } }, { t: 'Loja', k: 'loja', r: d => d.loja ? lojaPill(d.loja) : '' },
    { t: 'Colaborador', k: 'nome', r: d => `<div class="cell-person">${avatar(d.nome, '', 'sm soft')}<b>${h(d.nome)}</b></div>` },
    { t: 'Função', k: 'funcao' }, { t: 'Tipo', k: 'tipo', r: d => d.tipo ? `<span class="badge">${h(d.tipo)}</span>` : '' }, { t: 'Origem', k: 'origem' }
  ], filt());
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('dq', 'q'); bind('dL', 'loja'); bind('dT', 'tipo');
  $('#dExp').onclick = () => exportCSV('desligamentos', ['Data', 'Loja', 'Colaborador', 'Função', 'Tipo', 'Origem'], filt().map(d => [isoToBR(d.data), LOJA_NOMES[d.loja] || d.loja, d.nome, d.funcao, d.tipo, d.origem]));
  draw();
}

/* =====================================================================
 * APROVAÇÕES (admin) e MINHAS SOLICITAÇÕES
 * ===================================================================== */
const ST_SOL = { PENDENTE: 'b-warn', APROVADA: 'b-ok', REJEITADA: 'b-bad', CANCELADA: '' };
function solCard(s, admin) {
  const p = s.payload || {};
  const det = s.tipo === 'REQUISICAO' ? `<div class="sol-det"><span>${ic('store')} ${h(LOJA_NOMES[p.loja] || p.loja)}</span><span>${ic('grid')} ${h(p.setor)}</span><span>${ic('briefcase')} <b>${h(p.funcao)}</b> × ${h(p.qtd)}</span><span>${h(p.motivo || '')}</span>${p.urgencia && p.urgencia !== 'Normal' ? `<span class="badge b-bad">${h(p.urgencia)}</span>` : ''}${p.substitui ? `<span>Substitui: ${h(p.substitui)}</span>` : ''}${p.turno ? `<span>Turno: ${h(p.turno)}</span>` : ''}${p.dataDesejada ? `<span>Para: ${h(p.dataDesejada)}</span>` : ''}${p.contrato ? `<span>${h(p.contrato)}</span>` : ''}</div>${p.obs ? `<div class="muted" style="font-size:12.5px;margin-top:6px">“${h(p.obs)}”</div>` : ''}` : '';
  return `<div class="card sol" data-id="${s.id}">
    <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div class="ai" style="background:${s.tipo === 'REQUISICAO' ? 'rgba(167,139,250,.15);color:#a78bfa' : 'var(--acc-bg);color:var(--accent)'}">${ic(s.tipo === 'REQUISICAO' ? 'plus' : 'edit')}</div>
      <div style="flex:1;min-width:220px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b>${s.tipo === 'REQUISICAO' ? 'Requisição de vaga' : 'Alteração pelo recrutador'}</b><span class="badge ${ST_SOL[s.status] || ''}">${h(s.status)}</span>${s.loja ? lojaPill(s.loja) : ''}</div>
        <div style="margin-top:4px">${h(s.resumo)}</div>
        ${det}
        <div class="faint" style="font-size:12px;margin-top:6px">${h(s.solicitante)} · ${h(s.data)}${s.decididoPor ? ` · ${s.status === 'APROVADA' ? 'Aprovada' : s.status === 'REJEITADA' ? 'Rejeitada' : 'Encerrada'} por ${h(s.decididoPor)} em ${h(s.decididoEm)}` : ''}${s.comentario ? ` · “${h(s.comentario)}”` : ''}${s.resultado ? ` · ${h(s.resultado)}` : ''}</div>
      </div>
      ${s.status === 'PENDENTE' ? (admin ? `<div style="display:flex;gap:8px"><button class="btn danger sm" data-rej>${ic('x')} Rejeitar</button><button class="btn ok sm" data-apr>${ic('check')} Aprovar</button></div>` : `<button class="btn sm" data-cancel>Cancelar</button>`) : ''}
    </div></div>`;
}
async function pgAprov() {
  setTitle('Aprovações', 'Requisições de vaga e alterações de recrutadores');
  const v = $('#view'); const tab = getV('aprovTab', 'PENDENTE');
  v.innerHTML = `<div class="toolbar" style="margin-top:0"><div class="seg" id="apTab"><button data-v="PENDENTE">Pendentes</button><button data-v="TODAS">Histórico</button></div><select class="input" id="apTipo"><option value="">Tipo: Todos</option><option value="REQUISICAO">Requisições de vaga</option><option value="ALTERACAO">Alterações de recrutador</option></select><span class="spacer"></span></div><div id="apBody"><div class="sk" style="height:160px"></div></div>`;
  $$('#apTab button').forEach(b => { b.classList.toggle('on', b.dataset.v === tab); b.onclick = () => { setV('aprovTab', b.dataset.v); route(); }; });
  let list = [];
  const draw = () => {
    const t = $('#apTipo').value;
    const rows = list.filter(s => (tab === 'TODAS' || s.status === 'PENDENTE') && (!t || s.tipo === t));
    $('#apBody').innerHTML = rows.length ? `<div class="grid" style="gap:12px">${rows.map(s => solCard(s, true)).join('')}</div>` : `<div class="card empty">${ic('check')}<div>${tab === 'PENDENTE' ? 'Nenhuma aprovação pendente.' : 'Nenhuma solicitação.'}</div></div>`;
    $$('#apBody .sol').forEach(el => {
      const s = list.find(x => x.id === el.dataset.id);
      const a = $('[data-apr]', el), r = $('[data-rej]', el);
      if (a) a.onclick = () => s.tipo === 'REQUISICAO' ? openAprovarReq(s, reload) : decidir(s, true, reload);
      if (r) r.onclick = () => decidir(s, false, reload);
    });
  };
  const rt = S.rt;
  const reload = async () => { try { list = (await api('listSolicitacoes')).solicitacoes; if (rt !== S.rt || !$('#apTipo')) return; draw(); } catch (e) { toast(e.message, true); } };
  $('#apTipo').onchange = draw;
  await reload();
}
function decidir(s, aprovar, done) {
  modal({
    title: aprovar ? 'Aprovar solicitação' : 'Rejeitar solicitação', icon: aprovar ? 'check' : 'x',
    body: `<p style="margin-top:0">${h(s.resumo)}</p><p class="muted" style="font-size:12.5px">Solicitado por ${h(s.solicitante)} em ${h(s.data)}.${aprovar ? ' A alteração será aplicada na planilha agora.' : ''}</p><div class="field"><label>Comentário ${aprovar ? '(opcional)' : '(motivo da recusa)'}</label><textarea class="input" id="dcC"></textarea></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn ${aprovar ? 'ok' : 'danger'}" id="dcOk">${aprovar ? 'Aprovar e aplicar' : 'Rejeitar'}</button>`,
    onMount: m => $('#dcOk', m.el).onclick = e => run(e.currentTarget, async () => {
      await api('decidirSolicitacao', { id: s.id, aprovar, comentario: $('#dcC', m.el).value });
      m.close(); toast(aprovar ? 'Solicitação aprovada' : 'Solicitação rejeitada'); bgReload(); if (done) done();
    })
  });
}
function openAprovarReq(s, done) {
  const p = s.payload || {}; const l = lojaBy(p.loja);
  if (!l) return toast('Loja da requisição não está no seu acesso', true);
  const fn = norm(p.funcao).replace(/[^A-Z]/g, '').slice(0, 5);
  const cands = l.rows.filter(r => r.vagaAberta).sort((a, b) => ((a.setor === p.setor ? 0 : 2) + (norm(a.funcao).replace(/[^A-Z]/g, '').startsWith(fn) ? 0 : 1)) - ((b.setor === p.setor ? 0 : 2) + (norm(b.funcao).replace(/[^A-Z]/g, '').startsWith(fn) ? 0 : 1)));
  const qtd = +p.qtd || 1;
  const aumento = /AUMENTO|ABERTURA/.test(norm(p.motivo));
  const sug = aumento ? [] : cands.filter(r => r.setor === p.setor && norm(r.funcao).replace(/[^A-Z]/g, '').startsWith(fn)).slice(0, qtd);
  modal({
    title: 'Aprovar requisição de vaga', icon: 'check', wide: true,
    body: `<div class="card" style="background:var(--surface2);padding:14px;margin-bottom:16px">${h(s.resumo)}<div class="faint" style="font-size:12px;margin-top:4px">${h(s.solicitante)} · ${h(s.data)}</div></div>
      <div class="field"><label>Como atender?</label>
        <div class="optchips"><label class="chip ${sug.length ? 'on' : ''}"><input type="radio" name="md" value="existente" ${sug.length ? 'checked' : ''} hidden> Usar vaga(s) já existente(s) no quadro</label><label class="chip ${sug.length ? '' : 'on'}"><input type="radio" name="md" value="nova" ${sug.length ? '' : 'checked'} hidden> Criar ${qtd} nova(s) posição(ões) em ${h(p.setor)} (aumento de quadro)</label></div></div>
      <div id="mdEx" class="${sug.length ? '' : 'hidden'}"><div class="muted" style="font-size:12.5px;margin-bottom:8px">Selecione ${qtd} vaga(s). As sugeridas combinam setor e função.</div>
        <div class="alist" style="max-height:280px">${cands.length ? cands.map(r => `<label class="aitem" style="cursor:pointer;align-items:center"><input type="checkbox" value="${r.row}" ${sug.includes(r) ? 'checked' : ''}><div style="flex:1"><b>${h(r.funcao)}</b><span>${h(r.setor)}${r.info && r.info.abertura ? ' · aberta em ' + isoToBR(r.info.abertura) : ' · sem data'}</span></div>${sug.includes(r) ? '<span class="badge b-ok">sugerida</span>' : ''}</label>`).join('') : '<div class="empty">Não há vagas abertas nesta loja.</div>'}</div></div>
      <label id="arPadW" class="${sug.length ? 'hidden' : ''}" style="display:flex;gap:8px;align-items:center;font-weight:600;margin-top:12px"><input type="checkbox" id="arPad" ${aumento ? 'checked' : ''}> Aumentar o quadro padrão de ${h(p.setor)} em +${qtd} (de ${fmt((l.setores.find(x => x.nome === p.setor) || {}).pad || 0)} para ${fmt(((l.setores.find(x => x.nome === p.setor) || {}).pad || 0) + qtd)})</label>
      <div class="row2 mt"><div class="field"><label>Responsável pela seleção</label><input class="input" id="arR" value="${h(S.user.nome)}"></div><div class="field"><label>Comentário para o solicitante</label><input class="input" id="arC" placeholder="Opcional"></div></div>
`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn ok" id="arOk">${ic('check')} Aprovar requisição</button>`,
    onMount: m => {
      $$('input[name=md]', m.el).forEach(i => i.onchange = () => { $$('input[name=md]', m.el).forEach(x => x.parentElement.classList.toggle('on', x.checked)); $('#mdEx', m.el).classList.toggle('hidden', i.value !== 'existente' || !i.checked); $('#arPadW', m.el).classList.toggle('hidden', $('input[name=md]:checked', m.el).value !== 'nova'); });
      $('#arOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const modo = $('input[name=md]:checked', m.el).value;
        const rows = $$('#mdEx input[type=checkbox]:checked', m.el).map(c => { const r = l.rows.find(x => x.row === +c.value); return { row: r.row, expect: expectOf(r) }; });
        if (modo === 'existente' && !rows.length) throw new Error('Selecione ao menos uma vaga ou escolha criar nova posição');
        await api('decidirSolicitacao', { id: s.id, aprovar: true, comentario: $('#arC', m.el).value, decisao: { modo, rows, responsavel: $('#arR', m.el).value, aumentarPadrao: modo === 'nova' && $('#arPad', m.el).checked } });
        m.close(); toast('Requisição aprovada — vaga aberta'); bgReload(); if (done) done();
      });
    }
  });
}
async function pgSolic() {
  setTitle('Minhas solicitações', 'Requisições e alterações enviadas para aprovação');
  const v = $('#view');
  v.innerHTML = `<div class="toolbar" style="margin-top:0">${S.user.lojas.length ? `<button class="btn primary" id="msNew">${ic('plus')} Requisitar vaga</button>` : ''}<span class="spacer"></span></div><div id="msBody"><div class="sk" style="height:160px"></div></div>`;
  if ($('#msNew')) $('#msNew').onclick = () => openRequisicao();
  const rt = S.rt;
  try {
    const list = (await api('listSolicitacoes', { minhas: true })).solicitacoes;
    if (rt !== S.rt || !$('#msBody')) return;
    $('#msBody').innerHTML = list.length ? `<div class="grid" style="gap:12px">${list.map(s => solCard(s, false)).join('')}</div>` : `<div class="card empty">${ic('file')}<div>Você ainda não enviou solicitações.</div></div>`;
    $$('#msBody [data-cancel]').forEach(b => b.onclick = async () => { const id = b.closest('.sol').dataset.id; if (!await confirmBox('Cancelar esta solicitação?', 'Cancelar solicitação', true)) return; await run(null, () => api('cancelarSolicitacao', { id })); toast('Solicitação cancelada'); route(); });
  } catch (e) { toast(e.message, true); }
}

/* =====================================================================
 * CONTRATAÇÕES (com filtro semanal e alocação automática)
 * ===================================================================== */
const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x; };
const fmtD = d => d ? d.toLocaleDateString('pt-BR') : '';
const isoD = d => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '';
const LOJAS_CONTR = ['Matriz', 'Messejana', 'Torra', 'Eusébio', 'Super Fraldas', 'Monitoramento', 'Casa & Construção'];
function matchVagas(lk, funcao, setor) {
  const l = lojaBy(lk); if (!l) return [];
  const fx = norm(funcao).replace(/OP\.?\s*/, 'OPERADOR ').replace(/AUX\b/, 'AUXILIAR').replace(/[^A-Z ]/g, '').trim();
  const key = fx.split(' ')[0].slice(0, 5);
  const sx = norm(setor).split(/[\s-]/)[0];
  const score = r => (key && norm(r.funcao).startsWith(key) ? 0 : 4) + (sx && norm(r.setor).includes(sx) ? 0 : 2) + (r.vagaAberta ? 0 : 1);
  return l.rows.filter(r => r.isVaga).map(r => ({ r, sc: score(r) })).sort((a, b) => a.sc - b.sc).map(x => Object.assign(x.r, { _sc: x.sc }));
}
/* ---------- checklist da admissão (DP → ASO → HCM → Quadro) ---------- */
const ASO_OK = v => /FEITO|NAO SE APLICA|DISPENS/.test(norm(v));
const SIM = v => /^S/.test(norm(v));
function chkSteps(r) {
  const K = S.ck, out = [];
  if (K.dp) out.push({ k: 'dp', lbl: 'Admissão solicitada ao DP', curto: 'DP', ok: SIM(r[K.dp]), sub: SIM(r[K.dp]) ? 'Solicitada no sistema do DP' : 'Ainda não solicitada' });
  if (K.aso) out.push({ k: 'aso', lbl: 'ASO admissional', curto: 'ASO', ok: ASO_OK(r[K.aso]), mid: /MARCADO/.test(norm(r[K.aso])), sub: r[K.aso] ? String(r[K.aso]) : 'Sem informação' });
  if (K.hcm) out.push({ k: 'hcm', lbl: 'Exportado ao HCM', curto: 'HCM', ok: SIM(r[K.hcm]), sub: SIM(r[K.hcm]) ? 'Exportado' : 'Não exportado' });
  out.push({ k: 'aloc', lbl: 'Alocado no quadro', curto: 'Quadro', ok: !r._pend && !r._deslig, sub: r._deslig ? 'Desligado' : r._pend ? 'Pendente de alocação' : 'Alocado' });
  return out;
}
const chkStatus = r => r._deslig ? '<span class="badge b-bad">Desligado</span>' : !r._falta ? `<span class="badge b-ok">${ic('check')} Concluída</span>` : `<span class="ck-falta">Falta: <b>${h(r._falta.curto)}</b></span>`;
function chkCell(r) {
  const can = canContr(r._loja) && !r._deslig, tot = r._chk.length, pc = Math.round(r._chkOk / tot * 100);
  return `<div class="ck" data-stop>
    <div class="ck-items">${r._chk.map(s => {
      const pode = can && (s.k !== 'aloc' || (r._pend && canEdit(r._loja) && lojaBy(r._loja)));
      const cls = s.ok ? 'ok' : s.mid ? 'mid' : r._falta === s ? 'next' : '';
      return `<button class="ck-i ${cls} ${pode ? 'can' : ''}" ${pode ? `data-ck="${r.row}" data-cf="${s.k}"` : 'disabled'} title="${h(s.lbl)} — ${h(s.sub)}${pode ? (s.k === 'aloc' ? ' · clique para alocar' : ' · clique para alterar') : ''}"><span class="ck-b">${s.ok ? ic('check') : ''}</span>${h(s.curto)}${s.k === 'aso' && !s.ok && s.mid ? ' · marcado' : ''}</button>`;
    }).join('')}</div>
    <div class="ck-meta"><div class="ck-bar ${r._falta ? '' : 'full'}"><i style="width:${pc}%"></i></div><span>${r._chkOk}/${tot}</span>${chkStatus(r)}</div>
  </div>`;
}
// grava um campo da contratação na hora (otimista), mandando a linha completa como no formulário
function contrSet(r, k, v) {
  const K = S.ck, data = {};
  (S.data.contratacoes.header || []).filter(x => !/^COL\d+$/.test(x)).forEach(x => { data[x] = x === K.data ? brToISO(r[x]) || r[x] || '' : String(r[x] == null ? '' : r[x]); });
  data[k] = v;
  return run(null, () => api('saveContratacao', { row: r.row, expectNome: r[K.colab], data }));
}
function chkClick(anchor, r, f) {
  const K = S.ck; if (!r) return;
  if (f === 'aloc') return openAlocar(r);
  if (f === 'aso') return openQuickEdit(anchor, r, 'aso');
  const v = SIM(r[K[f]]) ? 'NÃO' : 'SIM';
  contrSet(r, K[f], v).then(j => { if (j && !j.pendente) toast(`${String(r[K.colab] || '').split(' ')[0]}: ${f === 'dp' ? 'admissão no DP' : 'exportação ao HCM'} ${v === 'SIM' ? 'marcada' : 'desmarcada'}`); }).catch(() => {});
}
function pgContr() {
  setTitle('Contratações', 'Admissões semanais e alocação no quadro');
  const C = S.data.contratacoes, K = S.ck, f = getF('contr');
  if (!f.per) f.per = 'todas';
  const rows = C.rows || [];
  const hoje = today0(), ws = weekStart(hoje);
  const PER = {
    sem: ['Esta semana', ws, new Date(ws.getTime() + 6 * 864e5)],
    prox: ['Próxima semana', new Date(ws.getTime() + 7 * 864e5), new Date(ws.getTime() + 13 * 864e5)],
    ant: ['Semana passada', new Date(ws.getTime() - 7 * 864e5), new Date(ws.getTime() - 864e5)],
    mes: ['Este mês', new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)],
    mesProx: ['Próximo mês', new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1), new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0)],
    mesAnt: ['Mês passado', new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 0)],
    fut: ['Próximas (a partir de hoje)', hoje, null],
    todas: ['Todas', null, null], custom: ['Período', null, null]
  };
  if (!PER[f.per] && !/^m:\d{4}-\d{2}$/.test(f.per)) f.per = 'todas';
  const MES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mesRange = k => { const [y, m] = k.split('-').map(Number); return [new Date(y, m - 1, 1), new Date(y, m, 0)]; };
  const range = () => f.per === 'custom' ? [parseISO(f.de), parseISO(f.ate)] : /^m:/.test(f.per) ? mesRange(f.per.slice(2)) : [PER[f.per][1], PER[f.per][2]];
  const ativos = rows.filter(r => !r._deslig);
  const v = $('#view');
  const cOk = ativos.filter(r => !r._falta).length;
  v.innerHTML = `
  ${!K.dp && isAdmin() ? `<div class="card ck-aviso">${ic('file')}<div><b>Ative o item “Admissão solicitada ao DP” no checklist</b><span>Na planilha, na aba de contratações, dê o título <b>SOLICITADO DP</b> à primeira coluna vazia depois de “${h(K.status || 'Status Alocação')}”, com os valores SIM ou NÃO. O sistema reconhece a coluna sozinho na próxima atualização.</span></div></div>` : ''}
  <div class="grid g5">
    ${kpi({ lbl: 'Admissões nesta semana', val: ativos.filter(r => r._data && r._data >= ws && r._data <= new Date(ws.getTime() + 6 * 864e5)).length, sub: `${ativos.filter(r => r._data && r._data >= new Date(ws.getTime() + 7 * 864e5) && r._data <= new Date(ws.getTime() + 13 * 864e5)).length} previstas para a próxima`, icon: 'calendar', c: 'c-cyan' })}
    ${kpi({ lbl: 'Pendentes de alocação', val: rows.filter(r => r._pend).length, sub: `${rows.filter(r => r._consta).length} constam como desligados`, icon: 'swap', c: 'c-amber' })}
    ${kpi({ lbl: 'ASO pendente', val: ativos.filter(r => K.aso && !/FEITO/.test(norm(r[K.aso]))).length, sub: 'Marcado ou aguardando', icon: 'file', c: 'c-red' })}
    ${K.dp ? kpi({ lbl: 'Admissão não solicitada ao DP', val: ativos.filter(r => !SIM(r[K.dp])).length, sub: 'Solicitar no sistema do DP', icon: 'userplus', c: 'c-amber' }) : ''}
    ${kpi({ lbl: 'Não exportado ao HCM', val: ativos.filter(r => K.hcm && !/SIM/.test(norm(r[K.hcm]))).length, icon: 'refresh', c: 'c-violet' })}
    ${kpi({ lbl: 'Checklist completo', val: `${cOk}<small> / ${ativos.length}</small>`, bar: ativos.length ? cOk / ativos.length * 100 : 0, sub: 'DP, ASO, HCM e quadro', icon: 'check', c: 'c-green' })}
  </div>
  <div class="card mt"><div class="card-h"><h3>Admissões por semana</h3><span class="sub">últimas 12 semanas + próximas 2</span></div><div class="chart-box sm"><canvas id="chWeek"></canvas></div></div>
  <div class="chips mt" id="perChips"></div>
  <div class="chips mes-chips" id="monChips"></div>
  <div class="chips ck-chips" id="ckChips"></div>
  <div class="toolbar">
    <div class="input-icon search">${ic('search')}<input class="input" id="cq" placeholder="Buscar colaborador ou função" value="${h(f.q || '')}" style="width:100%"></div>
    <input class="input" type="date" id="cDe" value="${h(f.de || '')}" title="De"><input class="input" type="date" id="cAte" value="${h(f.ate || '')}" title="Até">
    ${selectHTML('cLoja', 'Loja', S.data.lojas.map(l => l.key), f.loja, 'Todas')}
    ${K.status ? selectHTML('cSt', 'Status', uniq(rows.map(r => r[K.status])), f.st) : ''}
    ${K.aso ? selectHTML('cAso', 'ASO', uniq(rows.map(r => r[K.aso])), f.aso) : ''}
    <label class="chip ${f.desl ? 'on' : ''}" id="cDesl">Mostrar desligados</label>
    <label class="chip ${f.noq ? 'on' : ''}" id="cNoq" title="Pendentes cujo nome já aparece no quadro da loja">${ic('check')} Pendentes que já estão no quadro <span class="n">${rows.filter(r => r._pend && r._noQuadro).length}</span></label>
    <label class="chip ${f.cdes ? 'on' : ''}" id="cCdes" title="Pendentes que constam no histórico de desligados">${ic('door')} Pendentes que já saíram <span class="n">${rows.filter(r => r._consta).length}</span></label>
    <span class="spacer"></span>
    <div class="seg" id="cvw"><button data-v="sem">${ic('calendar')}<span class="desk-only">Por semana</span></button><button data-v="tbl">${ic('table')}<span class="desk-only">Tabela</span></button></div>
    <button class="btn" id="cExp" title="Exportar Excel / PDF">${ic('download')}</button>
    ${canEdit() && !isGestor() ? `<button class="btn" id="cCruz" title="Marca como alocado quem já está no quadro e como desligado quem já saiu">${ic('swap')} Cruzar com o quadro</button>` : ''}
    ${canContr() ? `<button class="btn primary" id="cNew">${ic('plus')} Nova contratação</button>` : ''}
  </div>
  <div id="cBulk" class="bulk hidden"></div>
  <div id="cBody"></div>`;
  const view = getV('contr', 'sem');
  $$('#cvw button').forEach(b => { b.classList.toggle('on', b.dataset.v === view); b.onclick = () => { setV('contr', b.dataset.v); route(); }; });
  // meses com admissões: os 6 últimos e todos os futuros, com a quantidade de cada um
  const mesKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const mesCont = {}; ativos.forEach(r => { if (r._data) { const k = mesKey(r._data); mesCont[k] = (mesCont[k] || 0) + 1; } });
  const mesAtual = mesKey(hoje);
  const mesesAll = Object.keys(mesCont).sort();
  const mesesVis = mesesAll.filter(k => k >= mesAtual).concat(mesesAll.filter(k => k < mesAtual).slice(-6)).sort();
  const drawPer = () => {
    $('#perChips').innerHTML = Object.entries(PER).filter(([k]) => k !== 'custom' || f.per === 'custom').map(([k, x]) => `<span class="chip ${f.per === k ? 'on' : ''}" data-k="${k}">${ic('calendar')} ${x[0]}${x[1] && x[2] ? ` <span class="n">${fmtD(x[1]).slice(0, 5)}–${fmtD(x[2]).slice(0, 5)}</span>` : ''}</span>`).join('');
    $('#monChips').innerHTML = mesesVis.length ? `<span class="ck-chips-t">Por mês</span>` + mesesVis.map(k => { const [y, m] = k.split('-').map(Number); return `<span class="chip ${f.per === 'm:' + k ? 'on' : ''} ${k > mesAtual ? 'fut' : ''}" data-k="m:${k}" title="${k > mesAtual ? 'Admissões previstas' : 'Admissões do mês'}">${MES_ABR[m - 1]}/${String(y).slice(2)}${k === mesAtual ? ' · atual' : ''} <span class="n">${mesCont[k]}</span></span>`; }).join('') : '';
    $$('#perChips .chip, #monChips .chip').forEach(c => c.onclick = () => { f.per = c.dataset.k; if (f.per !== 'custom') { f.de = ''; f.ate = ''; $('#cDe').value = ''; $('#cAte').value = ''; } saveF(); drawPer(); draw(); });
  };
  const ckMatch = r => !f.ck || (f.ck === 'ok' ? !r._deslig && !r._falta : !r._deslig && r._chk.some(s => s.k === f.ck && !s.ok));
  const drawCk = () => {
    const base = rows.filter(r => !r._deslig), steps = (base[0] || rows[0] || { _chk: [] })._chk;
    const lbl = { dp: 'Falta solicitar ao DP', aso: 'Falta ASO', hcm: 'Falta exportar ao HCM', aloc: 'Falta alocar' };
    $('#ckChips').innerHTML = `<span class="ck-chips-t">Checklist</span><span class="chip ${!f.ck ? 'on' : ''}" data-c="">Todas</span>` + steps.map(s => `<span class="chip ${f.ck === s.k ? 'on' : ''}" data-c="${s.k}">${lbl[s.k]} <span class="n">${base.filter(r => r._chk.some(x => x.k === s.k && !x.ok)).length}</span></span>`).join('') + `<span class="chip ${f.ck === 'ok' ? 'on' : ''}" data-c="ok">${ic('check')} Concluídas <span class="n">${base.filter(r => !r._falta).length}</span></span>`;
    $$('#ckChips .chip').forEach(c => c.onclick = () => { f.ck = c.dataset.c; saveF(); drawCk(); draw(); });
  };
  const filt = () => {
    const q = norm(f.q); const [a, b] = range();
    return rows.filter(r => (f.desl || !r._deslig) && (!f.noq || (r._pend && r._noQuadro)) && (!f.cdes || r._consta) && (!q || norm(r[K.colab] + ' ' + r[K.funcao]).includes(q)) && (!f.loja || r._loja === f.loja) && (!f.st || r[K.status] === f.st) && (!f.aso || r[K.aso] === f.aso) && (!a || (r._data && r._data >= a)) && (!b || (r._data && r._data <= b)) && ckMatch(r)).sort((x, y) => (y._data || 0) - (x._data || 0));
  };
  const badgeFor = val => { const n = norm(val); if (!n) return '<span class="faint">—</span>'; return `<span class="badge ${/FEITO|SIM|ALOCAD/.test(n) ? 'b-ok' : /DESLIG/.test(n) ? 'b-bad' : /MARCADO/.test(n) ? 'b-info' : /AGUARD|PEND|NAO/.test(n) ? 'b-warn' : ''}">${h(val)}</span>`; };
  selScope('contr');
  const sel = SEL.set;
  const drawBulk = () => {
    const b = $('#cBulk'); b.classList.toggle('hidden', !sel.size);
    if (!sel.size) { b.innerHTML = ''; return; }
    const lista = rows.filter(r => sel.has(r.row));
    b.innerHTML = `<b>${sel.size} selecionada(s)</b><button class="btn sm ghost" id="bkAll">Selecionar todas as ${filt().filter(r => canEdit(r._loja) && !r._deslig).length} filtradas</button><span class="spacer"></span><button class="btn sm" id="bkClr">Limpar</button><button class="btn sm primary" id="bkSet">${ic('edit')} O que fazer?</button><button class="btn sm ok" id="bkAloc">${ic('check')} Marcar como alocado</button><button class="btn sm danger" id="bkDesl">${ic('door')} Desligado(s)</button><button class="btn sm danger" id="bkExc">${ic('trash')} Excluir</button>`;
    $('#bkClr').onclick = () => { sel.clear(); draw(); };
    $('#bkAll').onclick = () => { filt().filter(r => canEdit(r._loja) && !r._deslig).forEach(r => sel.add(r.row)); draw(); };
    $('#bkDesl').onclick = () => openMarcarDesl(lista, () => sel.clear());
    $('#bkAloc').onclick = () => contrBulk(lista, K.status, ((C.opcoes || {})[K.status] || []).find(x => /ALOCAD/i.test(x)) || 'Alocado', () => sel.clear());
    $('#bkSet').onclick = () => openContrAcoes(lista, () => sel.clear());
    $('#bkExc').onclick = () => openExcluirContr(lista, () => sel.clear());
  };
  const cols = [
    { t: '', k: '', nosort: true, w: '30px', th: canEdit() ? '<input type="checkbox" class="cSelAll">' : '', r: r => canEdit(r._loja) && !r._deslig ? `<input type="checkbox" data-stop data-sel="${r.row}" ${sel.has(r.row) ? 'checked' : ''}>` : '' },
    { t: K.data || 'Data', k: K.data, sort: r => r._data ? +r._data : null },
    { t: 'Loja', k: '_loja', r: r => lojaPill(r._loja) },
    { t: 'Colaborador', k: K.colab, r: r => `<div class="cell-person">${avatar(r[K.colab], '', 'sm soft')}<div><b>${h(r[K.colab])}</b>${r._consta ? '<div><span class="badge b-bad">consta como desligado</span></div>' : r._pend && r._noQuadro ? '<div><span class="badge b-ok">já está no quadro</span></div>' : r._pend && r._data && daysTo(r._data) < -30 ? `<div><span class="badge b-warn">pendente há ${-daysTo(r._data)} dias</span></div>` : ''}</div></div>` },
    { t: 'Setor', k: K.setor }, { t: 'Função', k: K.funcao },
    { t: 'Contrato', k: K.contrato, r: r => qEdit(r, 'contrato', r[K.contrato] ? h(r[K.contrato]) : '<span class="faint">—</span>') },
    { t: 'Checklist', k: '_chkOk', sort: r => r._deslig ? -1 : r._chkOk, r: r => chkCell(r) },
    { t: '', k: '', nosort: true, r: r => r._pend && canEdit(r._loja) && lojaBy(r._loja) ? `<div style="display:flex;gap:6px" data-stop><button class="btn sm primary" data-aloc="${r.row}">${ic('swap')} Alocar</button><button class="btn sm" data-dsl="${r.row}" title="Já saiu da empresa">${ic('door')}</button></div>` : '' }
  ];
  // edição rápida: clicar no ASO / HCM / Contrato direto na lista, sem abrir a pessoa
  const qEdit = (r, f, inner) => canEdit(r._loja) && !r._deslig && K[f] ? `<span class="qedit" data-stop data-qe="${r.row}" data-qf="${f}" title="Clique para alterar">${inner}${ic('chevron', 'qcar')}</span>` : inner;
  const bindRows = el => {
    $$('[data-qe]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openQuickEdit(b, rows.find(x => x.row === +b.dataset.qe), b.dataset.qf); });
    $$('[data-ck]', el).forEach(b => b.onclick = e => { e.stopPropagation(); chkClick(b, rows.find(x => x.row === +b.dataset.ck), b.dataset.cf); });
    $$('[data-aloc]', el).forEach(b => b.onclick = () => openAlocar(rows.find(x => x.row === +b.dataset.aloc)));
    $$('[data-dsl]', el).forEach(b => b.onclick = () => openMarcarDesl([rows.find(x => x.row === +b.dataset.dsl)]));
    $$('[data-sel]', el).forEach(c => c.onchange = () => { c.checked ? sel.add(+c.dataset.sel) : sel.delete(+c.dataset.sel); drawBulk(); });
    $$('.cSelAll', el).forEach(c => { const ids = $$('[data-sel]', el).map(x => +x.dataset.sel); c.checked = ids.length && ids.every(i => sel.has(i)); c.onchange = () => { ids.forEach(i => c.checked ? sel.add(i) : sel.delete(i)); draw(); }; });
  };
  const draw = () => {
    const list = filt();
    const body = $('#cBody');
    if (view === 'tbl') { table(body, 'contr', cols, list, r => openContr(r)); bindRows(body); drawBulk(); return; }
    const groups = {};
    list.forEach(r => { const k = r._data ? isoD(weekStart(r._data)) : 'sem-data'; (groups[k] = groups[k] || []).push(r); });
    const keys = Object.keys(groups).sort().reverse();
    body.innerHTML = keys.length ? keys.map(k => { const g = groups[k]; const a = parseISO(k); const atual = a && +a === +ws; return `<div class="week ${atual ? 'cur' : ''}"><div class="week-h"><b>${a ? `Semana de ${fmtD(a)} a ${fmtD(new Date(a.getTime() + 6 * 864e5))}` : 'Sem data'}</b>${atual ? '<span class="badge b-acc">semana atual</span>' : ''}<span class="spacer"></span>${S.data.lojas.map(l => { const n = g.filter(r => r._loja === l.key).length; return n ? `${lojaPill(l.key)} <b style="margin-right:10px">${n}</b>` : ''; }).join('')}<span class="badge">${g.length} admissão(ões)</span>${(() => { const at = g.filter(r => !r._deslig), ok = at.filter(r => !r._falta).length; return at.length ? `<span class="badge ${ok === at.length ? 'b-ok' : ''}" title="Checklist completo">${ic('check')} ${ok}/${at.length}</span>` : ''; })()}${g.filter(r => r._pend).length ? `<span class="badge b-warn">${g.filter(r => r._pend).length} p/ alocar</span>` : ''}</div><div class="wk" data-k="${k}"></div></div>`; }).join('') : `<div class="card empty">${ic('calendar')}<div>Nenhuma contratação no período.</div></div>`;
    keys.forEach(k => { const el = $(`.wk[data-k="${k}"]`, body); table(el, 'contrW', cols, groups[k], r => openContr(r)); bindRows(el); });
    drawBulk();
  };
  const bind = (id, k) => { const el = $('#' + id); if (el) el.oninput = el.onchange = () => { f[k] = el.value; saveF(); draw(); }; };
  bind('cq', 'q'); bind('cLoja', 'loja'); bind('cSt', 'st'); bind('cAso', 'aso');
  ['cDe', 'cAte'].forEach(id => $('#' + id).onchange = () => { f.de = $('#cDe').value; f.ate = $('#cAte').value; f.per = (f.de || f.ate) ? 'custom' : 'todas'; saveF(); drawPer(); draw(); });
  $('#cDesl').onclick = () => { f.desl = !f.desl; saveF(); route(); };
  $('#cNoq').onclick = () => { f.noq = !f.noq; if (f.noq) f.cdes = false; saveF(); route(); };
  $('#cCdes').onclick = () => { f.cdes = !f.cdes; if (f.cdes) f.noq = false; saveF(); route(); };
  const HX = C.header.filter(k => !/^COL\d+$/.test(k));
  $('#cExp').onclick = () => exportCSV('contratacoes', HX, filt().map(r => HX.map(k => r[k])));
  if ($('#cNew')) $('#cNew').onclick = () => openContr(null);
  if ($('#cCruz')) $('#cCruz').onclick = e => openCruzar(e.currentTarget);
  drawPer(); drawCk(); draw();
  // gráfico semanal
  const weeks = []; for (let i = 11; i >= -2; i--) weeks.push(new Date(ws.getTime() - i * 7 * 864e5));
  chart($('#chWeek'), { type: 'bar', data: { labels: weeks.map(w => fmtD(w).slice(0, 5)), datasets: S.data.lojas.map(l => ({ label: l.nome, data: weeks.map(w => ativos.filter(r => r._loja === l.key && r._data && r._data >= w && r._data < new Date(w.getTime() + 7 * 864e5)).length), backgroundColor: l.color, borderRadius: 4, maxBarThickness: 26 })) }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 }, grid: { color: css('--border') } } } } });
}
function openMarcarDesl(list, done) {
  list = list.filter(Boolean);
  modal({
    title: 'Marcar como desligado', icon: 'door',
    body: `<p class="muted" style="margin-top:0">Use para quem foi contratado mas já saiu da empresa. O status na aba CONTRATAÇÕES passa a ser <b>Desligado</b> e a pessoa deixa de aparecer como pendente.</p>
      <div class="alist" style="max-height:200px;margin-bottom:12px">${list.map(r => `<div class="aitem">${avatar(r[S.ck.colab], '', 'sm soft')}<div><b>${h(r[S.ck.colab])}</b><span>${h(r[S.ck.funcao])} · ${h(LOJA_NOMES[r._loja] || r[S.ck.loja])} · ${h(r[S.ck.data])}</span></div></div>`).join('')}</div>
      <div class="row2"><div class="field"><label>Data do desligamento</label><input class="input" type="date" id="mdD" value="${isoD(new Date())}"></div><div class="field"><label>Tipo</label><select class="input" id="mdT">${TIPOS_DESL.map(t => `<option>${t}</option>`).join('')}</select></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn danger" id="mdOk">Confirmar</button>`,
    onMount: m => $('#mdOk', m.el).onclick = e => run(e.currentTarget, async () => {
      await api('marcarDesligadoContr', { rows: list.map(r => ({ row: r.row, nome: r[S.ck.colab] })), dataDesligamento: $('#mdD', m.el).value, tipo: $('#mdT', m.el).value });
      m.close(); toast('Registro(s) atualizado(s)'); if (done) done(); bgReload();
    })
  });
}
/* =====================================================================
 * ADMIN — ACESSOS E CONFIGURAÇÕES
 * ===================================================================== */
// lista de usuários guardada no aparelho: a aba Acessos abre na hora e atualiza em segundo plano
let usersMem = null;
const usersK_ = () => 'grc_users_' + (S.user ? S.user.id : '');
function usersCache_() { if (!usersMem || usersMem.k !== usersK_()) { const c = ls.get(usersK_(), null); usersMem = c ? { k: usersK_(), us: c } : null; } return usersMem ? usersMem.us : null; }
function usersSet_(us) { if (!Array.isArray(us)) return; usersMem = { k: usersK_(), us }; ls.set(usersK_(), us); }
async function usersBuscar_() { const us = (await api('listUsers', {}, { silent: true })).users || []; usersSet_(us); return us; }

async function pgAdmin() {
  setTitle('Acessos e configurações', 'Usuários, perfis, identidade visual, aprovações e notificações');
  if (window.__grcAdmTab) { setV('admTab', window.__grcAdmTab); window.__grcAdmTab = null; }
  const tab = getV('admTab', 'users');
  const v = $('#view');
  v.innerHTML = `<div class="seg" id="admTab" style="margin-bottom:16px;flex-wrap:wrap"><button data-v="users">${ic('users')} Usuários</button><button data-v="marca">${ic('image')} Logo e identidade</button><button data-v="sla">${ic('check')} Aprovações</button><button data-v="push">${ic('bell')} Notificações</button></div><div id="admBody"></div>`;
  $$('#admTab button').forEach(b => { b.classList.toggle('on', b.dataset.v === tab); b.onclick = () => { setV('admTab', b.dataset.v); route(); }; });
  const body = $('#admBody');
  if (tab === 'marca') return admMarca(body);
  if (tab === 'sla') return admSLA(body);
  if (tab === 'push') return admPush(body);
  body.innerHTML = `<div class="toolbar" style="margin-top:0"><div class="input-icon search">${ic('search')}<input class="input" id="uq" placeholder="Buscar usuário" style="width:100%"></div><span class="spacer"></span><button class="btn" id="uConv">${ic('link')} Link de convite</button><button class="btn primary" id="uNew">${ic('plus')} Novo acesso</button></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card"><b>${ic('shield')} Administrador</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Vê e edita tudo, aprova solicitações, cria acessos e configura o sistema.</p></div>
    <div class="card"><b>${ic('edit')} Editor (gestão)</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Movimenta quadro, vagas e contratações das lojas liberadas sem aprovação. Aumento/redução de quadro e novas posições passam por você. Não acessa Acessos, Configurações, Aprovações nem Histórico.</p></div>
    <div class="card"><b>${ic('briefcase')} Recrutador</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Pode editar, abrir, fechar e contratar, mas cada alteração aguarda sua aprovação.</p></div>
    <div class="card"><b>${ic('eye')} Gestor / Líder</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Consulta as lojas liberadas e requisita vagas para aprovação do RH.</p></div>
    <div class="card"><b>${ic('userplus')} Departamento Pessoal</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Visualiza o quadro das lojas liberadas (sem editar) e cadastra/edita contratações para fazer a admissão, com exportação em PDF e Excel.</p></div>
  </div>
  <div id="uBody"><div class="sk" style="height:200px"></div></div>`;
  let users = usersCache_() || [];
  const draw = () => {
    const q = norm($('#uq').value);
    table($('#uBody'), 'users', [
      { t: 'Usuário', k: 'nome', r: u => `<div class="cell-person">${avatar(u.nome, u.foto, 'sm')}<div><b>${h(u.nome)}</b><div class="muted" style="font-size:11.5px">${h(u.cargo || '')}</div></div></div>` },
      { t: 'Login', k: 'login', r: u => `<span class="mono">${h(u.login)}</span>${u.email ? `<div class="muted" style="font-size:11.5px">${h(u.email)}</div>` : ''}` },
      { t: 'Perfil', k: 'perfil', r: u => `<span class="badge ${u.perfil === 'ADMIN' ? 'b-violet' : u.perfil === 'EDITOR' ? 'b-info' : u.perfil === 'RECRUTADOR' ? 'b-acc' : u.perfil === 'DP' ? 'b-ok' : ''}">${h(PERFIS[u.perfil] || u.perfil)}</span>` },
      { t: 'Lojas', k: 'lojas', r: u => (u.lojas.length >= todasLojas().length ? '<span class="badge b-acc">Todas</span>' : u.lojas.map(lojaPill).join(' ')) + (u.setores && u.setores.length ? `<div class="muted" style="font-size:11.5px">Setores: ${h(u.setores.join(', '))}</div>` : '') },
      { t: 'Status', k: 'ativo', r: u => u.ativo ? (u.trocarSenha ? '<span class="badge b-warn">Aguardando 1º acesso</span>' : '<span class="badge b-ok">Ativo</span>') : '<span class="badge b-bad">Inativo</span>' },
      { t: 'Último acesso', k: 'ultimoAcesso' },
      { t: '', k: '', nosort: true, r: u => u.email && u.id !== S.user.id ? `<button class="btn sm" data-stop data-mail="${u.id}" title="Gerar nova senha e enviar por e-mail">${ic('mail')} Reenviar acesso</button>` : '' }
    ], users.filter(u => !q || norm(u.nome + ' ' + u.login + ' ' + u.email).includes(q)), u => openUser(u, us => { users = us; usersSet_(us); draw(); }));
    $$('[data-mail]').forEach(b => b.onclick = async () => { const u = users.find(x => x.id === b.dataset.mail); if (!await confirmBox(`Gerar uma nova senha provisória para <b>${h(u.nome)}</b> e enviar para <b>${h(u.email)}</b>?`, 'Enviar')) return; await run(b, () => api('reenviarAcesso', { id: u.id })); toast('Acesso reenviado por e-mail'); });
  };
  $('#uq').oninput = draw;
  $('#uNew').onclick = () => openUser(null, us => { users = us; usersSet_(us); draw(); });
  $('#uConv').onclick = () => openConvites();
  const rt = S.rt;
  if (users.length) draw();
  try {
    const us = await usersBuscar_(); if (rt !== S.rt || !$('#uBody')) return;
    if (JSON.stringify(us) !== JSON.stringify(users)) { users = us; if (!$('.overlay')) draw(); }
  } catch (e) { if (!users.length) toast(e.message, true); }
}
function openUser(u, done) {
  const L = todasLojas();
  modal({
    title: u ? 'Editar acesso' : 'Novo acesso', icon: 'shield', wide: true,
    body: `${u ? `<label class="photo-drop" id="uDrop" for="uFile" style="margin-bottom:16px"><span id="uAv">${avatar(u.nome, u.foto, 'lg')}</span><div><b>${ic('camera')} ${u.foto ? 'Trocar foto' : 'Colocar foto'}</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div>${u.foto ? '<button class="btn sm danger" id="uFRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="uFile" accept="image/*" hidden></label>` : ''}<div class="row2">
      <div class="field"><label>Nome completo</label><input class="input" id="uN" value="${h(u ? u.nome : '')}"></div>
      <div class="field"><label>Cargo</label><input class="input" id="uC" value="${h(u ? u.cargo : '')}" placeholder="Ex.: Gerente de loja"></div></div>
      <div class="row2">
      <div class="field"><label>E-mail</label><input class="input" id="uE" type="email" value="${h(u ? u.email : '')}" placeholder="nome@empresa.com.br"></div>
      <div class="field"><label>Login</label><input class="input mono" id="uL" value="${h(u ? u.login : '')}" placeholder="nome.sobrenome" autocomplete="off"></div></div>
      <div class="row2">
      <div class="field"><label>${u ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial (vazio = gerar automaticamente)'}</label><input class="input" id="uS" type="text" autocomplete="new-password" placeholder="mín. 6 caracteres"></div>
      <div class="field"><label>&nbsp;</label><label style="display:flex;gap:8px;align-items:center;font-weight:600;padding-top:8px"><input type="checkbox" id="uM" ${u ? '' : 'checked'}> ${ic('mail')} ${u ? 'Enviar a nova senha por e-mail' : 'Enviar login, senha e link do sistema por e-mail'}</label></div></div>
      <div class="field"><label>Perfil</label>${chipPicker('perfil', ['ADMIN', 'EDITOR', 'RECRUTADOR', 'LEITOR', 'DP'], u ? u.perfil : 'LEITOR', false)}</div>
      <div class="field"><label>Lojas liberadas</label>${chipPicker('lojas', L, u ? u.lojas.join(', ') : L.join(', '))}</div>
      <div class="field"><label>Setores que pode ver <span class="muted">(nenhum marcado = todos os setores)</span></label>${chipPicker('setores', uniq(S.data.lojas.flatMap(l => (l.setores || []).map(s => s.nome))).sort(), u && u.setores ? u.setores.join(', ') : '')}</div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="uA" ${!u || u.ativo ? 'checked' : ''}> Acesso ativo</label>
      <p class="muted" style="font-size:12px">No primeiro login o usuário define a própria senha.</p>`,
    foot: `${u && u.id !== S.user.id ? `<button class="btn danger" id="uDel" style="margin-right:auto">${ic('trash')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="uOk">Salvar</button>`,
    onMount: m => {
      bindPickers(m.el);
      if (u) bindFotoUsuario(m.el, u, done);
      $$('[data-picker=lojas] .chip', m.el).forEach(c => c.textContent = LOJA_NOMES[c.dataset.v] || c.dataset.v);
      $$('[data-picker=perfil] .chip', m.el).forEach(c => c.textContent = PERFIS[c.dataset.v]);
      $('#uE', m.el).addEventListener('input', () => { const l = $('#uL', m.el); if (!u && !l.dataset.touched) l.value = $('#uE', m.el).value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, ''); });
      $('#uL', m.el).addEventListener('input', e => e.target.dataset.touched = 1);
      $('#uOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const lojas = splitMulti(pickVal(m.el, 'lojas'));
        if (!lojas.length) throw new Error('Selecione ao menos uma loja');
        const mail = $('#uM', m.el).checked;
        if (mail && !$('#uE', m.el).value.trim()) throw new Error('Informe o e-mail para enviar o acesso');
        if (u && mail && !$('#uS', m.el).value) throw new Error('Digite a nova senha que será enviada (ou use "Reenviar acesso")');
        const j = await api('saveUser', { data: { id: u ? u.id : '', nome: $('#uN', m.el).value, cargo: $('#uC', m.el).value, email: $('#uE', m.el).value, login: $('#uL', m.el).value, senha: $('#uS', m.el).value, enviarEmail: mail, perfil: pickVal(m.el, 'perfil') || 'LEITOR', lojas, setores: splitMulti(pickVal(m.el, 'setores')), ativo: $('#uA', m.el).checked } });
        m.close(); done(j.users);
        if (j.emailEnviado) toast('Acesso salvo e e-mail enviado para ' + $('#uE', m.el).value);
        else if (j.senhaGerada) modal({ title: 'Acesso criado', icon: 'key', body: `<p>Envie estes dados para o usuário:</p><div class="card" style="background:var(--surface2)"><div>Endereço: <b>${h(cfgv('siteUrl', location.origin))}</b></div><div>Login: <b class="mono">${h($('#uL', m.el).value.toLowerCase())}</b></div><div>Senha provisória: <b class="mono">${h(j.senhaGerada)}</b></div></div>`, foot: '<button class="btn primary" data-close>Ok</button>' });
        else toast(u ? 'Acesso atualizado' : 'Acesso criado');
      });
      const del = $('#uDel', m.el);
      if (del) del.onclick = async () => { if (!await confirmBox(`Excluir o acesso de <b>${h(u.nome)}</b>?`, 'Excluir', true)) return; const j = await api('deleteUser', { id: u.id }); m.close(); toast('Acesso excluído'); done(j.users); };
    }
  });
}
function admMarca(body) {
  const c = S.cfg || {};
  let logo = c.logo || '';
  body.innerHTML = `<div class="grid g2">
    <div class="card"><div class="card-h"><h3>${ic('image')} Logo da empresa</h3></div>
      <div class="logo-drop" id="lgDrop"><div class="logo-prev" id="lgPrev">${logo ? `<img src="${h(logo)}">` : '<div class="brand-logo" style="width:64px;height:64px;font-size:20px;border-radius:18px">GRC</div>'}</div>
      <div><b>${ic('camera')} Enviar logo</b><div class="muted" style="font-size:12.5px;margin-top:4px">PNG com fundo transparente fica melhor. A imagem é otimizada automaticamente e aparece no menu, na tela de login, no ícone do app e nos e-mails.</div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" id="lgPick" type="button">Escolher arquivo</button>${logo ? '<button class="btn sm danger" id="lgRm" type="button">Remover</button>' : ''}</div></div>
      <input type="file" id="lgFile" accept="image/*" hidden></div>
      <div class="grid g2 mt"><div class="logo-test dark">${logo ? `<img src="${h(logo)}">` : ''}<span>Fundo escuro</span></div><div class="logo-test light">${logo ? `<img src="${h(logo)}">` : ''}<span>Fundo claro</span></div></div>
    </div>
    <div class="card"><div class="card-h"><h3>Identidade</h3></div>
      <div class="field"><label>Nome da empresa</label><input class="input" id="cfE" value="${h(c.empresa || '')}"></div>
      <div class="field"><label>Nome do sistema</label><input class="input" id="cfS" value="${h(c.sistema || '')}"></div>
      <div class="field"><label>Endereço do sistema (vai nos e-mails de acesso)</label><input class="input" id="cfU" value="${h(c.siteUrl || location.origin)}"></div>
      <button class="btn primary" id="cfOk">Salvar identidade</button>
    </div></div>`;
  const pick = () => $('#lgFile').click();
  $('#lgPick').onclick = pick; $('#lgPrev').onclick = pick;
  $('#lgFile').onchange = async () => {
    const f = $('#lgFile').files[0]; if (!f) return;
    try { const data = await resizeLogo(f); const j = await run(null, () => api('saveConfig', { data: { logo: data } })); S.cfg = j.cfg; ls.set('grc_cfg', { logo: j.cfg.logo, empresa: j.cfg.empresa, sistema: j.cfg.sistema, siteUrl: j.cfg.siteUrl }); applyFavicon(); updateShell(); route(); toast('Logo atualizada'); } catch (e) {}
  };
  const lgDrop = $('#lgDrop');
  lgDrop.ondragover = e => { e.preventDefault(); lgDrop.style.borderColor = 'var(--accent)'; };
  lgDrop.ondragleave = () => lgDrop.style.borderColor = '';
  lgDrop.ondrop = e => { e.preventDefault(); const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); $('#lgFile').files = dt.files; $('#lgFile').onchange(); };
  if ($('#lgRm')) $('#lgRm').onclick = async () => { const j = await run(null, () => api('saveConfig', { data: { logo: '' } })); S.cfg = j.cfg; ls.set('grc_cfg', { logo: '', empresa: j.cfg.empresa, sistema: j.cfg.sistema }); updateShell(); route(); };
  $('#cfOk').onclick = e => run(e.currentTarget, async () => { const j = await api('saveConfig', { data: { empresa: $('#cfE').value, sistema: $('#cfS').value, siteUrl: $('#cfU').value } }); S.cfg = j.cfg; updateShell(); toast('Identidade salva'); });
}
function resizeLogo(file) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 640, maxH = 240;
        const sc = Math.min(1, maxW / img.width, maxH / img.height);
        const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/png');
        if (out.length > 300000) out = c.toDataURL('image/webp', .9);
        if (out.length > 300000) out = c.toDataURL('image/jpeg', .85);
        res(out);
      };
      img.onerror = () => rej(new Error('Imagem inválida'));
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
function admSLA(body) {
  const c = S.cfg || {};
  let exc = (c.slaExcecoes || []).slice();
  body.innerHTML = `<div class="grid g2">
    <div class="card" style="display:none"><div class="card-h"><h3>${ic('gauge')} Metas de SLA</h3><span class="sub">dias para fechar a vaga</span></div>
      <div class="field" style="max-width:220px"><label>Meta padrão (dias)</label><input class="input" type="number" min="1" id="slP" value="${c.slaPadrao || 20}"></div>
      <label class="muted" style="font-size:12px;font-weight:600">Exceções por função</label>
      <div id="slEx" class="mt" style="display:flex;flex-direction:column;gap:8px"></div>
      <button class="btn sm mt" id="slAdd">${ic('plus')} Adicionar exceção</button>
      <datalist id="dlSlF">${allFuncoes().map(x => `<option value="${h(x)}">`).join('')}</datalist>
    </div>
    <div class="card"><div class="card-h"><h3>${ic('check')} Regras de aprovação</h3></div>
      <p class="muted" style="font-size:13px;margin-top:0">Recrutadores sempre precisam de aprovação para editar o quadro, abrir ou fechar vagas, desligar e registrar contratações. Gestores e líderes requisitam vagas para sua aprovação.</p>
      <label style="display:flex;gap:10px;align-items:flex-start;font-weight:600"><input type="checkbox" id="slEt" ${c.aprovarEtapas ? 'checked' : ''} style="margin-top:3px"><span>Também exigir aprovação quando o recrutador mover a vaga entre as etapas do funil<div class="muted" style="font-weight:400;font-size:12px">Desmarcado: o recrutador atualiza etapas e candidatos livremente (recomendado).</div></span></label>
    </div></div>
    <button class="btn primary mt" id="slOk">Salvar</button>`;
  const draw = () => {
    $('#slEx').innerHTML = exc.map((x, i) => `<div style="display:flex;gap:8px"><input class="input" list="dlSlF" data-i="${i}" data-f="funcao" value="${h(x.funcao)}" placeholder="Função"><input class="input" type="number" min="1" data-i="${i}" data-f="dias" value="${x.dias}" style="width:100px"><button class="btn icon ghost" data-del="${i}">${ic('trash')}</button></div>`).join('') || '<div class="faint" style="font-size:12.5px">Nenhuma exceção.</div>';
    $$('#slEx input').forEach(inp => inp.oninput = () => { exc[+inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'dias' ? +inp.value : inp.value.toUpperCase(); });
    $$('#slEx [data-del]').forEach(b => b.onclick = () => { exc.splice(+b.dataset.del, 1); draw(); });
  };
  $('#slAdd').onclick = () => { exc.push({ funcao: '', dias: 30 }); draw(); };
  $('#slOk').onclick = e => run(e.currentTarget, async () => { const j = await api('saveConfig', { data: { aprovarEtapas: $('#slEt').checked } }); S.cfg = j.cfg; derive(); updateShell(); toast('Configurações salvas'); });
  draw();
}
function admPush(body) {
  const c = S.cfg || {};
  body.innerHTML = `<div class="grid g2">
    <div class="card"><div class="card-h"><h3>${ic('bell')} Neste aparelho</h3></div>
      <p class="muted" style="font-size:13px;margin-top:0">Instale o sistema como aplicativo e permita notificações para receber os alertas.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="psAsk">${ic('bell')} Ativar notificações</button><button class="btn" id="psInst">${ic('download')} Instalar app</button><button class="btn" id="psTest">Testar</button></div>
      <div class="muted mt" style="font-size:12.5px;line-height:1.6"><b>Android (Chrome):</b> menu ⋮ → <i>Instalar app</i>.<br><b>iPhone (Safari):</b> compartilhar → <i>Adicionar à Tela de Início</i>, abra pelo ícone e toque em <i>Ativar notificações</i> (iOS 16.4 ou superior).</div>
    </div>
    <div class="card"><div class="card-h"><h3>${ic('mail')} E-mail</h3></div>
      <label style="display:flex;gap:10px;align-items:flex-start;font-weight:600"><input type="checkbox" id="psMail" ${c.emailAprovacoes !== false ? 'checked' : ''} style="margin-top:3px"><span>Enviar e-mail para aprovações, requisições e decisões<div class="muted" style="font-weight:400;font-size:12px">Os administradores recebem as requisições; quem solicitou recebe a decisão. Funciona como push no celular pelo app de e-mail.</div></span></label>
    </div>
    <div class="card" style="grid-column:1/-1"><div class="card-h"><h3>Push com o app fechado (OneSignal)</h3><span class="badge ${c.onesignalAppId && c.onesignalKeySet ? 'b-ok' : 'b-warn'}">${c.onesignalAppId && c.onesignalKeySet ? 'Conectado' : 'Não configurado'}</span></div>
      <p class="muted" style="font-size:13px;margin-top:0">Para o celular receber notificações mesmo com o app fechado, é preciso um serviço de push. O OneSignal é gratuito: crie uma conta em onesignal.com, adicione um app <b>Web</b> com o endereço <b>${h(c.siteUrl || location.origin)}</b> e cole abaixo o <i>App ID</i> e a <i>REST API Key</i>.</p>
      <div class="row2"><div class="field"><label>OneSignal App ID</label><input class="input mono" id="psId" value="${h(c.onesignalAppId || '')}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></div>
      <div class="field"><label>REST API Key ${c.onesignalKeySet ? '(já salva — preencha só para trocar)' : ''}</label><input class="input mono" id="psKey" type="password" placeholder="os_v2_app_..."></div></div>
      <label style="display:flex;gap:10px;align-items:center;font-weight:600"><input type="checkbox" id="psQ" ${c.pushQuadro !== false ? 'checked' : ''}> Enviar push também quando alguém alterar o quadro (além de aprovações e decisões)</label>
    </div></div>
    <button class="btn primary mt" id="psOk">Salvar</button>`;
  $('#psAsk').onclick = askNotifPermission;
  $('#psTest').onclick = () => Notification && Notification.permission === 'granted' ? localNotify('Teste de notificação', 'Tudo certo! Os alertas vão aparecer assim.') : toast('Ative as notificações primeiro', true);
  $('#psInst').onclick = installApp;
  $('#psOk').onclick = e => run(e.currentTarget, async () => { const d = { emailAprovacoes: $('#psMail').checked, onesignalAppId: $('#psId').value, pushQuadro: $('#psQ').checked }; if ($('#psKey').value) d.onesignalKey = $('#psKey').value; const j = await api('saveConfig', { data: d }); S.cfg = j.cfg; toast('Notificações configuradas'); route(); initOneSignal(); });
}

/* =====================================================================
 * PWA — app instalável + OneSignal
 * ===================================================================== */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const b = $('#mbInstall'); if (b) b.classList.remove('hidden'); });
async function installApp() {
  if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; return; }
  if (window.matchMedia('(display-mode: standalone)').matches) return toast('O app já está instalado neste aparelho');
  modal({ title: 'Instalar o app', icon: 'download', body: `<p style="margin-top:0"><b>Android (Chrome):</b> toque no menu ⋮ e escolha <i>Instalar app</i> ou <i>Adicionar à tela inicial</i>.</p><p><b>iPhone (Safari):</b> toque em compartilhar ⬆️ e depois em <i>Adicionar à Tela de Início</i>.</p><p class="muted">Depois abra pelo ícone e ative as notificações no sino.</p>`, foot: '<button class="btn primary" data-close>Entendi</button>' });
}
function registerSW() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('OneSignalSDKWorker.js').catch(() => {});
}
let osLoaded = false;
function initOneSignal() {
  const id = S.cfg && S.cfg.onesignalAppId;
  if (!id || !S.user || DEMO) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  if (!osLoaded) { const sc = document.createElement('script'); sc.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; sc.defer = true; document.head.appendChild(sc); osLoaded = true; }
  window.OneSignalDeferred.push(async function (OneSignal) {
    if (initOneSignal.done === id) { try { await OneSignal.login(S.user.id); } catch (e) {} return; }
    initOneSignal.done = id;
    try { await OneSignal.init({ appId: id, serviceWorkerPath: 'OneSignalSDKWorker.js', allowLocalhostAsSecureOrigin: true, notifyButton: { enable: false } }); await OneSignal.login(S.user.id); window.OneSignal = OneSignal; } catch (e) { console.warn(e); }
  });
}

/* =====================================================================
 * v3 — SELEÇÃO EM MASSA
 * ===================================================================== */
const SEL = { set: new Set(), scope: '', on: {} };
const selKey = r => r.loja + '|' + r.row;
function selScope(sc) { if (SEL.scope !== sc) { SEL.set.clear(); SEL.scope = sc; } }
function selRows() { return [...SEL.set].map(k => { const [lk, row] = String(k).split('|'); const l = lojaBy(lk); return l && l.rows.find(r => r.row === +row); }).filter(Boolean); }
function quadroBulk(el, redraw) {
  if (!el) return;
  const rs = selRows();
  el.classList.toggle('hidden', !rs.length);
  if (!rs.length) { el.innerHTML = ''; return; }
  const ocup = rs.filter(r => r.nome), vagas = rs.filter(r => r.isVaga);
  el.innerHTML = `<b>${rs.length} selecionada(s)</b><span class="faint" style="font-size:12px">${ocup.length} ocupada(s) · ${vagas.length} vaga(s)</span><span class="spacer"></span>
    <button class="btn sm" id="qbClr">Limpar</button>
    ${vagas.length ? `<button class="btn sm" id="qbEt">${ic('kanban')} Etapa / responsável</button>` : ''}
    ${ocup.length && ocup.every(r => lojaTreino(r.loja)) ? `<button class="btn sm" id="qbTr">${ic('grad')} ${ocup.every(r => r.treino) ? 'Tirar de treinamento' : 'Marcar em treinamento'}</button>` : ''}
    ${ocup.length ? `<button class="btn sm danger" id="qbDesl">${ic('door')} Desligar ${ocup.length}</button>` : ''}`;
  $('#qbClr', el).onclick = () => { SEL.set.clear(); redraw(); };
  if ($('#qbDesl', el)) $('#qbDesl', el).onclick = () => openDesligarLote(ocup);
  if ($('#qbTr', el)) $('#qbTr', el).onclick = e => treinoLote(ocup, e.currentTarget, redraw);
  if ($('#qbEt', el)) $('#qbEt', el).onclick = () => openVagaLote(vagas);
}
// marca / desmarca a tag EM TREINAMENTO em várias posições (Eusébio e Super Fraldas)
async function treinoLote(rs, btn, redraw) {
  const tirar = rs.every(r => r.treino);
  if (!await confirmBox(`${tirar ? 'Tirar' : 'Marcar'} <b>${rs.length}</b> colaborador(es) ${tirar ? 'de' : 'como'} <b>em treinamento</b>?`, tirar ? 'Tirar' : 'Marcar')) return;
  await run(btn, async () => {
    for (const r of rs) {
      const tags = splitMulti(r.tag).filter(t => !/TREINAMENTO/.test(norm(t)));
      if (!tirar) tags.push(TREINO_TAG);
      await api('saveRow', { loja: r.loja, row: r.row, expect: expectOf(r), data: { nome: r.nome, funcao: r.funcao, contrato: r.contrato, situacao: r.situacao, tag: tags.join(', '), qt: r.qt } }, { silent: true });
    }
    SEL.set.clear(); toast(`${rs.length} colaborador(es) ${tirar ? 'retirado(s) de' : 'marcado(s) como em'} treinamento`); redraw();
  }).catch(() => {});
}
function loteResult(j, okMsg) {
  if (j.pendente) return;
  if (j.erros && j.erros.length) modal({ title: 'Concluído com avisos', icon: 'alert', body: `<p>${j.total} registro(s) atualizado(s). Não foi possível concluir:</p><ul style="font-size:13px;line-height:1.6">${j.erros.map(e => `<li>${h(e)}</li>`).join('')}</ul><p class="muted">Atualize a página e tente novamente esses itens.</p>`, foot: '<button class="btn primary" data-close>Ok</button>' });
  else toast(okMsg.replace('{n}', j.total));
}
function openDesligarLote(rs) {
  modal({
    title: `Desligar ${rs.length} colaborador(es)`, icon: 'door', wide: true,
    body: `<div class="alist" style="max-height:220px;margin-bottom:14px">${rs.map(r => `<div class="aitem">${avatar(r.nome, '', 'sm soft')}<div><b>${h(r.nome)}</b><span>${h(r.funcao)} · ${h(r.setor)} · ${h(LOJA_NOMES[r.loja])}</span></div></div>`).join('')}</div>
      <div class="row3"><div class="field"><label>Data do desligamento</label><input class="input" type="date" id="dlD" value="${isoD(new Date())}"></div>
      <div class="field"><label>Tipo</label><select class="input" id="dlT">${TIPOS_DESL.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Responsável pela seleção</label><input class="input" id="dlR" value="${h(S.user.nome)}"></div></div>
      <div class="badge b-warn" style="white-space:normal;padding:10px 12px;line-height:1.5;display:block">Os nomes saem do quadro, as posições viram <b>VAGA</b> e os colaboradores deixam de aparecer em contratações pendentes e experiências.</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn danger" id="dlOk">${ic('door')} Desligar ${rs.length}</button>`,
    onMount: m => $('#dlOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const j = await api('desligarLote', { itens: rs.map(r => ({ loja: r.loja, row: r.row, expect: expectOf(r), setor: r.setor, label: r.nome })), dataDesligamento: $('#dlD', m.el).value, tipo: $('#dlT', m.el).value, responsavel: $('#dlR', m.el).value });
      m.close(); SEL.set.clear(); loteResult(j, '{n} colaborador(es) desligado(s) e vagas abertas'); bgReload();
    })
  });
}
function openVagaLote(rs) {
  modal({
    title: `Atualizar ${rs.length} vaga(s)`, icon: 'kanban',
    body: `<div class="field"><label>Etapa</label>${chipPicker('etapa', ['', ...ETAPAS()].filter(Boolean), '', false)}<div class="faint" style="font-size:12px;margin-top:4px">Deixe sem marcar para não alterar.</div></div>
      <div class="field"><label>Responsável (opcional)</label><input class="input" id="vlR" placeholder="Não alterar"></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="vlOk">Aplicar</button>`,
    onMount: m => {
      bindPickers(m.el);
      $('#vlOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const data = {}; const et = pickVal(m.el, 'etapa'); if (et) data.etapa = et; const rp = $('#vlR', m.el).value.trim(); if (rp) data.responsavel = rp;
        if (!Object.keys(data).length) throw new Error('Escolha uma etapa ou responsável');
        const j = await api('setVagaInfoLote', { itens: rs.map(r => ({ loja: r.loja, row: r.row, expect: expectOf(r), setor: r.setor, label: r.funcao })), data });
        m.close(); SEL.set.clear(); loteResult(j, '{n} vaga(s) atualizada(s)'); bgReload();
      });
    }
  });
}
function quickEditOpts(f) {
  const C = S.data.contratacoes, K = S.ck, k = K[f], op = C.opcoes || {};
  const def = f === 'aso' ? ['FEITO', 'MARCADO', 'AGUARDANDO'] : f === 'hcm' || f === 'dp' ? ['SIM', 'NÃO'] : f === 'contrato' ? ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO'] : [];
  const seen = new Set(), out = [];
  [...(op[k] || []), ...def, ...(C.rows || []).map(r => r[k])].forEach(v => { v = String(v || '').trim(); const n = norm(v); if (v && !seen.has(n)) { seen.add(n); out.push(v); } });
  return out;
}
function openQuickEdit(anchor, r, f) {
  const old = $('.qmenu'); if (old) { const same = old._a === anchor; old._close(); if (same) return; }
  if (!r) return;
  const K = S.ck, k = K[f], atual = norm(r[k]);
  const m = document.createElement('div'); m.className = 'qmenu'; m._a = anchor;
  m.innerHTML = `<div class="qmenu-h">${h(k)}</div>` + quickEditOpts(f).map(o => `<button data-v="${h(o)}" class="${norm(o) === atual ? 'on' : ''}">${h(o)}</button>`).join('');
  document.body.appendChild(m);
  const rc = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(rc.left, innerWidth - mw - 8)) + 'px';
  m.style.top = (rc.bottom + 6 + mh > innerHeight ? Math.max(8, rc.top - mh - 6) : rc.bottom + 6) + 'px';
  const off = e => { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const close = () => { m.remove(); document.removeEventListener('mousedown', off, true); document.removeEventListener('keydown', esc, true); removeEventListener('scroll', close, true); removeEventListener('resize', close); };
  m._close = close;
  setTimeout(() => { document.addEventListener('mousedown', off, true); document.addEventListener('keydown', esc, true); addEventListener('scroll', close, true); addEventListener('resize', close); });
  $$('button', m).forEach(b => b.onclick = async () => {
    const v = b.dataset.v; close();
    if (norm(v) === atual) return;
    const j = await contrSet(r, k, v).catch(() => null);
    if (j && !j.pendente) toast(`${k} de ${String(r[K.colab] || '').split(' ')[0]} alterado para ${v}`);
  });
}
async function contrBulk(lista, campo, valor, done) {
  if (!await confirmBox(`Alterar <b>${h(campo)}</b> para <b>${h(valor)}</b> em ${lista.length} contratação(ões)?`, 'Aplicar')) return;
  await run(null, async () => {
    const j = await api('contrBulkSet', { rows: lista.map(r => ({ row: r.row, nome: r[S.ck.colab] })), campo, valor });
    if (done) done(); if (!j.pendente) toast(`${j.total} contratação(ões) atualizada(s)`); bgReload();
  });
}
// menu de ações em lote: mostra o que dá para fazer com as selecionadas e quantas cada ação muda
function openContrAcoes(lista, done) {
  const C = S.data.contratacoes, K = S.ck, op = C.opcoes || {};
  const at = lista.filter(r => !r._deslig);
  const asoFeito = (op[K.aso] || []).find(x => /FEITO/i.test(x)) || 'FEITO';
  const alocado = (op[K.status] || []).find(x => /ALOCAD/i.test(x)) || 'Alocado';
  const faltaDp = K.dp ? at.filter(r => !SIM(r[K.dp])) : [];
  const faltaAso = K.aso ? at.filter(r => !/FEITO/.test(norm(r[K.aso]))) : [];
  const faltaHcm = K.hcm ? at.filter(r => !/SIM/.test(norm(r[K.hcm]))) : [];
  const faltaAloc = K.status ? at.filter(r => !/ALOCAD/.test(norm(r[K.status]))) : [];
  const docs = [K.dp && [K.dp, 'SIM', faltaDp], K.aso && [K.aso, asoFeito, faltaAso], K.hcm && [K.hcm, 'SIM', faltaHcm]].filter(x => x && x[2].length);
  const nDocs = new Set(docs.flatMap(d => d[2].map(r => r.row))).size;
  const acoes = [
    { id: 'tudo', ic: 'check', t: 'Concluir checklist (DP, ASO e HCM)', d: 'Para quem já foi admitido e está com pendência antiga no sistema', n: nDocs, cls: 'ok', go: () => contrBulkMulti(docs, 'Concluir o checklist (DP, ASO e HCM)', done) },
    K.dp && { id: 'dp', ic: 'userplus', t: 'Marcar admissão solicitada ao DP', d: `${h(K.dp)} → SIM`, n: faltaDp.length, go: () => contrBulkMulti([[K.dp, 'SIM', faltaDp]], 'Marcar admissão solicitada ao DP', done) },
    K.aso && { id: 'aso', ic: 'file', t: 'Marcar ASO como feito', d: `${h(K.aso)} → ${h(asoFeito)}`, n: faltaAso.length, go: () => contrBulkMulti([[K.aso, asoFeito, faltaAso]], 'Marcar ASO como feito', done) },
    K.hcm && { id: 'hcm', ic: 'refresh', t: 'Marcar como exportado ao HCM', d: `${h(K.hcm)} → SIM`, n: faltaHcm.length, go: () => contrBulkMulti([[K.hcm, 'SIM', faltaHcm]], 'Marcar como exportado ao HCM', done) },
    K.status && { id: 'aloc', ic: 'swap', t: 'Marcar como alocado', d: 'Só muda o status; não mexe no quadro da loja', n: faltaAloc.length, go: () => contrBulkMulti([[K.status, alocado, faltaAloc]], 'Marcar como alocado', done) },
    { id: 'desl', ic: 'door', t: 'Marcar como desligado(s)', d: 'Contratados que já saíram da empresa', n: at.length, cls: 'bad', go: () => openMarcarDesl(at, done) },
    K.status && { id: 'exc', ic: 'trash', t: 'Excluir contratação(ões)', d: 'Desistiu na contratação: some do sistema e sai do quadro, sem virar desligamento', n: lista.length, cls: 'bad', go: () => openExcluirContr(lista, done) },
    { id: 'outro', ic: 'edit', t: 'Alterar outro campo…', d: 'Escolher o campo e o valor manualmente', n: null, go: () => openContrBulkSet(lista, done) }
  ].filter(Boolean);
  modal({
    title: `O que fazer com ${lista.length} contratação(ões)?`, icon: 'edit',
    body: `<p class="muted" style="margin-top:0">O número mostra quantas das selecionadas ainda precisam daquela ação. Quem já está certo não é alterado.</p><div class="acoes-lote">${acoes.map(a => `<button class="acao ${a.cls || ''}" data-a="${a.id}" ${a.n === 0 ? 'disabled' : ''}><span class="ai">${ic(a.ic)}</span><span class="tx"><b>${a.t}</b><small>${a.d}</small></span>${a.n != null ? `<span class="badge ${a.n ? '' : 'b-ok'}">${a.n ? a.n : 'nada a fazer'}</span>` : ic('chevron')}</button>`).join('')}</div>`,
    foot: `<button class="btn" data-close>Fechar</button>`,
    onMount: m => $$('[data-a]', m.el).forEach(b => b.onclick = () => { const a = acoes.find(x => x.id === b.dataset.a); m.close(); a.go(); })
  });
}
// excluir contratação (desistência): marca como "Excluído" na planilha (some do sistema, não vira desligamento)
// e, se a pessoa já estava no quadro da loja, a posição volta a ficar vaga
function openExcluirContr(lista, done) {
  const K = S.ck; lista = lista.filter(Boolean);
  if (!K.status) return toast('A planilha de contratações não tem a coluna de status', true);
  const noQuadro = r => { const l = lojaBy(r._loja); if (!l || !r[K.colab]) return []; const n = norm(r[K.colab]); const out = []; l.setores.forEach(s => s.linhas.forEach(x => { if (x.nome && norm(x.nome) === n) out.push(Object.assign({}, x, { loja: l.key, setor: s.nome })); })); return out; };
  const itens = lista.map(r => ({ r, pos: noQuadro(r) }));
  const nPos = itens.reduce((a, i) => a + i.pos.length, 0);
  modal({
    title: `Excluir ${lista.length} contratação(ões)`, icon: 'trash',
    body: `<p class="muted" style="margin-top:0">Use quando a pessoa <b>desistiu na contratação</b>. Ela some do sistema e <b>não entra nos desligamentos</b>. Na planilha, a linha fica com o status <b>Excluído</b>, só como registro.</p>
      <div class="alist" style="max-height:240px;margin-bottom:12px">${itens.map(({ r, pos }) => `<div class="aitem">${avatar(r[K.colab], '', 'sm soft')}<div><b>${h(r[K.colab])}</b><span>${h(r[K.funcao] || '')} · ${h(LOJA_NOMES[r._loja] || r[K.loja] || '')} · ${h(r[K.data] || '')}</span>${pos.length ? `<span style="display:block;color:var(--warn);margin-top:2px">${ic('alert')} Está no quadro: ${pos.map(p => h(p.setor + ' · ' + p.funcao)).join(', ')}</span>` : ''}</div></div>`).join('')}</div>
      ${nPos ? `<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="exQ" checked> Tirar do quadro também (${nPos} posição(ões) voltam a ficar vagas)</label>` : ''}`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn danger" id="exOk">${ic('trash')} Excluir</button>`,
    onMount: m => $('#exOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const tirar = nPos && $('#exQ', m.el).checked;
      const j = await api('contrBulkSet', { rows: lista.map(r => ({ row: r.row, nome: r[K.colab] })), campo: K.status, valor: 'Excluído' });
      let nq = 0;
      if (tirar) for (const { pos } of itens) for (const p of pos) {
        try { await api('saveRow', { loja: p.loja, row: p.row, expect: expectOf(p), data: { nome: '', funcao: p.funcao, contrato: p.contrato, situacao: 'VAGA', tag: '', qt: '' } }); nq++; } catch (er) { toast(`Não foi possível tirar ${p.nome} do quadro: ${er.message}`, true); }
      }
      // some da tela na hora
      if (!j.pendente) { lista.forEach(r => { r[K.status] = 'Excluído'; }); derive(); updateShell(); route(true); }
      m.close(); if (done) done();
      if (!j.pendente) toast(`${lista.length} contratação(ões) excluída(s)${nq ? ` · ${nq} posição(ões) do quadro liberada(s)` : ''}`);
      bgReload();
    })
  });
}
// aplica uma ou mais alterações em lote, só nas linhas que precisam
async function contrBulkMulti(passos, titulo, done) {
  passos = passos.filter(p => p && p[2] && p[2].length);
  if (!passos.length) return toast('Nada a alterar nas selecionadas');
  const tot = new Set(passos.flatMap(p => p[2].map(r => r.row))).size;
  if (!await confirmBox(`<b>${h(titulo)}</b> em ${tot} contratação(ões)?<br><span class="muted">${passos.map(p => `${h(p[0])} → <b>${h(p[1])}</b> (${p[2].length})`).join('<br>')}</span>`, 'Aplicar')) return;
  await run(null, async () => {
    let pend = false;
    for (const [campo, valor, l] of passos) { const j = await api('contrBulkSet', { rows: l.map(r => ({ row: r.row, nome: r[S.ck.colab] })), campo, valor }); if (j && j.pendente) pend = true; }
    if (done) done(); if (!pend) toast(`${tot} contratação(ões) atualizada(s)`); bgReload();
  });
}
function openContrBulkSet(lista, done) {
  const C = S.data.contratacoes, K = S.ck, op = C.opcoes || {};
  const campos = [K.dp, K.aso, K.hcm, K.contrato, K.status].filter(Boolean);
  const opts = k => uniq([...(op[k] || []), ...C.rows.map(r => r[k]).filter(Boolean), ...(k === K.status ? ['Alocado', 'Pendente', 'Desligado'] : k === K.dp || k === K.hcm ? ['SIM', 'NÃO'] : [])]);
  modal({
    title: `Alterar ${lista.length} contratação(ões)`, icon: 'edit',
    body: `<div class="row2"><div class="field"><label>Campo</label><select class="input" id="cbC">${campos.map(c => `<option>${h(c)}</option>`).join('')}</select></div><div class="field"><label>Novo valor</label><select class="input" id="cbV"></select></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cbOk">Aplicar</button>`,
    onMount: m => {
      const fill = () => { $('#cbV', m.el).innerHTML = opts($('#cbC', m.el).value).map(o => `<option>${h(o)}</option>`).join(''); };
      $('#cbC', m.el).onchange = fill; fill();
      $('#cbOk', m.el).onclick = () => { const c = $('#cbC', m.el).value, v = $('#cbV', m.el).value; m.close(); contrBulk(lista, c, v, done); };
    }
  });
}

/* =====================================================================
 * ATUALIZAÇÃO INSTANTÂNEA (otimista) + recarga em segundo plano
 * ===================================================================== */
let bgT = null;
function bgReload(ms = 1200) { clearTimeout(bgT); bgT = setTimeout(() => { if ($('.overlay')) return bgReload(2500); loadAll(false, true); }, ms); }
const findRow = (lk, row) => { const l = lojaBy(lk); if (!l) return null; for (const s of l.setores) { const r = s.linhas.find(x => x.row === +row); if (r) { r.loja = l.key; r.setor = s.nome; return r; } } return null; };
// numeração das linhas: espelha na tela o que a planilha faz ao inserir/apagar linhas
function shiftLoja_(l, from, delta) {
  l.setores.forEach(s => {
    ['row', 'padraoRow', 'totalRow'].forEach(k => { if (s[k] && s[k] >= from) s[k] += delta; });
    s.linhas.forEach(r => { if (r.row >= from) r.row += delta; });
  });
}
function localAddPos(lk, setor, funcao, contrato, qt, motivo, resp) {
  const l = lojaBy(lk); const s = l && l.setores.find(x => x.nome === setor); if (!s) return 0;
  const nr = s.linhas.length ? s.linhas[0].row + 1 : (s.padraoRow || s.row) + 2;
  shiftLoja_(l, nr, 1);
  const r = { row: nr, qt: +qt || 1, nome: '', funcao: String(funcao || '').toUpperCase(), contrato: contrato || 'INTEGRAL', situacao: 'VAGA', tag: '', tempo: '', meses: null, vid: '', loja: l.key, setor: s.nome,
    info: { etapa: 'Aberta', responsavel: resp || S.user.nome, abertura: todayISO(), previsao: '', candidatos: '', motivo: motivo || 'Aumento de quadro', obs: '', hist: [{ e: 'Aberta', d: todayISO() }] } };
  s.linhas.splice(s.linhas.length ? 1 : 0, 0, r);
  return nr;
}
function localRemove(lk, row, expect) {
  const l = lojaBy(lk); if (!l) return false;
  for (const s of l.setores) {
    const i = s.linhas.findIndex(x => x.row === +row);
    if (i < 0) continue;
    const r = s.linhas[i];
    if (expect && (norm(r.nome) !== norm(expect.nome) || norm(r.funcao) !== norm(expect.funcao))) return false;
    s.linhas.splice(i, 1); shiftLoja_(l, +row + 1, -1); return true;
  }
  return false;
}
function localMovimentar(p) {
  const o = p.origem || {}, d = p.destino || {};
  const ro = findRow(o.loja, o.row);
  if (!ro || !ro.nome || (o.expect && (norm(ro.nome) !== norm(o.expect.nome) || norm(ro.funcao) !== norm(o.expect.funcao)))) return;
  const nome = ro.nome, contratoO = ro.contrato, tagO = ro.tag, tempoO = ro.tempo, mesesO = ro.meses;
  if (d.mesmaPosicao) { ro.funcao = String(d.funcao || ro.funcao).toUpperCase(); if (d.tag !== undefined) ro.tag = d.tag || ''; if (d.contrato) ro.contrato = d.contrato; return; }
  let dRow = +d.row;
  if (!dRow) dRow = localAddPos(d.loja, d.setor, d.funcao, d.contrato || contratoO || 'INTEGRAL', d.qt || 1, (p.tipo || 'Movimentação') + ' — ' + nome, p.responsavel);
  const rd = findRow(d.loja, dRow); if (!rd || rd.nome) return;
  localFill({ loja: d.loja, row: dRow, nome, contrato: d.contrato || contratoO, tag: d.tag !== undefined ? d.tag : tagO });
  rd.tempo = tempoO; rd.meses = mesesO;
  if (p.origemAcao === 'remover') localRemove(o.loja, ro.row, null);
  else Object.assign(ro, { nome: '', situacao: 'VAGA', tag: '', tempo: '', meses: null, info: { etapa: 'Aberta', responsavel: p.responsavel || S.user.nome, abertura: todayISO(), candidatos: '', motivo: p.tipo, obs: p.obs || '', hist: [{ e: 'Aberta', d: todayISO() }] } });
}
const todayISO = () => isoD(new Date());
function contrByName(nome) { const n = norm(nome); return (S.data.contratacoes.rows || []).filter(r => norm(r[S.ck.colab]) === n); }
function localDesligar(p) {
  const r = findRow(p.loja, p.row); if (!r || !r.nome) return;
  S.data.desligados = S.data.desligados || [];
  S.data.desligados.push({ nome: r.nome, loja: p.loja, funcao: r.funcao, data: p.dataDesligamento || todayISO(), tipo: p.tipo || '', origem: 'Quadro' });
  contrByName(r.nome).forEach(c => { if (S.ck.status) c[S.ck.status] = 'Desligado'; });
  Object.assign(r, { nome: '', situacao: 'VAGA', tag: '', tempo: '', meses: null, info: { etapa: 'Aberta', responsavel: p.responsavel || S.user.nome, abertura: todayISO(), candidatos: '', motivo: 'Desligamento', obs: '', hist: [{ e: 'Aberta', d: todayISO() }] } });
}
function localFill(p) {
  const r = findRow(p.loja, p.row); if (!r) return;
  if (r.info && r.info.abertura) (S.data.vagasFechadas = S.data.vagasFechadas || []).push({ loja: p.loja, funcao: r.funcao, setor: r.setor, abertura: r.info.abertura, fechamento: todayISO(), por: String(p.nome).toUpperCase(), responsavel: r.info.responsavel, hist: r.info.hist || [] });
  Object.assign(r, { nome: String(p.nome || '').trim().toUpperCase(), situacao: 'OK', tag: p.tag || '', info: null, vid: '', tempo: '0 anos e 0 meses', meses: 0 });
  if (p.contrato) r.contrato = p.contrato;
}
const LOCAL = {
  setPadrao: (p, j) => {
    const l = lojaBy(p.loja); const sc = l && l.setores.find(x => x.nome === p.setor); if (!sc) return;
    (p.remover || []).slice().sort((a, b) => b.row - a.row).forEach(x => localRemove(p.loja, x.row, x.expect));
    sc.padrao = +p.padrao; sc.pad = +p.padrao;
    const nv = p.novas && +p.novas.qtd > 0 ? Math.min(30, +p.novas.qtd) : 0;
    for (let i = 0; i < nv; i++) localAddPos(p.loja, p.setor, p.novas.funcao, p.novas.contrato || 'INTEGRAL', p.novas.qt || 1, 'Aumento de quadro' + (p.motivo ? ' — ' + p.motivo : ''), p.novas.responsavel);
  },
  addPosicao: p => { localAddPos(p.loja, p.setor, p.funcao, p.contrato || 'INTEGRAL', p.qt || 1, p.motivo || 'Aumento de quadro', p.responsavel); },
  removerPosicao: p => { localRemove(p.loja, p.row, p.expect); },
  movimentar: p => localMovimentar(p),
  cruzarContr: (p, j) => { if (p.simular) return; const set = (rows, val) => (rows || []).forEach(x => { const c = (S.data.contratacoes.rows || []).find(y => y.row === x.row); if (c && S.ck.status) c[S.ck.status] = val; }); set(j.alocados, 'Alocado'); set(j.desligados, 'Desligado'); },
  desligar: p => localDesligar(p),
  desligarLote: p => (p.itens || []).forEach(it => localDesligar(Object.assign({}, it, { dataDesligamento: p.dataDesligamento, tipo: p.tipo, responsavel: p.responsavel }))),
  preencherVaga: p => localFill(p),
  alocar: p => { localFill(p); const c = (S.data.contratacoes.rows || []).find(x => x.row === p.contrRow); if (c && S.ck.status) c[S.ck.status] = p.statusAlocado || 'Alocado'; },
  abrirVaga: p => { const r = findRow(p.loja, p.row); if (!r) return; if (p.motivo === 'EM AVISO') r.situacao = 'EM AVISO, VAGA'; else Object.assign(r, { nome: '', situacao: 'VAGA', tag: '', tempo: '' }); r.info = { etapa: 'Aberta', responsavel: p.responsavel || S.user.nome, abertura: todayISO(), candidatos: '', motivo: p.motivo, obs: p.obs || '', hist: [{ e: 'Aberta', d: todayISO() }] }; },
  saveRow: p => { const r = findRow(p.loja, p.row); if (!r) return; const d = p.data; Object.assign(r, { nome: d.nome, funcao: d.funcao || r.funcao, contrato: d.contrato, situacao: String(d.situacao || '').toUpperCase(), tag: d.tag }); if (d.qt) r.qt = +d.qt; },
  setVagaInfo: p => { const r = findRow(p.loja, p.row); if (!r) return; r.info = Object.assign({ etapa: 'Aberta', abertura: todayISO(), hist: [] }, r.info || {}, p.data); },
  setVagaInfoLote: p => (p.itens || []).forEach(it => { const r = findRow(it.loja, it.row); if (r) r.info = Object.assign({ etapa: 'Aberta', abertura: todayISO(), hist: [] }, r.info || {}, p.data); }),
  marcarDesligadoContr: p => (p.rows || []).forEach(x => { const c = (S.data.contratacoes.rows || []).find(y => y.row === x.row); if (c) { if (S.ck.status) c[S.ck.status] = 'Desligado'; (S.data.desligados = S.data.desligados || []).push({ nome: c[S.ck.colab], loja: lojaKey(c[S.ck.loja]), funcao: c[S.ck.funcao], data: p.dataDesligamento || todayISO(), tipo: p.tipo || '', origem: 'Contratações' }); } }),
  contrBulkSet: p => (p.rows || []).forEach(x => { const c = (S.data.contratacoes.rows || []).find(y => y.row === x.row); if (c) c[p.campo] = p.valor; }),
  saveContratacao: p => { const c = (S.data.contratacoes.rows || []).find(y => y.row === p.row); if (c) Object.keys(p.data).forEach(k => { c[k] = k === S.ck.data && /^\d{4}-/.test(p.data[k]) ? isoToBR(p.data[k]) : p.data[k]; }); },
  addContratacao: (p, j) => { const d = {}; Object.keys(p.data).forEach(k => d[k] = k === S.ck.data && /^\d{4}-/.test(p.data[k]) ? isoToBR(p.data[k]) : p.data[k]); d.row = j.row || 99999; if (S.ck.status) d[S.ck.status] = j.alocado ? (p.statusAlocado || 'Alocado') : 'Pendente'; S.data.contratacoes.rows.push(d); if (p.vaga && j.alocado) localFill(Object.assign({}, p.vaga, { nome: p.data[S.ck.colab] })); }
};

/* =====================================================================
 * NOVA CONTRATAÇÃO / EDIÇÃO — setor e função em lista pelas vagas da loja
 * ===================================================================== */
function openContr(r) {
  const C = S.data.contratacoes, K = S.ck, op = C.opcoes || {};
  const ed = canContr(r ? r._loja : null), edQ = canEdit(r ? r._loja : null);
  const novo = !r;
  const lojasOpc = (() => { const vistos = new Set(); return uniq([...LOJAS_CONTR, ...(op[K.loja] || [])]).filter(x => { const k = lojaKey(x); if (vistos.has(k)) return false; vistos.add(k); return true; }); })();
  const distinct = k => C.rows.map(x => x[k]).filter(Boolean);
  const listFor = k => uniq([...(op[k] || []), ...distinct(k), ...(k === K.aso ? ['FEITO', 'MARCADO', 'AGUARDANDO'] : k === K.hcm || k === K.dp ? ['SIM', 'NÃO'] : k === K.contrato ? ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO'] : k === K.status ? ['Pendente', 'Alocado', 'Desligado'] : [])]);
  const field = k => {
    const val = r ? r[k] : '';
    const dis = ed && (edQ || k !== K.status) ? '' : 'disabled';
    if (k === K.data) return `<div class="field"><label>${h(k)}</label><input class="input" type="date" data-k="${h(k)}" value="${r ? brToISO(val) : isoD(new Date())}" ${dis}></div>`;
    if (k === K.loja) return `<div class="field"><label>${h(k)}</label><select class="input" data-k="${h(k)}" ${dis}>${novo ? '<option value="">Selecione a loja</option>' : ''}${uniq([...lojasOpc, val]).filter(Boolean).map(x => `<option ${x === val ? 'selected' : ''}>${h(x)}</option>`).join('')}</select></div>`;
    if (k === K.colab) return `<div class="field"><label>${h(k)}</label><input class="input" data-k="${h(k)}" value="${h(val || '')}" ${ed ? '' : 'readonly'} placeholder="NOME COMPLETO"></div>`;
    if (novo && (k === K.setor || k === K.funcao)) return `<div class="field"><label>${h(k)} <span class="faint" style="font-weight:500">${k === K.setor ? '· setores da loja' : '· vagas do setor'}</span></label><select class="input" data-k="${h(k)}" data-dep="${k === K.setor ? 'setor' : 'funcao'}"><option value="">Selecione a loja primeiro</option></select></div>`;
    if (k === K.setor || k === K.funcao) return `<div class="field"><label>${h(k)}</label><input class="input" data-k="${h(k)}" value="${h(val || '')}" ${ed ? '' : 'readonly'} list="${k === K.funcao ? 'dlCF' : 'dlCS'}"></div>`;
    const o = listFor(k);
    if (o.length && o.length <= 25) return `<div class="field"><label>${h(k)}</label><select class="input" data-k="${h(k)}" ${dis}>${novo ? '<option value=""></option>' : ''}${uniq([...o, val]).filter(x => x !== '' || !r).map(x => `<option ${x === val ? 'selected' : ''}>${h(x)}</option>`).join('')}</select></div>`;
    return `<div class="field"><label>${h(k)}</label><input class="input" data-k="${h(k)}" value="${h(val || '')}" ${ed ? '' : 'readonly'}></div>`;
  };
  const hdr = C.header.filter(k => !/^COL\d+$/.test(k) && (r || k !== K.status));
  modal({
    title: r ? h(r[K.colab]) : 'Nova contratação', icon: 'userplus', wide: true,
    body: `<div class="ckp" id="ckp"></div><div class="row2">${hdr.map(field).join('')}</div>
      <datalist id="dlCF">${allFuncoes().map(x => `<option value="${h(x)}">`).join('')}</datalist>
      <datalist id="dlCS">${uniq(S.all.map(x => x.setor)).map(x => `<option value="${h(x)}">`).join('')}</datalist>
      ${novo ? `<div class="card mt" style="background:var(--surface2);padding:14px${edQ ? '' : ';display:none'}"><div class="field" style="margin:0"><label>${ic('swap')} Vaga do quadro que será preenchida</label><select class="input" id="ncV"></select><div class="muted" style="font-size:12px;margin-top:6px" id="ncHint"></div></div></div>` : ''}`,
    foot: ed ? `${edQ && r && r._pend && lojaBy(r._loja) ? `<button class="btn" data-a="aloc" style="margin-right:auto">${ic('swap')} Alocar no quadro</button><button class="btn ghost" data-a="alocM" title="Escolher a vaga manualmente">Escolher vaga</button>` : ''}${edQ && r && !r._deslig ? `<button class="btn danger" data-a="desl">${ic('door')} Desligado</button>` : ''}${edQ && r && S.ck.status ? `<button class="btn danger ghost" data-a="exc" title="Desistiu na contratação">${ic('trash')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" data-a="ok">Salvar</button>` : '<button class="btn" data-close>Fechar</button>',
    onMount: m => {
      const a = $('[data-a=aloc]', m.el); if (a) a.onclick = () => { m.close(); openAlocar(r); }; const am = $('[data-a=alocM]', m.el); if (am) am.onclick = () => { m.close(); openAlocar(r, true); };
      const dsl = $('[data-a=desl]', m.el); if (dsl) dsl.onclick = () => { m.close(); openMarcarDesl([r]); };
      const exc = $('[data-a=exc]', m.el); if (exc) exc.onclick = () => { m.close(); openExcluirContr([r]); };
      const el = k => $(`[data-k="${CSS.escape(k)}"]`, m.el);
      const val = k => { const e = el(k); return e ? e.value : ''; };
      // checklist no topo: espelha os campos do formulário e muda conforme avança
      const ckDraw = () => {
        const p = $('#ckp', m.el); if (!p) return;
        const x = Object.assign({}, r || {});
        [K.dp, K.aso, K.hcm].filter(Boolean).forEach(k => { const e = el(k); if (e) x[k] = e.value; });
        if (novo) { const vs = $('#ncV', m.el); x._pend = !(vs && vs.value); x._deslig = false; }
        const st = chkSteps(x), ok = st.filter(s => s.ok).length, falta = st.find(s => !s.ok);
        const pode = s => ed && !x._deslig && (s.k === 'aloc' ? !novo && edQ && r._pend && !!lojaBy(r._loja) : !!el(K[s.k]) && !el(K[s.k]).disabled);
        p.innerHTML = `<div class="ckp-h"><b>${ic('check')} Checklist da admissão</b><span>${ok} de ${st.length}${x._deslig ? ' · desligado' : falta ? ' · próximo: ' + h(falta.lbl) : ' · tudo pronto'}</span></div>
          <div class="ck-bar ${falta ? '' : 'full'}"><i style="width:${Math.round(ok / st.length * 100)}%"></i></div>
          <div class="ckp-steps">${st.map((s, i) => `<button type="button" class="ckp-s ${s.ok ? 'ok' : s.mid ? 'mid' : falta === s ? 'next' : ''}" data-s="${s.k}" ${pode(s) ? '' : 'disabled'}><span class="ckp-n">${s.ok ? ic('check') : i + 1}</span><span class="ckp-t"><b>${h(s.lbl)}</b><small>${h(novo && s.k === 'aloc' ? (x._pend ? 'Fica pendente ao salvar' : 'Será alocado ao salvar') : s.sub)}</small></span></button>`).join('')}</div>`;
        $$('.ckp-s[data-s]', p).forEach(b => b.onclick = () => {
          const k = b.dataset.s;
          if (k === 'aloc') { m.close(); return openAlocar(r); }
          const e = el(K[k]); if (!e) return;
          const ok1 = st.find(s => s.k === k).ok;
          const nv = k === 'aso' ? (ok1 ? 'AGUARDANDO' : 'FEITO') : (ok1 ? 'NÃO' : 'SIM');
          if (e.tagName === 'SELECT' && ![...e.options].some(o => o.value === nv)) e.insertAdjacentHTML('beforeend', `<option>${h(nv)}</option>`);
          e.value = nv; e.dispatchEvent(new Event('change', { bubbles: true }));
        });
      };
      m.el.addEventListener('change', () => setTimeout(ckDraw));
      ckDraw();
      if (!novo) return bindSave();
      const sSel = el(K.setor), fSel = el(K.funcao), vsel = $('#ncV', m.el);
      const loja = () => lojaBy(lojaKey(val(K.loja)));
      const toInput = sel => { const inp = document.createElement('input'); inp.className = 'input'; inp.dataset.k = sel.dataset.k; inp.placeholder = 'Digite…'; inp.setAttribute('list', sel.dataset.dep === 'setor' ? 'dlCS' : 'dlCF'); sel.replaceWith(inp); inp.focus(); inp.addEventListener('input', () => { clearTimeout(inp._t); inp._t = setTimeout(fillVagas, 300); }); };
      const fillSetores = () => {
        const l = loja(); const s = el(K.setor); if (!s || s.tagName !== 'SELECT') return fillFuncoes();
        if (!l) { s.innerHTML = '<option value="">Selecione a loja primeiro</option>'; return fillFuncoes(); }
        const secs = l.setores.map(sc => ({ n: sc.nome, v: sc.linhas.filter(x => x.vagaAberta).length, f: sc.linhas.filter(x => x.vagaFutura).length })).sort((x, y) => (y.v + y.f) - (x.v + x.f));
        s.innerHTML = `<option value="">Selecione o setor</option>` + secs.map(x => `<option value="${h(x.n)}">${h(x.n)}${x.v ? ` — ${x.v} vaga(s)` : ''}${x.f ? ` · ${x.f} futura(s)` : ''}</option>`).join('') + '<option value="__outro">Outro (digitar)</option>';
        const best = secs.find(x => x.v); if (best && secs.filter(x => x.v).length === 1) s.value = best.n;
        fillFuncoes();
      };
      const fillFuncoes = () => {
        const l = loja(); const f = el(K.funcao); if (!f || f.tagName !== 'SELECT') return fillVagas();
        const st = val(K.setor);
        if (!l || !st || st === '__outro') { f.innerHTML = `<option value="">${l ? 'Selecione o setor primeiro' : 'Selecione a loja primeiro'}</option><option value="__outro">Outro (digitar)</option>`; return fillVagas(); }
        const sc = l.setores.find(x => x.nome === st);
        const fs = uniq((sc ? sc.linhas : []).map(x => x.funcao)).map(fn => ({ fn, v: sc.linhas.filter(x => x.funcao === fn && x.vagaAberta).length, fu: sc.linhas.filter(x => x.funcao === fn && x.vagaFutura).length })).sort((x, y) => (y.v + y.fu) - (x.v + x.fu));
        f.innerHTML = `<option value="">Selecione a função</option>` + fs.map(x => `<option value="${h(x.fn)}">${h(x.fn)}${x.v ? ` — ${x.v} vaga(s)` : x.fu ? ` — ${x.fu} futura(s)` : ' — sem vaga'}</option>`).join('') + '<option value="__outro">Outro (digitar)</option>';
        const withV = fs.filter(x => x.v || x.fu); if (withV.length === 1) f.value = withV[0].fn;
        fillVagas();
      };
      const fillVagas = () => {
        const l = loja();
        if (!l) { vsel.innerHTML = '<option value="">— Selecione a loja —</option>'; $('#ncHint', m.el).textContent = ''; return; }
        const st = val(K.setor), fn = val(K.funcao);
        const exact = l.rows.filter(x => x.isVaga && x.setor === st && x.funcao === fn).sort((x, y) => (x.vagaAberta ? 0 : 1) - (y.vagaAberta ? 0 : 1));
        const others = matchVagas(l.key, fn, st).filter(x => !exact.includes(x)).slice(0, 30);
        vsel.innerHTML = `<option value="">Não alocar agora (fica pendente)</option>` + (exact.length ? `<optgroup label="Mesma função e setor">${exact.map((x, i) => `<option value="${x.row}" ${i === 0 ? 'selected' : ''}>${h(x.funcao)} · ${h(x.setor)}${x.vagaFutura ? ' · substitui ' + h(x.nome) : ''}${x.dias != null ? ' · aberta há ' + x.dias + 'd' : ''}</option>`).join('')}</optgroup>` : '') + (others.length ? `<optgroup label="Outras vagas da loja">${others.map(x => `<option value="${x.row}">${h(x.funcao)} · ${h(x.setor)}${x.vagaFutura ? ' · substitui ' + h(x.nome) : ''}</option>`).join('')}</optgroup>` : '');
        setTimeout(ckDraw);
        $('#ncHint', m.el).innerHTML = exact.length ? `${ic('check')} A vaga será preenchida e fechada automaticamente ao salvar.` : (st && fn && st !== '__outro' && fn !== '__outro') ? 'Não há vaga aberta nessa função/setor. Escolha outra vaga da loja ou deixe pendente.' : `${l.rows.filter(x => x.vagaAberta).length} vaga(s) aberta(s) em ${h(l.nome)}.`;
      };
      el(K.loja).addEventListener('change', fillSetores);
      sSel.addEventListener('change', () => sSel.value === '__outro' ? (toInput(sSel), fillFuncoes()) : fillFuncoes());
      fSel.addEventListener('change', () => fSel.value === '__outro' ? toInput(fSel) : fillVagas());
      fillSetores();
      bindSave();
      function bindSave() {
        const ok = $('[data-a=ok]', m.el);
        if (ok) ok.onclick = e => run(e.currentTarget, async () => {
          const data = {}; $$('[data-k]', m.el).forEach(i => { let v = i.value; if (v === '__outro') v = ''; if (i.dataset.k !== K.data) v = v.trim(); if (i.dataset.k === K.colab || i.dataset.k === K.funcao || i.dataset.k === K.setor) v = v.toUpperCase(); data[i.dataset.k] = v; });
          if (!data[K.colab]) throw new Error('Informe o colaborador');
          if (novo && !data[K.loja]) throw new Error('Selecione a loja');
          if (r) { await api('saveContratacao', { row: r.row, expectNome: r[K.colab], data }); m.close(); toast('Contratação atualizada'); }
          else {
            let vaga = null;
            const vs = $('#ncV', m.el);
            if (edQ && vs && vs.value) { const lk = lojaKey(data[K.loja]); const vr = lojaBy(lk).rows.find(x => x.row === +vs.value); const ct = data[K.contrato] && opc(lojaBy(lk), 'contrato').includes(data[K.contrato]) ? data[K.contrato] : vr.contrato; vaga = { loja: lk, row: vr.row, expect: expectOf(vr), setor: vr.setor, contrato: ct, tag: /APRENDIZ/.test(norm(ct)) ? 'APRENDIZ' : '' }; if (!data[K.setor]) data[K.setor] = vr.setor; if (!data[K.funcao]) data[K.funcao] = vr.funcao; }
            const statusOpc = op[K.status] || [];
            const j = await api('addContratacao', { data, vaga, statusAlocado: statusOpc.find(x => /ALOCAD/i.test(x)) || 'Alocado' });
            m.close(); if (!j.pendente) toast(j.alocado ? 'Contratação registrada e colaborador colocado no quadro — vaga fechada' : 'Contratação registrada (pendente de alocação)');
          }
          bgReload();
        });
      }
    }
  });
}


async function openCruzar(btn) {
  const j = await run(btn, () => api('cruzarContr', { simular: true }));
  const A = j.alocados || [], D = j.desligados || [];
  if (!A.length && !D.length) return toast('Tudo certo: nenhuma contratação pendente a ajustar.');
  modal({
    title: 'Cruzar contratações com o quadro', icon: 'swap', wide: true,
    body: `<p class="muted" style="margin-top:0">O sistema comparou os nomes pendentes da aba CONTRATAÇÕES com o quadro das lojas e com o histórico de desligados.</p>
      <div class="grid g2">
        <div class="card" style="background:var(--surface2)"><div class="card-h"><h3>${ic('check')} Já estão no quadro</h3><span class="badge b-ok">${A.length}</span></div><div class="muted" style="font-size:12px;margin-bottom:8px">Serão marcados como <b>Alocado</b></div><div class="alist" style="max-height:300px">${A.map(x => `<div class="aitem"><div><b>${h(x.nome)}</b><span>${h(x.onde)}</span></div></div>`).join('') || '<div class="faint">Nenhum</div>'}</div></div>
        <div class="card" style="background:var(--surface2)"><div class="card-h"><h3>${ic('door')} Já saíram</h3><span class="badge b-bad">${D.length}</span></div><div class="muted" style="font-size:12px;margin-bottom:8px">Serão marcados como <b>Desligado</b></div><div class="alist" style="max-height:300px">${D.map(x => `<div class="aitem"><div><b>${h(x.nome)}</b></div></div>`).join('') || '<div class="faint">Nenhum</div>'}</div></div>
      </div>
      <p class="muted" style="font-size:12px">O cruzamento também roda automaticamente quando o sistema é aberto (no máximo a cada 30 minutos).</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="crOk">${ic('check')} Aplicar ${A.length + D.length} ajuste(s)</button>`,
    onMount: m => $('#crOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const r = await api('cruzarContr', {});
      m.close(); if (!r.pendente) toast(`${(r.alocados || []).length} marcada(s) como alocada(s) e ${(r.desligados || []).length} como desligada(s)`); bgReload();
    })
  });
}

/* =====================================================================
 * QUADRO PADRÃO DO SETOR — aumento / redução
 * ===================================================================== */
const MOTIVOS_PAD = ['Aumento de quadro', 'Redução de quadro', 'Reestruturação do setor', 'Abertura de loja', 'Correção do padrão', 'Outro'];
function openPadrao(l, sec) {
  const pad = sec.pad || 0;
  const vagasSec = sec.linhas.filter(r => r.vagaAberta);
  const funcs = uniq(sec.linhas.map(r => r.funcao).concat(allFuncoes()));
  modal({
    title: 'Quadro padrão · ' + h(sec.nome), icon: 'edit', wide: true,
    body: `<div class="grid g3" style="margin-bottom:16px">
        <div class="card" style="background:var(--surface2);padding:14px"><div class="muted" style="font-size:12px">Padrão atual</div><b style="font-size:26px">${fmt(pad)}</b></div>
        <div class="card" style="background:var(--surface2);padding:14px"><div class="muted" style="font-size:12px">Ocupado hoje</div><b style="font-size:26px">${fmt(sec.ocup)}</b></div>
        <div class="card" style="background:var(--surface2);padding:14px"><div class="muted" style="font-size:12px">Posições na planilha</div><b style="font-size:26px">${sec.linhas.length}</b> <span class="muted">· ${vagasSec.length} vaga(s)</span></div>
      </div>
      <div class="row3">
        <div class="field"><label>Novo quadro padrão</label><div style="display:flex;gap:6px"><button class="btn icon" id="pdMinus" type="button">−</button><input class="input" id="pdV" type="number" step="0.01" min="0" value="${pad}" style="text-align:center;font-size:18px;font-weight:700"><button class="btn icon" id="pdPlus" type="button">+</button></div></div>
        <div class="field"><label>Motivo</label><select class="input" id="pdM">${MOTIVOS_PAD.map(x => `<option>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Observação</label><input class="input" id="pdO" placeholder="Opcional"></div>
      </div>
      <div id="pdDiff" class="badge" style="display:block;padding:10px 12px;white-space:normal;margin-bottom:12px"></div>
      <div id="pdUp" class="card hidden" style="background:var(--surface2);padding:14px">
        <label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="pdCria" checked> Criar as vagas novas no quadro</label>
        <div class="row3 mt"><div class="field"><label>Quantidade</label><input class="input" id="pdQ" type="number" min="1" max="30" value="1"></div>
        <div class="field"><label>Função</label><input class="input" id="pdF" list="dlPdF" value="${h((vagasSec[0] || sec.linhas[0] || {}).funcao || '')}"><datalist id="dlPdF">${funcs.map(x => `<option value="${h(x)}">`).join('')}</datalist></div>
        <div class="field"><label>Contrato</label><select class="input" id="pdC">${opc(l, 'contrato').map(x => `<option>${h(x)}</option>`).join('')}</select></div></div>
        <div class="muted" style="font-size:12px">As vagas entram como <b>VAGA</b> no setor.</div>
      </div>
      <div id="pdDown" class="card hidden" style="background:var(--surface2);padding:14px">
        ${vagasSec.length ? `<b>Remover vagas em aberto do setor (opcional)</b>${isAdmin() ? '' : '<div class="muted" style="font-size:12px">Somente administradores podem remover linhas.</div>'}
        <div class="alist" style="max-height:200px;margin-top:8px">${vagasSec.map(r => `<label class="aitem" style="cursor:pointer;align-items:center"><input type="checkbox" value="${r.row}" ${isAdmin() ? '' : 'disabled'}><div><b>${h(r.funcao)}</b><span>Linha ${r.row}${r.info && r.info.abertura ? ' · aberta em ' + isoToBR(r.info.abertura) : ''}</span></div></label>`).join('')}</div>` : '<div class="muted">Não há vagas em aberto neste setor para remover. Só o número do padrão será alterado.</div>'}
      </div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pdOk">Salvar quadro padrão</button>`,
    onMount: m => {
      const inp = $('#pdV', m.el);
      const upd = () => {
        const nv = +String(inp.value).replace(',', '.') || 0, d = Math.round((nv - pad) * 100) / 100;
        const box = $('#pdDiff', m.el);
        box.className = 'badge ' + (d > 0 ? 'b-ok' : d < 0 ? 'b-warn' : '');
        box.innerHTML = d > 0 ? `${ic('trend')} Aumento de quadro: <b>+${fmt(d)}</b> (de ${fmt(pad)} para ${fmt(nv)})` : d < 0 ? `Redução de quadro: <b>${fmt(d)}</b> (de ${fmt(pad)} para ${fmt(nv)})` : 'Sem alteração';
        $('#pdUp', m.el).classList.toggle('hidden', d <= 0);
        $('#pdDown', m.el).classList.toggle('hidden', d >= 0);
        if (d > 0) $('#pdQ', m.el).value = Math.max(1, Math.ceil(d));
        if (d > 0 && !/AUMENTO|ABERTURA|REESTRUT/.test(norm($('#pdM', m.el).value))) $('#pdM', m.el).value = 'Aumento de quadro';
        if (d < 0 && !/REDU|REESTRUT|CORRE/.test(norm($('#pdM', m.el).value))) $('#pdM', m.el).value = 'Redução de quadro';
      };
      inp.oninput = upd;
      $('#pdPlus', m.el).onclick = () => { inp.value = Math.round((+inp.value + 1) * 100) / 100; upd(); };
      $('#pdMinus', m.el).onclick = () => { inp.value = Math.max(0, Math.round((+inp.value - 1) * 100) / 100); upd(); };
      upd();
      $('#pdOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const nv = +String(inp.value).replace(',', '.');
        if (isNaN(nv) || nv < 0) throw new Error('Informe um número válido');
        if (Math.abs(nv - pad) < 0.001) throw new Error('O valor não mudou');
        const payload = { loja: l.key, setor: sec.nome, padraoAtual: pad, padrao: nv, motivo: $('#pdM', m.el).value, obs: $('#pdO', m.el).value.trim() };
        if (nv > pad && $('#pdCria', m.el).checked) { const fn = $('#pdF', m.el).value.trim().toUpperCase(); if (!fn) throw new Error('Informe a função das vagas novas'); payload.novas = { qtd: +$('#pdQ', m.el).value || 1, funcao: fn, contrato: $('#pdC', m.el).value }; }
        if (nv < pad) payload.remover = $$('#pdDown input[type=checkbox]:checked', m.el).map(c => { const r = l.rows.find(x => x.row === +c.value); return { row: r.row, expect: expectOf(r) }; });
        const j = await api('setPadrao', payload);
        m.close(); if (!j.pendente) toast(`Quadro padrão de ${sec.nome}: ${fmt(pad)} → ${fmt(nv)}${j.criadas ? ` · ${j.criadas} vaga(s) criada(s)` : ''}${j.removidas ? ` · ${j.removidas} vaga(s) removida(s)` : ''}`); bgReload(300);
      });
    }
  });
}

/* =====================================================================
 * ÍCONE DO APP COM A LOGO DA EMPRESA (celular / tela inicial)
 * ===================================================================== */
function logoIcons(lg) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const make = (S, padF) => {
        const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
        // cor de fundo = cor do canto da logo (logo quadrada fica "sangrando" até a borda)
        const t = document.createElement('canvas'); t.width = t.height = 8; const tx = t.getContext('2d'); tx.drawImage(im, 0, 0, 8, 8);
        const d = tx.getImageData(0, 0, 1, 1).data;
        x.fillStyle = d[3] > 200 ? `rgb(${d[0]},${d[1]},${d[2]})` : '#ffffff'; x.fillRect(0, 0, S, S);
        const sq = Math.abs(im.width / im.height - 1) < 0.2 && d[3] > 200;
        const pad = sq ? S * padF : S * 0.14;
        const sc = Math.min((S - pad * 2) / im.width, (S - pad * 2) / im.height);
        const w = im.width * sc, hh = im.height * sc;
        x.imageSmoothingQuality = 'high'; x.drawImage(im, (S - w) / 2, (S - hh) / 2, w, hh);
        return c.toDataURL('image/png');
      };
      res({ i512: make(512, 0.1), i192: make(192, 0.1), i180: make(180, 0.04), fav: make(64, 0) });
    };
    im.onerror = () => res(null);
    im.src = lg;
  });
}
async function applyAppIcon() {
  const lg = cfgv('logo', ''); if (!lg) return;
  const ic2 = await logoIcons(lg); if (!ic2) return;
  $$('link[rel=icon]').forEach(l => l.href = ic2.fav);
  let ap = document.querySelector('link[rel=apple-touch-icon]'); if (ap) ap.href = ic2.i180;
  try {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    const man = { name: (cfgv('sistema', 'Quadro de Lojas')) + ' · ' + cfgv('empresa', 'GRC'), short_name: 'Quadro GRC', start_url: base + 'index.html', scope: base, display: 'standalone', orientation: 'portrait', background_color: '#070b16', theme_color: '#0b1122', lang: 'pt-BR', icons: [{ src: ic2.i192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: ic2.i512, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: ic2.i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
    const ml = document.querySelector('link[rel=manifest]');
    if (ml) ml.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' }));
  } catch (e) {}
}


/* =====================================================================
 * PDF DAS VAGAS (para compartilhar com a liderança)
 * ===================================================================== */
function vagasPDF(rows, f) {
  if (!rows.length) return toast('Nenhuma vaga com esses filtros', true);
  const lojasSel = f.loja ? [lojaBy(f.loja)] : S.data.lojas.filter(l => rows.some(r => r.loja === l.key));
  const filtros = [f.loja ? 'Loja ' + LOJA_NOMES[f.loja] : 'Todas as lojas', f.setor && 'Setor: ' + f.setor, f.func && 'Função: ' + f.func, f.etapa && 'Etapa: ' + f.etapa, f.contr && 'Contrato: ' + f.contr, f.fut === '1' ? 'inclui vagas futuras (aviso prévio)' : 'somente vagas abertas'].filter(Boolean).join(' · ');
  const esc = h;
  const slaTxt = r => r.sla && r.sla.st !== 'sem' ? `${r.sla.dias}/${r.sla.meta} dias` : '—';
  const slaCls = r => r.sla ? r.sla.st : 'sem';
  const lojaBlock = l => {
    const rr = rows.filter(r => r.loja === l.key);
    const porFunc = uniq(rr.map(r => r.funcao)).map(fn => [fn, rr.filter(r => r.funcao === fn).length]).sort((a, b) => b[1] - a[1]);
    const setores = uniq(rr.map(r => r.setor));
    return `<section class="loja">
      <div class="lh" style="--c:${l.color}"><span class="n">${l.num}</span><div><h2>Loja ${l.num} · ${esc(l.nome)}</h2><div class="sub">${rr.filter(r => r.vagaAberta).length} vaga(s) aberta(s)${rr.some(r => r.vagaFutura) ? ` · ${rr.filter(r => r.vagaFutura).length} futura(s)` : ''} · quadro ${fmt(l.st.atual)} de ${fmt(l.st.ideal)} (${l.st.ocup}%)</div></div></div>
      <div class="resumo">${porFunc.map(([fn, n]) => `<span><b>${n}</b> ${esc(fn)}</span>`).join('')}</div>
      <table><thead><tr><th>Setor</th><th>Função</th><th>Contrato</th><th class="q">Qtd</th><th>Situação</th><th>Etapa</th><th>Mais antiga</th><th>Responsável</th></tr></thead><tbody>
      ${setores.map(st => { const G = agruparVagas(rr.filter(r => r.setor === st)).sort((a, b) => b.qtd - a.qtd); return G.map((g, i) => `<tr>${i === 0 ? `<td rowspan="${G.length}" class="st">${esc(st)}<div class="stq">${sum(G, x => x.qtd)} vaga(s)</div></td>` : ''}<td><b>${esc(g.funcao)}</b>${g.futuras ? `<div class="fut">substitui ${esc(g.itens.filter(r => r.vagaFutura).map(r => r.nome).join(', '))}</div>` : ''}</td><td>${esc(g.contrato)}</td><td class="q"><span class="qb">${g.qtd}</span></td><td>${[g.abertas && g.abertas + ' aberta(s)', g.futuras && g.futuras + ' futura(s)'].filter(Boolean).join(' · ')}</td><td>${esc(g.etapasTxt || '—')}</td><td>${g.maxDias == null ? '—' : g.maxDias + ' dias'}</td><td>${esc(g.respTxt || '—')}</td></tr>`).join(''); }).join('')}
      </tbody></table></section>`;
  };
  const logo = cfgv('logo', '');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vagas em aberto · ${esc(f.loja ? LOJA_NOMES[f.loja] : 'Todas as lojas')} · ${new Date().toLocaleDateString('pt-BR')}</title>
  <style>
  @page{size:A4 landscape;margin:12mm}
  *{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:1100px;margin:0 auto;padding:18px}
  header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #6366f1;padding-bottom:12px;margin-bottom:14px}
  header img{height:46px;max-width:140px;object-fit:contain}
  .mark{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#6366f1,#a855f7);color:#fff;display:grid;place-items:center;font-weight:800}
  header h1{margin:0;font-size:20px}header .meta{color:#5b6785;font-size:11px;margin-top:2px}
  .tot{margin-left:auto;text-align:right}.tot b{font-size:26px;color:#dc2626;display:block;line-height:1}.tot span{color:#5b6785;font-size:10px;font-weight:700;letter-spacing:.06em}
  .filtros{background:#f3f5fb;border-radius:8px;padding:7px 10px;color:#334155;margin-bottom:14px}
  section.loja{margin-bottom:20px;page-break-inside:auto}
  .lh{display:flex;align-items:center;gap:10px;margin-bottom:6px}.lh .n{width:30px;height:30px;border-radius:8px;background:var(--c);color:#06101c;display:grid;place-items:center;font-weight:800;font-size:14px}
  .lh h2{margin:0;font-size:15px}.lh .sub{color:#5b6785;font-size:11px}
  .resumo{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}.resumo span{background:#eef2ff;border-radius:6px;padding:3px 8px}.resumo b{color:#4f46e5}
  table{width:100%;border-collapse:collapse}th{background:#0f172a;color:#fff;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}tr{page-break-inside:avoid}
  td.st{background:#f8fafc;font-weight:700;color:#334155;width:150px}.stq{font-weight:600;color:#64748b;font-size:10px;margin-top:2px}th.q,td.q{text-align:center;width:50px}.qb{display:inline-block;min-width:26px;padding:2px 6px;border-radius:6px;background:#fee2e2;color:#991b1b;font-weight:800;font-size:12px}.fut{color:#b45309;font-size:10px}
  .sla{padding:2px 6px;border-radius:5px;font-weight:700;font-size:10px}.sla.ok{background:#dcfce7;color:#166534}.sla.atn{background:#fef3c7;color:#92400e}.sla.est{background:#fee2e2;color:#991b1b}.sla.sem{color:#94a3b8}
  footer{margin-top:14px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between}
  .bar{position:sticky;top:0;background:#0f172a;color:#fff;padding:10px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between}
  .bar button{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}
  @media print{.bar{display:none}.wrap{padding:0}}
  </style></head><body>
  <div class="bar"><span>Pré-visualização do PDF · escolha <b>Salvar como PDF</b> na impressão</span><button onclick="window.print()">Baixar / imprimir PDF</button></div>
  <div class="wrap">
  <header>${logo && /^(data:image\/|https:)/.test(logo) ? `<img src="${esc(logo)}">` : '<div class="mark">GRC</div>'}<div><h1>Vagas em aberto</h1><div class="meta">${esc(cfgv('empresa', 'Grupo R Center'))} · Recursos Humanos · gerado em ${new Date().toLocaleString('pt-BR').slice(0, 17)} por ${esc(S.user.nome)}</div></div><div class="tot"><b>${rows.filter(r => r.vagaAberta).length}</b><span>VAGAS ABERTAS</span></div></header>
  <div class="filtros">${esc(filtros)}</div>
  ${lojasSel.map(lojaBlock).join('')}
  <footer><span>${esc(cfgv('sistema', 'Quadro de Lojas'))}</span></footer>
  </div><script>setTimeout(function(){try{window.print()}catch(e){}},600)</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Permita pop-ups para gerar o PDF', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// remove o selo flutuante do Netlify (cobria o menu inferior no celular)
try { const kill = () => { const f = document.getElementById('nl-badge-frame'); if (f) f.remove(); }; new MutationObserver(kill).observe(document.body, { childList: true }); kill(); } catch (e) {}
registerSW();
init();
})();
