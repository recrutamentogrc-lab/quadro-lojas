/* =====================================================================
 * QUADRO DE LOJAS · GRC — Frontend
 * ===================================================================== */
(function () {
'use strict';
const CFG = window.GRC_CONFIG || {};
const QS = new URLSearchParams(location.search);
const DEMO = QS.has('demo');
const API_OK = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '');

const LC = { MATRIZ: '#22d3ee', MESSEJANA: '#a78bfa', TORRA: '#f59e0b', EUSEBIO: '#34d399', GRC: '#f5c451' };
const LOJA_NOMES = { MATRIZ: 'Matriz', MESSEJANA: 'Messejana', TORRA: 'Torra', EUSEBIO: 'Eusébio', GRC: 'GRC (Adm.)' };
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
const lojaKey = t => { const u = norm(t); if (!u) return ''; { const ex = Object.keys(LOJA_NOMES).find(k => !['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO', 'GRC'].includes(k) && (u === k || u.includes(norm(LOJA_NOMES[k])) || u.includes(k.replace(/_/g, ' ')))); if (ex) return ex; } if (/MATRIZ|SANTA ROSA/.test(u)) return 'MATRIZ'; if (/MESSEJANA/.test(u)) return 'MESSEJANA'; if (/TORRA/.test(u)) return 'TORRA'; if (/EUSEBIO|FRALDA/.test(u)) return 'EUSEBIO'; if (/GRC|ADM/.test(u)) return 'GRC'; return u; };
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
  if (!S.data || !PEND.length) return;
  try { derive(); } catch (e) { return; }
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
async function send_(action, payload) {
  if (DEMO) return window.GRC_MOCK.call(action, payload);
  if (!API_OK) throw new Error('Sistema ainda não conectado: configure a URL do Apps Script no arquivo config.js.');
  const body = JSON.stringify(Object.assign({ action, token: S.token, rid: Date.now().toString(36) + Math.random().toString(36).slice(2, 10) }, payload));
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
  } else { renderLogin(); refreshPublicCfg(); }
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
        <div class="hero-stat"><b>Tempo real</b><span>Lê e grava no Google Sheets</span></div>
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
  $('#forgot').onclick = e => { e.preventDefault(); forgotPassword($('#loginForm input[name=login]').value); };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = $('button[type=submit]', e.target);
    const err = $('#loginErr');
    err.classList.add('hidden');
    btn.disabled = true;
    try {
      const j = await api('login', { login: fd.get('login'), senha: fd.get('senha') });
      S.token = j.token; if (!DEMO) { ls.set('grc_token', j.token); if (j.keys) ls.set('grc_keys', j.keys); } if (j.user) S.user = j.user;
      await loadAll();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    finally { btn.disabled = false; }
  };
}

async function logout(expired) {
  if (!expired && pendentesEnvio > 0) { toast('Aguardando terminar de salvar as alterações…'); await filaEnvio.catch(() => {}); }
  if (S.token && !expired && !DEMO) api('logout').catch(() => {});
  $$('.overlay').forEach(o => o.remove());
  PEND.length = 0; S.sel = null; S.selCache = null;
  try { if (window.OneSignal && window.OneSignal.logout) window.OneSignal.logout(); } catch (e) {}
  try { fbStop(); } catch (e) {} liveBooted = false;
  S.token = null; S.user = null; S.data = null; ls.del('grc_token'); ls.del('grc_data'); ls.del('grc_keys');
  if (DEMO) { location.href = location.pathname; return; }
  renderLogin(expired ? 'Sua sessão expirou. Entre novamente.' : '');
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
function fbStop() { fbUnsubs.forEach(u => { try { u(); } catch (e) {} }); fbUnsubs = []; live = {}; liveOn = false; fbKeysSig = ''; }
function startLive(keys) {
  const sig = JSON.stringify(keys);
  if (liveOn && sig === fbKeysSig) return Promise.resolve(true);
  if (!fbDb) { firebase.initializeApp(CFG.FIREBASE); fbDb = firebase.firestore(); }
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
  if (/^(historico|admin|aprovacoes|solicitacoes|perfil|recrutamento)$/.test(pg)) return;
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
    pendentes: prev.pendentes || [], notif: prev.notif, log: prev.log || [],
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
  startPolling(); initOneSignal(); carregarAcessoSel(); carregarFotos();
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
      ideal: l.ideal || sum(l.setores, s => s.pad),
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
  S.ck = { data: H[0] || 'DATA', loja: find(/^LOJA/), colab: find(/COLABORADOR|NOME/), setor: find(/SETOR/), funcao: find(/FUNC/), aso: find(/ASO/), hcm: find(/HCM|EXPORT/), contrato: find(/CONTRATO/), status: find(/STATUS/) };
  (C.rows || []).forEach(r => {
    r._loja = lojaKey(r[S.ck.loja]);
    r._deslig = /DESLIG/.test(norm(r[S.ck.status]));
    r._pend = !/ALOCAD/.test(norm(r[S.ck.status])) && !r._deslig;
    r._data = parseBR(r[S.ck.data]);
    r._consta = r._pend && S.desl.has(norm(r[S.ck.colab]));
    r._noQuadro = !!S.nomesQuadro && S.nomesQuadro.has(norm(r[S.ck.colab]));
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
const opc = (l, k) => {
  const o = (l && l.opcoes && l.opcoes[k]) || [];
  // tags padrão (CIPA, PCD, Aprendiz, Lider Trainee) sempre disponíveis em todas as lojas
  const base = k === 'tag' ? [...(isAdmLoja(l) ? SEN.map(x => x.k) : []), ...o, ...DEF_OPC.tag] : [...o, ...(o.length ? [] : DEF_OPC[k] || [])];
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
    <div class="sb-label">Recrutamento</div>
    ${navItem('/vagas', ic('briefcase'), 'Vagas', `<span class="cnt hot">${S.tot.vagas}</span><span class="badge-mini"></span>`)}
    ${navItem('/sla', ic('gauge'), 'SLA de vagas', S.slaEst ? `<span class="cnt hot" title="SLA estourado">${S.slaEst}</span>` : '')}
    ${navItem('/contratacoes', ic('userplus'), 'Contratações', nC ? `<span class="cnt">${nC}</span>` : '')}
    ${temSel() ? navItem('/recrutamento', ic('target'), 'Seleções') : ''}
    ${navItem('/experiencias', ic('clock'), 'Experiências', nE ? `<span class="cnt hot">${nE}</span>` : '')}
    ${navItem('/desligamentos', ic('door'), 'Desligamentos')}
    ${isAdmin() ? `<div class="sb-label">Administração</div>${navItem('/aprovacoes', ic('check'), 'Aprovações', S.notif.pendentes ? `<span class="cnt hot">${S.notif.pendentes}</span><span class="badge-mini"></span>` : '')}${navItem('/admin', ic('shield'), 'Acessos e configurações')}${navItem('/historico', ic('history'), 'Histórico')}` : `<div class="sb-label">Solicitações</div>${navItem('/solicitacoes', ic('file'), 'Minhas solicitações', (S.data.pendentes || []).length ? `<span class="cnt">${S.data.pendentes.length}</span>` : '')}`}
  `;
  const sb = $('#sbBrand'); if (sb) sb.innerHTML = `${brandHTML()}<div class="brand-txt">${h(cfgv('sistema', 'Quadro de Lojas'))}<small>${h(cfgv('empresa', 'Grupo R Center'))}</small></div>`;
  const nlB = $('#navNovaLoja'); if (nlB) nlB.onclick = e => { e.preventDefault(); openNovaLoja(); };
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
    else if (page === 'sla') pgSLA();
    else if (page === 'desligamentos') pgDesl();
    else if (page === 'recrutamento' && temSel()) pgRecrut();
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
function expTitulo(name) { return EXP_TIT[name] || (name.indexOf('quadro_') === 0 ? 'Quadro · ' + ((lojaBy(name.slice(7).toUpperCase()) || {}).nome || name.slice(7)) : name); }
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
    el.innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c, i) => `<th data-i="${i}" class="${st.i === i ? 'sorted' : ''}" style="${c.w ? 'width:' + c.w : ''}">${c.th || h(c.t)}${st.i === i ? (st.d > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((r, ri) => `<tr data-ri="${ri}" class="${onRow ? 'click' : ''}">${cols.map(c => `<td>${c.r ? c.r(r) : h(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="card empty">${ic('search')}<div>Nenhum registro com esses filtros.</div></div>`;
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
  if (S.slaEst) alerts.push({ c: 'c-red', i: 'gauge', t: `${S.slaEst} vaga(s) com SLA estourado`, s: 'Acima da meta de dias para fechar', href: '#/sla' });
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
  const SIT = [['', 'Todos', () => true], ['ok', 'Ocupadas', r => r.nome && !r.isVaga], ['vaga', 'Vagas abertas', r => r.vagaAberta], ['fut', 'Vagas futuras', r => r.vagaFutura], ['aviso', 'Em aviso', r => r.aviso], ['aprendiz', 'Aprendizes', r => r.aprendiz], ['pcd', 'PCD', r => r.pcd], ['cipa', 'CIPA', r => r.cipa], ['estagio', 'Estágio', r => r.estagio], ['trainee', 'Trainee', r => r.trainee]];
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
      $$('[data-lider]', body).forEach(b => b.onclick = e => { e.stopPropagation(); if (ed) openLider(l, b.dataset.lider, draw); });
      if (S.hl) { const el = $(`.prow[data-row="${S.hl}"]`, body); if (el) el.closest('.sec').classList.remove('collapsed'); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); S.hl = null; }
    }
  };
  const bind = (id, k) => { const el = $('#' + id); el.oninput = el.onchange = () => { f[k] = el.value; saveF(); drawChips(); draw(); }; };
  bind('fq', 'q'); bind('fSetor', 'setor'); bind('fFunc', 'func'); bind('fContr', 'contr'); bind('fTag', 'tag');
  $('#exp').onclick = () => exportCSV('quadro_' + l.key.toLowerCase(), ['Loja', 'Setor', 'QT', 'Colaborador', 'Função', 'Contrato', 'Situação', 'Tag', 'Tempo de empresa'], filt().map(r => [l.nome, r.setor, fmt(r.qt), r.nome, r.funcao, r.contrato, r.situacao, r.tag, r.tempo]));
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
      ${r.nome && ed ? `<label class="photo-drop" id="cfDrop" style="margin-bottom:16px"><span id="cfAv">${avatar(r.nome, '', 'lg')}</span><div><b>${ic('camera')} ${fotoColab(r.nome) ? 'Trocar foto' : 'Colocar foto'}</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem. Ela aparece no lugar das iniciais em todo o sistema.</div>${cfgv(fotoKey(r.nome), '') ? '<button class="btn sm danger" id="cfRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="cfFile" accept="image/*" hidden></label>` : ''}
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
        await run(null, async () => { await api('removerPosicao', { loja: l.key, row: r.row, expect: expectOf(r) }); m.close(); toast('Posição removida'); await loadAll(); });
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
          if (n > 1) await loadAll();
        }
        m.close(); toast(n + ' posição(ões) adicionada(s)'); await loadAll();
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
      { t: 'SLA', k: 'sla', r: r => slaBadge(r), sort: r => r.sla && r.sla.pct != null ? r.sla.pct : -1 },
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
      <label class="photo-drop" id="pDrop">${avatar(u.nome, u.foto, 'lg')}<div><b>${ic('camera')} Alterar foto</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div>${u.foto ? '<button class="btn sm danger" id="pRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="pFile" accept="image/*" hidden></label>
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
function resizeImg(file, size) {
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
function getLider(lk, setor) {
  const m = S.lideres && S.lideres[lk + '|' + setor];
  if (m && m.nome) return { nome: m.nome, foto: fotoDe(m.nome) };
  let v = cfgv(liderKey(lk, setor), null);
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  if (v && v.nome) return v;
  const a = liderAuto(lk, setor); return a ? Object.assign(a, { foto: fotoDe(a.nome) }) : null;
}
function liderChip(l, setor, ed) {
  const ld = getLider(l.key, setor);
  if (ld) { const p = String(ld.nome).trim().split(/\s+/); const nm = p.length > 1 ? p[0] + ' ' + p[p.length - 1] : p[0];
    return `<span class="sec-lider ${ed ? 'click' : ''}" data-lider="${h(setor)}" title="Líder: ${h(ld.nome)}${ed ? ' — clique para alterar' : ''}">${avatar(ld.nome, ld.foto, '')}<b>${h(nm)}</b></span>`; }
  return ed ? `<span class="sec-lider sec-lider-add click" data-lider="${h(setor)}" title="Definir líder do setor">${ic('plus')} definir líder</span>` : '';
}
function openLider(l, setor, done) {
  const atual = getLider(l.key, setor) || { nome: '', foto: '' };
  let foto = atual.foto || '';
  const m = modal({
    title: 'Líder do setor · ' + h(setor), icon: 'camera',
    body: `<label class="photo-drop" id="ldDrop" style="margin-bottom:16px"><span id="ldAv">${avatar(atual.nome || '?', foto, 'lg')}</span><div><b>${ic('camera')} <span id="ldFtLbl">${foto ? 'Trocar foto' : 'Colocar foto'}</span></b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div><button class="btn sm danger ${foto ? '' : 'hidden'}" id="ldFRm" style="margin-top:10px" type="button">Remover foto</button></div><input type="file" id="ldFile" accept="image/*" hidden></label>
      <div class="field"><label>Nome do líder</label><input class="input" id="ldN" maxlength="60" placeholder="Ex.: Maria Souza" value="${h(atual.nome)}"></div>`,
    foot: `${atual.nome ? '<button class="btn danger" id="ldDel" style="margin-right:auto">Remover líder</button>' : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ldOk">Salvar</button>`
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
    await api('setLiderSetor', { loja: l.key, setor, nome: valor ? valor.nome : '' });
    S.lideres = S.lideres || {}; if (valor) S.lideres[l.key + '|' + setor] = { nome: valor.nome }; else delete S.lideres[l.key + '|' + setor];
    guardarFotos_();
    toast(valor ? 'Líder de ' + setor + ' salvo' : 'Líder removido');
    m.close(); if (done) done();
  }).catch(() => {});
  $('#ldOk', el).onclick = e => { const nome = $('#ldN', el).value.trim(); if (!nome) return toast('Informe o nome do líder', true); salvar(e.currentTarget, { nome, foto }); };
  const del = $('#ldDel', el); if (del) del.onclick = async e => { if (!await confirmBox(`Remover o líder de <b>${h(setor)}</b>?`, 'Remover', true)) return; salvar(null, null); };
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
      <label class="photo-drop" id="afDrop"><span id="afAv">${avatar(S.user.nome, '', 'lg')}</span><div><b>${ic('camera')} Escolher foto</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem. No celular, dá para tirar na hora.</div></div><input type="file" id="afFile" accept="image/*" hidden></label>`,
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
      <div class="badge b-warn" style="white-space:normal;padding:10px 12px;line-height:1.5;display:block">O nome sai do quadro da loja, a posição vira <b>VAGA</b> (o SLA começa a contar hoje) e o colaborador deixa de aparecer em contratações pendentes e contratos de experiência. O registro fica no histórico de desligamentos.</div>`,
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
  try { busy(true); users = (await api('listUsers', {}, { silent: true })).users || []; const a = await api('selecoesAcesso', {}, { silent: true }); ids = a.ids || ids; }
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
      <p class="muted" style="font-size:12px">O SLA da vaga passa a contar a partir de hoje.</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn ok" id="arOk">${ic('check')} Aprovar requisição</button>`,
    onMount: m => {
      $$('input[name=md]', m.el).forEach(i => i.onchange = () => { $$('input[name=md]', m.el).forEach(x => x.parentElement.classList.toggle('on', x.checked)); $('#mdEx', m.el).classList.toggle('hidden', i.value !== 'existente' || !i.checked); $('#arPadW', m.el).classList.toggle('hidden', $('input[name=md]:checked', m.el).value !== 'nova'); });
      $('#arOk', m.el).onclick = e => run(e.currentTarget, async () => {
        const modo = $('input[name=md]:checked', m.el).value;
        const rows = $$('#mdEx input[type=checkbox]:checked', m.el).map(c => { const r = l.rows.find(x => x.row === +c.value); return { row: r.row, expect: expectOf(r) }; });
        if (modo === 'existente' && !rows.length) throw new Error('Selecione ao menos uma vaga ou escolha criar nova posição');
        await api('decidirSolicitacao', { id: s.id, aprovar: true, comentario: $('#arC', m.el).value, decisao: { modo, rows, responsavel: $('#arR', m.el).value, aumentarPadrao: modo === 'nova' && $('#arPad', m.el).checked } });
        m.close(); toast('Requisição aprovada — vaga aberta e SLA iniciado'); bgReload(); if (done) done();
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
const LOJAS_CONTR = ['Matriz', 'Messejana', 'Torra', 'Eusébio'];
function matchVagas(lk, funcao, setor) {
  const l = lojaBy(lk); if (!l) return [];
  const fx = norm(funcao).replace(/OP\.?\s*/, 'OPERADOR ').replace(/AUX\b/, 'AUXILIAR').replace(/[^A-Z ]/g, '').trim();
  const key = fx.split(' ')[0].slice(0, 5);
  const sx = norm(setor).split(/[\s-]/)[0];
  const score = r => (key && norm(r.funcao).startsWith(key) ? 0 : 4) + (sx && norm(r.setor).includes(sx) ? 0 : 2) + (r.vagaAberta ? 0 : 1);
  return l.rows.filter(r => r.isVaga).map(r => ({ r, sc: score(r) })).sort((a, b) => a.sc - b.sc).map(x => Object.assign(x.r, { _sc: x.sc }));
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
    todas: ['Todas', null, null], custom: ['Período', null, null]
  };
  const range = () => f.per === 'custom' ? [parseISO(f.de), parseISO(f.ate)] : [PER[f.per][1], PER[f.per][2]];
  const ativos = rows.filter(r => !r._deslig);
  const v = $('#view');
  v.innerHTML = `
  <div class="grid g4">
    ${kpi({ lbl: 'Admissões nesta semana', val: ativos.filter(r => r._data && r._data >= ws && r._data <= new Date(ws.getTime() + 6 * 864e5)).length, sub: `${ativos.filter(r => r._data && r._data >= new Date(ws.getTime() + 7 * 864e5) && r._data <= new Date(ws.getTime() + 13 * 864e5)).length} previstas para a próxima`, icon: 'calendar', c: 'c-cyan' })}
    ${kpi({ lbl: 'Pendentes de alocação', val: rows.filter(r => r._pend).length, sub: `${rows.filter(r => r._consta).length} constam como desligados`, icon: 'swap', c: 'c-amber' })}
    ${kpi({ lbl: 'ASO pendente', val: ativos.filter(r => K.aso && !/FEITO/.test(norm(r[K.aso]))).length, sub: 'Marcado ou aguardando', icon: 'file', c: 'c-red' })}
    ${kpi({ lbl: 'Não exportado ao HCM', val: ativos.filter(r => K.hcm && !/SIM/.test(norm(r[K.hcm]))).length, icon: 'refresh', c: 'c-violet' })}
  </div>
  <div class="card mt"><div class="card-h"><h3>Admissões por semana</h3><span class="sub">últimas 12 semanas + próximas 2</span></div><div class="chart-box sm"><canvas id="chWeek"></canvas></div></div>
  <div class="chips mt" id="perChips"></div>
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
  const drawPer = () => { $('#perChips').innerHTML = Object.entries(PER).filter(([k]) => k !== 'custom' || f.per === 'custom').map(([k, x]) => `<span class="chip ${f.per === k ? 'on' : ''}" data-k="${k}">${ic('calendar')} ${x[0]}${x[1] ? ` <span class="n">${fmtD(x[1]).slice(0, 5)}–${fmtD(x[2]).slice(0, 5)}</span>` : ''}</span>`).join(''); $$('#perChips .chip').forEach(c => c.onclick = () => { f.per = c.dataset.k; if (f.per !== 'custom') { f.de = ''; f.ate = ''; $('#cDe').value = ''; $('#cAte').value = ''; } saveF(); drawPer(); draw(); }); };
  const filt = () => {
    const q = norm(f.q); const [a, b] = range();
    return rows.filter(r => (f.desl || !r._deslig) && (!f.noq || (r._pend && r._noQuadro)) && (!f.cdes || r._consta) && (!q || norm(r[K.colab] + ' ' + r[K.funcao]).includes(q)) && (!f.loja || r._loja === f.loja) && (!f.st || r[K.status] === f.st) && (!f.aso || r[K.aso] === f.aso) && (!a || (r._data && r._data >= a)) && (!b || (r._data && r._data <= b))).sort((x, y) => (y._data || 0) - (x._data || 0));
  };
  const badgeFor = val => { const n = norm(val); if (!n) return '<span class="faint">—</span>'; return `<span class="badge ${/FEITO|SIM|ALOCAD/.test(n) ? 'b-ok' : /DESLIG/.test(n) ? 'b-bad' : /MARCADO/.test(n) ? 'b-info' : /AGUARD|PEND|NAO/.test(n) ? 'b-warn' : ''}">${h(val)}</span>`; };
  selScope('contr');
  const sel = SEL.set;
  const drawBulk = () => {
    const b = $('#cBulk'); b.classList.toggle('hidden', !sel.size);
    if (!sel.size) { b.innerHTML = ''; return; }
    const lista = rows.filter(r => sel.has(r.row));
    b.innerHTML = `<b>${sel.size} selecionada(s)</b><button class="btn sm ghost" id="bkAll">Selecionar todas as ${filt().filter(r => canEdit(r._loja) && !r._deslig).length} filtradas</button><span class="spacer"></span><button class="btn sm" id="bkClr">Limpar</button><button class="btn sm" id="bkSet">${ic('edit')} Alterar campo</button><button class="btn sm ok" id="bkAloc">${ic('check')} Marcar como alocado</button><button class="btn sm danger" id="bkDesl">${ic('door')} Desligado(s)</button>`;
    $('#bkClr').onclick = () => { sel.clear(); draw(); };
    $('#bkAll').onclick = () => { filt().filter(r => canEdit(r._loja) && !r._deslig).forEach(r => sel.add(r.row)); draw(); };
    $('#bkDesl').onclick = () => openMarcarDesl(lista, () => sel.clear());
    $('#bkAloc').onclick = () => contrBulk(lista, K.status, ((C.opcoes || {})[K.status] || []).find(x => /ALOCAD/i.test(x)) || 'Alocado', () => sel.clear());
    $('#bkSet').onclick = () => openContrBulkSet(lista, () => sel.clear());
  };
  const cols = [
    { t: '', k: '', nosort: true, w: '30px', th: canEdit() ? '<input type="checkbox" class="cSelAll">' : '', r: r => canEdit(r._loja) && !r._deslig ? `<input type="checkbox" data-stop data-sel="${r.row}" ${sel.has(r.row) ? 'checked' : ''}>` : '' },
    { t: K.data || 'Data', k: K.data, sort: r => r._data ? +r._data : null },
    { t: 'Loja', k: '_loja', r: r => lojaPill(r._loja) },
    { t: 'Colaborador', k: K.colab, r: r => `<div class="cell-person">${avatar(r[K.colab], '', 'sm soft')}<div><b>${h(r[K.colab])}</b>${r._consta ? '<div><span class="badge b-bad">consta como desligado</span></div>' : r._pend && r._noQuadro ? '<div><span class="badge b-ok">já está no quadro</span></div>' : r._pend && r._data && daysTo(r._data) < -30 ? `<div><span class="badge b-warn">pendente há ${-daysTo(r._data)} dias</span></div>` : ''}</div></div>` },
    { t: 'Setor', k: K.setor }, { t: 'Função', k: K.funcao },
    { t: 'ASO', k: K.aso, r: r => badgeFor(r[K.aso]) }, { t: 'HCM', k: K.hcm, r: r => badgeFor(r[K.hcm]) },
    { t: 'Contrato', k: K.contrato }, { t: 'Alocação', k: K.status, r: r => badgeFor(r[K.status]) },
    { t: '', k: '', nosort: true, r: r => r._pend && canEdit(r._loja) && lojaBy(r._loja) ? `<div style="display:flex;gap:6px" data-stop><button class="btn sm primary" data-aloc="${r.row}">${ic('swap')} Alocar</button><button class="btn sm" data-dsl="${r.row}" title="Já saiu da empresa">${ic('door')}</button></div>` : '' }
  ];
  const bindRows = el => {
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
    body.innerHTML = keys.length ? keys.map(k => { const g = groups[k]; const a = parseISO(k); const atual = a && +a === +ws; return `<div class="week ${atual ? 'cur' : ''}"><div class="week-h"><b>${a ? `Semana de ${fmtD(a)} a ${fmtD(new Date(a.getTime() + 6 * 864e5))}` : 'Sem data'}</b>${atual ? '<span class="badge b-acc">semana atual</span>' : ''}<span class="spacer"></span>${S.data.lojas.map(l => { const n = g.filter(r => r._loja === l.key).length; return n ? `${lojaPill(l.key)} <b style="margin-right:10px">${n}</b>` : ''; }).join('')}<span class="badge">${g.length} admissão(ões)</span>${g.filter(r => r._pend).length ? `<span class="badge b-warn">${g.filter(r => r._pend).length} p/ alocar</span>` : ''}</div><div class="wk" data-k="${k}"></div></div>`; }).join('') : `<div class="card empty">${ic('calendar')}<div>Nenhuma contratação no período.</div></div>`;
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
  drawPer(); draw();
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
async function pgAdmin() {
  setTitle('Acessos e configurações', 'Usuários, perfis, identidade visual, SLA e notificações');
  if (window.__grcAdmTab) { setV('admTab', window.__grcAdmTab); window.__grcAdmTab = null; }
  const tab = getV('admTab', 'users');
  const v = $('#view');
  v.innerHTML = `<div class="seg" id="admTab" style="margin-bottom:16px;flex-wrap:wrap"><button data-v="users">${ic('users')} Usuários</button><button data-v="marca">${ic('image')} Logo e identidade</button><button data-v="sla">${ic('gauge')} SLA e aprovações</button><button data-v="push">${ic('bell')} Notificações</button></div><div id="admBody"></div>`;
  $$('#admTab button').forEach(b => { b.classList.toggle('on', b.dataset.v === tab); b.onclick = () => { setV('admTab', b.dataset.v); route(); }; });
  const body = $('#admBody');
  if (tab === 'marca') return admMarca(body);
  if (tab === 'sla') return admSLA(body);
  if (tab === 'push') return admPush(body);
  body.innerHTML = `<div class="toolbar" style="margin-top:0"><div class="input-icon search">${ic('search')}<input class="input" id="uq" placeholder="Buscar usuário" style="width:100%"></div><span class="spacer"></span><button class="btn primary" id="uNew">${ic('plus')} Novo acesso</button></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card"><b>${ic('shield')} Administrador</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Vê e edita tudo, aprova solicitações, cria acessos e configura o sistema.</p></div>
    <div class="card"><b>${ic('edit')} Editor (gestão)</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Movimenta quadro, vagas e contratações das lojas liberadas sem aprovação. Aumento/redução de quadro e novas posições passam por você. Não acessa Acessos, Configurações, Aprovações nem Histórico.</p></div>
    <div class="card"><b>${ic('briefcase')} Recrutador</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Pode editar, abrir, fechar e contratar, mas cada alteração aguarda sua aprovação.</p></div>
    <div class="card"><b>${ic('eye')} Gestor / Líder</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Consulta as lojas liberadas e requisita vagas para aprovação do RH.</p></div>
    <div class="card"><b>${ic('userplus')} Departamento Pessoal</b><p class="muted" style="margin:6px 0 0;font-size:12.5px">Visualiza o quadro das lojas liberadas (sem editar) e cadastra/edita contratações para fazer a admissão, com exportação em PDF e Excel.</p></div>
  </div>
  <div id="uBody"><div class="sk" style="height:200px"></div></div>`;
  let users = [];
  const draw = () => {
    const q = norm($('#uq').value);
    table($('#uBody'), 'users', [
      { t: 'Usuário', k: 'nome', r: u => `<div class="cell-person">${avatar(u.nome, u.foto, 'sm')}<div><b>${h(u.nome)}</b><div class="muted" style="font-size:11.5px">${h(u.cargo || '')}</div></div></div>` },
      { t: 'Login', k: 'login', r: u => `<span class="mono">${h(u.login)}</span>${u.email ? `<div class="muted" style="font-size:11.5px">${h(u.email)}</div>` : ''}` },
      { t: 'Perfil', k: 'perfil', r: u => `<span class="badge ${u.perfil === 'ADMIN' ? 'b-violet' : u.perfil === 'EDITOR' ? 'b-info' : u.perfil === 'RECRUTADOR' ? 'b-acc' : u.perfil === 'DP' ? 'b-ok' : ''}">${h(PERFIS[u.perfil] || u.perfil)}</span>` },
      { t: 'Lojas', k: 'lojas', r: u => u.lojas.length >= todasLojas().length ? '<span class="badge b-acc">Todas</span>' : u.lojas.map(lojaPill).join(' ') },
      { t: 'Status', k: 'ativo', r: u => u.ativo ? (u.trocarSenha ? '<span class="badge b-warn">Aguardando 1º acesso</span>' : '<span class="badge b-ok">Ativo</span>') : '<span class="badge b-bad">Inativo</span>' },
      { t: 'Último acesso', k: 'ultimoAcesso' },
      { t: '', k: '', nosort: true, r: u => u.email && u.id !== S.user.id ? `<button class="btn sm" data-stop data-mail="${u.id}" title="Gerar nova senha e enviar por e-mail">${ic('mail')} Reenviar acesso</button>` : '' }
    ], users.filter(u => !q || norm(u.nome + ' ' + u.login + ' ' + u.email).includes(q)), u => openUser(u, us => { users = us; draw(); }));
    $$('[data-mail]').forEach(b => b.onclick = async () => { const u = users.find(x => x.id === b.dataset.mail); if (!await confirmBox(`Gerar uma nova senha provisória para <b>${h(u.nome)}</b> e enviar para <b>${h(u.email)}</b>?`, 'Enviar')) return; await run(b, () => api('reenviarAcesso', { id: u.id })); toast('Acesso reenviado por e-mail'); });
  };
  $('#uq').oninput = draw;
  $('#uNew').onclick = () => openUser(null, us => { users = us; draw(); });
  const rt = S.rt;
  try { users = (await api('listUsers')).users; if (rt !== S.rt || !$('#uBody')) return; draw(); } catch (e) { toast(e.message, true); }
}
function openUser(u, done) {
  const L = todasLojas();
  modal({
    title: u ? 'Editar acesso' : 'Novo acesso', icon: 'shield', wide: true,
    body: `${u ? `<label class="photo-drop" id="uDrop" style="margin-bottom:16px"><span id="uAv">${avatar(u.nome, u.foto, 'lg')}</span><div><b>${ic('camera')} ${u.foto ? 'Trocar foto' : 'Colocar foto'}</b><div class="muted" style="font-size:12.5px;margin-top:4px">Clique ou arraste uma imagem (JPG/PNG). Ela é recortada e otimizada automaticamente.</div>${u.foto ? '<button class="btn sm danger" id="uFRm" style="margin-top:10px" type="button">Remover foto</button>' : ''}</div><input type="file" id="uFile" accept="image/*" hidden></label>` : ''}<div class="row2">
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
        const j = await api('saveUser', { data: { id: u ? u.id : '', nome: $('#uN', m.el).value, cargo: $('#uC', m.el).value, email: $('#uE', m.el).value, login: $('#uL', m.el).value, senha: $('#uS', m.el).value, enviarEmail: mail, perfil: pickVal(m.el, 'perfil') || 'LEITOR', lojas, ativo: $('#uA', m.el).checked } });
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
    <div class="card"><div class="card-h"><h3>${ic('gauge')} Metas de SLA</h3><span class="sub">dias para fechar a vaga</span></div>
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
  $('#slOk').onclick = e => run(e.currentTarget, async () => { const j = await api('saveConfig', { data: { slaPadrao: +$('#slP').value, slaExcecoes: exc.filter(x => x.funcao && x.dias), aprovarEtapas: $('#slEt').checked } }); S.cfg = j.cfg; derive(); updateShell(); toast('Configurações salvas'); });
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
    ${ocup.length ? `<button class="btn sm danger" id="qbDesl">${ic('door')} Desligar ${ocup.length}</button>` : ''}`;
  $('#qbClr', el).onclick = () => { SEL.set.clear(); redraw(); };
  if ($('#qbDesl', el)) $('#qbDesl', el).onclick = () => openDesligarLote(ocup);
  if ($('#qbEt', el)) $('#qbEt', el).onclick = () => openVagaLote(vagas);
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
async function contrBulk(lista, campo, valor, done) {
  if (!await confirmBox(`Alterar <b>${h(campo)}</b> para <b>${h(valor)}</b> em ${lista.length} contratação(ões)?`, 'Aplicar')) return;
  await run(null, async () => {
    const j = await api('contrBulkSet', { rows: lista.map(r => ({ row: r.row, nome: r[S.ck.colab] })), campo, valor });
    if (done) done(); if (!j.pendente) toast(`${j.total} contratação(ões) atualizada(s)`); bgReload();
  });
}
function openContrBulkSet(lista, done) {
  const C = S.data.contratacoes, K = S.ck, op = C.opcoes || {};
  const campos = [K.status, K.aso, K.hcm, K.contrato].filter(Boolean);
  const opts = k => uniq([...(op[k] || []), ...C.rows.map(r => r[k]).filter(Boolean), ...(k === K.status ? ['Alocado', 'Pendente', 'Desligado'] : [])]);
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
const findRow = (lk, row) => { const l = lojaBy(lk); return l && l.rows.find(r => r.row === +row); };
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
  setPadrao: (p, j) => { const l = lojaBy(p.loja); const sc = l && l.setores.find(x => x.nome === p.setor); if (sc) { sc.padrao = +p.padrao; sc.pad = +p.padrao; } (p.remover || []).forEach(x => { const r = findRow(p.loja, x.row); if (r && sc) sc.linhas.splice(sc.linhas.indexOf(r), 1); }); },
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
  const lojasOpc = uniq([...(op[K.loja] || []), ...LOJAS_CONTR]).filter(x => !/FRALDA/i.test(x) || (r && r[K.loja] === x));
  const distinct = k => C.rows.map(x => x[k]).filter(Boolean);
  const listFor = k => uniq([...(op[k] || []), ...distinct(k), ...(k === K.aso ? ['FEITO', 'MARCADO', 'AGUARDANDO'] : k === K.hcm ? ['SIM', 'NÃO'] : k === K.contrato ? ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO'] : k === K.status ? ['Pendente', 'Alocado', 'Desligado'] : [])]);
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
    body: `<div class="row2">${hdr.map(field).join('')}</div>
      <datalist id="dlCF">${allFuncoes().map(x => `<option value="${h(x)}">`).join('')}</datalist>
      <datalist id="dlCS">${uniq(S.all.map(x => x.setor)).map(x => `<option value="${h(x)}">`).join('')}</datalist>
      ${novo ? `<div class="card mt" style="background:var(--surface2);padding:14px${edQ ? '' : ';display:none'}"><div class="field" style="margin:0"><label>${ic('swap')} Vaga do quadro que será preenchida</label><select class="input" id="ncV"></select><div class="muted" style="font-size:12px;margin-top:6px" id="ncHint"></div></div></div>` : ''}`,
    foot: ed ? `${edQ && r && r._pend && lojaBy(r._loja) ? `<button class="btn" data-a="aloc" style="margin-right:auto">${ic('swap')} Alocar no quadro</button><button class="btn ghost" data-a="alocM" title="Escolher a vaga manualmente">Escolher vaga</button>` : ''}${edQ && r && !r._deslig ? `<button class="btn danger" data-a="desl">${ic('door')} Desligado</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" data-a="ok">Salvar</button>` : '<button class="btn" data-close>Fechar</button>',
    onMount: m => {
      const a = $('[data-a=aloc]', m.el); if (a) a.onclick = () => { m.close(); openAlocar(r); }; const am = $('[data-a=alocM]', m.el); if (am) am.onclick = () => { m.close(); openAlocar(r, true); };
      const dsl = $('[data-a=desl]', m.el); if (dsl) dsl.onclick = () => { m.close(); openMarcarDesl([r]); };
      const el = k => $(`[data-k="${CSS.escape(k)}"]`, m.el);
      const val = k => { const e = el(k); return e ? e.value : ''; };
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
        <div class="muted" style="font-size:12px">As vagas entram como <b>VAGA</b> no setor, com o SLA começando hoje.</div>
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
  <footer><span>${esc(cfgv('sistema', 'Quadro de Lojas'))}</span><span>SLA = dias em aberto / meta de dias para fechar</span></footer>
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
