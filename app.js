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
  grip: '<path d="M12 3l-3 3h6zM12 21l-3-3h6z" fill="currentColor"/><circle cx="9" cy="10" r=".6"/><circle cx="15" cy="10" r=".6"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
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
const MUDA_LINHAS = { moverLinha: 1, setPadrao: 1, addPosicao: 1, removerPosicao: 1, addContratacao: 1, movimentar: 1 }; // ações que mudam a numeração das linhas
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
  if (QS.get('ficha')) { renderFicha(QS.get('ficha')); refreshPublicCfg(); }
  else if (QS.get('teste')) { renderTeste(QS.get('teste')); refreshPublicCfg(); }
  else if (QS.get('agenda')) { renderAgenda(QS.get('agenda')); refreshPublicCfg(); }
  else if (S.token) {
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
    <section class="login-hero" style="--foto:url('https://www.rcentersupermercado.com.br/img/sobre-equipe.jpg')">
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
    <section class="login-hero" style="--foto:url('https://www.rcentersupermercado.com.br/img/sobre-equipe.jpg')">
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
/* ---------------- ficha do candidato (link público, sem login) ---------------- */
const FICHA_BLUSA = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EXGG'];
const FICHA_CALCA = ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', 'PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG'];
const FICHA_BOTA = ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const cpfFmt = c => { c = String(c || '').replace(/\D/g, ''); return c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : c; };
const dataBR = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s.split('-').reverse().join('/') : (s || '');
const telFmt = t => { t = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return t.length === 11 ? t.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : t.length === 10 ? t.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3') : t; };
function cpfOk_(c) { c = String(c || '').replace(/\D/g, ''); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (((s * 10) % 11) % 10 !== +c[t]) return false; } return true; }
function semFichaNaUrl_() { try { const u = new URL(location.href); u.searchParams.delete('ficha'); history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || '')); } catch (e) {} }
async function renderFicha(codigo) {
  $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Abrindo ficha…</div></div></div>`;
  let info = null, erro = '';
  let recs = [];
  try { const j = await sendRaw_('fichaInfo', { codigo }); if (j && j.ok) { info = j.link; recs = j.recrutadores || []; } else erro = (j && j.error) || 'Link inválido.'; } catch (e) { erro = e.message; }
  const sel = (name, ops, ph) => `<select class="input" name="${name}" required><option value="">—</option>${ops.map(o => `<option>${o}</option>`).join('')}</select>`;
  document.documentElement.dataset.theme = 'light';
  document.title = 'Vem ser GRC · Ficha do candidato';
  const MARCAS = [['r-center-supermercados-branco.png', 'R Center Supermercados'], ['torra-atacadista-branco.png', 'Torra Atacadista'], ['super-fraldas-branco.png', 'Super Fraldas'], ['r-center-casa-construcao-branco.png', 'R Center Casa & Construção'], ['vita-park-branco.webp', 'Vita Park Mall']];
  const RC = 'https://www.rcentersupermercado.com.br/img/', img = (f, alt, cls) => `<img src="${RC}${f === 'equipe.jpg' ? 'sobre-equipe.jpg' : 'grupo/' + f}" alt="${h(alt)}" class="${cls || ''}" loading="lazy" onerror="this.style.display='none'">`;
  $('#root').innerHTML = `
  <div class="fx">
    <header class="fx-top"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo')}<span>Trabalhe conosco</span></div></header>
    <div class="fx-wrap">
      <section class="fx-hero">
        <div class="fx-hero-txt">
          <small>#indoalemporvoce</small>
          <h1>Vem ser <b>GRC</b></h1>
          <p class="fx-plus">+ OPORTUNIDADE</p>
          <p>Que bom ter você aqui! Falta pouco para darmos o próximo passo no seu processo seletivo.</p>
        </div>
        <div class="fx-hero-img">${img('equipe.jpg', 'Equipe do Grupo R Center')}</div>
      </section>

      <div class="fx-grid">
        <aside class="fx-sobre">
          <h2>Vem ser GRC 💙🧡</h2>
          <p>Há mais de <b>40 anos</b>, o Grupo R Center faz parte da história do Ceará, construindo uma trajetória marcada por crescimento, credibilidade, inovação e, principalmente, <b>por pessoas</b>.</p>
          <p>Buscamos talentos com vontade de aprender, crescer e fazer parte dessa história. Aqui, cada pessoa tem a oportunidade de desenvolver o seu potencial.</p>
          <div class="fx-passos">
            <div><i>1</i><span><b>Preencha a ficha</b>Leva menos de 2 minutos.</span></div>
            <div><i>2</i><span><b>O RH recebe na hora</b>Seus dados chegam direto para a equipe.</span></div>
            <div><i>3</i><span><b>Entramos em contato</b>Fique de olho no seu WhatsApp.</span></div>
          </div>
        </aside>

        <form class="fx-card" id="fiForm" autocomplete="on">
        ${info ? `<div class="fx-card-h"><h2>Ficha do candidato</h2><p>Preencha com atenção, exatamente como está nos seus documentos.</p></div>
        ${info.titulo ? `<div class="fx-vaga"><span>Vaga</span><b>${h(info.titulo)}</b></div>` : ''}
        ${recs.length ? `<div class="field"><label>Quem do RH falou com você?</label><select class="input" name="rec" required><option value="">Selecione o(a) recrutador(a)</option>${recs.map(x => `<option>${h(x)}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>Nome completo</label><input class="input" name="nome" required autocomplete="name" placeholder="Como está no documento"></div>
        <div class="field"><label>Nome completo da mãe</label><input class="input" name="mae" required placeholder="Como está no documento"></div>
        <div class="row2"><div class="field"><label>CPF</label><input class="input" name="cpf" required inputmode="numeric" maxlength="14" placeholder="000.000.000-00"><small id="cpfMsg" class="fi-cpf"></small></div>
        <div class="field"><label>Data de nascimento</label><input class="input" name="nasc" type="date" required></div></div>
        ${info.titulo ? '' : `<div class="field"><label>Vaga de interesse (opcional)</label><input class="input" name="vagaI" maxlength="80" placeholder="Ex.: Operador de caixa, Repositor…"></div>`}
        <div class="field"><label>WhatsApp (opcional)</label><input class="input" name="tel" inputmode="tel" autocomplete="tel" placeholder="(85) 90000-0000"></div>
        <div class="fi-sec">Fardamento</div>
        <div class="fi-farda"><div class="field"><label>Blusa</label>${sel('blusa', FICHA_BLUSA, 'Tamanho')}</div><div class="field"><label>Calça</label>${sel('calca', FICHA_CALCA, 'Tamanho')}</div><div class="field"><label>Bota / calçado</label>${sel('bota', FICHA_BOTA, 'Número')}</div></div>
        <div id="fiErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div>
        <button class="btn primary block fx-btn" type="submit">Enviar meus dados</button>
        <p class="fx-lgpd">🔒 Seus dados serão usados somente pelo RH do Grupo R Center para o processo seletivo e a admissão, conforme a Lei Geral de Proteção de Dados (LGPD).</p>`
        : `<div class="fx-card-h"><h2>Link indisponível</h2></div><div class="badge b-bad" style="display:flex;padding:10px 12px;margin:10px 0 16px;white-space:normal">${h(erro)}</div><p class="muted">Peça um novo link ao RH.</p>`}
        </form>
      </div>
    </div>

    <section class="fx-marcas">
      <div class="fx-wrap">
        <h3>Nossas marcas</h3>
        <div class="fx-logos">${MARCAS.map(([f, n]) => `<div title="${h(n)}">${img(f, n)}</div>`).join('')}</div>
      </div>
    </section>
    <footer class="fx-rodape"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo-sm')}<span>© ${new Date().getFullYear()} Grupo R Center · Indo além por você</span></div></footer>
  </div>`;
  const f = $('#fiForm'); if (!info) return;
  const cpfMsg = $('#cpfMsg');
  const cpfCheca = fim => {
    const d = f.cpf.value.replace(/\D/g, ''), ok = cpfOk_(d), mostra = d.length === 11 || (fim && d.length);
    f.cpf.classList.toggle('bad', !!mostra && !ok); f.cpf.classList.toggle('ok', ok);
    cpfMsg.className = 'fi-cpf ' + (mostra ? (ok ? 'ok' : 'bad') : '');
    cpfMsg.textContent = !mostra ? '' : ok ? '✓ CPF válido' : d.length < 11 ? 'CPF incompleto — faltam ' + (11 - d.length) + ' número(s)' : 'CPF inválido. Confira os números.';
    f.cpf.setCustomValidity(mostra && !ok ? 'CPF inválido. Confira os números.' : '');
  };
  f.cpf.addEventListener('input', () => { const d = f.cpf.value.replace(/\D/g, '').slice(0, 11); f.cpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); cpfCheca(false); });
  f.cpf.addEventListener('blur', () => cpfCheca(true));
  f.tel.addEventListener('input', () => { const d = f.tel.value.replace(/\D/g, '').slice(0, 11); f.tel.value = d.length > 6 ? d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3') : d.length > 2 ? d.replace(/(\d{2})(\d+)/, '($1) $2') : d; });
  f.onsubmit = async e => {
    e.preventDefault();
    const err = $('#fiErr'), btn = $('button[type=submit]', f); err.classList.add('hidden');
    const d = { nome: f.nome.value, mae: f.mae.value, cpf: f.cpf.value, nasc: f.nasc.value, tel: f.tel.value, blusa: f.blusa.value, calca: f.calca.value, bota: f.bota.value, vaga: info.titulo || (f.vagaI ? f.vagaI.value.trim() : ''), recrutador: f.rec ? f.rec.value : '' };
    const falha = m => { err.textContent = m; err.classList.remove('hidden'); err.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (f.rec && !d.recrutador) return falha('Escolha quem do RH falou com você.');
    if (d.nome.trim().split(/\s+/).length < 2) return falha('Informe o seu nome completo.');
    if (d.mae.trim().split(/\s+/).length < 2) return falha('Informe o nome completo da sua mãe.');
    if (!cpfOk_(d.cpf)) { cpfCheca(true); f.cpf.focus(); return falha('CPF inválido. Confira os números.'); }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const j = await sendRaw_('fichaEnviar', { codigo, data: d });
      if (!j || !j.ok) throw new Error((j && j.error) || 'Não foi possível enviar.');
      f.innerHTML = `<div class="fx-ok"><div class="fx-ok-ic">✓</div><h2>Ficha enviada!</h2><p>Obrigado, <b>${h(d.nome.trim().split(/\s+/)[0])}</b>! O RH do Grupo R Center já recebeu os seus dados e vai entrar em contato em breve.</p><p class="fx-ok-tag">#VemSerGRC 💙🧡</p></div>`;
      f.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch (ex) { falha(ex.message); btn.disabled = false; btn.textContent = 'Enviar meus dados'; }
  };
}
/* ---------------- RH: fichas recebidas ---------------- */
const podeFichas = () => !!(S.user && (isAdmin() || S.user.podeFichas));
const fichaUrl_ = c => { const base = cfgv('siteUrl', '') || (location.origin + location.pathname); return base.replace(/\/+$/, '') + '/ficha.html?ficha=' + c; };
const fichasCache_ = () => { if (!S.fichas) S.fichas = ls.get('grc_fichas', null); return S.fichas; };
const fichasSet_ = j => { S.fichas = { fichas: j.fichas || (S.fichas || {}).fichas || [], links: j.links || (S.fichas || {}).links || [], recrutadores: j.recrutadores || (S.fichas || {}).recrutadores || [] }; ls.set('grc_fichas', S.fichas); };
const fichasNovas = () => ((fichasCache_() || {}).fichas || []).filter(x => !x.visto).length;
const fichaTexto_ = (x, farda) => `*Nome:* ${x.nome}\n*Nome da mãe:* ${x.mae}\n*CPF:* ${cpfFmt(x.cpf)}\n*Data de nascimento:* ${dataBR(x.nasc)}` + (farda ? `\n*Fardamento:* Blusa ${x.blusa} · Calça ${x.calca} · Bota ${x.bota}` : '');
function copiar_(t, msg) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(msg || 'Copiado'), () => { prompt('Copie:', t); }); }
function compartilharFicha_(c, titulo) {
  const url = fichaUrl_(c), txt = `Olá! Para darmos andamento ao seu processo seletivo${titulo ? ' (' + titulo + ')' : ''} no ${cfgv('empresa', CFG.EMPRESA || 'Grupo R Center')}, preencha seus dados neste link: ${url}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
async function pgFichas() {
  setTitle('Fichas de candidatos', 'Dados enviados pelos candidatos pelo link');
  const v = $('#view'), f = getF('fichas');
  const draw = () => {
    const c = fichasCache_();
    if (!c) { v.innerHTML = `<div class="sk" style="height:260px"></div>`; return; }
    const q = norm(f.q || ''), qd = String(f.q || '').replace(/\D/g, '');
    const dia = x => String(x.em || '').slice(0, 10) && new Date(x.em).toLocaleDateString('sv-SE');
    const recsAll = uniq([...(c.recrutadores || []), ...(c.fichas || []).map(x => x.recrutador).filter(Boolean)]);
    const lista = (c.fichas || []).filter(x => (!q || norm(x.nome + ' ' + x.mae + ' ' + (x.titulo || '') + ' ' + (x.recrutador || '')).includes(q) || (qd.length >= 3 && x.cpf.includes(qd)))
      && (!f.rec || (f.rec === '-' ? !x.recrutador : norm(x.recrutador) === norm(f.rec))) && (!f.de || dia(x) >= f.de) && (!f.ate || dia(x) <= f.ate));
    // conferência interna (Escavador / SUB) — mesmo estilo do checklist das contratações
    const ckOk = x => x.esc && x.sub;
    const ckNeg = x => (x.esc && x.escNeg) || (x.sub && x.subNeg);
    const ckN = { esc: lista.filter(x => !x.esc).length, sub: lista.filter(x => !x.sub).length, ok: lista.filter(ckOk).length, neg: lista.filter(ckNeg).length };
    const listaV = lista.filter(x => !f.ck || (f.ck === 'ok' ? ckOk(x) : f.ck === 'neg' ? ckNeg(x) : !x[f.ck]));
    const ckQuem = (x, k) => x[k] ? `${x[k + 'Neg'] ? 'Negativo' : 'OK'}${x[k + 'Por'] ? ' · ' + x[k + 'Por'] : ''} · ${new Date(x[k]).toLocaleDateString('pt-BR')}` : '';
    const ckCls = (x, k) => !x[k] ? '' : x[k + 'Neg'] ? ' danger fi-neg-b' : ' ok';
    const ckIc = (x, k, vazio) => !x[k] ? vazio : ic(x[k + 'Neg'] ? 'alert' : 'check');
    const ckSeg = (x, k, nome) => `<span class="fi-seg"><em>${nome}</em><button class="${!x[k] ? 'on' : ''}" data-ckset="${h(x.id)}|${k}|0">Não visto</button><button class="${x[k] && !x[k + 'Neg'] ? 'on ok' : ''}" data-ckset="${h(x.id)}|${k}|1">OK</button><button class="${x[k] && x[k + 'Neg'] ? 'on neg' : ''}" data-ckset="${h(x.id)}|${k}|2">Negativo</button></span>`;
    const ativos = (c.links || []).filter(l => l.ativo);
    v.innerHTML = `
    <div class="toolbar">
      <div class="input-icon search">${ic('search')}<input class="input" id="fiQ" placeholder="Buscar por nome, mãe, CPF ou vaga" value="${h(f.q || '')}" style="width:100%"></div>
      <select class="input" id="fiRec"><option value="">Recrutador: todos</option>${recsAll.map(x => `<option ${f.rec === x ? 'selected' : ''}>${h(x)}</option>`).join('')}<option value="-" ${f.rec === '-' ? 'selected' : ''}>Sem recrutador</option></select>
      <label class="fi-dt"><span>Preencheu de</span><input class="input" type="date" id="fiDe" value="${h(f.de || '')}" title="Preencheu a partir de"></label>
      <label class="fi-dt"><span>até</span><input class="input" type="date" id="fiAte" value="${h(f.ate || '')}" title="Preencheu até"></label>
      ${f.rec || f.de || f.ate ? `<button class="btn ghost" id="fiLimpa">${ic('eraser')} Limpar</button>` : ''}
      <span class="spacer"></span>
      ${isAdmin() ? `<button class="btn" id="fiAc" title="Quem pode ver as fichas">${ic('shield')} Acesso</button><button class="btn" id="fiRecs" title="Lista de recrutadores do formulário">${ic('users')} Recrutadores</button>` : ''}
      <button class="btn" id="fiLinks">${ic('link')} Links (${ativos.length})</button>
      <button class="btn" id="fiQrG" title="QR Code aberto para qualquer vaga e qualquer pessoa">${ic('grid')} QR Code geral</button>
      <button class="btn primary" id="fiNovo">${ic('share')} Mandar link ao candidato</button>
    </div>
    <div class="chips ck-chips fi-ck" id="fiCk"><span class="ck-chips-t">Conferência</span><span class="chip ${!f.ck ? 'on' : ''}" data-c="">Todas</span><span class="chip ${f.ck === 'esc' ? 'on' : ''}" data-c="esc">Falta Escavador <span class="n">${ckN.esc}</span></span><span class="chip ${f.ck === 'sub' ? 'on' : ''}" data-c="sub">Falta SUB <span class="n">${ckN.sub}</span></span><span class="chip fi-chip-neg ${f.ck === 'neg' ? 'on' : ''}" data-c="neg">${ic('alert')} Negativos <span class="n">${ckN.neg}</span></span><span class="chip ${f.ck === 'ok' ? 'on' : ''}" data-c="ok">${ic('check')} Concluídas <span class="n">${ckN.ok}</span></span></div>
    ${listaV.length ? `<div class="card fi-lista">${listaV.map(x => `
      <details class="fi-row${x.visto ? '' : ' nova'}${ckNeg(x) ? ' fi-neg' : ''}"${S.fiAberta === x.id ? ' open' : ''} data-fid="${h(x.id)}">
        <summary>
          <span class="fi-r-n"><b class="fi-nome">${h(x.nome)}</b>${x.visto ? '' : '<span class="badge b-acc">nova</span>'}<small>${x.recrutador ? `<b style="color:var(--accent)">${h(x.recrutador)}</b> · ` : ''}${x.titulo ? h(x.titulo) + ' · ' : ''}${new Date(x.em).toLocaleDateString('pt-BR')} ${new Date(x.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></span>
          <span class="fi-r-d"><small>CPF</small>${h(cpfFmt(x.cpf))}</span>
          <span class="fi-r-d fi-r-nasc"><small>Nascimento</small>${h(dataBR(x.nasc))}</span>
          <span class="fi-r-a"><button class="btn sm fi-ck-b${ckCls(x, 'esc')}" data-esc="${h(x.id)}" title="${x.esc ? h(ckQuem(x, 'esc')) + ' · clique para abrir de novo' : 'Abrir o Escavador pelo CPF (marca como visto)'}">${ckIc(x, 'esc', ic('search'))} Escavador</button><button class="btn sm fi-ck-b${ckCls(x, 'sub')}" data-sub="${h(x.id)}" title="${x.sub ? h(ckQuem(x, 'sub')) + ' · clique para mudar' : 'Marcar SUB como visto'} (clique: OK → Negativo → Não visto)">${ckIc(x, 'sub', '')} SUB</button><button class="btn primary sm" data-cpall="${h(x.id)}" title="Copiar dados">${ic('copy')}<span class="fi-r-l"> Copiar</span></button><button class="btn sm" data-cpfar="${h(x.id)}" title="Copiar com fardamento">${ic('copy')}<span class="fi-r-l"> + farda</span></button><button class="btn sm ghost icon" data-del="${h(x.id)}" title="Apagar ficha">${ic('trash')}</button><i class="fi-r-ch">${ic('chevron')}</i></span>
        </summary>
        <div class="fi-campos fi-det">
          ${[['Nome completo', x.nome], ['Nome da mãe', x.mae], ['CPF', cpfFmt(x.cpf)], ['Data de nascimento', dataBR(x.nasc)]].map(([l, val]) => `<div class="fi-c"><span>${l}</span><b>${h(val)}</b><button class="btn sm ghost icon" data-cp="${h(val)}" title="Copiar ${l.toLowerCase()}">${ic('copy')}</button></div>`).join('')}
          <div class="fi-c"><span>Fardamento</span><b>Blusa ${h(x.blusa)} · Calça ${h(x.calca)} · Bota ${h(x.bota)}</b></div>
          ${x.tel ? `<div class="fi-c"><span>WhatsApp</span><b><a href="https://wa.me/55${h(String(x.tel).replace(/^55(?=\d{10,11}$)/, ''))}" target="_blank" rel="noopener" style="color:var(--accent)">${h(telFmt(x.tel))}</a></b></div>` : ''}
          <div class="fi-c fi-conf"><span>Conferência</span><div class="fi-segs">${ckSeg(x, 'esc', 'Escavador')}${ckSeg(x, 'sub', 'SUB')}</div>${x.esc || x.sub ? `<small class="faint">${x.esc ? 'Escavador: ' + h(ckQuem(x, 'esc')) : ''}${x.esc && x.sub ? ' · ' : ''}${x.sub ? 'SUB: ' + h(ckQuem(x, 'sub')) : ''}</small>` : ''}</div>
          <div class="fi-acts fi-mob"><button class="btn sm" data-cpfar="${h(x.id)}">${ic('copy')} Copiar com fardamento</button><button class="btn sm ghost" data-del="${h(x.id)}" style="color:var(--bad)">${ic('trash')} Apagar</button></div>
        </div>
      </details>`).join('')}</div>`
      : `<div class="card empty" style="text-align:center;padding:30px"><b>${(c.fichas || []).length ? (f.ck && lista.length ? 'Nenhuma ficha neste filtro de conferência' : 'Nenhuma ficha encontrada') : 'Nenhuma ficha recebida ainda'}</b><p class="muted">Clique em <b>Mandar link ao candidato</b>, envie pelo WhatsApp e a ficha aparece aqui assim que ele preencher.</p></div>`}
    <div class="faint" style="font-size:12px;margin-top:10px"><span id="fiCont"></span> · As fichas ficam guardadas por 180 dias e depois são apagadas automaticamente (LGPD).</div>`;
    const qi = $('#fiQ'); qi.oninput = () => { f.q = qi.value; saveF(); draw(); const e2 = $('#fiQ'); e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); };
    [['fiRec', 'rec'], ['fiDe', 'de'], ['fiAte', 'ate']].forEach(([id, k]) => { $('#' + id).onchange = e => { f[k] = e.target.value; saveF(); draw(); }; });
    if ($('#fiLimpa')) $('#fiLimpa').onclick = () => { f.rec = ''; f.de = ''; f.ate = ''; saveF(); draw(); };
    if ($('#fiRecs')) $('#fiRecs').onclick = () => openFichaRecs(draw);
    const cont = $('#fiCont'); if (cont) cont.textContent = listaV.length + ' ficha(s)';
    $$('#fiCk .chip').forEach(ch => ch.onclick = () => { f.ck = ch.dataset.c; saveF(); draw(); });
    $('#fiNovo').onclick = () => openFichaLink(draw);
    $('#fiQrG').onclick = e => run(e.currentTarget, async () => {
      let g = ((fichasCache_() || {}).links || []).find(l => l.ativo && l.geral);
      if (!g) { const j = await api('fichaLinkCriar', { titulo: '', geral: true }); fichasSet_({ links: j.links }); g = j.link; draw(); }
      openFichaQR(g.codigo, '', true);
    });
    $('#fiLinks').onclick = () => openFichaLinks(draw);
    if ($('#fiAc')) $('#fiAc').onclick = openFichaAcesso;
    $$('[data-cp]').forEach(b => b.onclick = () => copiar_(b.dataset.cp));
    $$('.fi-row summary .btn').forEach(b => b.addEventListener('click', e => e.preventDefault()));
    $$('.fi-row').forEach(d => d.ontoggle = () => { if (d.open) { S.fiAberta = d.dataset.fid; $$('.fi-row[open]').forEach(o => { if (o !== d) o.open = false; }); } else if (S.fiAberta === d.dataset.fid) S.fiAberta = null; });
    const por = id => (fichasCache_().fichas || []).find(x => x.id === id);
    $$('[data-cpall]').forEach(b => b.onclick = () => copiar_(fichaTexto_(por(b.dataset.cpall)), 'Dados copiados. É só colar no WhatsApp.'));
    $$('[data-cpfar]').forEach(b => b.onclick = () => copiar_(fichaTexto_(por(b.dataset.cpfar), true), 'Dados copiados. É só colar no WhatsApp.'));
    // marca Escavador / SUB (na tela na hora; servidor em segundo plano)
    const marca = async (id, campo, valor, neg) => {
      const ant = fichasCache_().fichas;
      fichasSet_({ fichas: ant.map(y => y.id === id ? Object.assign({}, y, { [campo]: valor ? new Date().toISOString() : '', [campo + 'Por']: valor ? (S.user && S.user.nome) || '' : '', [campo + 'Neg']: !!(valor && neg) }) : y) }); draw();
      try { fichasSet_(await api('fichaChk', { id, campo, valor: !!valor, neg: !!(valor && neg) }, { silent: true })); if (!$('.overlay')) draw(); }
      catch (e) { fichasSet_({ fichas: ant }); draw(); toast('Não foi possível salvar a conferência: ' + e.message, true); }
    };
    $$('[data-esc]').forEach(b => b.onclick = () => {
      const x = por(b.dataset.esc); if (!x) return;
      window.open('https://www.escavador.com/busca?q=' + encodeURIComponent(String(x.cpf || '').replace(/\D/g, '')), '_blank', 'noopener');
      if (!x.esc) marca(x.id, 'esc', true);
    });
    $$('[data-sub]').forEach(b => b.onclick = () => { const x = por(b.dataset.sub); if (!x) return; if (!x.sub) marca(x.id, 'sub', true, false); else if (!x.subNeg) marca(x.id, 'sub', true, true); else marca(x.id, 'sub', false); });
    $$('[data-ckset]').forEach(b => b.onclick = () => { const [id, k, v] = b.dataset.ckset.split('|'); marca(id, k, v !== '0', v === '2'); });
    $$('[data-del]').forEach(b => b.onclick = async () => {
      const x = por(b.dataset.del); if (!x || !await confirmBox(`Apagar a ficha de <b>${h(x.nome)}</b>?`, 'Apagar', true)) return;
      fichasSet_({ fichas: fichasCache_().fichas.filter(y => y.id !== x.id) }); draw(); updateShell();
      try { fichasSet_(await api('fichaApagar', { id: x.id }, { silent: true })); } catch (e) { toast(e.message, true); }
    });
  };
  draw();
  const rt = S.rt;
  try {
    const j = await api('fichasList', {}, { silent: true }); if (rt !== S.rt) return;
    fichasSet_(j); if (!$('.overlay')) draw();
    const novas = (j.fichas || []).filter(x => !x.visto).map(x => x.id);
    if (novas.length) api('fichaMarcar', { ids: novas }, { silent: true }).then(k => { fichasSet_(k); updateShell(); }).catch(() => {});
  } catch (e) { if (!fichasCache_()) v.innerHTML = `<div class="card muted">${h(e.message)}</div>`; else toast(e.message, true); }
}
// quem (além dos administradores) pode ver as fichas — independe do perfil
function openFichaAcesso() {
  modal({
    title: 'Acesso às Fichas de candidatos', icon: 'shield',
    body: `<p class="muted" style="margin-top:0">Administradores sempre têm acesso. Marque quem mais pode ver as fichas, mandar o link e copiar os dados, seja qual for o tipo de acesso da pessoa.</p><div id="faL"><div class="sk" style="height:80px"></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="faOk">Salvar</button>`,
    onMount: async m => {
      const el = $('#faL', m.el);
      try {
        const us = (usersCache_() || await usersBuscar_()).filter(u => u.perfil !== 'ADMIN' && u.ativo);
        const ids = (await api('fichaAcesso', {}, { silent: true })).ids || [];
        if (!$('#faL', m.el)) return;
        el.innerHTML = us.length ? chipPicker('fac', us.map(u => u.id), ids.join(', ')) : '<span class="muted">Nenhum usuário sem perfil de administrador.</span>';
        bindPickers(el);
        $$('[data-picker=fac] .chip', el).forEach(c => { const u = us.find(x => x.id === c.dataset.v); c.textContent = u ? u.nome + (u.cargo ? ' · ' + u.cargo : '') : c.dataset.v; });
      } catch (e) { el.innerHTML = `<span class="muted">${h(e.message)}</span>`; }
      $('#faOk', m.el).onclick = ev => run(ev.currentTarget, async () => { await api('setFichaAcesso', { ids: splitMulti(pickVal(el, 'fac')) }); m.close(); toast('Acesso salvo. A pessoa vê as Fichas ao entrar de novo ou atualizar a página.'); });
    }
  });
}
// QR Code (gerado no próprio aparelho)
let qrLib_ = null;
const qrCarregar_ = () => qrLib_ || (qrLib_ = new Promise((ok, erro) => { if (window.qrcode) return ok(); const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = () => ok(); s.onerror = () => { qrLib_ = null; erro(new Error('Não foi possível gerar o QR Code. Verifique a internet.')); }; document.head.appendChild(s); }));
function qrCanvas_(texto, px) {
  const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(), m = 4, cel = Math.max(4, Math.floor(px / (n + m * 2))), tam = cel * (n + m * 2);
  const cv = document.createElement('canvas'); cv.width = cv.height = tam; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, tam, tam); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * cel, (r + m) * cel, cel, cel);
  return cv;
}
// cartaz para imprimir / baixar: título, QR e instruções
function qrCartaz_(url, titulo) {
  const W = 1240, H = 1754, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#14204a'; g.fillRect(0, 0, W, 230);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 64px Arial'; g.fillText(cfgv('empresa', CFG.EMPRESA || 'Grupo R Center'), W / 2, 115); g.font = '38px Arial'; g.fillText('Recursos Humanos', W / 2, 175);
  g.fillStyle = '#14204a'; g.font = 'bold 72px Arial'; g.fillText('Ficha do candidato', W / 2, 360);
  if (titulo) { g.font = '44px Arial'; g.fillStyle = '#333'; g.fillText(titulo.slice(0, 48), W / 2, 435); }
  const qr = qrCanvas_(url, 860); g.drawImage(qr, (W - qr.width) / 2, 480);
  g.fillStyle = '#222'; g.font = 'bold 48px Arial'; g.fillText('Aponte a câmera do celular para o código', W / 2, 1450);
  g.font = '40px Arial'; g.fillStyle = '#444'; g.fillText('e preencha seus dados para o processo seletivo.', W / 2, 1515);
  g.font = '28px Arial'; g.fillStyle = '#888'; g.fillText(url, W / 2, 1640);
  return cv;
}
async function openFichaQR(codigo, titulo, geral) {
  const url = fichaUrl_(codigo);
  modal({
    title: 'QR Code da ficha', icon: 'grid',
    body: `<p class="muted" style="margin-top:0">${geral ? '<b style="color:var(--text)">QR Code geral:</b> fica sempre aberto, serve para qualquer vaga e para quantas pessoas quiserem se cadastrar. O candidato escolhe o recrutador e pode informar a vaga de interesse.' : 'O candidato aponta a câmera do celular, abre a ficha e preenche.'} Dá para imprimir e deixar na loja ou mostrar na tela.</p><div id="qrBox" style="display:flex;justify-content:center;padding:8px"><div class="spin"></div></div>${titulo ? `<div style="text-align:center;font-weight:700">${h(titulo)}</div>` : ''}`,
    foot: `<button class="btn" data-close>Fechar</button><button class="btn" id="qrBaixar">${ic('download')} Baixar imagem</button><button class="btn primary" id="qrImp">${ic('file')} Imprimir</button>`,
    onMount: async m => {
      try {
        await qrCarregar_();
        const cv = qrCanvas_(url, 320); cv.style.cssText = 'width:260px;height:260px;border-radius:12px;image-rendering:pixelated';
        $('#qrBox', m.el).innerHTML = ''; $('#qrBox', m.el).appendChild(cv);
        const nome = 'qrcode_ficha' + (titulo ? '_' + norm(titulo).toLowerCase().replace(/[^a-z0-9]+/g, '_') : '') + '.png';
        $('#qrBaixar', m.el).onclick = () => { const a = document.createElement('a'); a.href = qrCartaz_(url, titulo).toDataURL('image/png'); a.download = nome; a.click(); };
        $('#qrImp', m.el).onclick = () => { const img = qrCartaz_(url, titulo).toDataURL('image/png'); const w = window.open('', '_blank'); if (!w) return toast('Libere as janelas pop-up para imprimir.', true); w.document.write(`<html><head><title>QR Code · Ficha do candidato</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${img}" onload="setTimeout(function(){print()},300)"></body></html>`); w.document.close(); };
      } catch (e) { $('#qrBox', m.el).innerHTML = `<span class="muted">${h(e.message)}</span>`; }
    }
  });
}
// lista de recrutadores que aparece no formulário
function openFichaRecs(done) {
  const L = ((fichasCache_() || {}).recrutadores || []).slice();
  modal({
    title: 'Recrutadores do formulário', icon: 'users',
    body: `<p class="muted" style="margin-top:0">O candidato escolhe um destes nomes ao preencher a ficha. Um nome por linha.</p><textarea class="input" id="frL" rows="7">${h(L.join('\n'))}</textarea>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="frOk">Salvar</button>`,
    onMount: m => {
      $('#frOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const nova = $('#frL', m.el).value.split('\n').map(x => x.trim()).filter(Boolean);
        if (!nova.length) throw new Error('Informe ao menos um nome.');
        const j = await api('setFichaRecrut', { lista: nova }); fichasSet_({ recrutadores: j.recrutadores }); m.close(); toast('Lista salva'); if (done) done();
      });
    }
  });
}
function openFichaLink(done) {
  modal({
    title: 'Mandar link ao candidato', icon: 'share',
    body: `<p class="muted" style="margin-top:0">O candidato abre o link, preenche nome completo, nome da mãe, CPF, data de nascimento e fardamento, e a ficha aparece aqui na hora.</p>
      <div class="field"><label>Vaga / observação (opcional)</label><input class="input" id="flT" placeholder="Ex.: Operador de caixa · Eusébio"></div>
      <div id="flRes"></div>`,
    foot: `<button class="btn" data-close>Fechar</button><button class="btn primary" id="flOk">${ic('link')} Gerar link</button>`,
    onMount: m => {
      $('#flOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const j = await api('fichaLinkCriar', { titulo: $('#flT', m.el).value.trim() });
        fichasSet_({ links: j.links });
        const l = j.link, url = fichaUrl_(l.codigo);
        $('#flRes', m.el).innerHTML = `<div class="card mt" style="border-color:var(--accent)"><b>${ic('check')} Link pronto</b><div class="mono" style="font-size:12.5px;word-break:break-all;margin:8px 0">${h(url)}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="flWa">${ic('share')} Enviar pelo WhatsApp</button><button class="btn" id="flCp">${ic('copy')} Copiar link</button><button class="btn" id="flQr">${ic('grid')} QR Code</button></div><div class="faint" style="font-size:12px;margin-top:8px">O mesmo link pode ser mandado para vários candidatos, ou impresso como QR Code.</div></div>`;
        $('#flWa', m.el).onclick = () => compartilharFicha_(l.codigo, l.titulo);
        $('#flCp', m.el).onclick = () => copiar_(url, 'Link copiado');
        $('#flQr', m.el).onclick = () => openFichaQR(l.codigo, l.titulo);
        if (done) done();
      });
    }
  });
}
function openFichaLinks(done) {
  const L = (fichasCache_() || {}).links || [], F = (fichasCache_() || {}).fichas || [];
  modal({
    title: 'Links de ficha', icon: 'link', wide: true,
    body: L.length ? `<div class="alist">${L.map(l => `<div class="aitem" style="align-items:center"><div style="flex:1;min-width:0"><b>${h(l.geral ? 'QR Code geral (qualquer vaga)' : (l.titulo || 'Link sem vaga'))}</b> ${l.ativo ? '' : '<span class="badge">desativado</span>'}<span>${h(l.criadoPor)} · ${new Date(l.em).toLocaleDateString('pt-BR')} · ${F.filter(x => x.link === l.codigo).length} ficha(s)</span></div>
      ${l.ativo ? `<button class="btn sm" data-wa="${h(l.codigo)}" title="WhatsApp">${ic('share')}</button><button class="btn sm" data-cl="${h(l.codigo)}" title="Copiar link">${ic('copy')}</button><button class="btn sm" data-qr="${h(l.codigo)}" title="QR Code">${ic('grid')}</button><button class="btn sm ghost" data-off="${h(l.codigo)}">Desativar</button>` : ''}</div>`).join('')}</div>` : '<p class="muted">Nenhum link criado ainda.</p>',
    foot: `<button class="btn" data-close>Fechar</button>`,
    onMount: m => {
      $$('[data-wa]', m.el).forEach(b => b.onclick = () => { const l = L.find(x => x.codigo === b.dataset.wa); compartilharFicha_(l.codigo, l.titulo); });
      $$('[data-cl]', m.el).forEach(b => b.onclick = () => copiar_(fichaUrl_(b.dataset.cl), 'Link copiado'));
      $$('[data-qr]', m.el).forEach(b => b.onclick = () => { const l = L.find(x => x.codigo === b.dataset.qr); openFichaQR(l.codigo, l.titulo, l.geral); });
      $$('[data-off]', m.el).forEach(b => b.onclick = async () => { if (!await confirmBox('Desativar este link? Quem abrir depois não consegue mais enviar.', 'Desativar', true)) return; const j = await api('fichaLinkDesativar', { codigo: b.dataset.off }); fichasSet_({ links: j.links }); m.close(); openFichaLinks(done); if (done) done(); });
    }
  });
}
/* ================= TESTES DE AVALIAÇÃO (DISC · forças · situações de loja · fit cultural) ================= */
// Questionários próprios do Grupo R Center (não reproduzem testes comerciais). Ferramenta de apoio à entrevista.
const TESTE_INFO = {
  disc: { nome: 'Perfil comportamental', curto: 'DISC', icone: '🧭', min: 6, cor: '#3b82f6', desc: 'Como você costuma agir, decidir e se relacionar no dia a dia.' },
  forcas: { nome: 'Forças pessoais', curto: 'Forças', icone: '💪', min: 7, cor: '#16a34a', desc: 'Descubra as qualidades que mais aparecem em você.' },
  situacional: { nome: 'Jornada GRC', curto: 'Jogo', icone: '🗺️', min: 12, cor: '#ff5a14', desc: 'Jogo de aventura: crie seu personagem, explore as cidades do Grupo R Center e conquiste os selos.' },
  fit: { nome: 'Fit cultural', curto: 'Fit cultural', icone: '💙', min: 12, cor: '#0a0d7c', desc: 'O quanto você se identifica com os nossos valores. Termina com 3 perguntas para responder com as suas palavras.' }
};
const TESTE_ORDEM = ['disc', 'forcas', 'situacional', 'fit'];
// ---- DISC: escolha a frase que MAIS combina com você (D, I, S, C)
const DISC_Q = [
  ['Gosto de assumir o controle e decidir rápido.', 'Gosto de conversar e animar as pessoas.', 'Gosto de ajudar e manter o clima tranquilo.', 'Gosto de fazer tudo certinho, seguindo as regras.'],
  ['Sou direto(a) e objetivo(a).', 'Sou comunicativo(a) e expansivo(a).', 'Sou paciente e calmo(a).', 'Sou detalhista e cuidadoso(a).'],
  ['Diante de um problema, parto logo para a ação.', 'Diante de um problema, chamo o pessoal para pensar junto.', 'Diante de um problema, mantenho a calma e sigo passo a passo.', 'Diante de um problema, analiso as informações antes de agir.'],
  ['Me motiva bater metas e vencer desafios.', 'Me motiva ser reconhecido(a) e conhecer gente nova.', 'Me motiva ter estabilidade e um time unido.', 'Me motiva fazer um trabalho sem erros e bem feito.'],
  ['No trabalho, as pessoas me veem como determinado(a).', 'No trabalho, as pessoas me veem como alegre e simpático(a).', 'No trabalho, as pessoas me veem como confiável e prestativo(a).', 'No trabalho, as pessoas me veem como organizado(a) e preciso(a).'],
  ['Quando discordo, falo na hora.', 'Quando discordo, tento convencer com bom humor.', 'Quando discordo, evito conflito e espero o melhor momento.', 'Quando discordo, mostro fatos e dados.'],
  ['Prefiro tarefas com desafio e autonomia.', 'Prefiro tarefas com contato com pessoas.', 'Prefiro tarefas com rotina definida.', 'Prefiro tarefas que exigem atenção a detalhes.'],
  ['Sob pressão, fico mais exigente.', 'Sob pressão, falo mais e busco apoio.', 'Sob pressão, fico mais quieto(a) e cumpro o combinado.', 'Sob pressão, fico mais crítico(a) e reviso tudo.'],
  ['Meu ritmo é rápido.', 'Meu ritmo é animado e variado.', 'Meu ritmo é constante.', 'Meu ritmo é cuidadoso.'],
  ['Valorizo resultado.', 'Valorizo entusiasmo.', 'Valorizo lealdade.', 'Valorizo qualidade.'],
  ['Em um time, costumo liderar.', 'Em um time, costumo motivar.', 'Em um time, costumo apoiar.', 'Em um time, costumo organizar.'],
  ['Mudanças me animam se trouxerem resultado.', 'Mudanças me animam se forem novidade.', 'Mudanças me deixam inseguro(a) se forem de repente.', 'Mudanças precisam ser bem explicadas para mim.'],
  ['Sou competitivo(a).', 'Sou otimista.', 'Sou compreensivo(a).', 'Sou disciplinado(a).'],
  ['Ao receber uma tarefa, quero saber o objetivo final.', 'Ao receber uma tarefa, quero saber quem vai participar.', 'Ao receber uma tarefa, quero saber como fazer passo a passo.', 'Ao receber uma tarefa, quero saber qual é o padrão de qualidade.'],
  ['Falo de forma firme.', 'Falo de forma entusiasmada.', 'Falo de forma tranquila.', 'Falo de forma precisa.'],
  ['Me incomoda gente lenta e indecisa.', 'Me incomoda ambiente frio e sem conversa.', 'Me incomoda briga e grosseria.', 'Me incomoda bagunça e falta de padrão.'],
  ['Tomo decisões pensando no resultado.', 'Tomo decisões pensando nas pessoas e no clima.', 'Tomo decisões depois de ouvir todos.', 'Tomo decisões depois de checar os dados.'],
  ['Sou ousado(a).', 'Sou persuasivo(a).', 'Sou leal.', 'Sou cauteloso(a).'],
  ['No fim do dia, fico feliz se resolvi muita coisa.', 'No fim do dia, fico feliz se o dia foi divertido.', 'No fim do dia, fico feliz se ajudei alguém.', 'No fim do dia, fico feliz se não houve nenhum erro.'],
  ['Prefiro ser cobrado(a) por metas.', 'Prefiro ser cobrado(a) com elogios e incentivo.', 'Prefiro ser cobrado(a) com calma e clareza.', 'Prefiro ser cobrado(a) com critérios bem definidos.'],
  ['Aprendo melhor fazendo na prática.', 'Aprendo melhor trocando ideia com as pessoas.', 'Aprendo melhor com alguém me acompanhando.', 'Aprendo melhor lendo e seguindo instruções.'],
  ['Sou independente.', 'Sou sociável.', 'Sou colaborativo(a).', 'Sou analítico(a).'],
  ['Quando algo dá errado, busco uma solução rápida.', 'Quando algo dá errado, tento levantar o ânimo do grupo.', 'Quando algo dá errado, ajudo a resolver sem alarde.', 'Quando algo dá errado, investigo a causa.'],
  ['Meu ponto forte é a iniciativa.', 'Meu ponto forte é a comunicação.', 'Meu ponto forte é a constância.', 'Meu ponto forte é a precisão.']
];
const DISC_FATOR = {
  D: { nome: 'Dominância', cor: '#ef4444', resumo: 'Perfil executor: direto, decidido, movido a desafios e resultados.', fortes: 'iniciativa, rapidez na tomada de decisão, foco em resultado, coragem para assumir responsabilidades', atencao: 'impaciência, pouca escuta, tendência a atropelar processos e pessoas sob pressão', gestao: 'dar metas claras, autonomia e desafios; combinar limites e a importância do trabalho em equipe', funcoes: 'liderança operacional, encarregaturas, vendas com meta, abertura e fechamento de loja' },
  I: { nome: 'Influência', cor: '#f59e0b', resumo: 'Perfil comunicador: sociável, otimista, motiva e conecta pessoas.', fortes: 'comunicação, simpatia no atendimento, entusiasmo, facilidade de se relacionar e de convencer', atencao: 'dispersão, dificuldade com rotinas repetitivas e com detalhes, promessas sem acompanhamento', gestao: 'reconhecimento frequente, contato com pessoas, combinados claros e acompanhamento de prazos', funcoes: 'atendimento ao cliente, frente de loja, promoção e degustação, balcões de atendimento' },
  S: { nome: 'Estabilidade', cor: '#16a34a', resumo: 'Perfil apoiador: calmo, paciente, leal e colaborativo.', fortes: 'constância, confiabilidade, paciência, espírito de equipe e boa convivência', atencao: 'resistência a mudanças bruscas, dificuldade de dizer não e de se posicionar em conflitos', gestao: 'explicar mudanças com antecedência, dar segurança, rotina definida e reconhecimento pela dedicação', funcoes: 'operação de caixa, reposição, padaria, açougue, depósito e funções de rotina' },
  C: { nome: 'Conformidade', cor: '#3b82f6', resumo: 'Perfil analítico: organizado, preciso e cuidadoso com padrões.', fortes: 'atenção a detalhes, organização, qualidade, cumprimento de normas e procedimentos', atencao: 'perfeccionismo, lentidão para decidir sem informação completa, autocrítica e crítica excessivas', gestao: 'dar padrões e critérios claros, tempo para fazer bem feito e feedback objetivo', funcoes: 'conferência, prevenção de perdas, fiscal de caixa, CPD, controle de estoque e validade' }
};
// ---- Forças pessoais (24 forças em 6 virtudes), 2 frases cada, escala 1 a 5
const FORCAS = [
  ['Criatividade', 'Sabedoria', 'Encontra jeitos novos e práticos de resolver as coisas.', ['Costumo ter ideias diferentes para resolver problemas.', 'Gosto de inventar jeitos melhores de fazer as tarefas.']],
  ['Curiosidade', 'Sabedoria', 'Tem interesse genuíno em aprender e explorar coisas novas.', ['Gosto de entender como as coisas funcionam.', 'Faço perguntas quando algo é novo para mim.']],
  ['Pensamento crítico', 'Sabedoria', 'Analisa antes de concluir e considera diferentes pontos de vista.', ['Penso bem antes de tomar uma decisão.', 'Consigo mudar de opinião quando vejo bons argumentos.']],
  ['Amor ao aprendizado', 'Sabedoria', 'Busca se desenvolver e aprender coisas novas por conta própria.', ['Gosto de fazer cursos e treinamentos.', 'Fico feliz quando aprendo algo novo no trabalho.']],
  ['Perspectiva', 'Sabedoria', 'Enxerga o todo e costuma dar bons conselhos.', ['As pessoas costumam me pedir conselhos.', 'Consigo ver o lado bom e o lado ruim de uma situação.']],
  ['Coragem', 'Coragem', 'Enfrenta desafios e defende o que é certo, mesmo com medo.', ['Falo o que é certo mesmo quando é difícil.', 'Enfrento desafios novos mesmo sentindo medo.']],
  ['Perseverança', 'Coragem', 'Termina o que começa e não desiste diante das dificuldades.', ['Termino o que começo, mesmo quando fica difícil.', 'Não desisto fácil quando algo dá errado.']],
  ['Honestidade', 'Coragem', 'É verdadeiro(a), assume os próprios erros e age com transparência.', ['Assumo meus erros sem colocar a culpa nos outros.', 'Prefiro falar a verdade, mesmo que me prejudique.']],
  ['Entusiasmo', 'Coragem', 'Tem energia, disposição e anima o ambiente.', ['Acordo com disposição para trabalhar.', 'Costumo fazer as coisas com energia e vontade.']],
  ['Afeto', 'Humanidade', 'Valoriza relações próximas e verdadeiras.', ['Cuido bem das pessoas que são importantes para mim.', 'Demonstro carinho e consideração pelas pessoas.']],
  ['Bondade', 'Humanidade', 'Gosta de ajudar e é generoso(a) com as pessoas.', ['Gosto de ajudar as pessoas sem esperar nada em troca.', 'Me preocupo quando vejo alguém passando por dificuldade.']],
  ['Inteligência social', 'Humanidade', 'Percebe o que os outros sentem e sabe se adaptar.', ['Percebo quando alguém está chateado, mesmo sem falar.', 'Sei como agir em diferentes situações com pessoas.']],
  ['Trabalho em equipe', 'Justiça', 'Colabora, cumpre sua parte e pensa no grupo.', ['Faço minha parte para o grupo dar certo.', 'Gosto de trabalhar junto com outras pessoas.']],
  ['Justiça', 'Justiça', 'Trata todos com igualdade e imparcialidade.', ['Trato todas as pessoas da mesma forma.', 'Me incomoda quando alguém é tratado de forma injusta.']],
  ['Liderança', 'Justiça', 'Organiza e incentiva o grupo a alcançar objetivos.', ['Consigo organizar um grupo para cumprir uma tarefa.', 'As pessoas costumam seguir minhas orientações.']],
  ['Perdão', 'Moderação', 'Dá segundas chances e não guarda mágoa.', ['Consigo perdoar quem errou comigo.', 'Não fico remoendo situações do passado.']],
  ['Humildade', 'Moderação', 'Não busca holofotes e reconhece que pode aprender com todos.', ['Não gosto de me exibir pelo que faço.', 'Reconheço que posso aprender com qualquer pessoa.']],
  ['Prudência', 'Moderação', 'É cuidadoso(a) e evita riscos desnecessários.', ['Penso nas consequências antes de agir.', 'Evito correr riscos desnecessários.']],
  ['Autocontrole', 'Moderação', 'Controla impulsos e emoções, mesmo sob pressão.', ['Consigo manter a calma quando alguém me provoca.', 'Tenho disciplina para cumprir horários e combinados.']],
  ['Apreciação do belo', 'Transcendência', 'Valoriza o que é bem feito, bonito e caprichado.', ['Admiro um trabalho bem feito e caprichado.', 'Percebo e valorizo os detalhes bonitos do dia a dia.']],
  ['Gratidão', 'Transcendência', 'Reconhece e agradece as oportunidades e as pessoas.', ['Costumo agradecer as pessoas que me ajudam.', 'Sou grato(a) pelas oportunidades que recebo.']],
  ['Esperança', 'Transcendência', 'Acredita no futuro e trabalha para que ele aconteça.', ['Acredito que coisas boas vão acontecer.', 'Tenho planos e objetivos para o meu futuro.']],
  ['Bom humor', 'Transcendência', 'Leva leveza ao ambiente e faz as pessoas sorrirem.', ['Gosto de deixar o ambiente mais leve.', 'Consigo rir de situações do dia a dia.']],
  ['Propósito', 'Transcendência', 'Tem fé ou valores fortes que dão sentido ao que faz.', ['Tenho valores ou fé que guiam minhas atitudes.', 'Sinto que meu trabalho tem um sentido maior.']]
];
const FORCAS_ITENS = FORCAS.flatMap((f, i) => f[3].map(t => ({ f: i, t })));
const FORCAS_ORDEM_ = (() => { const o = FORCAS_ITENS.map((_, i) => i); let s = 7; for (let i = o.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; })();
// ---- Desafio da loja (situacional): 4 opções com pontos 0 a 3 por competência
const SIT_COMP = { atend: 'Atendimento ao cliente', etica: 'Ética e integridade', equipe: 'Trabalho em equipe', org: 'Organização e cuidado', prob: 'Resolução de problemas', res: 'Foco no resultado' };
const SIT_Q = [
  ['atend', '🛒', 'Um cliente chega irritado no caixa reclamando que o preço da gôndola está diferente do preço cobrado.', [['Escuto com calma, peço desculpas pelo transtorno e chamo o fiscal para conferir e resolver.', 3], ['Explico que o preço certo é o do sistema e que não posso fazer nada.', 0], ['Cobro o menor preço por conta própria para evitar discussão.', 1], ['Peço para ele aguardar e continuo atendendo a fila, sem dar retorno.', 0]]],
  ['etica', '💵', 'Ao fechar o caixa, você percebe que sobrou R$ 50,00 a mais do que deveria.', [['Informo o fiscal ou a liderança e registro a diferença.', 3], ['Guardo o valor para cobrir alguma falta futura.', 0], ['Deixo no caixa e não comento com ninguém.', 1], ['Divido com o colega do lado.', 0]]],
  ['equipe', '🤝', 'Um colega faltou e o setor ficou sobrecarregado. Seu encarregado pede ajuda além da sua tarefa.', [['Ajudo no que for preciso e me organizo para não deixar minha tarefa atrasar.', 3], ['Ajudo, mas reclamo o tempo todo.', 1], ['Digo que não é minha função.', 0], ['Faço só a minha parte e deixo o resto para quem faltou resolver depois.', 0]]],
  ['org', '🥛', 'Durante a reposição, você encontra alguns produtos vencidos no fundo da gôndola.', [['Retiro os produtos, separo conforme o procedimento e aviso o responsável.', 3], ['Coloco os produtos novos na frente e deixo os vencidos atrás.', 0], ['Deixo como está, porque não fui eu quem repôs.', 0], ['Retiro, mas jogo fora sem avisar ninguém.', 1]]],
  ['prob', '🧾', 'O sistema do caixa trava com uma fila grande esperando.', [['Aviso o fiscal imediatamente, informo os clientes com educação e sigo a orientação recebida.', 3], ['Fico tentando resolver sozinho(a) sem avisar ninguém.', 1], ['Saio do caixa para procurar ajuda e deixo a fila sem explicação.', 0], ['Mando os clientes procurarem outro caixa.', 1]]],
  ['res', '📈', 'A loja está com uma campanha de vendas e você tem a chance de oferecer um produto em promoção.', [['Ofereço com naturalidade a todos os clientes, explicando a vantagem.', 3], ['Ofereço só quando lembro.', 1], ['Não ofereço porque acho chato.', 0], ['Insisto muito, mesmo quando o cliente já disse que não quer.', 1]]],
  ['atend', '👵', 'Uma cliente idosa pede ajuda para encontrar um produto, mas você está no meio de uma tarefa.', [['Acompanho a cliente até o produto ou chamo um colega para ajudá-la.', 3], ['Aponto o corredor de longe e volto para a tarefa.', 1], ['Digo que estou ocupado(a).', 0], ['Finjo que não ouvi.', 0]]],
  ['etica', '🍫', 'Você vê um colega comendo um produto da loja sem pagar.', [['Falo com o colega e, se continuar, comunico a liderança.', 3], ['Ignoro, porque não é problema meu.', 0], ['Comento com outros colegas sobre o ocorrido.', 0], ['Aviso a liderança imediatamente sem conversar com ele.', 2]]],
  ['equipe', '💬', 'Você discorda da forma como seu líder pediu para organizar o setor.', [['Faço o que foi pedido e depois apresento minha sugestão com respeito.', 3], ['Faço do meu jeito sem avisar.', 0], ['Reclamo com os colegas, mas faço.', 1], ['Me recuso a fazer.', 0]]],
  ['org', '🧹', 'Seu turno está acabando e o setor ainda está desorganizado.', [['Organizo o que for possível e passo as informações para o próximo turno.', 3], ['Vou embora no horário e deixo como está.', 1], ['Deixo um bilhete reclamando da bagunça.', 0], ['Fico até tarde sem avisar ninguém.', 1]]],
  ['prob', '🚨', 'Você percebe um cliente escondendo um produto na bolsa.', [['Aviso discretamente a prevenção de perdas ou a liderança, sem abordar o cliente.', 3], ['Abordo o cliente na frente de todos.', 0], ['Finjo que não vi.', 0], ['Sigo o cliente pela loja.', 1]]],
  ['res', '🎯', 'Seu setor tem uma meta de reduzir perdas no mês.', [['Sigo os procedimentos, aviso sobre produtos próximos do vencimento e sugiro melhorias.', 3], ['Faço meu trabalho normal, meta é problema da liderança.', 0], ['Só me preocupo no fim do mês.', 1], ['Escondo as perdas para o setor parecer melhor.', 0]]]
];
// ---- Fit cultural: valores do Grupo R Center (4 frases cada, 1 invertida), escala 1 a 5
const FIT_VAL = [
  ['Foco no resultado', '🎯', [['Gosto de saber qual é a meta e de acompanhar se estou chegando lá.', 0], ['Me esforço para entregar mais do que o combinado.', 0], ['Quando algo atrapalha o resultado, procuro resolver em vez de reclamar.', 0], ['Desde que eu cumpra meu horário, o resultado não é responsabilidade minha.', 1]]],
  ['Amor pelo que fazemos', '❤️', [['Faço meu trabalho com capricho, mesmo quando ninguém está olhando.', 0], ['Sinto orgulho quando um cliente sai satisfeito.', 0], ['Gosto de trabalhar com atendimento e com o varejo.', 0], ['Para mim, trabalho é só uma obrigação para pagar as contas.', 1]]],
  ['Humildade', '🙏', [['Aceito bem quando alguém me corrige.', 0], ['Peço ajuda quando não sei fazer algo.', 0], ['Reconheço o mérito dos colegas.', 0], ['Tenho dificuldade em admitir que errei.', 1]]],
  ['Respeito', '🤝', [['Trato clientes e colegas com educação, mesmo em dias difíceis.', 0], ['Respeito opiniões diferentes da minha.', 0], ['Cumpro horários e combinados porque respeito o tempo dos outros.', 0], ['Se alguém me trata mal, acho justo responder da mesma forma.', 1]]],
  ['União', '🫂', [['Gosto de ajudar um colega que está sobrecarregado.', 0], ['Acredito que o time vence junto.', 0], ['Compartilho o que sei com os colegas.', 0], ['Prefiro trabalhar sozinho(a) e não depender de ninguém.', 1]]],
  ['Desenvolvimento humano', '🌱', [['Quero crescer dentro da empresa.', 0], ['Gosto de receber feedback para melhorar.', 0], ['Me interesso em aprender novas funções.', 0], ['Não vejo necessidade de treinamentos.', 1]]]
];
const FIT_ITENS = FIT_VAL.flatMap((v, i) => v[2].map(([t, inv]) => ({ v: i, t, inv })));
const FIT_ORDEM_ = (() => { const o = FIT_ITENS.map((_, i) => i); let s = 11; for (let i = o.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; })();
// ---- Fit cultural: 3 perguntas abertas no fim (o candidato escreve com as próprias palavras e explica o porquê)
const FIT_ABERTAS = [
  { k: 'res', t: 'Conte uma situação real em que você fez mais do que era a sua obrigação (no trabalho, nos estudos ou em casa). O que você fez e por que decidiu fazer?', vals: [0, 1], chave: /(meta|resultado|entreg|cliente|ajud|resolv|termin|organiz|melhor|capricho|além|a mais|esforç|fiquei até|cobri|assumi)/ },
  { k: 'hum', t: 'Conte sobre uma vez em que você errou ou recebeu uma crítica. Como você reagiu, o que fez depois e o que aprendeu?', vals: [2, 5], chave: /(errei|erro|errado|crític|corrig|feedback|assumi|reconheci|desculp|aprend|melhor|mudei|pedi ajuda|escutei|ouvi)/ },
  { k: 'res2', t: 'Como você age quando um cliente ou um colega te trata mal ou discorda de você? Dê um exemplo real e explique por que agiu assim.', vals: [3, 4], chave: /(calma|respeit|educa|escut|ouvi|convers|entend|paciên|explic|líder|lider|gerente|encarreg|chamei|resolv|equipe|junto)/ }
];
const FIT_MIN = 75;
// análise automática de uma resposta aberta (0 a 100) — critério rígido: precisa de exemplo real, detalhe e justificativa
function fitAberta_(txt, q) {
  const s = String(txt || '').trim(), n = nl_(s), pal = s ? s.split(/\s+/).filter(Boolean) : [];
  const obs = [], alerta = [];
  if (pal.length < 5) return { p: 0, pal: pal.length, obs: ['Não respondeu ou respondeu em poucas palavras.'], alerta: ['Resposta vazia ou curta demais'] };
  // 1) desenvolvimento (até 20)
  const tam = pal.length >= 70 ? 20 : pal.length >= 45 ? 16 : pal.length >= 25 ? 10 : pal.length >= 12 ? 5 : 2;
  if (pal.length < 25) obs.push('Resposta curta (' + pal.length + ' palavras).');
  // 2) exemplo real e concreto (até 35)
  const marcas = [/(uma vez|certa vez|teve um dia|um dia|na epoca|quando eu|no meu (antigo |ultimo |primeiro )?(emprego|trabalho|servico)|na (empresa|loja|escola|faculdade)|ano passado|semana|mes passado)/, /\b(eu )?(fiz|fui|falei|ajudei|resolvi|percebi|pedi|chamei|assumi|organizei|fiquei|conversei|expliquei|corrigi|errei|aprendi|decidi|liguei|atendi|cobri|voltei|tentei|ouvi|escutei|comecei|terminei)\b/, /\b(cliente|colega|gerente|encarregad|lider|supervisor|chefe|professor|caixa|setor|loja|fila|mercadoria|produto|turno|equipe)\b/, /\d/];
  const conc = marcas.filter(r => r.test(n)).length, ex = [0, 12, 22, 30, 35][conc];
  if (conc <= 1) obs.push('Não traz um exemplo real e concreto, fala de forma genérica.');
  // 3) explica o porquê / reflexão (até 25)
  const pq = [/\b(porque|pois|por isso|por que|ja que|para que|pra que)\b/, /\b(aprendi|percebi|entendi|refleti|mudei|hoje eu|desde entao|a partir dai|sei que|acredito que|me ensinou)\b/, /\b(senti|fiquei (feliz|chateado|triste|nervoso|orgulhoso)|me (senti|incomodou))\b/].filter(r => r.test(n)).length;
  const ref = [0, 12, 20, 25][pq];
  if (!pq) obs.push('Não explica o porquê das atitudes.');
  // 4) ligação com o valor perguntado (até 20)
  const val = q.chave.test(n) ? 20 : 6;
  if (!q.chave.test(n)) obs.push('Pouca relação com o que foi perguntado.');
  let p = tam + ex + ref + val;
  // penalidades: frases prontas sem exemplo, autopromoção vaga, sinais de alerta
  const cliche = (n.match(/\b(proativ|dedicad|comprometid|esforcad|responsavel|pontual|honest|trabalho bem em equipe|sou uma pessoa|me considero|sempre dou o meu melhor|vestir a camisa|facil de lidar|nunca errei|nao tenho defeito|perfeccionista)/g) || []).length;
  if (cliche >= 2 && conc <= 1) { p -= 15; obs.push('Usa frases prontas de autoelogio no lugar de fatos.'); }
  if (/(nunca errei|nunca recebi critica|nunca tive problema|nao tenho defeito|nunca discuti com ninguem)/.test(n)) { p -= 15; alerta.push('Diz que nunca errou ou nunca teve conflito'); }
  if (/(xinguei|revidei|respondi (na mesma|a altura)|bati|empurrei|briguei|mandei (ele|ela|o cliente) |dei uma resposta|fiquei com raiva e|sai e deixei|pedi as contas|larguei)/.test(n)) { p -= 20; alerta.push('Relata reação agressiva ou de abandono'); }
  if (/(a culpa (foi|era) d|nao foi culpa minha|ele que errou|ela que errou|me perseguia|injustica comigo)/.test(n)) { p -= 10; alerta.push('Tende a transferir a responsabilidade'); }
  if (s === s.toUpperCase() && /[A-Z]/.test(s) && pal.length > 8) obs.push('Escreveu tudo em maiúsculas.');
  if (nl_(q.t).slice(0, 40) === n.slice(0, 40)) { p = 0; alerta.push('Copiou a pergunta'); }
  p = Math.max(0, Math.min(100, Math.round(p)));
  return { p, pal: pal.length, conc, pq, obs, alerta };
}
const nl_ = s => norm(s).toLowerCase();
// ---- relação dos testes com a vaga (pelo título do link / vaga informada)
const VAGA_CAT_ = [
  { id: 'lider', re: /(encarreg|lider|supervis|gerent|coorden|subgeren|chefe)/, nome: 'liderança de equipe', disc: 'DI',
    forcas: [['Liderança', 'organiza a equipe, distribui tarefas e cobra resultados'], ['Justiça', 'trata a equipe com igualdade e decide sem favorecimento'], ['Perspectiva', 'enxerga o todo da loja e orienta bem as pessoas'], ['Coragem', 'dá feedbacks difíceis e toma decisões impopulares'], ['Autocontrole', 'mantém a calma com clientes, equipe e cobranças da diretoria']] },
  { id: 'prev', re: /(preven|perda|fiscal|seguranc|vigia|monitor|auditor)/, nome: 'prevenção de perdas e fiscalização', disc: 'CD',
    forcas: [['Honestidade', 'lida com valores, perdas e ocorrências que exigem total transparência'], ['Coragem', 'precisa agir e comunicar irregularidades mesmo sendo desconfortável'], ['Justiça', 'aplica as regras da mesma forma para todos'], ['Prudência', 'avalia riscos antes de abordar ou agir'], ['Pensamento crítico', 'analisa fatos e evidências antes de concluir']] },
  { id: 'caixa', re: /(caixa|frente de loja|tesour)/, nome: 'operação de caixa', disc: 'SC',
    forcas: [['Honestidade', 'manuseia dinheiro e precisa fechar o caixa sem diferenças'], ['Autocontrole', 'mantém a calma com fila grande e clientes irritados'], ['Prudência', 'confere valores, troco e documentos com cuidado'], ['Inteligência social', 'lê o humor do cliente e se adapta no atendimento'], ['Perseverança', 'sustenta a atenção e o ritmo durante todo o turno']] },
  { id: 'atend', re: /(atend|balcao|vendedor|vend|promot|empacot|recep|crediario|sac)/, nome: 'atendimento ao cliente', disc: 'IS',
    forcas: [['Bondade', 'tem prazer genuíno em ajudar o cliente'], ['Inteligência social', 'percebe a necessidade do cliente e se adapta'], ['Entusiasmo', 'atende com energia e disposição'], ['Bom humor', 'deixa o atendimento leve e agradável'], ['Autocontrole', 'mantém a educação mesmo com clientes difíceis']] },
  { id: 'prod', re: /(acougu|padar|confeit|frios|hortifr|peix|cozinh|rotiss|salgad|forneir|padeir|producao)/, nome: 'produção e manipulação de alimentos', disc: 'SC',
    forcas: [['Apreciação do belo', 'capricha na apresentação e na qualidade do produto'], ['Prudência', 'segue normas de higiene, validade e segurança'], ['Perseverança', 'mantém o padrão em tarefas repetitivas e físicas'], ['Trabalho em equipe', 'divide a produção e ajuda o setor nos picos'], ['Amor ao aprendizado', 'aprende técnicas, receitas e procedimentos novos']] },
  { id: 'estoque', re: /(repos|repositor|estoq|deposit|confer|receb|almox|logist|armaz)/, nome: 'reposição, estoque e recebimento', disc: 'SC',
    forcas: [['Perseverança', 'executa tarefas físicas e repetitivas até o fim'], ['Prudência', 'confere validade, quantidade e notas com atenção'], ['Trabalho em equipe', 'ajuda os colegas e o setor a cumprir o abastecimento'], ['Autocontrole', 'cumpre horários, rotinas e procedimentos'], ['Apreciação do belo', 'deixa a gôndola organizada e bonita para o cliente']] },
  { id: 'adm', re: /(administ|escritor|financ|rh|recursos humanos|departamento pessoal|cpd|analist|assistent|auxiliar adm|compras|fatur|contab)/, nome: 'área administrativa', disc: 'CS',
    forcas: [['Pensamento crítico', 'analisa informações e evita erros'], ['Prudência', 'confere dados e documentos antes de concluir'], ['Honestidade', 'lida com informações confidenciais e valores'], ['Amor ao aprendizado', 'aprende sistemas e rotinas novas'], ['Perseverança', 'conclui processos longos e detalhados']] },
  { id: 'limp', re: /(limpez|servicos gerais|asg|zelad|copeir|higieniz)/, nome: 'limpeza e serviços gerais', disc: 'S',
    forcas: [['Perseverança', 'mantém o padrão de limpeza durante todo o turno'], ['Humildade', 'faz qualquer tarefa necessária sem resistência'], ['Trabalho em equipe', 'apoia os setores quando chamado(a)'], ['Apreciação do belo', 'valoriza o ambiente limpo e organizado'], ['Autocontrole', 'cumpre horários e rotinas com disciplina']] }
];
const VAGA_PADRAO_ = { id: 'geral', nome: 'operação de loja (varejo)', disc: 'SC', forcas: [['Honestidade', 'lida com produtos, valores e regras da loja'], ['Trabalho em equipe', 'o resultado da loja depende de todos os setores'], ['Perseverança', 'a rotina do varejo é intensa e repetitiva'], ['Autocontrole', 'mantém a calma nos horários de pico e com clientes difíceis'], ['Bondade', 'atende e ajuda o cliente com boa vontade']] };
const vagaCat_ = titulo => { const n = nl_(String(titulo || '')); return VAGA_CAT_.find(c => c.re.test(n)) || VAGA_PADRAO_; };
// perguntas de entrevista para aprofundar cada força
const FORCA_PERG = {
  'Criatividade': 'Conte uma vez em que você encontrou um jeito melhor de fazer uma tarefa.', 'Curiosidade': 'O que você aprendeu por conta própria nos últimos meses?', 'Pensamento crítico': 'Conte uma decisão importante que você tomou. Como analisou antes de decidir?', 'Amor ao aprendizado': 'Qual foi o último curso ou treinamento que você fez e o que aplicou dele?', 'Perspectiva': 'Conte uma vez em que você deu um conselho que ajudou alguém.',
  'Coragem': 'Conte uma situação em que precisou falar algo difícil para alguém. Como fez?', 'Perseverança': 'Fale de algo difícil que você não desistiu de terminar.', 'Honestidade': 'Conte um erro seu que você assumiu, mesmo podendo esconder.', 'Entusiasmo': 'O que te dá energia para trabalhar num dia cansativo?',
  'Afeto': 'Como você demonstra cuidado com as pessoas próximas no trabalho?', 'Bondade': 'Conte uma vez em que ajudou um cliente ou colega sem que pedissem.', 'Inteligência social': 'Conte uma vez em que percebeu que alguém não estava bem. O que fez?',
  'Trabalho em equipe': 'Conte uma situação em que o time precisou de você além da sua função.', 'Justiça': 'Como você agiria se um colega fosse tratado de forma injusta?', 'Liderança': 'Conte uma vez em que você organizou um grupo para resolver algo.',
  'Perdão': 'Como você lida com um colega que errou com você?', 'Humildade': 'Conte uma vez em que aprendeu algo com alguém menos experiente.', 'Prudência': 'Conte uma situação em que pensar antes de agir evitou um problema.', 'Autocontrole': 'Conte uma situação em que alguém te provocou no trabalho. Como reagiu?',
  'Apreciação do belo': 'Que detalhe faz um setor de loja parecer bem cuidado para você?', 'Gratidão': 'Quem te ajudou a chegar até aqui profissionalmente?', 'Esperança': 'Onde você quer estar daqui a dois anos e o que está fazendo para isso?', 'Bom humor': 'Como você ajuda a deixar o ambiente leve num dia pesado?', 'Propósito': 'O que dá sentido ao seu trabalho?'
};
const SIT_PERG = { atend: 'Conte um atendimento difícil que você resolveu. O que fez?', etica: 'O que você faria se visse um colega levando um produto sem pagar?', equipe: 'Conte uma vez em que ajudou um colega mesmo não sendo sua função.', org: 'Como você organiza sua rotina para não esquecer tarefas e prazos?', prob: 'Conte um imprevisto que você resolveu no trabalho. Qual foi o passo a passo?', res: 'Como você acompanha se está cumprindo a sua meta ou tarefa do dia?' };
const SIT_DESC = { atend: 'cuidado e paciência com o cliente', etica: 'honestidade diante de dinheiro, produtos e regras', equipe: 'colaboração e disponibilidade para ajudar', org: 'cuidado com validade, padrão e passagem de turno', prob: 'agir com calma, avisar quem deve e seguir o procedimento', res: 'compromisso com metas, vendas e redução de perdas' };
const FIT_PERG = { 'Foco no resultado': 'Qual foi a meta mais difícil que você já cumpriu e o que fez para chegar lá?', 'Amor pelo que fazemos': 'O que te faz gostar (ou não) de trabalhar com atendimento e varejo?', 'Humildade': 'Conte a última crítica que você recebeu e o que fez com ela.', 'Respeito': 'Como você reage quando um cliente é grosseiro com você?', 'União': 'Conte uma vez em que você dividiu o seu trabalho para ajudar o time.', 'Desenvolvimento humano': 'O que você está fazendo hoje para crescer profissionalmente?' };
const DISC_MAIS = {
  D: { comunica: 'direta e objetiva, vai direto ao ponto', motiva: 'desafios, metas e autonomia', pressao: 'pode ficar impaciente e autoritário(a)', perg: 'Conte uma situação em que precisou seguir uma regra com a qual não concordava. Como agiu?' },
  I: { comunica: 'calorosa e expressiva, gosta de conversar', motiva: 'reconhecimento, contato com pessoas e ambiente leve', pressao: 'pode se dispersar e prometer mais do que consegue entregar', perg: 'Fale de uma tarefa repetitiva e detalhada que fez por muito tempo. Como manteve a atenção?' },
  S: { comunica: 'calma e acolhedora, escuta antes de falar', motiva: 'estabilidade, equipe unida e rotina clara', pressao: 'evita o conflito e pode guardar insatisfações', perg: 'Conte uma mudança de última hora no trabalho. Como você reagiu?' },
  C: { comunica: 'precisa e cuidadosa, baseada em fatos', motiva: 'padrões claros, qualidade e tempo para fazer bem feito', pressao: 'pode ficar crítico(a) e demorar para decidir', perg: 'Conte uma situação em que precisou decidir rápido sem ter todas as informações. O que fez?' }
};
const nivelP_ = p => p >= 85 ? 'forte' : p >= 70 ? 'adequado' : p >= 55 ? 'a desenvolver' : 'frágil';
const corP_ = (p, min) => p >= (min || 70) ? '#16a34a' : p >= (min ? min - 15 : 55) ? '#f59e0b' : '#ef4444';
const LIKERT_ = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];
// ordem embaralhada (estável por item) das alternativas
const embaralha_ = (n, seed) => { const o = [...Array(n).keys()]; let s = seed * 7919 + 13; for (let i = n - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
// perguntas de cada teste no formato da tela
function testePerguntas_(t) {
  if (t === 'disc') return DISC_Q.map((q, i) => ({ tipo: 'esc', titulo: 'Qual frase MAIS combina com você?', ops: embaralha_(4, i + 1).map(k => ({ v: 'DISC'[k], t: q[k] })) }));
  if (t === 'forcas') return FORCAS_ORDEM_.map(k => ({ tipo: 'lik', titulo: FORCAS_ITENS[k].t, k }));
  if (t === 'situacional') return SIT_Q.map((q, i) => ({ tipo: 'esc', fase: true, emoji: q[1], titulo: q[2], ops: embaralha_(4, i + 3).map(k => ({ v: String(k), t: q[3][k][0] })) }));
  if (t === 'fit') return FIT_ORDEM_.map(k => ({ tipo: 'lik', titulo: FIT_ITENS[k].t, k })).concat(FIT_ABERTAS.map((q, j) => ({ tipo: 'txt', titulo: q.t, n: j + 1 })));
  return [];
}
// ---- correção e parecer (feito no Quadro, a partir das respostas brutas)
const media_ = L => L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0;
function testeCorrigir_(r) {
  const R = r.resp || [], pct = (a, b) => b ? Math.round(a / b * 100) : 0, vg = vagaCat_(r.titulo), min_ = Math.round((r.seg || 0) / 60);
  if (r.teste === 'disc') {
    const n = { D: 0, I: 0, S: 0, C: 0 }; R.forEach(x => { if (n[x] != null) n[x]++; });
    const tot = Object.values(n).reduce((a, b) => a + b, 0) || 1, p = {}; Object.keys(n).forEach(k => p[k] = pct(n[k], tot));
    const ord = Object.keys(p).sort((a, b) => p[b] - p[a]), pri = ord[0], sec = p[ord[1]] >= 22 ? ord[1] : '';
    const F = DISC_FATOR[pri], F2 = sec ? DISC_FATOR[sec] : null, X = DISC_MAIS[pri];
    const perfil = pri + (sec || ''), equil = p[pri] < 35;
    const afin = vg.disc.split('').reduce((a, k) => a + p[k], 0), afinTxt = afin >= vg.disc.length * 30 ? 'alta' : afin >= vg.disc.length * 22 ? 'média' : 'baixa';
    const alertas = [], perg = [X.perg];
    if (afinTxt === 'baixa') { alertas.push(`Perfil pouco parecido com o mais comum na função (${vg.disc.split('').map(k => DISC_FATOR[k].nome).join(' e ')})`); perg.push(DISC_MAIS[vg.disc[0]].perg); }
    if (r.seg && r.seg < DISC_Q.length * 3) alertas.push('Respondeu muito rápido (' + r.seg + ' s)');
    const txt = `O que é: o perfil comportamental (modelo DISC) mostra como a pessoa costuma agir, decidir e se relacionar: Dominância (D), Influência (I), Estabilidade (S) e Conformidade (C). Não existe perfil certo ou errado; o que importa é o encaixe com a função.\n\nResultado: D ${p.D}% · I ${p.I}% · S ${p.S}% · C ${p.C}%.\nPerfil predominante: ${F.nome} (${p[pri]}%)${F2 ? `, com traços de ${F2.nome} (${p[sec]}%)` : ''}${equil ? '. Perfil equilibrado: a pessoa se adapta a diferentes situações, sem um estilo muito marcado' : ''}. ${F.resumo}\n\nPontos fortes: ${F.fortes}${F2 ? `; e também ${F2.fortes.split(',')[0]}` : ''}.\nPontos de atenção: ${F.atencao}.\nComunicação: ${X.comunica}.\nO que motiva: ${X.motiva}.\nSob pressão: ${X.pressao}.\nComo gerir: ${F.gestao}.\nFunções com maior afinidade: ${F.funcoes}.\n\nRelação com a vaga${r.titulo ? ' (' + r.titulo + ')' : ''}: em ${vg.nome}, os estilos mais valorizados são ${vg.disc.split('').map(k => DISC_FATOR[k].nome).join(' e ')}. Afinidade do candidato: ${afinTxt} (${afin}% das respostas nesses estilos).${alertas.length ? '\n\nAlertas: ' + alertas.join('; ') + '.' : ''}\n\nPerguntas para a entrevista:\n${perg.map(x => '• ' + x).join('\n')}`;
    return { tipo: 'disc', p, perfil, pri, sec, equil, afin, afinTxt, vg, nota: null, alertas, perg, rotulo: perfil + ' · ' + F.nome, txt };
  }
  if (r.teste === 'forcas') {
    const s = FORCAS.map(() => 0);
    FORCAS_ORDEM_.forEach((k, i) => { s[FORCAS_ITENS[k].f] += Number(R[i]) || 0; });
    const lista = FORCAS.map((f, i) => ({ nome: f[0], virt: f[1], desc: f[2], v: s[i], p: Math.round((s[i] - 2) / 8 * 100) })).sort((a, b) => b.v - a.v || a.nome.localeCompare(b.nome));
    lista.forEach((x, i) => x.pos = i + 1);
    const virt = {}; lista.forEach(x => { (virt[x.virt] = virt[x.virt] || []).push(x.p); });
    const V = Object.keys(virt).map(k => ({ nome: k, p: Math.round(media_(virt[k])) })).sort((a, b) => b.p - a.p);
    const top = lista.slice(0, 5), baixo = lista.slice(-3);
    const req = vg.forcas.map(([nm, pq]) => { const x = lista.find(y => y.nome === nm); return { nome: nm, pq, p: x.p, pos: x.pos }; });
    // aderência à vaga: nota das forças exigidas, ponderada pela posição no ranking (precisa estar entre as mais fortes)
    const ader = Math.round(media_(req.map(x => x.p * .5 + Math.max(0, (25 - x.pos) / 24 * 100) * .5)));
    const altos = R.filter(x => Number(x) === 5).length / (R.length || 1), ideal = altos >= .75;
    const alertas = [], perg = [];
    if (ideal) alertas.push(`Respostas idealizadas: marcou "concordo totalmente" em ${Math.round(altos * 100)}% das frases. O ranking fica pouco confiável; confirme na entrevista`);
    if (r.seg && r.seg < R.length * 3) alertas.push('Respondeu muito rápido (' + Math.round(r.seg / 60 * 10) / 10 + ' min)');
    const fracas = req.filter(x => x.pos > 12 || x.p < 60);
    if (fracas.length >= 3) alertas.push(`${fracas.length} das 5 forças essenciais para a função aparecem pouco`);
    fracas.slice(0, 3).forEach(x => perg.push(FORCA_PERG[x.nome]));
    if (perg.length < 2) perg.push(FORCA_PERG[top[0].nome]);
    const afinTxt = ader >= 75 ? 'alta' : ader >= 60 ? 'média' : 'baixa';
    const txt = `O que é: o teste de Forças Pessoais avalia 24 qualidades de caráter (inspirado no modelo de forças da psicologia positiva), agrupadas em 6 virtudes: Sabedoria, Coragem, Humanidade, Justiça, Moderação e Transcendência. Ele não mede conhecimento técnico nem tem resposta certa: mostra o que a pessoa faz com mais naturalidade e prazer.\nPara que serve na seleção: verificar se as qualidades mais fortes do candidato são as que a função exige no dia a dia, prever onde ele tende a se destacar e onde vai precisar de apoio, e direcionar as perguntas da entrevista.\n\nRelação com a vaga${r.titulo ? ' (' + r.titulo + ')' : ''}: para ${vg.nome}, as forças essenciais são:\n${req.map(x => `• ${x.nome}: ${x.p}% (${x.pos}º de 24) ${x.pos <= 8 ? '✔' : x.pos <= 16 ? '~' : '✖'}. Por que importa: ${x.pq}.`).join('\n')}\nAderência das forças à vaga: ${ader}% (${afinTxt}).\n\nForças de destaque do candidato: ${top.map(x => x.nome).join(', ')}.\n${top.map(x => `• ${x.nome}: ${x.desc}`).join('\n')}\nVirtude mais presente: ${V[0].nome} (${V[0].p}%). Virtude menos presente: ${V[V.length - 1].nome} (${V[V.length - 1].p}%).\nForças menos evidentes: ${baixo.map(x => x.nome).join(', ')}.${fracas.length ? `\n\nPontos de atenção para a função: ${fracas.map(x => x.nome).join(', ')} aparecem pouco nas respostas.` : '\n\nAs forças essenciais para a função aparecem bem nas respostas.'}${alertas.length ? '\n\nAlertas: ' + alertas.join('; ') + '.' : ''}\n\nPerguntas para a entrevista:\n${perg.map(x => '• ' + x).join('\n')}`;
    return { tipo: 'forcas', lista, virt: V, top, req, ader, afinTxt, vg, ideal, nota: null, alertas, perg, rotulo: top.slice(0, 3).map(x => x.nome).join(' · '), txt };
  }
  if (r.teste === 'situacional') {
    const c = {}; let tot = 0;
    SIT_Q.forEach((q, i) => { const k = Number(R[i]); const pt = q[3][k] ? q[3][k][1] : 0; tot += pt; (c[q[0]] = c[q[0]] || [0, 0]); c[q[0]][0] += pt; c[q[0]][1] += 3; });
    const dec = pct(tot, SIT_Q.length * 3);
    let comp = Object.keys(c).map(k => ({ k, nome: SIT_COMP[k], p: pct(c[k][0], c[k][1]) }));
    const jogo = R.length > 12 && R[12] !== '' && R[12] != null;
    let nota = dec, mini = null, agil = null;
    if (jogo) {
      const n = i => Number(R[i]) || 0;
      const troco = pct(n(12), 3), peps = pct(n(14), 5), etiq = pct(Math.max(0, n(16) - n(17)), 2);
      const lim = (s, ok) => s <= ok ? 100 : Math.max(0, Math.round(100 - (s - ok) / ok * 100));
      agil = Math.round((lim(n(13), 60) + lim(n(15), 25) + lim(n(18), 30)) / 3);
      mini = [{ nome: 'Cálculo de troco', p: troco }, { nome: 'Validade (PEPS)', p: peps }, { nome: 'Atenção a detalhes', p: etiq }, { nome: 'Agilidade', p: agil }];
      nota = Math.round(dec * .6 + (troco + peps + etiq) / 3 * .3 + agil * .1);
    }
    comp = comp.sort((a, b) => b.p - a.p);
    const cls = nota >= 80 ? 'Excelente' : nota >= 65 ? 'Bom' : nota >= 50 ? 'Regular' : 'Atenção';
    const [md, mn] = medalha_(nota);
    const todos = comp.concat(mini || []), fracas = todos.filter(x => x.p < 60);
    const graves = SIT_Q.map((q, i) => ({ q, k: Number(R[i]) })).filter(x => x.q[3][x.k] && x.q[3][x.k][1] === 0);
    const alertas = []; if (nota < 65) alertas.push('Desempenho abaixo de 65% nas situações de loja');
    const eticaRuim = graves.filter(x => x.q[0] === 'etica'); if (eticaRuim.length) alertas.push('Escolheu atitude inadequada em situação de ética/integridade');
    const perg = comp.filter(x => x.p < 67).slice(0, 3).map(x => SIT_PERG[x.k]); if (!perg.length) perg.push(SIT_PERG[comp[comp.length - 1].k]);
    const sz = R[23] !== '' && R[23] != null && MW_SETORES[Number(R[23])], heroi = sz ? { p: Number(R[20]) || 0, cor: Number(R[21]) || 0, ac: Number(R[22]) || 0, setor: Number(R[23]) } : null;
    const txt = `O que é: ${jogo ? 'jogo de aventura em que o candidato percorre as lojas do grupo, decide o que fazer em 12 situações reais do dia a dia e joga minigames de troco, validade e atenção' : 'avaliação de como o candidato agiria em 12 situações reais de loja'}. Mede julgamento prático, não personalidade.\n\n${jogo ? `Resultado: ${md} medalha de ${mn}, nota ${nota}% (${cls}).\nDecisões nas situações de loja: ${dec}% (peso 60%). Minigames: troco ${mini[0].p}%, validade ${mini[1].p}%, atenção ${mini[2].p}% (peso 30%), agilidade ${mini[3].p}% (peso 10%).` : `Resultado: ${nota}% (${cls}).`}\n\nCompetências:\n${comp.map(x => `• ${x.nome}: ${x.p}% (${nivelP_(x.p)}). Avalia ${SIT_DESC[x.k]}.`).join('\n')}${graves.length ? `\n\nEscolhas inadequadas (0 ponto):\n${graves.map(x => `• ${x.q[2]} → "${x.q[3][x.k][0]}"`).join('\n')}` : '\n\nNenhuma escolha inadequada.'}${fracas.length ? `\n\nPontos a aprofundar: ${fracas.map(x => `${x.nome} (${x.p}%)`).join(', ')}.` : ''}${sz ? `\nSetor de interesse escolhido no jogo: ${sz[1]}.` : ''}${alertas.length ? '\n\nAlertas: ' + alertas.join('; ') + '.' : ''}\n\nPerguntas para a entrevista:\n${perg.map(x => '• ' + x).join('\n')}`;
    return { tipo: 'situacional', comp, mini, dec, nota, cls, md, mn, heroi, graves, alertas, perg, rotulo: nota + '% · ' + cls, txt };
  }
  if (r.teste === 'fit') {
    const NL = FIT_ORDEM_.length, DIR = [0, 0, 15, 40, 75, 100], INV = [0, 100, 75, 35, 5, 0];
    const s = FIT_VAL.map(() => [0, 0]); let incoer = 0, n5 = 0, nDir = 0; const usados = {};
    FIT_ORDEM_.forEach((k, i) => { const it = FIT_ITENS[k], v = Math.min(5, Math.max(1, Number(R[i]) || 3)); usados[v] = 1; s[it.v][0] += it.inv ? INV[v] : DIR[v]; s[it.v][1]++; if (it.inv && v >= 4) incoer++; if (!it.inv) { nDir++; if (v === 5) n5++; } });
    const vals = FIT_VAL.map((x, i) => ({ nome: x[0], emoji: x[1], p: Math.round(s[i][0] / (s[i][1] || 1)) }));
    const lik = Math.round(media_(vals.map(x => x.p)));
    const ab = FIT_ABERTAS.map((q, j) => Object.assign({ q: q.t, txt: String(R[NL + j] == null ? '' : R[NL + j]) }, fitAberta_(R[NL + j], q)));
    const temAb = R.length > NL;
    if (temAb) FIT_ABERTAS.forEach((q, j) => q.vals.forEach(vi => { vals[vi].p = Math.round(vals[vi].p * .7 + ab[j].p * .3); }));
    const abN = temAb ? Math.round(media_(ab.map(x => x.p))) : null;
    const alertas = []; let pen = 0;
    if (nDir && n5 / nDir >= .85) { pen += 8; alertas.push(`Respostas idealizadas: concordou totalmente com ${Math.round(n5 / nDir * 100)}% das frases positivas`); }
    if (incoer >= 2) alertas.push(`Concordou com ${incoer} frases contrárias aos valores da empresa`);
    if (Object.keys(usados).length === 1) { pen += 10; alertas.push('Marcou a mesma opção em todas as frases'); }
    if (r.seg && r.seg < NL * 4 + (temAb ? 90 : 0)) { pen += 5; alertas.push('Respondeu rápido demais (' + Math.round(r.seg / 60 * 10) / 10 + ' min)'); }
    if (temAb) ab.forEach((x, j) => { if (x.p < 40) alertas.push(`Pergunta aberta ${j + 1} fraca (${x.p}%)`); x.alerta.forEach(a => alertas.push(`Pergunta aberta ${j + 1}: ${a}`)); });
    const nota = Math.max(0, Math.round((temAb ? lik * .55 + abN * .45 : lik) - pen));
    const abaixo = nota < FIT_MIN;
    const cls = nota >= 85 ? 'Alta aderência' : nota >= FIT_MIN ? 'Aderência adequada' : nota >= 60 ? 'Abaixo do mínimo' : 'Baixa aderência';
    const ord = vals.slice().sort((a, b) => b.p - a.p), fracos = vals.filter(x => x.p < 70);
    const perg = (fracos.length ? fracos : [ord[ord.length - 1]]).slice(0, 3).map(x => FIT_PERG[x.nome]);
    const txt = `O que é: mede o quanto o jeito de pensar e agir do candidato combina com os 6 valores do Grupo R Center. Combina 24 frases (com frases invertidas para checar coerência) e ${temAb ? '3 perguntas abertas em que o candidato escreve com as próprias palavras' : 'nenhuma pergunta aberta (teste respondido antes da versão nova)'}.\n\nNota: ${nota}% · ${cls}. Nota mínima exigida: ${FIT_MIN}%.${abaixo ? `\n⚠ ABAIXO DA NOTA MÍNIMA. Recomenda-se aprofundar os pontos abaixo na entrevista antes de avançar.` : ''}\nComposição: frases ${lik}%${temAb ? ` (peso 55%) · perguntas abertas ${abN}% (peso 45%)` : ''}${pen ? ` · desconto por inconsistência: -${pen}` : ''}.\n\nValores:\n${vals.map(x => `• ${x.nome}: ${x.p}% (${nivelP_(x.p)})`).join('\n')}\nMais forte: ${ord[0].nome}. Mais frágil: ${ord[ord.length - 1].nome}.${temAb ? `\n\nPerguntas abertas:\n${ab.map((x, j) => `${j + 1}) ${x.q}\nNota: ${x.p}%${x.obs.length ? ' · ' + x.obs.join(' ') : ' · Resposta com exemplo real, detalhes e justificativa.'}\nResposta: "${x.txt.trim() || '(em branco)'}"`).join('\n\n')}` : ''}${alertas.length ? '\n\nAlertas: ' + alertas.join('; ') + '.' : ''}\n\nPerguntas para a entrevista:\n${perg.map(x => '• ' + x).join('\n')}`;
    return { tipo: 'fit', vals, nota, cls, incoer, lik, abN, ab, temAb, pen, abaixo, alertas, perg, rotulo: nota + '% · ' + cls, txt };
  }
  return { txt: '', alertas: [], perg: [] };
}
// parecer geral do candidato (junta todos os testes feitos)
function testeGeral_(cand) {
  const C = {}; TESTE_ORDEM.forEach(t => { if (cand.testes[t]) C[t] = testeCorrigir_(cand.testes[t]); });
  const fortes = [], atencao = [], vermelho = [];
  if (C.fit) { (C.fit.abaixo ? atencao : fortes).push(`Fit cultural ${C.fit.nota}%${C.fit.abaixo ? ' (mínimo ' + FIT_MIN + '%)' : ''}`); if (C.fit.abaixo) vermelho.push('Fit cultural abaixo de ' + FIT_MIN + '%'); }
  if (C.situacional) { (C.situacional.nota >= 65 ? fortes : atencao).push(`Situações de loja ${C.situacional.nota}%`); if (C.situacional.nota < 50) vermelho.push('Situações de loja abaixo de 50%'); if (C.situacional.alertas.some(a => /etica/i.test(nl_(a)))) vermelho.push('Escolha inadequada em situação de ética'); }
  if (C.forcas) (C.forcas.ader >= 60 ? fortes : atencao).push(`Forças × vaga ${C.forcas.ader}% (${C.forcas.afinTxt})`);
  if (C.disc) (C.disc.afinTxt !== 'baixa' ? fortes : atencao).push(`Perfil ${C.disc.perfil} com afinidade ${C.disc.afinTxt} para a função`);
  const alertas = Object.keys(C).flatMap(t => (C[t].alertas || []).map(a => TESTE_INFO[t].curto + ': ' + a));
  const perg = uniq(Object.keys(C).flatMap(t => C[t].perg || [])).slice(0, 6);
  const nivel = vermelho.length ? 'Atenção' : (atencao.length || alertas.length) ? 'Favorável com ressalvas' : 'Favorável';
  const cor = nivel === 'Atenção' ? '#ef4444' : nivel === 'Favorável' ? '#16a34a' : '#f59e0b';
  const feitos = Object.keys(C).length, falta = TESTE_ORDEM.filter(t => !C[t]).map(t => TESTE_INFO[t].nome);
  const txt = `Parecer geral: ${nivel}.\n${feitos} de ${TESTE_ORDEM.length} testes feitos${falta.length ? ' (falta: ' + falta.join(', ') + ')' : ''}.${fortes.length ? '\nPontos favoráveis: ' + fortes.join('; ') + '.' : ''}${atencao.length ? '\nPontos de atenção: ' + atencao.join('; ') + '.' : ''}${alertas.length ? '\nAlertas: ' + alertas.join('; ') + '.' : ''}\n\nPerguntas sugeridas para a entrevista:\n${perg.map(x => '• ' + x).join('\n')}\n\nOs testes são apoio: a decisão considera também a entrevista e a análise do(a) psicólogo(a).`;
  return { C, nivel, cor, fortes, atencao, alertas, vermelho, perg, txt };
}

// ---- efeitos sonoros e trilha (sintetizados no aparelho, sem arquivos)
const SOM = (() => {
  let ctx = null, master = null, musT = null, passo = 0, mudo = false;
  try { mudo = localStorage.getItem('grc_som') === '0'; } catch (e) {}
  const ini = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = mudo ? 0 : 1; master.connect(ctx.destination); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  const tom = (f, d, tipo, vol, quando) => { if (!ini() || !f) return; const t = ctx.currentTime + (quando || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo || 'square'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .12, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); };
  const seq = (notas, tipo, vol, dur) => notas.forEach((f, i) => tom(f, dur || .12, tipo, vol, i * (dur || .12) * .9));
  // trilha alegre em loop (melodia + baixo), 8 bits
  const MEL = [523, 0, 659, 784, 659, 0, 523, 587, 659, 0, 587, 523, 440, 0, 494, 523, 587, 0, 698, 880, 698, 0, 587, 659, 698, 0, 659, 587, 523, 0, 0, 0];
  const BAS = [131, 131, 196, 196, 147, 147, 196, 196];
  const tick = () => { if (!ctx) return; const i = passo % MEL.length; tom(MEL[i], .16, 'square', .035); if (i % 4 === 0) tom(BAS[(i / 4) % BAS.length], .3, 'triangle', .07); if (i % 2 === 0) tom(3000, .02, 'square', .008); passo++; };
  return {
    get mudo() { return mudo; },
    alternar() { mudo = !mudo; try { localStorage.setItem('grc_som', mudo ? '0' : '1'); } catch (e) {} if (master) master.gain.value = mudo ? 0 : 1; return mudo; },
    musica(on) { if (on) { ini(); } else { clearInterval(musT); musT = null; } },
    dado() { for (let i = 0; i < 8; i++) tom(200 + Math.random() * 400, .04, 'square', .05, i * .07); },
    passo() { seq([392, 523], 'triangle', .1, .08); },
    clique() { tom(660, .05, 'square', .06); },
    moeda() { seq([988, 1319], 'square', .08, .07); },
    certo() { seq([523, 659, 784, 1047], 'square', .09, .09); },
    erro() { seq([311, 233], 'sawtooth', .07, .16); },
    medalha() { seq([523, 523, 523, 659, 784, 0, 659, 784, 1047, 1047], 'square', .1, .13); setTimeout(() => seq([1047, 1319, 1568, 2093], 'triangle', .08, .1), 1400); }
  };
})();
// ================= JOGO "Jornada GRC": RPG em mundo aberto + minigames =================
// resp[0..11] = escolhas das 12 situações (índice original) · resp[12] troco acertos (0-3) · [13] troco seg
// [14] validade posições certas (0-5) · [15] validade seg · [16] etiquetas acertos (0-2) · [17] etiquetas falsos · [18] etiquetas seg
// [19] moedas · [20] personagem · [21] cor do uniforme · [22] acessório · [23] setor dos sonhos
const JOGO_TROCO = [[37.40, 50], [12.85, 20], [63.10, 100]];
const JOGO_NOTAS = [50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05];
const JOGO_PEPS = [['🥛 Leite integral', 3], ['🧀 Queijo mussarela', 9], ['🥣 Iogurte morango', 1], ['🧈 Manteiga', 15], ['🍮 Creme de leite', 6]];
const JOGO_ETIQ = [['☕ Café 500g', 18.9, 18.9], ['🍚 Arroz 5kg', 27.49, 24.79], ['🫘 Feijão 1kg', 8.99, 8.99], ['🧴 Sabão líquido', 21.9, 21.9], ['🍝 Macarrão 500g', 4.79, 4.29], ['🥫 Molho de tomate', 3.49, 3.49]];
const brlJ_ = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const medalha_ = n => n >= 85 ? ['🥇', 'Ouro', '#d4a017'] : n >= 70 ? ['🥈', 'Prata', '#8a9bb0'] : n >= 50 ? ['🥉', 'Bronze', '#b8733e'] : ['🎖️', 'Participação', '#64748b'];
// ---- personagem
const MW_PERS = [
  { n: 'Ana', pele: '#f1c27d', cab: '#3b2314', est: 'longo' },
  { n: 'Beto', pele: '#8d5524', cab: '#1b1b1b', est: 'curto' },
  { n: 'Clara', pele: '#ffdbac', cab: '#b5531f', est: 'rabo' },
  { n: 'Davi', pele: '#c68642', cab: '#1b1b1b', est: 'cacho' },
  { n: 'Júlia', pele: '#6b4226', cab: '#120b06', est: 'afro' },
  { n: 'Rafa', pele: '#e0ac69', cab: '#c9932f', est: 'topete' }
];
const MW_CORES = [['#1a22b5', 'Azul GRC'], ['#ff5a14', 'Laranja'], ['#16a34a', 'Verde'], ['#dc2626', 'Vermelho'], ['#7c3aed', 'Roxo'], ['#0f172a', 'Preto']];
const MW_ACESS = [['', 'Nenhum', '🚫'], ['bone', 'Boné', '🧢'], ['avental', 'Avental', '🥼'], ['cracha', 'Crachá', '🪪'], ['oculos', 'Óculos', '👓']];
const MW_SETORES = [['🛒', 'Caixa'], ['📦', 'Reposição'], ['🥬', 'Hortifrúti'], ['🥩', 'Açougue'], ['🥖', 'Padaria'], ['💬', 'Atendimento ao cliente'], ['🚚', 'Depósito e logística'], ['🛡️', 'Prevenção de perdas'], ['💼', 'Administrativo']];
function mwAvatar_(p, cls) {
  p = p || {};
  const P = MW_PERS[p.p || 0] || MW_PERS[0], cor = (MW_CORES[p.cor || 0] || MW_CORES[0])[0], ac = (MW_ACESS[p.ac || 0] || MW_ACESS[0])[0], pe = P.pele, cb = P.cab;
  const topo = 'M17 30 Q16 13 32 13 Q48 13 47 30 Q44 21 32 21 Q20 21 17 30Z';
  const cab = {
    curto: `<path d="${topo}" fill="${cb}"/>`,
    longo: `<path d="M16 30 Q15 12 32 12 Q49 12 48 30 L49 52 Q45 54 42 50 L42 26 Q32 19 22 26 L22 50 Q19 54 15 52Z" fill="${cb}"/>`,
    rabo: `<circle cx="49" cy="24" r="7" fill="${cb}"/><path d="${topo}" fill="${cb}"/>`,
    cacho: [[19, 26], [24, 18], [32, 15], [40, 18], [45, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${cb}"/>`).join(''),
    afro: `<path d="M18 28 Q20 18 32 18 Q44 18 46 28 Q40 23 32 23 Q24 23 18 28Z" fill="${cb}"/>`,
    topete: `<path d="M17 30 Q16 15 29 12 Q34 5 43 10 Q49 15 47 30 Q44 21 32 21 Q20 21 17 30Z" fill="${cb}"/>`
  }[P.est];
  const acc = {
    bone: `<path d="M17 27 Q17 10 32 10 Q47 10 47 27Z" fill="${cor}"/><path d="M30 24 H55 Q57 24 56 28 H30Z" fill="${cor}"/><path d="M30 24 H55 Q57 24 56 28 H30Z" fill="#000" opacity=".25"/><circle cx="32" cy="18" r="3" fill="#fff"/>`,
    avental: `<path d="M22 56 H42 V80 H22Z" fill="#fff" opacity=".93"/><path d="M22 57 L18 51 M42 57 L46 51" stroke="#fff" stroke-width="2.2"/><rect x="27" y="66" width="10" height="6" rx="1.5" fill="none" stroke="#cbd5e1" stroke-width="1.2"/>`,
    cracha: `<path d="M27 51 L39 62" stroke="#ff5a14" stroke-width="1.6"/><rect x="36" y="61" width="10" height="13" rx="1.8" fill="#fff" stroke="#cbd5e1"/><rect x="37.6" y="63" width="6.8" height="3.4" rx=".8" fill="#1a22b5"/><rect x="37.6" y="68" width="6.8" height="1.3" fill="#94a3b8"/>`,
    oculos: `<g fill="rgba(255,255,255,.25)" stroke="#111827" stroke-width="1.6"><circle cx="26.5" cy="33" r="4.2"/><circle cx="37.5" cy="33" r="4.2"/></g><path d="M30.7 33 H33.3" stroke="#111827" stroke-width="1.6"/>`
  }[ac] || '';
  return `<svg class="mw-av ${cls || ''}" viewBox="0 0 64 80" aria-hidden="true">
    ${P.est === 'afro' ? `<circle cx="32" cy="26" r="19" fill="${cb}"/>` : ''}
    <path d="M11 80 Q11 52 32 50 Q53 52 53 80Z" fill="${cor}"/>${ac === 'avental' ? '' : '<rect x="19" y="63" width="8" height="2.6" rx="1" fill="#ff5a14"/>'}
    <rect x="28" y="42" width="8" height="10" rx="2" fill="${pe}"/><path d="M26 51 L32 57 L38 51" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="18.5" cy="33" r="3" fill="${pe}"/><circle cx="45.5" cy="33" r="3" fill="${pe}"/><circle cx="32" cy="32" r="14" fill="${pe}"/>
    ${cab}
    <circle cx="26.5" cy="33" r="1.9" fill="#1f2937"/><circle cx="37.5" cy="33" r="1.9" fill="#1f2937"/>
    <circle cx="23" cy="37.6" r="2.4" fill="#f87171" opacity=".35"/><circle cx="41" cy="37.6" r="2.4" fill="#f87171" opacity=".35"/>
    <path d="M27.5 38.5 Q32 42.5 36.5 38.5" stroke="#7c2d12" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${acc}</svg>`;
}
// ---- mapa: cidades do Grupo R Center (cada uma com missões e um selo)
const MW_REG = [
  { id: 'SM', nome: 'R Center Supermercados', ic: '🛒', cor: '#1d4ed8', x: 17, y: 76, de: [], selo: 'Selo do Atendimento',
    hist: 'Tudo começa aqui, na loja mais movimentada do grupo. Clientes, gôndolas e caixas cheios: mostre que você sabe cuidar de cada detalhe.',
    m: [{ s: 0, tit: 'Preço divergente', npc: '🧔', quem: 'Seu Raimundo', papel: 'cliente no caixa' }, { s: 6, tit: 'Uma ajudinha', npc: '👵', quem: 'Dona Socorro', papel: 'cliente fiel da loja' }, { s: 3, tit: 'Surpresa na gôndola', npc: '🧑‍🔧', quem: 'Léo', papel: 'repositor' }, { g: 'peps', tit: 'Organize a gôndola', npc: '👩‍💼', quem: 'Márcia', papel: 'encarregada de perecíveis', fala: 'Chegou mercadoria nova! Me ajuda a organizar a gôndola de laticínios do jeito certo?' }] },
  { id: 'TA', nome: 'Torra Atacadista', ic: '📦', cor: '#ea580c', x: 45, y: 55, de: ['SM'], selo: 'Selo da Agilidade',
    hist: 'No atacado tudo é em grande volume e em ritmo acelerado. Aqui, trabalho em equipe e agilidade fazem toda a diferença.',
    m: [{ s: 2, tit: 'Time desfalcado', npc: '👨‍💼', quem: 'Paulo', papel: 'encarregado do setor' }, { s: 4, tit: 'O sistema travou', npc: '👩', quem: 'Bia', papel: 'operadora de caixa' }, { g: 'troco', tit: 'Troco rápido', npc: '🧓', quem: 'Seu Zé', papel: 'cliente apressado', fala: 'Tô com pressa, viu? Confere meu troco direitinho, por favor!' }] },
  { id: 'SF', nome: 'Super Fraldas', ic: '🍼', cor: '#db2777', x: 21, y: 28, de: ['SM'], selo: 'Selo da Integridade',
    hist: 'Uma loja onde as famílias confiam em nós todos os dias. Por aqui, honestidade e integridade valem mais que tudo.',
    m: [{ s: 1, tit: 'Sobrou no caixa', npc: '👩‍💼', quem: 'Fernanda', papel: 'tesoureira' }, { s: 7, tit: 'Atitude do colega', npc: '🧑', quem: 'Kauã', papel: 'colega de setor' }, { s: 10, tit: 'Algo suspeito', npc: '👮', quem: 'Sr. Lima', papel: 'prevenção de perdas' }] },
  { id: 'CC', nome: 'R Center Casa & Construção', ic: '🔨', cor: '#15803d', x: 71, y: 77, de: ['TA'], selo: 'Selo da Organização',
    hist: 'Cada peça no lugar certo. Aqui, organização e respeito à liderança constroem resultados sólidos.',
    m: [{ s: 8, tit: 'Ideias diferentes', npc: '👷', quem: 'Ricardo', papel: 'líder de loja' }, { s: 9, tit: 'Fim de turno', npc: '👩‍🔧', quem: 'Carla', papel: 'colega do próximo turno' }, { g: 'etiq', tit: 'Caça ao erro de preço', npc: '🧑‍💼', quem: 'Sônia', papel: 'gerente da loja', fala: 'Recebemos reclamação de preço. Vamos conferir as etiquetas da gôndola com o sistema?' }] },
  { id: 'VP', nome: 'Vita Park Mall', ic: '🎡', cor: '#7c3aed', x: 63, y: 24, de: ['SF'], selo: 'Selo do Resultado',
    hist: 'O ponto de encontro da cidade. Aqui o foco é resultado: campanhas, metas e clientes encantados.',
    m: [{ s: 5, tit: 'Campanha de vendas', npc: '🧑‍🎤', quem: 'Diego', papel: 'time de marketing' }, { s: 11, tit: 'Meta do mês', npc: '👨‍💼', quem: 'Seu Antônio', papel: 'gerente geral' }] }
];
const MW_SEDE = { id: 'HQ', nome: 'Sede GRC', ic: '🏆', cor: '#d4a017', x: 88, y: 50 };
const MW_ESTR = [['SM', 'TA'], ['SM', 'SF'], ['TA', 'CC'], ['SF', 'VP'], ['CC', 'HQ'], ['VP', 'HQ']];
const MW_DEC = [['🌳', 6, 52], ['🌲', 34, 10], ['🌳', 50, 34], ['🌴', 88, 86], ['🌲', 7, 93], ['⛲', 36, 84], ['🌳', 80, 40], ['☁️', 46, 6], ['🚗', 30, 63], ['🏠', 8, 12], ['🌻', 56, 90], ['🚚', 76, 58]];
function mundoGRC_(M, st, salvar, xpAdd, onFim) {
  const J = st.mundo = st.mundo || { perfil: null, feito: {}, moedas: 0, pos: 'SM', resp: [], t0: Date.now() };
  const R = J.resp;
  const todos = MW_REG.concat([MW_SEDE]), by = id => todos.find(r => r.id === id);
  const regFeita = r => r.m.every((m, i) => J.feito[r.id + ':' + i] != null);
  const sedeLib = () => MW_REG.every(regFeita);
  const lib = r => r.id === 'HQ' ? sedeLib() : r.id === 'SM' || r.de.some(id => regFeita(by(id)));
  const estrelas = () => Object.values(J.feito).reduce((a, b) => a + b, 0);
  const nivel = () => 1 + Math.floor(J.moedas / 80);
  const nome = () => h((J.perfil && J.perfil.apelido) || 'Herói');
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  M.onclick = e => {
    const b = e.target.closest('#jgSom'); if (b) { b.textContent = SOM.alternar() ? '🔇' : '🔊'; return; }
    if (e.target.closest('#mwPerf')) { SOM.clique(); perfil(false); }
  };
  const hud = () => `<div class="mw-hud"><button class="mw-me" id="mwPerf" title="Editar perfil">${mwAvatar_(J.perfil)}<span><b>${nome()}</b><small>Nível ${nivel()} · ✏️ perfil</small></span></button>
    <span class="mw-st">🪙 <b>${J.moedas}</b></span><span class="mw-st">⭐ <b>${estrelas()}</b></span><span class="mw-st">🏅 <b>${MW_REG.filter(regFeita).length}/5</b></span><button class="jg-som" id="jgSom" title="Som">${SOM.mudo ? '🔇' : '🔊'}</button></div>`;
  // 1) criar / editar o personagem
  const perfil = novo => {
    const P = Object.assign({ p: 0, cor: 0, ac: 0, setor: -1, apelido: '' }, J.perfil || {});
    const draw = () => {
      M.innerHTML = `<div class="mw"><div class="mw-perf">
        <div class="mw-ph"><small>${novo ? 'Passo 1 · Crie o seu herói' : 'Editar perfil'}</small><h2>${novo ? 'Quem vai partir nessa jornada?' : 'Seu personagem'}</h2></div>
        <div class="mw-pgrid">
          <div class="mw-prev" style="--c:${MW_CORES[P.cor][0]}">${mwAvatar_(P, 'grande')}<b>${h(P.apelido || MW_PERS[P.p].n)}</b><small>${P.setor >= 0 ? MW_SETORES[P.setor].join(' ') : 'Escolha seu setor dos sonhos'}</small></div>
          <div class="mw-pform">
            <label>Personagem</label><div class="mw-chars">${MW_PERS.map((x, i) => `<button class="mw-ch ${P.p === i ? 'sel' : ''}" data-p="${i}">${mwAvatar_(Object.assign({}, P, { p: i }))}<small>${x.n}</small></button>`).join('')}</div>
            <label>Apelido do herói</label><input class="input" id="mwApe" maxlength="14" placeholder="Ex.: ${MW_PERS[P.p].n} Estrela" value="${h(P.apelido)}">
            <label>Cor do uniforme</label><div class="mw-cores">${MW_CORES.map((c, i) => `<button class="mw-cor ${P.cor === i ? 'sel' : ''}" data-c="${i}" title="${c[1]}" style="background:${c[0]}"></button>`).join('')}</div>
            <label>Acessório</label><div class="mw-chips">${MW_ACESS.map((a, i) => `<button class="mw-chip ${P.ac === i ? 'sel' : ''}" data-a="${i}">${a[2]} ${a[1]}</button>`).join('')}</div>
            <label>Setor dos sonhos</label><div class="mw-chips">${MW_SETORES.map((s, i) => `<button class="mw-chip ${P.setor === i ? 'sel' : ''}" data-s="${i}">${s[0]} ${s[1]}</button>`).join('')}</div>
            <div id="mwErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-top:12px;white-space:normal"></div>
            <button class="btn primary block fx-btn" id="mwOk" style="margin-top:14px">${novo ? 'Partir para a aventura ▶' : 'Salvar e voltar ▶'}</button>
          </div></div></div></div>`;
      const ape = $('#mwApe');
      ape.oninput = () => { P.apelido = ape.value.replace(/[<>]/g, ''); const b = $('.mw-prev b', M); if (b) b.textContent = P.apelido || MW_PERS[P.p].n; };
      const pick = (sel, k) => $$(sel, M).forEach(b => b.onclick = () => { SOM.clique(); P[k] = Number(b.dataset[{ p: 'p', cor: 'c', ac: 'a', setor: 's' }[k]]); draw(); });
      pick('[data-p]', 'p'); pick('[data-c]', 'cor'); pick('[data-a]', 'ac'); pick('[data-s]', 'setor');
      $('#mwOk').onclick = () => {
        const err = $('#mwErr'); P.apelido = ape.value.replace(/[<>]/g, '').trim();
        if (!P.apelido) P.apelido = MW_PERS[P.p].n;
        if (P.setor < 0) { err.textContent = 'Escolha o seu setor dos sonhos para continuar.'; err.classList.remove('hidden'); return; }
        J.perfil = P; salvar(); SOM.certo(); SOM.musica(true);
        novo ? historia() : mapa();
      };
    };
    draw(); top();
  };
  // 2) história
  const historia = () => {
    M.innerHTML = `<div class="mw"><div class="mw-hist-c"><div class="mw-hist-av">${mwAvatar_(J.perfil, 'grande')}</div>
      <small>Capítulo 1 · O chamado</small><h2>Bem-vindo(a) ao Mundo GRC, ${nome()}!</h2>
      <p>O Grupo R Center está procurando a sua próxima <b>Estrela</b>. Para conquistar esse título, você vai viajar pelas <b>5 cidades do grupo</b>, conhecer pessoas, resolver situações do dia a dia e encarar minigames.</p>
      <p>Cada cidade guarda um <b>selo</b>. Ao concluir as missões de uma cidade, novas cidades se abrem no mapa, e você escolhe o caminho. Com os 5 selos, siga para a <b>Sede GRC</b> para a cerimônia final. 🏆</p>
      <div class="mw-selos">${MW_REG.map(r => `<span style="--c:${r.cor}">${r.ic}<small>${r.selo.replace('Selo d', '').replace(/^[oa] /, '')}</small></span>`).join('')}</div>
      <p class="mw-obs">💡 Não existe pegadinha: escolha sempre o que você faria de verdade.</p>
      <button class="btn primary block fx-btn" id="mwGo">Abrir o mapa 🗺️</button></div></div>`;
    $('#mwGo').onclick = () => { SOM.passo(); mapa(); };
    top();
  };
  // 3) mapa do mundo aberto
  const mapa = () => {
    const cur = by(J.pos) || MW_REG[0];
    const prog = r => `${r.m.filter((m, i) => J.feito[r.id + ':' + i] != null).length}/${r.m.length} missões`;
    M.innerHTML = `<div class="mw">${hud()}
      <div class="mw-map">
        <svg class="mw-rd" viewBox="0 0 100 100" preserveAspectRatio="none">${MW_ESTR.map(([a, b]) => { const A = by(a), B = by(b); return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="${lib(A) && lib(B) ? 'on' : ''}" vector-effect="non-scaling-stroke"/>`; }).join('')}</svg>
        <div class="mw-lago"></div>
        ${MW_DEC.map(([e, x, y]) => `<i class="mw-dec" style="left:${x}%;top:${y}%">${e}</i>`).join('')}
        ${todos.map(r => { const L = lib(r), F = r.id !== 'HQ' && regFeita(r); return `<button class="mw-no ${L ? '' : 'lock'} ${F ? 'feito' : ''} ${r.id === 'HQ' ? 'sede' : ''}" data-r="${r.id}" style="left:${r.x}%;top:${r.y}%;--c:${r.cor}"><span class="mw-ic">${L ? r.ic : '🔒'}</span><b>${r.nome}</b><em>${F ? '✅ selo' : r.id === 'HQ' ? (L ? 'cerimônia!' : '5 selos') : L ? prog(r) : 'bloqueada'}</em></button>`; }).join('')}
        <div class="mw-heroi" id="mwH" style="left:${cur.x}%;top:${cur.y}%">${mwAvatar_(J.perfil)}</div>
      </div>
      <div class="mw-dica" id="mwDica">${sedeLib() ? '🏆 Você conquistou os 5 selos! Siga para a <b>Sede GRC</b> para a cerimônia final.' : '🗺️ Toque em uma cidade liberada para viajar. Conclua as missões para destravar novas cidades.'}</div></div>`;
    $$('.mw-no', M).forEach(b => b.onclick = () => {
      const r = by(b.dataset.r);
      if (!lib(r)) {
        SOM.erro(); b.classList.remove('treme'); void b.offsetWidth; b.classList.add('treme');
        $('#mwDica').innerHTML = r.id === 'HQ' ? '🔒 A Sede GRC abre quando você tiver os <b>5 selos</b>.' : `🔒 Para liberar <b>${r.nome}</b>, conclua as missões de <b>${r.de.map(id => by(id).nome).join(' ou ')}</b>.`;
        return;
      }
      $$('.mw-no', M).forEach(x => x.disabled = true); SOM.musica(true);
      const abrir = () => { J.pos = r.id; salvar(); r.id === 'HQ' ? sede() : regiao(r); };
      if (r.id === J.pos) return abrir();
      const H = $('#mwH'); H.classList.add('anda'); H.style.left = r.x + '%'; H.style.top = r.y + '%';
      let n = 0; const pa = setInterval(() => { SOM.passo(); if (++n >= 4) clearInterval(pa); }, 220);
      setTimeout(abrir, 1000);
    });
  };
  // 4) cidade
  const regiao = r => {
    const feitas = r.m.filter((m, i) => J.feito[r.id + ':' + i] != null).length;
    M.innerHTML = `<div class="mw">${hud()}<div class="mw-reg" style="--c:${r.cor}">
      <div class="mw-rh"><button class="tx-back" id="mwV" title="Voltar ao mapa">‹</button><span class="mw-ric">${r.ic}</span><div><small>Cidade</small><h2>${r.nome}</h2></div></div>
      <p class="mw-rhist">${r.hist}</p>
      <div class="tx-prog"><i style="width:${Math.round(feitas / r.m.length * 100)}%"></i></div><small class="mw-rp">${feitas} de ${r.m.length} missões · recompensa: <b>🏅 ${r.selo}</b></small>
      <div class="mw-ms">${r.m.map((m, i) => { const e = J.feito[r.id + ':' + i]; return `<button class="mw-m ${e != null ? 'ok' : ''}" data-i="${i}" ${e != null ? 'disabled' : ''}><span class="mw-npc">${m.npc}</span><span class="mw-mt"><b>${m.tit}</b><small>${m.quem} · ${m.papel}</small></span><em>${e != null ? '★'.repeat(e) + '☆'.repeat(3 - e) : m.g ? '🎮 minigame' : '💬 missão'}</em></button>`; }).join('')}</div>
      <button class="btn block" id="mwV2" style="margin-top:12px">🗺️ Voltar ao mapa</button></div></div>`;
    $('#mwV').onclick = $('#mwV2').onclick = () => { SOM.clique(); mapa(); };
    $$('.mw-m', M).forEach(b => b.onclick = () => { SOM.clique(); missao(r, Number(b.dataset.i)); });
    top();
  };
  const card = (r, m, corpo) => `<div class="mw">${hud()}<div class="jg-card mw-card" style="--c:${r.cor}"><div class="tx-tag">${r.ic} ${r.nome} · ${m.tit}</div>${corpo}</div></div>`;
  const fala = (m, txt) => `<div class="mw-fala"><span class="mw-npcg">${m.npc}</span><div><b>${m.quem} <small>${m.papel}</small></b><p>${h(txt)}</p></div></div>`;
  const eu = txt => `<div class="mw-eu">${mwAvatar_(J.perfil)}<span>${txt}</span></div>`;
  const depois = (r, i, est, moedas, msg) => {
    const ja = regFeita(r);
    J.feito[r.id + ':' + i] = est; J.moedas += moedas; salvar(); xpAdd(moedas);
    if (est >= 2) { SOM.certo(); setTimeout(() => SOM.moeda(), 380); } else if (est === 1) SOM.moeda(); else SOM.erro();
    const b = document.createElement('div'); b.className = 'jg-pop'; b.innerHTML = `<div><b>${'★'.repeat(est)}${'☆'.repeat(3 - est)}</b><span>+${moedas} 🪙</span><small>${msg || ''}</small></div>`;
    document.body.appendChild(b); setTimeout(() => { b.remove(); !ja && regFeita(r) ? selo(r) : regiao(r); }, 1300);
  };
  const missao = (r, i) => {
    const m = r.m[i];
    if (m.g === 'troco') return minTroco(r, i, m);
    if (m.g === 'peps') return minPeps(r, i, m);
    if (m.g === 'etiq') return minEtiq(r, i, m);
    const q = SIT_Q[m.s], ord = embaralha_(4, m.s + 3);
    M.innerHTML = card(r, m, `${fala(m, q[2])}${eu(`O que você faria, ${nome()}?`)}<div class="tx-ops">${ord.map((k, j) => `<button class="tx-op" data-k="${k}"><i>${'ABCD'[j]}</i><span>${h(q[3][k][0])}</span></button>`).join('')}</div>`);
    $$('.tx-op', M).forEach(b => b.onclick = () => { SOM.clique(); $$('.tx-op', M).forEach(x => x.disabled = true); b.classList.add('sel'); const k = Number(b.dataset.k), pt = q[3][k][1]; R[m.s] = String(k); depois(r, i, pt, 10 + pt * 10, pt === 3 ? 'Mandou bem!' : pt === 2 ? 'Boa!' : 'Seguindo em frente'); });
    top();
  };
  // selo conquistado
  const selo = r => {
    const novas = MW_REG.filter(x => x.de.includes(r.id) && !regFeita(x)), todosS = sedeLib();
    M.innerHTML = `<div class="mw">${hud()}<div class="jg-card jg-final mw-selo" style="--m:${r.cor}"><div class="jg-conf">${Array.from('🎉✨🪙⭐'.repeat(3)).map((x, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * .12}s">${x}</i>`).join('')}</div>
      <div class="mw-bdg" style="--c:${r.cor}">${r.ic}</div><small>Cidade concluída</small><h2>${r.selo} conquistado!</h2>
      <p>Você concluiu todas as missões de <b>${r.nome}</b>.</p>
      ${todosS ? '<div class="mw-lib">🏆 A <b>Sede GRC</b> foi liberada! Hora da cerimônia final.</div>' : novas.length ? `<div class="mw-lib">🔓 Nova cidade liberada: <b>${novas.map(x => x.ic + ' ' + x.nome).join(', ')}</b></div>` : ''}
      <button class="btn primary block fx-btn" id="mwM">Voltar ao mapa 🗺️</button></div></div>`;
    SOM.medalha(); $('#mwM').onclick = () => { SOM.clique(); mapa(); }; top();
  };
  // minigame 1: montar o troco
  const minTroco = (r, ci, m) => {
    let rod = 0, ac = 0; const t0 = Date.now();
    const rodada = () => {
      if (rod >= JOGO_TROCO.length) { R[12] = String(ac); R[13] = String(Math.round((Date.now() - t0) / 1000)); const est = ac === 3 ? 3 : ac === 2 ? 2 : ac ? 1 : 0; return depois(r, ci, est, 15 + ac * 15, `${ac} de 3 trocos certos`); }
      const [tot, pago] = JOGO_TROCO[rod], certo = Math.round((pago - tot) * 100); let soma = 0;
      M.innerHTML = card(r, m, `${rod === 0 ? fala(m, m.fala) : ''}<h3>Cliente ${rod + 1} de 3</h3><div class="jg-tr"><div><small>Compra</small><b>${brlJ_(tot)}</b></div><div><small>Pagou com</small><b>${brlJ_(pago)}</b></div><div class="soma"><small>Seu troco</small><b id="trS">R$ 0,00</b></div></div>
        <p class="tx-sub">Toque nas notas e moedas para montar o troco certo.</p>
        <div class="jg-notas">${JOGO_NOTAS.filter(v => v < pago).map(v => `<button class="jg-nota ${v >= 2 ? 'cedula' : 'moeda'}" data-v="${v}">${v >= 1 ? 'R$ ' + v : (v * 100) + '¢'}</button>`).join('')}</div>
        <div class="jg-bts"><button class="btn" id="trZ">Limpar</button><button class="btn primary fx-btn" id="trOk">Entregar troco</button></div>`);
      const atual = () => { $('#trS').textContent = brlJ_(soma / 100); };
      $$('.jg-nota', M).forEach(b => b.onclick = () => { SOM.moeda(); soma += Math.round(Number(b.dataset.v) * 100); atual(); b.classList.add('tap'); setTimeout(() => b.classList.remove('tap'), 150); });
      $('#trZ').onclick = () => { soma = 0; atual(); };
      $('#trOk').onclick = () => { const ok = soma === certo; if (ok) { ac++; SOM.certo(); } else SOM.erro(); const el = $('#trS'); el.textContent = ok ? '✅ Certo!' : '❌ Era ' + brlJ_(certo / 100); setTimeout(() => { rod++; rodada(); }, 900); $('#trOk').disabled = true; };
    };
    rodada(); top();
  };
  // minigame 2: validade (PEPS)
  const minPeps = (r, ci, m) => {
    const t0 = Date.now(), ord = embaralha_(JOGO_PEPS.length, 5), esc = [], hoje = new Date();
    const dt = d => { const x = new Date(hoje); x.setDate(x.getDate() + d); return x.toLocaleDateString('pt-BR').slice(0, 5); };
    const draw = () => {
      M.innerHTML = card(r, m, `${fala(m, m.fala)}<p class="tx-sub">Toque nos produtos na ordem em que <b>vencem</b>: o que vence primeiro vai para a frente (PEPS).</p>
        <div class="jg-peps">${ord.map(k => { const p = JOGO_PEPS[k], n = esc.indexOf(k); return `<button class="jg-prod ${n >= 0 ? 'ok' : ''}" data-k="${k}" ${n >= 0 ? 'disabled' : ''}>${n >= 0 ? `<i>${n + 1}º</i>` : ''}<b>${p[0]}</b><small>Vence ${dt(p[1])}</small></button>`; }).join('')}</div>
        <div class="jg-fila">Frente da gôndola ➜ ${esc.map(k => JOGO_PEPS[k][0].split(' ')[0]).join(' ') || '…'}</div>
        <div class="jg-bts"><button class="btn" id="peZ">Recomeçar</button></div>`);
      $$('.jg-prod', M).forEach(b => b.onclick = () => { SOM.clique(); esc.push(Number(b.dataset.k)); if (esc.length < JOGO_PEPS.length) draw(); else fim(); });
      $('#peZ').onclick = () => { esc.length = 0; draw(); };
    };
    const fim = () => { const certa = JOGO_PEPS.map((p, k) => k).sort((a, b) => JOGO_PEPS[a][1] - JOGO_PEPS[b][1]); const n = esc.filter((k, i) => certa[i] === k).length; R[14] = String(n); R[15] = String(Math.round((Date.now() - t0) / 1000)); depois(r, ci, n === 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0, 10 + n * 8, `${n} de 5 na posição certa`); };
    draw(); top();
  };
  // minigame 3: etiquetas
  const minEtiq = (r, ci, m) => {
    const t0 = Date.now(), sel = new Set();
    M.innerHTML = card(r, m, `${fala(m, m.fala)}<p class="tx-sub">Compare o preço da <b>gôndola</b> com o do <b>sistema</b> e marque as etiquetas erradas. Depois toque em Conferir.</p>
      <div class="jg-etq">${JOGO_ETIQ.map((e, k) => `<button class="jg-et" data-k="${k}"><b>${e[0]}</b><span><small>Gôndola</small>${brlJ_(e[1])}</span><span><small>Sistema</small>${brlJ_(e[2])}</span></button>`).join('')}</div>
      <div class="jg-bts"><button class="btn primary fx-btn" id="etOk">Conferir</button></div>`);
    $$('.jg-et', M).forEach(b => b.onclick = () => { SOM.clique(); const k = Number(b.dataset.k); sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('sel'); });
    $('#etOk').onclick = () => {
      const errados = JOGO_ETIQ.map((e, k) => e[1] !== e[2] ? k : -1).filter(k => k >= 0);
      const hit = errados.filter(k => sel.has(k)).length, fal = [...sel].filter(k => !errados.includes(k)).length;
      R[16] = String(hit); R[17] = String(fal); R[18] = String(Math.round((Date.now() - t0) / 1000));
      const sc = Math.max(0, hit - fal); depois(r, ci, sc === 2 ? 3 : sc === 1 ? 1 : 0, 10 + sc * 15, `${hit} de 2 erros encontrados`);
    };
    top();
  };
  // 5) Sede GRC: cerimônia final
  const sede = () => {
    for (let i = 0; i < 24; i++) if (R[i] == null) R[i] = '';
    const P = J.perfil; R[19] = String(J.moedas); R[20] = String(P.p); R[21] = String(P.cor); R[22] = String(P.ac); R[23] = String(P.setor);
    const nota = testeCorrigir_({ teste: 'situacional', resp: R }).nota, [md, mn, cor] = medalha_(nota);
    M.innerHTML = `<div class="mw">${hud()}<div class="jg-card jg-final mw-fim" style="--m:${cor}"><div class="jg-conf">${Array.from('🎉✨🪙⭐'.repeat(4)).map((x, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * .12}s">${x}</i>`).join('')}</div>
      <small>Capítulo final · Sede GRC</small><h2>${nome()}, você é uma Estrela GRC!</h2>
      <div class="mw-cart" style="--c:${MW_CORES[P.cor][0]}">
        <div class="mw-cart-av">${mwAvatar_(P, 'grande')}</div>
        <div class="mw-cart-tx"><small>Carteirinha de herói</small><b>${nome()}</b><span>Nível ${nivel()} · ${MW_SETORES[P.setor].join(' ')}</span>
          <div class="mw-cart-s">${MW_REG.map(r => `<i style="--c:${r.cor}" title="${r.selo}">${r.ic}</i>`).join('')}</div>
          <div class="mw-cart-n"><span>🪙 ${J.moedas}</span><span>⭐ ${estrelas()}</span><span class="md">${md} ${mn}</span></div></div>
      </div>
      <div class="jg-med">${md}</div><h3>Medalha de ${mn}!</h3><p>Você percorreu as 5 cidades do Grupo R Center e conquistou todos os selos. Obrigado por embarcar nessa jornada com a gente! 💙🧡</p>
      <button class="btn primary block fx-btn" id="jgF">Enviar e continuar ▶</button></div></div>`;
    SOM.musica(false); setTimeout(() => SOM.medalha(), 200); top();
    $('#jgF').onclick = () => onFim(R.slice(0, 24), Math.round((Date.now() - J.t0) / 1000), J.moedas);
  };
  if (!J.perfil) perfil(true); else if (J.pos === 'HQ' && sedeLib()) sede(); else mapa();
}

// ---- página pública do candidato (?teste=CODIGO)
async function renderTeste(codigo) {
  document.documentElement.dataset.theme = 'light';
  document.title = 'Vem ser GRC · Fase de testes';
  $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Abrindo…</div></div></div>`;
  let info = null, erro = '', recs = [];
  try { const j = await sendRaw_('testeInfo', { codigo }); if (j && j.ok) { info = j.link; recs = j.recrutadores || []; } else erro = (j && j.error) || 'Link inválido.'; } catch (e) { erro = e.message; }
  const RC = 'https://www.rcentersupermercado.com.br/img/', img = (f, alt, cls) => `<img src="${RC}grupo/${f}" alt="${h(alt)}" class="${cls || ''}" onerror="this.style.display='none'">`;
  const LK = 'grc_teste_' + codigo;
  let st = {}; try { st = JSON.parse(localStorage.getItem(LK) || '{}'); } catch (e) {}
  const salvar = () => { try { localStorage.setItem(LK, JSON.stringify(st)); } catch (e) {} };
  st.feitos = st.feitos || {}; st.xp = st.xp || 0;
  const testes = info ? (info.testes || []).filter(t => TESTE_INFO[t]).sort((a, b) => TESTE_ORDEM.indexOf(a) - TESTE_ORDEM.indexOf(b)) : [];
  $('#root').innerHTML = `<div class="fx tx">
    <header class="fx-top"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo')}<span id="txXp" class="tx-xp"></span></div></header>
    <div class="fx-wrap"><div class="tx-main" id="txM"></div></div>
    <footer class="fx-rodape"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo-sm')}<span>© ${new Date().getFullYear()} Grupo R Center · Indo além por você</span></div></footer>
  </div>`;
  const M = $('#txM');
  const xp = () => { const e = $('#txXp'); if (e) e.innerHTML = st.ini ? `⭐ <b>${st.xp}</b> XP` : '🎯 Fase de testes'; };
  xp();
  if (!info) { M.innerHTML = `<div class="fx-card tx-card"><div class="fx-card-h"><h2>Link indisponível</h2></div><div class="badge b-bad" style="display:flex;padding:10px 12px;white-space:normal">${h(erro)}</div><p class="muted">Peça um novo link ao RH.</p></div>`; return; }
  // 1) identificação
  const telaIni = () => {
    const n = testes.length, min = testes.reduce((a, t) => a + TESTE_INFO[t].min, 0), um = n === 1;
    M.innerHTML = `<section class="fx-hero tx-hero"><div class="fx-hero-txt"><small>#indoalemporvoce</small><h1>Fase de <b>${um ? 'teste' : 'testes'}</b></h1><p class="fx-plus">${n} ${um ? 'DESAFIO' : 'DESAFIOS'} · CERCA DE ${min} MINUTOS</p><p>Parabéns! Você avançou no processo seletivo do Grupo R Center. 🎉</p></div></section>
      <div class="tx-boas">
        <h2>Parabéns por chegar até aqui! 💙🧡</h2>
        <p>Ficamos felizes em informar que você avançou para a <b>etapa de ${um ? 'teste' : 'testes'}</b> do nosso processo seletivo${info.titulo ? ` para a vaga de <b>${h(info.titulo)}</b>` : ''}. Isso mostra que o seu perfil chamou a nossa atenção, e agora queremos conhecer você ainda melhor.</p>
        <p>${um ? 'O teste a seguir é' : `Os ${n} testes a seguir são`} uma ferramenta de apoio para o nosso time de Recursos Humanos. Não existe resposta certa ou errada nas perguntas sobre o seu jeito de ser: o mais importante é responder com sinceridade, do jeito que você realmente é no dia a dia.</p>
        <div class="tx-dicas">
          <div><i>⏱️</i><span><b>Reserve cerca de ${min} minutos</b>${um ? '' : 'Você pode fazer um teste de cada vez e voltar depois pelo mesmo link.'}</span></div>
          <div><i>🤫</i><span><b>Escolha um lugar tranquilo</b>Sem pressa e sem interrupções, para se concentrar.</span></div>
          <div><i>📶</i><span><b>Use uma boa conexão</b>Internet estável no celular ou no computador.</span></div>
          <div><i>🙋</i><span><b>Responda sozinho(a)</b>Queremos conhecer você, não outra pessoa.</span></div>
        </div>
        <p class="tx-ass">Desejamos boa sorte! <b>Equipe de Recursos Humanos · Grupo R Center</b></p>
      </div>
      <form class="fx-card tx-card" id="txF">
        <div class="fx-card-h"><h2>Antes de começar</h2><p>Precisamos identificar você.</p></div>
        ${info.titulo ? `<div class="fx-vaga"><span>Vaga</span><b>${h(info.titulo)}</b></div>` : ''}
        ${recs.length ? `<div class="field"><label>Quem do RH falou com você?</label><select class="input" name="rec" required><option value="">Selecione o(a) recrutador(a)</option>${recs.map(x => `<option ${st.rec === x ? 'selected' : ''}>${h(x)}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>Nome completo</label><input class="input" name="nome" required autocomplete="name" value="${h(st.nome || '')}" placeholder="Como está no documento"></div>
        <div class="row2"><div class="field"><label>CPF</label><input class="input" name="cpf" required inputmode="numeric" maxlength="14" value="${h(st.cpf ? cpfFmt(st.cpf) : '')}" placeholder="000.000.000-00"><small id="cpfMsg" class="fi-cpf"></small></div>
        <div class="field"><label>WhatsApp (opcional)</label><input class="input" name="tel" inputmode="tel" value="${h(st.tel || '')}" placeholder="(85) 90000-0000"></div></div>
        ${info.titulo ? '' : `<div class="field"><label>Vaga de interesse (opcional)</label><input class="input" name="vaga" maxlength="80" value="${h(st.vaga || '')}" placeholder="Ex.: Operador de caixa"></div>`}
        <label class="tx-lgpd"><input type="checkbox" name="ok" ${st.ini ? 'checked' : ''}> <span>Autorizo o Grupo R Center a usar minhas respostas somente neste processo seletivo, conforme a LGPD. Os resultados são analisados pela equipe de RH e por psicólogo(a).</span></label>
        <div id="fiErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div>
        <button class="btn primary block fx-btn" type="submit">Começar ▶</button>
      </form>`;
    const f = $('#txF'), err = $('#fiErr');
    f.cpf.oninput = () => { const d = f.cpf.value.replace(/\D/g, '').slice(0, 11); f.cpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); const m = $('#cpfMsg'); m.className = 'fi-cpf ' + (d.length === 11 ? (cpfOk_(d) ? 'ok' : 'bad') : ''); m.textContent = d.length === 11 ? (cpfOk_(d) ? '✓ CPF válido' : 'CPF inválido. Confira os números.') : ''; };
    f.onsubmit = e => {
      e.preventDefault(); err.classList.add('hidden');
      const falha = m => { err.textContent = m; err.classList.remove('hidden'); };
      if (f.rec && !f.rec.value) return falha('Escolha quem do RH falou com você.');
      if (f.nome.value.trim().split(/\s+/).length < 2) return falha('Informe o seu nome completo.');
      if (!cpfOk_(f.cpf.value)) return falha('CPF inválido. Confira os números.');
      if (!f.ok.checked) return falha('Para continuar, marque a autorização de uso dos dados.');
      Object.assign(st, { ini: true, nome: f.nome.value.trim(), cpf: f.cpf.value.replace(/\D/g, ''), tel: f.tel.value, rec: f.rec ? f.rec.value : '', vaga: f.vaga ? f.vaga.value.trim() : '' }); salvar(); xp();
      telaLista();
    };
  };
  // 2) lista de desafios
  const telaLista = () => {
    const feitos = testes.filter(t => st.feitos[t]).length, todos = feitos === testes.length;
    M.innerHTML = `<div class="tx-head"><h2>${todos ? '🏆 Missão cumprida!' : `Olá, ${h(st.nome.split(' ')[0])}! 👋`}</h2><p>${todos ? 'Você concluiu todos os desafios. O RH já recebeu suas respostas. Obrigado pela participação!' : 'Escolha um desafio para começar. Você pode fazer um de cada vez.'}</p>
      <div class="tx-prog"><i style="width:${Math.round(feitos / testes.length * 100)}%"></i></div><small>${feitos} de ${testes.length} concluído(s)</small></div>
      <div class="tx-lista">${testes.map((t, i) => { const T = TESTE_INFO[t], ok = st.feitos[t]; return `<button class="tx-item ${ok ? 'ok' : ''}" data-t="${t}" ${ok ? 'disabled' : ''} style="--c:${T.cor}"><span class="tx-ic">${ok ? '✅' : T.icone}</span><span class="tx-it"><b>${i + 1}. ${T.nome}</b><small>${T.desc}</small><em>${ok ? 'Concluído · +' + st.feitos[t] + ' XP' : '⏱ cerca de ' + T.min + ' min'}</em></span><span class="tx-go">${ok ? '' : '▶'}</span></button>`; }).join('')}</div>
      ${todos ? `<div class="tx-fim">#VemSerGRC 💙🧡</div>` : `<p class="tx-dica">💡 Responda pensando em como você é de verdade, não em como acha que deveria ser.</p>`}`;
    $$('[data-t]', M).forEach(b => b.onclick = () => rodar(b.dataset.t));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // 3) responder um desafio (uma pergunta por tela)
  const rodar = t => {
    const Q = testePerguntas_(t), T = TESTE_INFO[t];
    const k = 'r_' + t; let R = st[k] || [], t0 = Date.now() - (st['s_' + t] || 0) * 1000;
    let i = Math.min(R.length, Q.length - 1); if (R.length >= Q.length) i = Q.length - 1;
    const tela = () => {
      const q = Q[i], pr = Math.round(i / Q.length * 100);
      if (q.tipo === 'txt') return telaTxt(q, pr);
      M.innerHTML = `<div class="tx-q" style="--c:${T.cor}">
        <div class="tx-qtop"><button class="tx-back" id="txV">‹</button><div class="tx-prog"><i style="width:${pr}%"></i></div><span>${i + 1}/${Q.length}</span></div>
        <div class="tx-qcard">
          <div class="tx-tag">${T.icone} ${T.nome}${q.fase ? ` · Fase ${i + 1}` : ''}</div>
          ${q.emoji ? `<div class="tx-emoji">${q.emoji}</div>` : ''}
          <h3>${h(q.titulo)}</h3>
          ${t === 'situacional' ? '<p class="tx-sub">O que você faria?</p>' : t === 'forcas' || t === 'fit' ? '<p class="tx-sub">O quanto essa frase combina com você?</p>' : ''}
          <div class="tx-ops ${q.tipo === 'lik' ? 'lik' : ''}">${q.tipo === 'lik' ? LIKERT_.map((l, j) => `<button class="tx-op lk ${String(R[i]) === String(j + 1) ? 'sel' : ''}" data-v="${j + 1}"><i>${['😕', '🙁', '😐', '🙂', '😄'][j]}</i><span>${l}</span></button>`).join('') : q.ops.map((o, j) => `<button class="tx-op ${String(R[i]) === o.v ? 'sel' : ''}" data-v="${h(o.v)}"><i>${'ABCD'[j]}</i><span>${h(o.t)}</span></button>`).join('')}</div>
        </div></div>`;
      $('#txV').onclick = () => { if (i > 0) { i--; tela(); } else telaLista(); };
      $$('.tx-op', M).forEach(b => b.onclick = () => {
        $$('.tx-op', M).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
        R[i] = b.dataset.v; st[k] = R; st['s_' + t] = Math.round((Date.now() - t0) / 1000); salvar();
        setTimeout(() => { if (i < Q.length - 1) { i++; tela(); } else enviar(); }, 230);
      });
    };
    // pergunta aberta: o candidato escreve com as próprias palavras (sem colar)
    const telaTxt = (q, pr) => {
      const MIN = 120;
      M.innerHTML = `<div class="tx-q" style="--c:${T.cor}">
        <div class="tx-qtop"><button class="tx-back" id="txV">‹</button><div class="tx-prog"><i style="width:${pr}%"></i></div><span>${i + 1}/${Q.length}</span></div>
        <div class="tx-qcard">
          <div class="tx-tag">${T.icone} ${T.nome} · Pergunta aberta ${q.n} de ${FIT_ABERTAS.length}</div>
          <h3>${h(q.titulo)}</h3>
          <p class="tx-sub">Escreva com as suas palavras. Conte um caso real: o que aconteceu, o que você fez e por quê.</p>
          <textarea class="input tx-txt" id="txA" rows="7" maxlength="1800" placeholder="Ex.: Uma vez, no meu trabalho anterior, ...">${h(R[i] || '')}</textarea>
          <div class="tx-cont"><small id="txN"></small><small id="txCola" class="hidden">Para conhecermos você, escreva a resposta aqui, sem colar.</small></div>
          <button class="btn primary block fx-btn" id="txOk" style="margin-top:12px">${i < Q.length - 1 ? 'Próxima ▶' : 'Enviar respostas ✔'}</button>
        </div></div>`;
      const ta = $('#txA'), cnt = $('#txN'), ok = $('#txOk');
      const at = () => { const n = ta.value.trim().length; cnt.textContent = n < MIN ? `Escreva pelo menos ${MIN} caracteres (${n}/${MIN})` : `✓ ${n} caracteres`; cnt.style.color = n < MIN ? '' : '#16a34a'; ok.disabled = n < MIN; };
      ta.oninput = () => { R[i] = ta.value; st[k] = R; st['s_' + t] = Math.round((Date.now() - t0) / 1000); salvar(); at(); };
      ta.onpaste = ta.ondrop = e => { e.preventDefault(); $('#txCola').classList.remove('hidden'); };
      at(); setTimeout(() => ta.focus(), 50);
      $('#txV').onclick = () => { if (i > 0) { i--; tela(); } else telaLista(); };
      ok.onclick = () => { R[i] = ta.value.trim(); st[k] = R; salvar(); if (i < Q.length - 1) { i++; tela(); } else enviar(); };
    };
    const enviar = async () => {
      M.innerHTML = `<div class="fx-card tx-card" style="text-align:center;padding:40px 20px"><div class="spin" style="margin:0 auto 14px"></div><b>Enviando suas respostas…</b></div>`;
      try {
        const j = await sendRaw_('testeEnviar', { codigo, data: { teste: t, nome: st.nome, cpf: st.cpf, tel: st.tel, recrutador: st.rec, vaga: st.vaga, resp: R, seg: st['s_' + t] || 0 } });
        if (!j || !j.ok) throw new Error((j && j.error) || 'Não foi possível enviar.');
        const ganho = 100 + Q.length * 10; st.feitos[t] = ganho; st.xp += ganho; delete st[k]; if (t === 'situacional') { delete st.mundo; delete st.jogo; } salvar(); xp();
        M.innerHTML = `<div class="fx-card tx-card tx-win" style="--c:${T.cor}"><div class="tx-badge">${T.icone}</div><h2>Desafio concluído!</h2><p>Você ganhou <b>+${ganho} XP</b> e o selo <b>${T.nome}</b>.</p><button class="btn primary block fx-btn" id="txC">Continuar ▶</button></div>`;
        $('#txC').onclick = telaLista;
      } catch (e) {
        M.innerHTML = `<div class="fx-card tx-card"><h2>Ops!</h2><div class="badge b-bad" style="display:flex;padding:10px 12px;white-space:normal;margin-bottom:14px">${h(e.message)}</div><button class="btn primary block fx-btn" id="txR">Tentar de novo</button></div>`;
        $('#txR').onclick = enviar;
      }
    };
    if (t === 'situacional') mundoGRC_(M, st, salvar, n => { st.xp += n; salvar(); xp(); }, (resp, seg) => { R = resp; st['s_' + t] = seg; salvar(); enviar(); });
    else tela();
  };
  if (st.ini) telaLista(); else telaIni();
}

/* ---------------- AGENDA DE ENTREVISTAS: página pública do candidato (?agenda=CODIGO) ---------------- */
const AG_SEM_ = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const agDt_ = d => new Date(d + 'T12:00:00');
const agDdMm_ = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const agExt_ = d => { const x = agDt_(d); return AG_SEM_[x.getDay()] + ', ' + x.getDate() + ' de ' + ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][x.getMonth()]; };
const AG_30_DESDE_ = '2026-11-12';
const agPasso_ = dia => String(dia || '9999-12-31') >= AG_30_DESDE_ ? 30 : 20;
const agHorariosF_ = dia => { const out = [], p = agPasso_(dia); [[8, 12], [13, 17]].forEach(([a, b]) => { for (let m = a * 60; m < b * 60; m += p) out.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2)); }); return out; };
// horários do dia + qualquer entrevista já marcada fora da grade (ex.: marcada no formato antigo de 20 min)
const agHorariosDia_ = D => { const base = (D && D.horarios && D.horarios.length && typeof D.horarios[0] === 'string') ? D.horarios : agHorariosF_(D && D.dia); const extra = Object.keys((D && D.s) || {}).filter(x => base.indexOf(x) < 0 && D.s[x] && D.s[x].st !== 'cancelado' && D.s[x].st !== 'bloqueado'); return extra.length ? base.concat(extra).sort() : base; };
const agFim_ = (hh, dia) => { const [a, b] = hh.split(':').map(Number), m = a * 60 + b + agPasso_(dia); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
function agGcal_(dia, hh, rec) {
  const s = dia.replace(/-/g, '') + 'T' + hh.replace(':', '') + '00', e = dia.replace(/-/g, '') + 'T' + agFim_(hh, dia).replace(':', '') + '00';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Entrevista online · Grupo R Center') + '&dates=' + s + '/' + e + '&ctz=America/Fortaleza&details=' + encodeURIComponent('Entrevista por Google Meet com ' + rec + ' (RH do Grupo R Center). O link chega no seu e-mail.');
}
async function renderAgenda(codigo) {
  document.documentElement.dataset.theme = 'light';
  document.title = 'Vem ser GRC · Agende sua entrevista';
  $('#root').innerHTML = `<div class="loader"><div style="text-align:center"><div class="spin" style="margin:0 auto 14px"></div><div class="muted">Abrindo…</div></div></div>`;
  const RC = 'https://www.rcentersupermercado.com.br/img/', img = (f, alt, cls) => `<img src="${RC}grupo/${f}" alt="${h(alt)}" class="${cls || ''}" onerror="this.style.display='none'">`;
  const LK = 'grc_agenda_' + codigo;
  let st = {}; try { st = JSON.parse(localStorage.getItem(LK) || '{}'); } catch (e) {}
  const salvar = () => { try { localStorage.setItem(LK, JSON.stringify(st)); } catch (e) {} };
  let info = null, erro = '';
  const carregar = async () => { try { const j = await sendRaw_('agendaInfo', { codigo }); if (j && j.ok) { info = j; erro = ''; } else erro = (j && j.error) || 'Link inválido.'; } catch (e) { erro = e.message; } };
  await carregar();
  $('#root').innerHTML = `<div class="fx tx ag">
    <header class="fx-top"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo')}<span class="tx-xp">📅 Entrevista online</span></div></header>
    <div class="fx-wrap"><div class="tx-main" id="agM"></div></div>
    <footer class="fx-rodape"><div class="fx-wrap">${img('grupo-r-center-branco.webp', 'Grupo R Center', 'fx-logo-sm')}<span>© ${new Date().getFullYear()} Grupo R Center · Indo além por você</span></div></footer>
  </div>`;
  const M = $('#agM');
  if (!info) { M.innerHTML = `<div class="fx-card tx-card"><div class="fx-card-h"><h2>Link indisponível</h2></div><div class="badge b-bad" style="display:flex;padding:10px 12px;white-space:normal">${h(erro)}</div><p class="muted">Peça um novo link ao RH.</p></div>`; return; }
  // campos da ficha (usados no agendamento e, se faltar, depois da confirmação)
  const fichaCampos = () => `<div class="field"><label>Nome completo da mãe</label><input class="input" name="mae" required value="${h(st.mae || '')}" placeholder="Como está no documento"></div>
          <div class="row2"><div class="field"><label>CPF</label><input class="input" name="cpf" required inputmode="numeric" maxlength="14" value="${h(st.cpf ? cpfFmt(st.cpf) : '')}" placeholder="000.000.000-00"><small id="agCpf" class="fi-cpf"></small></div>
          <div class="field"><label>Data de nascimento</label><input class="input" name="nasc" type="date" required value="${h(st.nasc || '')}"></div></div>
          <div class="fi-sec">Fardamento</div>
          <div class="fi-farda">${[['blusa', 'Blusa', FICHA_BLUSA], ['calca', 'Calça', FICHA_CALCA], ['bota', 'Bota / calçado', FICHA_BOTA]].map(([nm, lb, ops]) => `<div class="field"><label>${lb}</label><select class="input" name="${nm}" required><option value="">—</option>${ops.map(o => `<option ${String(st[nm] || '') === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`).join('')}</div>`;
  const cpfMascara = f => { if (f.cpf) f.cpf.oninput = () => { const d = f.cpf.value.replace(/\D/g, '').slice(0, 11); f.cpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); const m = $('#agCpf'); m.className = 'fi-cpf ' + (d.length === 11 ? (cpfOk_(d) ? 'ok' : 'bad') : ''); m.textContent = d.length === 11 ? (cpfOk_(d) ? '✓ CPF válido' : 'CPF inválido. Confira os números.') : ''; }; };
  // devolve a ficha ou o texto do erro
  const fichaColeta = (f, nome, tel, vaga) => {
    const fi = { nome, mae: f.mae.value.trim(), cpf: f.cpf.value.replace(/\D/g, ''), nasc: f.nasc.value, tel, blusa: f.blusa.value, calca: f.calca.value, bota: f.bota.value, vaga, recrutador: info.rec };
    Object.assign(st, { mae: fi.mae, cpf: fi.cpf, nasc: fi.nasc, blusa: fi.blusa, calca: fi.calca, bota: fi.bota }); salvar();
    if (fi.mae.split(/\s+/).length < 2) return 'Informe o nome completo da sua mãe.';
    if (!cpfOk_(fi.cpf)) return 'CPF inválido. Confira os números.';
    if (!fi.nasc) return 'Informe a sua data de nascimento.';
    if (!fi.blusa || !fi.calca || !fi.bota) return 'Informe os tamanhos do fardamento.';
    return fi;
  };
  const rotDia = d => d === info.hoje ? 'Hoje' : AG_SEM_[agDt_(d).getDay()].replace('-feira', '').replace(/^./, c => c.toUpperCase());
  // confirmação já feita neste aparelho
  const telaOk = () => {
    const m = st.marcado;
    M.innerHTML = `<div class="fx-card tx-card ag-ok">
      <div class="ag-ok-ic">✅</div><h2>Entrevista agendada!</h2>${m.ficha ? '<div class="ag-fi-ok">📄 Sua ficha também foi enviada ao RH.</div>' : ''}
      ${info.foto ? `<img class="ag-ok-foto" src="${h(info.foto)}" alt="${h(m.rec)}">` : ''}
      <div class="ag-quando"><span>📅</span><div><b>${h(agExt_(m.dia).replace(/^./, c => c.toUpperCase()))}</b><small>das ${m.h} às ${agFim_(m.h, m.dia)} · Google Meet · com ${h(m.rec)}</small></div></div>
      ${info.ficha && !m.ficha ? `<form id="agFi" class="ag-fi-falta"><div class="ag-passo"><i>📄</i><b>Falta só a sua ficha</b></div><p class="ag-fi-txt">Preencha exatamente como está nos seus documentos para o RH já receber os seus dados.</p>${fichaCampos()}<div id="agErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div><button class="btn primary block fx-btn" type="submit">Enviar minha ficha ✔</button></form>` : ''}
      ${m.meet ? `<div class="ag-meet"><small>🎥 Link da sua entrevista (Google Meet)</small><a href="${h(m.meet)}" target="_blank" rel="noopener">${h(m.meet.replace('https://', ''))}</a><a class="btn primary block fx-btn" href="${h(m.meet)}" target="_blank" rel="noopener">Entrar na entrevista</a><span>Guarde este link. Ele também foi enviado para o seu e-mail <b>${h(m.email)}</b>.</span></div>` : `<p>Você receberá o <b>convite com o link do Google Meet</b> no e-mail <b>${h(m.email)}</b>. Confira também a caixa de spam e as promoções.</p>`}
      <div class="tx-dicas">
        <div><i>⏰</i><span><b>Entre 5 minutos antes</b>Teste a câmera e o áudio com antecedência.</span></div>
        <div><i>🎧</i><span><b>Lugar tranquilo</b>De preferência com fone de ouvido e boa iluminação.</span></div>
        <div><i>📶</i><span><b>Boa conexão</b>Internet estável no celular ou no computador.</span></div>
        <div><i>🙂</i><span><b>Seja você</b>Queremos conhecer a sua história e o seu jeito.</span></div>
      </div>
      <a class="btn block fx-btn" style="margin-top:6px" target="_blank" rel="noopener" href="${agGcal_(m.dia, m.h, m.rec)}">📆 Adicionar à minha agenda</a>
      <p class="muted" style="font-size:13px;margin:14px 0 0">Precisa remarcar? Fale com o RH pelo mesmo contato que enviou este link.</p>
      <button class="ag-outro" id="agOutro">Agendar para outra pessoa</button></div>`;
    $('#agOutro').onclick = () => { st = {}; salvar(); tela(); };
    const ff = $('#agFi');
    if (ff) {
      cpfMascara(ff);
      ff.onsubmit = async e => {
        e.preventDefault();
        const err = $('#agErr', ff), falha = t => { err.textContent = t; err.classList.remove('hidden'); }; err.classList.add('hidden');
        const fi = fichaColeta(ff, st.nome || '', st.tel || '', st.vaga || ''); if (typeof fi === 'string') return falha(fi);
        const b = $('button[type=submit]', ff); b.disabled = true; b.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span>';
        try { const jf = await sendRaw_('fichaEnviar', { codigo: info.ficha, data: fi }); if (!jf || !jf.ok) throw new Error((jf && jf.error) || 'Não foi possível enviar a ficha.'); m.ficha = true; salvar(); telaOk(); }
        catch (e2) { b.disabled = false; b.textContent = 'Enviar minha ficha ✔'; falha(e2.message); }
      };
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  let sel = { dia: null, h: null };
  const tela = () => {
    if (st.marcado && st.marcado.dia >= info.hoje) return telaOk();
    const dias = info.dias;
    if (!sel.dia || !dias.find(d => d.dia === sel.dia)) sel.dia = (dias.find(d => d.horarios.some(x => x.livre)) || dias[0]).dia;
    const D = dias.find(d => d.dia === sel.dia), livres = D.horarios.filter(x => x.livre).length;
    if (sel.h && !(D.horarios.find(x => x.h === sel.h) || {}).livre) sel.h = null;
    const bt = x => `<button class="ag-h ${x.livre ? '' : 'off'} ${sel.h === x.h ? 'sel' : ''}" data-h="${x.h}" ${x.livre ? '' : 'disabled'}>${x.h}</button>`;
    M.innerHTML = `<section class="fx-hero tx-hero"><div class="fx-hero-txt"><small>#indoalemporvoce</small><h1>Agende sua <b>entrevista</b></h1><p class="fx-plus">ONLINE · GOOGLE MEET · ${agPasso_((dias.find(d => d.horarios.some(x => x.livre)) || dias[0] || {}).dia)} MINUTOS</p><p>Escolha o melhor horário para conversar com <b>${h(info.rec)}</b>, do RH do Grupo R Center.</p></div></section>
      <div class="ag-quem">${info.foto ? `<img src="${h(info.foto)}" alt="${h(info.rec)}">` : `<span class="ag-ini">${h(info.rec.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span>`}<div><small>Você vai conversar com</small><b>${h(info.rec)}</b><span>Recrutamento e Seleção · Grupo R Center</span></div></div>
      <div class="fx-card tx-card ag-card">
        <div class="ag-passo"><i>1</i><b>Escolha o dia</b></div>
        <div class="ag-dias">${dias.map(d => { const n = d.horarios.filter(x => x.livre).length; return `<button class="ag-dia ${d.dia === sel.dia ? 'sel' : ''}" data-d="${d.dia}"><small>${rotDia(d.dia)}</small><b>${agDdMm_(d.dia)}</b><em>${n ? n + ' horário' + (n > 1 ? 's' : '') : 'lotado'}</em></button>`; }).join('')}</div>
        <div class="ag-passo"><i>2</i><b>Escolha o horário</b><span>${livres ? livres + ' livre' + (livres > 1 ? 's' : '') : ''}</span></div>
        ${livres ? `<div class="ag-turno">☀️ Manhã</div><div class="ag-hs">${D.horarios.filter(x => x.h < '12:00').map(bt).join('')}</div><div class="ag-turno">🌤️ Tarde</div><div class="ag-hs">${D.horarios.filter(x => x.h >= '13:00').map(bt).join('')}</div>`
        : `<div class="ag-vazio">Não há mais horários livres neste dia.${dias.length > 1 ? ' Escolha o outro dia acima.' : ''}</div>`}
        <form id="agF" class="${sel.h ? '' : 'hidden'}">
          <div class="ag-passo"><i>3</i><b>Seus dados</b></div>
          <div class="ag-resumo">📅 <b>${h(agExt_(sel.dia).replace(/^./, c => c.toUpperCase()))}</b> às <b>${sel.h || ''}</b></div>
          <div class="field"><label>Nome completo</label><input class="input" name="nome" required autocomplete="name" value="${h(st.nome || '')}" placeholder="Como está no documento"></div>
          <div class="row2"><div class="field"><label>WhatsApp</label><input class="input" name="tel" required inputmode="tel" value="${h(st.tel || '')}" placeholder="(85) 90000-0000"></div>
          <div class="field"><label>E-mail <small class="muted">(o convite chega aqui)</small></label><input class="input" name="email" type="email" required autocomplete="email" value="${h(st.email || '')}" placeholder="seuemail@gmail.com"></div></div>
          <div class="field"><label>Vaga de interesse (opcional)</label><input class="input" name="vaga" maxlength="80" value="${h(st.vaga || '')}" placeholder="Ex.: Operador de caixa"></div>
          ${info.ficha ? `<div class="ag-passo"><i>4</i><b>Ficha do candidato</b></div>
          <p class="ag-fi-txt">Preencha exatamente como está nos seus documentos. Assim o RH já recebe a sua ficha junto com o agendamento.</p>
          ${fichaCampos()}` : ''}
          <div id="agErr" class="badge b-bad hidden" style="display:flex;padding:10px 12px;margin-bottom:14px;white-space:normal"></div>
          <button class="btn primary block fx-btn" type="submit">${info.ficha ? 'Confirmar entrevista e enviar ficha ✔' : 'Confirmar agendamento ✔'}</button>
          ${info.ficha ? '<p class="fx-lgpd">🔒 Seus dados serão usados somente pelo RH do Grupo R Center para o processo seletivo e a admissão, conforme a Lei Geral de Proteção de Dados (LGPD).</p>' : ''}
        </form>
        ${sel.h ? '' : '<p class="tx-dica" style="margin:14px 0 0">💡 Toque em um horário livre para continuar.</p>'}
      </div>`;
    $$('.ag-dia', M).forEach(b => b.onclick = () => { sel = { dia: b.dataset.d, h: null }; tela(); });
    $$('.ag-h:not(.off)', M).forEach(b => b.onclick = () => { sel.h = b.dataset.h; tela(); const f = $('#agF'); if (f) setTimeout(() => f.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); });
    const f = $('#agF');
    f.tel.oninput = () => { f.tel.value = telFmt(f.tel.value.replace(/\D/g, '').slice(0, 11)); };
    cpfMascara(f);
    f.onsubmit = async e => {
      e.preventDefault();
      const err = $('#agErr'), falha = m => { err.textContent = m; err.classList.remove('hidden'); };
      err.classList.add('hidden');
      const d = { nome: f.nome.value.trim(), tel: f.tel.value.replace(/\D/g, ''), email: f.email.value.trim(), vaga: f.vaga.value.trim(), dia: sel.dia, h: sel.h };
      if (d.nome.split(/\s+/).length < 2) return falha('Informe o seu nome completo.');
      if (d.tel.length < 10) return falha('Informe um WhatsApp válido com DDD.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return falha('Informe um e-mail válido. O convite da entrevista será enviado para ele.');
      Object.assign(st, { nome: d.nome, tel: d.tel, email: d.email, vaga: d.vaga });
      let fi = null;
      if (info.ficha) {
        fi = fichaColeta(f, d.nome, d.tel, d.vaga); if (typeof fi === 'string') return falha(fi);
        d.cpf = fi.cpf; d.ficha = true;
      }
      salvar();
      const b = $('button[type=submit]', f); b.disabled = true; b.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span>';
      try {
        // a ficha vai primeiro (se tiver erro nos dados, o horário não é ocupado)
        if (fi && st.fichaOk !== fi.cpf) { const jf = await sendRaw_('fichaEnviar', { codigo: info.ficha, data: fi }); if (!jf || !jf.ok) throw new Error((jf && jf.error) || 'Não foi possível enviar a ficha.'); st.fichaOk = fi.cpf; salvar(); }
        const j = await sendRaw_('agendaMarcar', { codigo, data: d });
        if (!j || !j.ok) {
          if (j && j.ocupado) { await carregar(); sel.h = null; tela(); toast(j.error, true); return; }
          throw new Error((j && j.error) || 'Não foi possível agendar.');
        }
        st.marcado = { dia: j.dia, h: j.h, rec: j.rec, email: d.email, meet: j.meet || '', ficha: !!fi }; delete st.fichaOk; salvar(); telaOk();
      } catch (e2) { b.disabled = false; b.textContent = info.ficha ? 'Confirmar entrevista e enviar ficha ✔' : 'Confirmar agendamento ✔'; falha(e2.message); }
    };
  };
  tela();
}

/* ---------------- AGENDA DE ENTREVISTAS: tela do RH ---------------- */
const podeAgenda = () => !!(S.user && (isAdmin() || S.user.podeAgenda));
const agendaUrl_ = c => { const base = cfgv('siteUrl', '') || (location.origin + location.pathname); return base.replace(/\/+$/, '') + '/agenda.html?agenda=' + c; };
const agendaNovos = () => ((S.agenda && S.agenda.dias) || []).reduce((n, d) => n + Object.values(d.s || {}).filter(o => o && o.visto === false && o.st === 'marcado').length, 0);
function compartilharAgenda_(c) {
  const txt = `Olá! Para agendar a sua entrevista online com o RH do ${cfgv('empresa', CFG.EMPRESA || 'Grupo R Center')}, escolha o melhor horário e preencha a sua ficha pelo link abaixo (leva poucos minutos; tenha o seu CPF em mãos).\n\nA entrevista dura cerca de ${agPasso_(new Date().toLocaleDateString('sv-SE'))} minutos e será pelo Google Meet. O convite com o link será enviado para o seu e-mail.\n\n${agendaUrl_(c)}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
const AG_ST_ = { marcado: ['Marcada', 'b-info'], realizada: ['Realizada', 'b-ok'], faltou: ['Faltou', 'b-bad'], cancelado: ['Cancelada', ''], bloqueado: ['Bloqueado', ''] };
const agSegunda_ = d => { const x = agDt_(d), w = x.getDay(); x.setDate(x.getDate() - (w === 0 ? 6 : w - 1)); return x.toLocaleDateString('sv-SE'); };
const agSomaF_ = (d, n) => { const x = agDt_(d); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
async function pgAgenda() {
  setTitle('Agenda de entrevistas', `Google Meet · ${agPasso_(new Date().toLocaleDateString('sv-SE'))} min · 8h–12h e 13h–17h`);
  const v = $('#view'), f = getF('agenda'), hojeL = new Date().toLocaleDateString('sv-SE');
  if (!f.dia || f.dia < agSomaF_(hojeL, -60)) f.dia = hojeL;
  const rt = S.rt;
  let seq = 0, prefOk = false;
  if (!S.agenda || S.agenda.rec !== f.rec || (S.agenda.dias[0] || {}).dia !== agSegunda_(f.dia)) { const c = agCache_(f.rec, agSegunda_(f.dia)); if (c) S.agenda = c; }
  const buscar = async (silent) => {
    const meuSeq = ++seq, sem = agSegunda_(f.dia), recPed = f.rec || '';
    try {
      const j = await api('agendaList', { rec: recPed, de: sem, n: 7 }, { silent: true });
      if (rt !== S.rt) return;
      agCacheGrava_(j);
      if (meuSeq !== seq || (recPed && j.rec !== f.rec) || agSegunda_(f.dia) !== sem) return;
      if (S.agPend > 0) return; // há gravação em andamento: mantém o que já está na tela
      S.agenda = j; f.rec = j.rec; saveF();
      if (!$('.overlay')) draw(); updateShell();
      if (!prefOk && isAdmin() && j.recs.length > 1) { prefOk = true; (async () => { for (const r of j.recs) { if (r.rec === j.rec || rt !== S.rt) continue; try { agCacheGrava_(await api('agendaList', { rec: r.rec, de: sem, n: 7 }, { silent: true })); } catch (e) {} } })(); }
      const novos = (j.dias || []).filter(d => d.dia === f.dia && Object.values(d.s || {}).some(o => o && o.visto === false));
      if (novos.length && j.rec === j.meu.rec) { api('agendaVisto', { dias: novos.map(d => d.dia) }, { silent: true }).catch(() => {}); setTimeout(() => { novos.forEach(d => Object.values(d.s || {}).forEach(o => { if (o) o.visto = true; })); updateShell(); }, 4000); }
    } catch (e) { if (!silent && meuSeq === seq) { if (!S.agenda) v.innerHTML = `<div class="card muted">${h(e.message)}</div>`; else toast(e.message, true); } }
  };
  S.agBuscar = buscar;
  const draw = () => {
    const A = S.agenda;
    if (!A || agSegunda_(f.dia) !== (A.dias[0] || {}).dia || (f.rec && A.rec !== f.rec)) { v.innerHTML = `<div class="sk" style="height:360px"></div>`; return; }
    const hoje = A.hoje, semana = A.dias.slice(0, 5), D = A.dias.find(d => d.dia === f.dia) || semana[0], meu = A.rec === A.meu.rec;
    const agoraMin = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
    const passado = hh => D.dia < hoje || (D.dia === hoje && Number(hh.slice(0, 2)) * 60 + Number(hh.slice(3)) + 20 <= agoraMin);
    const qtd = d => Object.values(d.s || {}).filter(o => o && o.st !== 'bloqueado' && o.st !== 'cancelado').length;
    const fim = d => d.fechado || d.feriado || [0, 6].includes(agDt_(d.dia).getDay());
    const slot = hh => {
      const o = D.s[hh], pas = passado(hh);
      if (!o || o.st === 'cancelado') return `<button class="ar-sl livre ${pas || fim(D) ? 'pas' : ''}" data-h="${hh}"><b>${hh}</b><span>${fim(D) ? '—' : pas ? '' : 'Livre'}</span>${o ? `<em class="faint">cancelada: ${h(o.nome)}</em>` : ''}</button>`;
      if (o.st === 'bloqueado') return `<button class="ar-sl bloq" data-h="${hh}"><b>${hh}</b><span>🔒 Bloqueado${o.motivo ? ' · ' + h(o.motivo) : ''}</span></button>`;
      const [lb, cl] = AG_ST_[o.st] || AG_ST_.marcado;
      return `<button class="ar-sl ocup st-${o.st} ${pas ? 'pas' : ''}" data-h="${hh}"><b>${hh}</b><span class="ar-c"><strong>${h(o.nome)}</strong><small>${o.vaga ? h(o.vaga) + ' · ' : ''}${o.tel ? h(telFmt(o.tel)) : ''}${o.email ? `<span class="ar-em"> · ${h(o.email)}</span>` : ''}</small></span><span class="ar-tags">${o.visto === false ? '<span class="badge b-info">novo</span>' : ''}${o.ficha ? '<span class="badge" title="Preencheu a ficha no agendamento">📄</span>' : ''}${o.remarcado ? '<span class="badge b-origem b-warn" title="Entrevista remarcada">remarcada</span>' : o.origem === 'candidato' ? '<span class="badge b-origem" title="O candidato escolheu pelo link">pelo link</span>' : ''}<span class="badge ${cl}">${lb}</span></span></button>`;
    };
    const HD = agHorariosDia_(D);
    const hsT = t => HD.filter(x => t === 'm' ? x < '12:00' : x >= '13:00');
    const turnoH = t => {
      const hs = hsT(t), livres = hs.filter(x => (!D.s[x] || D.s[x].st === 'cancelado') && !passado(x)).length, bloq = hs.filter(x => D.s[x] && D.s[x].st === 'bloqueado').length;
      const bt = fim(D) || D.dia < hoje ? '' : livres ? `<button class="btn sm ghost" data-turno="${t}" data-bloq="1">🔒 Fechar ${t === 'm' ? 'manhã' : 'tarde'}</button>` : bloq ? `<button class="btn sm ghost" data-turno="${t}" data-bloq="">${ic('check')} Abrir ${t === 'm' ? 'manhã' : 'tarde'}</button>` : '';
      return `<div class="ar-turno"><span>${t === 'm' ? '☀️ Manhã' : '🌤️ Tarde'}</span>${bt}</div>`;
    };
    const ini = agSegunda_(f.dia);
    v.innerHTML = `
    <div class="toolbar">
      <button class="btn icon" id="arAnt" title="Semana anterior">${ic('chevl')}</button>
      <b class="ar-sem">${agDdMm_(ini)} a ${agDdMm_(agSomaF_(ini, 4))}</b>
      <button class="btn icon" id="arProx" title="Próxima semana" style="transform:scaleX(-1)">${ic('chevl')}</button>
      <button class="btn" id="arHoje">Hoje</button>
      <button class="btn icon ghost" id="arRef" title="Atualizar">${ic('refresh')}</button>
      <button class="btn" id="arRel" title="Relatório: marcadas, realizadas, faltas, canceladas · PDF e Excel">${ic('trend')} Relatório</button>
      <span class="spacer"></span>
      ${meu ? `<button class="btn primary" id="arLink">${ic('share')} Mandar link ao candidato</button>` : `<span class="badge">Agenda de ${h((A.recs.find(r => r.rec === A.rec) || {}).nome || '')}</span>`}
    </div>
    ${A.recs.length > 1 ? `<div class="ar-recs"><span>${ic('users')} Ver agenda de:</span>${A.recs.map(r => `<button class="ar-rec ${r.rec === A.rec ? 'sel' : ''}" data-rec="${h(r.rec)}">${r.rec === A.meu.rec ? 'Minha agenda' : h(r.nome.split(' - ')[0])}</button>`).join('')}</div>` : ''}
    <div class="ar-week">${semana.map(d => { const n = qtd(d); return `<button class="ar-day ${d.dia === D.dia ? 'sel' : ''} ${d.dia === hoje ? 'hoje' : ''} ${fim(d) ? 'fech' : ''}" data-d="${d.dia}"><small>${AG_SEM_[agDt_(d.dia).getDay()].replace('-feira', '')}${d.dia === hoje ? ' · hoje' : ''}</small><b>${agDdMm_(d.dia)}</b><em>${d.feriado ? '🎉 ' + h(d.feriado) : d.fechado ? '🔒 fechado' : n ? n + ' entrevista' + (n > 1 ? 's' : '') : 'livre'}</em>${(A.candDias || []).includes(d.dia) && meu ? '<i title="O candidato pode escolher este dia pelo link">link</i>' : ''}</button>`; }).join('')}</div>
    <div class="card ar-diac">
      <div class="ar-dh"><div><b>${h(agExt_(D.dia).replace(/^./, c => c.toUpperCase()))}</b><small>${D.feriado ? 'Feriado: ' + h(D.feriado) + ' · o link não oferece este dia' : D.fechado ? 'Dia fechado: o link não oferece horários neste dia' : qtd(D) + ' entrevista(s) · ' + HD.filter(hh => !D.s[hh] || D.s[hh].st === 'cancelado').length + ' horário(s) livre(s)'}</small></div>
        ${!D.feriado && ![0, 6].includes(agDt_(D.dia).getDay()) ? `<button class="btn sm" id="arFech">${D.fechado ? ic('check') + ' Abrir o dia' : '🔒 Fechar o dia'}</button>` : ''}</div>
      <div class="ar-cols"><div>${turnoH('m')}${HD.filter(x => x < '12:00').map(slot).join('')}</div><div>${turnoH('t')}${HD.filter(x => x >= '13:00').map(slot).join('')}</div></div>
    </div>
    <div class="faint" style="font-size:12px;margin-top:10px">O candidato só vê os horários livres de hoje e do próximo dia útil (sexta → segunda), sem fins de semana e feriados. Ao marcar, o link do Google Meet é criado na hora e o convite vai para o e-mail do candidato.</div>`;
    const troca = () => { const c = agCache_(f.rec, agSegunda_(f.dia)); if (c) S.agenda = c; draw(); buscar(); };
    const ir = d => { const mudou = agSegunda_(d) !== (S.agenda.dias[0] || {}).dia; f.dia = d; saveF(); if (mudou) troca(); else draw(); };
    $$('.ar-rec').forEach(b => b.onclick = () => { if (b.dataset.rec === S.agenda.rec) return; f.rec = b.dataset.rec; saveF(); troca(); });
    $('#arAnt').onclick = () => ir(agSomaF_(agSegunda_(f.dia), -7));
    $('#arProx').onclick = () => ir(agSomaF_(agSegunda_(f.dia), 7));
    $('#arHoje').onclick = () => ir(new Date().toLocaleDateString('sv-SE'));
    $('#arRef').onclick = e => run(e.currentTarget, () => buscar());
    $('#arRel').onclick = () => openAgendaRelatorio();
    $$('.ar-day').forEach(b => b.onclick = () => ir(b.dataset.d));
    if ($('#arLink')) $('#arLink').onclick = () => openAgendaLink();
    $$('[data-turno]', v).forEach(b => b.onclick = async () => {
      const t = b.dataset.turno, bloq = !!b.dataset.bloq, nm = t === 'm' ? 'Manhã' : 'Tarde';
      const go = () => { agSalvar_({ rec: A.rec, dia: D.dia, turno: t, bloq }, d => { hsT(t).forEach(x => { const o = d.s[x]; if (bloq) { if (!o || o.st === 'cancelado') d.s[x] = { st: 'bloqueado', motivo: nm + ' fechada', turno: t, em: new Date().toISOString() }; } else if (o && o.st === 'bloqueado') delete d.s[x]; }); }, draw); toast(bloq ? nm + ' fechada: o candidato não vê esses horários' : nm + ' aberta para agendamentos'); };
      if (!bloq && hsT(t).some(x => D.s[x] && D.s[x].st === 'bloqueado' && D.s[x].turno !== t) && !await confirmBox(`Abrir a ${nm.toLowerCase()} libera também os horários que você bloqueou um por um. Continuar?`, 'Abrir ' + nm.toLowerCase())) return;
      go();
    });
    if ($('#arFech')) $('#arFech').onclick = () => { const fe = !D.fechado; agSalvar_({ rec: A.rec, dia: D.dia, fechado: fe }, d => { d.fechado = fe; }, draw); toast(fe ? 'Dia fechado para agendamentos' : 'Dia aberto para agendamentos'); };
    $$('.ar-sl').forEach(b => b.onclick = () => { const hh = b.dataset.h, o = D.s[hh]; if (o && o.st !== 'cancelado') openAgendaItem(A.rec, D, hh, draw); else if (!fim(D)) openAgendaNovo(A.rec, D, hh, draw); });
  };
  draw();
  await buscar();
  const iv = setInterval(() => { if (rt !== S.rt || !document.body.contains(v)) return clearInterval(iv); if (!$('.overlay') && document.visibilityState === 'visible') buscar(true); }, 15000);
}
// ---------------- RELATÓRIO DA AGENDA (marcadas, realizadas, faltas, canceladas…) ----------------
const AG_REL_ST_ = { realizada: 'Realizada', faltou: 'Faltou', cancelado: 'Cancelada', pend: 'Sem registro', fut: 'A realizar' };
function agRelLinhas_(j) {
  const agora = new Date(), hojeL = agora.toLocaleDateString('sv-SE'), agoraMin = agora.getHours() * 60 + agora.getMinutes(), out = [];
  (j.recs || []).forEach(r => (r.dias || []).forEach(d => Object.keys(d.s || {}).forEach(hh => {
    const o = d.s[hh]; if (!o || o.st === 'bloqueado') return;
    const fimMin = Number(hh.slice(0, 2)) * 60 + Number(hh.slice(3)) + agPasso_(d.dia), passou = d.dia < hojeL || (d.dia === hojeL && fimMin <= agoraMin);
    const st = o.st === 'realizada' || o.st === 'faltou' || o.st === 'cancelado' ? o.st : passou ? 'pend' : 'fut';
    out.push({ dia: d.dia, h: hh, rec: r.rec, recNome: String(r.nome || '').split(' - ')[0], nome: o.nome || '', vaga: o.vaga || '', tel: o.tel || '', email: o.email || '', st, link: o.origem === 'candidato', remarcada: !!o.remarcado });
  })));
  return out.sort((a, b) => (a.dia + a.h).localeCompare(b.dia + b.h));
}
function agRelConta_(L) {
  const n = k => L.filter(x => x.st === k).length, rea = n('realizada'), fal = n('faltou');
  return { total: L.length, rea, fal, can: n('cancelado'), pend: n('pend'), fut: n('fut'), link: L.filter(x => x.link).length, rem: L.filter(x => x.remarcada).length, comp: rea + fal ? Math.round(rea / (rea + fal) * 100) : null };
}
function openAgendaRelatorio() {
  const A = S.agenda || {}, hojeL = new Date().toLocaleDateString('sv-SE'), ini = agSegunda_(hojeL);
  const mes = (o) => { const x = agDt_(hojeL); const a = new Date(x.getFullYear(), x.getMonth() + o, 1), b = new Date(x.getFullYear(), x.getMonth() + o + 1, 0); return [a.toLocaleDateString('sv-SE'), b.toLocaleDateString('sv-SE')]; };
  const PER = { hoje: ['Hoje', hojeL, hojeL], ontem: ['Ontem', agSomaF_(hojeL, -1), agSomaF_(hojeL, -1)], sem: ['Esta semana', ini, agSomaF_(ini, 6)], semAnt: ['Semana passada', agSomaF_(ini, -7), agSomaF_(ini, -1)], mes: ['Este mês', ...mes(0)], mesAnt: ['Mês passado', ...mes(-1)], custom: ['Período', null, null] };
  const f = getF('agRel'); if (!PER[f.per]) f.per = 'hoje';
  if (f.rec == null) f.rec = A.recs && A.recs.length > 1 ? '' : (A.meu || {}).rec || '';
  const recs = A.recs || [];
  let dados = null, carregando = false, seqR = 0, erro = '';
  const periodo = () => f.per === 'custom' ? [f.de || hojeL, f.ate && f.ate >= (f.de || hojeL) ? f.ate : (f.de || hojeL)] : [PER[f.per][1], PER[f.per][2]];
  const fmtBR = d => d.split('-').reverse().join('/');
  const rotPer = () => { const [a, b] = periodo(); return a === b ? fmtBR(a) : fmtBR(a) + ' a ' + fmtBR(b); };
  const rotRec = () => !f.rec ? 'Todos os recrutadores' : ((recs.find(r => r.rec === f.rec) || {}).nome || (A.meu || {}).nome || '').split(' - ')[0];
  modal({
    title: 'Relatório da agenda', icon: 'trend', wide: true,
    body: `<div id="rlF"></div><div id="rlB"></div>`,
    foot: `<button class="btn" data-close>Fechar</button><button class="btn" id="rlXls">${ic('download')} Excel</button><button class="btn primary" id="rlPdf">${ic('file')} PDF</button>`,
    onMount: m => {
      const F = $('#rlF', m.el), B = $('#rlB', m.el);
      const desenhaF = () => {
        F.innerHTML = `<div class="chips">${Object.entries(PER).filter(([k]) => k !== 'custom').map(([k, x]) => `<span class="chip ${f.per === k ? 'on' : ''}" data-p="${k}">${ic('calendar')} ${x[0]}</span>`).join('')}<span class="chip ${f.per === 'custom' ? 'on' : ''}" data-p="custom">Escolher período</span></div>
          <div class="toolbar" style="margin-top:8px">
            ${f.per === 'custom' ? `<input class="input" type="date" id="rlDe" value="${h(f.de || hojeL)}" title="De"><input class="input" type="date" id="rlAte" value="${h(f.ate || hojeL)}" title="Até">` : `<b class="ar-sem">${h(rotPer())}</b>`}
            ${recs.length > 1 ? `<select class="input" id="rlRec"><option value="">Recrutador: todos</option>${recs.map(r => `<option value="${h(r.rec)}" ${f.rec === r.rec ? 'selected' : ''}>${h(r.nome.split(' - ')[0])}</option>`).join('')}</select>` : ''}
          </div>`;
        $$('[data-p]', F).forEach(c => c.onclick = () => { f.per = c.dataset.p; if (f.per === 'custom' && !f.de) { f.de = ini; f.ate = hojeL; } saveF(); desenhaF(); busca(); });
        ['rlDe', 'rlAte'].forEach(id => { const e = $('#' + id, F); if (e) e.onchange = () => { f[id === 'rlDe' ? 'de' : 'ate'] = e.value; saveF(); busca(); }; });
        if ($('#rlRec', F)) $('#rlRec', F).onchange = e => { f.rec = e.target.value; saveF(); busca(); };
      };
      const desenha = () => {
        if (erro) { B.innerHTML = `<div class="card muted">${h(erro)}</div>`; return; }
        if (!dados) { B.innerHTML = '<div class="sk" style="height:300px;margin-top:12px"></div>'; return; }
        const L = agRelLinhas_(dados), C = agRelConta_(L);
        const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
        const grupo = (key, lbl) => { const g = {}; L.forEach(x => { const k = key(x) || '—'; (g[k] = g[k] || []).push(x); }); return Object.entries(g).map(([k, v]) => [lbl ? lbl(k) : k, agRelConta_(v)]); };
        const tab = (titulo, linhas, col1) => linhas.length ? `<div class="card mt"><div class="card-h"><h3>${titulo}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${col1}</th><th>Agendadas</th><th>Realizadas</th><th>Faltas</th><th>Canceladas</th><th>Sem registro</th><th>A realizar</th><th>Comparecimento</th></tr></thead><tbody>${linhas.map(([k, c]) => `<tr><td><b>${h(k)}</b></td><td>${c.total}</td><td>${c.rea}</td><td>${c.fal}</td><td>${c.can}</td><td>${c.pend}</td><td>${c.fut}</td><td>${c.comp == null ? '—' : c.comp + '%'}</td></tr>`).join('')}</tbody></table></div></div>` : '';
        const porRec = grupo(x => x.recNome).sort((a, b) => b[1].total - a[1].total);
        const porDia = grupo(x => x.dia).sort((a, b) => a[0].localeCompare(b[0])).map(([k, c]) => [AG_SEM_[agDt_(k).getDay()].replace('-feira', '').replace(/^./, s => s.toUpperCase()) + ' · ' + fmtBR(k).slice(0, 5), c]);
        const porVaga = grupo(x => String(x.vaga || '').trim().toUpperCase() || 'NÃO INFORMADA').sort((a, b) => b[1].total - a[1].total).slice(0, 15);
        if (f.lst && !AG_REL_ST_[f.lst]) f.lst = '';
        const lista = L.filter(x => !f.lst || x.st === f.lst);
        const bd = { realizada: 'b-ok', faltou: 'b-bad', cancelado: '', pend: 'b-warn', fut: 'b-info' };
        B.innerHTML = `
          <div class="grid g5 mt">
            ${kpi({ lbl: 'Agendadas', val: C.total, sub: `${C.link} pelo link · ${C.rem} remarcada(s)`, icon: 'calendar', c: 'c-cyan' })}
            ${kpi({ lbl: 'Realizadas', val: C.rea, sub: pct(C.rea, C.total) + ' das agendadas', icon: 'check', c: 'c-green' })}
            ${kpi({ lbl: 'Faltas', val: C.fal, sub: pct(C.fal, C.rea + C.fal) + ' de quem devia comparecer', icon: 'alert', c: 'c-red' })}
            ${kpi({ lbl: 'Comparecimento', val: C.comp == null ? '—' : C.comp + '%', bar: C.comp || 0, sub: 'realizadas ÷ (realizadas + faltas)', icon: 'gauge', c: 'c-violet' })}
            ${kpi({ lbl: 'Canceladas', val: C.can, sub: `${C.fut} a realizar`, icon: 'x', c: 'c-slate' })}
          </div>
          ${C.pend ? `<div class="card ck-aviso mt">${ic('alert')}<div><b>${C.pend} entrevista(s) já passaram sem registro</b><span>Abra a agenda e marque Realizada ou Faltou para o relatório ficar certo.</span></div></div>` : ''}
          ${!L.length ? `<div class="card empty mt" style="text-align:center;padding:30px"><b>Nenhuma entrevista neste período</b></div>` : `
          ${porRec.length > 1 ? tab('Por recrutador', porRec, 'Recrutador') : ''}
          ${porDia.length > 1 ? tab('Por dia', porDia, 'Dia') : ''}
          ${tab('Por vaga', porVaga, 'Vaga')}
          <div class="card mt"><div class="card-h"><h3>Entrevistas</h3><span class="spacer"></span></div>
            <div class="chips" id="rlSt" style="padding:0 14px 8px"><span class="chip ${!f.lst ? 'on' : ''}" data-s="">Todas <span class="n">${L.length}</span></span>${Object.entries(AG_REL_ST_).map(([k, v]) => `<span class="chip ${f.lst === k ? 'on' : ''}" data-s="${k}">${v} <span class="n">${L.filter(x => x.st === k).length}</span></span>`).join('')}</div>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Hora</th><th>Candidato</th><th>Vaga</th>${porRec.length > 1 || !f.rec ? '<th>Recrutador</th>' : ''}<th>WhatsApp</th><th>Situação</th></tr></thead><tbody>
            ${lista.map(x => `<tr><td>${fmtBR(x.dia).slice(0, 5)}</td><td>${x.h}</td><td><b>${h(x.nome)}</b>${x.link ? ' <span class="badge b-origem">pelo link</span>' : ''}${x.remarcada ? ' <span class="badge b-warn">remarcada</span>' : ''}</td><td>${h(x.vaga)}</td>${porRec.length > 1 || !f.rec ? `<td>${h(x.recNome)}</td>` : ''}<td>${x.tel ? `<a href="https://wa.me/55${h(x.tel)}" target="_blank" rel="noopener" style="color:var(--accent)">${h(telFmt(x.tel))}</a>` : ''}</td><td><span class="badge ${bd[x.st]}">${AG_REL_ST_[x.st]}</span></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nenhuma entrevista nesta situação.</td></tr>'}
            </tbody></table></div></div>`}`;
        $$('#rlSt .chip', B).forEach(c => c.onclick = () => { f.lst = c.dataset.s; saveF(); desenha(); });
      };
      const busca = async () => {
        const [de, ate] = periodo(), k = ++seqR;
        if (agDt_(ate) - agDt_(de) > 92 * 864e5) { erro = 'Escolha um período de até 3 meses.'; dados = null; desenha(); return; }
        erro = ''; dados = null; desenha();
        try { const j = await api('agendaRelatorio', { de, ate, rec: f.rec || '' }, { silent: true }); if (k !== seqR || !$('#rlB', m.el)) return; dados = j; desenha(); }
        catch (e) { if (k === seqR) { erro = e.message; desenha(); } }
      };
      $('#rlPdf', m.el).onclick = () => { if (!dados) return toast('Aguarde carregar o relatório', true); agRelPDF_(agRelLinhas_(dados), rotPer(), rotRec(), !!f.rec); };
      $('#rlXls', m.el).onclick = () => {
        if (!dados) return toast('Aguarde carregar o relatório', true);
        const L = agRelLinhas_(dados); if (!L.length) return toast('Nada para exportar neste período', true);
        downloadCSV('relatorio_agenda', ['Data', 'Hora', 'Candidato', 'Vaga', 'Recrutador', 'WhatsApp', 'E-mail', 'Situação', 'Origem', 'Remarcada'], L.map(x => [fmtBR(x.dia), x.h, x.nome, x.vaga, x.recNome, x.tel ? telFmt(x.tel) : '', x.email, AG_REL_ST_[x.st], x.link ? 'Pelo link' : 'RH', x.remarcada ? 'Sim' : 'Não']));
      };
      desenhaF(); busca();
    }
  });
}
// PDF do relatório (resumo + por recrutador + por dia + por vaga + lista)
function agRelPDF_(L, rotPer, rotRec, umRec) {
  const esc = h, logo = cfgv('logo', ''), agora = new Date(), C = agRelConta_(L), fmtBR = d => d.split('-').reverse().join('/');
  const grupo = key => { const g = {}; L.forEach(x => { const k = key(x) || '—'; (g[k] = g[k] || []).push(x); }); return Object.entries(g).map(([k, v]) => [k, agRelConta_(v)]); };
  const tab = (t, linhas, col1) => linhas.length ? `<h2>${t}</h2><table><thead><tr><th>${col1}</th><th>Agendadas</th><th>Realizadas</th><th>Faltas</th><th>Canceladas</th><th>Sem registro</th><th>A realizar</th><th>Comparecimento</th></tr></thead><tbody>${linhas.map(([k, c]) => `<tr><td><b>${esc(k)}</b></td><td>${c.total}</td><td>${c.rea}</td><td>${c.fal}</td><td>${c.can}</td><td>${c.pend}</td><td>${c.fut}</td><td>${c.comp == null ? '—' : c.comp + '%'}</td></tr>`).join('')}</tbody></table>` : '';
  const porRec = grupo(x => x.recNome).sort((a, b) => b[1].total - a[1].total);
  const porDia = grupo(x => x.dia).sort((a, b) => a[0].localeCompare(b[0])).map(([k, c]) => [AG_SEM_[agDt_(k).getDay()].replace('-feira', '').replace(/^./, s => s.toUpperCase()) + ' · ' + fmtBR(k).slice(0, 5), c]);
  const porVaga = grupo(x => String(x.vaga || '').trim().toUpperCase() || 'NÃO INFORMADA').sort((a, b) => b[1].total - a[1].total).slice(0, 15);
  const k = (l, v, s, cor) => `<div class="k" style="--c:${cor}"><span>${l}</span><b>${v}</b><small>${s || ''}</small></div>`;
  const cls = { realizada: 'ok', faltou: 'bad', pend: 'warn', fut: 'info', cancelado: '' };
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório da agenda · ${esc(rotPer)}</title>
  <style>
  @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:900px;margin:0 auto;padding:18px}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #6366f1;padding-bottom:12px;margin-bottom:14px}
  header img{height:46px;max-width:140px;object-fit:contain}.mark{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#6366f1,#a855f7);color:#fff;display:grid;place-items:center;font-weight:800}
  header h1{margin:0;font-size:20px}header .meta{color:#5b6785;font-size:11px;margin-top:2px}
  .ks{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:6px}.k{border:1px solid #e5e7eb;border-top:3px solid var(--c);border-radius:8px;padding:8px 10px}
  .k span{display:block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#5b6785}.k b{display:block;font-size:22px;line-height:1.2}.k small{color:#5b6785;font-size:9px}
  .av{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:7px 10px;margin:8px 0;font-weight:600}
  h2{font-size:13px;margin:16px 0 6px;color:#312e81}table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#0f172a;color:#fff;text-align:left;padding:5px 6px;font-size:9px;text-transform:uppercase;letter-spacing:.04em}
  td{padding:4px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top}tr{page-break-inside:avoid}tbody tr:nth-child(even) td{background:#f8fafc}
  .st{font-weight:700;border-radius:99px;padding:1px 7px;background:#e2e8f0}.st.ok{background:#dcfce7;color:#166534}.st.bad{background:#fee2e2;color:#991b1b}.st.warn{background:#fef3c7;color:#92400e}.st.info{background:#dbeafe;color:#1e40af}
  footer{margin-top:14px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between}
  .bar{position:sticky;top:0;background:#0f172a;color:#fff;padding:10px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between}.bar button{background:#6366f1;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}
  @media print{.bar{display:none}.wrap{padding:0}}
  </style></head><body>
  <div class="bar"><span>Pré-visualização do PDF · escolha <b>Salvar como PDF</b> na impressão</span><button onclick="window.print()">Baixar / imprimir PDF</button></div>
  <div class="wrap">
  <header>${logo && /^(data:image\/|https:)/.test(logo) ? `<img src="${esc(logo)}">` : '<div class="mark">GRC</div>'}<div><h1>Relatório de entrevistas</h1><div class="meta">${esc(rotPer)} · ${esc(rotRec)} · ${esc(cfgv('empresa', 'Grupo R Center'))} · Recursos Humanos<br>Gerado em ${agora.toLocaleString('pt-BR').slice(0, 17)} por ${esc(S.user.nome)}</div></div></header>
  <div class="ks">${k('Agendadas', C.total, C.link + ' pelo link · ' + C.rem + ' remarcada(s)', '#06b6d4')}${k('Realizadas', C.rea, C.total ? Math.round(C.rea / C.total * 100) + '% das agendadas' : '', '#16a34a')}${k('Faltas', C.fal, C.rea + C.fal ? Math.round(C.fal / (C.rea + C.fal) * 100) + '% de faltas' : '', '#dc2626')}${k('Comparecimento', C.comp == null ? '—' : C.comp + '%', 'realizadas ÷ (realizadas + faltas)', '#7c3aed')}${k('Canceladas', C.can, C.fut + ' a realizar · ' + C.pend + ' sem registro', '#64748b')}</div>
  ${C.pend ? `<div class="av">⚠ ${C.pend} entrevista(s) já passaram sem registro de Realizada ou Faltou.</div>` : ''}
  ${!umRec && porRec.length > 1 ? tab('Por recrutador', porRec, 'Recrutador') : ''}
  ${porDia.length > 1 ? tab('Por dia', porDia, 'Dia') : ''}
  ${tab('Por vaga', porVaga, 'Vaga')}
  ${L.length ? `<h2>Entrevistas (${L.length})</h2><table><thead><tr><th>Data</th><th>Hora</th><th>Candidato</th><th>Vaga</th>${umRec ? '' : '<th>Recrutador</th>'}<th>WhatsApp</th><th>Situação</th></tr></thead><tbody>${L.map(x => `<tr><td>${fmtBR(x.dia).slice(0, 5)}</td><td>${x.h}</td><td><b>${esc(x.nome)}</b>${x.remarcada ? ' (remarcada)' : ''}</td><td>${esc(x.vaga)}</td>${umRec ? '' : `<td>${esc(x.recNome)}</td>`}<td>${x.tel ? esc(telFmt(x.tel)) : ''}</td><td><span class="st ${cls[x.st]}">${AG_REL_ST_[x.st]}</span></td></tr>`).join('')}</tbody></table>` : '<p>Nenhuma entrevista neste período.</p>'}
  <footer><span>${esc(cfgv('sistema', 'Quadro de Lojas'))} · Agenda de entrevistas</span><span>Comparecimento = realizadas ÷ (realizadas + faltas)</span></footer>
  </div><script>setTimeout(function(){try{window.print()}catch(e){}},600)</script></body></html>`;
  const w = window.open('', '_blank'); if (!w) { toast('Permita pop-ups para gerar o PDF', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
function agTroca_(d) { const A = S.agenda; if (!A) return; A.dias = A.dias.map(x => x.dia === d.dia ? d : x); agCacheGrava_(A); }
// cache da agenda no aparelho (abre na hora e atualiza em segundo plano)
function agCache_(rec, sem) { const c = ls.get('grc_agenda_c', {}) || {}; const k = Object.keys(c).find(x => x === (rec || '') + '|' + sem) || (!rec ? Object.keys(c).find(x => x.endsWith('|' + sem) && c[x].rec === c[x].meu.rec) : null); return k ? c[k] : null; }
function agCacheGrava_(j) { if (!j || !j.dias || !j.dias.length) return; const c = ls.get('grc_agenda_c', {}) || {}; c[j.rec + '|' + j.dias[0].dia] = j; const ks = Object.keys(c); if (ks.length > 16) ks.slice(0, ks.length - 16).forEach(k => delete c[k]); ls.set('grc_agenda_c', c); }
// gravação instantânea: muda na tela na hora e manda para o servidor em segundo plano
function agSalvar_(payload, mut, done, ok, falha) {
  const A = S.agenda, D = A && A.dias.find(x => x.dia === payload.dia); if (!D) return;
  const novo = JSON.parse(JSON.stringify(D)); mut(novo); agTroca_(novo); done();
  S.agPend = (S.agPend || 0) + 1;
  api('agendaSalvar', payload, { silent: true }).then(j => { S.agPend--; if (S.agenda && S.agenda.rec === payload.rec) { agTroca_(j.dia); if (!S.agPend) done(); } if (ok) ok(j); })
    .catch(e => { S.agPend--; toast('Não foi possível salvar na agenda: ' + e.message, true); if (falha) falha(e); if (S.agBuscar) S.agBuscar(); });
}
// mensagem de confirmação com o link do Meet (para copiar ou mandar no WhatsApp)
function agMsgConfirma_(rec, o, dia, hh) {
  const recNome = (((S.agenda.recs || []).find(r => r.rec === rec) || S.agenda.meu || {}).nome || (S.user || {}).nome || '').split(' - ')[0];
  const prim = s => String(s || '').split(' ')[0].toLowerCase().replace(/^./, c => c.toUpperCase());
  return `Olá, ${prim(o.nome)}! Aqui é ${recNome}, do RH do Grupo R Center.\n\nSua entrevista online está *confirmada* para ${agExt_(dia)}, às ${hh} (duração de cerca de ${agPasso_(dia)} minutos).\n\n🎥 Link da videochamada (Google Meet):\n${o.meet || '(gerando o link...)'}\n\nRecomendamos entrar alguns minutos antes, em um lugar tranquilo e com boa conexão.${o.email ? ' O convite também foi enviado para o seu e-mail.' : ''}\n\nAté breve!`;
}
function openAgendaConfirma(rec, dia, hh, esperar) {
  const pega = () => { const D = (S.agenda.dias || []).find(x => x.dia === dia); return D && D.s[hh]; };
  modal({
    title: 'Entrevista confirmada', icon: 'check',
    body: `<div id="acTop"></div><p class="muted" style="margin:10px 0 8px">Mensagem pronta para mandar ao candidato:</p><textarea class="input" id="acMsg" rows="11"></textarea>`,
    foot: `<button class="btn" id="acCp">${ic('copy')} Copiar mensagem</button><button class="btn primary" id="acWa">${ic('share')} Mandar no WhatsApp</button>`,
    onMount: m => {
      const desenha = (gerando, erro) => {
        const o = pega(); if (!o || !$('#acTop', m.el)) return;
        $('#acTop', m.el).innerHTML = `<div class="ar-meet">${o.meet ? `<span>🎥</span><a href="${h(o.meet)}" target="_blank" rel="noopener">${h(o.meet.replace('https://', ''))}</a><button class="btn sm" id="acCpL">${ic('copy')} Copiar link</button>` : gerando ? '<span class="spin" style="width:16px;height:16px;border-width:2px"></span><span>Gerando o link do Google Meet…</span>' : `<span>⚠️</span><span>${h(erro || o.meetErro || 'Link do Meet não gerado.')}</span>`}</div>`;
        $('#acMsg', m.el).value = agMsgConfirma_(rec, o, dia, hh);
        if ($('#acCpL', m.el)) $('#acCpL', m.el).onclick = () => copiar_(o.meet, 'Link copiado');
        $('#acWa', m.el).style.display = o.tel ? '' : 'none';
      };
      desenha(!!esperar);
      if (esperar) esperar.then(() => desenha(false), e => desenha(false, e && e.message));
      $('#acCp', m.el).onclick = () => copiar_($('#acMsg', m.el).value, 'Mensagem copiada');
      $('#acWa', m.el).onclick = () => { const o = pega(); const t = String((o || {}).tel || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); window.open('https://wa.me/55' + t + '?text=' + encodeURIComponent($('#acMsg', m.el).value), '_blank'); };
    }
  });
}
const agItem_ = (atual, o) => Object.assign({}, atual || {}, o, { nome: String(o.nome != null ? o.nome : (atual || {}).nome || '').trim().toUpperCase(), tel: String(o.tel != null ? o.tel : (atual || {}).tel || '').replace(/\D/g, ''), origem: (atual || {}).origem || 'rh', em: (atual || {}).em || new Date().toISOString(), visto: true, alt: (S.user || {}).nome || '' });
function openAgendaNovo(rec, D, hh, done) {
  modal({
    title: `${hh} · ${agDdMm_(D.dia)}`, icon: 'calendar',
    body: `<div class="ar-tabs"><button class="ar-tab active" data-t="m">Marcar entrevista</button><button class="ar-tab" data-t="b">Bloquear horário</button></div>
      <div id="anM"><div class="field"><label>Nome do candidato</label><input class="input" id="anN" placeholder="Nome completo"></div>
      <div class="row2"><div class="field"><label>WhatsApp</label><input class="input" id="anT" inputmode="tel"></div><div class="field"><label>E-mail</label><input class="input" id="anE" type="email"></div></div>
      <div class="field"><label>Vaga</label><input class="input" id="anV" placeholder="Ex.: Repositor · Eusébio"></div></div>
      <div id="anB" class="hidden"><div class="field"><label>Motivo (opcional)</label><input class="input" id="anMo" placeholder="Ex.: reunião, treinamento"></div><p class="muted" style="margin:0;font-size:13px">O horário some do link do candidato.</p></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="anOk">${ic('check')} Salvar</button>`,
    onMount: m => {
      let modo = 'm';
      $$('.ar-tab', m.el).forEach(t => t.onclick = () => { modo = t.dataset.t; $$('.ar-tab', m.el).forEach(x => x.classList.toggle('active', x === t)); $('#anM', m.el).classList.toggle('hidden', modo !== 'm'); $('#anB', m.el).classList.toggle('hidden', modo !== 'b'); });
      $('#anT', m.el).oninput = e => { e.target.value = telFmt(e.target.value.replace(/\D/g, '').slice(0, 11)); };
      $('#anOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const item = modo === 'b' ? { st: 'bloqueado', motivo: $('#anMo', m.el).value } : { nome: $('#anN', m.el).value, tel: $('#anT', m.el).value, email: $('#anE', m.el).value, vaga: $('#anV', m.el).value, st: 'marcado' };
        if (modo === 'm' && !item.nome.trim()) throw new Error('Informe o nome do candidato.');
        m.close();
        let res, rej; const esp = new Promise((a, b) => { res = a; rej = b; });
        agSalvar_({ rec, dia: D.dia, h: hh, item }, d => { d.s[hh] = item.st === 'bloqueado' ? { st: 'bloqueado', motivo: item.motivo.trim(), em: new Date().toISOString() } : agItem_(null, item); }, done, res, rej);
        if (modo === 'b') toast('Horário bloqueado'); else openAgendaConfirma(rec, D.dia, hh, esp);
      });
    }
  });
}
function openAgendaItem(rec, D, hh, done) {
  const o = D.s[hh];
  if (o.st === 'bloqueado') {
    modal({ title: `${hh} · ${agDdMm_(D.dia)}`, icon: 'calendar', body: `<p style="margin:0">🔒 Horário bloqueado${o.motivo ? ': <b>' + h(o.motivo) + '</b>' : ''}.</p>`, foot: `<button class="btn" data-close>Fechar</button><button class="btn primary" id="aiLib">Liberar horário</button>`,
      onMount: m => { $('#aiLib', m.el).onclick = () => { m.close(); agSalvar_({ rec, dia: D.dia, h: hh, item: null }, d => { delete d.s[hh]; }, done); toast('Horário liberado'); }; } });
    return;
  }
  const quando = `${agExt_(D.dia)} às ${hh}`;
  const convite = `Entrevista online · ${o.nome}\nData: ${D.dia.split('-').reverse().join('/')} às ${hh} (${agPasso_(D.dia)} min)\nE-mail: ${o.email || '-'}\nWhatsApp: ${o.tel ? telFmt(o.tel) : '-'}${o.vaga ? '\nVaga: ' + o.vaga : ''}`;
  modal({
    title: o.nome, icon: 'calendar',
    body: `<div class="ar-info"><div>📅 <b>${h(quando.replace(/^./, c => c.toUpperCase()))}</b> · ${agPasso_(D.dia)} min · Google Meet</div>
      ${o.vaga ? `<div>💼 ${h(o.vaga)}</div>` : ''}
      ${o.email ? `<div>✉️ <a href="mailto:${h(o.email)}">${h(o.email)}</a> <button class="btn sm ghost" id="aiCpE" title="Copiar e-mail">${ic('copy')}</button></div>` : ''}
      ${o.tel ? `<div>📱 <a target="_blank" rel="noopener" href="https://wa.me/55${h(o.tel)}">${h(telFmt(o.tel))}</a></div>` : ''}
      ${o.ficha ? `<div>📄 <b>Ficha preenchida no agendamento</b>${o.cpf ? ' · CPF ' + h(cpfFmt(o.cpf)) : ''}${podeFichas() ? ` · <a href="#/fichas" data-close style="color:var(--accent)">ver em Fichas</a>` : ''}</div>` : ''}
      <div class="ar-meet" id="aiMeet">${o.meet ? `<span>🎥</span><a href="${h(o.meet)}" target="_blank" rel="noopener">${h(o.meet.replace('https://', ''))}</a><button class="btn sm" id="aiCpL">${ic('copy')} Copiar</button><a class="btn sm primary" href="${h(o.meet)}" target="_blank" rel="noopener">Entrar</a>` : `<span>🎥</span><span class="faint">${o.meetErro ? 'Não foi possível gerar o link: ' + h(o.meetErro) : 'Sem link do Google Meet'}</span><button class="btn sm primary" id="aiGer">Gerar link do Meet</button>`}</div>
      ${o.remarcado ? `<div class="faint" style="font-size:12px">🔁 Remarcada (antes: ${h(o.remarcado.split(' ')[0].split('-').reverse().join('/'))} às ${h(o.remarcado.split(' ')[1])})</div>` : ''}
      <div class="faint" style="font-size:12px">${o.origem === 'candidato' ? 'Escolhido pelo candidato no link' : 'Marcado pelo RH'} · ${dtHr_(o.em)}${o.alt ? ' · última alteração: ' + h(o.alt) : ''}</div></div>
      <div class="field" style="margin-top:12px"><label>Situação</label><div class="ar-sts">${['marcado', 'realizada', 'faltou'].map(s => `<button class="btn sm ${o.st === s ? 'primary' : ''}" data-st="${s}">${AG_ST_[s][0]}</button>`).join('')}</div></div>
      <div class="field"><label>Observações da entrevista</label><textarea class="input" id="aiObs" rows="3" placeholder="Anotações sobre o candidato...">${h(o.obs || '')}</textarea></div>`,
    foot: `<button class="btn ghost" id="aiCan" style="margin-right:auto;color:var(--bad)">${ic('x')} Cancelar e liberar horário</button><button class="btn" id="aiMsg">${ic('share')} Mensagem</button><button class="btn" id="aiMv">${ic('swap')} Remarcar</button><button class="btn" id="aiCp">${ic('copy')} Copiar dados</button><button class="btn primary" id="aiOk">Salvar</button>`,
    onMount: m => {
      let st = o.st;
      $$('[data-st]', m.el).forEach(b => b.onclick = () => { st = b.dataset.st; $$('[data-st]', m.el).forEach(x => x.classList.toggle('primary', x === b)); });
      if ($('#aiCpE', m.el)) $('#aiCpE', m.el).onclick = () => copiar_(o.email, 'E-mail copiado');
      $('#aiCp', m.el).onclick = () => copiar_(convite, 'Dados copiados para criar o convite');
      $('#aiMv', m.el).onclick = () => { m.close(); openAgendaMover(rec, D, hh, done); };
      $('#aiMsg', m.el).onclick = () => { m.close(); openAgendaConfirma(rec, D.dia, hh); };
      if ($('#aiCpL', m.el)) $('#aiCpL', m.el).onclick = () => copiar_(o.meet, 'Link do Meet copiado');
      if ($('#aiGer', m.el)) $('#aiGer', m.el).onclick = e => run(e.currentTarget, async () => { const j = await api('agendaMeet', { rec, dia: D.dia, h: hh }); agTroca_(j.dia); m.close(); done(); openAgendaConfirma(rec, D.dia, hh); });
      $('#aiOk', m.el).onclick = () => { const item = { st, obs: $('#aiObs', m.el).value }; m.close(); agSalvar_({ rec, dia: D.dia, h: hh, item }, d => { d.s[hh] = agItem_(d.s[hh], item); }, done); toast('Salvo'); };
      $('#aiCan', m.el).onclick = async () => { if (!await confirmBox(`Cancelar a entrevista de <b>${h(o.nome)}</b> e liberar o horário das ${hh}?`, 'Cancelar entrevista', true)) return; m.close(); agSalvar_({ rec, dia: D.dia, h: hh, item: { st: 'cancelado' } }, d => { d.s[hh] = agItem_(d.s[hh], { st: 'cancelado' }); }, done); toast('Entrevista cancelada. O horário voltou a ficar livre.'); };
    }
  });
}
// remarcar entrevista: escolhe novo dia e horário e avisa o candidato
function openAgendaMover(rec, D, hh, done) {
  const o = D.s[hh];
  modal({
    title: 'Remarcar entrevista', icon: 'swap',
    body: `<div class="ar-mv-at"><b>${h(o.nome)}</b><span>Atual: ${h(agExt_(D.dia))} às ${hh}</span></div>
      <div class="field"><label>Novo dia</label><input type="date" class="input" id="amD" value="${D.dia}"></div>
      <div id="amH"></div>`,
    foot: `<button class="btn" data-close>Voltar</button><button class="btn primary" id="amOk" disabled>${ic('check')} Remarcar</button>`,
    onMount: m => {
      let sel = null, doc = null, dd = D.dia, seqM = 0;
      const agoraMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
      const desenha = () => {
        const el = $('#amH', m.el); if (!el) return;
        if (!doc) { el.innerHTML = '<div class="sk" style="height:140px"></div>'; return; }
        const hoje = new Date().toLocaleDateString('sv-SE'), w = agDt_(dd).getDay();
        if (dd < hoje) { el.innerHTML = '<div class="ag-vazio">Escolha uma data a partir de hoje.</div>'; return; }
        if (doc.feriado || w === 0 || w === 6) { el.innerHTML = `<div class="ag-vazio">${doc.feriado ? '🎉 Feriado: ' + h(doc.feriado) : 'Fim de semana'}. Escolha outro dia.</div>`; return; }
        const livre = x => (!doc.s[x] || doc.s[x].st === 'cancelado') && !(dd === D.dia && x === hh) && !(dd === hoje && Number(x.slice(0, 2)) * 60 + Number(x.slice(3)) <= agoraMin());
        const bt = x => { const L = livre(x), oc = doc.s[x] && doc.s[x].st !== 'cancelado'; return `<button class="ar-mv-h ${sel === x ? 'sel' : ''} ${x === hh && dd === D.dia ? 'atual' : ''}" data-h="${x}" ${L ? '' : 'disabled'} title="${oc ? h(doc.s[x].st === 'bloqueado' ? 'Bloqueado' : doc.s[x].nome) : ''}">${x}</button>`; };
        const H = agHorariosF_(dd);
        el.innerHTML = `<div class="ar-turno">☀️ Manhã</div><div class="ar-mv-hs">${H.filter(x => x < '12:00').map(bt).join('')}</div><div class="ar-turno" style="margin-top:8px">🌤️ Tarde</div><div class="ar-mv-hs">${H.filter(x => x >= '13:00').map(bt).join('')}</div>${doc.fechado ? '<p class="faint" style="font-size:12px;margin:8px 0 0">Este dia está fechado para o link do candidato, mas você pode remarcar nele.</p>' : ''}`;
        $$('.ar-mv-h:not([disabled])', el).forEach(b => b.onclick = () => { sel = b.dataset.h; $('#amOk', m.el).disabled = false; desenha(); });
      };
      const carrega = async () => {
        dd = $('#amD', m.el).value; sel = null; $('#amOk', m.el).disabled = true;
        doc = (S.agenda.dias || []).find(x => x.dia === dd) || null; desenha();
        if (!doc && /^\d{4}-\d{2}-\d{2}$/.test(dd)) {
          const k = ++seqM;
          try { const j = await api('agendaList', { rec, de: dd, n: 1 }, { silent: true }); if (k === seqM && $('#amH', m.el)) { doc = j.dias[0]; desenha(); } }
          catch (e) { toast(e.message, true); }
        }
      };
      $('#amD', m.el).onchange = carrega;
      carrega();
      $('#amOk', m.el).onclick = () => {
        if (!sel) return;
        const para = { dia: dd, h: sel }, de = { dia: D.dia, h: hh };
        m.close(); agMover_(rec, de, para, o, done);
        openAgendaAviso(rec, o, de, para);
      };
    }
  });
}
function agMover_(rec, de, para, item, done) {
  const loc = d => S.agenda && S.agenda.dias.find(x => x.dia === d);
  const d1 = loc(de.dia); if (d1) { const n = JSON.parse(JSON.stringify(d1)); delete n.s[de.h]; agTroca_(n); }
  const d2 = loc(para.dia); if (d2) { const n = JSON.parse(JSON.stringify(d2)); n.s[para.h] = Object.assign({}, item, { st: 'marcado', visto: true, remarcado: de.dia + ' ' + de.h }); agTroca_(n); }
  done();
  S.agPend = (S.agPend || 0) + 1;
  api('agendaMover', { rec, de, para }, { silent: true })
    .then(j => { S.agPend--; if (S.agenda && S.agenda.rec === rec) { (j.dias || []).forEach(d => { if (loc(d.dia)) agTroca_(d); }); if (!S.agPend) done(); } })
    .catch(e => { S.agPend--; toast('Não foi possível remarcar: ' + e.message, true); if (S.agBuscar) S.agBuscar(); });
}
function openAgendaAviso(rec, o, de, para) {
  const recNome = ((S.agenda.recs || []).find(r => r.rec === rec) || S.agenda.meu || {}).nome || (S.user || {}).nome || '';
  const prim = s => String(s || '').split(' ')[0].toLowerCase().replace(/^./, c => c.toUpperCase());
  const quando = agExt_(para.dia);
  const msg = `Olá, ${prim(o.nome)}! Aqui é ${recNome.split(' - ')[0]}, do RH do Grupo R Center.\n\nPrecisamos ajustar o horário da sua entrevista online. Ela foi *remarcada para ${quando}, às ${para.h}* (duração de cerca de ${agPasso_(para.dia)} minutos, pelo Google Meet).\n\n${o.meet ? '🎥 O link da videochamada continua o mesmo:\n' + o.meet + '\n\n' : ''}${o.email ? 'O convite atualizado também foi enviado para o seu e-mail (' + o.email + '). ' : ''}Caso não possa comparecer nesse horário, por favor, nos avise por aqui.\n\nObrigado pela compreensão!`;
  const dados = `Entrevista online · ${o.nome}\nNova data: ${para.dia.split('-').reverse().join('/')} às ${para.h} (${agPasso_(para.dia)} min)\nE-mail: ${o.email || '-'}\nWhatsApp: ${o.tel ? telFmt(o.tel) : '-'}${o.vaga ? '\nVaga: ' + o.vaga : ''}`;
  modal({
    title: 'Entrevista remarcada', icon: 'check',
    body: `<div class="ar-mv-ok"><span>${h(agDdMm_(de.dia))} · ${de.h}</span><i>➜</i><b>${h(agDdMm_(para.dia))} · ${para.h}</b></div>
      <p class="muted" style="margin:10px 0 8px">Avise o candidato sobre a mudança. A mensagem abaixo já está pronta:</p>
      <textarea class="input" id="avMsg" rows="8">${h(msg)}</textarea>
      <p class="faint" style="font-size:12px;margin:8px 0 0">${o.evId ? 'O evento na Google Agenda já foi atualizado e o candidato recebe o aviso por e-mail.' : 'Esta entrevista não tem evento no Google Meet; atualize o convite manualmente, se houver.'}</p>`,
    foot: `<button class="btn" id="avCp">${ic('copy')} Copiar dados</button><button class="btn" id="avCm">${ic('copy')} Copiar mensagem</button>${o.tel ? `<button class="btn primary" id="avWa">${ic('share')} Avisar pelo WhatsApp</button>` : `<button class="btn primary" data-close>Fechar</button>`}`,
    onMount: m => {
      $('#avCp', m.el).onclick = () => copiar_(dados, 'Dados copiados para atualizar o convite');
      $('#avCm', m.el).onclick = () => copiar_($('#avMsg', m.el).value, 'Mensagem copiada');
      if ($('#avWa', m.el)) $('#avWa', m.el).onclick = () => { const t = String(o.tel).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); window.open('https://wa.me/55' + t + '?text=' + encodeURIComponent($('#avMsg', m.el).value), '_blank'); };
    }
  });
}
function openAgendaLink() {
  const A = S.agenda, c = A.meu.codigo, url = agendaUrl_(c);
  modal({
    title: 'Link da sua agenda', icon: 'share',
    body: `<p class="muted" style="margin-top:0">Este link é fixo e é só seu. O candidato vê os horários livres de hoje e do próximo dia útil e escolhe um. A marcação aparece aqui na hora, e os próximos candidatos não veem mais aquele horário.</p>
      <div class="card" style="border-color:var(--accent)"><div class="mono" style="font-size:12.5px;word-break:break-all;margin-bottom:10px">${h(url)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="alWa">${ic('share')} Enviar pelo WhatsApp</button><button class="btn" id="alCp">${ic('copy')} Copiar link</button><button class="btn" id="alQr">${ic('grid')} QR Code</button></div></div>
      <div class="card mt ar-foto"><div id="alFt" class="ar-foto-img"><div class="spin"></div></div><div><b>Sua foto na página do candidato</b><p class="muted" style="margin:2px 0 8px;font-size:12.5px">O candidato vê quem vai entrevistá-lo.</p><label class="btn sm">${ic('camera')} Trocar foto<input type="file" accept="image/*" id="alFi" hidden></label> <button class="btn sm ghost" id="alFx">Remover</button></div></div>`,
    foot: `<button class="btn ghost" id="alNovo" style="margin-right:auto" title="O link antigo para de funcionar">${ic('refresh')} Gerar novo link</button><button class="btn" data-close>Fechar</button>`,
    onMount: m => {
      const ft = f => { const el = $('#alFt', m.el); if (el) el.innerHTML = f ? `<img src="${h(f)}" alt="foto">` : `<span>${ic('users')}</span>`; };
      sendRaw_('agendaInfo', { codigo: c }).then(j => ft(j && j.foto)).catch(() => ft(''));
      $('#alFi', m.el).onchange = e => { const fl = e.target.files[0]; if (!fl) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = async () => { const sz = 260, cv = document.createElement('canvas'), s0 = Math.min(im.width, im.height); cv.width = cv.height = sz; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, sz, sz); g.drawImage(im, (im.width - s0) / 2, Math.max(0, (im.height - s0) / 2 - (im.height - s0) * 0.3), s0, s0, 0, 0, sz, sz); const d = cv.toDataURL('image/jpeg', 0.8); ft(d); try { await api('agendaFoto', { foto: d }); toast('Foto atualizada'); } catch (er) { toast(er.message, true); } }; im.src = rd.result; }; rd.readAsDataURL(fl); };
      $('#alFx', m.el).onclick = async () => { try { const j = await api('agendaFoto', { foto: '' }); ft(j.foto); toast(j.foto ? 'Voltou a usar a foto do seu perfil' : 'Foto removida'); } catch (er) { toast(er.message, true); } };
      $('#alWa', m.el).onclick = () => compartilharAgenda_(S.agenda.meu.codigo);
      $('#alCp', m.el).onclick = () => copiar_(agendaUrl_(S.agenda.meu.codigo), 'Link copiado');
      $('#alQr', m.el).onclick = async () => { try { await qrCarregar_(); const a = document.createElement('a'); a.href = qrCartaz_(agendaUrl_(S.agenda.meu.codigo), 'Agende sua entrevista').toDataURL('image/png'); a.download = 'qrcode_agenda.png'; a.click(); } catch (e) { toast(e.message, true); } };
      $('#alNovo', m.el).onclick = async () => { if (!await confirmBox('Gerar um novo link? O link antigo para de funcionar (as entrevistas já marcadas continuam na agenda).', 'Gerar novo link', true)) return; const j = await api('agendaNovoLink', {}); S.agenda.meu = j.meu; m.close(); openAgendaLink(); toast('Novo link gerado'); };
    }
  });
}

/* ---------------- RH: resultados dos testes ---------------- */
const podeTestes = () => !!(S.user && (isAdmin() || S.user.podeTestes));
const testeUrl_ = c => { const base = cfgv('siteUrl', '') || (location.origin + location.pathname); return base.replace(/\/+$/, '') + '/teste.html?teste=' + c; };
const testesCache_ = () => { if (!S.testes) S.testes = ls.get('grc_testes', null); return S.testes; };
const testesSet_ = j => { const c = S.testes || {}; S.testes = { testes: j.testes || c.testes || [], links: j.links || c.links || [], recrutadores: j.recrutadores || c.recrutadores || [] }; ls.set('grc_testes', S.testes); };
const testesNovos = () => ((testesCache_() || {}).testes || []).filter(x => !x.visto).length;
// agrupa por candidato (CPF)
function testesCandidatos_(L) {
  const m = {};
  L.forEach(r => { const c = m[r.cpf] = m[r.cpf] || { cpf: r.cpf, nome: r.nome, tel: r.tel, recrutador: r.recrutador, titulo: r.titulo, em: r.em, testes: {}, novo: false }; if (r.em > c.em) c.em = r.em; if (!c.testes[r.teste] || c.testes[r.teste].em < r.em) c.testes[r.teste] = r; if (!r.visto) c.novo = true; if (!c.recrutador) c.recrutador = r.recrutador; if (!c.titulo) c.titulo = r.titulo; });
  return Object.values(m).sort((a, b) => a.em < b.em ? 1 : -1);
}
function compartilharTeste_(c, titulo) {
  const url = testeUrl_(c), txt = `Olá! Parabéns, você avançou para a *fase de testes* do processo seletivo${titulo ? ' (' + titulo + ')' : ''} do ${cfgv('empresa', CFG.EMPRESA || 'Grupo R Center')}! 🎉\n\nReserve alguns minutos em um lugar tranquilo e acesse o link abaixo para fazer os seus testes:\n${url}\n\nBoa sorte! 💙🧡`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}
const dtHr_ = s => { const d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
const barra_ = (nome, p, cor, extra) => `<div class="tr-bar"><span>${nome}</span><div><i style="width:${Math.max(2, Math.min(100, p))}%;background:${cor || 'var(--accent)'}"></i></div><b>${p}%</b>${extra || ''}</div>`;
const trLista_ = (tit, L, cls) => L && L.length ? `<div class="tr-blk ${cls || ''}"><b>${tit}</b><ul>${L.map(x => `<li>${h(x)}</li>`).join('')}</ul></div>` : '';
function testeResumoHTML_(r) {
  const c = testeCorrigir_(r), T = TESTE_INFO[r.teste];
  let corpo = '';
  if (c.tipo === 'disc') corpo = `<div class="tr-disc">${'DISC'.split('').map(k => `<div class="${c.pri === k ? 'top' : ''}" style="--c:${DISC_FATOR[k].cor}"><b>${k}</b><i style="height:${Math.max(6, c.p[k])}%"></i><span>${c.p[k]}%</span><small>${DISC_FATOR[k].nome}</small></div>`).join('')}</div>
    <div class="tr-kv"><div><small>Perfil</small><b>${h(c.perfil)} · ${h(DISC_FATOR[c.pri].nome)}${c.equil ? ' (equilibrado)' : ''}</b></div><div><small>Afinidade com a vaga</small><b style="color:${c.afinTxt === 'alta' ? '#16a34a' : c.afinTxt === 'média' ? '#f59e0b' : '#ef4444'}">${c.afinTxt}</b><em>${h(c.vg.nome)} · estilos ${c.vg.disc.split('').join(' + ')}</em></div></div>`;
  if (c.tipo === 'forcas') corpo = `<div class="tr-sobre"><b>Para que serve este teste?</b> Mostra as qualidades que o candidato usa com mais naturalidade. Na seleção, o foco é saber se as forças <b>exigidas pela função</b> estão entre as mais fortes dele (ranking de 1 a 24).</div>
    <div class="tr-nota" style="--c:${corP_(c.ader, 75)}"><b>${c.ader}%</b><span>Aderência à vaga · ${c.afinTxt}<br><small>${h(c.vg.nome)}${r.titulo ? ' · ' + h(r.titulo) : ''}</small></span></div>
    <div class="tr-sub">Forças essenciais para a função</div>
    ${c.req.map(x => `<div class="tr-req"><span class="tr-pos" style="--c:${x.pos <= 8 ? '#16a34a' : x.pos <= 16 ? '#f59e0b' : '#ef4444'}">${x.pos}º</span><div><b>${h(x.nome)} <em>${x.p}%</em></b><small>${h(x.pq)}</small></div></div>`).join('')}
    <div class="tr-sub">Forças de destaque do candidato</div><div class="tr-top">${c.top.map((x, i) => `<span class="tr-chip"><b>${i + 1}</b> ${h(x.nome)}</span>`).join('')}</div>
    <div class="tr-sub">Virtudes</div>${c.virt.map(v => barra_(v.nome, v.p, '#16a34a')).join('')}<details class="tr-det"><summary>Ver as 24 forças</summary>${c.lista.map(x => barra_(x.pos + 'º ' + x.nome, x.p, '#86efac')).join('')}</details>`;
  if (c.tipo === 'situacional') { const cb = x => barra_(x.nome, x.p, x.p >= 65 ? '#16a34a' : x.p >= 50 ? '#f59e0b' : '#ef4444'); corpo = `${c.heroi ? `<div class="tr-heroi">${mwAvatar_(c.heroi)}<span><small>Personagem criado no jogo</small><b>Setor dos sonhos: ${MW_SETORES[c.heroi.setor].join(' ')}</b></span></div>` : ''}<div class="tr-nota" style="--c:${c.nota >= 65 ? '#16a34a' : c.nota >= 50 ? '#f59e0b' : '#ef4444'}">${c.mini ? `<span class="tr-med">${c.md}</span>` : ''}<b>${c.nota}%</b><span>${c.mini ? 'Medalha de ' + c.mn + ' · ' : ''}${c.cls}</span></div>${c.mini ? '<div class="tr-sub">Decisões nas situações</div>' : ''}${c.comp.map(cb).join('')}${c.mini ? '<div class="tr-sub">Minigames</div>' + c.mini.map(cb).join('') : ''}${c.graves.length ? `<div class="tr-sub">Escolhas inadequadas</div>${c.graves.map(x => `<div class="tr-grave"><span>${x.q[1]}</span><div><small>${h(x.q[2])}</small><b>${h(x.q[3][x.k][0])}</b></div></div>`).join('')}` : ''}`; }
  if (c.tipo === 'fit') corpo = `<div class="tr-nota" style="--c:${c.nota >= 85 ? '#16a34a' : c.nota >= FIT_MIN ? '#22c55e' : c.nota >= 60 ? '#f59e0b' : '#ef4444'}"><b>${c.nota}%</b><span>${c.cls}<br><small>Mínimo exigido: ${FIT_MIN}% · frases ${c.lik}%${c.temAb ? ' · respostas abertas ' + c.abN + '%' : ''}${c.pen ? ' · desconto -' + c.pen : ''}</small></span></div>
    ${c.abaixo ? `<div class="tr-alerta">⚠ <b>Abaixo da nota mínima (${FIT_MIN}%).</b> Aprofunde os valores mais frágeis na entrevista antes de avançar.</div>` : ''}
    ${c.vals.map(x => barra_(x.emoji + ' ' + x.nome, x.p, corP_(x.p, 70), `<em class="tr-niv">${nivelP_(x.p)}</em>`)).join('')}
    ${c.temAb ? `<div class="tr-sub">Respostas abertas (com as palavras do candidato)</div>${c.ab.map((x, j) => `<div class="tr-ab"><div class="tr-ab-h"><small>${j + 1}. ${h(x.q)}</small><span class="badge" style="background:${corP_(x.p, 70)};color:#fff">${x.p}%</span></div><blockquote>${h(x.txt.trim() || '(em branco)').replace(/\n/g, '<br>')}</blockquote>${x.obs.length || x.alerta.length ? `<p>${x.alerta.map(a => `<b style="color:var(--bad)">⚠ ${h(a)}.</b> `).join('')}${h(x.obs.join(' '))}</p>` : '<p>Resposta com exemplo real, detalhes e justificativa.</p>'}</div>`).join('')}<div class="faint" style="font-size:11.5px">Nota das respostas abertas calculada automaticamente (exemplo real, detalhes, porquê e relação com o valor). Leia as respostas para confirmar.</div>` : '<div class="faint" style="font-size:12px;margin-top:6px">Teste feito antes da versão com perguntas abertas.</div>'}`;
  const detalhe = h(c.txt.split('\n\nAlertas:')[0].split('\n\nPerguntas para a entrevista:')[0]).replace(/\n/g, '<br>');
  return `<div class="card tr-sec"><div class="tr-h"><span class="tr-ic">${T.icone}</span><div><b>${T.nome}</b><small>${dtHr_(r.em)} · ${Math.round((r.seg || 0) / 60)} min</small></div><button class="btn sm ghost" data-cpp="${h(r.id)}" title="Copiar parecer">${ic('copy')}</button></div>${corpo}
    ${trLista_('⚠ Alertas', c.alertas, 'ruim')}${trLista_('💬 Perguntas para a entrevista', c.perg)}
    <details class="tr-det"><summary>Relatório completo</summary><div class="tr-parecer">${detalhe}</div></details>
    <div class="field" style="margin:10px 0 0"><label>Parecer do psicólogo / RH</label><textarea class="input" rows="3" data-obs="${h(r.id)}" placeholder="Escreva sua análise...">${h(r.obs || '')}</textarea>${r.obsPor ? `<small class="faint">Último registro: ${h(r.obsPor)} · ${dtHr_(r.obsEm)}</small>` : ''}<div style="margin-top:6px"><button class="btn sm" data-obsok="${h(r.id)}">${ic('check')} Salvar parecer</button></div></div></div>`;
}
// PDF completo dos testes de um candidato (abre a pré-visualização e a impressão → "Salvar como PDF")
function testePDF_(c) {
  const esc = h, agora = new Date(), G = testeGeral_(c), R = TESTE_ORDEM.map(t => c.testes[t]).filter(Boolean);
  const cor = (p, min) => p >= (min || 70) ? '#16a34a' : p >= (min ? min - 15 : 55) ? '#f59e0b' : '#dc2626';
  const bar = (nome, p, c2, extra) => `<div class="br"><span>${esc(nome)}</span><div><i style="width:${Math.max(2, Math.min(100, p))}%;background:${c2}"></i></div><b>${p}%</b>${extra ? `<em>${esc(extra)}</em>` : ''}</div>`;
  const lista = (t, L, cls) => L && L.length ? `<div class="lst ${cls || ''}"><b>${t}</b><ul>${L.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  const big = (v, rot, c2) => `<div class="big" style="--c:${c2}"><b>${esc(v)}</b><span>${esc(rot)}</span></div>`;
  const sec = r => {
    const k = testeCorrigir_(r), T = TESTE_INFO[r.teste]; let corpo = '';
    if (k.tipo === 'disc') corpo = `<div class="row">${big(k.perfil, DISC_FATOR[k.pri].nome + (k.equil ? ' · equilibrado' : ''), '#0a0d7c')}${big(k.afinTxt, 'Afinidade com a vaga · ' + k.vg.nome, k.afinTxt === 'alta' ? '#16a34a' : k.afinTxt === 'média' ? '#f59e0b' : '#dc2626')}</div>${'DISC'.split('').map(f => bar(f + ' · ' + DISC_FATOR[f].nome, k.p[f], DISC_FATOR[f].cor)).join('')}`;
    if (k.tipo === 'forcas') corpo = `<div class="row">${big(k.ader + '%', 'Aderência das forças à vaga · ' + k.afinTxt, cor(k.ader, 75))}${big(k.top.slice(0, 3).map(x => x.nome).join(', '), 'Forças de destaque', '#0a0d7c')}</div>
      <h4>Forças essenciais para ${esc(k.vg.nome)}</h4><table><thead><tr><th>Posição</th><th>Força</th><th>Nota</th><th>Por que importa na função</th></tr></thead><tbody>${k.req.map(x => `<tr><td><span class="pos" style="background:${x.pos <= 8 ? '#16a34a' : x.pos <= 16 ? '#f59e0b' : '#dc2626'}">${x.pos}º</span></td><td><b>${esc(x.nome)}</b></td><td>${x.p}%</td><td>${esc(x.pq)}</td></tr>`).join('')}</tbody></table>
      <h4>Virtudes</h4>${k.virt.map(v => bar(v.nome, v.p, '#16a34a')).join('')}
      <h4>Ranking das 24 forças</h4><div class="cols">${k.lista.map(x => bar(x.pos + 'º ' + x.nome, x.p, '#86efac')).join('')}</div>`;
    if (k.tipo === 'situacional') corpo = `<div class="row">${big(k.nota + '%', (k.mini ? 'Medalha de ' + k.mn + ' · ' : '') + k.cls, cor(k.nota, 65))}${big(k.dec + '%', 'Decisões nas situações de loja', '#0a0d7c')}</div>
      <h4>Competências</h4>${k.comp.map(x => bar(x.nome, x.p, cor(x.p, 65))).join('')}${k.mini ? '<h4>Minigames</h4>' + k.mini.map(x => bar(x.nome, x.p, cor(x.p, 65))).join('') : ''}
      ${k.graves.length ? `<h4>Escolhas inadequadas</h4><table><tbody>${k.graves.map(x => `<tr><td>${esc(x.q[2])}</td><td><b>${esc(x.q[3][x.k][0])}</b></td></tr>`).join('')}</tbody></table>` : ''}`;
    if (k.tipo === 'fit') corpo = `<div class="row">${big(k.nota + '%', k.cls + ' · mínimo ' + FIT_MIN + '%', k.abaixo ? '#dc2626' : '#16a34a')}${big(k.lik + '%', 'Frases de valores', '#0a0d7c')}${k.temAb ? big(k.abN + '%', 'Respostas abertas', cor(k.abN, 70)) : ''}</div>
      ${k.abaixo ? `<div class="alerta">⚠ Abaixo da nota mínima (${FIT_MIN}%). Aprofundar os valores mais frágeis na entrevista.</div>` : ''}
      <h4>Valores do Grupo R Center</h4>${k.vals.map(x => bar(x.nome, x.p, cor(x.p, 70), nivelP_(x.p))).join('')}
      ${k.temAb ? `<h4>Respostas abertas (com as palavras do candidato)</h4>${k.ab.map((x, j) => `<div class="ab"><div class="abh"><b>${j + 1}. ${esc(x.q)}</b><span style="background:${cor(x.p, 70)}">${x.p}%</span></div><blockquote>${esc(x.txt.trim() || '(em branco)')}</blockquote>${x.obs.length || x.alerta.length ? `<small>${esc(x.alerta.map(a => '⚠ ' + a + '. ').join('') + x.obs.join(' '))}</small>` : '<small>Resposta com exemplo real, detalhes e justificativa.</small>'}</div>`).join('')}` : ''}`;
    const rel = k.txt.split('\n\nAlertas:')[0].split('\n\nPerguntas para a entrevista:')[0];
    return `<section><div class="sh"><span class="ic">${T.icone}</span><div><h2>${esc(T.nome)}</h2><small>Respondido em ${dtHr_(r.em)} · ${Math.round((r.seg || 0) / 60)} min</small></div></div>
      ${corpo}${lista('⚠ Alertas', k.alertas, 'ruim')}${lista('💬 Perguntas para a entrevista', k.perg)}
      <h4>Análise completa</h4><div class="txt">${esc(rel)}</div>
      <div class="par"><b>Parecer do psicólogo / RH</b>${r.obs ? `<p>${esc(r.obs)}</p><small>${esc(r.obsPor || '')}${r.obsEm ? ' · ' + dtHr_(r.obsEm) : ''}</small>` : '<p class="vazio">&nbsp;</p><p class="vazio">&nbsp;</p>'}</div></section>`;
  };
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Testes · ${esc(c.nome)}</title>
  <style>
  @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#0b1037;margin:0;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:860px;margin:0 auto;padding:18px}
  header{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#11159a,#0a0d7c 55%,#060852);color:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px;position:relative;overflow:hidden}
  header::after{content:"";position:absolute;right:-60px;top:-80px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,90,20,.7),transparent 65%)}
  header img{height:34px;position:relative;z-index:1}header h1{margin:0;font-size:19px}header .meta{opacity:.8;font-size:10.5px;margin-top:3px}header>div{position:relative;z-index:1}
  .cand{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.cand div{border:1px solid #e3e6f3;border-radius:8px;padding:6px 9px}.cand span{display:block;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#5a6191;font-weight:700}.cand b{font-size:11.5px}
  .geral{border:1px solid #e3e6f3;border-left:5px solid var(--c);border-radius:10px;padding:10px 12px;margin-bottom:6px}.geral h2{margin:0 0 6px;font-size:14px}.geral h2 span{color:var(--c)}
  .gk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}.gk div{background:#f5f6fc;border-radius:8px;padding:6px;text-align:center}.gk div.ruim{background:#fee2e2}.gk small{display:block;color:#5a6191;font-size:9px}.gk b{font-size:13px}
  section{page-break-before:always;padding-top:4px}section:first-of-type{page-break-before:auto}
  .sh{display:flex;align-items:center;gap:10px;border-bottom:2px solid #ff5a14;padding-bottom:6px;margin:10px 0 10px}.sh .ic{font-size:22px}.sh h2{margin:0;font-size:15px;color:#0a0d7c}.sh small{color:#5a6191}
  h4{margin:12px 0 5px;font-size:11px;color:#0a0d7c;text-transform:uppercase;letter-spacing:.05em}
  .row{display:flex;gap:8px;margin-bottom:6px}.big{flex:1;border:1px solid #e3e6f3;border-top:3px solid var(--c);border-radius:8px;padding:7px 10px}.big b{display:block;font-size:18px;color:var(--c);text-transform:capitalize}.big span{color:#5a6191;font-size:9.5px}
  .br{display:grid;grid-template-columns:170px 1fr 34px 70px;align-items:center;gap:8px;margin:3px 0}.br div{height:7px;background:#eceffa;border-radius:9px;overflow:hidden}.br i{display:block;height:100%;border-radius:9px}.br b{text-align:right}.br em{font-style:normal;color:#5a6191;font-size:9px}
  .cols{columns:2;column-gap:18px}.cols .br{grid-template-columns:120px 1fr 30px 0;break-inside:avoid}
  table{width:100%;border-collapse:collapse;margin:4px 0}th{background:#0a0d7c;color:#fff;text-align:left;padding:4px 6px;font-size:9px;text-transform:uppercase}td{padding:4px 6px;border-bottom:1px solid #e3e6f3;vertical-align:top}tr{page-break-inside:avoid}
  .pos{color:#fff;border-radius:6px;padding:1px 6px;font-weight:700}
  .lst{border-radius:8px;padding:6px 10px;margin:6px 0;background:#f5f6fc;page-break-inside:avoid}.lst.ruim{background:#fef2f2;border:1px solid #fecaca}.lst.bom{background:#f0fdf4;border:1px solid #bbf7d0}.lst ul{margin:3px 0 0;padding-left:16px}
  .alerta{background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:6px 10px;margin:6px 0;font-weight:600}
  .ab{border:1px solid #e3e6f3;border-radius:8px;padding:7px 10px;margin:5px 0;page-break-inside:avoid}.abh{display:flex;justify-content:space-between;gap:8px}.abh span{color:#fff;border-radius:99px;padding:1px 8px;font-weight:700;height:fit-content}
  blockquote{margin:5px 0;padding:6px 9px;border-left:3px solid #ff5a14;background:#fff8f3;white-space:pre-wrap}.ab small{color:#5a6191}
  .txt{white-space:pre-wrap;background:#fafbff;border:1px solid #eceffa;border-radius:8px;padding:8px 10px;line-height:1.45}
  .par{border:1px dashed #9aa0c3;border-radius:8px;padding:8px 10px;margin-top:10px;page-break-inside:avoid}.par p{margin:4px 0}.par .vazio{border-bottom:1px solid #cdd2e8;height:16px}.par small{color:#5a6191}
  .aviso{color:#5a6191;font-size:9.5px;margin:8px 0}
  footer{margin-top:14px;color:#9aa0c3;font-size:9.5px;display:flex;justify-content:space-between}
  .bar{position:sticky;top:0;background:#0a0d7c;color:#fff;padding:10px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between;z-index:5}.bar button{background:#ff5a14;color:#fff;border:0;border-radius:99px;padding:9px 18px;font-weight:700;cursor:pointer;font-size:13px}
  @media print{.bar{display:none}.wrap{padding:0}}
  </style></head><body>
  <div class="bar"><span>Pré-visualização · na impressão escolha <b>Salvar como PDF</b></span><button onclick="window.print()">Baixar / imprimir PDF</button></div>
  <div class="wrap">
  <header><img src="${GRC_FOTO_}grupo/grupo-r-center-branco.webp" onerror="this.remove()"><div><h1>Relatório dos testes de avaliação</h1><div class="meta">${esc(cfgv('empresa', 'Grupo R Center'))} · Recursos Humanos · Gerado em ${agora.toLocaleString('pt-BR').slice(0, 17)} por ${esc(S.user.nome)}</div></div></header>
  <div class="cand"><div><span>Candidato</span><b>${esc(c.nome)}</b></div><div><span>CPF</span><b>${esc(cpfFmt(c.cpf))}</b></div><div><span>Vaga</span><b>${esc(c.titulo || '—')}</b></div><div><span>Recrutador(a)</span><b>${esc(c.recrutador || '—')}</b></div></div>
  <div class="geral" style="--c:${G.cor}"><h2>Parecer geral: <span>${esc(G.nivel)}</span></h2>
    <div class="gk">${TESTE_ORDEM.map(t => { const k = G.C[t]; if (!k) return `<div><small>${TESTE_INFO[t].nome}</small><b>não fez</b></div>`; const v = t === 'disc' ? k.perfil : t === 'forcas' ? k.ader + '%' : k.nota + '%', ruim = (t === 'fit' && k.abaixo) || (t === 'situacional' && k.nota < 65) || (t === 'forcas' && k.ader < 60) || (t === 'disc' && k.afinTxt === 'baixa'); return `<div class="${ruim ? 'ruim' : ''}"><small>${TESTE_INFO[t].nome}</small><b>${esc(v)}</b></div>`; }).join('')}</div>
    ${lista('✅ Pontos favoráveis', G.fortes, 'bom')}${lista('🔎 Pontos de atenção', G.atencao, 'ruim')}${lista('⚠ Alertas', G.alertas, 'ruim')}${lista('💬 Perguntas sugeridas para a entrevista', G.perg)}
  </div>
  <p class="aviso">Os testes são ferramenta de apoio: a decisão considera também a entrevista e a análise do(a) psicólogo(a). Uso restrito ao processo seletivo, conforme a LGPD.</p>
  ${R.map(sec).join('')}
  <footer><span>${esc(cfgv('sistema', 'Quadro de Lojas'))} · Testes de avaliação</span><span>${esc(c.nome)} · CPF ${esc(cpfFmt(c.cpf))}</span></footer>
  </div><script>setTimeout(function(){try{window.print()}catch(e){}},800)</script></body></html>`;
  const w = window.open('', '_blank'); if (!w) { toast('Permita pop-ups para gerar o PDF', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
function openTesteCand(c, done) {
  const R = TESTE_ORDEM.map(t => c.testes[t]).filter(Boolean), G = testeGeral_(c);
  const textoTudo = () => `*${c.nome}* · CPF ${cpfFmt(c.cpf)}${c.titulo ? '\nVaga: ' + c.titulo : ''}\n\n*Parecer geral*\n${G.txt}\n\n` + R.map(r => `*${TESTE_INFO[r.teste].nome}*\n${testeCorrigir_(r).txt}${r.obs ? '\n_Parecer:_ ' + r.obs : ''}`).join('\n\n');
  modal({
    title: c.nome, icon: 'users', wide: true,
    body: `<div class="faint" style="margin:-4px 0 12px">CPF ${h(cpfFmt(c.cpf))}${c.tel ? ' · <a style="color:var(--accent)" target="_blank" rel="noopener" href="https://wa.me/55' + h(c.tel) + '">' + h(telFmt(c.tel)) + '</a>' : ''}${c.recrutador ? ' · <b>' + h(c.recrutador) + '</b>' : ''}${c.titulo ? ' · ' + h(c.titulo) : ''}</div>
      <div class="card tr-sec tr-geral" style="--c:${G.cor}"><div class="tr-h"><span class="tr-ic">📋</span><div><b>Parecer geral: <span style="color:${G.cor}">${G.nivel}</span></b><small>${R.length} de ${TESTE_ORDEM.length} testes · vaga analisada: ${h(vagaCat_(c.titulo).nome)}</small></div></div>
        <div class="tr-gk">${TESTE_ORDEM.map(t => { const k = G.C[t]; if (!k) return `<div class="off"><span>${TESTE_INFO[t].icone}</span><small>${TESTE_INFO[t].curto}</small><b>não fez</b></div>`; const v = t === 'disc' ? k.perfil : t === 'forcas' ? k.ader + '%' : k.nota + '%', ruim = (t === 'fit' && k.abaixo) || (t === 'situacional' && k.nota < 65) || (t === 'forcas' && k.ader < 60) || (t === 'disc' && k.afinTxt === 'baixa'); return `<div class="${ruim ? 'ruim' : ''}"><span>${TESTE_INFO[t].icone}</span><small>${TESTE_INFO[t].curto}${t === 'forcas' ? ' × vaga' : t === 'disc' ? ' · afinidade ' + k.afinTxt : ''}</small><b>${h(v)}</b></div>`; }).join('')}</div>
        ${trLista_('✅ Pontos favoráveis', G.fortes, 'bom')}${trLista_('🔎 Pontos de atenção', G.atencao, 'ruim')}${trLista_('⚠ Alertas', G.alertas, 'ruim')}${trLista_('💬 Perguntas sugeridas para a entrevista', G.perg)}
      </div>
      <div class="tr-aviso">Resultados de apoio à entrevista. A decisão deve considerar também a entrevista e a análise do(a) psicólogo(a).</div>
      ${R.map(testeResumoHTML_).join('')}`,
    foot: `<button class="btn ghost" id="tcDel" style="margin-right:auto;color:var(--bad)">${ic('trash')} Apagar</button><button class="btn" data-close>Fechar</button><button class="btn" id="tcPdf">${ic('download')} Baixar PDF</button><button class="btn primary" id="tcCp">${ic('copy')} Copiar relatório</button>`,
    onMount: m => {
      setTimeout(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); const b = $('.modal-b', m.el); if (b) b.scrollTop = 0; }, 90);
      $('#tcCp', m.el).onclick = () => copiar_(textoTudo(), 'Relatório copiado');
      $('#tcPdf', m.el).onclick = () => testePDF_(c);
      $$('[data-cpp]', m.el).forEach(b => b.onclick = () => { const r = R.find(x => x.id === b.dataset.cpp); copiar_(`*${TESTE_INFO[r.teste].nome}* · ${c.nome}\n${testeCorrigir_(r).txt}`, 'Parecer copiado'); });
      $$('[data-obsok]', m.el).forEach(b => b.onclick = ev => run(ev.currentTarget, async () => {
        const id = b.dataset.obsok, obs = $(`[data-obs="${id}"]`, m.el).value;
        const j = await api('testeObs', { id, obs });
        const L = (testesCache_().testes || []).map(x => x.id === id ? j.teste : x); testesSet_({ testes: L }); toast('Parecer salvo');
      }));
      $('#tcDel', m.el).onclick = async () => {
        if (!await confirmBox(`Apagar todos os resultados de <b>${h(c.nome)}</b>?`, 'Apagar', true)) return;
        const ids = (testesCache_().testes || []).filter(x => x.cpf === c.cpf).map(x => x.id);
        await api('testeApagar', { ids }); testesSet_({ testes: (testesCache_().testes || []).filter(x => x.cpf !== c.cpf) }); m.close(); if (done) done();
      };
    }
  });
}
async function pgTestes() {
  setTitle('Testes de avaliação', 'DISC · forças pessoais · desafio da loja · fit cultural');
  const v = $('#view'), f = getF('testes');
  const draw = () => {
    const c = testesCache_();
    if (!c) { v.innerHTML = `<div class="sk" style="height:260px"></div>`; return; }
    const q = norm(f.q || ''), qd = String(f.q || '').replace(/\D/g, '');
    const dia = x => new Date(x.em).toLocaleDateString('sv-SE');
    const cands = testesCandidatos_(c.testes || []);
    const recsAll = uniq([...(c.recrutadores || []), ...cands.map(x => x.recrutador).filter(Boolean)]);
    const lista = cands.filter(x => (!q || norm(x.nome + ' ' + (x.titulo || '') + ' ' + (x.recrutador || '')).includes(q) || (qd.length >= 3 && x.cpf.includes(qd)))
      && (!f.rec || norm(x.recrutador) === norm(f.rec)) && (!f.t || x.testes[f.t]) && (!f.de || dia(x) >= f.de) && (!f.ate || dia(x) <= f.ate));
    const ativos = (c.links || []).filter(l => l.ativo);
    v.innerHTML = `
    <div class="toolbar">
      <div class="input-icon search">${ic('search')}<input class="input" id="trQ" placeholder="Buscar por nome, CPF ou vaga" value="${h(f.q || '')}" style="width:100%"></div>
      <select class="input" id="trRec"><option value="">Recrutador: todos</option>${recsAll.map(x => `<option ${f.rec === x ? 'selected' : ''}>${h(x)}</option>`).join('')}</select>
      <select class="input" id="trT"><option value="">Teste: todos</option>${TESTE_ORDEM.map(t => `<option value="${t}" ${f.t === t ? 'selected' : ''}>${TESTE_INFO[t].nome}</option>`).join('')}</select>
      <label class="fi-dt"><span>De</span><input class="input" type="date" id="trDe" value="${h(f.de || '')}"></label>
      <label class="fi-dt"><span>até</span><input class="input" type="date" id="trAte" value="${h(f.ate || '')}"></label>
      <span class="spacer"></span>
      ${isAdmin() ? `<button class="btn" id="trAc" title="Quem pode ver os testes">${ic('shield')} Acesso</button>` : ''}
      <button class="btn" id="trLinks">${ic('link')} Links (${ativos.length})</button>
      <button class="btn primary" id="trNovo">${ic('share')} Mandar teste ao candidato</button>
    </div>
    ${lista.length ? `<div class="fi-grid">${lista.map(x => `
      <div class="card fi-card tr-card${x.novo ? ' nova' : ''}" data-cand="${h(x.cpf)}">
        <div class="fi-top"><div style="min-width:0"><b class="fi-nome">${h(x.nome)}</b><div class="faint" style="font-size:12px">${x.recrutador ? `<b style="color:var(--accent)">${h(x.recrutador)}</b> · ` : ''}${x.titulo ? h(x.titulo) + ' · ' : ''}${new Date(x.em).toLocaleDateString('pt-BR')}</div></div>${x.novo ? '<span class="badge b-info">novo</span>' : ''}</div>
        <div class="tr-mini">${TESTE_ORDEM.map(t => { const r = x.testes[t]; if (!r) return `<div class="off"><span>${TESTE_INFO[t].icone}</span><small>${TESTE_INFO[t].curto}</small><b>—</b></div>`; const k = testeCorrigir_(r); return `<div><span>${TESTE_INFO[t].icone}</span><small>${TESTE_INFO[t].curto}</small><b${k.tipo === 'fit' && k.abaixo ? ' style="color:var(--bad)" title="Abaixo da nota mínima de ' + FIT_MIN + '%"' : ''}>${h(k.tipo === 'forcas' ? k.top[0].nome : k.tipo === 'disc' ? k.perfil : (k.mini ? k.md + ' ' : '') + (k.tipo === 'fit' && k.abaixo ? '⚠ ' : '') + k.nota + '%')}</b></div>`; }).join('')}</div>
        <div class="fi-acts"><button class="btn primary sm">${ic('eye')} Ver resultado e parecer</button><button class="btn sm" data-pdf="${h(x.cpf)}" title="Baixar o PDF com todos os testes">${ic('download')} PDF</button></div>
      </div>`).join('')}</div>`
      : `<div class="card empty" style="text-align:center;padding:30px"><b>${cands.length ? 'Nenhum resultado com esses filtros' : 'Nenhum teste respondido ainda'}</b><p class="muted">Clique em <b>Mandar teste ao candidato</b>, escolha os testes e envie o link pelo WhatsApp. O resultado aparece aqui assim que ele terminar.</p></div>`}
    <div class="faint" style="font-size:12px;margin-top:10px">${lista.length} candidato(s) · Ferramenta de apoio: os resultados não devem ser usados isoladamente para eliminar candidatos.</div>`;
    const qi = $('#trQ'); qi.oninput = () => { f.q = qi.value; saveF(); draw(); const e2 = $('#trQ'); e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); };
    [['trRec', 'rec'], ['trT', 't'], ['trDe', 'de'], ['trAte', 'ate']].forEach(([id, k]) => { $('#' + id).onchange = e => { f[k] = e.target.value; saveF(); draw(); }; });
    $('#trNovo').onclick = () => openTesteLink(draw);
    $('#trLinks').onclick = () => openTesteLinks(draw);
    if ($('#trAc')) $('#trAc').onclick = openTesteAcesso;
    $$('[data-pdf]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const cand = testesCandidatos_(testesCache_().testes || []).find(y => y.cpf === b.dataset.pdf); if (cand) testePDF_(cand); });
    $$('[data-cand]').forEach(el => el.onclick = () => {
      const cand = testesCandidatos_(testesCache_().testes || []).find(y => y.cpf === el.dataset.cand); if (!cand) return;
      openTesteCand(cand, draw);
      const novos = Object.values(cand.testes).filter(r => !r.visto).map(r => r.id);
      if (novos.length) { testesSet_({ testes: testesCache_().testes.map(r => novos.includes(r.id) ? Object.assign({}, r, { visto: true }) : r) }); updateShell(); api('testeMarcar', { ids: novos }, { silent: true }).catch(() => {}); }
    });
  };
  draw();
  const rt = S.rt;
  try { const j = await api('testesList', {}, { silent: true }); if (rt !== S.rt) return; testesSet_(j); if (!$('.overlay')) draw(); updateShell(); }
  catch (e) { if (!testesCache_()) v.innerHTML = `<div class="card muted">${h(e.message)}</div>`; else toast(e.message, true); }
}
function openTesteAcesso() {
  modal({
    title: 'Acesso aos Testes de avaliação', icon: 'shield',
    body: `<p class="muted" style="margin-top:0">Administradores sempre têm acesso. Marque quem mais pode ver os resultados, escrever o parecer e mandar o teste aos candidatos (ex.: psicólogo, recrutadores), seja qual for o tipo de acesso da pessoa.</p><div id="taL"><div class="sk" style="height:80px"></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="taOk">Salvar</button>`,
    onMount: async m => {
      const el = $('#taL', m.el);
      try {
        const us = (usersCache_() || await usersBuscar_()).filter(u => u.perfil !== 'ADMIN' && u.ativo);
        const ids = (await api('testeAcesso', {}, { silent: true })).ids || [];
        if (!$('#taL', m.el)) return;
        el.innerHTML = us.length ? chipPicker('tac', us.map(u => u.id), ids.join(', ')) : '<span class="muted">Nenhum usuário sem perfil de administrador.</span>';
        bindPickers(el);
        $$('[data-picker=tac] .chip', el).forEach(c => { const u = us.find(x => x.id === c.dataset.v); c.textContent = u ? u.nome + (u.cargo ? ' · ' + u.cargo : '') : c.dataset.v; });
      } catch (e) { el.innerHTML = `<span class="muted">${h(e.message)}</span>`; }
      $('#taOk', m.el).onclick = ev => run(ev.currentTarget, async () => { await api('setTesteAcesso', { ids: splitMulti(pickVal(el, 'tac')) }); m.close(); toast('Acesso salvo. A pessoa vê os Testes ao entrar de novo ou atualizar a página.'); });
    }
  });
}
function openTesteQR(codigo, titulo) {
  const url = testeUrl_(codigo);
  modal({
    title: 'QR Code do teste', icon: 'grid',
    body: `<p class="muted" style="margin-top:0">O candidato aponta a câmera do celular e faz os testes ali mesmo.</p><div id="qrBox" style="display:grid;place-items:center;min-height:270px"><div class="spin"></div></div>`,
    foot: `<button class="btn" data-close>Fechar</button><button class="btn primary" id="qrBaixar">${ic('download')} Baixar imagem</button>`,
    onMount: async m => {
      try {
        await qrCarregar_();
        const cv = qrCanvas_(url, 320); cv.style.cssText = 'width:260px;height:260px;border-radius:12px;image-rendering:pixelated';
        $('#qrBox', m.el).innerHTML = ''; $('#qrBox', m.el).appendChild(cv);
        $('#qrBaixar', m.el).onclick = () => { const a = document.createElement('a'); a.href = qrCartaz_(url, (titulo ? titulo + ' · ' : '') + 'Etapa de avaliação').toDataURL('image/png'); a.download = 'qrcode_testes.png'; a.click(); };
      } catch (e) { $('#qrBox', m.el).innerHTML = `<span class="muted">${h(e.message)}</span>`; }
    }
  });
}
function openTesteLink(done) {
  modal({
    title: 'Mandar teste ao candidato', icon: 'share',
    body: `<p class="muted" style="margin-top:0">Escolha quais testes vão no link. Pode ser um só ou todos juntos — o candidato faz um de cada vez e o resultado aparece aqui.</p>
      <div class="tr-esc">${TESTE_ORDEM.map(t => `<label class="tr-op"><input type="checkbox" value="${t}" checked><span>${TESTE_INFO[t].icone}</span><div><b>${TESTE_INFO[t].nome}</b><small>${TESTE_INFO[t].desc} · ~${TESTE_INFO[t].min} min</small></div></label>`).join('')}</div>
      <div class="field" style="margin-top:12px"><label>Vaga / observação (opcional)</label><input class="input" id="tlT" placeholder="Ex.: Operador de caixa · Eusébio"></div>
      <div id="tlRes"></div>`,
    foot: `<button class="btn" data-close>Fechar</button><button class="btn primary" id="tlOk">${ic('link')} Gerar link</button>`,
    onMount: m => {
      $('#tlOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const testes = $$('.tr-esc input:checked', m.el).map(x => x.value);
        if (!testes.length) throw new Error('Escolha ao menos um teste.');
        const j = await api('testeLinkCriar', { titulo: $('#tlT', m.el).value.trim(), testes });
        testesSet_({ links: j.links });
        const l = j.link, url = testeUrl_(l.codigo);
        $('#tlRes', m.el).innerHTML = `<div class="card mt" style="border-color:var(--accent)"><b>${ic('check')} Link pronto · ${l.testes.map(t => TESTE_INFO[t].icone).join(' ')}</b><div class="mono" style="font-size:12.5px;word-break:break-all;margin:8px 0">${h(url)}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="tlWa">${ic('share')} Enviar pelo WhatsApp</button><button class="btn" id="tlCp">${ic('copy')} Copiar link</button><button class="btn" id="tlQr">${ic('grid')} QR Code</button></div></div>`;
        $('#tlWa', m.el).onclick = () => compartilharTeste_(l.codigo, l.titulo);
        $('#tlCp', m.el).onclick = () => copiar_(url, 'Link copiado');
        $('#tlQr', m.el).onclick = () => openTesteQR(l.codigo, l.titulo);
        if (done) done();
      });
    }
  });
}
function openTesteLinks(done) {
  const L = (testesCache_() || {}).links || [];
  modal({
    title: 'Links de testes', icon: 'link', wide: true,
    body: L.length ? `<div class="alist">${L.map(l => `<div class="aitem" style="align-items:center"><div style="flex:1;min-width:0"><b>${h(l.titulo || 'Link sem vaga')}</b> ${l.ativo ? '' : '<span class="badge">desativado</span>'}<span>${(l.testes || []).map(t => TESTE_INFO[t] ? TESTE_INFO[t].icone + ' ' + TESTE_INFO[t].curto : t).join(' · ')}<br>${h(l.criadoPor)} · ${new Date(l.em).toLocaleDateString('pt-BR')}</span></div>
      ${l.ativo ? `<button class="btn sm" data-wa="${h(l.codigo)}" title="WhatsApp">${ic('share')}</button><button class="btn sm" data-cl="${h(l.codigo)}" title="Copiar link">${ic('copy')}</button><button class="btn sm" data-qr="${h(l.codigo)}" title="QR Code">${ic('grid')}</button><button class="btn sm ghost" data-off="${h(l.codigo)}" title="Desativar">${ic('x')}</button>` : ''}</div>`).join('')}</div>` : '<p class="muted">Nenhum link criado ainda.</p>',
    foot: `<button class="btn" data-close>Fechar</button>`,
    onMount: m => {
      $$('[data-wa]', m.el).forEach(b => b.onclick = () => { const l = L.find(x => x.codigo === b.dataset.wa); compartilharTeste_(l.codigo, l.titulo); });
      $$('[data-cl]', m.el).forEach(b => b.onclick = () => copiar_(testeUrl_(b.dataset.cl), 'Link copiado'));
      $$('[data-qr]', m.el).forEach(b => b.onclick = () => { const l = L.find(x => x.codigo === b.dataset.qr); openTesteQR(l.codigo, l.titulo); });
      $$('[data-off]', m.el).forEach(b => b.onclick = async () => { if (!await confirmBox('Desativar este link? Quem abrir depois não consegue mais responder.', 'Desativar', true)) return; const j = await api('testeLinkDesativar', { codigo: b.dataset.off }); testesSet_({ links: j.links }); m.close(); openTesteLinks(done); if (done) done(); });
    }
  });
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
const FILA_ASYNC = { moverLinha: 1, escalaSet: 1, addPosicao: 1, removerPosicao: 1, setPadrao: 1, movimentar: 1, saveRow: 1, abrirVaga: 1, preencherVaga: 1, setVagaInfo: 1, setVagaInfoLote: 1, alocar: 1, desligar: 1, desligarLote: 1, marcarDesligadoContr: 1, saveContratacao: 1, addContratacao: 1, contrBulkSet: 1, saveSelecao: 1, deleteSelecao: 1, mobSave: 1, mobDelete: 1, saveFotoColab: 1, setLiderSetor: 1 };
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
    const agoraOk = Date.now();
    const ids = new Set();
    filaSnap = sn.docs.map(d => { ids.add(d.id); return filaParse_(d); });
    filaLocal.forEach(o => { if (ids.has(o.id)) o.visto = true; });
    filaSnap.forEach(o => {
      if (o.status === 'ok' && !filaOkVisto[o.id]) filaOkVisto[o.id] = agoraOk;
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
    setTimeout(() => { meRefreshSessao_().finally(filaStart_); }, Math.min(30000, 3000 * ++filaTent));
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
      const ja = liveOn; liveOn = true; liveTent = 0;
      if (ja) applyLiveDeb_(); else applyLive();
      fim(true);
    }, err => { console.warn('firebase', err); fim(false); liveFalhou_(); })));
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
let liveDebT = null, liveRetryT = null, liveTent = 0, rrPend = false, liveReinicioEm = 0;
// junta as atualizações que chegam juntas (resumo geral + lojas) para não piscar a tela
function applyLiveDeb_() { clearTimeout(liveDebT); liveDebT = setTimeout(() => { if (liveOn) applyLive(); }, 120); }
function liveFalhou_() {
  if (liveRetryT || DEMO || !FB_OK) return;
  const d = Math.min(30000, 2000 * Math.pow(2, Math.min(liveTent++, 4)));
  liveRetryT = setTimeout(() => { liveRetryT = null; liveReiniciar_(); }, d);
}
async function liveReiniciar_() {
  const k = ls.get('grc_keys', null);
  if (!k || !FB_OK || DEMO || !S.user || !S.token) return;
  liveReinicioEm = Date.now();
  await meRefreshSessao_();
  fbKeysSig = '';
  const ok = await startLive(k);
  if (!ok && liveTent < 8) liveFalhou_();
  selMobLive_();
}
// vigia: se o servidor já confirmou uma alteração e ela não chegou na tela, reconecta
const filaOkVisto = {};
setInterval(() => {
  if (rrPend && !$('.overlay')) { rrPend = false; rerender_(); }
}, 600);
setInterval(() => {
  if (DEMO || !FB_OK || !S.user || !S.data || document.hidden) return;
  const agora = Date.now();
  if (!filaUnsub && filaVivo === false && S.token && liveBooted) filaStart_();
  if (!liveOn || agora - liveReinicioEm < 60000) return;
  const atrasada = filaSnap.some(o => o.status === 'ok' && !o.gated && o.criadoMs > (S.data.ultimaOp || 0) && filaOkVisto[o.id] && agora - filaOkVisto[o.id] > 20000);
  if (atrasada) liveReiniciar_();
}, 5000);
let ocultoEm = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { ocultoEm = Date.now(); return; }
  if (DEMO || !FB_OK || !S.user || !S.token) return;
  if (filaTodas_().some(o => o.status === 'pendente' || o.status === 'aplicado')) filaKick_();
  if (!filaUnsub) filaStart_();
  if (ocultoEm && Date.now() - ocultoEm > 45000) liveReiniciar_();
});
window.addEventListener('online', () => { if (DEMO || !FB_OK || !S.user || !S.token) return; if (!filaUnsub) filaStart_(); liveReiniciar_(); filaKick_(); });
function rerender_() {
  if ($('.overlay')) { rrPend = true; return; }
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
  startPolling(); initOneSignal(); carregarAcessoSel(); carregarAcessoMob(); carregarAcessoEsc(); carregarFotos(); filaStart_();
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
const COTA_APRENDIZ = .05;
// faixa da cota PCD pelo total de empregados da empresa
const faixaPcd = n => n >= 1001 ? .05 : n >= 501 ? .04 : n >= 201 ? .03 : n >= 100 ? .02 : 0;
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
    // Aprendiz (CLT art. 429): mínimo de 5% por estabelecimento, sobre as funções que demandam formação
    // profissional — fora da base: os próprios aprendizes, estagiários, gerentes e diretoria.
    st.baseAprendiz = colab.filter(r => !r.aprendiz && !r.estagio && !/GERENTE|DIRETOR/.test(norm(r.funcao))).length;
    st.cotaAprendiz = Math.ceil(st.baseAprendiz * COTA_APRENDIZ);
    st.empregados = colab.filter(r => !r.estagio).length; // base da cota PCD (estagiário não é empregado)
    st.preench = pct(R.filter(r => r.nome).length, R.length);
    l.st = st;
    S.all.push(...R);
  });
  const L = D.lojas;
  // PCD (Lei 8.213/91, art. 93): a faixa vale para a empresa toda (matriz + filiais) e é distribuída por loja
  const totEmp = sum(L, l => l.st.empregados);
  S.pcdPct = faixaPcd(totEmp);
  L.forEach(l => { l.st.cotaPcd = Math.ceil(l.st.empregados * S.pcdPct); });
  S.tot = {};
  ['ideal', 'atual', 'vagas', 'vagasQt', 'futuras', 'aviso', 'colab', 'aprendiz', 'pcd', 'estagio', 'cipa', 'trainee', 'cotaAprendiz', 'cotaPcd', 'posicoes'].forEach(k => S.tot[k] = sum(L, l => l.st[k]));
  S.tot.ocup = pct(S.tot.atual, S.tot.ideal);
  S.tot.empregados = totEmp;
  S.tot.cotaPcd = Math.ceil(totEmp * S.pcdPct); // obrigação da empresa (não a soma dos arredondamentos por loja)

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
  S.ck = { data: H[0] || 'DATA', loja: find(/^LOJA/), colab: find(/COLABORADOR|NOME/), setor: find(/SETOR/), funcao: find(/FUNC/), aso: find(/ASO/), hcm: find(/HCM|EXPORT/), contrato: find(/CONTRATO/), status: find(/STATUS/), dp: find(/SOLICIT|^DP$/), envio: find(/ENVIO DP/) };
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
// fotos do site do Grupo R Center (fachadas e equipe)
const GRC_FOTO_ = 'https://www.rcentersupermercado.com.br/img/';
const LOJA_FOTOS_ = { MATRIZ: 'loja-santa-rosa.webp', MESSEJANA: 'loja-messejana-fachada.jpg', EUSEBIO: 'loja-eusebio.jpg' };
const lojaFoto_ = l => { const k = String((l && l.key) || '').toUpperCase(), f = LOJA_FOTOS_[k] || (/EUSEBIO|VITA/.test(k) ? 'loja-eusebio.jpg' : /MESSEJ/.test(k) ? 'loja-messejana-fachada.jpg' : /MATRIZ|ROSA/.test(k) ? 'loja-santa-rosa.webp' : ''); return f ? GRC_FOTO_ + f : ''; };
// logo da marca de cada loja (no lugar do número)
const LOJA_LOGOS_ = [[/TORRA/, 'torra-atacadista-branco.png'], [/FRALDA/, 'super-fraldas-branco.png'], [/CASA|CONSTRU/, 'r-center-casa-construcao-branco.png'], [/VITA/, 'vita-park-branco.webp'], [/MONITOR|^GRC|ADMINIST/, 'grupo-r-center-branco.webp']];
const lojaLogo_ = l => { const k = norm((l.key || '') + ' ' + (l.nome || '')), m = LOJA_LOGOS_.find(([r]) => r.test(k)); return GRC_FOTO_ + 'grupo/' + (m ? m[1] : 'r-center-supermercados-branco.png'); };
// ícone da marca no menu lateral (recorte do símbolo da logo, como ícone de app)
const lojaDot_ = l => { const u = lojaLogo_(l), f = u.split('/').pop().split('.')[0]; return `<span class="dot lg-dot lg-${f}" style="--lc:${l.color};--lg:url('${u}')"><i>${l.num}</i></span>`; };
const lojaLogoTile_ = (l, big) => `<div class="lj-logo${big ? ' big' : ''}" style="--lc:${l.color}" title="${h(l.nome)}"><img src="${lojaLogo_(l)}" alt="${h(l.nome)}" onerror="this.outerHTML='<b>${l.num}</b>'"><i>${l.num}</i></div>`;
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
    ${nl.filter(l => !isAdmLoja(l)).map(l => navItem('/loja/' + l.key, lojaDot_(l), l.nome, (l.nova ? '<span class="new">NOVA</span>' : '') + (l.st.vagas ? `<span class="cnt ${l.st.vagas > 5 ? 'hot' : ''}" title="Vagas abertas">${l.st.vagas}</span><span class="badge-mini"></span>` : ''))).join('')}
    ${nl.filter(isAdmLoja).map(l => navItem('/loja/' + l.key, `<span class="dot" style="background:linear-gradient(135deg,#fde68a,#f5c451 45%,#b8860b);color:#1a1204;font-size:11px">★</span>`, 'Administrativo', l.st.vagas ? `<span class="cnt">${l.st.vagas}</span>` : '')).join('')}
    ${isAdmin() && !nl.some(isAdmLoja) ? `<a class="nav" href="#" id="navAdm" title="Criar o quadro do administrativo"><span class="dot" style="background:linear-gradient(135deg,#fde68a,#f5c451 45%,#b8860b);color:#1a1204;font-size:11px">★</span><span class="lbl">Criar quadro ADM</span></a>` : ''}
    ${isAdmin() ? `<a class="nav" href="#" id="navNovaLoja" title="Criar nova loja"><span class="dot" style="background:transparent;border:1.5px dashed var(--border2);color:var(--muted)">+</span><span class="lbl">Nova loja</span></a>` : ''}
    ${podeEscala() ? `<div class="sb-label">Planejamento</div>${navItem('/escalas', ic('calendar'), 'Simulador de escalas', '<span class="new">5x2</span>')}` : ''}
    <div class="sb-label">Recrutamento</div>
    ${navItem('/vagas', ic('briefcase'), 'Vagas', `<span class="cnt hot">${S.tot.vagas}</span><span class="badge-mini"></span>`)}
    ${navItem('/contratacoes', ic('userplus'), 'Contratações', nC ? `<span class="cnt">${nC}</span>` : '')}
    ${podeFichas() ? navItem('/fichas', ic('file'), 'Fichas', fichasNovas() ? `<span class="cnt hot">${fichasNovas()}</span>` : '<span class="new">novo</span>') : ''}
    ${podeAgenda() ? navItem('/agenda', ic('calendar'), 'Agenda', agendaNovos() ? `<span class="cnt hot">${agendaNovos()}</span>` : '<span class="new">novo</span>') : ''}
    ${podeTestes() ? navItem('/testes', ic('check'), 'Testes', testesNovos() ? `<span class="cnt hot">${testesNovos()}</span>` : '<span class="new">novo</span>') : ''}
    ${temMob() ? navItem('/mobilidade', ic('car'), 'Mobilidade') : ''}
    ${navItem('/experiencias', ic('clock'), 'Experiências', nE ? `<span class="cnt hot">${nE}</span>` : '')}
    ${navItem('/desligamentos', ic('door'), 'Desligamentos')}
    ${!isAdmin() && S.user.podeConvidar ? `<a class="nav" href="#" id="navConv" title="Links de convite">${ic('link')}<span class="lbl">Links de convite</span></a>` : ''}
    ${podePesq() ? `<div class="sb-label">Cargos e salários</div>${navItem('/tabela', ic('table'), 'Tabela salarial', '<span class="new">novo</span>')}${navItem('/pesquisa', ic('trend'), 'Pesquisa salarial')}` : ''}
    ${isAdmin() ? `<div class="sb-label">Administração</div>${navItem('/aprovacoes', ic('check'), 'Aprovações', S.notif.pendentes ? `<span class="cnt hot">${S.notif.pendentes}</span><span class="badge-mini"></span>` : '')}${navItem('/admin', ic('shield'), 'Acessos e configurações')}${navItem('/historico', ic('history'), 'Histórico')}` : `<div class="sb-label">Solicitações</div>${navItem('/solicitacoes', ic('file'), 'Minhas solicitações', (S.data.pendentes || []).length ? `<span class="cnt">${S.data.pendentes.length}</span>` : '')}`}
  `;
  sbGrupos_();
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
// menu lateral em grupos recolhíveis (o estado fica salvo neste navegador)
function sbGrupos_() {
  const nav = $('#sbNav'); if (!nav) return;
  let fech = []; try { fech = JSON.parse(localStorage.getItem('grc_sb_fech') || '[]'); } catch (e) {}
  let grp = null;
  [...nav.children].forEach(el => {
    if (el.classList.contains('sb-label')) {
      const nome = el.textContent.trim(), bt = document.createElement('button');
      bt.type = 'button'; bt.className = 'sb-label sb-tog'; bt.dataset.g = nome; bt.title = 'Mostrar ou recolher';
      bt.innerHTML = `<span>${h(nome)}</span><em class="sb-sum"></em>${ic('chevron')}`;
      grp = document.createElement('div'); grp.className = 'sb-grp'; grp.innerHTML = '<div class="sb-grp-in"></div>';
      nav.replaceChild(bt, el); bt.after(grp);
    } else if (grp) grp.firstChild.appendChild(el);
  });
  $$('.sb-tog', nav).forEach(b => {
    const g = b.nextElementSibling;
    const set = f => { const hot = $$('.cnt.hot', g).reduce((s, x) => s + (Number(x.textContent) || 0), 0); b.classList.toggle('fech', f); g.classList.toggle('fech', f); $('.sb-sum', b).textContent = f && hot ? hot : ''; };
    set(fech.includes(b.dataset.g) && !$('.nav.active', g));
    b.onclick = () => { const f = !g.classList.contains('fech'); set(f); fech = fech.filter(x => x !== b.dataset.g); if (f) fech.push(b.dataset.g); try { localStorage.setItem('grc_sb_fech', JSON.stringify(fech)); } catch (e) {} };
  });
}
// animação de entrada da página: cartões sobem em sequência e os números contam até o valor
function animaView_(v) {
  if (!v || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  v.classList.remove('v-in'); void v.offsetWidth; v.classList.add('v-in');
  $$('.card, .kpi, .tbl-wrap', v).slice(0, 24).forEach((c, i) => c.style.setProperty('--d', Math.min(i, 12) * 40 + 'ms'));
  clearTimeout(v._vin); v._vin = setTimeout(() => v.classList.remove('v-in'), 1300);
  $$('.kpi .val, .stats > div > b, .adm-stat > b', v).slice(0, 30).forEach(el => {
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue)); if (!tn) return;
    const m = tn.nodeValue.match(/^(\s*)([\d.]*\d(?:,\d+)?)(.*)$/s); if (!m) return;
    const alvo = Number(m[2].replace(/\./g, '').replace(',', '.')); if (!isFinite(alvo) || alvo === 0) return;
    const dec = (m[2].split(',')[1] || '').length, mil = /\./.test(m[2]), t0 = performance.now(), dur = 750;
    const fmtN = x => x.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: mil });
    const passo = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); tn.nodeValue = m[1] + fmtN(alvo * e) + m[3]; if (p < 1 && tn.isConnected) requestAnimationFrame(passo); else tn.nodeValue = m[1] + m[2] + m[3]; };
    tn.nodeValue = m[1] + fmtN(0) + m[3]; requestAnimationFrame(passo);
  });
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

// acesso ao simulador (igual à Mobilidade): dono, adm. secundário, acesso (edita) e só visualizar — liberado pelo dono
const podePesq = () => !!(S.user && (isAdmin() || S.user.podePesquisa));
const podeEscala = () => !!(S.user && (S.esc ? S.esc.acesso : ls.get('grc_escAcesso_' + S.user.id, false)));
const escEdita = () => !!(S.esc && S.esc.edita);
const escAdm = () => !!(S.esc && S.esc.adm);
async function carregarAcessoEsc() {
  if (!S.user) return;
  if (DEMO) { S.esc = { acesso: true, edita: true, adm: false, dono: false }; return; }
  try {
    const j = await api('escAcesso', {}, { silent: true });
    const antes = podeEscala(), antesE = escEdita();
    S.esc = { acesso: !!j.acesso, edita: !!j.edita, adm: !!j.adm, dono: !!j.dono };
    ls.set('grc_escAcesso_' + S.user.id, S.esc.acesso);
    if ((antes !== podeEscala() || antesE !== escEdita()) && $('.app')) { updateShell(); if (/^#\/escalas/.test(location.hash)) { if (!podeEscala()) location.hash = '#/inicio'; else route(true); } }
  } catch (e) { /* servidor sem a função ainda */ }
}
async function openEscAcesso() {
  if (openEscAcesso.lock) return; openEscAcesso.lock = 1;
  let j;
  try { busy(true); j = await api('escUsuarios', {}, { silent: true }); }
  catch (e) { return toast(e.message, true); } finally { busy(false); openEscAcesso.lock = 0; }
  const ids = j.ids || [], lei = j.leitura || [], adms = j.adms || [], souDono = !!j.souDono;
  const dono = (j.users || []).find(u => String(u.id) === String(j.dono));
  const nivel = u => adms.includes(u.id) ? 'adm' : ids.includes(u.id) ? 'edita' : lei.includes(u.id) ? 'ver' : '';
  const ordem = { adm: 0, edita: 1, ver: 2, '': 3 };
  const ativos = (j.users || []).filter(u => u.ativo && String(u.id) !== String(j.dono)).sort((a, b) => (ordem[nivel(a)] - ordem[nivel(b)]) || String(a.nome).localeCompare(b.nome));
  const NIV = [['', 'Sem acesso'], ['ver', 'Só visualizar'], ['edita', 'Acesso (ajusta)'], ['adm', 'Adm. secundário']];
  modal({
    title: 'Quem acessa o Simulador de escalas', icon: 'key',
    body: `<p class="muted" style="margin-top:0;line-height:1.55"><b>Dono</b>: faz tudo. <b>Adm. secundário</b>: ajusta os parâmetros e libera acessos. <b>Acesso</b>: vê e ajusta horários, postos e regras dos setores. <b>Só visualizar</b>: vê as escalas e números, sem alterar. Administradores do Quadro não entram sem estar marcados aqui.${souDono ? '' : ' Só o dono altera os administradores secundários.'}</p>
      ${dono ? `<div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px">${avatar(dono.nome, dono.foto, 'sm')}<div style="flex:1"><b>${h(dono.nome)}</b><div class="muted" style="font-size:11.5px">${h(dono.cargo || PERFIS[dono.perfil] || '')}</div></div><span class="badge b-violet">Dono</span></div>` : ''}
      <div class="input-icon search" style="margin:10px 0">${ic('search')}<input class="input" id="eaq" placeholder="Buscar pessoa" style="width:100%"></div>
      <div style="display:flex;flex-direction:column;gap:8px" id="eaL">${ativos.map(u => `<div class="card" data-nm="${h(norm(u.nome))}" style="display:flex;align-items:center;gap:12px;padding:10px 12px">
        ${avatar(u.nome, u.foto, 'sm')}<div style="flex:1;min-width:0"><b>${h(u.nome)}</b><div class="muted" style="font-size:11.5px">${h(PERFIS[u.perfil] || u.perfil)}${u.cargo ? ' · ' + h(u.cargo) : ''}</div></div>
        <select class="input" data-uid="${h(u.id)}" style="width:auto;padding:7px 9px;font-size:12.5px" ${!souDono && nivel(u) === 'adm' ? 'disabled' : ''}>${NIV.filter(n => souDono || n[0] !== 'adm' || nivel(u) === 'adm').map(n => `<option value="${n[0]}" ${nivel(u) === n[0] ? 'selected' : ''}>${n[1]}</option>`).join('')}</select></div>`).join('') || '<div class="empty">Nenhum outro usuário ativo.</div>'}</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="eaOk">Salvar acessos</button>`,
    onMount: m => {
      $('#eaq', m.el).oninput = e => { const t = norm(e.target.value); $$('#eaL [data-nm]', m.el).forEach(l => l.style.display = !t || l.dataset.nm.includes(t) ? '' : 'none'); };
      $('#eaOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const sels = $$('[data-uid]', m.el);
        const pl = { ids: sels.filter(c => c.value === 'edita').map(c => c.dataset.uid), leitura: sels.filter(c => c.value === 'ver').map(c => c.dataset.uid) };
        if (souDono) pl.adms = sels.filter(c => c.value === 'adm').map(c => c.dataset.uid);
        const r = await api('escSetAcesso', pl);
        m.close();
        toast(`Acessos salvos: ${r.adms.length} adm. secundário(s), ${r.ids.length} com acesso e ${r.leitura.length} só visualizar`);
      });
    }
  });
}
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
function escGerar5x2(P, dem, W, N, semente, opt) {
  semente = semente || 0; opt = opt || {};
  // fix[i] = dias da semana (0 = seg … 6 = dom) em que a pessoa nunca trabalha (setor fechado, não trabalha sábado/domingo, folga fixa)
  const fix = Array.from({ length: P }, (_, i) => (opt.fix && opt.fix[i]) || opt.fixAll || new Set());
  const junta = opt.folgas === 'juntas';
  const grid = Array.from({ length: P }, () => []);
  const streak = Array.from({ length: P }, (_, i) => N > 1 ? (i % N) : 0); // domingos seguidos trabalhados
  const run = new Array(P).fill(0);                                        // dias seguidos trabalhados até ontem
  const offT = new Array(P).fill(0);                                       // folgas seguidas até ontem (fim da semana anterior)
  const combos = [[]]; for (let a = 0; a < 6; a++) { combos.push([a]); for (let b = a + 1; b < 6; b++) combos.push([a, b]); }
  // simula a semana da pessoa: maior sequência de trabalho, maior bloco de folgas, folgas coladas e como termina
  const sim = (i, o) => {
    let r = run[i], f = offT[i], mr = 0, mo = 0, adj = 0, prev = offT[i] > 0;
    for (let d = 0; d < 7; d++) { if (o[d]) { f++; r = 0; if (prev) adj++; prev = true; } else { r++; f = 0; prev = false; } if (r > mr) mr = r; if (f > mo) mo = f; }
    return { mr, mo, adj, tr: r };
  };
  const melhor = (x, y) => { for (let k = 0; k < x.length; k++) { if (x[k] < y[k] - 1e-9) return true; if (x[k] > y[k] + 1e-9) return false; } return false; };
  for (let w = 0; w < W; w++) {
    const off = Array.from({ length: P }, (_, i) => [0, 1, 2, 3, 4, 5, 6].map(d => fix[i].has(d)));
    // 1) domingo: gira só entre quem trabalha domingo
    const elig = [...Array(P).keys()].filter(i => !fix[i].has(6));
    const precisa = elig.filter(i => N <= 1 || streak[i] >= N - 1);
    const k = Math.max(0, elig.length - dem[6]);
    const ordem = elig.slice().sort((a, b) => (streak[b] - streak[a]) || (offT[a] - offT[b]) || (((a + w + semente) % P) - ((b + w + semente) % P)));
    const nOff = Math.max(k, precisa.length);
    const folgaDom = new Set(precisa);
    for (const i of ordem) { if (folgaDom.size >= nOff) break; folgaDom.add(i); }
    folgaDom.forEach(i => off[i][6] = true);
    // 2) segunda a sábado: completa 2 folgas, sem 7 dias seguidos e sem 3+ folgas emendadas
    const slack = dem.slice(0, 6).map((d, j) => P - d - off.filter(o => o[j]).length);
    const ord2 = [...Array(P).keys()].sort((a, b) => (run[b] - run[a]) || ((off[a][6] ? 1 : 0) - (off[b][6] ? 1 : 0)) || (((a * 7 + w * 3 + semente) % P) - ((b * 7 + w * 3 + semente) % P)));
    for (const i of ord2) {
      const need = Math.max(0, 2 - off[i].filter(Boolean).length);
      let best = null, bs = null;
      for (const pr of combos) {
        if (pr.length !== need || pr.some(d => off[i][d])) continue;
        const o2 = off[i].slice(); pr.forEach(d => o2[d] = true);
        const m = sim(i, o2);
        const neg = pr.filter(d => slack[d] - 1 < 0).length;
        const pen = (m.tr >= 6 ? 3 : m.tr >= 5 ? .4 : 0) + (junta ? (m.adj ? -.6 : 0) : 1.5 * m.adj);
        const rot = (((pr[0] || 0) + i + w * 2 + semente) % 6) / 100;
        const sc = [m.mr > 6 ? m.mr : 0, m.mo > 2 ? m.mo : 0, neg, -sum(pr, d => slack[d]) + pen + rot];
        if (!bs || melhor(sc, bs)) { bs = sc; best = pr; }
      }
      (best || []).forEach(d => { off[i][d] = true; slack[d]--; });
    }
    // 3) grava e atualiza contadores
    for (let i = 0; i < P; i++) {
      for (let d = 0; d < 7; d++) { const t = off[i][d] ? 0 : 1; grid[i].push(t); run[i] = t ? run[i] + 1 : 0; offT[i] = t ? 0 : offT[i] + 1; }
      streak[i] = fix[i].has(6) || off[i][6] ? 0 : streak[i] + 1;
    }
  }
  return grid;
}
function escCobertura(grid, nDias) { const c = new Array(nDias).fill(0); grid.forEach(r => r.forEach((t, d) => { if (t) c[d]++; })); return c; }
// conferência legal de cada pessoa
function escConferir(grid, N, fix) {
  const prob = [];
  grid.forEach((r, i) => {
    let run = 0, maxRun = 0, domSeg = 0, maxDom = 0, fo = 0, maxFo = 0;
    for (let d = 0; d < r.length; d++) { run = r[d] ? run + 1 : 0; maxRun = Math.max(maxRun, run); fo = r[d] ? 0 : fo + 1; maxFo = Math.max(maxFo, fo); if (d % 7 === 6) { domSeg = r[d] ? domSeg + 1 : 0; maxDom = Math.max(maxDom, domSeg); } }
    const fx = fix && (fix[i] || fix.all);
    if (maxFo > 2 && !(fx && fx.size >= 2)) prob.push({ i, t: `${maxFo} folgas seguidas` });
    const semanas = []; for (let w = 0; w < r.length / 7; w++) semanas.push(r.slice(w * 7, w * 7 + 7).filter(x => !x).length);
    if (maxRun > 6) prob.push({ i, t: `${maxRun} dias seguidos de trabalho` });
    if (semanas.some(x => x < 2)) prob.push({ i, t: 'semana com menos de 2 folgas' });
    if (N > 0 && maxDom >= N) prob.push({ i, t: `${maxDom} domingos seguidos sem folga` });
  });
  return prob;
}
// menor equipe que cobre a demanda sem quebrar as regras
function escMinimo5x2(dem, N, opt) {
  const tot = sum(dem);
  if (!tot) return { P: 0, grid: [], lb: 0 };
  const lb = Math.max(Math.ceil(tot / 5 - 1e-9), N > 1 ? Math.ceil(dem[6] * N / (N - 1) - 1e-9) : (dem[6] ? Infinity : 0), Math.max(...dem));
  if (!isFinite(lb)) return { P: null, grid: [], lb };
  const W = 6;
  for (let P = lb; P <= lb + 8; P++) {
    for (let s = 0; s < 4; s++) {
      const g = escGerar5x2(P, dem, W, N, s, opt);
      const c = escCobertura(g, W * 7);
      const ok = c.every((x, d) => x >= dem[d % 7]) && !escConferir(g, N, opt && opt.fixAll ? { all: opt.fixAll } : null).length;
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
    if (escEdita()) Object.keys(loc).forEach(k => { if (!S.escPar[k]) escParEnviar(k, loc[k]); });
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
    modo: 'auto', atual, alvo: atual === '12x36' ? '12x36' : '5x2', domN: 3, abre: [1, 1, 1, 1, 1, 1, 1], folgas: 'espacadas', cct: false, reserva: 9, aprendiz: false, parcial: .5, base: 'padrao', fora: [],
    h: { sem: { a: '07:00', f: '22:00' }, sab: { a: '07:00', f: '22:00' }, dom: { a: '07:00', f: '13:00' } },
    p: { sem: 2, sab: 3, dom: 2 },
    p24: 1, p12: 0, h12: 12
  };
}
function escPar(l, setor) {
  const d = escParDef(l, setor), s = escParTodos()[escParKey(l.key, setor)] || {};
  return Object.assign(d, s, { h: Object.assign({}, d.h, s.h || {}), p: Object.assign({}, d.p, s.p || {}) });
}
// regras de folga por função e por pessoa (valem na loja inteira, em qualquer visão)
const escRegKey = l => escParKey(l.key, '__REGRAS__');
function escRegras(l) { const r = escParTodos()[escRegKey(l)] || {}; return { fun: Object.assign({}, r.fun || {}), pes: Object.assign({}, r.pes || {}) }; }
function escRegrasSalvar(l, R) { const lim = o => Object.keys(o).reduce((a, k) => { const v = o[k] || {}; if (v.sab === 0 || v.dom === 0 || (v.fixa && v.fixa.length)) a[k] = v; return a; }, {}); return escParEnviar(escRegKey(l), { fun: lim(R.fun), pes: R.pes }); }
function escRegraDe(R, r) {
  const a = R.fun[norm((r && r.funcao) || '')] || {}, b = R.pes[norm((r && r.nome) || '')] || {}, pega = k => b[k] != null ? b[k] : a[k] != null ? a[k] : 1;
  return { sab: pega('sab'), dom: pega('dom'), fixa: (b.fixa && b.fixa.length ? b.fixa : a.fixa) || [], propria: !!R.pes[norm((r && r.nome) || '')], daFuncao: !!R.fun[norm((r && r.funcao) || '')] };
}
const escFechados = par => new Set([0, 1, 2, 3, 4, 5, 6].filter(d => par.abre && par.abre[d] === 0));
function escFixDe(res, R, r) { const s = new Set(res.fechado || []); if (r && R) { const g = escRegraDe(R, r); if (!g.sab) s.add(5); if (!g.dom) s.add(6); g.fixa.forEach(d => s.add(+d)); } return s; }
const escRegraTxt = g => [!g.sab ? 'não trabalha sábado' : '', !g.dom ? 'não trabalha domingo' : '', g.fixa.length ? 'folga fixa ' + g.fixa.map(d => ESC_DIAS[d]).join('/') : ''].filter(Boolean).join(' · ');

/* ---------------- dados do setor ---------------- */
function escPessoas(l, sec, par) {
  const fora = new Set((par.fora || []).map(norm));
  const rows = sec.linhas.filter(r => !fora.has(norm(r.funcao)));
  const conta = r => !(r.estagio || (r.aprendiz && !par.aprendiz));
  const peso = r => (+r.qt || 0) * (/PARCIAL/.test(norm(r.contrato)) ? (+par.parcial || 0) : 1);
  const ocup = rows.filter(r => r.nome && conta(r));
  const padraoRows = rows.filter(r => !r.nome ? !/APRENDIZ|ESTAGIO/.test(norm(r.contrato)) || par.aprendiz : conta(r));
  // funções de apoio: entram na escala e cobrem folgas, mas não aumentam a quantidade de pessoas que o setor precisa
  const apoio = new Set((par.apoio || []).map(norm)), dem = r => !apoio.has(norm(r.funcao));
  const pessoas = ocup.filter(r => (+r.qt || 0) >= .5).sort((a, b) => String(a.funcao).localeCompare(b.funcao) || String(a.nome).localeCompare(b.nome));
  return {
    rows, funcoes: uniq(sec.linhas.map(r => r.funcao)).sort(),
    padrao: Math.round(sum(padraoRows, peso) * 100) / 100,
    padraoDem: Math.round(sum(padraoRows.filter(dem), peso) * 100) / 100,
    ocupadoDem: Math.round(sum(ocup.filter(dem), peso) * 100) / 100,
    apoio: Math.round(sum(ocup.filter(r => !dem(r)), peso) * 100) / 100,
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
  const B = par.base === 'ocupado' ? dad.ocupadoDem : dad.padraoDem;
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
  res.fechado = esc === '5x2' ? escFechados(par) : new Set(); res.folgas = par.folgas || 'espacadas';
  res.grupos.forEach(g => {
    if (res.fechado.size) g.dem = g.dem.map((x, d) => res.fechado.has(d) ? 0 : x);
    if (esc === '6x1') { const tot = sum(g.dem); g.P = tot ? Math.max(Math.ceil(tot / 6 - 1e-9), N > 1 ? Math.ceil(g.dem[6] * N / (N - 1) - 1e-9) : 0, Math.max(...g.dem)) : 0; g.semente = 0; }
    else { const m = escMinimo5x2(g.dem, N, { fixAll: res.fechado, folgas: res.folgas }); g.P = m.P || 0; g.semente = m.semente || 0; g.aprox = m.aprox; }
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
function escGrade(res, par, ano, mes, vis, R) {
  const { dias, ini, fim } = escDiasMes(ano, mes);
  const noMes = d => d >= ini && d <= fim;
  const pess = res.dad.pessoas.slice();
  const linhas = []; // {nome, funcao, turno, cells[], tipo}
  let conf = [], dem = null, cov = null, excedentes = [];
  const pegar = () => { const r = pess.shift(); return r ? { nome: r.nome, funcao: r.funcao, rg: R ? escRegraTxt(escRegraDe(R, r)) : '' } : null; };
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
    // regras de cada pessoa (setor fechado, não trabalha sábado/domingo, folga fixa) entram na montagem
    const quem = pess.slice(0, P), fx = Array.from({ length: P }, (_, i) => escFixDe(res, R, quem[i]));
    let grid = [], ce = [], mel = null;
    if (P) [...new Set([vis === 'atual' ? 0 : g.semente, 0, 1, 2, 3, 4, 5])].forEach(sm => {
      const gg = escGerar5x2(P, g.dem, W, res.N, sm, { fix: fx, folgas: res.folgas }), cc = escConferir(gg, res.N, fx), cv = escCobertura(gg, W * 7);
      const nota = cc.length * 1000 + sum(cv.map((x, d) => Math.max(0, g.dem[d % 7] - x)));
      if (mel == null || nota < mel) { mel = nota; grid = gg; ce = cc; }
    });
    conf = conf.concat(ce.map(x => Object.assign(x, { g: gi })));
    const off = linhas.length;
    grid.forEach((row, i) => {
      const r = pegar();
      linhas.push({ nome: r ? r.nome : 'A CONTRATAR ' + (++nContr), funcao: r ? r.funcao : '', rg: r ? r.rg : '', real: !!r, turno: g.cod === 'T' ? '' : 'Turno ' + g.cod + (g.ini ? ' · ' + g.ini + '–' + g.fim : ''), cells: row.map(t => t ? g.cod : 'F'), tipo: r ? '' : 'nova' });
    });
    conf.forEach(x => { if (x.g === gi && x.l == null) x.l = off + x.i; });
    dias.forEach((d, i) => { dem[i] += g.dem[i % 7]; cov[i] += grid.filter(rw => rw[i]).length; });
  });
  excedentes = pess;
  const leg = []; res.grupos.forEach(g => leg.push([g.cod, g.cod === 'T' ? 'Trabalha' : 'Turno ' + g.cod + (g.ini ? ' (' + g.ini + '–' + g.fim + ', ' + escDur(res.jornada) + ' + 1h intervalo)' : '')]));
  leg.push(['F', 'Folga']);
  return { dias, ini, fim, noMes, linhas, conf, dem, cov, excedentes, legenda: leg, vis };
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
  #pFun .chip.apoio{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent);border-style:dashed}
  .esc-tbl td.nm.pick{cursor:pointer} .esc-tbl td.nm.pick:hover b{color:var(--accent);text-decoration:underline}
  .esc-tbl td.nm small.rg{color:var(--accent);font-weight:700}
  .esc-tbl tr.cov td.abaixo{color:var(--warn);font-weight:800}
  .esc-fun{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
  .esc-fun>div{display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)}
  .esc-fun b{font-size:12.5px}.esc-fun label{display:flex;gap:7px;align-items:center;font-size:12.5px;cursor:pointer}.esc-fun input{width:auto}
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
  if (!f.vis2) { f.vis = 'atual'; f.vis2 = 1; } // padrão: montar a escala com o quadro que existe
  if (!f.vis) f.vis = 'atual';
  const sec0 = f.setor ? l.setores.find(s => s.nome === f.setor) : null;
  const funs = uniq((sec0 ? [sec0] : l.setores).flatMap(s => s.linhas.map(r => r.funcao)).filter(Boolean)).sort((a, b) => String(a).localeCompare(String(b)));
  if (f.fun && !funs.includes(f.fun)) f.fun = '';
  // filtro por função (ex.: só operador de caixa): junta as linhas dessa função do setor escolhido ou da loja inteira
  const sec = f.fun ? { nome: (sec0 ? sec0.nome : 'Loja') + ' · ' + f.fun, linhas: (sec0 ? [sec0] : l.setores).flatMap(s => s.linhas).filter(r => r.funcao === f.fun), virtual: true } : sec0;
  const v = $('#view');
  v.innerHTML = `
  <div class="toolbar" style="margin-top:0">
    <select class="input" id="eLoja">${lojas.map(x => `<option value="${x.key}" ${x.key === l.key ? 'selected' : ''}>${h(isAdmLoja(x) ? 'Administrativo' : x.nome)}</option>`).join('')}</select>
    <select class="input" id="eSetor" style="min-width:220px"><option value="">Visão da loja (todos os setores)</option>${l.setores.map(s => `<option ${s.nome === f.setor ? 'selected' : ''}>${h(s.nome)}</option>`).join('')}</select>
    <select class="input" id="eFun" style="min-width:190px" title="Montar a escala só de uma função"><option value="">Todas as funções</option>${funs.map(x => `<option ${x === f.fun ? 'selected' : ''}>${h(x)}</option>`).join('')}</select>
    <div class="seg" id="eEt">${Object.keys(ESC_ETAPAS).map(k => `<button data-v="${k}" class="${f.et === k ? 'on' : ''}">${h(ESC_ETAPAS[k].curto)}</button>`).join('')}</div>
    <span class="spacer"></span>
    ${escAdm() ? `<button class="btn" id="eAcc" title="Quem pode ver e ajustar o simulador">${ic('key')} Acessos</button>` : ''}
    ${sec ? '' : `<button class="btn" id="eExpL">${ic('download')} Exportar</button>`}
  </div>
  <div id="eBody"></div>`;
  if ($('#eAcc')) $('#eAcc').onclick = () => openEscAcesso();
  $('#eLoja').onchange = e => { f.loja = e.target.value; f.setor = ''; f.fun = ''; f.pes = ''; saveF(); route(); };
  $('#eSetor').onchange = e => { f.setor = e.target.value; f.pes = ''; saveF(); route(); };
  $('#eFun').onchange = e => { f.fun = e.target.value; f.pes = ''; saveF(); route(); };
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
  const set = (k, val) => { if (!escEdita()) return; par[k] = val; escParEnviar(escParKey(l.key, sec.nome), par); route(true); };
  const saldo = Math.round((dad.ocupado - res.total) * 100) / 100, saldoPad = Math.round((dad.padrao - res.total) * 100) / 100;
  const futuro = Math.round((dad.ocupado - dad.aviso - res.total) * 100) / 100;
  // comparativo por etapa
  const etapas = Object.keys(ESC_ETAPAS).map(k => ({ k, r: k === f.et ? res : escCalc(l, sec, par, k) }));
  let alt = null;
  if (par.alvo === '12x36' && f.et !== 'hoje') alt = escCalc(l, sec, Object.assign({}, par, { alvo: '5x2', atual: '12x36', modo: par.modo === 'manual' ? 'auto' : par.modo }), f.et);
  const [ano, mes] = f.mes.split('-').map(Number);
  const R = escRegras(l);
  const gr = escGrade(res, par, ano, mes - 1, f.vis, R);
  if (gr && f.pes && !gr.linhas.some(x => x.nome === f.pes)) f.pes = '';
  const grV = gr && f.pes ? Object.assign({}, gr, { linhas: gr.linhas.filter(x => x.nome === f.pes) }) : gr; // escala de uma pessoa só
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
  // "com o quadro atual": monta a escala com quem existe, sem tratar como falta de gente
  const montar = f.vis === 'atual' && gr && res.alvo !== '12x36';
  const nReal = gr ? gr.linhas.filter(x => x.real).length : 0, diasAbaixo = gr ? gr.dias.filter((d, i) => gr.noMes(d) && gr.cov[i] < gr.dem[i]).length : 0;
  const vtF = montar ? `Escala montada com as ${nReal} pessoa(s) do quadro atual` : vt, vcF = montar ? 'c-green' : vc, viF = montar ? 'check' : vi;
  const vtxtF = montar ? `Folgas distribuídas para equilibrar a equipe que existe hoje: 2 folgas por semana ${res.folgas === 'juntas' ? 'juntas' : 'espaçadas'}, nunca mais de 2 folgas emendadas, no máximo 6 dias seguidos de trabalho e ${h(domFolga)}${res.fechado && res.fechado.size ? `; setor fechado ${[...res.fechado].sort().map(d => ESC_DIAS[d]).join('/')}` : ''}. ${diasAbaixo ? `Em ${diasAbaixo} dia(s) do mês a equipe fica abaixo do ideal calculado (linha “Trabalhando / ideal”); para ver quantas pessoas seriam necessárias, use “Simular necessário”.` : 'Todos os dias ficam dentro do ideal calculado.'}` : vtxt;
  const tipoTxt = { auto: 'Automático pelo quadro', manual: 'Horários e postos informados' };
  const hr = (k, lbl) => `<div class="esc-hr" style="margin-bottom:6px"><span style="grid-column:1/-1">${lbl}</span><small class="faint">Abre</small><small class="faint">Fecha</small><small class="faint">Postos</small><input class="input" type="time" data-h="${k}.a" value="${h(par.h[k].a)}"><input class="input" type="time" data-h="${k}.f" value="${h(par.h[k].f)}"><input class="input" type="number" min="0" data-p="${k}" value="${h(par.p[k])}" title="Pessoas trabalhando ao mesmo tempo (postos)"></div>`;
  body.innerHTML = `
  <details class="card esc-par" id="ePar" ${f.parOpen ? 'open' : ''}>
    <summary>${ic('settings')} Parâmetros do setor <span class="badge b-acc" style="margin-left:6px">${h(tipoTxt[par.modo])}</span><span class="badge">${h(par.atual)} → ${h(par.alvo)}</span><span class="chev">${ic('chevron')}</span></summary>
    <fieldset ${escEdita() ? '' : 'disabled'} style="border:0;padding:0;margin:0;min-width:0">
    ${escEdita() ? '' : `<div class="badge b-info" style="margin-top:12px">${ic('eye')} Só visualização: os parâmetros são definidos por quem tem acesso para ajustar</div>`}
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
    ${par.alvo === '5x2' ? `<div class="esc-grid">
      <div class="field" style="grid-column:span 2"><label>Dias em que o setor funciona</label><div class="chips" id="pAbre">${ESC_DIAS.map((d, i) => `<span class="chip ${par.abre && par.abre[i] === 0 ? '' : 'on'}" data-d="${i}">${d}</span>`).join('')}</div></div>
      <div class="field"><label>Folgas na semana</label><select class="input" id="pFolg"><option value="espacadas" ${par.folgas !== 'juntas' ? 'selected' : ''}>Espaçadas (recomendado)</option><option value="juntas" ${par.folgas === 'juntas' ? 'selected' : ''}>Juntas (2 dias seguidos)</option></select></div>
    </div>
    <div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">Regras por função</div>
      <div class="faint" style="font-size:11.5px;margin-bottom:8px">Ex.: logística de segunda a sábado, sem domingo. Valem para a loja inteira; para uma pessoa só, toque no nome dela na escala.</div>
      <div class="esc-fun">${dad.funcoes.filter(Boolean).map(fn => { const g = R.fun[norm(fn)] || {}; return `<div><b>${h(fn)}</b><label><input type="checkbox" data-rf="${h(fn)}" data-k="sab" ${g.sab === 0 ? '' : 'checked'}> Trabalha sábado</label><label><input type="checkbox" data-rf="${h(fn)}" data-k="dom" ${g.dom === 0 ? '' : 'checked'}> Trabalha domingo</label></div>`; }).join('')}</div>
      ${Object.keys(R.pes).length ? `<div style="font-weight:700;font-size:12.5px;margin:12px 0 6px">Regras individuais</div><div class="chips">${Object.keys(R.pes).filter(k => dad.rows.some(r => norm(r.nome || '') === k)).map(k => { const r = dad.rows.find(x => norm(x.nome || '') === k); return `<span class="chip on" data-rp="${h(r.nome)}" data-rpf="${h(r.funcao)}" title="Editar">${h(String(r.nome).split(' ').slice(0, 2).join(' '))} · ${h(escRegraTxt(escRegraDe({ fun: {}, pes: R.pes }, r)))}</span>`; }).join('') || '<span class="faint" style="font-size:12px">Nenhuma neste setor</span>'}</div>` : ''}
    </div>` : ''}
    ${par.modo === 'manual' && par.alvo === '5x2' ? `<div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Funcionamento do setor e pessoas ao mesmo tempo</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">${hr('sem', 'Segunda a sexta')}${hr('sab', 'Sábado')}${hr('dom', 'Domingo')}</div>
      <div class="faint" style="font-size:11.5px">Postos = pessoas que precisam estar trabalhando ao mesmo tempo. Cada turno cobre ${escDur(res.jornada || 8)} + 1h de intervalo; o sistema calcula quantos turnos o horário pede.</div></div>` : ''}
    ${par.alvo === '12x36' || (par.atual === '12x36' && par.modo === 'manual') ? `<div class="esc-grid">
      <div class="field"><label>Postos 24h (diurno + noturno)</label><input class="input" type="number" min="0" id="p24" value="${h(res.p24 != null ? res.p24 : par.p24)}" ${par.modo === 'auto' ? 'disabled title="No automático vem do quadro; mude para Manual para editar"' : ''}></div>
      <div class="field"><label>Postos 12h (só diurno)</label><input class="input" type="number" min="0" id="p12" value="${h(res.p12 != null ? res.p12 : par.p12)}" ${par.modo === 'auto' ? 'disabled' : ''}></div>
      <div class="field"><label>Horas por plantão</label><select class="input" id="pH12"><option value="12" ${+par.h12 === 12 ? 'selected' : ''}>12h (intervalo indenizado)</option><option value="11" ${+par.h12 === 11 ? 'selected' : ''}>11h (1h de intervalo)</option></select></div>
    </div>` : ''}
    <div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Funções consideradas</div>
      <div class="chips" id="pFun">${dad.funcoes.map(fn => { const st = (par.fora || []).map(norm).includes(norm(fn)) ? 'fora' : (par.apoio || []).map(norm).includes(norm(fn)) ? 'apoio' : 'on'; return `<span class="chip ${st === 'fora' ? '' : 'on'} ${st === 'apoio' ? 'apoio' : ''}" data-fn="${h(fn)}" title="${st === 'on' ? 'Conta na demanda' : st === 'apoio' ? 'Apoio: entra na escala e cobre folgas, sem aumentar a demanda' : 'Fora da escala'}">${h(fn)}${st === 'apoio' ? ' · apoio' : ''}</span>`; }).join('')}</div>
      <div class="faint" style="font-size:11.5px;margin-top:6px">Toque para alternar: <b>conta na demanda</b> → <b>apoio</b> (ex.: assistente que também vende: entra na escala e cobre folgas, mas não aumenta a quantidade necessária) → <b>fora da escala</b>.</div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      ${escEdita() ? `<button class="btn" id="pReset">${ic('eraser')} Restaurar padrão</button>` : ''}
      <span class="faint" style="font-size:11.5px;align-self:center">${ic('check')} Salvo automaticamente para todos${par._por ? ` · última alteração: ${h(par._por)}${par._em && par._em !== 'agora' ? ' em ' + h(par._em) : ''}` : ''}</span>
    </div>
    </fieldset>
  </details>

  <div class="grid g4" style="margin-top:16px">
    ${kpi({ lbl: 'Quadro padrão hoje', val: fmt(dad.padrao), sub: `${dad.vagas} vaga(s) em aberto`, icon: 'grid', c: 'c-slate' })}
    ${kpi({ lbl: 'Ocupado hoje', val: fmt(dad.ocupado), sub: dad.apoio ? `${fmt(dad.apoio)} de apoio (não aumenta a demanda)` : dad.aviso ? `${dad.aviso} em aviso prévio` : 'sem aprendizes e estagiários', icon: 'users', c: 'c-cyan' })}
    ${kpi({ lbl: 'Necessário · ' + res.et.curto, val: `${res.total}`, title: `Equivale a ${fmt(res.frac || 0, 1)} pessoa(s) em tempo integral; a diferença para o número inteiro pode ser coberta por folguista de outro setor.`, sub: res.reserva ? `${res.P} na grade + ${res.reserva} reserva` : res.alvo === '12x36' ? `${res.d12.base} plantonistas + ${res.d12.folg} folguista(s)` : `${res.grupos.length > 1 ? res.grupos.map(g => g.cod + ': ' + g.P).join(' · ') : 'pessoas na grade'}`, icon: 'calendar', c: 'c-violet' })}
    ${montar ? kpi({ lbl: 'Na escala do mês', val: String(nReal), sub: diasAbaixo ? `${diasAbaixo} dia(s) abaixo do ideal` : 'equipe atual cobre o ideal', icon: 'calendar', c: diasAbaixo ? 'c-amber' : 'c-green' }) : kpi({ lbl: 'Saldo do quadro atual', val: (saldo >= 0 ? '+' : '') + fmt(saldo), sub: saldo >= 0 ? 'cobre a escala' : 'precisa contratar', icon: saldo >= 0 ? 'check' : 'alert', c: saldo >= 0 ? 'c-green' : 'c-red' })}
  </div>

  <div class="card" style="margin-top:16px"><div class="esc-ver ${vcF}"><div class="ico">${ic(viF)}</div><div><h3>${h(vtF)}</h3><p>${vtxtF}</p>${res.notas.length ? `<ul class="esc-rules" style="margin-top:8px">${res.notas.map(n => `<li>${h(n)}</li>`).join('')}</ul>` : ''}</div></div></div>

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
        <div class="seg" id="eVis"><button data-v="atual" class="${f.vis === 'atual' ? 'on' : ''}" title="Monta a escala só com quem já está no quadro">Com o quadro atual</button><button data-v="nec" class="${f.vis === 'nec' ? 'on' : ''}" title="Mostra quantas pessoas a escala ideal pede">Simular necessário</button></div>
        ${gr ? `<select class="input" id="ePes" style="width:auto;max-width:230px;padding:7px 10px" title="Escala de uma pessoa só"><option value="">Toda a equipe</option>${gr.linhas.filter(x => x.real).map(x => `<option ${x.nome === f.pes ? 'selected' : ''}>${h(x.nome)}</option>`).join('')}</select>` : ''}
        ${gr ? `<button class="btn" id="eXls" title="Excel">${ic('download')}</button><button class="btn" id="ePdf" title="PDF para o quadro de avisos">${ic('file')} PDF</button>` : ''}
      </div></div>
    <div id="eGrade">${gr ? escGradeHTML(grV) : `<div class="empty">${ic('calendar')}<div>A grade de folgas é montada para a escala nova.</div></div>`}</div>
    ${gr ? `<div class="esc-leg">${gr.legenda.map(([c, t]) => `<span><i style="${escCorLeg(c)}">${h(c)}</i>${h(t)}</span>`).join('')}</div>` : ''}
    ${gr ? escConfHTML(gr, res, f) : ''}
    ${gr && escEdita() && res.alvo !== '12x36' ? `<div class="faint" style="font-size:11.5px;margin-top:8px">${ic('settings')} Toque no nome de uma pessoa para definir se ela trabalha sábado/domingo ou tem folga fixa.</div>` : ''}
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
  if (escEdita()) $$('#pModo button').forEach(b => b.onclick = () => set('modo', b.dataset.v));
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
  if (escEdita()) $$('#pFun .chip').forEach(c => c.onclick = () => {
    const fn = norm(c.dataset.fn), fo = (par.fora || []).filter(x => norm(x) !== fn), ap = (par.apoio || []).filter(x => norm(x) !== fn);
    const era = (par.fora || []).some(x => norm(x) === fn) ? 'fora' : (par.apoio || []).some(x => norm(x) === fn) ? 'apoio' : 'on';
    if (era === 'on') ap.push(c.dataset.fn); else if (era === 'apoio') fo.push(c.dataset.fn);
    par.fora = fo; set('apoio', ap);
  });
  if ($('#pReset')) $('#pReset').onclick = async () => { if (!await confirmBox('Voltar os parâmetros deste setor para o padrão?', 'Restaurar')) return; escParEnviar(escParKey(l.key, sec.nome), null); route(true); };
  $('#eMes').onchange = e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { f.mes = e.target.value; saveF(); route(true); } };
  $$('#eVis button').forEach(b => b.onclick = () => { f.vis = b.dataset.v; saveF(); route(true); });
  if ($('#ePes')) $('#ePes').onchange = e => { f.pes = e.target.value; saveF(); route(true); };
  if (escEdita()) {
    $$('#pAbre .chip').forEach(c => c.onclick = () => { const a = (par.abre || [1, 1, 1, 1, 1, 1, 1]).slice(), d = +c.dataset.d; a[d] = a[d] === 0 ? 1 : 0; if (a.filter(x => x !== 0).length < 1) return toast('O setor precisa funcionar ao menos 1 dia', true); set('abre', a); });
    if ($('#pFolg')) $('#pFolg').onchange = e => set('folgas', e.target.value);
    $$('[data-rf]', body).forEach(c => c.onchange = () => { const k = norm(c.dataset.rf), g = Object.assign({}, R.fun[k] || {}); g[c.dataset.k] = c.checked ? 1 : 0; R.fun[k] = g; escRegrasSalvar(l, R); route(true); });
    $$('[data-rp]', body).forEach(c => c.onclick = () => openEscRegraPes(l, { nome: c.dataset.rp, funcao: c.dataset.rpf }));
    $$('#eGrade [data-pn]').forEach(c => c.onclick = () => openEscRegraPes(l, { nome: c.dataset.pn, funcao: c.dataset.pf }));
  }
  if (gr) {
    const nomeArq = 'escala_' + l.key + '_' + norm(sec.nome).replace(/[^A-Z0-9]+/g, '_') + '_' + f.mes;
    const diasM = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
    $('#eXls').onclick = () => downloadCSV(nomeArq + (f.pes ? '_' + norm(f.pes).replace(/[^A-Z0-9]+/g, '_') : ''), ['Colaborador', 'Função', 'Turno', ...diasM.map(([d]) => d.getDate() + ' ' + ESC_DIAS[(d.getDay() + 6) % 7])], grV.linhas.map(x => [x.nome, x.funcao, x.turno, ...diasM.map(([, i]) => x.cells[i])]));
    $('#ePdf').onclick = () => escPDF(grV, res, l, sec, ano, mes - 1);
  }
}
function openEscRegraPes(l, r) {
  const R = escRegras(l), k = norm(r.nome || ''), g = Object.assign({}, R.pes[k] || {}), fun = R.fun[norm(r.funcao || '')] || {};
  const herda = escRegraTxt(escRegraDe({ fun: R.fun, pes: {} }, r));
  const fixa = new Set(g.fixa || []);
  modal({
    title: 'Regras de folga · ' + h(String(r.nome).split(' ').slice(0, 3).join(' ')), icon: 'calendar',
    body: `<div class="faint" style="font-size:12.5px;margin-bottom:12px">${h(r.funcao || '')}${herda ? ` · pela função: ${h(herda)}` : ''}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="rgSab" style="width:auto" ${(g.sab != null ? g.sab : fun.sab) === 0 ? '' : 'checked'}> Trabalha sábado</label>
        <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="rgDom" style="width:auto" ${(g.dom != null ? g.dom : fun.dom) === 0 ? '' : 'checked'}> Trabalha domingo</label>
        <div><div style="font-weight:700;font-size:13px;margin-bottom:6px">Folga fixa (opcional)</div><div class="chips" id="rgFix">${ESC_DIAS.slice(0, 6).map((d, i) => `<span class="chip ${fixa.has(i) ? 'on' : ''}" data-d="${i}">${d}</span>`).join('')}</div>
        <div class="faint" style="font-size:11.5px;margin-top:6px">A pessoa folga sempre nesse dia; o sistema completa as 2 folgas da semana e confere as regras.</div></div>
      </div>`,
    foot: `${R.pes[k] ? `<button class="btn ghost" id="rgDel" style="margin-right:auto">${ic('eraser')} Seguir a regra da função</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rgOk">${ic('check')} Salvar</button>`,
    onMount: m => {
      $$('#rgFix .chip', m.el).forEach(c => c.onclick = () => { const d = +c.dataset.d; if (fixa.has(d)) fixa.delete(d); else { if (fixa.size >= 2) return toast('No máximo 2 folgas fixas por semana', true); fixa.add(d); } c.classList.toggle('on', fixa.has(d)); });
      $('#rgOk', m.el).onclick = () => {
        const sab = $('#rgSab', m.el).checked ? 1 : 0, dom = $('#rgDom', m.el).checked ? 1 : 0;
        if ((!sab ? 1 : 0) + (!dom ? 1 : 0) + fixa.size > 2) return toast('Com essas escolhas a pessoa teria mais de 2 folgas por semana', true);
        R.pes[k] = { sab, dom, fixa: [...fixa].sort() }; escRegrasSalvar(l, R); m.close(); route(true); toast('Regra salva');
      };
      if ($('#rgDel', m.el)) $('#rgDel', m.el).onclick = () => { delete R.pes[k]; escRegrasSalvar(l, R); m.close(); route(true); toast('Regra individual removida'); };
    }
  });
}
function escCorLeg(c) { return c === 'F' ? 'background:#FCE4D6;color:#C00000' : c === 'FE' ? 'background:#FFE0B2;color:#9a3412' : 'background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok)'; }
function escGradeHTML(gr) {
  const idx = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
  const head = `<tr><th class="nm">Colaborador</th>${idx.map(([d]) => `<th class="${d.getDay() === 0 ? 'dom' : ''}">${ESC_DIAS[(d.getDay() + 6) % 7].slice(0, 3)}<br>${d.getDate()}</th>`).join('')}</tr>`;
  let ultimoTurno = null;
  const rows = gr.linhas.map(x => {
    const sep = ultimoTurno !== null && x.turno !== ultimoTurno ? `<tr class="sep"><td class="nm"></td>${idx.map(() => '<td></td>').join('')}</tr>` : '';
    ultimoTurno = x.turno;
    return sep + `<tr class="${x.tipo}"><td class="nm ${x.real && escEdita() ? 'pick' : ''}" ${x.real ? `data-pn="${h(x.nome)}" data-pf="${h(x.funcao)}"` : ''}><b title="${h(x.nome)}">${h(x.nome)}</b><small>${h([x.funcao, x.turno].filter(Boolean).join(' · '))}</small>${x.rg ? `<small class="rg">${h(x.rg)}</small>` : ''}</td>${idx.map(([d, i]) => { const c = x.cells[i]; const k = c === 'F' ? 'cF' : c === 'FE' ? 'cFE' : 'cW'; return `<td class="c ${k} ${d.getDay() === 0 ? 'dom' : ''}">${h(c)}</td>`; }).join('')}</tr>`;
  }).join('');
  const cov = `<tr class="cov"><td class="nm"><b>Trabalhando / ${gr.vis === 'atual' ? 'ideal' : 'necessário'}</b></td>${idx.map(([, i]) => `<td class="${gr.cov[i] < gr.dem[i] ? (gr.vis === 'atual' ? 'abaixo' : 'falta') : ''}" title="${gr.cov[i]} de ${gr.dem[i]}">${gr.cov[i]}<span class="faint">/${gr.dem[i]}</span></td>`).join('')}</tr>`;
  return `<div class="tbl-wrap" style="max-height:70vh"><table class="esc-tbl"><thead>${head}</thead><tbody>${rows}${cov}</tbody></table></div>`;
}
function escConfHTML(gr, res, f) {
  const idx = gr.dias.map((d, i) => [d, i]).filter(([d]) => gr.noMes(d));
  const falta = idx.filter(([, i]) => gr.cov[i] < gr.dem[i]);
  const desc = gr.linhas.filter(x => x.tipo === 'desc').length;
  const novos = gr.linhas.filter(x => x.tipo === 'nova').length;
  const it = [];
  if (res.alvo !== '12x36') it.push(gr.conf.length ? `<span class="badge b-bad">${gr.conf.length} alerta(s) legal(is)</span> ${h(uniq(gr.conf.map(x => (gr.linhas[x.l] || {}).nome + ': ' + x.t)).slice(0, 4).join(' · '))}` : `<span class="badge b-ok">${ic('check')} Conferida</span> 2 folgas por semana, no máximo 6 dias seguidos, nunca mais de 2 folgas emendadas e folga dominical dentro da regra para todos.`);
  if (falta.length && f.vis === 'atual' && res.alvo !== '12x36') it.push(`<span class="badge b-warn">${falta.length} dia(s) abaixo do ideal</span> A escala roda com a equipe atual; nesses dias trabalha menos gente que o ideal calculado.`);
  else if (falta.length) it.push(`<span class="badge b-bad">${falta.length} dia(s) descoberto(s)</span> ${f.vis === 'atual' ? 'Com só quem já está no setor faltam pessoas nesses dias.' : 'Revise os postos ou aumente a equipe.'}`);
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
  const nAt = $('#sbNav .nav.active'), gAt = nAt && nAt.closest('.sb-grp.fech'); if (gAt) { gAt.classList.remove('fech'); gAt.previousElementSibling.classList.remove('fech'); }
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
    else if (page === 'pesquisa' && podePesq()) pgPesq();
    else if (page === 'tabela' && podePesq()) pgTabela();
    else if (page === 'fichas' && podeFichas()) pgFichas();
    else if (page === 'testes' && podeTestes()) pgTestes();
    else if (page === 'agenda' && podeAgenda()) pgAgenda();
    else if (page === 'aprovacoes' && isAdmin()) pgAprov();
    else if (page === 'solicitacoes') pgSolic();
    else pgDash();
    window.scrollTo(0, keep ? sy : 0);
    if (!keep) animaView_(v);
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
    if (l.st.aprendiz < l.st.cotaAprendiz) alerts.push({ c: 'c-violet', i: 'grad', t: `${l.nome}: aprendizes abaixo da meta`, s: `${l.st.aprendiz} de ${l.st.cotaAprendiz} (5% de ${l.st.baseAprendiz} colaboradores, sem gerentes, diretoria, aprendizes e estagiários)`, href: '#/loja/' + l.key });
    if (l.st.pcd < l.st.cotaPcd) alerts.push({ c: 'c-pink', i: 'accessibility', t: `${l.nome}: PCD abaixo da meta`, s: `${l.st.pcd} de ${l.st.cotaPcd} (${Math.round(S.pcdPct * 100)}% de ${l.st.empregados} empregados · faixa da empresa: ${S.tot.empregados} empregados)`, href: '#/loja/' + l.key });
  });
  // conferência do quadro: diferenças que fazem Ideal − Atual não bater com as vagas
  if (isAdmin()) L.forEach(l => {
    const dif = l.setores.filter(sx => sx.padrao && Math.abs(sx.padrao - sum(sx.linhas, r => r.qt)) > .001);
    if (dif.length) alerts.push({ c: 'c-amber', i: 'alert', t: `${l.nome}: padrão do setor diferente das posições`, s: dif.map(sx => `${sx.nome} (padrão ${fmt(sx.padrao)} × ${fmt(sum(sx.linhas, r => r.qt))} posições)`).join(' · '), href: '#/loja/' + l.key });
    const vz = l.rows.filter(r => !r.nome && !r.isVaga);
    if (vz.length) alerts.push({ c: 'c-amber', i: 'alert', t: `${l.nome}: ${vz.length} posição(ões) vazia(s) sem vaga aberta`, s: vz.map(r => `${r.setor} · ${r.funcao}`).join(' · '), href: '#/loja/' + l.key });
  });
  const velhas = S.all.filter(r => r.vagaAberta && r.dias != null && r.dias > 30);
  if (velhas.length) alerts.push({ c: 'c-red', i: 'briefcase', t: `${velhas.length} vaga(s) abertas há mais de 30 dias`, s: 'Revise o andamento da seleção', href: '#/vagas' });
  if (isAdmin() && S.notif.pendentes) alerts.unshift({ c: 'c-amber', i: 'check', t: `${S.notif.pendentes} solicitação(ões) aguardando sua aprovação`, s: 'Requisições de vaga e alterações de recrutadores', href: '#/aprovacoes' });
  if (contrPend.length) alerts.push({ c: 'c-blue', i: 'userplus', t: `${contrPend.length} contratação(ões) aguardando alocação`, s: 'Vincule ao quadro da loja', href: '#/contratacoes' });

  const nova = L.find(l => l.nova);
  const v = $('#view');
  v.innerHTML = `
  <div class="hero hero-dash" style="--lc:#ff5a14;--foto:url('${GRC_FOTO_}sobre-equipe.jpg')">
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
    ${kpi({ lbl: 'PCD', val: `${T.pcd} <small>/ meta ${T.cotaPcd}</small>`, bar: pct(T.pcd, T.cotaPcd), sub: (T.pcd >= T.cotaPcd ? `${ic('check')} Meta atingida` : `Faltam ${T.cotaPcd - T.pcd} para a meta`) + ` · faixa ${Math.round(S.pcdPct * 100)}% (${T.empregados} empregados)`, icon: 'accessibility', c: 'c-pink' })}
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
      ${lojaLogoTile_(l)}
      <div style="flex:1"></div>
      <div class="ring" style="--p:${Math.min(100, s.ocup)};--c:${l.color}" data-v="${s.ocup}%" title="Ocupação"></div>
    </div>
    <div class="st-nome"><b>${h(l.nome)}</b> ${l.nova ? '<span class="badge b-ok">NOVA</span>' : ''}<div class="muted">${h(l.sub)}</div></div>
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
  <div class="hero ${lojaFoto_(l) ? 'hero-loja' : ''}" style="--lc:${l.color};${lojaFoto_(l) ? `--foto:url('${lojaFoto_(l)}')` : ''}">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;position:relative;z-index:1">
      ${lojaLogoTile_(l, true)}
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
      const podeMover = ed && !selOn && !filtered && !DEMO_RO_();
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
            <div class="prow ${r.vagaAberta ? 'vaga' : ''} ${S.hl === r.row ? 'hl' : ''} ${selOn && SEL.set.has(selKey(r)) ? 'sel' : ''} ${podeMover ? 'mov' : ''}" data-row="${r.row}">
              ${podeMover ? `<span class="drag" data-drag title="Arraste para subir ou descer">${ic('grip')}</span>` : ''}
              ${selOn ? `<input type="checkbox" class="pchk" ${SEL.set.has(selKey(r)) ? 'checked' : ''}>` : ''}
              ${r.nome ? avatar(r.nome, '', 'sm soft') : `<div class="avatar sm vaga-av">${ic('briefcase')}</div>`}
              <div class="info"><b>${h(r.nome || 'Vaga em aberto')}</b><span>${h(r.funcao)}${r.tempo ? ' · ' + h(r.tempo) : ''}${r.vagaAberta && r.info ? ' · ' + h(r.etapa) + (r.dias != null ? ' há ' + r.dias + 'd' : '') : ''}</span></div>
              <div class="tags">${tagBadges(r)}${sitBadge(r)}</div>
            </div>`).join('') || '<div class="empty" style="padding:16px">Sem posições</div>'}</div>
        </div>`;
      }).join('')}</div>` : `<div class="card empty">${ic('search')}<div>Nenhuma posição com esses filtros.</div></div>`;
      $$('.prow', body).forEach(el => el.onclick = e => { if (e.target.closest('[data-drag]')) return; const r = l.rows.find(x => x.row === +el.dataset.row); if (!r) return; if (selOn) toggleSel(r); else openRow(l, r); });
      if (podeMover) $$('[data-drag]', body).forEach(hd => arrastar_(hd, l));
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

// arrastar uma posição para cima/baixo dentro do setor (mouse e toque)
const DEMO_RO_ = () => false;
function arrastar_(hd, l) {
  hd.addEventListener('pointerdown', ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    const row = hd.closest('.prow'), lista = row.parentElement;
    const itens = $$('.prow', lista);
    const de = itens.indexOf(row);
    const altura = row.getBoundingClientRect().height;
    const y0 = ev.clientY;
    const orig = itens.map(it => { const rc = it.getBoundingClientRect(); return rc.top + window.scrollY + rc.height / 2; });
    let alvo = de, scT = null, ult = ev.clientY;
    row.classList.add('arrastando'); document.body.classList.add('arrastando-pg');
    try { hd.setPointerCapture(ev.pointerId); } catch (e) {}
    const pos = () => {
      const dy = ult - y0 + (window.scrollY - sy0);
      row.style.transform = `translateY(${dy}px)`;
      const meio = orig[de] + dy;
      alvo = de;
      itens.forEach((it, k) => {
        if (k > de && meio > orig[k]) alvo = Math.max(alvo, k);
        if (k < de && meio < orig[k]) alvo = Math.min(alvo, k);
      });
      itens.forEach((it, k) => {
        if (it === row) return;
        const d = (de < alvo && k > de && k <= alvo) ? -altura : (de > alvo && k < de && k >= alvo) ? altura : 0;
        it.__dy = d; it.style.transform = d ? `translateY(${d}px)` : '';
      });
    };
    const sy0 = window.scrollY;
    const auto = () => {
      clearInterval(scT); scT = null;
      const vh = window.innerHeight, z = 70;
      const v = ult < z ? -(z - ult) / 4 : ult > vh - z ? (ult - (vh - z)) / 4 : 0;
      if (v) scT = setInterval(() => { window.scrollBy(0, v); pos(); }, 16);
    };
    const mv = e => { ult = e.clientY; pos(); auto(); };
    const fim = () => {
      clearInterval(scT);
      hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', fim); hd.removeEventListener('pointercancel', fim);
      document.body.classList.remove('arrastando-pg');
      itens.forEach(it => { it.style.transform = ''; it.__dy = 0; });
      row.classList.remove('arrastando');
      if (alvo === de) return;
      const r = l.rows.find(x => x.row === +row.dataset.row), t = l.rows.find(x => x.row === +itens[alvo].dataset.row);
      if (!r || !t) return;
      const s = l.setores.find(x => x.nome === r.setor);
      if (!s || !moverOk_(s, r.row, t.row)) { toast('Não dá para mover essa posição para lá (há linhas de outro tipo no meio). Use o filtro limpo e mova dentro do mesmo setor.', true); return; }
      // move na tela já (sem esperar) e envia
      if (de < alvo) itens[alvo].after(row); else itens[alvo].before(row);
      row.classList.add('hl');
      api('moverLinha', { loja: l.key, setor: r.setor, row: r.row, para: t.row, expect: expectOf(r), expectPara: expectOf(t) }).catch(e => toast(e.message || 'Não foi possível mover', true));
    };
    hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', fim); hd.addEventListener('pointercancel', fim);
  });
  hd.addEventListener('click', e => e.stopPropagation());
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
    case 'moverLinha': return `Reordenar ${e.nome || 'vaga'} — ${e.funcao || ''} (${L})`;
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
  if (f === 'dp' && podeEnviarDP(r)) return openEnviarDP(r);
  const v = SIM(r[K[f]]) ? 'NÃO' : 'SIM';
  contrSet(r, K[f], v).then(j => { if (j && !j.pendente) toast(`${String(r[K.colab] || '').split(' ')[0]}: ${f === 'dp' ? 'admissão no DP' : 'exportação ao HCM'} ${v === 'SIM' ? 'marcada' : 'desmarcada'}`); }).catch(() => {});
}
/* ---------- envio da admissão ao sistema do DP (Central de Movimentações de Pessoal) ---------- */
const envioDP = r => S.ck.envio ? norm(r[S.ck.envio]) : '';
const podeEnviarDP = r => !!(r && S.ck.envio && !r._deslig && canContr(r._loja) && !/ANTERIOR|ENVIADO|EXCLU/.test(envioDP(r)));
function openEnviarDP(r, done) {
  const K = S.ck; if (!podeEnviarDP(r)) return;
  const fard = ['BLUSA', 'CALÇA', 'BOTA'].map(k => (S.data.contratacoes.header || []).find(x => norm(x) === norm(k))).filter(Boolean);
  const faltaF = fard.filter(k => !r[k]);
  const rac = (S.data.contratacoes.header || []).find(x => /RACIAL/.test(norm(x)));
  modal({
    title: 'Enviar admissão ao DP', icon: 'share',
    body: `<p class="muted" style="margin-top:0">A admissão de <b style="color:var(--text)">${h(r[K.colab])}</b> será registrada na <b>Central de Movimentações de Pessoal</b> (aba Registrar Admissão), com você como responsável.</p>
      <div class="alist" style="margin-bottom:12px"><div class="aitem">${avatar(r[K.colab], '', 'sm soft')}<div><b>${h(r[K.colab])}</b><span>${h(r[K.funcao] || '')}${K.setor && r[K.setor] ? ' · ' + h(r[K.setor]) : ''} · ${h(r[K.loja] || '')} · admissão ${h(r[K.data] || '—')}${K.contrato && r[K.contrato] ? ' · ' + h(r[K.contrato]) : ''}</span>${fard.length ? `<span style="display:block;margin-top:2px">Fardamento: ${fard.map(k => h(k.toLowerCase()) + ' ' + h(r[k] || '—')).join(' · ')}${rac ? ' · ID racial: ' + h(r[rac] || '—') : ''}</span>` : ''}</div></div></div>
      ${!r[K.data] ? `<div class="badge b-bad" style="white-space:normal;padding:10px 12px;display:block">${ic('alert')} Preencha a data de admissão antes de enviar.</div>` : faltaF.length || (rac && !r[rac]) ? `<div class="badge b-warn" style="white-space:normal;padding:10px 12px;line-height:1.5;display:block">${ic('alert')} Falta informar: <b>${[...faltaF, ...(rac && !r[rac] ? [rac] : [])].map(k => h(k.toLowerCase())).join(', ')}</b>. Você pode enviar assim mesmo — se completar depois, a Central é atualizada sozinha.</div>` : ''}
      <p class="muted" style="font-size:12.5px;margin-bottom:0">Depois de enviada, qualquer correção feita aqui é atualizada na Central, e se a contratação for <b>excluída</b> (desistência) ela também sai da Central.</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="edOk" ${r[K.data] ? '' : 'disabled'}>${ic('share')} Enviar ao DP</button>`,
    onMount: m => $('#edOk', m.el).onclick = e => run(e.currentTarget, async () => {
      const j = await api('enviarDP', { row: r.row, nome: r[K.colab] });
      r[K.envio] = 'ENVIADO'; if (K.dp) r[K.dp] = 'SIM';
      m.close(); derive(); updateShell(); route(true); if (done) done();
      toast(`${String(r[K.colab] || '').split(' ')[0]}: admissão ${j && j.novo === false ? 'atualizada' : 'enviada'} ao DP${j && j.cargo ? ' · ' + j.cargo : ''}`);
      bgReload();
    })
  });
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
  <div class="card mt ${getV('contrGraf', 'off') === 'on' ? '' : 'ct-graf-off'}" id="ctGraf"><div class="card-h" id="ctGrafH" style="cursor:pointer"><h3>Admissões por semana</h3><span class="sub">últimas 12 semanas + próximas 2</span><span class="spacer"></span><span class="btn sm ghost">${getV('contrGraf', 'off') === 'on' ? 'Ocultar gráfico' : 'Ver gráfico'}</span></div><div class="chart-box sm"><canvas id="chWeek"></canvas></div></div>
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
    { t: 'Admissão / Loja', k: K.data, w: '118px', sort: r => r._data ? +r._data : null, r: r => `<div class="ct-dl"><b>${h(r[K.data] || '—')}</b>${lojaPill(r._loja)}</div>` },
    { t: 'Colaborador', k: K.colab, r: r => `<div class="cell-person">${avatar(r[K.colab], '', 'sm soft')}<div class="ct-pes"><b>${h(r[K.colab])}</b><span class="ct-fs">${h(r[K.funcao] || '')}${r[K.setor] ? ' · ' + h(r[K.setor]) : ''}</span>${r._consta ? '<div><span class="badge b-bad">consta como desligado</span></div>' : r._pend && r._noQuadro ? '<div><span class="badge b-ok">já está no quadro</span></div>' : r._pend && r._data && daysTo(r._data) < -30 ? `<div><span class="badge b-warn">pendente há ${-daysTo(r._data)} dias</span></div>` : ''}</div></div>` },
    { t: 'Contrato', k: K.contrato, w: '110px', r: r => qEdit(r, 'contrato', r[K.contrato] ? h(r[K.contrato]) : '<span class="faint">—</span>') },
    { t: 'Checklist', k: '_chkOk', sort: r => r._deslig ? -1 : r._chkOk, r: r => chkCell(r) },
    { t: '', k: '', nosort: true, r: r => { const env = podeEnviarDP(r) ? `<button class="btn sm ok" data-edp="${r.row}" title="Enviar a admissão ao sistema do DP">${ic('share')}<span class="ct-lbl"> Enviar ao DP</span></button>` : ''; const al = r._pend && canEdit(r._loja) && lojaBy(r._loja) ? `<button class="btn sm primary" data-aloc="${r.row}" title="Alocar no quadro">${ic('swap')}<span class="ct-lbl"> Alocar</span></button><button class="btn sm" data-dsl="${r.row}" title="Já saiu da empresa">${ic('door')}</button>` : ''; return env || al ? `<div class="ct-acts" data-stop>${env}${al}</div>` : ''; } }
  ];
  // edição rápida: clicar no ASO / HCM / Contrato direto na lista, sem abrir a pessoa
  const qEdit = (r, f, inner) => canEdit(r._loja) && !r._deslig && K[f] ? `<span class="qedit" data-stop data-qe="${r.row}" data-qf="${f}" title="Clique para alterar">${inner}${ic('chevron', 'qcar')}</span>` : inner;
  const bindRows = el => {
    $$('[data-qe]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openQuickEdit(b, rows.find(x => x.row === +b.dataset.qe), b.dataset.qf); });
    $$('[data-ck]', el).forEach(b => b.onclick = e => { e.stopPropagation(); chkClick(b, rows.find(x => x.row === +b.dataset.ck), b.dataset.cf); });
    $$('[data-aloc]', el).forEach(b => b.onclick = () => openAlocar(rows.find(x => x.row === +b.dataset.aloc)));
    $$('[data-edp]', el).forEach(b => b.onclick = () => openEnviarDP(rows.find(x => x.row === +b.dataset.edp)));
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
  $('#ctGrafH').onclick = () => { setV('contrGraf', getV('contrGraf', 'off') === 'on' ? 'off' : 'on'); route(true); };
  if (getV('contrGraf', 'off') === 'on') chart($('#chWeek'), { type: 'bar', data: { labels: weeks.map(w => fmtD(w).slice(0, 5)), datasets: S.data.lojas.map(l => ({ label: l.nome, data: weeks.map(w => ativos.filter(r => r._loja === l.key && r._data && r._data >= w && r._data < new Date(w.getTime() + 7 * 864e5)).length), backgroundColor: l.color, borderRadius: 4, maxBarThickness: 26 })) }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 }, grid: { color: css('--border') } } } } });
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
 * PESQUISA SALARIAL — escolhe o cargo da nossa lista, clica e o sistema
 * consulta o mercado na hora (Salários Brasil · CAGED/MTE, 12 meses).
 * ===================================================================== */
const PQ_LOCS = [['FOR', 'Fortaleza'], ['EUS', 'Eusébio'], ['CE', 'Ceará'], ['BR', 'Brasil']];
const PQ_MAP = {"OPERADOR(A) DE CAIXA": "operador-de-caixa-421125", "FISCAL DE CAIXA": "operador-de-caixa-421125", "OPERADOR(A) DE CAIXA PADARIA": "operador-de-caixa-421125", "OPERADOR(A) CAIXA AQUI": "operador-de-caixa-421125", "ATENDENTE/CAIXA": "operador-de-caixa-421125", "REPOSITOR(A)": "repositor-de-mercadorias-521125", "REPOSITOR": "repositor-de-mercadorias-521125", "REPOSITOR(A) DE BAZAR": "repositor-de-mercadorias-521125", "EMBALADOR(A)": "embalador-a-mao-784105", "AÇOUGUEIRO": "acougueiro-848510", "FORNEIRO": "padeiro-848305", "AUXILIAR DE PADARIA": "padeiro-848305", "VENDEDOR(A)": "vendedor-de-comercio-varejista-521110", "CONSULTOR DE VENDAS": "vendedor-de-comercio-varejista-521110", "AUXILIAR DE VENDAS": "vendedor-de-comercio-varejista-521110", "BALCONISTA": "atendente-de-lojas-e-mercados-521140", "ATENDENTE": "atendente-de-lojas-e-mercados-521140", "ATENDENTE DE APP": "atendente-de-lojas-e-mercados-521140", "ENCARREGADO(A)": "supervisor-de-vendas-comercial-520110", "ENCARREGADO": "supervisor-de-vendas-comercial-520110", "ENCARREGADA DE FDL": "supervisor-de-vendas-comercial-520110", "ENCARREGADO(A) DE BAZAR": "supervisor-de-vendas-comercial-520110", "ENCARREGADO(A) DE FRIOS": "supervisor-de-vendas-comercial-520110", "ENCARREGADO(A) DE AÇOUGUE": "supervisor-de-vendas-comercial-520110", "SUPERVISOR DE VENDAS": "supervisor-de-vendas-comercial-520110", "LIDER DE APLICATIVO": "supervisor-de-vendas-comercial-520110", "GERENTE": "gerente-de-loja-e-supermercado-141415", "ESTOQUISTA": "almoxarife-414105", "AUXILIAR DEPOSITO": "almoxarife-414105", "CONFERENTE": "conferente-mercadoria-exceto-carga-e-descarga-414120", "SEPARADOR": "auxiliar-de-logistica-414140", "CONFERENTE DE ROTA": "conferente-de-carga-e-descarga-414215", "MOTORISTA": "motorista-de-furgao-ou-veiculo-similar-782310", "EMPILHADOR": "operador-de-empilhadeira-782220", "SERVIÇOS GERAIS": "faxineiro-514320", "FISCAL": "agente-de-seguranca-517310", "MONITORAMENTO": "agente-de-seguranca-517310", "COZINHEIRO(A)": "cozinheiro-geral-513205", "AUXILIAR ADMINISTRATIVO": "auxiliar-de-escritorio-411005", "AUXILIAR COMERCIAL": "auxiliar-de-escritorio-411005", "AUXILIAR DE PROCESSOS": "auxiliar-de-escritorio-411005", "ASSISTENTE COMERCIAL": "assistente-administrativo-411010", "AUXILIAR DE DP": "auxiliar-de-pessoal-411030", "ANALISTA DE RH": "analista-de-recursos-humanos-252405", "COMPRADOR": "comprador-354205"};
const pqHist_ = () => { if (!S.pqh) S.pqh = ls.get('grc_pqh', null); return S.pqh; };
const pqSetHist_ = l => { S.pqh = l; ls.set('grc_pqh', l); };
const pqNomeSlug = s => { const t = String(s || '').replace(/-\d{6}$/, '').replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const pqNum = s => { s = String(s || '').replace(/[R$\s]/g, ''); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = +s; return isNaN(n) || !n ? null : n; };
function pqSlugDe_(f) {
  const k = norm(f), h = (pqHist_() || []).find(x => norm(x.funcao) === k);
  if (h && h.slug) return { slug: h.slug, nome: h.ref || pqNomeSlug(h.slug) };
  const m = Object.keys(PQ_MAP).find(x => norm(x) === k);
  return m ? { slug: PQ_MAP[m], nome: pqNomeSlug(PQ_MAP[m]) } : null;
}
// mercado SÓ DE SUPERMERCADOS (CNAE 4711-3: super e hipermercados), contratações com jornada integral,
// sem aprendiz/intermitente/parcial — Novo CAGED (MTE), microdados via Base dos Dados.
// cbo~LOCPER:n,média,P25,mediana,P75,P90 ; LOC: FOR, EUS, RMF (Região Metropolitana), CE ; PER: 12m (mar/2025–fev/2026) e 26 (jan–fev/2026)
const PQ_SUP_RAW = "521125~CE12m:6384,1598,1594,1594,1597,1667;CE26:1007,1640,1621,1621,1670,1672;EUS12m:147,1614,1590,1594,1673,1673;EUS26:18,1635,1621,1621,1672,1673;FOR12m:3440,1611,1594,1594,1595,1667;FOR26:558,1646,1621,1621,1672,1672;RMF12m:4724,1609,1594,1594,1597,1667;RMF26:755,1642,1621,1621,1672,1672\n421125~CE12m:6270,1595,1594,1594,1597,1658;CE26:966,1633,1621,1621,1658,1672;EUS12m:203,1613,1590,1611,1673,1673;EUS26:24,1634,1621,1621,1621,1673;FOR12m:3226,1605,1594,1594,1595,1658;FOR26:477,1636,1621,1621,1666,1672;RMF12m:4606,1605,1594,1594,1597,1658;RMF26:700,1631,1621,1621,1658,1672\n521140~CE12m:2240,1602,1594,1594,1621,1658;CE26:377,1640,1621,1621,1658,1707;EUS12m:42,1597,1534,1593,1611,1621;EUS26:6,1621,1621,1621,1621,1621;FOR12m:969,1628,1594,1594,1658,1672;FOR26:143,1667,1621,1621,1672,1723;RMF12m:1571,1619,1594,1597,1621,1658;RMF26:248,1651,1621,1621,1672,1720\n517425~CE12m:1404,1695,1594,1648,1760,1924;CE26:187,1723,1621,1672,1778,1929;EUS12m:62,1723,1621,1719,1760,1778;EUS26:8,1727,1621,1760,1778,1778;FOR12m:841,1691,1594,1621,1719,1924;FOR26:111,1718,1621,1672,1719,1929;RMF12m:1161,1700,1594,1648,1760,1924;RMF26:151,1732,1621,1672,1778,1929\n848510~CE12m:1015,1701,1594,1597,1796,1953;CE26:153,1733,1621,1672,1796,1955;EUS12m:12,1816,1611,1790,1900,2206;FOR12m:503,1757,1594,1672,1900,1991;FOR26:76,1758,1621,1680,1848,1974;RMF12m:706,1745,1594,1621,1889,1974;RMF26:109,1749,1621,1672,1848,1974\n514320~CE12m:816,1590,1590,1594,1597,1621;CE26:122,1636,1621,1621,1658,1672;EUS12m:32,1609,1590,1611,1621,1663;EUS26:5,1621,1621,1621,1621,1621;FOR12m:456,1601,1594,1594,1594,1621;FOR26:68,1637,1621,1621,1672,1672;RMF12m:594,1601,1594,1594,1597,1621;RMF26:88,1637,1621,1621,1672,1672\n784105~CE12m:756,1557,1520,1564,1597,1621;CE26:105,1615,1621,1621,1621,1623;EUS12m:25,1551,1518,1590,1591,1603;FOR12m:224,1528,1520,1520,1520,1621;FOR26:24,1588,1621,1621,1623,1623;RMF12m:427,1558,1520,1590,1597,1621;RMF26:56,1610,1621,1621,1621,1623\n521110~CE12m:608,1579,1518,1580,1621,1658;CE26:99,1629,1621,1621,1621,1621;EUS12m:38,1648,1663,1663,1663,1663;FOR12m:139,1627,1594,1594,1658,1658;FOR26:14,1756,1621,1621,1658,2200;RMF12m:240,1628,1594,1594,1658,1663;RMF26:30,1685,1621,1621,1658,1663\n414110~CE12m:583,1599,1594,1594,1597,1658;CE26:89,1646,1621,1621,1668,1686;EUS12m:14,1622,1593,1621,1673,1673;FOR12m:282,1600,1594,1594,1594,1621;FOR26:38,1629,1621,1621,1672,1672;RMF12m:474,1605,1594,1594,1597,1668;RMF26:75,1634,1621,1621,1668,1672\n513505~CE12m:388,1594,1579,1594,1597,1621;CE26:77,1635,1621,1621,1621,1672;FOR12m:153,1612,1594,1594,1594,1625;FOR26:29,1638,1621,1621,1621,1672;RMF12m:233,1609,1594,1594,1597,1621;RMF26:47,1635,1621,1621,1621,1672\n783210~CE12m:374,1605,1594,1594,1597,1621;CE26:62,1656,1621,1621,1707,1707;FOR12m:222,1600,1594,1594,1594,1621;FOR26:32,1637,1621,1621,1672,1672;RMF12m:374,1605,1594,1594,1597,1621;RMF26:62,1656,1621,1621,1707,1707\n513205~CE12m:189,1662,1594,1595,1658,1800;CE26:29,1775,1621,1672,1750,2200;EUS12m:6,1660,1673,1673,1673,1673;FOR12m:127,1662,1594,1594,1658,1873;FOR26:20,1776,1621,1672,1750,2200;RMF12m:163,1659,1594,1595,1668,1800;RMF26:25,1748,1621,1672,1750,2200\n141415~CE12m:171,3014,2123,2500,3500,4800;CE26:24,3432,2286,3000,3500,5500;FOR12m:90,3209,2190,3000,3553,5000;FOR26:12,4300,3000,3485,5000,8320;RMF12m:138,3170,2190,3000,3929,5000;RMF26:17,3976,2500,3485,4800,8320\n519110~CE12m:150,1582,1518,1591,1621,1666;CE26:35,1636,1621,1621,1621,1672;FOR12m:38,1623,1594,1594,1666,1672;FOR26:11,1641,1621,1621,1672,1672;RMF12m:73,1593,1554,1594,1621,1666;RMF26:18,1633,1621,1621,1666,1672\n411005~CE12m:141,1695,1590,1597,1794,1929;CE26:26,1751,1621,1621,1793,2200;FOR12m:60,1706,1594,1621,1793,1794;FOR26:17,1738,1621,1621,1672,1793;RMF12m:94,1730,1594,1621,1794,1948;RMF26:22,1775,1621,1621,1793,2200\n411010~CE12m:124,1852,1594,1652,2000,2300;CE26:16,1943,1621,1957,2059,2432;FOR12m:66,1873,1594,1672,2000,2306;FOR26:10,2008,1957,2000,2197,2197;RMF12m:85,1881,1594,1715,2000,2306;RMF26:12,1949,1621,1957,2059,2197\n414105~CE12m:123,1714,1518,1594,1686,2160;CE26:17,1711,1621,1621,1621,1686;FOR12m:27,2022,1594,2154,2154,2700;RMF12m:54,1889,1594,1611,2154,2230\n514120~CE12m:123,1593,1594,1594,1594,1621;CE26:16,1621,1621,1621,1621,1621;EUS12m:6,1594,1594,1594,1594,1594;FOR12m:99,1598,1594,1594,1594,1621;FOR26:14,1623,1621,1621,1621,1621;RMF12m:110,1597,1594,1594,1594,1621;RMF26:15,1621,1621,1621,1621,1621\n414215~CE12m:121,1682,1580,1621,1809,1861;CE26:23,1679,1621,1621,1809,1847;FOR12m:42,1749,1621,1782,1861,1861;FOR26:8,1718,1594,1621,1810,1847;RMF12m:66,1747,1597,1763,1861,1861;RMF26:14,1717,1597,1800,1847,1850\n414125~CE12m:118,1605,1518,1555,1621,1799;CE26:32,1648,1621,1621,1621,1774;FOR12m:13,1658,1594,1621,1774,1774;FOR26:6,1702,1621,1621,1774,1799;RMF12m:32,1631,1597,1621,1621,1774;RMF26:15,1653,1621,1621,1621,1774\n513405~CE12m:113,1607,1594,1594,1603,1672;CE26:24,1646,1621,1621,1672,1672;EUS12m:11,1591,1603,1603,1603,1603;FOR12m:68,1609,1594,1594,1594,1672;FOR26:16,1659,1621,1672,1672,1672;RMF12m:105,1610,1594,1594,1603,1672;RMF26:23,1647,1621,1672,1672,1672\n513435~CE12m:100,1602,1518,1621,1667,1670;CE26:12,1632,1621,1621,1621,1667;FOR12m:37,1646,1594,1667,1667,1667;RMF12m:46,1647,1621,1667,1667,1670\n521115~CE12m:97,1714,1667,1760,1790,1790;CE26:20,1779,1790,1790,1790,1791;EUS12m:8,1739,1676,1760,1760,1760;FOR12m:54,1755,1667,1790,1790,1790;FOR26:14,1786,1790,1790,1790,1790;RMF12m:76,1744,1670,1790,1790,1790;RMF26:18,1777,1790,1790,1790,1799\n422105~CE12m:95,1593,1594,1594,1597,1621;CE26:13,1632,1621,1621,1621,1672;FOR12m:61,1599,1594,1594,1594,1621;FOR26:8,1634,1621,1621,1621,1672;RMF12m:79,1599,1594,1594,1597,1621;RMF26:11,1630,1621,1621,1621,1672\n848305~CE12m:88,1785,1594,1679,1953,2305;CE26:11,1783,1621,1682,1747,2123;FOR12m:52,1795,1594,1679,1739,2305;FOR26:5,1693,1679,1682,1739,1747;RMF12m:77,1792,1597,1679,1747,2309;RMF26:9,1763,1621,1682,1739,2500\n410105~CE12m:81,2622,2309,2751,2883,3000;CE26:7,2681,2500,2734,2995,2995;EUS12m:5,2708,2734,2734,2734,2734;FOR12m:60,2648,1953,2883,2883,3000;RMF12m:70,2655,2309,2883,2883,3000;RMF26:6,2807,2734,2734,2995,2995\n414140~CE12m:71,1624,1594,1594,1672,1672;CE26:20,1677,1672,1672,1672,1672;FOR12m:64,1616,1594,1594,1672,1672;FOR26:19,1670,1672,1672,1672,1672;RMF12m:71,1624,1594,1594,1672,1672;RMF26:20,1677,1672,1672,1672,1672\n517310~CE12m:59,1723,1603,1774,1774,1819;CE26:8,1761,1774,1774,1774,1819;FOR12m:31,1768,1774,1774,1774,1774;FOR26:6,1774,1774,1774,1774,1774;RMF12m:45,1772,1774,1774,1774,1819;RMF26:7,1781,1774,1774,1774,1819\n821215~CE12m:59,1588,1590,1594,1597,1621;CE26:7,1621,1621,1621,1621,1621;FOR12m:27,1597,1594,1594,1594,1621;RMF12m:46,1597,1594,1594,1597,1597\n519925~CE12m:59,1587,1594,1594,1597,1621;CE26:6,1630,1621,1621,1621,1672;FOR12m:28,1598,1594,1594,1594,1594;RMF12m:47,1597,1594,1594,1597,1621;RMF26:5,1631,1621,1621,1621,1672\n784205~CE12m:57,1591,1594,1594,1597,1621;CE26:13,1636,1621,1621,1621,1686;FOR12m:33,1601,1594,1594,1594,1621;FOR26:8,1621,1621,1621,1621,1621;RMF12m:41,1601,1594,1594,1597,1621;RMF26:10,1621,1621,1621,1621,1621\n420105~CE12m:56,1703,1597,1650,1799,1803;CE26:8,1734,1650,1720,1803,1850;FOR12m:23,1709,1594,1650,1799,1850;RMF12m:51,1710,1597,1650,1799,1803;RMF26:8,1734,1650,1720,1803,1850\n783225~CE12m:56,1585,1555,1594,1597,1621;CE26:11,1642,1621,1621,1707,1707;FOR12m:10,1597,1594,1595,1595,1595;RMF12m:22,1613,1595,1597,1597,1707;RMF26:6,1660,1621,1621,1707,1707\n782510~CE12m:52,2055,1727,1928,2338,2700;CE26:10,2143,1902,1929,2429,2429;FOR12m:23,2225,1727,2338,2429,3207;FOR26:5,2270,2338,2429,2429,2429;RMF12m:40,2105,1727,1928,2338,2700;RMF26:9,2201,1929,2338,2429,2700\n142305~CE12m:51,2330,1790,2300,2500,3200;FOR12m:31,2316,1790,2356,2500,2800;RMF12m:42,2311,1790,2309,2500,2800\n141410~CE12m:42,1723,1564,1729,1733,1754;FOR12m:12,1934,1729,1729,1729,1729;RMF12m:17,1875,1729,1729,1733,1733\n782310~CE12m:40,1875,1594,1922,2064,2277;FOR12m:20,1926,1746,1922,2064,2064;RMF12m:30,1832,1594,1800,2064,2064\n782220~CE12m:40,1935,1625,1920,2187,2192;FOR12m:14,1943,1786,1953,2187,2187;RMF12m:34,1917,1625,1920,2187,2192\n841456~CE12m:33,1602,1576,1594,1621,1672;CE26:9,1655,1621,1672,1672,1707;FOR12m:13,1616,1594,1594,1621,1672;FOR26:5,1652,1621,1672,1672,1672;RMF12m:20,1612,1594,1594,1621,1672;RMF26:7,1655,1621,1672,1672,1707\n252405~CE12m:29,2795,2100,2587,3500,4191;CE26:10,3271,2587,3000,3656,3664;FOR12m:18,2602,1670,2587,3000,3656;FOR26:5,3019,2587,3000,3656,3656;RMF12m:26,2640,2100,2587,3000,3656;RMF26:9,3094,2587,3000,3656,3664\n517420~CE12m:28,1610,1594,1594,1621,1672;CE26:5,1631,1621,1621,1621,1672;FOR12m:20,1634,1594,1594,1594,1672;RMF12m:22,1631,1594,1594,1621,1672\n848115~CE12m:27,2436,2149,2305,2368,3171;CE26:7,2706,2123,2233,3500,4500;FOR12m:15,2383,2233,2305,2357,3171;RMF12m:25,2419,2200,2305,2363,3171;RMF26:6,2803,2200,2233,3500,4500\n513440~CE12m:26,1588,1594,1594,1594,1597;FOR12m:15,1594,1594,1594,1594,1594;RMF12m:19,1595,1594,1594,1594,1597\n521105~CE12m:26,1931,1602,1679,2200,2500;CE26:6,2304,2200,2500,2500,2500;FOR12m:16,1925,1658,1679,2200,2200;RMF12m:16,1925,1658,1679,2200,2200\n782305~CE12m:26,1726,1518,1621,1847,2103\n520110~CE12m:25,2203,1900,2149,2454,2800;FOR12m:13,2270,2149,2149,2401,2500;RMF12m:18,2343,2149,2401,2500,2800\n841805~CE12m:24,1716,1591,1621,1865,1865;FOR12m:12,1777,1594,1865,1865,1865;RMF12m:15,1777,1621,1865,1865,1865\n413110~CE12m:24,1803,1518,1686,2010,2231;FOR12m:7,1868,1658,1800,2000,2231;RMF12m:11,1935,1800,2000,2094,2094\n411030~CE12m:23,1768,1594,1621,1702,2200;CE26:5,1789,1621,1621,1700,2381;FOR12m:13,1684,1594,1594,1621,1702;RMF12m:21,1718,1594,1621,1700,1900\n821205~CE12m:23,1606,1594,1594,1597,1672;FOR12m:13,1606,1594,1594,1594,1672;RMF12m:23,1606,1594,1594,1597,1672\n414120~CE12m:21,1735,1625,1799,1809,1880;CE26:5,1800,1809,1809,1880,1880;FOR12m:9,1823,1809,1809,1809,1880;RMF12m:16,1771,1625,1809,1809,1880;RMF26:5,1800,1809,1809,1880,1880\n141405~CE12m:21,1577,1540,1540,1597,1621\n354125~CE12m:18,1700,1594,1718,1890,1963;FOR12m:12,1694,1594,1659,1890,1890;RMF12m:15,1698,1594,1718,1890,1890\n354205~CE12m:18,3392,1597,2190,3179,9748;FOR12m:7,4761,2500,2800,9748,10213;RMF12m:10,4559,2500,2700,8000,9748\n317205~CE12m:17,1749,1594,1600,1794,2271;FOR12m:10,1817,1594,1621,2100,2271;RMF12m:14,1792,1597,1726,2000,2271\n783215~CE12m:17,1605,1594,1594,1594,1672;FOR12m:16,1610,1594,1594,1594,1672;RMF12m:16,1610,1594,1594,1594,1672\n372205~CE12m:16,1809,1730,1848,1865,1889;FOR12m:6,1848,1848,1848,1848,1848;RMF12m:7,1851,1848,1848,1848,1865\n223710~CE12m:16,2975,2600,2660,2801,4181;FOR12m:11,2864,2600,2600,2801,3783;RMF12m:16,2975,2600,2660,2801,4181\n391205~CE12m:15,1595,1594,1594,1594,1597;FOR12m:12,1594,1594,1594,1594,1594;RMF12m:15,1595,1594,1594,1594,1597\n514325~CE12m:14,1786,1729,1800,1905,1953;CE26:6,1801,1729,1800,1905,1953;FOR12m:9,1813,1733,1800,1886,1953;RMF12m:11,1830,1733,1800,1905,1953;RMF26:5,1838,1800,1800,1905,1953\n519905~CE12m:14,1721,1597,1760,1790,1845;FOR12m:9,1749,1760,1761,1790,1845;RMF12m:12,1736,1597,1760,1790,1845\n413115~CE12m:14,1691,1594,1774,1774,1774;FOR12m:12,1699,1594,1774,1774,1774;RMF12m:12,1699,1594,1774,1774,1774\n351605~CE12m:13,2610,2117,2500,2996,3541;FOR12m:8,2475,1594,2200,2996,3541;RMF12m:10,2404,2117,2197,2996,3178\n951105~CE12m:13,2448,2441,2441,2446,2467;FOR12m:7,2441,2441,2441,2441,2441;RMF12m:11,2445,2441,2441,2446,2446\n620105~CE12m:13,2125,1900,2292,2309,2309;FOR12m:9,2249,2292,2292,2309,2399;RMF12m:12,2167,1900,2292,2309,2309\n422315~CE12m:13,1604,1597,1597,1621,1621;RMF12m:13,1604,1597,1597,1621,1621\n514310~CE12m:13,1763,1700,1761,1845,1845;FOR12m:6,1831,1845,1845,1845,1845;RMF12m:11,1775,1700,1845,1845,1845\n142315~CE12m:13,2248,1518,1590,3000,4514\n848515~CE12m:12,1859,1621,1920,1922,2008;FOR12m:5,1973,1922,2008,2008,2008;RMF12m:9,1950,1920,1922,2008,2008\n142105~CE12m:12,4300,1518,2277,3036,3714\n517415~CE12m:12,1594,1594,1594,1594,1594;FOR12m:11,1594,1594,1594,1594,1594;RMF12m:12,1594,1594,1594,1594,1594\n325205~CE12m:11,2292,2292,2292,2292,2292;FOR12m:11,2292,2292,2292,2292,2292;RMF12m:11,2292,2292,2292,2292,2292\n142335~CE12m:11,2695,1518,2996,3626,3626;FOR12m:8,3136,2820,3143,3626,3988;RMF12m:8,3136,2820,3143,3626,3988\n833125~CE12m:10,1592,1594,1594,1597,1621;FOR12m:6,1599,1594,1594,1594,1621;RMF12m:9,1601,1594,1594,1597,1621\n517330~CE12m:10,2106,1876,2200,2309,2309;FOR12m:7,2138,1876,2309,2309,2309;RMF12m:9,2164,2031,2309,2309,2311\n951305~CE12m:10,1576,1565,1579,1579,1579\n212410~CE12m:9,2274,2101,2101,2101,2934;FOR12m:8,2205,2101,2101,2101,2934;RMF12m:8,2205,2101,2101,2101,2934\n342315~CE12m:9,2296,2149,2149,2400,3000;RMF12m:9,2296,2149,2149,2400,3000\n141615~CE12m:9,5678,2499,2905,3500,25813;RMF12m:8,6102,2499,2905,3500,25813\n513615~CE12m:8,1839,1679,1680,1787,2291;RMF12m:7,1885,1679,1787,2291,2291\n261715~CE12m:8,1726,1654,1678,1848,1849;FOR12m:6,1741,1654,1654,1848,1849;RMF12m:6,1741,1654,1654,1848,1849\n253115~CE12m:8,1671,1518,1518,1594,2054\n413105~CE12m:7,2211,1670,2000,2770,3242;FOR12m:6,2039,1670,2000,2200,2770;RMF12m:6,2039,1670,2000,2200,2770\n354130~CE12m:6,1807,1850,1850,1850,1850;FOR12m:6,1807,1850,1850,1850,1850;RMF12m:6,1807,1850,1850,1850,1850\n766120~CE12m:6,1594,1594,1594,1594,1594;FOR12m:6,1594,1594,1594,1594,1594;RMF12m:6,1594,1594,1594,1594,1594\n412110~CE12m:6,1649,1597,1597,1703,1781;RMF12m:6,1649,1597,1597,1703,1781\n410235~CE12m:6,2310,2309,2309,2309,2311;FOR12m:6,2310,2309,2309,2309,2311;RMF12m:6,2310,2309,2309,2309,2311\n391215~CE12m:6,1618,1594,1594,1594,1737;FOR12m:5,1594,1594,1594,1594,1594;RMF12m:5,1594,1594,1594,1594,1594\n848310~CE12m:6,1710,1518,1679,1746,2118\n512105~CE12m:6,1616,1564,1594,1642,1686\n514110~CE12m:6,1609,1597,1597,1621,1621;RMF12m:6,1609,1597,1597,1621,1621\n848525~CE12m:6,1632,1597,1670,1670,1670\n513610~CE12m:6,1655,1621,1679,1679,1679\n424120~CE12m:5,1667,1667,1667,1667,1667;FOR12m:5,1667,1667,1667,1667,1667;RMF12m:5,1667,1667,1667,1667,1667\n313205~CE12m:5,1750,1736,1736,1739,1804;FOR12m:5,1750,1736,1736,1739,1804;RMF12m:5,1750,1736,1736,1739,1804\n252105~CE12m:5,3746,2448,3541,3983,6931\n142320~CE12m:5,2417,1518,1560,1757,5734";
const PQ_SUP_ATUAL = 'fev/2026';
const PQ_SUP_LOCS = [['FOR', 'Fortaleza'], ['EUS', 'Eusébio'], ['RMF', 'Região Metropolitana'], ['CE', 'Ceará']];
const PQ_PER = { '26': 'jan–fev/2026', '12m': 'mar/2025–fev/2026' };
const PQ_FONTE_CAGED = 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/microdados-rais-e-caged';
let PQ_SUP_ = null;
function pqSup_(cbo) {
  if (!PQ_SUP_) { PQ_SUP_ = {}; PQ_SUP_RAW.split('\n').forEach(l => { const [c, d] = l.split('~'); const o = {}; d.split(';').forEach(p => { const [k, v] = p.split(':'); const per = /12m$/.test(k) ? '12m' : '26', loc = k.slice(0, k.length - per.length); (o[loc] = o[loc] || {})[per] = v.split(',').map(Number); }); PQ_SUP_[c] = o; }); }
  const o = PQ_SUP_[String(cbo || '')]; if (!o) return null;
  const r = {};
  Object.keys(o).forEach(loc => { const per = o[loc]['26'] && o[loc]['26'][0] >= 20 ? '26' : (o[loc]['12m'] ? '12m' : '26'); const v = o[loc][per]; if (v) r[loc] = { per, n: v[0], media: v[1], q1: v[2], mediana: v[3], q3: v[4], teto: v[5] }; });
  return r;
}
// mercado principal: supermercados de Fortaleza (sem amostra suficiente: Região Metropolitana, Ceará). Sem dado de supermercado: todos os setores (Salários Brasil).
function pqMerc_(it) {
  const sup = pqSup_(it.cbo);
  if (sup) for (const k of ['FOR', 'RMF', 'CE']) { const v = sup[k]; if (v && v.n >= 8) { const nm = PQ_SUP_LOCS.find(x => x[0] === k)[1]; return Object.assign({ fonte: 'sup', loc: k, locNome: nm }, v); } }
  for (const [k, n] of PQ_LOCS) { const v = it.merc && it.merc[k]; if (v && v[1]) { const med = v[1]; const q1 = v[2] && v[2] <= med && v[2] > med * 0.6 ? v[2] : Math.round(med * 0.95), teto = v[3] && v[3] >= med ? v[3] : Math.round(med * 1.2); return { fonte: 'sb', loc: k, locNome: n, media: v[0], mediana: med, q1, q3: teto, teto, n: v[4] || 0 }; } }
  return null;
}
function pqVeredito_(sal, m) {
  if (!m) return { t: 'Sem dado de mercado', cls: '', frase: '' };
  if (!sal) return { t: 'Informe o nosso salário', cls: 'b-info', frase: 'Digite o nosso salário e clique de novo para ver se estamos abaixo, na faixa ou acima do mercado.' };
  const d = (sal / m.mediana - 1) * 100, dt = fmt(Math.abs(d), 1) + '% ' + (d < 0 ? 'abaixo' : 'acima');
  const onde = m.fonte === 'sup' ? `dos supermercados de ${m.locNome}` : `de ${m.locNome} (todos os setores)`;
  if (Math.abs(d) < 0.5) return { t: 'Na mediana do mercado', cls: 'b-ok', d, frase: `Pagamos o mesmo que a mediana ${onde}.` };
  if (sal < m.q1) return { t: 'Abaixo do mercado', cls: 'b-bad', d, frase: `Pagamos ${dt} da mediana ${onde}. Abaixo da faixa comum: risco de perder colaboradores e de demora para preencher vagas.` };
  if (sal < m.mediana) return { t: 'Na faixa, abaixo da mediana', cls: 'b-warn', d, frase: `Pagamos ${dt} da mediana ${onde}. Dentro da faixa comum, mas abaixo da metade do mercado.` };
  if (sal <= m.q3) return { t: 'Na faixa, acima da mediana', cls: 'b-ok', d, frase: `Pagamos ${dt} da mediana ${onde}. Salário competitivo para atrair e reter.` };
  return { t: 'Acima do mercado', cls: 'b-acc', d, frase: `Pagamos ${dt} da mediana ${onde}, acima do que a maioria paga (faixa comum até ${brl0(m.q3)}).` };
}
function pqBar_(sal, m) {
  const lo = Math.min(m.q1, sal || m.q1) * 0.95, hi = Math.max(m.teto, m.q3, sal || 0) * 1.03, P = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
  const w = Math.max(+(P(m.q3) - P(m.q1)), 1.2).toFixed(1);
  return `<div class="pq-bar big"><i class="pq-band" style="left:${P(m.q1)}%;width:${w}%"></i><i class="pq-med" style="left:${P(m.mediana)}%"></i>${sal ? `<i class="pq-nos" style="left:${P(sal)}%"></i>` : ''}</div>
  <div class="pq-leg"><span><i class="pq-band"></i> Faixa comum ${brl0(m.q1)} a ${brl0(m.q3)}</span><span><i class="pq-med"></i> Mediana ${brl0(m.mediana)}</span>${sal ? `<span><i class="pq-nos"></i> Nosso ${brl0(sal)}</span>` : ''}<span class="faint">Os 10% que mais pagam: acima de ${brl0(m.teto)}</span></div>`;
}
function pqCard_(it) {
  const m = pqMerc_(it), sal = +it.salario || null, vd = pqVeredito_(sal, m), sup = pqSup_(it.cbo);
  const sbUrl = k => 'https://salariosbrasil.com.br/quanto-ganha/' + it.slug + ({ FOR: '?estado=ce&cidade=fortaleza', EUS: '?estado=ce&cidade=eusebio', CE: '?estado=ce', BR: '' }[k] || '');
  const em = it.em ? new Date(it.em) : null;
  const titulo = !m ? '—' : m.fonte === 'sup' ? `Supermercados de ${m.locNome} · ${PQ_PER[m.per]}` : `${m.locNome} · todos os setores (sem dado de supermercado para este cargo)`;
  const supBox = sup ? `<div class="pq-sec">Só supermercados <span class="faint">· salário de contratação (Novo CAGED)</span></div><div class="pq-locs">${PQ_SUP_LOCS.map(([k, n]) => { const v = sup[k]; return `<div><span>${n}</span><b>${v ? brl0(v.mediana) : '—'}</b><small>${v ? v.n.toLocaleString('pt-BR') + ' contratações · ' + PQ_PER[v.per] : 'sem contratações'}</small></div>`; }).join('')}</div>` : '';
  const sbBox = `<div class="pq-sec">Todos os setores <span class="faint">· Salários Brasil (clique para abrir a fonte)</span></div><div class="pq-locs">${PQ_LOCS.map(([k, n]) => { const v = it.merc && it.merc[k]; return `<a href="${h(sbUrl(k))}" target="_blank" rel="noopener"><span>${n} ↗</span><b>${v && v[1] ? brl0(v[1]) : '—'}</b><small>${v && v[4] ? (+v[4]).toLocaleString('pt-BR') + ' contratações' : 'sem dado'}</small></a>`; }).join('')}</div>`;
  return `<div class="card pq-res mt">
    <div class="pq-res-h"><div style="min-width:0"><div class="faint" style="font-size:12px">Comparado com: ${h(titulo)}</div><h2>${h(it.funcao)}</h2><div class="faint" style="font-size:12px">Cargo no mercado: ${h(it.ref || pqNomeSlug(it.slug))} (CBO ${h(it.cbo)})</div></div><span class="badge pq-ver ${vd.cls}">${h(vd.t)}</span></div>
    ${m ? `<div class="pq-nums">
      <div><span>Nosso salário</span><b>${sal ? brl(sal) : '—'}</b></div>
      <div><span>Mercado paga (mediana)</span><b>${brl0(m.mediana)}</b></div>
      <div><span>Diferença</span><b style="color:${vd.d == null ? 'inherit' : vd.d < 0 ? 'var(--bad)' : 'var(--ok)'}">${vd.d == null ? '—' : (vd.d >= 0 ? '+' : '') + fmt(vd.d, 1) + '%'}</b></div>
    </div>
    ${pqBar_(sal, m)}
    ${vd.frase ? `<p class="pq-msg">${vd.frase}</p>` : ''}` : '<p class="muted">Não há dado de mercado para esta referência.</p>'}
    ${supBox}${sbBox}
    <div class="pq-fontes"><b>Fontes</b>
      <div>• <a href="${PQ_FONTE_CAGED}" target="_blank" rel="noopener">Novo CAGED — microdados do Ministério do Trabalho (PDET) ↗</a>: só contratações de supermercados e hipermercados (CNAE 4711-3), jornada integral, sem aprendiz, intermitente ou parcial. Dados até ${PQ_SUP_ATUAL} (o governo divulga com atraso).</div>
      <div>• <a href="${h(sbUrl('FOR'))}" target="_blank" rel="noopener">Salários Brasil — ${h(it.ref || pqNomeSlug(it.slug))} ↗</a>: CAGED de todos os setores, últimos 12 meses, corrigido pelo IPCA${em ? ', consultado em ' + em.toLocaleDateString('pt-BR') : ''}.</div>
      <div>• <a href="https://br.indeed.com/career/salaries" target="_blank" rel="noopener">Indeed Salários ↗</a>: salários anunciados nas vagas (para comparar).</div>
      ${it.por ? `<div class="faint">Pesquisa feita por ${h(it.por)}${em ? ' em ' + em.toLocaleDateString('pt-BR') : ''}.</div>` : ''}
    </div>
  </div>`;
}

async function pgPesq() {
  setTitle('Pesquisa salarial', 'Escolha o cargo e veja quanto os supermercados pagam');
  const v = $('#view'), fs = allFuncoes();
  let cur = null, ultimo = null;
  v.innerHTML = `
  <div class="card pq-form">
    <div class="pq-row">
      <div class="field" style="flex:2 1 260px"><label>Cargo</label><select class="input" id="pqF"><option value="">Selecione o cargo…</option>${fs.map(f => `<option value="${h(f)}">${h(f)}</option>`).join('')}</select></div>
      <div class="field" style="flex:1 1 150px"><label>Nosso salário (R$)</label><input class="input" id="pqS" inputmode="decimal" placeholder="Ex.: 1.700,00"></div>
      <button class="btn primary pq-go" id="pqGo">${ic('search')} Fazer pesquisa salarial</button>
    </div>
    <div class="faint" id="pqRef" style="font-size:12.5px;margin-top:8px"></div>
    <div id="pqTroca"></div>
  </div>
  <div id="pqOut"></div>
  <div class="card mt"><div class="card-h"><h3>Últimas pesquisas</h3><span class="spacer"></span>${isAdmin() ? `<button class="btn sm" id="pqAc" title="Quem pode usar este módulo">${ic('shield')} Acesso</button>` : ''}<button class="btn sm" id="pqExp" title="Exportar">${ic('download')}</button></div><div id="pqHist"></div></div>`;
  const setRef = () => {
    const el = $('#pqRef'); if (!el) return;
    el.innerHTML = cur ? `Referência no mercado: <b>${h(cur.nome)}</b> (CBO ${h(cur.slug.slice(-6))}) · <a href="#" id="pqTr" style="color:var(--accent)">trocar</a>` : ($('#pqF').value ? 'Buscando a referência deste cargo no mercado…' : '');
    const tr = $('#pqTr'); if (tr) tr.onclick = e => { e.preventDefault(); abrirTroca(); };
  };
  const abrirTroca = (q) => {
    const box = $('#pqTroca');
    box.innerHTML = `<div class="pq-troca"><div class="input-icon search">${ic('search')}<input class="input" id="pqTq" placeholder="Digite o nome do cargo no mercado (ex.: repositor, açougueiro)" value="${h(q || $('#pqF').value.toLowerCase())}" style="width:100%"></div><div id="pqTl" class="pq-tl"></div></div>`;
    let tm = 0;
    const buscar = async () => {
      const t = $('#pqTq').value.trim(); if (t.length < 3) return;
      $('#pqTl').innerHTML = '<span class="faint">Buscando…</span>';
      try {
        const it = (await api('pqCbo', { q: t }, { silent: true })).itens || [];
        if (!$('#pqTl')) return;
        $('#pqTl').innerHTML = it.length ? it.map(x => `<button class="chip" data-sl="${h(x.slug)}">${h(x.nome)} <span class="n">${h(x.cbo)}</span></button>`).join('') : '<span class="faint">Nada encontrado. Tente outra palavra.</span>';
        $$('[data-sl]', box).forEach(b => b.onclick = () => { cur = { slug: b.dataset.sl, nome: pqNomeSlug(b.dataset.sl) }; box.innerHTML = ''; setRef(); });
      } catch (e) { $('#pqTl').innerHTML = `<span class="muted">${h(e.message)}</span>`; }
    };
    $('#pqTq').oninput = () => { clearTimeout(tm); tm = setTimeout(buscar, 400); };
    $('#pqTq').focus(); buscar();
  };
  const escolher = async f => {
    $('#pqTroca').innerHTML = ''; cur = f ? pqSlugDe_(f) : null;
    const hh = (pqHist_() || []).find(x => norm(x.funcao) === norm(f));
    $('#pqS').value = hh && hh.salario ? fmt(hh.salario) : '';
    if (hh) mostrar(hh); else { ultimo = null; $('#pqOut').innerHTML = ''; }
    setRef();
    if (f && !cur) {
      try {
        const it = (await api('pqCbo', { q: f }, { silent: true })).itens || [];
        if ($('#pqF').value !== f) return;
        if (it[0]) { cur = { slug: it[0].slug, nome: it[0].nome }; setRef(); } else { $('#pqRef').innerHTML = 'Não achei a referência automaticamente.'; abrirTroca(); }
      } catch (e) { $('#pqRef').innerHTML = h(e.message); }
    }
  };
  const mostrar = it => { ultimo = it; $('#pqOut').innerHTML = pqCard_(it); };
  const drawHist = () => {
    const L = pqHist_() || [];
    if (!L.length) { $('#pqHist').innerHTML = '<div class="muted" style="padding:10px 2px">Nenhuma pesquisa feita ainda. Escolha um cargo acima e clique em <b>Fazer pesquisa salarial</b>.</div>'; return; }
    table($('#pqHist'), 'pqh', [
      { t: 'Cargo', k: 'funcao', r: x => `<b>${h(x.funcao)}</b>` },
      { t: 'Nosso salário', k: 'salario', sort: x => +x.salario || 0, r: x => x.salario ? brl(x.salario) : '<span class="faint">—</span>' },
      { t: 'Mercado (mediana)', k: 'med', sort: x => (pqMerc_(x) || {}).mediana || 0, r: x => { const m = pqMerc_(x); return m ? brl0(m.mediana) + ` <span class="faint" style="font-size:11px">${m.locNome}</span>` : '—'; } },
      { t: 'Situação', k: 'st', sort: x => pqVeredito_(+x.salario, pqMerc_(x)).t, r: x => { const vd = pqVeredito_(+x.salario, pqMerc_(x)); return `<span class="badge ${vd.cls}">${h(vd.t)}</span>${vd.d != null ? ` <span class="faint" style="font-size:11.5px">${(vd.d >= 0 ? '+' : '') + fmt(vd.d, 1)}%</span>` : ''}`; } },
      { t: 'Data', k: 'em', sort: x => x.em || '', r: x => x.em ? new Date(x.em).toLocaleDateString('pt-BR') : '' },
      { t: '', k: 'x', w: '40px', nosort: true, r: x => `<button class="btn sm ghost icon" data-stop data-del="${h(x.id)}" title="Apagar">${ic('trash')}</button>` }
    ], L, x => { $('#pqF').value = x.funcao; cur = { slug: x.slug, nome: x.ref || pqNomeSlug(x.slug) }; $('#pqS').value = x.salario ? fmt(x.salario) : ''; setRef(); mostrar(x); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $$('[data-del]', $('#pqHist')).forEach(b => b.onclick = async e => {
      e.stopPropagation(); const it = L.find(x => x.id === b.dataset.del); if (!it) return;
      if (!await confirmBox(`Apagar a pesquisa de <b>${h(it.funcao)}</b>?`, 'Apagar', true)) return;
      pqSetHist_(L.filter(x => x.id !== it.id)); drawHist(); if (ultimo && ultimo.id === it.id) $('#pqOut').innerHTML = '';
      try { const j = await api('pqApagar', { id: it.id }, { silent: true }); if (j.lista) { pqSetHist_(j.lista); drawHist(); } } catch (er) { toast(er.message, true); }
    });
  };
  $('#pqF').onchange = e => escolher(e.target.value);
  $('#pqGo').onclick = e => run(e.currentTarget, async () => {
    const f = $('#pqF').value; if (!f) throw new Error('Escolha o cargo.');
    if (!cur) throw new Error('Escolha a referência do cargo no mercado (clique em "trocar").');
    $('#pqOut').innerHTML = `<div class="card mt"><div class="sk" style="height:180px"></div><div class="faint" style="margin-top:8px">Consultando o mercado (supermercados e todos os setores)…</div></div>`;
    try {
      const j = await api('pqFazer', { funcao: f, slug: cur.slug, salario: pqNum($('#pqS').value) });
      pqSetHist_(j.lista || []); mostrar(j.item); drawHist();
      cur.nome = j.item.ref || cur.nome; setRef();
    } catch (er) { $('#pqOut').innerHTML = ''; throw er; }
  });
  if ($('#pqAc')) $('#pqAc').onclick = openPesqAcesso;
  $('#pqExp').onclick = () => exportCSV('pesquisa_salarial', ['Cargo', 'Cargo no mercado', 'CBO', 'Nosso salário', 'Comparado com', 'Faixa comum (início)', 'Mediana', 'Média', 'Faixa comum (fim)', 'Contratações', '% vs mediana', 'Situação', 'Data'], (pqHist_() || []).map(x => { const m = pqMerc_(x), vd = pqVeredito_(+x.salario, m); return [x.funcao, x.ref, x.cbo, x.salario || '', m ? (m.fonte === 'sup' ? 'Supermercados · ' : 'Todos os setores · ') + m.locNome + (m.per ? ' · ' + PQ_PER[m.per] : '') : '', m ? m.q1 : '', m ? m.mediana : '', m ? m.media : '', m ? m.q3 : '', m ? m.n : '', vd.d == null ? '' : fmt(vd.d, 1) + '%', vd.t, x.em ? new Date(x.em).toLocaleDateString('pt-BR') : '']; }));
  drawHist(); setRef();
  const rt = S.rt;
  try { const j = await api('pqLista', {}, { silent: true }); if (rt !== S.rt) return; if (JSON.stringify(j.lista || []) !== JSON.stringify(pqHist_() || [])) { pqSetHist_(j.lista || []); drawHist(); } }
  catch (e) { toast(e.message, true); }
}
/* =====================================================================
 * TABELA SALARIAL (PCCS) — igual à planilha "Tabela_Salarial":
 * Tabela Salarial (faixas I–V automáticas), Média Salarial e Progressão por Mérito.
 * ===================================================================== */
const TS_FX = [0, 0.25, 0.5, 0.75, 1];
const tsDoc_ = () => { if (S.tsal === undefined) S.tsal = ls.get('grc_tsal', undefined); return S.tsal; };
const tsSetDoc_ = d => { S.tsal = d; ls.set('grc_tsal', d); };
const tsNum = s => { s = String(s == null ? '' : s).replace(/[R$\s%]/g, ''); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = +s; return isNaN(n) ? null : n; };
const tsR2 = n => Math.round(n * 100) / 100;
function tsMedias_(d) {
  const m = {};
  (d.colabs || []).forEach(c => { const k = norm(c.cargo); if (!k || !(+c.salario > 0)) return; (m[k] = m[k] || { n: 0, s: 0 }); m[k].n++; m[k].s += +c.salario; });
  Object.values(m).forEach(x => x.media = tsR2(x.s / x.n));
  return m;
}
// calcula um cargo exatamente como na planilha
function tsCalc_(d, it, medias) {
  const md = (medias || tsMedias_(d))[norm(it.nome)];
  const base = it.ref != null && it.ref !== '' ? +it.ref : (md ? md.media : null);
  const reaj = +it.reaj || 0;
  const ref = base == null ? null : tsR2(base * (1 + reaj));
  const nv = d.niveis || {};
  const k = nv[String(it.nivel || '').toUpperCase()] != null ? +nv[String(it.nivel || '').toUpperCase()] : +(nv.outros || 1.2);
  const fx = ref == null ? [] : TS_FX.map(p => tsR2(ref * (1 + (k - 1) * p)));
  const subida = TS_FX.slice(1).map(p => '+' + fmt((k - 1) * p * 100, 1) + '%').join('  |  ');
  return { ref, fx, k, subida, md, auto: it.ref == null || it.ref === '' };
}
async function tsSalvar_(motivo, mut) {
  const d = JSON.parse(JSON.stringify(tsDoc_()));
  mut(d);
  const versao = tsDoc_().versao;
  tsSetDoc_(d);
  try { const j = await api('tsSave', { doc: d, versao, motivo }, { silent: true }); if (j.doc) tsSetDoc_(j.doc); return true; }
  catch (e) { toast('Não foi possível salvar: ' + e.message, true); try { const j = await api('tsGet', {}, { silent: true }); tsSetDoc_(j.doc); } catch (e2) {} return false; }
}

async function pgTabela() {
  setTitle('Tabela salarial', 'Plano de Cargos, Carreiras e Salários (PCCS)');
  const v = $('#view');
  let aba = getV('tsAba', 'tab');
  const f = getF('tsal');
  const draw = () => {
    const d = tsDoc_();
    if (d === undefined) { v.innerHTML = `<div class="sk" style="height:320px"></div>`; return; }
    if (!d) {
      v.innerHTML = `<div class="card" style="text-align:center;padding:30px"><b>A tabela salarial ainda não está no sistema</b><p class="muted">Importe a planilha <b>Tabela_Salarial</b> uma vez (Tabela Salarial, Média Salarial e Progressão por Mérito). Depois disso tudo passa a ser feito aqui.</p>${isAdmin() ? `<button class="btn primary" id="tsImp">${ic('download')} Importar da planilha</button>` : '<p class="muted">Peça ao administrador para importar.</p>'}</div>`;
      if ($('#tsImp')) $('#tsImp').onclick = e => run(e.currentTarget, async () => { const j = await api('tsImportar', {}); tsSetDoc_(j.doc); toast('Tabela importada'); draw(); });
      return;
    }
    const medias = tsMedias_(d), cargos = d.itens.filter(i => i.t === 'cargo');
    v.innerHTML = `
    <div class="ts-head card"><div><div class="faint" style="font-size:12px">GRC GRUPO R CENTER</div><h2>${h(String(d.titulo || '').replace(/^GRC GRUPO R CENTER\s*—\s*/i, ''))}</h2><div class="faint" style="font-size:12px">${cargos.length} cargos · ${(d.colabs || []).length} colaboradores na média${d.atualizadoEm ? ' · atualizado em ' + new Date(d.atualizadoEm).toLocaleDateString('pt-BR') + (d.atualizadoPor ? ' por ' + h(d.atualizadoPor) : '') : ''}</div></div>
      <div class="seg" id="tsAbas"><button data-v="tab" class="${aba === 'tab' ? 'on' : ''}">📋 Tabela Salarial</button><button data-v="med" class="${aba === 'med' ? 'on' : ''}">📊 Média Salarial</button><button data-v="prog" class="${aba === 'prog' ? 'on' : ''}">📈 Progressão por Mérito</button></div></div>
    <div id="tsBody"></div>`;
    $$('#tsAbas button').forEach(b => b.onclick = () => { aba = b.dataset.v; setV('tsAba', aba); draw(); });
    if (aba === 'med') drawMedia(d, medias); else if (aba === 'prog') drawProg(d); else drawTab(d, medias);
  };
  // ---------- 📋 TABELA SALARIAL ----------
  const drawTab = (d, medias) => {
    const q = norm(f.q || ''), blocos = d.itens.filter(i => i.t === 'bloco');
    let bloco = null, grupo = null; const linhas = [];
    d.itens.forEach(it => {
      if (it.t === 'bloco') { bloco = it; grupo = null; }
      if (it.t === 'grupo') grupo = it;
      if (f.bl && (!bloco || bloco.id !== f.bl)) return;
      if (it.t === 'cargo' && q && !norm(it.nome + ' ' + it.cbo + ' ' + it.nivel).includes(q)) return;
      linhas.push(it);
    });
    // tira cabeçalhos que ficaram sem cargo na busca
    const rk = { bloco: 0, grupo: 1, sub: 2 };
    const vis = !q ? linhas : linhas.filter((it, i) => { if (it.t === 'cargo') return true; for (let j = i + 1; j < linhas.length; j++) { const x = linhas[j]; if (x.t === 'cargo') return true; if (rk[x.t] <= rk[it.t]) return false; } return false; });
    let n = 0;
    const nMap = {}; d.itens.forEach(it => { if (it.t === 'cargo') nMap[it.id] = ++n; });
    const row = it => {
      if (it.t !== 'cargo') return `<tr class="ts-${it.t}"><td colspan="13">${h(it.nome)}</td></tr>`;
      const c = tsCalc_(d, it, medias);
      return `<tr class="ts-c" data-id="${h(it.id)}"><td class="ts-n">${nMap[it.id]}</td><td class="ts-cg"><b>${h(it.nome)}</b>${c.auto && c.md ? `<div class="faint">média de ${c.md.n} colab.</div>` : (!c.auto ? '<div class="faint">valor fixo</div>' : '')}</td><td>${h(it.nivel || '')}</td><td class="mono">${h(it.cbo || '')}</td>
        <td class="ts-ref">${c.ref == null ? '<span class="faint">—</span>' : brl(c.ref)}</td>${[0, 1, 2, 3, 4].map(i => `<td class="ts-fx">${c.fx[i] == null ? '' : brl(c.fx[i])}</td>`).join('')}
        <td>${c.ref == null ? '' : fmt(c.k * 100, 0) + '%'}</td><td class="ts-sub">${c.subida}</td><td>${it.reaj ? fmt(it.reaj * 100, 2) + '%' : '0%'}</td></tr>`;
    };
    $('#tsBody').innerHTML = `
    <div class="toolbar">
      <div class="input-icon search">${ic('search')}<input class="input" id="tsQ" placeholder="Buscar cargo, CBO ou nível" value="${h(f.q || '')}" style="width:100%"></div>
      <select class="input" id="tsBl"><option value="">Todos os blocos</option>${blocos.map(b => `<option value="${h(b.id)}" ${f.bl === b.id ? 'selected' : ''}>${h(b.nome.split('(')[0].trim())}</option>`).join('')}</select>
      <span class="spacer"></span>
      <button class="btn" id="tsNiv" title="% máximo por nível">${ic('settings')} Níveis</button>
      <button class="btn" id="tsExp" title="Exportar">${ic('download')}</button>
      <button class="btn" id="tsNovo">${ic('plus')} Novo cargo</button>
      <button class="btn primary" id="tsReaj">🔄 Aplicar reajuste de dissídio</button>
    </div>
    <div class="ts-wrap"><table class="ts-t"><thead><tr><th>N</th><th>CARGO</th><th>NÍV.</th><th>CBO</th><th>SALÁRIO REFERÊNCIA</th><th>FAIXA I</th><th>FAIXA II</th><th>FAIXA III</th><th>FAIXA IV</th><th>FAIXA V</th><th>% MÁX. (FAIXA V)</th><th>SUBIDA SOBRE A FAIXA I<br>II | III | IV | V</th><th>% REAJUSTE</th></tr></thead>
    <tbody>${vis.map(row).join('')}</tbody></table></div>
    <div class="faint" style="font-size:12px;margin-top:8px">Salário referência = média salarial dos colaboradores do cargo (aba Média Salarial) ou valor fixo, mais o % de reajuste. Faixas: I = referência; V = referência × % máximo do nível; II, III e IV em degraus iguais. Clique num cargo para editar.</div>`;
    const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); drawTab(tsDoc_(), tsMedias_(tsDoc_())); if (id === 'tsQ') { const e2 = $('#tsQ'); e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } }; };
    bind('tsQ', 'q'); bind('tsBl', 'bl');
    $$('.ts-c').forEach(tr => tr.onclick = () => openTsCargo(tr.dataset.id, draw));
    $('#tsNovo').onclick = () => openTsCargo(null, draw);
    $('#tsReaj').onclick = () => openTsReajuste(draw);
    $('#tsNiv').onclick = () => openTsNiveis(draw);
    $('#tsExp').onclick = () => { const md = tsMedias_(d); let bl = '', gr = ''; const rows = []; d.itens.forEach(it => { if (it.t === 'bloco') bl = it.nome; else if (it.t !== 'cargo') gr = it.nome; else { const c = tsCalc_(d, it, md); rows.push([nMap[it.id], it.nome, it.nivel, it.cbo, bl.split('(')[0].trim(), gr, c.ref == null ? '' : c.ref, ...[0, 1, 2, 3, 4].map(i => c.fx[i] == null ? '' : c.fx[i]), c.ref == null ? '' : fmt(c.k * 100, 0) + '%', c.subida, fmt((+it.reaj || 0) * 100, 2) + '%', c.auto ? (c.md ? 'Média de ' + c.md.n : '') : 'Valor fixo']); } }); exportCSV('tabela_salarial', ['N', 'Cargo', 'Nível', 'CBO', 'Bloco', 'Grupo', 'Salário referência', 'Faixa I', 'Faixa II', 'Faixa III', 'Faixa IV', 'Faixa V', '% máximo', 'Subida sobre a Faixa I', '% reajuste', 'Base'], rows); };
  };
  // ---------- 📊 MÉDIA SALARIAL ----------
  const drawMedia = (d, medias) => {
    const cargos = d.itens.filter(i => i.t === 'cargo'), q = norm(f.mq || '');
    const lista = (d.colabs || []).map((c, i) => Object.assign({ i }, c)).filter(c => (!q || norm(c.cargo + ' ' + c.nome).includes(q)) && (!f.mc || norm(c.cargo) === norm(f.mc)));
    const resumo = cargos.map(it => ({ it, md: medias[norm(it.nome)] })).filter(x => !q || norm(x.it.nome).includes(q));
    const semCargo = (d.colabs || []).filter(c => !cargos.some(it => norm(it.nome) === norm(c.cargo)));
    $('#tsBody').innerHTML = `
    <div class="toolbar">
      <div class="input-icon search">${ic('search')}<input class="input" id="tsMq" placeholder="Buscar cargo ou colaborador" value="${h(f.mq || '')}" style="width:100%"></div>
      <select class="input" id="tsMc"><option value="">Todos os cargos</option>${cargos.map(it => `<option ${norm(f.mc) === norm(it.nome) && f.mc ? 'selected' : ''}>${h(it.nome)}</option>`).join('')}</select>
      <span class="spacer"></span>
      <button class="btn primary" id="tsAddC">${ic('plus')} Colaborador</button>
    </div>
    ${semCargo.length ? `<div class="card" style="border-color:var(--warn);margin-bottom:10px;font-size:13px">${ic('alert')} ${semCargo.length} colaborador(es) com cargo que não existe na tabela (não entram na média): ${h([...new Set(semCargo.map(c => c.cargo))].join(', '))}</div>` : ''}
    <div class="ts-med">
      <div class="card"><div class="card-h"><h3>Colaboradores</h3><span class="sub">${lista.length} de ${(d.colabs || []).length}</span></div><div id="tsCol"></div></div>
      <div class="card"><div class="card-h"><h3>Média por cargo</h3><span class="sub">alimenta o salário referência</span></div><div id="tsRes"></div></div>
    </div>`;
    table($('#tsCol'), 'tscol', [
      { t: 'Cargo', k: 'cargo', r: x => h(x.cargo) },
      { t: 'Colaborador', k: 'nome', r: x => `<b>${h(x.nome)}</b>` },
      { t: 'Salário', k: 'salario', sort: x => +x.salario || 0, r: x => x.salario ? brl(x.salario) : '—' }
    ], lista, x => openTsColab(x.i, draw));
    table($('#tsRes'), 'tsres', [
      { t: 'Cargo', k: 'nome', r: x => `<b>${h(x.it.nome)}</b>` },
      { t: 'Nív.', k: 'nivel', w: '50px', r: x => h(x.it.nivel || '') },
      { t: 'Nº colab.', k: 'n', w: '80px', sort: x => x.md ? x.md.n : 0, r: x => x.md ? x.md.n : 0 },
      { t: 'Média salarial', k: 'm', sort: x => x.md ? x.md.media : 0, r: x => x.md ? brl(x.md.media) : '<span class="faint">—</span>' }
    ], resumo, x => { f.mc = x.it.nome; saveF(); drawMedia(tsDoc_(), tsMedias_(tsDoc_())); });
    const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); drawMedia(tsDoc_(), tsMedias_(tsDoc_())); if (id === 'tsMq') { const e2 = $('#tsMq'); e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } }; };
    bind('tsMq', 'mq'); bind('tsMc', 'mc');
    $('#tsAddC').onclick = () => openTsColab(null, draw, f.mc);
  };
  // ---------- 📈 PROGRESSÃO POR MÉRITO ----------
  const drawProg = d => {
    const P = d.prog || [];
    let html = '', tab = null;
    const fecha = () => { if (tab) { html += tab + '</tbody></table></div>'; tab = null; } };
    P.forEach((r, i) => {
      const [a, b, c, e] = r;
      if (a && !b && !c && !e) { fecha(); html += `<h3 class="ts-pt" data-pi="${i}">${h(a)}</h3>`; return; }
      if (b && !c && !e) { fecha(); html += `<div class="ts-pn" data-pi="${i}">${h(b)}</div>`; return; }
      const cab = [b, c, e].every(x => x && x === x.toUpperCase() && x.length < 40);
      if (cab) { fecha(); tab = `<div class="tbl-wrap"><table class="tbl ts-pg"><thead><tr><th>${h(b)}</th><th>${h(c)}</th><th>${h(e)}</th></tr></thead><tbody>`; return; }
      const linha = `<tr data-pi="${i}"><td><b>${h(b)}</b></td><td>${h(c)}</td><td>${h(e)}</td></tr>`;
      if (tab) tab += linha; else html += `<div class="tbl-wrap"><table class="tbl ts-pg"><tbody>${linha}</tbody></table></div>`;
    });
    fecha();
    $('#tsBody').innerHTML = `<div class="toolbar"><span class="spacer"></span><button class="btn" id="tsPEd">${ic('edit')} Editar textos</button></div><div class="card ts-prog">${html || '<p class="muted">Sem conteúdo.</p>'}</div>`;
    $$('[data-pi]').forEach(el => { el.style.cursor = 'pointer'; el.onclick = () => openTsProg(+el.dataset.pi, draw); });
    $('#tsPEd').onclick = () => toast('Clique em qualquer linha, título ou nota para editar.');
  };
  draw();
  const rt = S.rt;
  try { const j = await api('tsGet', {}, { silent: true }); if (rt !== S.rt || $('.overlay')) return; if (JSON.stringify(j.doc) !== JSON.stringify(tsDoc_())) { tsSetDoc_(j.doc || null); draw(); } }
  catch (e) { if (tsDoc_() === undefined) { v.innerHTML = `<div class="card muted">${h(e.message)}</div>`; } else toast(e.message, true); }
}

function openTsCargo(id, done) {
  const d = tsDoc_(), it0 = id ? d.itens.find(x => x.id === id) : null;
  const it = Object.assign({ nome: '', nivel: 'N7', cbo: '', ref: null, reaj: 0 }, it0 || {});
  const grupos = d.itens.filter(x => x.t !== 'cargo');
  const md = tsMedias_(d)[norm(it.nome)];
  const colabs = (d.colabs || []).filter(c => norm(c.cargo) === norm(it.nome));
  const niveis = Object.keys(d.niveis || {}).filter(k => k !== 'outros').concat(['N8', 'N9']).filter((x, i, a) => a.indexOf(x) === i);
  modal({
    title: it0 ? 'Cargo · ' + it.nome : 'Novo cargo', icon: 'table', wide: true,
    body: `<div class="row2"><div class="field"><label>Cargo</label><input class="input" id="tcN" value="${h(it.nome)}"></div><div class="field"><label>CBO</label><input class="input" id="tcC" value="${h(it.cbo)}" placeholder="Ex.: 4211-25"></div></div>
      <div class="row2"><div class="field"><label>Nível</label><select class="input" id="tcV">${niveis.map(n => `<option ${n === it.nivel ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${it0 ? '' : `<div class="field"><label>Grupo</label><select class="input" id="tcG">${grupos.map(g => `<option value="${h(g.id)}">${g.t === 'bloco' ? '■ ' : g.t === 'sub' ? '   · ' : ''}${h(g.nome.split('(')[0].trim())}</option>`).join('')}</select></div>`}</div>
      <div class="field"><label>Salário referência</label><div class="seg" id="tcM"><button data-v="auto" class="${it.ref == null ? 'on' : ''}">Automático (média)</button><button data-v="fixo" class="${it.ref != null ? 'on' : ''}">Valor fixo</button></div>
        <div id="tcAuto" class="muted" style="font-size:13px;margin-top:6px">${md ? `Média de ${md.n} colaborador(es): <b>${brl(md.media)}</b>` : 'Nenhum colaborador deste cargo na aba Média Salarial.'}</div>
        <input class="input mt" id="tcR" inputmode="decimal" placeholder="Ex.: 2.500,00" value="${it.ref != null ? fmt(it.ref) : ''}" style="${it.ref == null ? 'display:none' : ''}"></div>
      <div class="field"><label>% reajuste (dissídio/opcional)</label><input class="input" id="tcP" inputmode="decimal" value="${it.reaj ? fmt(it.reaj * 100, 2) : '0'}" style="max-width:140px"></div>
      <div id="tcPrev"></div>
      ${colabs.length ? `<details class="mt"><summary class="muted" style="cursor:pointer">Colaboradores na média (${colabs.length})</summary><div style="font-size:13px;margin-top:6px">${colabs.map(c => `${h(c.nome)} · ${brl(c.salario)}`).join('<br>')}</div></details>` : ''}`,
    foot: `${it0 ? `<button class="btn danger ghost" id="tcDel" style="margin-right:auto">${ic('trash')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="tcOk">Salvar</button>`,
    onMount: m => {
      let modo = it.ref == null ? 'auto' : 'fixo';
      const ler = () => ({ nome: $('#tcN', m.el).value.trim(), cbo: $('#tcC', m.el).value.trim(), nivel: $('#tcV', m.el).value, ref: modo === 'fixo' ? tsNum($('#tcR', m.el).value) : null, reaj: (tsNum($('#tcP', m.el).value) || 0) / 100 });
      const prev = () => { const x = Object.assign({}, it, ler()); const c = tsCalc_(d, x); $('#tcPrev', m.el).innerHTML = c.ref == null ? '' : `<div class="ts-prev">${['Ref.', 'I', 'II', 'III', 'IV', 'V'].map((t, i) => `<div><span>${t === 'Ref.' ? 'Referência' : 'Faixa ' + t}</span><b>${brl(i ? c.fx[i - 1] : c.ref)}</b></div>`).join('')}</div>`; };
      $$('#tcM button', m.el).forEach(b => b.onclick = () => { modo = b.dataset.v; $$('#tcM button', m.el).forEach(x => x.classList.toggle('on', x === b)); $('#tcR', m.el).style.display = modo === 'fixo' ? '' : 'none'; prev(); });
      ['tcN', 'tcR', 'tcP', 'tcV'].forEach(i => $('#' + i, m.el).addEventListener('input', prev)); $('#tcV', m.el).onchange = prev;
      prev();
      $('#tcOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const x = ler(); if (!x.nome) throw new Error('Informe o cargo.');
        if (modo === 'fixo' && x.ref == null) throw new Error('Informe o valor fixo.');
        const g = it0 ? null : $('#tcG', m.el).value;
        m.close();
        await tsSalvar_((it0 ? 'Cargo alterado: ' : 'Cargo criado: ') + x.nome, dd => {
          if (it0) { const t = dd.itens.find(y => y.id === id); if (norm(t.nome) !== norm(x.nome)) dd.colabs.forEach(c => { if (norm(c.cargo) === norm(t.nome)) c.cargo = x.nome; }); Object.assign(t, x); }
          else { let i = dd.itens.findIndex(y => y.id === g); i++; while (i < dd.itens.length && dd.itens[i].t === 'cargo') i++; dd.itens.splice(i, 0, Object.assign({ id: 'c' + Date.now().toString(36), t: 'cargo' }, x)); }
        });
        toast('Cargo salvo'); done();
      });
      const del = $('#tcDel', m.el); if (del) del.onclick = async () => {
        if (!await confirmBox(`Excluir o cargo <b>${h(it.nome)}</b> da tabela salarial?`, 'Excluir', true)) return;
        m.close(); await tsSalvar_('Cargo excluído: ' + it.nome, dd => { dd.itens = dd.itens.filter(y => y.id !== id); }); done();
      };
    }
  });
}
function openTsReajuste(done) {
  const d = tsDoc_(), blocos = d.itens.filter(i => i.t === 'bloco');
  modal({
    title: '🔄 Aplicar reajuste de dissídio', icon: 'trend',
    body: `<p class="muted" style="margin-top:0">Coloca o % na coluna <b>% REAJUSTE</b> dos cargos escolhidos. O salário referência e as faixas I a V são recalculados na hora.</p>
      <div class="row2"><div class="field"><label>% de reajuste</label><input class="input" id="trP" inputmode="decimal" placeholder="Ex.: 5,5"></div>
      <div class="field"><label>Aplicar em</label><select class="input" id="trB"><option value="">Todos os cargos</option>${blocos.map(b => `<option value="${h(b.id)}">${h(b.nome.split('(')[0].trim())}</option>`).join('')}</select></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="trF"> Incorporar ao salário (o valor reajustado vira o novo salário fixo e o % volta a zero)</label>
      ${(d.reajustes || []).length ? `<div class="faint" style="font-size:12px;margin-top:10px">Últimos: ${d.reajustes.slice(-5).reverse().map(r => `${fmt(r.p * 100, 2)}% em ${new Date(r.em).toLocaleDateString('pt-BR')} (${h(r.escopo)}, ${h(r.por)})`).join(' · ')}</div>` : ''}`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="trOk">Aplicar</button>`,
    onMount: m => {
      $('#trOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const p = tsNum($('#trP', m.el).value); if (p == null) throw new Error('Informe o %.');
        const bl = $('#trB', m.el).value, inc = $('#trF', m.el).checked, escopo = bl ? blocos.find(b => b.id === bl).nome.split('(')[0].split('—')[0].trim() : 'todos os cargos';
        if (!await confirmBox(`Aplicar <b>${fmt(p, 2)}%</b> em ${h(escopo)}${inc ? ' e incorporar ao salário' : ''}?`, 'Aplicar')) return;
        m.close();
        await tsSalvar_(`Reajuste de ${fmt(p, 2)}% (${escopo})${inc ? ' incorporado' : ''}`, dd => {
          const md = tsMedias_(dd); let dentro = !bl;
          dd.itens.forEach(it => {
            if (it.t === 'bloco') dentro = !bl || it.id === bl;
            if (it.t !== 'cargo' || !dentro) return;
            if (inc) { const c = tsCalc_(dd, Object.assign({}, it, { reaj: p / 100 }), md); if (c.ref != null) { it.ref = c.ref; it.reaj = 0; } }
            else it.reaj = p / 100;
          });
          (dd.reajustes = dd.reajustes || []).push({ p: p / 100, escopo, inc, em: new Date().toISOString(), por: S.user.nome });
        });
        toast('Reajuste aplicado'); done();
      });
    }
  });
}
function openTsNiveis(done) {
  const d = tsDoc_(), nv = Object.assign({}, d.niveis || {});
  const ks = Object.keys(nv).filter(k => k !== 'outros');
  modal({
    title: '% máximo por nível (Faixa V)', icon: 'settings',
    body: `<p class="muted" style="margin-top:0">A Faixa V é o salário referência × este %. As faixas II, III e IV ficam em degraus iguais entre a I e a V.</p>
      <div class="ts-niv">${ks.map(k => `<div class="field"><label>${k}</label><input class="input" data-nv="${k}" inputmode="decimal" value="${fmt(nv[k] * 100, 0)}"></div>`).join('')}<div class="field"><label>Demais níveis</label><input class="input" data-nv="outros" inputmode="decimal" value="${fmt((nv.outros || 1.2) * 100, 0)}"></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="tnOk">Salvar</button>`,
    onMount: m => {
      $('#tnOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const novo = {}; $$('[data-nv]', m.el).forEach(i => { const n = tsNum(i.value); if (n == null || n < 100) throw new Error('Valores a partir de 100%.'); novo[i.dataset.nv] = n / 100; });
        m.close(); await tsSalvar_('% máximo por nível alterado', dd => { dd.niveis = novo; }); toast('Níveis salvos'); done();
      });
    }
  });
}
function openTsColab(i, done, cargoPadrao) {
  const d = tsDoc_(), c0 = i != null ? d.colabs[i] : null, c = Object.assign({ cargo: cargoPadrao || '', nome: '', salario: null }, c0 || {});
  const cargos = d.itens.filter(x => x.t === 'cargo').map(x => x.nome);
  modal({
    title: c0 ? 'Colaborador na média' : 'Adicionar colaborador à média', icon: 'users',
    body: `<div class="field"><label>Cargo</label><select class="input" id="tkC">${cargos.map(n => `<option ${norm(n) === norm(c.cargo) ? 'selected' : ''}>${h(n)}</option>`).join('')}${c.cargo && !cargos.some(n => norm(n) === norm(c.cargo)) ? `<option selected>${h(c.cargo)}</option>` : ''}</select></div>
      <div class="field"><label>Colaborador</label><input class="input" id="tkN" value="${h(c.nome)}"></div>
      <div class="field"><label>Salário (R$)</label><input class="input" id="tkS" inputmode="decimal" value="${c.salario ? fmt(c.salario) : ''}"></div>`,
    foot: `${c0 ? `<button class="btn danger ghost" id="tkDel" style="margin-right:auto">${ic('trash')} Remover</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="tkOk">Salvar</button>`,
    onMount: m => {
      $('#tkOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const x = { cargo: $('#tkC', m.el).value, nome: $('#tkN', m.el).value.trim(), salario: tsNum($('#tkS', m.el).value) };
        if (!x.nome || !x.salario) throw new Error('Informe colaborador e salário.');
        m.close(); await tsSalvar_((c0 ? 'Média: colaborador alterado: ' : 'Média: colaborador incluído: ') + x.nome, dd => { if (c0) dd.colabs[i] = x; else dd.colabs.push(x); }); done();
      });
      const del = $('#tkDel', m.el); if (del) del.onclick = async () => { if (!await confirmBox(`Remover <b>${h(c.nome)}</b> da média salarial?`, 'Remover', true)) return; m.close(); await tsSalvar_('Média: colaborador removido: ' + c.nome, dd => { dd.colabs.splice(i, 1); }); done(); };
    }
  });
}
function openTsProg(i, done) {
  const d = tsDoc_(), r = (d.prog[i] || ['', '', '', '']).slice();
  modal({
    title: 'Editar progressão por mérito', icon: 'edit', wide: true,
    body: ['Título / coluna A', 'Coluna B', 'Coluna C', 'Coluna D'].map((l, k) => `<div class="field"><label>${l}</label><textarea class="input" data-pc="${k}" rows="${r[k] && r[k].length > 80 ? 4 : 1}">${h(r[k] || '')}</textarea></div>`).join(''),
    foot: `<button class="btn danger ghost" id="tpDel" style="margin-right:auto">${ic('trash')} Excluir linha</button><button class="btn" id="tpAdd">${ic('plus')} Inserir linha abaixo</button><button class="btn" data-close>Cancelar</button><button class="btn primary" id="tpOk">Salvar</button>`,
    onMount: m => {
      const ler = () => $$('[data-pc]', m.el).map(t => t.value.trim());
      $('#tpOk', m.el).onclick = e => run(e.currentTarget, async () => { const x = ler(); m.close(); await tsSalvar_('Progressão por mérito alterada', dd => { dd.prog[i] = x; }); done(); });
      $('#tpAdd', m.el).onclick = async () => { m.close(); await tsSalvar_('Progressão: linha inserida', dd => { dd.prog.splice(i + 1, 0, ['', '(nova linha)', '', '']); }); done(); openTsProg(i + 1, done); };
      $('#tpDel', m.el).onclick = async () => { if (!await confirmBox('Excluir esta linha?', 'Excluir', true)) return; m.close(); await tsSalvar_('Progressão: linha excluída', dd => { dd.prog.splice(i, 1); }); done(); };
    }
  });
}

// quem (além dos administradores) pode usar a pesquisa salarial
function openPesqAcesso() {
  modal({
    title: 'Acesso a Cargos e salários', icon: 'shield',
    body: `<p class="muted" style="margin-top:0">Administradores sempre têm acesso. Marque abaixo quem mais pode ver e editar a Tabela salarial e a Pesquisa salarial (sem virar administrador).</p><div id="pqAcL"><div class="sk" style="height:80px"></div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pqAcOk">Salvar</button>`,
    onMount: async m => {
      const el = $('#pqAcL', m.el);
      try {
        const us = (usersCache_() || await usersBuscar_()).filter(u => u.perfil !== 'ADMIN' && u.ativo);
        const ids = (await api('pesqAcesso', {}, { silent: true })).ids || [];
        if (!$('#pqAcL', m.el)) return;
        el.innerHTML = us.length ? chipPicker('pqac', us.map(u => u.id), ids.join(', ')) : '<span class="muted">Nenhum usuário sem perfil de administrador.</span>';
        bindPickers(el);
        $$('[data-picker=pqac] .chip', el).forEach(c => { const u = us.find(x => x.id === c.dataset.v); c.textContent = u ? u.nome + (u.cargo ? ' · ' + u.cargo : '') : c.dataset.v; });
      } catch (e) { el.innerHTML = `<span class="muted">${h(e.message)}</span>`; }
      $('#pqAcOk', m.el).onclick = ev => run(ev.currentTarget, async () => { await api('setPesqAcesso', { ids: splitMulti(pickVal(el, 'pqac')) }); m.close(); toast('Acesso salvo. A pessoa vê o módulo ao entrar de novo ou atualizar a página.'); });
    }
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
    body: `<p class="muted" style="margin-top:0">Use quando a pessoa <b>desistiu na contratação</b>. Ela some do sistema e <b>não entra nos desligamentos</b>. Na planilha, a linha fica com o status <b>Excluído</b>, só como registro.${K.envio && lista.some(r => /ENVIADO/.test(envioDP(r))) ? ' A admissão já enviada ao DP também é <b>excluída da Central</b>.' : ''}</p>
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
  // nova posição vai para o fim do setor (depois das pessoas)
  const nr = s.linhas.length ? s.linhas[s.linhas.length - 1].row + 1 : (s.padraoRow || s.row) + 2;
  shiftLoja_(l, nr, 1);
  const r = { row: nr, qt: +qt || 1, nome: '', funcao: String(funcao || '').toUpperCase(), contrato: contrato || 'INTEGRAL', situacao: 'VAGA', tag: '', tempo: '', meses: null, vid: '', loja: l.key, setor: s.nome,
    info: { etapa: 'Aberta', responsavel: resp || S.user.nome, abertura: todayISO(), previsao: '', candidatos: '', motivo: motivo || 'Aumento de quadro', obs: '', hist: [{ e: 'Aberta', d: todayISO() }] } };
  s.linhas.push(r);
  return nr;
}
// reordena uma linha dentro do setor (as linhas entre a origem e o destino precisam ser contínuas)
function moverOk_(s, de, para) {
  const i = s.linhas.findIndex(x => x.row === +de), j = s.linhas.findIndex(x => x.row === +para);
  if (i < 0 || j < 0 || i === j) return null;
  const a = Math.min(i, j), b = Math.max(i, j);
  for (let k = a; k < b; k++) if (s.linhas[k + 1].row !== s.linhas[k].row + 1) return null;
  return { i, j };
}
function localMover_(p) {
  const l = lojaBy(p.loja); if (!l) return false;
  const s = l.setores.find(x => x.linhas.some(y => y.row === +p.row)); if (!s) return false;
  const ix = moverOk_(s, p.row, p.para); if (!ix) return false;
  const r = s.linhas[ix.i];
  if (p.expect && (norm(r.nome) !== norm(p.expect.nome) || norm(r.funcao) !== norm(p.expect.funcao))) return false;
  const nums = s.linhas.map(x => x.row);
  s.linhas.splice(ix.i, 1); s.linhas.splice(ix.j, 0, r);
  s.linhas.forEach((x, k) => { x.row = nums[k]; });
  return true;
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
  moverLinha: p => { localMover_(p); },
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
  const hdr = C.header.filter(k => !/^COL\d+$/.test(k) && (r || k !== K.status) && k !== K.envio);
  modal({
    title: r ? h(r[K.colab]) : 'Nova contratação', icon: 'userplus', wide: true,
    body: `<div class="ckp" id="ckp"></div><div class="row2">${hdr.map(field).join('')}</div>
      <datalist id="dlCF">${allFuncoes().map(x => `<option value="${h(x)}">`).join('')}</datalist>
      <datalist id="dlCS">${uniq(S.all.map(x => x.setor)).map(x => `<option value="${h(x)}">`).join('')}</datalist>
      ${novo ? `<div class="card mt" style="background:var(--surface2);padding:14px${edQ ? '' : ';display:none'}"><div class="field" style="margin:0"><label>${ic('swap')} Vaga do quadro que será preenchida</label><select class="input" id="ncV"></select><div class="muted" style="font-size:12px;margin-top:6px" id="ncHint"></div></div></div>` : ''}`,
    foot: ed ? `${edQ && r && r._pend && lojaBy(r._loja) ? `<button class="btn" data-a="aloc" style="margin-right:auto">${ic('swap')} Alocar no quadro</button><button class="btn ghost" data-a="alocM" title="Escolher a vaga manualmente">Escolher vaga</button>` : ''}${edQ && r && !r._deslig ? `<button class="btn danger" data-a="desl">${ic('door')} Desligado</button>` : ''}${edQ && r && S.ck.status ? `<button class="btn danger ghost" data-a="exc" title="Desistiu na contratação">${ic('trash')} Excluir</button>` : ''}${podeEnviarDP(r) ? `<button class="btn ok" data-a="edp" title="Registrar a admissão no sistema do DP">${ic('share')} Enviar ao DP</button>` : r && K.envio && /ENVIADO/.test(envioDP(r)) ? `<span class="badge b-ok" style="align-self:center">${ic('check')} Enviado ao DP</span>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" data-a="ok">Salvar</button>` : '<button class="btn" data-close>Fechar</button>',
    onMount: m => {
      const a = $('[data-a=aloc]', m.el); if (a) a.onclick = () => { m.close(); openAlocar(r); }; const am = $('[data-a=alocM]', m.el); if (am) am.onclick = () => { m.close(); openAlocar(r, true); };
      const dsl = $('[data-a=desl]', m.el); if (dsl) dsl.onclick = () => { m.close(); openMarcarDesl([r]); };
      const exc = $('[data-a=exc]', m.el); if (exc) exc.onclick = () => { m.close(); openExcluirContr([r]); };
      const edp = $('[data-a=edp]', m.el); if (edp) edp.onclick = () => { m.close(); openEnviarDP(r); };
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
