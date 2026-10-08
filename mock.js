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
  const contrHeader = ['DATA', 'LOJA', 'COLABORADOR', 'SETOR', 'FUNÇÃO', 'ASO ADMISSONAL', 'HCM/EXPORTADO', 'CONTRATO', 'Status Alocação'];
  const contr = [];
  for (let i = 0; i < 12; i++) {
    contr.push({ row: i + 2, DATA: br(addD(Math.floor(rnd() * 14) - 4)), LOJA: pick(['Matriz', 'Messejana', 'Torra', 'Eusébio']), COLABORADOR: nome(), SETOR: pick(['FRENTE DE LOJA', 'PADARIA', 'FLV', 'DEPÓSITO']), 'FUNÇÃO': pick(['OPERADOR(A) DE CAIXA', 'REPOSITOR(A)', 'BALCONISTA', 'AUXILIAR']), 'ASO ADMISSONAL': pick(['FEITO', 'MARCADO', 'AGUARDANDO']), 'HCM/EXPORTADO': pick(['SIM', 'NÃO']), CONTRATO: 'INTEGRAL', 'Status Alocação': pick(['Pendente', 'Pendente', 'Alocado']) });
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
        case 'setPadrao': { const l = lojas.find(x => x.key === p.loja); const sc = l.setores.find(x => x.nome === p.setor); const antes = sc.padrao; sc.padrao = +p.padrao; let n = 0; if (p.novas) for (let i = 0; i < p.novas.qtd; i++) { this.exec('addPosicao', { loja: p.loja, setor: p.setor, funcao: p.novas.funcao, contrato: p.novas.contrato, qt: 1 }); n++; } sc.padrao = +p.padrao; (p.remover || []).forEach(x => this.exec('removerPosicao', { loja: p.loja, row: x.row })); return { ok: true, antes, padrao: +p.padrao, criadas: n, removidas: (p.remover || []).length }; }
        case 'desligarLote': p.itens.forEach(it => this.exec('desligar', Object.assign({}, it, { dataDesligamento: p.dataDesligamento, tipo: p.tipo, responsavel: p.responsavel }))); return { ok: true, total: p.itens.length, erros: [] };
        case 'setVagaInfoLote': p.itens.forEach(it => this.exec('setVagaInfo', Object.assign({}, it, { data: p.data }))); return { ok: true, total: p.itens.length, erros: [] };
        case 'contrBulkSet': p.rows.forEach(x => { const c = contr.find(y => y.row === x.row); if (c) c[p.campo] = p.valor; }); return { ok: true, total: p.rows.length };
        case 'cruzarContr': { const nomes = {}; lojas.forEach(l => l.setores.forEach(s => s.linhas.forEach(r => { if (r.nome) nomes[r.nome] = l.key + ' · ' + r.funcao; }))); const A = [], D = []; contr.forEach(c => { if (/Alocado|Desligado/.test(c['Status Alocação'])) return; if (desl.some(d => d.nome === c.COLABORADOR)) D.push({ row: c.row, nome: c.COLABORADOR }); else if (nomes[c.COLABORADOR]) A.push({ row: c.row, nome: c.COLABORADOR, onde: nomes[c.COLABORADOR] }); }); if (!p.simular) { A.forEach(x => contr.find(c => c.row === x.row)['Status Alocação'] = 'Alocado'); D.forEach(x => contr.find(c => c.row === x.row)['Status Alocação'] = 'Desligado'); } return { ok: true, alocados: A, desligados: D }; }
        case 'login': return { ok: true, token: 'demo', user: clone(me) };
        case 'bootstrap': return { ok: true, user: clone(me), lojas: clone(lojas), contratacoes: { header: contrHeader, headerRow: 1, rows: clone(contr), opcoes: { 'ASO ADMISSONAL': ['FEITO', 'MARCADO', 'AGUARDANDO'], 'HCM/EXPORTADO': ['SIM', 'NÃO'], 'Status Alocação': ['Pendente', 'Alocado'], LOJA: ['Matriz', 'Messejana', 'Torra', 'Eusébio'], CONTRATO: ['INTEGRAL', 'PARCIAL', 'JOVEM APRENDIZ', 'ESTÁGIO'] } }, experiencias: clone(exp), cfg: clone(cfg), pendentes: clone(sols.filter(x => x.status === 'PENDENTE')), notif: nf(), desligados: clone(desl), etapas: ['Aberta', 'Divulgação', 'Triagem', 'Entrevista', 'Aprovado', 'Admissão'], vagasFechadas: clone(fechadas), log: clone(log.slice(0, 40)), atualizadoEm: new Date().toLocaleString('pt-BR').slice(0, 17) };
        case 'saveRow': { const { r } = rowOf(p.loja, p.row); Object.assign(r, { nome: p.data.nome, funcao: p.data.funcao, contrato: p.data.contrato, situacao: p.data.situacao, tag: p.data.tag }); if (p.data.qt) r.qt = +p.data.qt; L('Editou posição', p.loja, r.funcao); return { ok: true }; }
        case 'abrirVaga': { const { r } = rowOf(p.loja, p.row); const ant = r.nome; if (p.motivo === 'EM AVISO') r.situacao = 'EM AVISO, VAGA'; else { r.nome = ''; r.situacao = 'VAGA'; r.tag = ''; r.tempo = ''; } r.vid = 'v' + (vidN++); r.info = { etapa: 'Aberta', responsavel: me.nome, abertura: iso(today), previsao: '', candidatos: '', motivo: p.motivo + (ant ? ' — ' + ant : ''), obs: p.obs || '' }; L('Abriu vaga', p.loja, r.funcao); return { ok: true }; }
        case 'preencherVaga': case 'alocar': { const { r, s } = rowOf(p.loja, p.row); if (r.info) fechadas.push({ loja: p.loja, funcao: r.funcao, setor: s.nome, abertura: r.info.abertura, fechamento: iso(today), por: p.nome }); r.nome = p.nome.toUpperCase(); r.situacao = 'OK'; r.tag = p.tag || ''; if (p.contrato) r.contrato = p.contrato; r.vid = ''; r.info = null; r.tempo = '0 anos e 0 meses'; if (p.contrRow) { const c = contr.find(x => x.row === p.contrRow); if (c) c['Status Alocação'] = 'Alocado'; } L('Preencheu vaga', p.loja, r.funcao + ' → ' + r.nome); return { ok: true }; }
        case 'addPosicao': { const l = lojas.find(x => x.key === p.loja); const s = l.setores.find(x => x.nome === p.setor); const nr = Math.max(...lojas.flatMap(x => x.setores.flatMap(y => y.linhas.map(z => z.row)))) + 1; s.linhas.push({ row: nr, qt: +p.qt || 1, nome: '', funcao: p.funcao, contrato: p.contrato, situacao: 'VAGA', tag: '', tempo: '', vid: 'v' + (vidN++), info: { etapa: 'Aberta', responsavel: me.nome, abertura: iso(today), candidatos: '', motivo: 'Aumento de quadro', obs: '' } }); s.padrao += +p.qt || 1; L('Nova posição', p.loja, p.funcao); return { ok: true }; }
        case 'removerPosicao': { const { s, r } = rowOf(p.loja, p.row); s.linhas.splice(s.linhas.indexOf(r), 1); L('Removeu posição', p.loja, r.funcao); return { ok: true }; }
        case 'setVagaInfo': { const { r } = rowOf(p.loja, p.row); r.vid = r.vid || 'v' + (vidN++); r.info = Object.assign({ etapa: 'Aberta', abertura: iso(today), responsavel: '', candidatos: '', motivo: '', obs: '', previsao: '' }, r.info || {}, p.data); if (p.data.etapa) L('Etapa da vaga', p.loja, r.funcao + ' → ' + p.data.etapa); return { ok: true }; }
        case 'addContratacao': { const d = Object.assign({ row: contr.length + 2 }, p.data); if (/^\d{4}-/.test(d.DATA)) d.DATA = d.DATA.split('-').reverse().join('/'); let alocado = false; if (p.vaga) { this.exec('preencherVaga', { loja: p.vaga.loja, row: p.vaga.row, nome: d.COLABORADOR }); d['Status Alocação'] = 'Alocado'; alocado = true; } else d['Status Alocação'] = 'Pendente'; contr.push(d); L('Nova contratação', '', d.COLABORADOR); return { ok: true, alocado }; }
        case 'saveContratacao': { const c = contr.find(x => x.row === p.row); Object.assign(c, p.data); if (/^\d{4}-/.test(c.DATA)) c.DATA = c.DATA.split('-').reverse().join('/'); return { ok: true }; }
        case 'listUsers': return { ok: true, users: clone(users) };
        case 'saveUser': { const d = p.data; if (d.id) Object.assign(users.find(u => u.id === d.id), { login: d.login, nome: d.nome, perfil: d.perfil, lojas: d.lojas, ativo: d.ativo !== false, cargo: d.cargo }); else users.push({ id: 'u' + Date.now(), login: d.login, nome: d.nome, perfil: d.perfil, lojas: d.lojas, ativo: true, cargo: d.cargo, foto: '', ultimoAcesso: '' }); L(d.id ? 'Editou acesso' : 'Criou acesso', '', d.login); return { ok: true, users: clone(users) }; }
        case 'deleteUser': users = users.filter(u => u.id !== p.id); return { ok: true, users: clone(users) };
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
        case 'saveProfile': if (p.nome !== undefined) me.nome = p.nome; if (p.cargo !== undefined) me.cargo = p.cargo; if (p.foto !== undefined) me.foto = p.foto; return { ok: true, user: clone(me) };
        case 'changePassword': return { ok: true };
        case 'getLog': return { ok: true, log: clone(log) };
        case 'logout': return { ok: true };
      }
      throw new Error('Ação não suportada no modo demo');
    }
  };
})();
