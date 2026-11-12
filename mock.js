// Modo demonstração — dados fictícios, nada é gravado na planilha.
(function () {
  const FN = ['ANA', 'BRUNO', 'CARLA', 'DIEGO', 'ELAINE', 'FÁBIO', 'GABRIELA', 'HUGO', 'ISABEL', 'JOÃO', 'KARINA', 'LUCAS', 'MARIA', 'NATAN', 'OLÍVIA', 'PEDRO', 'RAQUEL', 'SAMUEL', 'TATIANE', 'VITOR', 'WESLEY', 'YASMIN'];
  const LN = ['SILVA', 'SOUSA', 'OLIVEIRA', 'LIMA', 'COSTA', 'PEREIRA', 'ALVES', 'RODRIGUES', 'MARTINS', 'BARROS', 'NOGUEIRA', 'FREITAS', 'CAVALCANTE', 'MOREIRA'];
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const nome = () => pick(FN) + ' ' + pick(LN) + ' ' + pick(LN);
  const tempo = () => { const m = Math.floor(rnd() * 120); return Math.floor(m / 12) + ' anos e ' + (m % 12) + ' meses'; };
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const br = d => d.toLocaleDateString('pt-BR');
  const today = new Date();
  const br2iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addD = n => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const SETORES = [
    ['GERENCIA', [['GERENTE', 2, 1]]],
    ['LOGISTICA - MOTORISTAS', [['MOTORISTA', 3, .25], ['CONFERENTE DE ROTA', 1, .25]]],
    ['FRENTE DE LOJA - LIDERANÇA', [['COORDENADOR(A)', 1, .33], ['FISCAL DE CAIXA', 3, 1]]],
    ['FRENTE DE LOJA - OPERADORES DE CAIXA', [['OPERADOR(A) DE CAIXA', 14, 1], ['EMBALADOR(A)', 4, 1]]],
    ['APLICATIVO', [['ATENDENTE DE APP', 3, 1]]],
    ['MERCEARIA', [['ENCARREGADO(A)', 1, 1], ['REPOSITOR(A)', 9, 1]]],
    ['FLV', [['REPOSITOR(A)', 4, 1]]],
    ['FRIOS', [['BALCONISTA', 4, 1], ['REPOSITOR(A)', 2, 1]]],
    ['AÇOUGUE', [['AÇOUGUEIRO', 4, 1], ['BALCONISTA', 2, 1]]],
    ['PADARIA - PRODUÇÃO', [['FORNEIRO', 2, 1], ['CONFEITEIRO(A)', 2, 1]]],
    ['DEPOSITO', [['CONFERENTE', 2, 1], ['AUXILIAR', 3, 1]]],
    ['PREVENÇÃO', [['ENCARREGADO(A)', 1, 1], ['FISCAL', 6, 1]]]
  ];
  const opcoes = {
    situacao: ['OK', 'VAGA', 'EM AVISO', 'TROCA', 'ANÁLISE'],
    tag: ['CIPA', 'PCD', 'APRENDIZ', 'Lider Trainee'],
    contrato: ['INTEGRAL', 'PARCIAL', 'ESTÁGIO', 'APRENDIZ', 'JOVEM APRENDIZ', 'RATEIO', 'PCD']
  };
  const vinfo = {}; let vidN = 1;
  function buildLoja(key, num, nm, sub, vagaRate, nova) {
    let row = 7; const setores = [];
    SETORES.forEach(([s, fs]) => {
      if (key === 'TORRA' && /PADARIA|AÇOUGUE|FRIOS|APLICATIVO/.test(s)) return;
      const sec = { nome: s, row: row, padrao: 0, linhas: [] }; row += 3;
      fs.forEach(([f, n, qt]) => {
        for (let i = 0; i < n; i++) {
          const vaga = rnd() < vagaRate;
          const r = { row: row++, qt: qt, nome: vaga ? '' : nome(), funcao: f, contrato: 'INTEGRAL', situacao: vaga ? 'VAGA' : 'OK', tag: '', tempo: '', meses: null, vid: '', info: null };
          if (!vaga) { r.tempo = tempo(); const m = r.tempo.match(/(\d+) anos e (\d+)/); r.meses = +m[1] * 12 + +m[2]; }
          if (!vaga && rnd() < .05) r.situacao = 'EM AVISO, VAGA';
          if (!vaga && rnd() < .06) r.tag = 'CIPA';
          if (!vaga && rnd() < .03) r.tag = 'PCD';
          if (/OPERADOR|EMBALADOR|REPOSITOR/.test(f) && !vaga && rnd() < .07) { r.contrato = 'JOVEM APRENDIZ'; r.tag = 'APRENDIZ'; }
          if (vaga && rnd() < .7) {
            const id = 'v' + (vidN++); r.vid = id;
            r.info = { etapa: pick(['Aberta', 'Divulgação', 'Triagem', 'Entrevista', 'Aprovado']), responsavel: 'Aleff Palacio', abertura: iso(addD(-Math.floor(rnd() * 50))), previsao: '', candidatos: String(Math.floor(rnd() * 12)), motivo: pick(['Desligamento', 'Aumento de quadro', 'Promoção']), obs: '' }; r.info.hist = [{ e: 'Aberta', d: r.info.abertura }];
          }
          sec.linhas.push(r); sec.padrao += qt;
        }
      });
      row += 1; setores.push(sec);
    });
    const ideal = setores.reduce((a, s) => a + s.padrao, 0);
    const atual = setores.reduce((a, s) => a + s.linhas.filter(r => r.nome).reduce((x, r) => x + r.qt, 0), 0);
    return { key, num, nome: nm, sub, nova: !!nova, sheet: key, setores, cotas: { aprendiz: .05, pcd: .02 }, ideal: +ideal.toFixed(2), atual: +atual.toFixed(2), vagasTotais: +(ideal - atual).toFixed(2), opcoes };
  }
  const lojas = [
    buildLoja('MATRIZ', 1, 'Matriz', 'Pq. Santa Rosa', .08),
    buildLoja('MESSEJANA', 2, 'Messejana', 'Loja 2', .1),
    buildLoja('TORRA', 3, 'Torra Atacadista', 'Atacado', .12),
    buildLoja('EUSEBIO', 4, 'Eusébio', 'Loja nova', .82, true)
  ];
  const contrHeader = ['DATA', 'LOJA', 'COLABORADOR', 'SETOR', 'FUNÇÃO', 'ASO ADMISSONAL', 'HCM/EXPORTADO', 'CONTRATO', 'Status Alocação', 'SOLICITADO DP'];
  const contr = [];
  for (let i = 0; i < 12; i++) {
    contr.push({ row: i + 2, DATA: br(addD(Math.floor(rnd() * 14) - 4)), LOJA: pick(['Matriz', 'Messejana', 'Torra', 'Eusébio']), COLABORADOR: nome(), SETOR: pick(['FRENTE DE LOJA', 'PADARIA', 'FLV', 'DEPÓSITO']), 'FUNÇÃO': pick(['OPERADOR(A) DE CAIXA', 'REPOSITOR(A)', 'BALCONISTA', 'AUXILIAR']), 'ASO ADMISSONAL': pick(['FEITO', 'MARCADO', 'AGUARDANDO']), 'HCM/EXPORTADO': pick(['SIM', 'NÃO']), CONTRATO: 'INTEGRAL', 'Status Alocação': pick(['Pendente', 'Pendente', 'Alocado']), 'SOLICITADO DP': pick(['SIM', 'SIM', 'NÃO']) });
  }
  { const r0 = lojas[0].setores[3].linhas.find(r => r.nome); if (r0) contr.push({ row: 98, DATA: br(addD(-20)), LOJA: 'Matriz', COLABORADOR: r0.nome, SETOR: 'FRENTE DE LOJA', 'FUNÇÃO': r0.funcao, 'ASO ADMISSONAL': 'FEITO', 'HCM/EXPORTADO': 'SIM', CONTRATO: 'INTEGRAL', 'Status Alocação': 'Pendente' }); }
  contr.push({ row: 99, DATA: br(addD(-60)), LOJA: 'Matriz', COLABORADOR: 'CARLOS ANTIGO SILVA', SETOR: 'MERCEARIA', 'FUNÇÃO': 'REPOSITOR(A)', 'ASO ADMISSONAL': 'FEITO', 'HCM/EXPORTADO': 'SIM', CONTRATO: 'INTEGRAL', 'Status Alocação': 'Pendente' });
  const exp = [];
  for (let i = 0; i < 45; i++) {
    const adm = addD(-Math.floor(rnd() * 100));
    const v30 = new Date(adm); v30.setDate(v30.getDate() + 29);
    const v90 = new Date(adm); v90.setDate(v90.getDate() + 89);
    const st = d => { const n = Math.ceil((d - today) / 864e5); return n < 0 ? 'Concluído' : 'Faltam ' + n + ' dias'; };
    exp.push({ loja: pick(['MATRIZ', 'MESSEJANA', 'TORRA', 'Eusébio', 'GRC']), nome: nome(), cargo: pick(['OPERADOR(A) DE CAIXA', 'REPOSITOR(A)', 'BALCONISTA', 'FISCAL']), admissao: br(adm), venc30: br(v30), st30: st(v30), venc90: br(v90), st90: st(v90), tempo: '0 anos e ' + Math.floor((today - adm) / 2.6e9) + ' meses' });
  }
  let users = [
    { id: 'u1', login: 'admin', nome: 'Aleff Palacio', perfil: 'ADMIN', lojas: ['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO'], cargo: 'Analista de RH', ativo: true, foto: '', trocarSenha: false, ultimoAcesso: br(today) + ' 08:12' },
    { id: 'u2', login: 'gerente.matriz', nome: 'Gerência Matriz', perfil: 'LEITOR', lojas: ['MATRIZ'], cargo: 'Gerente', ativo: true, foto: '', trocarSenha: false, ultimoAcesso: '' },
    { id: 'u3', login: 'dp', nome: 'Departamento Pessoal', perfil: 'EDITOR', lojas: ['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO'], cargo: 'DP', ativo: true, foto: '', trocarSenha: false, ultimoAcesso: '' }
  ];
  const log = [];
  const L = (acao, loja, det) => log.unshift({ data: new Date().toLocaleString('pt-BR').slice(0, 17), iso: new Date().toISOString(), usuario: 'Aleff Palacio', acao, loja, detalhe: det });
  ['Abriu vaga|MESSEJANA|OPERADOR(A) DE CAIXA', 'Preencheu vaga|MATRIZ|REPOSITOR(A) → JOÃO SILVA LIMA', 'Nova contratação|EUSEBIO|ANA COSTA — FISCAL', 'Etapa da vaga|EUSEBIO|FISCAL → Entrevista'].forEach(s => { const p = s.split('|'); L(p[0], p[1], p[2]); });
  const rowOf = (lk, row) => { const l = lojas.find(x => x.key === lk); for (const s of l.setores) for (const r of s.linhas) if (r.row === row) return { l, s, r }; throw new Error('Linha não encontrada'); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const fechadas = [];
  for (let i = 0; i < 14; i++) { const a = addD(-Math.floor(rnd() * 80) - 10); const f = new Date(a); f.setDate(f.getDate() + 5 + Math.floor(rnd() * 25)); fechadas.push({ loja: pick(['MATRIZ', 'MESSEJANA', 'TORRA', 'EUSEBIO']), funcao: 'REPOSITOR(A)', setor: '', abertura: iso(a), fechamento: iso(f), por: nome() }); }

  const perfilQS = new URLSearchParams(location.search).get('perfil');
  if (perfilQS) users[0].perfil = perfilQS.toUpperCase();
  let cfg = { empresa: 'Grupo R Center', sistema: 'Quadro de Lojas', logo: '', siteUrl: location.origin, slaPadrao: 20, slaExcecoes: [{ funcao: 'GERENTE', dias: 45 }, { funcao: 'COORDENADOR(A)', dias: 35 }], aprovarEtapas: false, onesignalAppId: '', onesignalKeySet: false, pushQuadro: true, emailAprovacoes: true };
  const sols = [
    { id: 'r1', data: br(addD(-1)) + ' 09:12', iso: '', solicitanteId: 'u2', solicitante: 'Gerência Matriz', tipo: 'REQUISICAO', acao: 'requisicaoVaga', loja: 'MATRIZ', resumo: 'Requisição de 2 vaga(s) — REPOSITOR(A) · MERCEARIA · Matriz (Substituição)', payload: { loja: 'MATRIZ', setor: 'MERCEARIA', funcao: 'REPOSITOR(A)', qtd: 2, motivo: 'Substituição', urgencia: 'Alta', turno: '07h–15h20', obs: 'Preferência por experiência em atacarejo' }, status: 'PENDENTE' },
    { id: 's2', data: br(today) + ' 08:40', iso: '', solicitanteId: 'u4', solicitante: 'Recrutadora Ana', tipo: 'ALTERACAO', acao: 'saveRow', loja: 'MESSEJANA', resumo: 'Editar posição FISCAL (Messejana): vaga → BRUNO LIMA · OK', payload: { loja: 'MESSEJANA', row: 9999 }, status: 'PENDENTE' }
  ];
  const desl = [{ nome: 'CARLOS ANTIGO SILVA', loja: 'MATRIZ', funcao: 'REPOSITOR(A)', data: iso(addD(-12)), tipo: 'Pedido de demissão', origem: 'Quadro' }];
  const notifs = [
    { id: 'n1', data: br(today) + ' 08:40', ts: Date.now() - 3600e3, autor: 'Recrutadora Ana', tipo: 'APROVACAO', titulo: 'Aprovação pendente', texto: 'Editar posição FISCAL (Messejana)', link: '#/aprovacoes', nova: true },
    { id: 'n2', data: br(addD(-1)) + ' 09:12', ts: Date.now() - 86400e3, autor: 'Gerência Matriz', tipo: 'REQUISICAO', titulo: 'Nova requisição de vaga', texto: '2 × REPOSITOR(A) · Matriz', link: '#/aprovacoes', nova: true },
    { id: 'n3', data: br(addD(-1)) + ' 15:02', ts: Date.now() - 90000e3, autor: 'Departamento Pessoal', tipo: 'QUADRO', titulo: 'Preencheu vaga · Torra', texto: 'SEPARADOR → THIAGO SILVA', link: '#/loja/TORRA', nova: false }
  ];
  const nf = () => ({ items: clone(notifs), unread: notifs.filter(n => n.nova).length, pendentes: sols.filter(x => x.status === 'PENDENTE').length });
  const GATE = { saveRow: 1, abrirVaga: 1, preencherVaga: 1, addPosicao: 1, removerPosicao: 1, addContratacao: 1, saveContratacao: 1, alocar: 1, desligar: 1, marcarDesligadoContr: 1 };
  // agenda de entrevistas (demo): mesma lógica do servidor, guardada no navegador
  const AGM = (() => {
    const store = () => { try { return JSON.parse(localStorage.getItem('demo_ag') || '{}'); } catch (e) { return {}; } };
    const grava = s => localStorage.setItem('demo_ag', JSON.stringify(s));
    const p2 = n => ('0' + n).slice(-2);
    const Utilities = { formatDate: (d, tz, f) => { const x = new Date(d); return f === 'yyyy-MM-dd' ? x.getFullYear() + '-' + p2(x.getMonth() + 1) + '-' + p2(x.getDate()) : p2(x.getHours()) + ':' + p2(x.getMinutes()); }, getUuid: () => 'demoag' + Math.random().toString(36).slice(2, 12) };
    const PropertiesService = { getScriptProperties: () => ({ getProperty: k => store()['P_' + k] || null, setProperty: (k, v) => { const s = store(); s['P_' + k] = v; grava(s); } }) };
    const CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
    const parseJ_ = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };
    const FB_PROJECT = 'demo';
    const ScriptApp = { getOAuthToken: () => 'demo' }, UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ id: 'ev' + Date.now(), hangoutLink: 'https://meet.google.com/abc-defg-hij' }) }) };
    const fsReq_ = (m, path, body) => { if (path === ':batchGet') return body.documents.map(nm => { const v = store()['D_/' + nm.split('/documents/')[1]]; return v ? { found: { fields: { json: v } } } : { missing: nm }; }); const v = store()['D_' + path]; return v ? (typeof v === 'object' ? { fields: v } : { fields: { json: v } }) : null; };
    const fsVal_ = x => x;
    const fsCommit_ = ops => { const s = store(); ops.forEach(o => { if (o.del) delete s['D_' + o.path]; else s['D_' + o.path] = o.data.json != null ? o.data.json : o.data; }); grava(s); };
    const withLock_ = fn => fn(), notify_ = () => {}, readUsers_ = () => [{ ID: 'u1', NOME: 'Administrador', ATIVO: true }, { ID: 'u2', NOME: 'Luís Guilherme', ATIVO: true }], isAdmin_ = () => true, testePode_ = () => true, fichaPode_ = () => true;
    /* ---------------- AGENDA DE ENTREVISTAS (Google Meet, 20 min) ----------------
     * Cada recrutador tem um link fixo. O candidato escolhe um horário livre de hoje ou do próximo dia útil
     * (08h às 12h e 13h às 17h). Marcações no Firestore: /agenda/{recrutador}_{AAAAMMDD} (só o servidor lê). */
    const AG_TZ_ = 'America/Fortaleza';
    function agPasso_(dia) { return String(dia || '9999-12-31') >= '2026-11-12' ? 30 : 20; }
    function agHorarios_(dia) { const out = [], passo = agPasso_(dia); [[8, 12], [13, 17]].forEach(([a, b]) => { for (let m = a * 60; m < b * 60; m += passo) out.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2)); }); return out; }
    function agPode_(u) { return !!u && (isAdmin_(u) || testePode_(u) || fichaPode_(u)); }
    function mustAgenda_(u) { if (!agPode_(u)) throw new Error('Sem permissão para a agenda de entrevistas.'); }
    function agLinksLer_() { return parseJ_(PropertiesService.getScriptProperties().getProperty('AGENDALINKS'), []); }
    function agLinksGravar_(L) { PropertiesService.getScriptProperties().setProperty('AGENDALINKS', JSON.stringify((L || []).slice(0, 40))); }
    function agRec_(id) { return String(id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40); }
    function agHoje_() { return Utilities.formatDate(new Date(), AG_TZ_, 'yyyy-MM-dd'); }
    function agAgoraMin_() { const s = Utilities.formatDate(new Date(), AG_TZ_, 'HH:mm').split(':'); return Number(s[0]) * 60 + Number(s[1]); }
    function agDiaSem_(dia) { return new Date(dia + 'T12:00:00Z').getUTCDay(); }
    function agSoma_(dia, n) { const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    // feriados nacionais, do Ceará e de Fortaleza (os móveis são calculados pela Páscoa)
    function agFeriados_(ano) {
      const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
      const mes = Math.floor((hh + l - 7 * m + 114) / 31), dia = ((hh + l - 7 * m + 114) % 31) + 1;
      const pascoa = ano + '-' + ('0' + mes).slice(-2) + '-' + ('0' + dia).slice(-2);
      const F = {}; [['01-01', 'Confraternização Universal'], ['03-19', 'Dia de São José (CE)'], ['03-25', 'Data Magna do Ceará'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['08-15', 'Nossa Senhora da Assunção (Fortaleza)'], ['09-07', 'Independência do Brasil'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Dia da Consciência Negra'], ['12-25', 'Natal']].forEach(([md, n]) => { F[ano + '-' + md] = n; });
      F[agSoma_(pascoa, -48)] = 'Carnaval'; F[agSoma_(pascoa, -47)] = 'Carnaval'; F[agSoma_(pascoa, -2)] = 'Sexta-feira Santa'; F[agSoma_(pascoa, 60)] = 'Corpus Christi';
      return F;
    }
    function agFeriado_(dia) { return agFeriados_(Number(dia.slice(0, 4)))[dia] || ''; }
    function agUtil_(dia) { const w = agDiaSem_(dia); return w !== 0 && w !== 6 && !agFeriado_(dia); }
    function agProxUtil_(dia) { let d = agSoma_(dia, 1); while (!agUtil_(d)) d = agSoma_(d, 1); return d; }
    // dias que o candidato pode escolher: hoje (se dia útil) e o próximo dia útil (sexta → segunda; pula feriados)
    function agDiasCand_() { const h = agHoje_(); const L = []; if (agUtil_(h)) L.push(h); L.push(agProxUtil_(h)); return L; }
    function agLer_(rec, dia) {
      try { const doc = fsReq_('get', '/agenda/' + agRec_(rec) + '_' + dia.replace(/-/g, '')); if (doc && doc.fields && doc.fields.json) return JSON.parse(fsVal_(doc.fields.json)); } catch (e) {}
      return { rec: agRec_(rec), dia: dia, s: {}, fechado: false };
    }
    // lê vários dias de uma vez (uma única chamada ao Firestore)
    function agLerVarios_(rec, dias) {
      const r = agRec_(rec), base = 'projects/' + FB_PROJECT + '/databases/(default)/documents/agenda/';
      const nomes = dias.map(d => base + r + '_' + d.replace(/-/g, ''));
      const out = {};
      try {
        const j = fsReq_('post', ':batchGet', { documents: nomes }) || [];
        (Array.isArray(j) ? j : []).forEach(x => { if (x.found && x.found.fields && x.found.fields.json) { try { const d = JSON.parse(fsVal_(x.found.fields.json)); out[d.dia] = d; } catch (e) {} } });
      } catch (e) { dias.forEach(d => { out[d] = agLer_(rec, d); }); }
      return dias.map(d => out[d] || { rec: r, dia: d, s: {}, fechado: false });
    }
    function agRecs_() {
      const c = CacheService.getScriptCache(), k = 'ag_recs', v = c.get(k);
      if (v) return JSON.parse(v);
      const L = readUsers_().filter(u => String(u.ATIVO).toUpperCase() !== 'FALSE' && agPode_(u)).map(u => ({ rec: agRec_(u.ID), nome: String(u.NOME || '') })).sort((a, b) => a.nome.localeCompare(b.nome));
      c.put(k, JSON.stringify(L), 600);
      return L;
    }
    function agGravar_(d) { fsCommit_([{ path: '/agenda/' + agRec_(d.rec) + '_' + d.dia.replace(/-/g, ''), data: { json: JSON.stringify(d), em: Date.now() } }]); }
    function agLivres_(d, hoje) {
      const agora = agAgoraMin_();
      return agHorarios_(d.dia).filter(hh => { if (d.fechado || !agUtil_(d.dia)) return false; const o = d.s[hh]; if (o && o.st !== 'cancelado') return false; if (d.dia === hoje) { const p = hh.split(':'); if (Number(p[0]) * 60 + Number(p[1]) < agora + 30) return false; } return true; });
    }
    // público (candidato)
    function agendaInfo_(req) {
      const l = agLinksLer_().find(x => x.codigo === String(req.codigo || ''));
      if (!l || !l.ativo) return { ok: false, error: 'Este link de agendamento não está mais ativo. Peça um novo link ao RH.' };
      const hoje = agHoje_();
      const ds = agLerVarios_(l.rec, agDiasCand_());
      const dias = ds.map(d => { const dia = d.dia, livres = agLivres_(d, hoje); return { dia: dia, fechado: !livres.length, horarios: agHorarios_(dia).map(hh => ({ h: hh, livre: livres.indexOf(hh) >= 0 })) }; });
      return { ok: true, rec: l.nome, foto: agFoto_(l.rec), hoje: hoje, dias: dias, ficha: 'demoficha' };
    }
    function agendaMarcar_(req) {
      const cache = CacheService.getScriptCache(), rk = 'ag_' + String(req.codigo || '').slice(0, 20), nt = Number(cache.get(rk) || 0);
      if (nt >= 60) return { ok: false, error: 'Muitas tentativas em pouco tempo. Tente de novo em alguns minutos.' };
      cache.put(rk, String(nt + 1), 600);
      const l = agLinksLer_().find(x => x.codigo === String(req.codigo || ''));
      if (!l || !l.ativo) return { ok: false, error: 'Este link de agendamento não está mais ativo. Peça um novo link ao RH.' };
      const d0 = req.data || {}, t = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
      const m = { nome: t(d0.nome, 90).toUpperCase(), tel: String(d0.tel || '').replace(/\D/g, '').slice(0, 13), email: t(d0.email, 100).toLowerCase(), vaga: t(d0.vaga, 80), cpf: String(d0.cpf || '').replace(/\D/g, '').slice(0, 11), ficha: !!d0.ficha };
      const dia = String(d0.dia || ''), hh = String(d0.h || '');
      if (m.nome.split(' ').length < 2) return { ok: false, error: 'Informe o seu nome completo.' };
      if (m.tel.length < 10) return { ok: false, error: 'Informe um WhatsApp válido com DDD.' };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) return { ok: false, error: 'Informe um e-mail válido. O convite da entrevista será enviado para ele.' };
      if (agDiasCand_().indexOf(dia) < 0 || agHorarios_(dia).indexOf(hh) < 0) return { ok: false, error: 'Horário inválido. Atualize a página e escolha de novo.' };
      return withLock_(() => {
        const hoje = agHoje_();
        // o mesmo candidato não marca duas vezes
        for (const dx of agLerVarios_(l.rec, agDiasCand_())) { const x = dx.dia; for (const k in dx.s) { const o = dx.s[k]; if (o && o.st === 'marcado' && o.tel === m.tel) return { ok: false, error: 'Você já tem uma entrevista marcada para ' + x.split('-').reverse().slice(0, 2).join('/') + ' às ' + k + '.' }; } }
        const d = agLer_(l.rec, dia);
        if (agLivres_(d, hoje).indexOf(hh) < 0) return { ok: false, ocupado: true, error: 'Esse horário acabou de ser preenchido. Escolha outro, por favor.' };
        d.s[hh] = Object.assign(m, { st: 'marcado', origem: 'candidato', em: new Date().toISOString(), visto: false });
        try { const mt = agMeetCriar_(l.rec, dia, hh, d.s[hh]); d.s[hh].meet = mt.meet; d.s[hh].evId = mt.evId; } catch (e) { d.s[hh].meetErro = String(e.message || e).slice(0, 200); }
        agGravar_(d);
        try { notify_('ADMIN', { NOME: m.nome, ID: '' }, 'AGENDA', 'Nova entrevista agendada', m.nome + ' · ' + dia.split('-').reverse().join('/') + ' às ' + hh + ' · ' + l.nome, '#/agenda'); } catch (e) {}
        return { ok: true, dia: dia, h: hh, rec: l.nome, meet: d.s[hh].meet || '' };
      });
    }
    // com login
    function agMeuLink_(user) {
      const rec = agRec_(user.ID);
      let l = agLinksLer_().find(x => x.rec === rec && x.ativo);
      if (!l) withLock_(() => { const L = agLinksLer_(); l = L.find(x => x.rec === rec && x.ativo); if (!l) { l = { codigo: Utilities.getUuid().replace(/-/g, '').slice(0, 14), rec: rec, nome: String(user.NOME || ''), em: new Date().toISOString(), ativo: true }; L.unshift(l); agLinksGravar_(L); } });
      return l;
    }
    function agendaRelatorio_(req, user) {
      mustAgenda_(user);
      const meu = agMeuLink_(user), ok = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
      const de = ok(req.de) ? req.de : agHoje_(), ate = ok(req.ate) && req.ate >= de ? req.ate : de, lista = [];
      for (let i = 0; i < 93; i++) { const d = agSoma_(de, i); if (d > ate) break; lista.push(d); }
      let recs; try { recs = agRecs_(); } catch (e) { recs = [{ rec: meu.rec, nome: meu.nome }]; }
      if (!recs.some(x => x.rec === meu.rec)) recs.unshift({ rec: meu.rec, nome: meu.nome });
      if (req.rec) recs = recs.filter(x => x.rec === agRec_(req.rec));
      return { de, ate, hoje: agHoje_(), recs: recs.map(r => ({ rec: r.rec, nome: r.nome, dias: agLerVarios_(r.rec, lista).map(x => ({ dia: x.dia, s: x.s || {}, fechado: !!x.fechado })) })) };
    }
    function agendaList_(req, user) {
      mustAgenda_(user);
      const meu = agMeuLink_(user), links = agLinksLer_().filter(x => x.ativo);
      let rec = agRec_(req.rec || meu.rec);
      if (rec !== meu.rec && !isAdmin_(user)) rec = meu.rec;
      const de = /^\d{4}-\d{2}-\d{2}$/.test(String(req.de || '')) ? req.de : agHoje_();
      const n = Math.max(1, Math.min(7, Number(req.n) || 1)), dias = [];
      const lista = []; for (let i = 0; i < n; i++) lista.push(agSoma_(de, i));
      agLerVarios_(rec, lista).forEach(x => { x.feriado = agFeriado_(x.dia); x.horarios = agHorarios_(x.dia); dias.push(x); });
      let recs = [{ rec: meu.rec, nome: meu.nome }];
      if (isAdmin_(user)) { try { recs = agRecs_(); } catch (e) { recs = links.map(x => ({ rec: x.rec, nome: x.nome })); } if (!recs.some(x => x.rec === meu.rec)) recs.unshift({ rec: meu.rec, nome: meu.nome }); }
      return { rec: rec, meu: meu, recs: recs, dias: dias, hoje: agHoje_(), candDias: agDiasCand_(), horarios: agHorarios_() };
    }
    function agDoUser_(req, user) { mustAgenda_(user); const meu = agMeuLink_(user); const rec = agRec_(req.rec || meu.rec); if (rec !== meu.rec && !isAdmin_(user)) throw new Error('Você só pode alterar a sua agenda.'); return rec; }
    function agTurno_(d, turno, bloq, user) {
      agHorarios_(d.dia).filter(x => turno === 'm' ? x < '12:00' : x >= '13:00').forEach(x => {
        const o = d.s[x];
        if (bloq) { if (!o || o.st === 'cancelado') d.s[x] = { st: 'bloqueado', motivo: turno === 'm' ? 'Manhã fechada' : 'Tarde fechada', turno: turno, por: String(user.NOME || ''), em: new Date().toISOString() }; }
        else if (o && o.st === 'bloqueado') delete d.s[x];
      });
    }
    function agendaSalvar_(req, user) {
      const rec = agDoUser_(req, user), dia = String(req.dia || ''), hh = String(req.h || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error('Dia inválido.');
      return withLock_(() => {
        const d = agLer_(rec, dia);
        if (req.fechado != null) d.fechado = !!req.fechado;
        // fechar/abrir a manhã ou a tarde inteira (só mexe nos horários livres e nos bloqueados)
        if (req.turno === 'm' || req.turno === 't') agTurno_(d, req.turno, !!req.bloq, user);
        if (hh) {
          if (agHorarios_().indexOf(hh) < 0) throw new Error('Horário inválido.');
          const o = req.item, t = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
          if (o === null) delete d.s[hh];
          else if (o) {
            const atual = d.s[hh] || {}, eraNovo = !atual.st || atual.st === 'cancelado' || atual.st === 'bloqueado';
            if (o.st === 'bloqueado') d.s[hh] = { st: 'bloqueado', motivo: t(o.motivo, 80), por: String(user.NOME || ''), em: new Date().toISOString() };
            else d.s[hh] = Object.assign({}, atual, { nome: t(o.nome != null ? o.nome : atual.nome, 90).toUpperCase(), tel: String(o.tel != null ? o.tel : atual.tel || '').replace(/\D/g, '').slice(0, 13), email: t(o.email != null ? o.email : atual.email, 100).toLowerCase(), vaga: t(o.vaga != null ? o.vaga : atual.vaga, 80), obs: t(o.obs != null ? o.obs : atual.obs, 600), st: ['marcado', 'realizada', 'faltou', 'cancelado'].indexOf(o.st) >= 0 ? o.st : (atual.st || 'marcado'), origem: atual.origem || 'rh', em: atual.em || new Date().toISOString(), visto: true, alt: String(user.NOME || '') });
            if (d.s[hh].st !== 'bloqueado' && !d.s[hh].nome) throw new Error('Informe o nome do candidato.');
            const it = d.s[hh];
            if (it.st === 'cancelado' && atual.evId) { agMeetCancelar_(atual); delete it.evId; delete it.meet; }
            else if (it.st === 'marcado' && (eraNovo || !it.meet) && !it.evId) { try { const mt = agMeetCriar_(rec, dia, hh, it); it.meet = mt.meet; it.evId = mt.evId; delete it.meetErro; } catch (e) { it.meetErro = String(e.message || e).slice(0, 200); } }
          }
        }
        agGravar_(d); d.feriado = agFeriado_(d.dia);
        return { dia: d };
      });
    }
    function agendaVisto_(req, user) {
      const rec = agDoUser_(req, user);
      withLock_(() => { (req.dias || []).slice(0, 7).forEach(dia => { const d = agLer_(rec, String(dia)); let mud = false; for (const k in d.s) if (d.s[k] && d.s[k].visto === false) { d.s[k].visto = true; mud = true; } if (mud) agGravar_(d); }); });
      return {};
    }
    // foto que o candidato vê na página de agendamento (Firestore /agendafoto/{rec}); sem ela, usa a foto do perfil
    function agFoto_(rec) {
      const r = agRec_(rec);
      try { const doc = fsReq_('get', '/agendafoto/' + r); if (doc && doc.fields && doc.fields.foto) return fsVal_(doc.fields.foto); } catch (e) {}
      try { const u = readUsers_().find(x => agRec_(x.ID) === r); const f = u ? String(u.FOTO || '') : ''; return /^(data:image|https:)/.test(f) ? f : ''; } catch (e) { return ''; }
    }
    function agendaFoto_(req, user) {
      mustAgenda_(user);
      const rec = agRec_(user.ID), f = String(req.foto || '');
      if (f && (!/^data:image\/(jpeg|png|webp);base64,/.test(f) || f.length > 300000)) throw new Error('Imagem inválida ou muito grande.');
      if (f) fsCommit_([{ path: '/agendafoto/' + rec, data: { foto: f, em: Date.now() } }]);
      else fsCommit_([{ path: '/agendafoto/' + rec, del: true }]);
      return { foto: agFoto_(rec) };
    }
    // remarcar: move a entrevista para outro dia/horário (mesmo recrutador)
    function agendaMover_(req, user) {
      const rec = agDoUser_(req, user), de = req.de || {}, para = req.para || {};
      const ok = x => /^\d{4}-\d{2}-\d{2}$/.test(String(x.dia || '')) && agHorarios_().indexOf(String(x.h || '')) >= 0;
      if (!ok(de) || !ok(para)) throw new Error('Dia ou horário inválido.');
      if (!agUtil_(para.dia)) throw new Error('O novo dia é fim de semana ou feriado.');
      if (de.dia === para.dia && de.h === para.h) throw new Error('Escolha um horário diferente do atual.');
      return withLock_(() => {
        const d1 = agLer_(rec, de.dia), mesmo = de.dia === para.dia, d2 = mesmo ? d1 : agLer_(rec, para.dia);
        const o = d1.s[de.h];
        if (!o || o.st === 'bloqueado' || o.st === 'cancelado') throw new Error('Entrevista não encontrada. Atualize a agenda.');
        const alvo = d2.s[para.h];
        if (alvo && alvo.st !== 'cancelado') throw new Error('O novo horário já está ocupado. Escolha outro.');
        const hist = (o.hist || []).concat([{ de: de.dia + ' ' + de.h, para: para.dia + ' ' + para.h, por: String(user.NOME || ''), em: new Date().toISOString() }]).slice(-10);
        delete d1.s[de.h];
        agMeetMover_(o, para.dia, para.h);
        d2.s[para.h] = Object.assign({}, o, { st: 'marcado', visto: true, alt: String(user.NOME || ''), remarcado: de.dia + ' ' + de.h, hist: hist });
        if (mesmo) agGravar_(d1);
        else fsCommit_([d1, d2].map(d => ({ path: '/agenda/' + agRec_(d.rec) + '_' + d.dia.replace(/-/g, ''), data: { json: JSON.stringify(d), em: Date.now() } })));
        const out = mesmo ? [d1] : [d1, d2];
        out.forEach(d => { d.feriado = agFeriado_(d.dia); });
        return { dias: out };
      });
    }
    // ---- Google Meet: cria o evento na agenda do Google (de quem implantou o script) com link de vídeo
    function agCalReq_(method, path, body) {
      const opt = { method: method, contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
      if (body) opt.payload = JSON.stringify(body);
      const r = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events' + path, opt), c = r.getResponseCode();
      if (c === 404 || c === 410) return null;
      if (c >= 300) throw new Error('Google Agenda ' + c + ': ' + r.getContentText().slice(0, 200));
      const t = r.getContentText(); return t ? JSON.parse(t) : {};
    }
    function agRecUser_(rec) { try { return readUsers_().find(u => agRec_(u.ID) === agRec_(rec)) || null; } catch (e) { return null; } }
    function agHoras_(dia, hh) { const ini = dia + 'T' + hh + ':00-03:00', p = hh.split(':'), m = Number(p[0]) * 60 + Number(p[1]) + 20; return { start: { dateTime: ini, timeZone: AG_TZ_ }, end: { dateTime: dia + 'T' + ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2) + ':00-03:00', timeZone: AG_TZ_ } }; }
    function agMeetCriar_(rec, dia, hh, o) {
      const u = agRecUser_(rec), nomeRec = u ? String(u.NOME || '') : '', emailRec = u ? String(u.EMAIL || '').trim() : '';
      const at = []; if (o.email) at.push({ email: o.email, displayName: o.nome }); if (emailRec && /@/.test(emailRec)) at.push({ email: emailRec, displayName: nomeRec });
      const ev = Object.assign({ summary: 'Entrevista online · ' + o.nome + ' · Grupo R Center', description: 'Entrevista online do processo seletivo do Grupo R Center' + (o.vaga ? ' (' + o.vaga + ')' : '') + (nomeRec ? '\nEntrevistador(a): ' + nomeRec : '') + '\nDuração: cerca de 20 minutos.', attendees: at, conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }, guestsCanModify: false }, agHoras_(dia, hh));
      const r = agCalReq_('post', '?conferenceDataVersion=1&sendUpdates=' + (at.length ? 'all' : 'none'), ev);
      const meet = r.hangoutLink || (((r.conferenceData || {}).entryPoints || []).find(e => e.entryPointType === 'video') || {}).uri || '';
      return { evId: r.id, meet: meet };
    }
    function agMeetMover_(o, dia, hh) { if (o && o.evId) try { agCalReq_('patch', '/' + encodeURIComponent(o.evId) + '?sendUpdates=all', agHoras_(dia, hh)); } catch (e) {} }
    function agMeetCancelar_(o) { if (o && o.evId) try { agCalReq_('delete', '/' + encodeURIComponent(o.evId) + '?sendUpdates=all'); } catch (e) {} }
    // gera o link para uma entrevista que ainda não tem
    function agendaMeet_(req, user) {
      const rec = agDoUser_(req, user), dia = String(req.dia || ''), hh = String(req.h || '');
      return withLock_(() => {
        const d = agLer_(rec, dia), o = d.s[hh];
        if (!o || o.st === 'bloqueado' || o.st === 'cancelado') throw new Error('Entrevista não encontrada.');
        if (!o.meet) { const m = agMeetCriar_(rec, dia, hh, o); o.meet = m.meet; o.evId = m.evId; agGravar_(d); }
        d.feriado = agFeriado_(d.dia);
        return { dia: d };
      });
    }
    // rode uma vez no editor para autorizar o acesso à Google Agenda
    function agMeetAutorizar() { const r = agCalReq_('get', '?maxResults=1'); Logger.log('Google Agenda autorizada: ' + (r ? 'ok' : '-')); }
    function agendaNovoLink_(req, user) {
      mustAgenda_(user);
      const rec = agRec_(user.ID);
      withLock_(() => { const L = agLinksLer_(); L.forEach(x => { if (x.rec === rec) x.ativo = false; }); agLinksGravar_(L); });
      return { meu: agMeuLink_(user) };
    }
    return { agendaInfo_, agendaMarcar_, agendaList_, agendaRelatorio_, agendaSalvar_, agendaVisto_, agendaNovoLink_, agendaFoto_, agendaMover_, agendaMeet_ };
  })();
  window.GRC_MOCK = {
    call: async function (action, p) {
      await new Promise(r => setTimeout(r, 250));
      return this.exec(action, p);
    },
    exec: function (action, p) {
      const me = users[0];
      if (me.perfil === 'RECRUTADOR' && GATE[action]) { sols.unshift({ id: 's' + Date.now(), data: br(today), solicitanteId: me.id, solicitante: me.nome, tipo: 'ALTERACAO', acao: action, loja: p.loja || '', resumo: p.resumo || action, payload: clone(p), status: 'PENDENTE' }); return { ok: true, pendente: true }; }
      switch (action) {
        case 'publicConfig': return Object.assign({ ok: true }, cfg);
        case 'esqueciSenha': return { ok: true };
        case 'notifs': return Object.assign({ ok: true }, nf());
        case 'marcarLidas': notifs.forEach(n => n.nova = false); return Object.assign({ ok: true }, nf());
        case 'solicitarVaga': sols.unshift({ id: 'r' + Date.now(), data: br(today), solicitanteId: me.id, solicitante: me.nome, tipo: 'REQUISICAO', acao: 'requisicaoVaga', loja: p.data.loja, resumo: `Requisição de ${p.data.qtd} vaga(s) — ${p.data.funcao} · ${p.data.setor}`, payload: clone(p.data), status: 'PENDENTE' }); return { ok: true };
        case 'listSolicitacoes': return { ok: true, solicitacoes: clone(p.minhas || me.perfil !== 'ADMIN' ? sols.filter(x => x.solicitanteId === me.id) : sols) };
        case 'cancelarSolicitacao': sols.find(x => x.id === p.id).status = 'CANCELADA'; return { ok: true };
        case 'decidirSolicitacao': { const x = sols.find(y => y.id === p.id); x.status = p.aprovar ? 'APROVADA' : 'REJEITADA'; x.decididoPor = me.nome; x.decididoEm = br(today); x.comentario = p.comentario; if (p.aprovar && x.tipo === 'REQUISICAO') { const pl = x.payload; if (p.decisao.modo === 'existente') p.decisao.rows.forEach(rr => { const { r } = rowOf(pl.loja, rr.row); r.vid = r.vid || 'v' + (vidN++); r.info = { etapa: 'Aberta', responsavel: p.decisao.responsavel, abertura: iso(today), candidatos: '', motivo: 'Requisição de ' + x.solicitante, obs: '', hist: [{ e: 'Aberta', d: iso(today) }] }; }); else for (let i = 0; i < (+pl.qtd || 1); i++) this.exec('addPosicao', { loja: pl.loja, setor: pl.setor, funcao: pl.funcao, contrato: 'INTEGRAL', qt: 1 }); } return { ok: true }; }
        case 'saveConfig': Object.keys(p.data).forEach(k => { if (k === 'onesignalKey') cfg.onesignalKeySet = true; else cfg[k] = p.data[k]; }); return { ok: true, cfg: clone(cfg) };
        case 'iniciarSLA': { let n = 0; lojas.forEach(l => (!p.loja || l.key === p.loja) && l.setores.forEach(s => s.linhas.forEach(r => { if (r.situacao === 'VAGA' && !r.nome && !r.vid) { r.vid = 'v' + (vidN++); r.info = { etapa: 'Aberta', responsavel: p.responsavel, abertura: p.data, candidatos: '', motivo: 'Vaga existente', obs: '', hist: [{ e: 'Aberta', d: p.data }] }; n++; } }))); return { ok: true, total: n }; }
        case 'desligar': { const { r } = rowOf(p.loja, p.row); desl.push({ nome: r.nome, loja: p.loja, funcao: r.funcao, data: p.dataDesligamento, tipo: p.tipo, origem: 'Quadro' }); r.nome = ''; r.situacao = 'VAGA'; r.tag = ''; r.tempo = ''; r.vid = 'v' + (vidN++); r.info = { etapa: 'Aberta', responsavel: p.responsavel, abertura: iso(today), candidatos: '', motivo: 'Desligamento', obs: '', hist: [{ e: 'Aberta', d: iso(today) }] }; return { ok: true }; }
        case 'marcarDesligadoContr': p.rows.forEach(x => { const c = contr.find(y => y.row === x.row); c['Status Alocação'] = 'Desligado'; desl.push({ nome: c.COLABORADOR, loja: '', funcao: c['FUNÇÃO'], data: p.dataDesligamento, tipo: p.tipo, origem: 'Contratações' }); }); return { ok: true, total: p.rows.length };
        case 'reenviarAcesso': return { ok: true };
        case 'setPadrao': { const l = lojas.find(x => x.key === p.loja); const sc = l.setores.find(x => x.nome === p.setor); const antes = sc.padrao; sc.padrao = +p.padrao; let n = 0; if (p.novas) for (let i = 0; i < p.novas.qtd; i++) { this.exec('addPosicao', { loja: p.loja, setor: p.setor, funcao: p.novas.funcao, contrato: p.novas.contrato, qt: 1, novoRow: (p.novosRows || [])[i] }); n++; } sc.padrao = +p.padrao; (p.remover || []).forEach(x => this.exec('removerPosicao', { loja: p.loja, row: x.row })); return { ok: true, antes, padrao: +p.padrao, criadas: n, removidas: (p.remover || []).length }; }
        case 'desligarLote': p.itens.forEach(it => this.exec('desligar', Object.assign({}, it, { dataDesligamento: p.dataDesligamento, tipo: p.tipo, responsavel: p.responsavel }))); return { ok: true, total: p.itens.length, erros: [] };
        case 'setVagaInfoLote': p.itens.forEach(it => this.exec('setVagaInfo', Object.assign({}, it, { data: p.data }))); return { ok: true, total: p.itens.length, erros: [] };
        case 'contrBulkSet': p.rows.forEach(x => { const c = contr.find(y => y.row === x.row); if (c) c[p.campo] = p.valor; }); return { ok: true, total: p.rows.length };
        case 'cruzarContr': { const nomes = {}; lojas.forEach(l => l.setores.forEach(s => s.linhas.forEach(r => { if (r.nome) nomes[r.nome] = l.key + ' · ' + r.funcao; }))); const A = [], D = []; contr.forEach(c => { if (/Alocado|Desligado/.test(c['Status Alocação'])) return; if (desl.some(d => d.nome === c.COLABORADOR)) D.push({ row: c.row, nome: c.COLABORADOR }); else if (nomes[c.COLABORADOR]) A.push({ row: c.row, nome: c.COLABORADOR, onde: nomes[c.COLABORADOR] }); }); if (!p.simular) { A.forEach(x => contr.find(c => c.row === x.row)['Status Alocação'] = 'Alocado'); D.forEach(x => contr.find(c => c.row === x.row)['Status Alocação'] = 'Desligado'); } return { ok: true, alocados: A, desligados: D }; }
        case 'login': return { ok: true, token: 'demo', user: clone(me) };
        case 'bootstrap': return { ok: true, user: clone(me), lojas: clone(lojas), contratacoes: { header: contrHeader, headerRow: 1, rows: clone(contr), opcoes: { 'ASO ADMISSONAL': ['FEITO', 'MARCADO', 'AGUARDANDO'], 'HCM/EXPORTADO': ['SIM', 'NÃO'], 'Status Alocação': ['Pendente', 'Alocado'], LOJA: ['Matriz', 'Messejana', 'Torra', 'Eusébio'], CONTRATO: ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO'] } }, experiencias: clone(exp), cfg: clone(cfg), pendentes: clone(sols.filter(x => x.status === 'PENDENTE')), notif: nf(), desligados: clone(desl), etapas: ['Aberta', 'Divulgação', 'Triagem', 'Entrevista', 'Aprovado', 'Admissão'], vagasFechadas: clone(fechadas), log: clone(log.slice(0, 40)), atualizadoEm: new Date().toLocaleString('pt-BR').slice(0, 17) };
        case 'saveRow': { const { r } = rowOf(p.loja, p.row); Object.assign(r, { nome: p.data.nome, funcao: p.data.funcao, contrato: p.data.contrato, situacao: p.data.situacao, tag: p.data.tag }); if (p.data.qt) r.qt = +p.data.qt; L('Editou posição', p.loja, r.funcao); return { ok: true }; }
        case 'abrirVaga': { const { r } = rowOf(p.loja, p.row); const ant = r.nome; if (p.motivo === 'EM AVISO') r.situacao = 'EM AVISO, VAGA'; else { r.nome = ''; r.situacao = 'VAGA'; r.tag = ''; r.tempo = ''; } r.vid = 'v' + (vidN++); r.info = { etapa: 'Aberta', responsavel: me.nome, abertura: iso(today), previsao: '', candidatos: '', motivo: p.motivo + (ant ? ' — ' + ant : ''), obs: p.obs || '' }; L('Abriu vaga', p.loja, r.funcao); return { ok: true }; }
        case 'preencherVaga': case 'alocar': { const { r, s } = rowOf(p.loja, p.row); if (r.info) fechadas.push({ loja: p.loja, funcao: r.funcao, setor: s.nome, abertura: r.info.abertura, fechamento: iso(today), por: p.nome }); r.nome = p.nome.toUpperCase(); r.situacao = 'OK'; r.tag = p.tag || ''; if (p.contrato) r.contrato = p.contrato; r.vid = ''; r.info = null; r.tempo = '0 anos e 0 meses'; if (p.contrRow) { const c = contr.find(x => x.row === p.contrRow); if (c) c['Status Alocação'] = 'Alocado'; } L('Preencheu vaga', p.loja, r.funcao + ' → ' + r.nome); return { ok: true }; }
        case 'criarSetor': { const l = lojas.find(x => x.key === p.loja); const nm = String(p.nome || '').trim().toUpperCase(); if (!nm) throw new Error('Informe o nome do setor.'); if (l.setores.some(x => x.nome === nm)) throw new Error('Já existe o setor ' + nm + ' nesta loja.'); const i = l.setores.findIndex(x => x.nome === p.depois); const r0 = 9000 + Math.floor(Math.random() * 900); l.setores.splice(i >= 0 ? i + 1 : l.setores.length, 0, { nome: nm, row: +p.novoRow || r0, padrao: 0, linhas: [] }); L('Novo setor', p.loja, nm); return { ok: true, setor: nm }; }
        case 'addPosicao': { const l = lojas.find(x => x.key === p.loja); const s = l.setores.find(x => x.nome === p.setor); const nr = +p.novoRow || Math.max(...lojas.flatMap(x => x.setores.flatMap(y => y.linhas.map(z => z.row)))) + 1; s.linhas.push({ row: nr, qt: +p.qt || 1, nome: '', funcao: p.funcao, contrato: p.contrato, situacao: 'VAGA', tag: '', tempo: '', vid: 'v' + (vidN++), info: { etapa: 'Aberta', responsavel: me.nome, abertura: iso(today), candidatos: '', motivo: 'Aumento de quadro', obs: '' } }); s.padrao += +p.qt || 1; L('Nova posição', p.loja, p.funcao); return { ok: true }; }
        case 'moverLinha': { const { s } = rowOf(p.loja, p.row); const i = s.linhas.findIndex(x => x.row === p.row), j = s.linhas.findIndex(x => x.row === p.para); if (j < 0) throw new Error('Linha não encontrada'); const nums = s.linhas.map(x => x.row); const [r] = s.linhas.splice(i, 1); s.linhas.splice(j, 0, r); s.linhas.forEach((x, k) => x.row = nums[k]); return { ok: true }; }
        case 'removerPosicao': { const { s, r } = rowOf(p.loja, p.row); s.linhas.splice(s.linhas.indexOf(r), 1); L('Removeu posição', p.loja, r.funcao); return { ok: true }; }
        case 'setVagaInfo': { const { r } = rowOf(p.loja, p.row); r.vid = r.vid || 'v' + (vidN++); r.info = Object.assign({ etapa: 'Aberta', abertura: iso(today), responsavel: '', candidatos: '', motivo: '', obs: '', previsao: '' }, r.info || {}, p.data); if (p.data.etapa) L('Etapa da vaga', p.loja, r.funcao + ' → ' + p.data.etapa); return { ok: true }; }
        case 'addContratacao': { const d = Object.assign({ row: contr.length + 2 }, p.data); if (/^\d{4}-/.test(d.DATA)) d.DATA = d.DATA.split('-').reverse().join('/'); let alocado = false; if (p.vaga) { this.exec('preencherVaga', { loja: p.vaga.loja, row: p.vaga.row, nome: d.COLABORADOR }); d['Status Alocação'] = 'Alocado'; alocado = true; } else d['Status Alocação'] = 'Pendente'; contr.push(d); L('Nova contratação', '', d.COLABORADOR); return { ok: true, alocado }; }
        case 'saveContratacao': { const c = contr.find(x => x.row === p.row); Object.assign(c, p.data); if (/^\d{4}-/.test(c.DATA)) c.DATA = c.DATA.split('-').reverse().join('/'); return { ok: true }; }
        case 'listUsers': return { ok: true, users: clone(users) };
        case 'pesqAcesso': return { ok: true, ids: window.__pqac || [] };
        case 'setPesqAcesso': window.__pqac = p.ids || []; return { ok: true, ids: window.__pqac };
        case 'fichaAcesso': return { ok: true, ids: window.__fac || [] };
        case 'setFichaAcesso': window.__fac = p.ids || []; return { ok: true, ids: window.__fac };
        case 'fichaInfo': return { ok: true, link: { titulo: /geral/.test(location.search) ? '' : 'Operador de caixa · Eusébio' }, recrutadores: window.__frec || ['Aleff Palacio', 'Luis Guilherme', 'Gustavo Vitor', 'Juliana Nóbrega'] };
        case 'setFichaRecrut': window.__frec = p.lista; return { ok: true, recrutadores: p.lista };
        case 'fichaEnviar': { window.__fi = window.__fi || []; const d = p.data; window.__fi.unshift({ id: 'f' + Date.now(), nome: d.nome.toUpperCase(), mae: d.mae.toUpperCase(), cpf: d.cpf.replace(/\D/g, ''), nasc: d.nasc, tel: d.tel.replace(/\D/g, ''), blusa: d.blusa, calca: d.calca, bota: d.bota, titulo: d.vaga, recrutador: d.recrutador, link: 'demo', em: new Date().toISOString(), visto: false }); return { ok: true }; }
        case 'fichasList': if (!window.__fi) window.__fi = [{ id: 'f1', nome: 'MARIA DE FÁTIMA SOUSA LIMA', mae: 'FRANCISCA SOUSA LIMA', cpf: '52998224725', nasc: '1998-04-12', tel: '85991234567', blusa: 'M', calca: '40', bota: '37', titulo: 'Operador de caixa · Eusébio', link: 'demo', em: new Date().toISOString(), por: me.nome, visto: false }]; return { ok: true, fichas: clone(window.__fi), links: clone(window.__fl || []), recrutadores: window.__frec || ['Aleff Palacio', 'Luis Guilherme', 'Gustavo Vitor', 'Juliana Nóbrega'] };
        case 'fichaLinkCriar': { window.__fl = window.__fl || []; const l = { codigo: 'demo' + Date.now().toString(36), titulo: p.titulo, geral: !!p.geral, criadoPor: me.nome, em: new Date().toISOString(), ativo: true }; window.__fl.unshift(l); return { ok: true, link: l, links: clone(window.__fl) }; }
        case 'fichaLinkDesativar': (window.__fl || []).forEach(l => { if (l.codigo === p.codigo) l.ativo = false; }); return { ok: true, links: clone(window.__fl || []) };
        case 'fichaMarcar': (window.__fi || []).forEach(x => { if (p.ids.includes(x.id)) x.visto = true; }); return { ok: true, fichas: clone(window.__fi || []) };
        case 'agendaInfo': return AGM.agendaInfo_(p);
        case 'agendaMarcar': return AGM.agendaMarcar_(p);
        case 'agendaList': case 'agendaRelatorio': case 'agendaSalvar': case 'agendaVisto': case 'agendaNovoLink': case 'agendaFoto': case 'agendaMover': case 'agendaMeet': { const uu = { ID: me.id, NOME: me.nome }; try { return Object.assign({ ok: true }, AGM[action + '_'](p, uu)); } catch (e) { return { ok: false, error: e.message }; } }
        case 'testeInfo': return { ok: true, link: { titulo: 'Operador de caixa · Eusébio', testes: ['disc', 'forcas', 'situacional', 'fit'] }, recrutadores: ['Aleff Palacio', 'Luis Guilherme', 'Gustavo Vitor', 'Juliana Nóbrega'] };
        case 'testeEnviar': { window.__te = window.__te || []; const d = p.data; window.__te.unshift({ id: 't' + Date.now() + Math.random().toString(36).slice(2, 6), link: p.codigo, titulo: d.vaga || 'Operador de caixa · Eusébio', teste: d.teste, nome: d.nome.toUpperCase(), cpf: d.cpf, tel: d.tel, recrutador: d.recrutador, resp: d.resp, seg: d.seg, em: new Date().toISOString(), visto: false, obs: '' }); return { ok: true }; }
        case 'testesList': { if (!window.__te) { const rnd = (n, f) => Array.from({ length: n }, (_, i) => f(i)); window.__te = [
          { id: 'ta1', teste: 'disc', nome: 'JOANA DARC FERREIRA LIMA', cpf: '52998224725', tel: '85999990000', recrutador: 'Aleff Palacio', titulo: 'Operador de caixa · Eusébio', resp: rnd(24, i => 'DISCSSID'[i % 8]), seg: 300, em: new Date(Date.now() - 3600e3).toISOString(), visto: false, obs: '' },
          { id: 'ta2', teste: 'forcas', nome: 'JOANA DARC FERREIRA LIMA', cpf: '52998224725', tel: '85999990000', recrutador: 'Aleff Palacio', titulo: 'Operador de caixa · Eusébio', resp: rnd(48, i => String(2 + (i * 7) % 4)), seg: 420, em: new Date(Date.now() - 3500e3).toISOString(), visto: false, obs: '' },
          { id: 'ta3', teste: 'situacional', nome: 'JOANA DARC FERREIRA LIMA', cpf: '52998224725', tel: '85999990000', recrutador: 'Aleff Palacio', titulo: 'Operador de caixa · Eusébio', resp: rnd(12, i => String(i % 4)), seg: 350, em: new Date(Date.now() - 3400e3).toISOString(), visto: false, obs: '' },
          { id: 'ta5', teste: 'fit', nome: 'JOANA DARC FERREIRA LIMA', cpf: '52998224725', tel: '85999990000', recrutador: 'Aleff Palacio', titulo: 'Operador de caixa · Eusébio', resp: rnd(24, i => String([4, 5, 4, 2, 5, 4][i % 6])).concat(['Uma vez no meu antigo emprego numa farmácia, uma colega faltou e a fila do caixa ficou enorme. Eu assumi o caixa dela além do meu balcão e fiquei até fechar o movimento, porque sabia que os clientes iam sair sem atendimento. A gerente me agradeceu e eu aprendi a me organizar melhor nos picos.', 'Sou uma pessoa muito dedicada e comprometida, sempre dou o meu melhor e aceito críticas.', 'Eu mantenho a calma e escuto o cliente. Teve um dia que um cliente gritou comigo por causa do preço, eu expliquei com educação e chamei o fiscal para conferir, porque brigar só piora.']), seg: 760, em: new Date(Date.now() - 3300e3).toISOString(), visto: false, obs: '' },
          { id: 'ta4', teste: 'fit', nome: 'CARLOS EDUARDO SOUSA', cpf: '11144477735', tel: '', recrutador: 'Gustavo Vitor', titulo: 'Repositor · Messejana', resp: rnd(24, i => String(3 + i % 3)), seg: 200, em: new Date(Date.now() - 86400e3).toISOString(), visto: true, obs: 'Boa aderência, confirmar disponibilidade de horário.' }]; }
          return { ok: true, testes: clone(window.__te), links: clone(window.__tl || []), recrutadores: ['Aleff Palacio', 'Luis Guilherme', 'Gustavo Vitor', 'Juliana Nóbrega'] }; }
        case 'testeLinkCriar': { window.__tl = window.__tl || []; const l = { codigo: 'demo' + Date.now().toString(36), titulo: p.titulo, testes: p.testes, criadoPor: 'Administrador', em: new Date().toISOString(), ativo: true }; window.__tl.unshift(l); return { ok: true, link: clone(l), links: clone(window.__tl) }; }
        case 'testeLinkDesativar': (window.__tl || []).forEach(l => { if (l.codigo === p.codigo) l.ativo = false; }); return { ok: true, links: clone(window.__tl || []) };
        case 'testeObs': { const r = (window.__te || []).find(x => x.id === p.id); r.obs = p.obs; r.obsPor = 'Administrador'; r.obsEm = new Date().toISOString(); return { ok: true, teste: clone(r) }; }
        case 'testeMarcar': (window.__te || []).forEach(x => { if (p.ids.includes(x.id)) x.visto = true; }); return { ok: true };
        case 'testeApagar': window.__te = (window.__te || []).filter(x => !(p.ids || [p.id]).includes(x.id)); return { ok: true };
        case 'testeAcesso': return { ok: true, ids: window.__tac || [] };
        case 'setTesteAcesso': window.__tac = p.ids; return { ok: true, ids: p.ids };
        case 'fichaChk': (window.__fi || []).forEach(x => { if (x.id === p.id) { x[p.campo] = p.valor ? new Date().toISOString() : ''; x[p.campo + 'Por'] = p.valor ? 'Administrador' : ''; x[p.campo + 'Neg'] = !!(p.valor && p.neg); } }); return { ok: true, fichas: clone(window.__fi || []) };
        case 'fichaApagar': window.__fi = (window.__fi || []).filter(x => x.id !== p.id); return { ok: true, fichas: clone(window.__fi) };
        case 'tsGet': return { ok: true, doc: window.__ts === undefined ? null : clone(window.__ts) };
        case 'tsImportar': window.__ts = { titulo: 'GRC GRUPO R CENTER — PLANO DE CARGOS, CARREIRAS E SALÁRIOS (PCCS) — 2026', niveis: { N1: 1.6, N2: 1.5, N3: 1.5, N4: 1.4, N5: 1.4, N6: 1.3, N7: 1.3, outros: 1.2 }, itens: [{ id: 'i1', t: 'bloco', nome: 'BLOCO 1 — CARGOS ADMINISTRATIVOS E TÉCNICOS (Trilha: Auxiliar → Gerente)' }, { id: 'i2', t: 'grupo', nome: '02 · GERÊNCIA' }, { id: 'i3', t: 'cargo', nome: 'Gerente de Loja', nivel: 'N2', cbo: '1412-05', ref: null, reaj: 0 }, { id: 'i4', t: 'grupo', nome: '03 · RECURSOS HUMANOS' }, { id: 'i5', t: 'cargo', nome: 'Assistente de RH', nivel: 'N6', cbo: '2521-20', ref: 1900, reaj: 0 }, { id: 'i6', t: 'cargo', nome: 'Analista de RH Sênior', nivel: 'N5', cbo: '2521-10', ref: null, reaj: 0 }, { id: 'i7', t: 'bloco', nome: 'BLOCO 2 — CARGOS OPERACIONAIS' }, { id: 'i8', t: 'grupo', nome: '07 · OPERACIONAL — FRENTE DE LOJA' }, { id: 'i9', t: 'cargo', nome: 'Operador(a) de Caixa', nivel: 'N9', cbo: '4211-25', ref: 1700, reaj: 0 }], colabs: [{ cargo: 'Gerente de Loja', nome: 'FULANO A', salario: 4800 }, { cargo: 'Gerente de Loja', nome: 'FULANO B', salario: 5500 }, { cargo: 'Analista de RH Sênior', nome: 'FULANO C', salario: 3500 }], prog: [['CRITÉRIOS DE PROGRESSÃO POR MÉRITO — GRC GRUPO R CENTER', '', '', ''], ['', 'NÍVEL DA TRILHA', 'SALÁRIO / CRESCIMENTO', 'REQUISITO PARA PROMOÇÃO'], ['', 'Auxiliar', 'R$ 1.750,00 (Nível de entrada da trilha)', 'Admissão direta ou promoção interna.'], ['', 'Politica Geral: As promoções ocorrerão mediante atendimento aos requisitos.', '', '']], reajustes: [], versao: 1 }; return { ok: true, doc: clone(window.__ts) };
        case 'tsSave': window.__ts = Object.assign(clone(p.doc), { versao: (p.doc.versao || 0) + 1, atualizadoEm: new Date().toISOString(), atualizadoPor: me.nome }); return { ok: true, doc: clone(window.__ts) };
        case 'pqLista': return { ok: true, lista: clone(window.__pqh || []) };
        case 'pqCbo': return { ok: true, itens: [{ slug: 'repositor-de-mercadorias-521125', cbo: '521125', nome: 'Repositor de mercadorias' }, { slug: 'operador-de-caixa-421125', cbo: '421125', nome: 'Operador de caixa' }] };
        case 'pqFazer': { window.__pqh = window.__pqh || []; const it = { id: 'h' + p.funcao, funcao: p.funcao, slug: p.slug, cbo: p.slug.slice(-6), ref: p.slug.replace(/-\d{6}$/, '').replace(/-/g, ' '), salario: p.salario, merc: { FOR: [1645, 1668, 1649, 1925, 19115], EUS: [1654, 1669, 1635, 1870, 999], CE: [1641, 1666, 1629, 1954, 36736], BR: [1902, 1845, 1694, 2484, 1480642] }, em: new Date().toISOString(), por: me.nome }; window.__pqh = [it].concat(window.__pqh.filter(x => x.id !== it.id)); return { ok: true, item: clone(it), lista: clone(window.__pqh) }; }
        case 'pqApagar': window.__pqh = (window.__pqh || []).filter(x => x.id !== p.id); return { ok: true, lista: clone(window.__pqh) };
        case 'criarConvite': { window.__cv = window.__cv || []; const d = p.data; window.__cv.unshift({ codigo: 'demo' + Date.now().toString(36), loja: (d.lojas || [d.loja]).join(','), setores: d.setores || [], perfil: 'LEITOR', titulo: d.titulo || '', criadoPor: me.nome, criadoEm: br(today), validade: iso(new Date(Date.now() + (d.dias || 30) * 864e5)), usos: 0, maxUsos: d.maxUsos || 0, ativo: true }); return { ok: true, convites: clone(window.__cv) }; }
        case 'listConvites': return { ok: true, convites: clone(window.__cv || []) };
        case 'convitesAcesso': return { ok: true, ids: window.__cva || [] };
        case 'setConvitesAcesso': window.__cva = p.ids || []; return { ok: true, ids: window.__cva };
        case 'desativarConvite': { (window.__cv || []).forEach(c => { if (c.codigo === p.codigo) c.ativo = false; }); return { ok: true, convites: clone(window.__cv || []) }; }
        case 'saveUser': { const d = p.data; if (d.id) Object.assign(users.find(u => u.id === d.id), { login: d.login, nome: d.nome, perfil: d.perfil, lojas: d.lojas, ativo: d.ativo !== false, cargo: d.cargo }); else users.push({ id: 'u' + Date.now(), login: d.login, nome: d.nome, perfil: d.perfil, lojas: d.lojas, ativo: true, cargo: d.cargo, foto: '', ultimoAcesso: '' }); L(d.id ? 'Editou acesso' : 'Criou acesso', '', d.login); return { ok: true, users: clone(users) }; }
        case 'deleteUser': users = users.filter(u => u.id !== p.id); return { ok: true, users: clone(users) };
        case 'movimentar': { const fr = (k, row) => { const l = lojas.find(x => x.key === k); for (const sc of l.setores) { const r = sc.linhas.find(x => x.row === +row); if (r) return { l, sc, r }; } return null; }; const o = fr(p.origem.loja, p.origem.row); const nome = o.r.nome, tempo = o.r.tempo, meses = o.r.meses; const d = p.destino; window.__mov = window.__mov || [];
          if (d.mesmaPosicao) { const de = o.r.funcao; o.r.funcao = d.funcao; o.r.tag = d.tag || ''; window.__mov.unshift({ data: br(new Date()), efetiva: p.dataEfetiva, nome, tipo: p.tipo, deLoja: p.origem.loja, deSetor: p.origem.setor, deFuncao: de, paraLoja: d.loja, paraSetor: p.origem.setor, paraFuncao: d.funcao, obs: p.obs }); return { ok: true }; }
          let dst; if (d.row) dst = fr(d.loja, d.row).r; else { const l = lojas.find(x => x.key === d.loja); const sc = l.setores.find(x => x.nome === d.setor); dst = { row: Math.max(...lojas.flatMap(x => x.setores.flatMap(y => y.linhas.map(z => z.row)))) + 1, qt: 1, nome: '', funcao: d.funcao, contrato: d.contrato || 'INTEGRAL', situacao: 'VAGA', tag: '', tempo: '', meses: null, vid: '', info: null }; sc.linhas.push(dst); }
          Object.assign(dst, { nome, situacao: 'OK', tag: d.tag || '', tempo, meses, info: null });
          const deF = o.r.funcao; if (p.origemAcao === 'remover') o.sc.linhas.splice(o.sc.linhas.indexOf(o.r), 1); else Object.assign(o.r, { nome: '', situacao: 'VAGA', tag: '', tempo: '', meses: null, info: { etapa: 'Aberta', abertura: br2iso(new Date()), motivo: p.tipo + ' — ' + nome, hist: [] } });
          window.__mov.unshift({ data: br(new Date()), efetiva: p.dataEfetiva, nome, tipo: p.tipo, deLoja: p.origem.loja, deSetor: p.origem.setor, deFuncao: deF, paraLoja: d.loja, paraSetor: d.setor, paraFuncao: dst.funcao, obs: p.obs }); return { ok: true }; }
        case 'listMovimentacoes': return { ok: true, movimentacoes: (window.__mov || []).filter(x => !p.nome || x.nome === p.nome) };
        case 'criarQuadroAdm': { const SET = { 'COMERCIAL': ['DIRETOR COMERCIAL', 'COMPRADOR', 'COMPRADOR', 'COMPRADOR', 'ASSISTENTE COMERCIAL', 'ASSISTENTE COMERCIAL'], 'FINANCEIRO': ['GERENTE FINANCEIRO', 'ANALISTA FINANCEIRO', 'ASSISTENTE FINANCEIRO', 'CONTAS A PAGAR'], 'GENTE & GESTÃO': ['ANALISTA DE RH', 'ANALISTA DE DP', 'ASSISTENTE DE DP', 'JOVEM APRENDIZ'], 'MARKETING': ['COORDENADOR(A) DE MARKETING', 'DESIGNER', 'SOCIAL MEDIA'], 'T.I': ['ANALISTA DE SISTEMAS', 'SUPORTE'], 'CONTROLADORIA': ['CONTROLLER', 'ANALISTA DE CONTROLADORIA'] }; const SN = ['SÊNIOR', 'PLENO', 'JÚNIOR', '', 'PLENO', 'SÊNIOR', 'JÚNIOR']; let r0 = 9000, k = 0; const setores = Object.keys(SET).map(sn => ({ nome: sn, row: r0++, padrao: SET[sn].length, linhas: SET[sn].map((f, i) => { const vaga = sn === 'T.I' && i === 1; return { row: r0++, qt: 1, nome: vaga ? '' : nome(), funcao: f, contrato: /APRENDIZ/.test(f) ? 'APRENDIZ' : 'INTEGRAL', situacao: vaga ? 'VAGA' : 'OK', tag: vaga ? '' : [SN[(k++) % SN.length], i === 0 && sn === 'FINANCEIRO' ? 'CIPA' : ''].filter(Boolean).join(', '), tempo: (1 + (k % 9)) + ' anos e ' + (k % 12) + ' meses', meses: (1 + (k % 9)) * 12 + (k % 12), vid: '', info: vaga ? { etapa: 'Triagem', abertura: br2iso(new Date(Date.now() - 12 * 864e5)), hist: [] } : null }; }) })); const nl = { key: 'GRC', num: 'ADM', nome: 'Administrativo', sub: 'Grupo R Center · Escritório', setores, cotas: { aprendiz: .05, pcd: .02 }, ideal: 0, atual: 0, opcoes: {} }; lojas.push(nl); return { ok: true, loja: { key: 'GRC', nome: 'Administrativo' }, colaboradores: 22, setores: setores.length }; }
        case 'criarLoja': { const d = p.data; const b = lojas.find(x => x.key === d.base); const key = d.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'); const nl = clone(b); Object.assign(nl, { key, nome: d.nome, sub: d.sub || 'Loja nova', nova: d.nova !== false, num: lojas.length + 1 }); let r0 = 5000 + lojas.length * 1000; nl.setores.forEach(sc => sc.linhas.forEach(r => Object.assign(r, { row: r0++, nome: '', situacao: 'VAGA', tag: '', tempo: '', meses: null, info: null }))); lojas.push(nl); return { ok: true, loja: { key, nome: d.nome, num: nl.num } }; }
        case 'selecoesAcesso': return { ok: true, acesso: true, admin: true, ids: (window.__selIds || []) };
        case 'setSelecoesAcesso': window.__selIds = p.ids || []; return { ok: true, ids: window.__selIds };
        case 'listSelecoes': return { ok: true, selecoes: clone(window.__sel || (window.__sel = [
          { id: 's1', loja: 'MATRIZ', setor: 'FRENTE DE CAIXA', funcao: 'OPERADOR(A) DE CAIXA', vagas: 3, data: br2iso(today), horario: '09:00', local: 'Sala do RH', responsavel: 'Aleff Palacio', origem: 'Banco de talentos', chamados: 12, confirmados: 9, compareceram: 8, aprov_lider: 4, aprov_rh: 3, admitidos: 2, banco_talentos: 2, status: 'Realizada', obs: '', criado_por: 'Aleff Palacio', criado_em: '' },
          { id: 's2', loja: 'EUSEBIO', setor: 'AÇOUGUE', funcao: 'AÇOUGUEIRO', vagas: 2, data: br2iso(new Date(Date.now() + 2 * 864e5)), horario: '14:00', local: 'Loja Eusébio', responsavel: 'Luís Guilherme', origem: 'Instagram', chamados: 6, confirmados: 4, compareceram: '', aprov_lider: '', aprov_rh: '', admitidos: '', banco_talentos: '', status: 'Agendada', obs: '', criado_por: 'Luís Guilherme', criado_em: '' }])) };
        case 'saveSelecao': { const L2 = window.__sel || (window.__sel = []); const d = Object.assign({}, p.data); if (d.id) Object.assign(L2.find(x => x.id === d.id), d); else { d.id = 's' + Date.now(); d.criado_por = me.nome; L2.push(d); } return { ok: true, selecoes: clone(L2) }; }
        case 'deleteSelecao': { window.__sel = (window.__sel || []).filter(x => x.id !== p.id); return { ok: true, selecoes: clone(window.__sel) }; }
        case 'saveUserFoto': { const u = users.find(x => x.id === p.id); if (u) u.foto = p.foto || ''; L('Alterou foto', '', u ? u.login : ''); return { ok: true, users: clone(users) }; }
        case 'listFotosColab': return { ok: true, fotos: {}, lideres: {} };
        case 'saveFotoColab': return { ok: true };
        case 'setLiderSetor': return { ok: true };
        case 'saveProfile': if (p.nome !== undefined) me.nome = p.nome; if (p.cargo !== undefined) me.cargo = p.cargo; if (p.foto !== undefined) me.foto = p.foto; return { ok: true, user: clone(me) };
        case 'changePassword': return { ok: true };
        case 'getLog': return { ok: true, log: clone(log) };
        case 'logout': return { ok: true };
      }
      throw new Error('Ação não suportada no modo demo');
    }
  };
})();
