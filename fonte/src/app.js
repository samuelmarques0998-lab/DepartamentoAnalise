// ---------- Estado e arranque ----------
const App = {
  db: null, perfil: null, cfg: null, vista: 'relatorio',
  d: { jogos: [], estEq: [], estJog: [], eventos: [], mapas: [], importacoes: [] },
  idx: {}, graficos: [],
  rel: { competicao: 'todas', local: 'todos', periodo: 'todos', metrica: null, metricasJog: null, por90: true, ordem: { col: 'minutos', desc: true } },
  cod: { jogoId: null, editarId: null, tipo: 'oportunidade', lado: 'nos', parte: '1.ª parte', zona: null, filtro: 'todos' },
  imp: { tipo: 'equipa', tab: null, ficheiro: null, analise: null, jogoId: null, lado: 'nos' }
};
// Papéis: departamento (tudo), colaborador (quase tudo, com restrições) e equipa técnica (sem acesso).
const ehDep = () => App.perfil?.papel === 'departamento';
const ehColab = () => App.perfil?.papel === 'colaborador';
// Colaborador com autorização para importar as estatísticas de equipa e de jogadores (Definições → Colaboradores).
const ehImportador = () => ehColab() && !!App.perfil?.pode_importar;
const podeImportar = () => ehDep() || ehImportador();
const acessoVista = so => !so || (so === 'departamento' ? ehDep() : so === 'importar' ? podeImportar() : pode());
// pode(): pode usar e editar a aplicação. As zonas reservadas ao departamento usam ehDep().
const pode = () => ehDep() || ehColab();
// Os colaboradores criam e editam, mas não apagam (a base de dados também o impede).
const podeApagar = () => ehDep();

const CRITERIOS_PADRAO = {
  oportunidade: 'Registar como oportunidade de golo:\n• Qualquer remate dentro da área com pouca ou nenhuma oposição, ou situação em que a bola chega a um jogador em posição de finalizar com real probabilidade de golo, mesmo sem remate.\n• Todos os golos.\n\nMomento › sub-momento: Organização (jogo exterior, jogo interior), Transição (ataque rápido, contra-ataque, recuperação alta) e Esquema tático (canto, livre, lançamento, penálti).\n\nMecanismo: um só, a última ação que criou a oportunidade. Ex.: um 1x1 que termina em cruzamento alto é "Cruzamento alto"; um remate de fora da área depois de um ressalto é "2.ª bola".\n• Cruzamento alto / rasteiro (tenso, entre o GR e a defesa) / atrasado (para trás, a partir da linha de fundo).\n• Rotura: passe ou desmarcação nas costas da defesa.\n• Combinação interior: tabelas e jogo entre linhas pelo corredor central.\n• 1x1: nasce de um drible ou condução.\n• Remate exterior: remate de fora da área sem ação de criação relevante antes.\n• 2.ª bola: ressalto, alívio ou defesa do GR.\n\nLado: corredor por onde se desenvolveu o ataque, do ponto de vista de quem ataca.\nLocal: clicar onde aconteceu a finalização e onde foi feito o último passe (a app calcula as zonas 1 a 13).',
  esquema_tatico: 'Registar todos os cantos, livres laterais e frontais com cruzamento ou remate, lançamentos longos para a área e penáltis.\n\nZona: onde a bola é jogada (primeiro contacto ou zona de queda).\n\nResultado "Oportunidade" quando o esquema dá origem a uma oportunidade de golo (que deve também ser registada como oportunidade).'
};

function obterLigacao() {
  if (LIGACAO.url && LIGACAO.chave) return { url: LIGACAO.url, chave: LIGACAO.chave };
  return lsGet('analise_ligacao');
}

async function iniciar() {
  const conf = obterLigacao();
  if (!conf) return ecraLigacao();
  try {
    App.db = conf.demo ? new LocalDB() : new SupaDB(conf.url, conf.chave);
    if (!conf.demo) {
      const s = await App.db.sessao();
      if (!s) return ecraEntrar();
      App.db.sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
    }
    await entrarNaApp();
    if (!conf.demo) ligarTempoReal();
  } catch (e) {
    ecraLigacao(e.message);
  }
}

function ecraSimples(html) {
  document.body.className = 'ecra-entrada';
  $('#app').innerHTML = `<div class="fundo-img" aria-hidden="true"></div><main class="entrada"><div class="entrada-marca">${marcaSVG()}<span>Departamento de Análise</span></div>${html}</main>`;
}

function ecraLigacao(erro) {
  ecraSimples(`
    <h1>Ligar ao Supabase</h1>
    <p class="nota">Encontra estes dados no Supabase em <b>Project Settings › API</b>. Ficam guardados só neste browser; para publicar na Vercel, escreva-os no topo do ficheiro <code>index.html</code>.</p>
    ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
    <form id="f-ligacao" class="pilha">
      <label>URL do projeto<input name="url" type="url" required placeholder="https://xxxx.supabase.co" autocomplete="off"></label>
      <label>Chave pública (anon key)<input name="chave" required autocomplete="off"></label>
      <button class="btn btn-prim">Ligar</button>
    </form>
    <div class="separador"><span>ou</span></div>
    <button class="btn" id="b-demo">Experimentar com dados de demonstração</button>`);
  $('#f-ligacao').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    lsSet('analise_ligacao', { url: f.get('url').trim().replace(/\/+$/, ''), chave: f.get('chave').trim() });
    iniciar();
  });
  $('#b-demo').addEventListener('click', () => { lsSet('analise_ligacao', { demo: true }); iniciar(); });
}

function ecraEntrar(erro) {
  ecraSimples(`
    <h1>Entrar</h1>
    ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
    <form id="f-entrar" class="pilha">
      <label>Email<input name="email" type="email" required autocomplete="username"></label>
      <label>Palavra-passe<input name="pw" type="password" required autocomplete="current-password"></label>
      <button class="btn btn-prim">Entrar</button>
    </form>
    ${LIGACAO.url ? '' : '<button class="btn-link" id="b-mudar">Mudar de projeto Supabase</button>'}`);
  $('#f-entrar').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const b = e.target.querySelector('button');
    b.disabled = true; b.textContent = 'A entrar…';
    try { await App.db.entrar(f.get('email'), f.get('pw')); await entrarNaApp(); }
    catch (err) { ecraEntrar(err.message); }
  });
  $('#b-mudar')?.addEventListener('click', () => { lsDel('analise_ligacao'); iniciar(); });
}

// Cópia de segurança: todas as tabelas, lidas de novo da base de dados, num só ficheiro JSON.
const TABELAS_COPIA = [['configuracao', 'id'], ['jogos', 'data'], ['estatisticas_equipa', 'updated_at'], ['estatisticas_jogador', 'updated_at'], ['eventos', 'created_at'],
  ['mapeamento_nomes', 'original'], ['importacoes', 'created_at'], ['jogadores', 'nome'], ['agenda', 'data'], ['partidas', 'jornada'], ['estatisticas_liga', 'updated_at'],
  ['jogadores_adversarios', 'nome'], ['onzes', 'created_at'], ['arquivo', 'jornada'], ['estatisticas_adversario', 'data'], ['simbolos_equipas', 'chave'], ['scout_equipas', 'equipa'], ['scout_jogadores', 'nome'], ['scout_avaliacoes', 'created_at']];
// Chave de cada tabela para repor uma cópia (atualiza ou volta a criar o registo; nunca apaga).
const CHAVE_COPIA = { configuracao: 'id', mapeamento_nomes: 'tipo,original', simbolos_equipas: 'chave' };
const ORDEM_REPOR = ['configuracao', 'simbolos_equipas', 'mapeamento_nomes', 'importacoes', 'jogos', 'partidas', 'jogadores', 'jogadores_adversarios', 'estatisticas_equipa', 'estatisticas_jogador', 'estatisticas_liga', 'estatisticas_adversario', 'eventos', 'onzes', 'arquivo', 'agenda', 'scout_equipas', 'scout_jogadores', 'scout_avaliacoes'];
async function reporCopia(ficheiro, progresso = () => {}) {
  const c = JSON.parse(await ficheiro.text());
  if (c?.aplicacao !== 'Departamento de Análise' || !c.tabelas) throw new Error('Este ficheiro não é uma cópia de segurança da aplicação.');
  let n = 0, saltados = 0;
  for (const t of ORDEM_REPOR) {
    const linhas = c.tabelas[t]; if (!Array.isArray(linhas) || !linhas.length) continue;
    for (let i = 0; i < linhas.length; i += 400) {
      progresso(t, i, linhas.length);
      const bloco = linhas.slice(i, i + 400);
      try { await App.db.upsert(t, bloco, CHAVE_COPIA[t] || 'id'); n += bloco.length; }
      catch {
        // Algum registo choca com outro criado depois da cópia (o mesmo jogo, por exemplo): repõe um a um e salta esses.
        for (const r of bloco) { try { await App.db.upsert(t, [r], CHAVE_COPIA[t] || 'id'); n++; } catch { saltados++; } }
      }
    }
  }
  return { n, saltados };
}
async function descarregarCopia() {
  const tabelas = {}; let n = 0;
  for (const [t, ordem] of TABELAS_COPIA) {
    try { tabelas[t] = await App.db.listar(t, ordem); n += tabelas[t].length; } catch { tabelas[t] = null; /* tabela ainda não criada */ }
  }
  const copia = { aplicacao: 'Departamento de Análise', versao: 1, criada_em: new Date().toISOString(), origem: App.db.modo === 'supabase' ? App.db.url : 'demonstracao', tabelas };
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `copia-seguranca-analise-${hojeIso()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return n;
}

async function entrarNaApp() {
  App.perfil = await App.db.perfil();
  // A aplicação é só do departamento: outras contas não leem dados (regras do Supabase) e ficam neste aviso.
  if (!pode()) {
    ecraSimples(`<h1>Sem acesso</h1><p>A conta <b>${esc(App.perfil.email || '')}</b> não tem acesso a esta aplicação. Peça ao departamento de análise para lhe dar acesso.</p><button class="btn" id="b-sair-sem">Sair</button>`);
    $('#b-sair-sem').addEventListener('click', async () => { await App.db.sair(); location.reload(); });
    return;
  }
  await carregarDados();
  App.vista = (location.hash.slice(1) || 'visao');
  if (!VISTAS[App.vista]) App.vista = 'visao';
  desenharEstrutura();
  mostrarVista(App.vista);
  avisoCopia();
}

// Cache das tabelas.
// - Em memória: numa atualização automática só se volta a ler o que mudou.
// - No browser (IndexedDB, só com o Supabase): ao abrir a app pedem-se apenas as linhas alteradas desde a última vez
//   (updated_at, marcado pela base de dados) e a lista de chaves, para saber o que foi apagado.
App.cacheTabelas = {};
const CACHE_VERSAO = 1;
const CACHE_SEM_DELTA = new Set(['perfis', 'mapeamento_nomes']); // pequenas ou sem chave simples: leem-se sempre inteiras
const chaveTabela = t => (t === 'simbolos_equipas' ? 'chave' : 'id');
const cacheIdb = {
  _db: null,
  abrir() {
    if (this._db) return this._db;
    this._db = new Promise(res => {
      try {
        const r = indexedDB.open('analise-cache', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('tabelas');
        r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
      } catch { res(null); }
    });
    return this._db;
  },
  async _op(modo, fn) {
    const db = await this.abrir(); if (!db) return null;
    return new Promise(res => {
      try { const tx = db.transaction('tabelas', modo); const r = fn(tx.objectStore('tabelas')); tx.oncomplete = () => res(r?.result ?? null); tx.onerror = tx.onabort = () => res(null); }
      catch { res(null); }
    });
  },
  ler(k) { return this._op('readonly', st => st.get(k)); },
  gravar(k, v) { return this._op('readwrite', st => st.put(v, k)); },
  limpar() { return this._op('readwrite', st => st.clear()); }
};
const prefixoCache = () => `${CACHE_VERSAO}|${App.db.url || ''}|${App.perfil?.id || ''}|`;
function compararValores(a, b) {
  if (a === b) return 0; if (a == null) return 1; if (b == null) return -1; // como no Postgres: nulos no fim
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  const sa = String(a), sb = String(b);
  return /^\d{4}-\d\d-\d\d/.test(sa) && /^\d{4}-\d\d-\d\d/.test(sb) ? (sa < sb ? -1 : 1) : sa.localeCompare(sb, 'pt');
}
const ordenarLinhas = (l, ordem, k) => l.sort((x, y) => compararValores(x[ordem], y[ordem]) || compararValores(x[k], y[k]));
async function sincronizarTabela(t, ordem) {
  const k = chaveTabela(t);
  if (App.db.modo !== 'supabase' || CACHE_SEM_DELTA.has(t)) return App.db.listar(t, ordem);
  const ck = prefixoCache() + t;
  const guardada = App.cacheTabelas[t] ? { linhas: App.cacheTabelas[t] } : await cacheIdb.ler(ck);
  if (!guardada?.linhas) {
    const l = await App.db.listar(t, ordem);
    cacheIdb.gravar(ck, { linhas: l });
    return l;
  }
  const max = guardada.linhas.reduce((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), '');
  // Margem de 5 minutos: apanha gravações que ainda estavam a acontecer na última leitura.
  const desde = max ? new Date(Date.parse(max) - 5 * 60e3).toISOString() : null;
  const [mudadas, chaves] = await Promise.all([
    desde ? App.db.listar(t, ordem, { desde }) : App.db.listar(t, ordem),
    App.db.listar(t, k, { colunas: k })]);
  const existe = new Set(chaves.map(r => r[k]));
  const porChave = new Map(guardada.linhas.filter(r => existe.has(r[k])).map(r => [r[k], r]));
  let mudou = porChave.size !== guardada.linhas.length;
  for (const r of mudadas) { const v = porChave.get(r[k]); if (!v || v.updated_at !== r.updated_at || JSON.stringify(v) !== JSON.stringify(r)) { porChave.set(r[k], r); mudou = true; } }
  // Linhas que não estavam guardadas e não vieram como alteradas (ex.: passou a ter acesso a elas): pedem-se pela chave.
  const faltam = [...existe].filter(c => !porChave.has(c));
  if (faltam.length) { for (const r of await App.db.listar(t, ordem, { em: [k, faltam] })) porChave.set(r[k], r); mudou = true; }
  if (!mudou && App.cacheTabelas[t]) return App.cacheTabelas[t];
  const l = ordenarLinhas([...porChave.values()], ordem, k);
  if (mudou) cacheIdb.gravar(ck, { linhas: l });
  return l;
}
async function lerTabela(t, ordem) {
  const alt = App._alteradas;
  if (alt && !alt.has(t) && App.cacheTabelas[t]) return structuredClone(App.cacheTabelas[t]);
  const l = await sincronizarTabela(t, ordem);
  App.cacheTabelas[t] = l;
  return structuredClone(l);
}
async function carregarDados(alteradas = null) {
  App._alteradas = alteradas;
  try { await carregarDadosTabelas(); } finally { App._alteradas = null; }
}
async function carregarDadosTabelas() {
  // Tudo em paralelo. Tabelas que ainda não existam (versões antigas da base de dados) não impedem a app de abrir.
  const opc = (t, o) => lerTabela(t, o).then(l => ({ ok: true, l }), () => ({ ok: false, l: [] }));
  const [cfgR, jogosR, estEqR, estJogR, eventosR, mapasR, importacoesR, plantelR, agendaR, perfisR, partidasR, ligaR, estAdvR, arquivoR, plantelAdvR, onzesR, simbR, scoutR, scoutAvR, scoutEqR] = await Promise.all([
    lerTabela('configuracao', 'id'), lerTabela('jogos', 'data'), lerTabela('estatisticas_equipa', 'updated_at'),
    lerTabela('estatisticas_jogador', 'updated_at'), lerTabela('eventos', 'created_at'),
    lerTabela('mapeamento_nomes', 'original'), lerTabela('importacoes', 'created_at'),
    opc('jogadores', 'nome'), opc('agenda', 'data'), ehDep() ? opc('perfis', 'email') : Promise.resolve({ ok: false, l: [] }),
    opc('partidas', 'jornada'), opc('estatisticas_liga', 'updated_at'), opc('estatisticas_adversario', 'data'), opc('arquivo', 'jornada'),
    opc('jogadores_adversarios', 'nome'), opc('onzes', 'created_at'), opc('simbolos_equipas', 'chave'),
    ehDep() ? opc('scout_jogadores', 'nome') : Promise.resolve({ ok: false, l: [] }), ehDep() ? opc('scout_avaliacoes', 'created_at') : Promise.resolve({ ok: false, l: [] }), ehDep() ? opc('scout_equipas', 'equipa') : Promise.resolve({ ok: false, l: [] })]);
  let cfg = cfgR, jogos = jogosR, estEq = estEqR, estJog = estJogR, eventos = eventosR, mapas = mapasR, importacoes = importacoesR;
  // A tabela do plantel chegou numa versão posterior: se ainda não existir, a app continua a funcionar.
  let plantel = plantelR.l; App.semPlantel = !plantelR.ok;
  let agenda = agendaR.l; App.semAgenda = !agendaR.ok;
  // O colaborador só vê as suas tarefas (no Supabase são as regras que o garantem; aqui também, para a demonstração).
  if (ehColab()) agenda = agenda.filter(e => e.tipo === 'tarefa' && e.atribuido_a === App.perfil.id);
  // Lista de colaboradores, para o departamento lhes atribuir tarefas.
  App.colaboradores = perfisR.l.filter(p => p.papel === 'colaborador');
  let partidas = partidasR.l; App.semPartidas = !partidasR.ok;
  let liga = ligaR.l, estAdv = estAdvR.l;
  let arquivo = arquivoR.l; App.semArquivo = !arquivoR.ok;
  let plantelAdv = plantelAdvR.l, onzes = onzesR.l; App.semObservacao = !(plantelAdvR.ok && onzesR.ok);
  // Scout: só o departamento; não depende da equipa nem da época.
  App.d.scout = scoutR.l; App.d.scoutAval = scoutAvR.l; App.d.scoutEq = scoutEqR.l; App.semScoutEquipas = !scoutEqR.ok; App.semScout = ehDep() && !(scoutR.ok && scoutAvR.ok);
  // ---- Equipa (Principal / Sub-23): cada uma tem os seus jogos, liga, plantel, observação, arquivo e calendário. ----
  if (!ESCALOES[App.escalao]) { const g = lsGet('analise_escalao'); App.escalao = ESCALOES[g] ? g : 'principal'; }
  const doEscalao = r => escalaoDaLinha(r) === App.escalao;
  jogos = jogos.filter(doEscalao); partidas = partidas.filter(doEscalao); liga = liga.filter(doEscalao); onzes = onzes.filter(doEscalao);
  arquivo = arquivo.filter(doEscalao); estAdv = estAdv.filter(doEscalao); plantel = plantel.filter(doEscalao); plantelAdv = plantelAdv.filter(doEscalao);
  agenda = agenda.filter(doEscalao); importacoes = importacoes.filter(doEscalao);
  // ---- Época: a app mostra uma época de cada vez (a agenda, o plantel e os planteis adversários são comuns). ----
  App.epocas = [...new Set([...jogos, ...partidas, ...liga, ...onzes, ...arquivo].map(epocaDaLinha).concat(epocaDe(hojeIso())))].sort().reverse();
  if (!epocaValida(App.epoca)) { const g = lsGet('analise_epoca'); App.epoca = epocaValida(g) ? g : epocaDe(hojeIso()); }
  const naEpoca = r => epocaDaLinha(r) === App.epoca;
  jogos = jogos.filter(naEpoca); partidas = partidas.filter(naEpoca); liga = liga.filter(naEpoca);
  onzes = onzes.filter(naEpoca); arquivo = arquivo.filter(naEpoca); estAdv = estAdv.filter(naEpoca);
  const idsJ = new Set(jogos.map(j => j.id)), idsP = new Set(partidas.map(p => p.id));
  estEq = estEq.filter(r => idsJ.has(r.jogo_id)); estJog = estJog.filter(r => idsJ.has(r.jogo_id));
  eventos = eventos.filter(e => (e.partida_id ? idsP.has(e.partida_id) : e.jogo_id ? idsJ.has(e.jogo_id) : true));
  atualizarZonasPasseAntigas(eventos);
  App.cfg = { nome_clube: '', nomes_alternativos: [], metricas_chave: [], criterios: {}, ...(cfg[0] || {}) };
  // Símbolos das equipas: tabela própria (antes vinham dentro da configuração, o que a tornava muito pesada).
  App.semTabelaSimbolos = !simbR.ok;
  if (simbR.ok) App.cfg.simbolos_equipas = { ...(App.cfg.simbolos_equipas || {}), ...Object.fromEntries(simbR.l.map(r => [r.chave, r.imagem])) };
  // Definições próprias de cada equipa (a Sub-23 guarda-as em por_escalao.sub23).
  App.cfgBase = { ...App.cfg };
  if (App.escalao !== 'principal') { const pe = App.cfg.por_escalao?.[App.escalao] || {}; for (const k of CFG_POR_ESCALAO) App.cfg[k] = pe[k] ?? null; }
  App.cfg.criterios = { ...CRITERIOS_PADRAO, ...Object.fromEntries(Object.entries(App.cfg.criterios || {}).filter(([k, v]) => v && !(k === 'oportunidade' && /^Registar como oportunidade de golo:\n• Qualquer remate dentro da área com pouca ou nenhuma oposição\.\n/.test(v)))) };
  Object.assign(App.d, { jogos, estEq, estJog, eventos, mapas, importacoes, plantel, liga, agenda, partidas, plantelAdv, onzes, arquivo, estAdv });
  const estEqPorJogo = {}, estJogPorJogo = {}, evPorJogo = {};
  // Métricas importadas com os nomes antigos: passam para os nomes do ficheiro da liga / Team stats.
  const grafias = new Map(); for (const r of [...liga, ...estAdv]) for (const k of Object.keys(r.metricas || {})) if (!grafias.has(k.toLowerCase())) grafias.set(k.toLowerCase(), k);
  for (const r of estEq) r.metricas = canonMetricas(r.metricas, grafias);
  for (const r of estEq) (estEqPorJogo[r.jogo_id] ||= {})[r.lado] = r.metricas || {};
  // Jogos sem a linha do adversário (Team stats exportado sem os dados do adversário): usa a linha do próprio adversário,
  // se o Team stats dele foi importado (mesma data); daí vêm também o xG sofrido e os remates contra.
  for (const j of jogos) {
    const E = estEqPorJogo[j.id]; if (!E?.nos || (E.adversario && Object.keys(E.adversario).length)) continue;
    const r = estAdv.find(r => r.data === j.data && mesmaEquipa(r.equipa, j.adversario)); if (!r?.metricas) continue;
    const a = r.metricas; E.adversario = { ...a }; E.nos = { ...E.nos };
    for (const [k, ka] of [['xG Sofrido', 'Golos esperados'], ['Remates contra', 'Remates'], ['Remates contra no alvo', 'Remates à baliza']]) if (E.nos[k] == null && Number.isFinite(a[ka])) E.nos[k] = a[ka];
  }
  for (const r of estJog) (estJogPorJogo[r.jogo_id] ||= []).push(r);
  for (const r of eventos) if (r.jogo_id) (evPorJogo[r.jogo_id] ||= []).push(r);
  ligaDosTeamStats(jogos, estAdv, estEqPorJogo, estEq);
  calcularOrdemJogos(jogos);
  App.idx = { estEq: estEqPorJogo, estJog: estJogPorJogo, eventos: evPorJogo, jogo: Object.fromEntries(jogos.map(j => [j.id, j])) };
  indexarPlantel();
  indexarAlvos();
}

// Competições sem ficheiro da liga (ex.: Sub-23), mas com o Team stats das outras equipas importado:
// monta os registos da liga a partir deles (jornada = n.º do jogo de cada equipa na competição, por ordem de data).
// Assim o relatório da equipa tem média da liga, posição e classificação como na Equipa Principal.
function ligaDosTeamStats(jogos, estAdv, estEqPorJogo, estEq) {
  const comLiga = new Set((App.d.liga || []).map(r => norm(r.competicao)));
  const comps = new Map();
  for (const r of estAdv) { const c = norm(r.competicao); if (!c || comLiga.has(c) || eAmigavel(r)) continue; (comps.get(c) || comps.set(c, { nome: r.competicao, rs: [] }).get(c)).rs.push(r); }
  const novos = [];
  for (const [c, { nome, rs }] of comps) {
    const nossos = jogos.filter(j => norm(j.competicao) === c && j.data);
    if (!nossos.length) continue; // só interessa nas competições em que a equipa joga
    if (new Set(rs.map(r => norm(r.equipa))).size < 4) continue; // um ou dois adversários observados não fazem uma liga
    // Jornada = n.º do jogo de cada equipa nesta competição, por ordem de data (o k-ésimo jogo de uma equipa é, em regra, a jornada k).
    const ordem = new Map();
    const porEq = new Map(); for (const r of rs) { const k = norm(r.equipa); (porEq.get(k) || porEq.set(k, []).get(k)).push(r); }
    for (const l of porEq.values()) l.sort((a, b) => a.data.localeCompare(b.data)).forEach((r, i) => ordem.set(r, i + 1));
    for (const r of rs) novos.push({ competicao: nome, jornada: ordem.get(r), equipa: r.equipa, adversario: r.adversario, local: r.local, golos: r.golos, golos_sofridos: r.golos_sofridos, metricas: r.metricas || {}, deTeamStats: true });
    const ronda = Object.fromEntries([...nossos].sort((a, b) => a.data.localeCompare(b.data)).map((j, i) => [j.id, i + 1]));
    for (const j of nossos) {
      if (j.jornada == null) j.jornada = ronda[j.id];
      const nos = estEqPorJogo[j.id]?.nos; if (!nos) continue;
      const eqNome = estEq.find(r => r.jogo_id === j.id && r.lado === 'nos')?.equipa || App.cfg.nome_clube || 'Nós';
      if (rs.some(r => r.data === j.data && mesmaEquipa(r.equipa, eqNome))) continue;
      novos.push({ competicao: nome, jornada: j.jornada, equipa: eqNome, adversario: j.adversario, local: j.local, golos: j.golos_marcados, golos_sofridos: j.golos_sofridos, metricas: nos, deTeamStats: true });
    }
  }
  if (novos.length) App.d.liga = [...(App.d.liga || []), ...novos];
}

// ---------- Estrutura ----------
const VISTAS = {
  visao: { nome: 'Visão geral', desenhar: () => desenharVisao(), icone: '<rect x="3.5" y="3.5" width="7" height="8" rx="1"/><rect x="13.5" y="3.5" width="7" height="5" rx="1"/><rect x="13.5" y="11.5" width="7" height="9" rx="1"/><rect x="3.5" y="14.5" width="7" height="6" rx="1"/>' },
  calendario: { nome: 'Calendário', desenhar: () => desenharCalendario(), icone: '<rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h0M8 17h2M12 17h2"/>' },
  equipa: { nome: 'Relatório da equipa', desenhar: () => desenharRelatorioPeriodo(), icone: '' },
  relatorio: { nome: 'Relatório pós-jogo', nomeMenu: 'Relatório pós-jogo', desenhar: () => desenharRelatorio(), icone: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><circle cx="19" cy="6" r="1.2"/>' },
  oportunidades: { nome: 'Oportunidades', desenhar: () => desenharPaginaOportunidades(), icone: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>' },
  prejogo: { nome: 'Relatório pré-jogo', desenhar: () => desenharPreJogo(), icone: '' },
  observacao: { nome: 'Observação', desenhar: () => desenharObservacao(), icone: '' },
  esquemas: { nome: 'Esquemas táticos', desenhar: () => desenharPaginaEsquemas(), icone: '' },
  rankings: { nome: 'Classificação e rankings', desenhar: () => desenharPaginaRankings(), icone: '' },
  scout: { nome: 'Scout', desenhar: () => desenharScout(), so: 'departamento', icone: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><circle cx="10.5" cy="9" r="2"/><path d="M7.2 13.6c.7-1.4 1.9-2.1 3.3-2.1s2.6.7 3.3 2.1"/>' },
  codesquemas: { nome: 'Codificação de esquemas táticos', nomeMenu: 'Esquemas táticos', desenhar: () => desenharCodEsquemas(), so: 'membro', icone: '' },
  jogadores: { nome: 'Jogadores', desenhar: () => (App.jog.modo === 'ficha' ? desenharFicha() : desenharPlantel()), icone: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>' },
  codificacao: { nome: 'Codificação de oportunidades', nomeMenu: 'Oportunidades', desenhar: () => desenharCodificacao(), icone: '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.6"/><path d="M2.5 9.5h3v5h-3M21.5 9.5h-3v5h3"/>' },
  arquivo: { nome: 'Arquivo', desenhar: () => desenharArquivo(), icone: '<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5"/><path d="M10 12.5h4"/>' },
  verificacao: { nome: 'Verificação de dados', nomeMenu: 'Verificação', desenhar: () => desenharVerificacao(), so: 'membro', icone: '' },
  estadocod: { nome: 'Estado da codificação', nomeMenu: 'Estado por jornada', desenhar: () => desenharEstadoCodificacao(), so: 'membro', icone: '' },
  importacao: { nome: 'Importação', desenhar: () => desenharImportacao(), so: 'importar', icone: '<path d="M12 15V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>' },
  jogos: { nome: 'Jogos', desenhar: () => desenharJogos(), icone: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/>' },
  definicoes: { nome: 'Definições', desenhar: () => desenharDefinicoes(), icone: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>' }
};

// Ordem do menu: secções (etiquetas), vistas soltas e grupos com submenu.
const MENU = [
  { secao: 'Início' }, 'visao', 'calendario',
  { secao: 'Análise' },
  { grupo: 'Equipa', icone: '<path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9.2-4.1-1.6-7-4.9-7-9.2V6.3z"/>', itens: ['equipa', 'relatorio', 'jogadores'] },
  { grupo: 'Adversário', icone: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>', itens: ['prejogo', 'observacao'] },
  { grupo: 'Campeonato', icone: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3"/><path d="M12 13v4M8.5 20h7M10 17h4"/>', itens: ['oportunidades', 'esquemas', 'rankings'] }, 'scout',
  { secao: 'Trabalho' }, 'arquivo',
  { grupo: 'Codificação', icone: '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.6"/><path d="M2.5 9.5h3v5h-3M21.5 9.5h-3v5h3"/>', itens: ['codificacao', 'codesquemas', 'estadocod'] },
  { grupo: 'Dados', icone: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>', itens: ['importacao', 'jogos', 'verificacao'] },
  { secao: '' }, 'definicoes'
];
const LS_MENU = 'analise_menu_abertos';
function htmlMenu() {
  const ver = k => VISTAS[k] && acessoVista(VISTAS[k].so);
  const abertos = new Set(lsGet(LS_MENU) || []);
  const link = (k, sub) => `<a href="#${k}" data-vista="${k}" class="${sub ? 'sub' : ''}">${sub ? '' : `<svg viewBox="0 0 24 24" aria-hidden="true">${VISTAS[k].icone}</svg>`}<span>${sub ? (VISTAS[k].nomeMenu || VISTAS[k].nome) : VISTAS[k].nome}</span></a>`;
  return MENU.map(m => {
    if (typeof m === 'string') return ver(m) ? link(m) : '';
    if ('secao' in m) return m.secao ? `<span class="secao-menu">${m.secao}</span>` : '<span class="secao-menu vazia" aria-hidden="true"></span>';
    const itens = m.itens.filter(ver); if (!itens.length) return '';
    const id = `sub-${norm(m.grupo).replace(/\s+/g, '-')}`; const aberto = abertos.has(m.grupo) || itens.includes(App.vista);
    return `<div class="grupo-menu ${aberto ? 'aberto' : ''}" data-grupo="${itens.join(' ')}" data-nome="${m.grupo}">
      <button type="button" class="grupo-titulo" aria-expanded="${aberto}" aria-controls="${id}"><svg viewBox="0 0 24 24" aria-hidden="true">${m.icone}</svg><span>${m.grupo}</span><svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
      <div class="grupo-itens" id="${id}">${itens.map(k => link(k, true)).join('')}</div></div>`;
  }).join('');
}
function abrirGrupo(g, abrir) {
  g.classList.toggle('aberto', abrir); $('.grupo-titulo', g).setAttribute('aria-expanded', String(abrir));
  const abertos = new Set(lsGet(LS_MENU) || []); if (abrir) abertos.add(g.dataset.nome); else abertos.delete(g.dataset.nome); lsSet(LS_MENU, [...abertos]);
}

const SIMBOLO = 'data:image/png;base64,/*SIMBOLO*/';
function marcaSVG(classe = '') {
  return `<img class="marca ${classe}" src="${SIMBOLO}" alt="" width="40" height="44">`;
}

function desenharEstrutura() {
  document.body.className = `com-lateral${App.escalao === 'sub23' ? ' escalao-sub23' : ''}`;
  const demo = App.db.modo === 'demo';
  // Nome mostrado no menu (o nome do clube nas Definições continua a servir para reconhecer a equipa nas importações).
  const clube = 'SCUT';
  $('#app').innerHTML = `
    <div class="fundo-img" aria-hidden="true"></div>
    <header class="barra-movel">
      <button class="botao-menu" id="b-menu" aria-label="Abrir menu" aria-controls="lateral" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      ${marcaSVG('marca-pequena')}<b class="nome-clube">${clube}</b><span id="vista-atual"></span>
    </header>
    <aside class="lateral" id="lateral">
      <div class="lateral-marca">${marcaSVG()}<div><b class="nome-clube">${clube}${App.escalao === 'sub23' ? ' <i class="tag-escalao">Sub-23</i>' : ''}</b><span>Departamento de Análise</span></div></div>
      <div class="lateral-filtros">
        <label class="lateral-epoca"><span class="sr-only">Equipa</span><select id="sel-escalao" aria-label="Equipa">${Object.entries(ESCALOES).map(([k, n]) => `<option value="${k}" ${k === App.escalao ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="lateral-epoca"><span class="sr-only">Época</span><select id="sel-epoca" aria-label="Época">${htmlOpcoesEpoca()}</select></label>
      </div>
      <nav class="lateral-nav" aria-label="Secções">
        ${htmlMenu()}
      </nav>
      <div class="lateral-conta">
        ${demo ? '<span class="etiqueta-demo" title="Os dados são fictícios e ficam só neste browser">Demonstração</span>' : ''}
        <span class="conta-email">${esc(App.perfil.email || '')}</span>
        <button type="button" class="menu-recolher" id="b-recolher" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7l-5 5 5 5M19 7l-5 5 5 5"/></svg><span>Recolher menu</span></button>
      </div>
    </aside>
    <div class="cortina" id="cortina" hidden></div>
    <main id="vista" tabindex="-1"></main>`;
  window.onhashchange = () => mostrarVista(location.hash.slice(1));
  $('#sel-epoca').addEventListener('change', e => mudarEpoca(e.target.value));
  $('#sel-escalao').addEventListener('change', e => mudarEscalao(e.target.value));
  // Menu recolhido: fica só com os ícones e abre por cima do conteúdo ao passar o rato (escolha guardada neste browser).
  const recolher = curto => {
    document.body.classList.toggle('menu-curto', curto);
    const b = $('#b-recolher'); b.setAttribute('aria-pressed', String(curto));
    $('span', b).textContent = curto ? 'Fixar menu aberto' : 'Recolher menu';
    b.title = curto ? 'Manter o menu sempre aberto' : 'Deixar o menu só com ícones';
  };
  recolher(!!lsGet('analise_menu_curto'));
  // Com o menu recolhido, depois de escolher uma página o menu volta a fechar (sem ficar preso pelo foco).
  $('#lateral').addEventListener('click', e => { if (document.body.classList.contains('menu-curto') && e.target.closest('.lateral-nav a') && e.detail) setTimeout(() => document.activeElement?.blur(), 0); });
  $('#b-recolher').addEventListener('click', () => { const c = !document.body.classList.contains('menu-curto'); lsSet('analise_menu_curto', c); recolher(c); if (c) document.activeElement?.blur(); });
  const lateral = $('#lateral'), cortina = $('#cortina'), bMenu = $('#b-menu');
  const menu = abrir => {
    lateral.classList.toggle('aberta', abrir); cortina.hidden = !abrir; bMenu.setAttribute('aria-expanded', String(abrir));
    if (abrir) $('.lateral-nav a[aria-current]', lateral)?.focus(); else if (document.activeElement && lateral.contains(document.activeElement)) bMenu.focus();
  };
  bMenu.addEventListener('click', () => menu(true));
  $$('.grupo-titulo', lateral).forEach(b => b.addEventListener('click', () => { const g = b.closest('.grupo-menu'); abrirGrupo(g, !g.classList.contains('aberto')); }));
  cortina.addEventListener('click', () => menu(false));
  lateral.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    menu(false);
    if (a.dataset.vista === 'jogadores' && App.jog.modo === 'ficha') { App.jog.modo = 'plantel'; if (location.hash === '#jogadores') { e.preventDefault(); mostrarVista('jogadores'); } }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && lateral.classList.contains('aberta')) menu(false); });
}

function mostrarVista(nome) {
  if (!VISTAS[nome] || !acessoVista(VISTAS[nome].so)) nome = 'visao';
  App.vista = nome;
  $$('.lateral-nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.vista === nome));
  $$('.grupo-menu').forEach(g => { const ativo = g.dataset.grupo.split(' ').includes(nome); g.classList.toggle('ativo', ativo); if (ativo && !g.classList.contains('aberto')) abrirGrupo(g, true); });
  const atual = $('#vista-atual'); if (atual) atual.textContent = VISTAS[nome].nome;
  window.scrollTo(0, 0);
  App.graficos.forEach(g => g.destroy()); App.graficos = [];
  const antiga = $('#vista'); const nova = antiga.cloneNode(false); nova.removeAttribute('style'); antiga.replaceWith(nova); // limpa os eventos da vista anterior
  if (a11yFoco) nova.focus({ preventScroll: true });
  // Um erro ao desenhar uma página fica nessa página (não faz sair da aplicação).
  try { const r = VISTAS[nome].desenhar(); if (r?.catch) r.catch(e => erroVista(nova, e)); } catch (e) { erroVista(nova, e); }
}
function erroVista(el, e) {
  console.error(e);
  el.innerHTML = `<div class="vazio"><p><b>Não foi possível mostrar esta página.</b></p><p class="erro-txt">${esc(e?.message || String(e))}</p><p class="fraco">Experimente outra página no menu. Se o erro se repetir, envie esta mensagem ao departamento.</p></div>`;
}
let a11yFoco = false;

function opcoesEpoca() {
  const [y] = epocaDe(hojeIso()).split('/').map(Number);
  const prox = `${y + 1}/${String((y + 2) % 100).padStart(2, '0')}`;
  return [...new Set([...(App.epocas || []), App.epoca, prox])].filter(epocaValida).sort().reverse();
}
async function mudarEpoca(e, redesenhar = true) {
  if (!epocaValida(e) || e === App.epoca) return;
  App.epoca = e; lsSet('analise_epoca', e);
  await carregarDados(new Set());
  const sel = $('#sel-epoca'); if (sel) sel.innerHTML = htmlOpcoesEpoca();
  if (redesenhar) mostrarVista(App.vista);
  toast(`A mostrar a época ${e}.`);
}
async function mudarEscalao(e) {
  if (!ESCALOES[e] || e === App.escalao) return;
  App.escalao = e; lsSet('analise_escalao', e);
  await carregarDados(new Set());
  desenharEstrutura(); mostrarVista(App.vista);
  toast(`A mostrar a ${ESCALOES[e]}.`);
}
// Definições que são de cada equipa.
const CFG_POR_ESCALAO = ['inicio_equipa_tecnica', 'relatorio_equipa'];
function patchCfgEscalao(patch) {
  if (App.escalao === 'principal') return patch;
  const proprios = Object.fromEntries(Object.entries(patch).filter(([k]) => CFG_POR_ESCALAO.includes(k)));
  if (!Object.keys(proprios).length) return patch;
  const resto = Object.fromEntries(Object.entries(patch).filter(([k]) => !CFG_POR_ESCALAO.includes(k)));
  const pe = { ...(App.cfgBase?.por_escalao || {}) }; pe[App.escalao] = { ...(pe[App.escalao] || {}), ...proprios };
  return { ...resto, por_escalao: pe };
}
function htmlOpcoesEpoca() { return opcoesEpoca().map(e => `<option value="${e}" ${e === App.epoca ? 'selected' : ''}>Época ${e}</option>`).join(''); }

// ---------- Atualização automática ----------
// Quando outra pessoa altera dados (Supabase Realtime), a app recarrega sozinha.
// Se estiver a meio de alguma coisa (formulário com foco, janela aberta), espera e mostra um aviso.
const TABELAS_TEMPO_REAL = ['simbolos_equipas', 'scout_equipas', 'scout_jogadores', 'scout_avaliacoes', 'agenda', 'arquivo', 'configuracao', 'estatisticas_adversario', 'estatisticas_equipa', 'estatisticas_jogador', 'estatisticas_liga', 'eventos', 'jogadores', 'jogadores_adversarios', 'jogos', 'mapeamento_nomes', 'onzes', 'partidas'];
App.rt = { pendente: false, temp: null, ultima: Date.now(), tabelas: new Set(), tudo: false };
function ligarTempoReal() {
  const sb = App.db.sb; if (!sb?.channel) return;
  const ch = sb.channel('app-dados');
  for (const t of TABELAS_TEMPO_REAL) ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => alteracaoRemota(false, t));
  ch.subscribe();
  // Ao voltar ao separador depois de algum tempo (ou se a ligação caiu), confirma se há novidades.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - App.rt.ultima > 5 * 60e3) alteracaoRemota(true); });
  window.addEventListener('online', () => alteracaoRemota(true));
}
function ocupado() {
  if (document.querySelector('dialog[open]')) return true;
  const a = document.activeElement;
  if (a && a.matches?.('input:not([type=radio]):not([type=checkbox]):not([type=button]), textarea, select, [contenteditable=true]') && a.closest('form, .cod-form, #e-form, #c-form')) return true;
  return !!document.querySelector('.sl-render');
}
function alteracaoRemota(forcar = false, tabela = null) {
  // As nossas próprias gravações também chegam por aqui: ignoradas durante uns segundos.
  if (!forcar && Date.now() - (App.db.escrevi || 0) < 4000) return;
  if (tabela) App.rt.tabelas.add(tabela); else App.rt.tudo = true;
  clearTimeout(App.rt.temp);
  App.rt.temp = setTimeout(aplicarAlteracoesRemotas, 1500); // várias alterações seguidas (importações) = uma recarga
}
async function aplicarAlteracoesRemotas() {
  if (ocupado()) { App.rt.pendente = true; avisoAtualizacao(true); clearTimeout(App.rt.temp); App.rt.temp = setTimeout(aplicarAlteracoesRemotas, 10e3); return; }
  App.rt.pendente = false; avisoAtualizacao(false);
  const y = window.scrollY;
  const alt = App.rt.tudo ? null : new Set(App.rt.tabelas); App.rt.tabelas = new Set(); App.rt.tudo = false;
  try { await recarregar(alt); App.rt.ultima = Date.now(); window.scrollTo(0, y); } catch { if (alt) alt.forEach(t => App.rt.tabelas.add(t)); else App.rt.tudo = true; }
}
function avisoAtualizacao(mostrar) {
  let b = document.getElementById('aviso-rt');
  if (!mostrar) { b?.remove(); return; }
  if (b) return;
  b = document.createElement('div'); b.id = 'aviso-rt'; b.className = 'aviso-rt'; b.setAttribute('role', 'status');
  b.innerHTML = 'Há alterações de outra pessoa. <button class="btn-link">Atualizar agora</button>';
  b.querySelector('button').addEventListener('click', () => { document.activeElement?.blur?.(); aplicarAlteracoesRemotas(); });
  document.body.appendChild(b);
}

function diasDesdeCopia() { const u = App.cfgBase?.ultima_copia; return u ? Math.floor((Date.now() - Date.parse(u)) / 864e5) : null; }
// Lembrete (só para o departamento) quando passou mais de uma semana desde a última cópia de segurança.
function avisoCopia() {
  let b = document.getElementById('aviso-copia');
  const d = diasDesdeCopia();
  const mostrar = ehDep() && App.db.modo === 'supabase' && (d === null || d >= 7) && lsGet('analise_copia_adiada') !== hojeIso();
  if (!mostrar) { b?.remove(); return; }
  if (b) return;
  b = document.createElement('div'); b.id = 'aviso-copia'; b.className = 'aviso-rt aviso-copia'; b.setAttribute('role', 'status');
  b.innerHTML = `${d === null ? 'Ainda não há cópia de segurança.' : `A última cópia de segurança foi há ${d} dias.`} <button class="btn-link" data-a="fazer">Fazer agora</button><button class="btn-link" data-a="adiar">Amanhã</button>`;
  b.addEventListener('click', ev => {
    const a = ev.target.closest('button')?.dataset.a; if (!a) return;
    if (a === 'adiar') { lsSet('analise_copia_adiada', hojeIso()); b.remove(); return; }
    location.hash = 'definicoes'; setTimeout(() => $('#def-copia')?.scrollIntoView({ block: 'start' }), 300); b.remove();
  });
  document.body.appendChild(b);
}

async function recarregar(alteradas = null) {
  await carregarDados(alteradas);
  // O menu mostra sempre "SCUT" (não muda quando se altera o nome do clube nas Definições).
  mostrarVista(App.vista);
}

// ---------- Campo (SVG) ----------
// Coordenadas dos eventos em % (0–100), a atacar para a direita.
function campoSVG({ eventos = [], metade = false, interativo = false, marcador = null, marcadorPasse = null, passes = false, classe = '', setores = false }) {
  const vx = metade ? 51 : -2, vw = metade ? 56 : 109;
  const k = metade ? 0.72 : 1;
  // Linhas do passe até à finalização (por baixo das marcas).
  const linhas = passes ? eventos.filter(e => e.passe_x != null && e.zona_x != null).map(e => `<line class="ev-linha ev-linha-${e.lado}" x1="${e.passe_x * 1.05}" y1="${e.passe_y * 0.68}" x2="${e.zona_x * 1.05}" y2="${e.zona_y * 0.68}"/><circle class="ev-passe ev-${e.lado}" cx="${e.passe_x * 1.05}" cy="${e.passe_y * 0.68}" r="${0.55 * k}"/>`).join('') : '';
  const marcas = eventos.map(e => marcaEvento(e, k)).join('');
  const mx = p => p.x * 1.05, my = p => p.y * 0.68;
  const sel = (marcador && marcadorPasse ? `<line class="marcador-linha" x1="${mx(marcadorPasse)}" y1="${my(marcadorPasse)}" x2="${mx(marcador)}" y2="${my(marcador)}"/>` : '')
    + (marcadorPasse ? `<g class="marcador marcador-passe"><circle cx="${mx(marcadorPasse)}" cy="${my(marcadorPasse)}" r="1.6"/></g>` : '')
    + (marcador ? `<g class="marcador"><circle cx="${mx(marcador)}" cy="${my(marcador)}" r="2.4"/><circle cx="${mx(marcador)}" cy="${my(marcador)}" r="0.7" class="ponto"/></g>` : '');
  return `<svg class="campo ${classe} ${interativo ? 'interativo' : ''}" viewBox="${vx} -2 ${vw} 72" ${interativo ? 'role="img" aria-label="Campo: clique para marcar a zona"' : 'role="img" aria-label="Mapa de eventos no campo"'}>
    <rect class="relva" x="${vx}" y="-2" width="${vw}" height="72"/>
    ${setores ? `<g class="setores">${[0, 2, 4].map(i => `<rect x="${52.5 + i * 6}" y="0" width="6" height="68"/>`).join('')}</g>` : ''}
    <g class="linhas">
      <rect x="0" y="0" width="105" height="68"/>
      <line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/>
      <rect x="0" y="13.84" width="16.5" height="40.32"/><rect x="88.5" y="13.84" width="16.5" height="40.32"/>
      <rect x="0" y="24.84" width="5.5" height="18.32"/><rect x="99.5" y="24.84" width="5.5" height="18.32"/>
      <path d="M16.5 26.7 A9.15 9.15 0 0 1 16.5 41.3"/><path d="M88.5 26.7 A9.15 9.15 0 0 0 88.5 41.3"/>
      <rect x="-1.5" y="30.34" width="1.5" height="7.32"/><rect x="105" y="30.34" width="1.5" height="7.32"/>
      <circle class="marca-penalti" cx="11" cy="34" r="0.35"/><circle class="marca-penalti" cx="94" cy="34" r="0.35"/><circle class="marca-penalti" cx="52.5" cy="34" r="0.35"/>
    </g>
    ${metade ? '' : '<text class="direcao" x="52.5" y="66.2">ataque →</text>'}
    <g class="eventos">${linhas}${marcas}</g>${sel}
  </svg>`;
}

function marcaEvento(e, k = 1) {
  if (e.zona_x === null || e.zona_x === undefined) return '';
  const x = e.zona_x * 1.05, y = e.zona_y * 0.68;
  const golo = e.resultado === 'Golo';
  const o = typeof dadosOportunidade === 'function' ? dadosOportunidade(e) : {};
  const titulo = `${Number.isFinite(e.minuto) ? `${e.minuto}' ` : o.tempo ? `${o.tempo} ` : ''}${[o.momento, o.sub, o.mecanismo].filter(Boolean).join(' · ') || 'Oportunidade'} · ${e.resultado || ''}${e.jogador ? ' · ' + e.jogador : ''}`;
  const cls = `ev ev-${e.lado} ${golo ? 'ev-golo' : ''} ${e.qualidade === 'Grande oportunidade' ? 'ev-grande' : ''}`;
  if (e.tipo === 'esquema_tatico') {
    return `<rect class="${cls}" x="${x - 1.1 * k}" y="${y - 1.1 * k}" width="${2.2 * k}" height="${2.2 * k}" transform="rotate(45 ${x} ${y})"><title>${esc(titulo)}</title></rect>`;
  }
  return `<circle class="${cls}" cx="${x}" cy="${y}" r="${(e.qualidade === 'Grande oportunidade' ? 1.45 : 1.1) * k}"><title>${esc(titulo)}</title></circle>`;
}

function legendaCampo() {
  return `<div class="legenda-campo">
    <span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.6" class="ev ev-nos ev-golo"/></svg>Golo</span>
    <span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.2" class="ev ev-nos"/></svg>Oportunidade</span>
    <span class="leg-tamanho">Maior = grande oportunidade</span>
  </div>`;
}

function rotuloJogo(j, curto = false) {
  if (!j) return '';
  const local = j.local === 'casa' ? '(C)' : j.local === 'fora' ? '(F)' : '';
  if (curto) return `${quandoJogo(j, true)} ${j.adversario} ${local}`.trim();
  const res = Number.isFinite(j.golos_marcados) && Number.isFinite(j.golos_sofridos) ? ` ${j.golos_marcados}–${j.golos_sofridos}` : '';
  return `${quandoJogo(j)} · ${j.adversario} ${local}${res}`;
}

function resultadoJogo(j) {
  if (!Number.isFinite(j.golos_marcados) || !Number.isFinite(j.golos_sofridos)) return null;
  return j.golos_marcados > j.golos_sofridos ? 'V' : j.golos_marcados < j.golos_sofridos ? 'D' : 'E';
}

// ---------- Jogos ----------
function desenharJogos() {
  const jogos = App.d.jogos.slice().sort((a, b) => compararJogos(b, a));
  const v = $('#vista');
  v.innerHTML = `
    <div class="cabecalho-vista">
      <div><h1>Jogos</h1><p class="nota">${jogos.length} jogos registados. Os jogos são criados ao importar estatísticas de equipa${pode() ? ', ou aqui, para codificar antes de importar' : ''}.</p></div>
      ${pode() ? '<button class="btn btn-prim" id="b-novo-jogo">Criar jogo</button>' : ''}
    </div>
    ${jogos.length ? `<div class="tabela-env"><table class="tabela">
      <thead><tr><th>Data / jornada</th><th>Adversário</th><th>Competição</th><th>Local</th><th class="num">Resultado</th><th class="num">Estatísticas</th><th class="num">Jogadores</th><th class="num">Eventos</th>${pode() ? '<th><span class="sr">Ações</span></th>' : ''}</tr></thead>
      <tbody>${jogos.map(j => {
        const est = App.idx.estEq[j.id]; const nj = (App.idx.estJog[j.id] || []).length; const ne = (App.idx.eventos[j.id] || []).length;
        const r = resultadoJogo(j);
        return `<tr>
          <td>${j.data ? fmtData(j.data) : ''}${j.data && j.jornada != null ? ' · ' : ''}${j.jornada != null ? `J${j.jornada}` : ''}</td><td><b>${esc(j.adversario)}</b></td><td>${esc(j.competicao || '–')}</td>
          <td>${j.local === 'casa' ? 'Casa' : j.local === 'fora' ? 'Fora' : j.local === 'neutro' ? 'Neutro' : '–'}</td>
          <td class="num">${r ? `<span class="res res-${r}">${r}</span> ${j.golos_marcados}–${j.golos_sofridos}` : '–'}</td>
          <td class="num">${est?.nos ? 'Sim' : '<span class="fraco">Não</span>'}</td><td class="num">${nj || '<span class="fraco">0</span>'}</td><td class="num">${ne || '<span class="fraco">0</span>'}</td>
          ${pode() ? `<td class="acoes-linha"><button class="btn-link" data-editar="${j.id}">Editar</button>${podeApagar() ? `<button class="btn-link perigo" data-apagar="${j.id}">Apagar</button>` : ''}</td>` : ''}
        </tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="vazio"><p>Ainda não há jogos.</p>${ehDep() ? '<p>Importe as estatísticas de equipa do Wyscout em <a href="#importacao">Importação</a> ou crie um jogo.</p>' : ''}</div>`}`;
  $('#b-novo-jogo')?.addEventListener('click', () => dialogoJogo());
  v.addEventListener('click', async e => {
    const ed = e.target.closest('[data-editar]'); const ap = e.target.closest('[data-apagar]');
    if (ed) dialogoJogo(App.idx.jogo[ed.dataset.editar]);
    if (ap) {
      const j = App.idx.jogo[ap.dataset.apagar];
      const n = (App.idx.eventos[j.id] || []).length;
      if (await confirmar(`Apagar o jogo com ${j.adversario} (${quandoJogo(j)})? As estatísticas importadas e ${n} eventos codificados deste jogo também são apagados.`)) {
        try { await App.db.apagar('jogos', { id: j.id }); toast('Jogo apagado.'); await recarregar(); } catch (err) { toast(err.message, 'erro'); }
      }
    }
  });
}

function dialogoJogo(j = null) {
  const d = document.createElement('dialog'); d.className = 'dialogo';
  const comps = [...new Set([...competicoesLiga(), ...ARQ_OUTRAS, ...App.d.jogos.map(x => x.competicao).filter(Boolean)])];
  d.innerHTML = `<form class="pilha" method="dialog">
    <h2>${j ? 'Editar jogo' : 'Criar jogo'}</h2>
    <div class="grelha-2">
      <label>Data<input name="data" type="date" value="${esc(j?.data || '')}"></label>
      <label>Jornada<input name="jornada" type="number" min="1" max="60" value="${j?.jornada ?? ''}"></label>
      <label>Adversário<input name="adversario" required value="${esc(j?.adversario || '')}"></label>
      <label>Competição<input name="competicao" list="l-comps" value="${esc(j?.competicao || '')}"><datalist id="l-comps">${comps.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <label>Local<select name="local"><option value="">–</option>${['casa', 'fora', 'neutro'].map(l => `<option value="${l}" ${j?.local === l ? 'selected' : ''}>${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></label>
      <label>Golos marcados<input name="gm" type="number" min="0" value="${j?.golos_marcados ?? ''}"></label>
      <label>Golos sofridos<input name="gs" type="number" min="0" value="${j?.golos_sofridos ?? ''}"></label>
    </div>
    <label>Notas<textarea name="notas" rows="2">${esc(j?.notas || '')}</textarea></label>
    <div class="acoes"><button class="btn" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-prim" value="guardar">${j ? 'Guardar alterações' : 'Criar jogo'}</button></div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'guardar') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const reg = {
      data: f.get('data') || null, jornada: f.get('jornada') === '' ? null : Number(f.get('jornada')), adversario: f.get('adversario').trim(), competicao: f.get('competicao').trim() || null,
      local: f.get('local') || null, golos_marcados: f.get('gm') === '' ? null : Number(f.get('gm')),
      golos_sofridos: f.get('gs') === '' ? null : Number(f.get('gs')), notas: f.get('notas').trim() || null
    };
    if (!reg.data && reg.jornada === null) { toast('Indique a data ou a jornada do jogo.', 'erro'); return; }
    try {
      if (j) await App.db.atualizar('jogos', { id: j.id }, reg); else await App.db.inserir('jogos', reg);
      d.close(); toast(j ? 'Jogo atualizado.' : 'Jogo criado.'); await recarregar();
    } catch (err) {
      toast(/duplicate|unique/i.test(err.message) ? 'Já existe um jogo com este adversário nesta data ou jornada.' : err.message, 'erro');
    }
  });
}

// ---------- Definições ----------
function metricasEquipaDisponiveis() {
  const s = new Set();
  for (const r of App.d.estEq) for (const k of Object.keys(r.metricas || {})) if (!k.startsWith('_')) s.add(k);
  return [...s].sort((a, b) => a.localeCompare(b));
}

function desenharDefinicoes() {
  if (ehColab()) {
    $('#vista').innerHTML = `<div class="cabecalho-vista"><div><h1>Definições</h1></div></div>
      <section class="bloco"><h2>Conta</h2><p>${esc(App.perfil.email || '')} · Colaborador</p>
        <div class="acoes-esq">${App.db.modo === 'demo' ? '<button class="btn" id="b-repor">Repor dados de demonstração</button>' : '<button class="btn" id="b-sair">Sair</button>'}</div></section>`;
    $('#b-sair')?.addEventListener('click', async () => { await App.db.sair(); location.reload(); });
    $('#b-repor')?.addEventListener('click', () => { localStorage.removeItem('analise_demo'); location.reload(); });
    return;
  }
  const c = App.cfg; const ed = pode(); const dis = ed ? '' : 'disabled';
  const mets = metricasEquipaDisponiveis();
  const v = $('#vista');
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Definições</h1>${ed ? '' : '<p class="nota">Só o departamento pode alterar estas definições.</p>'}</div></div>
    <form id="f-clube" class="bloco">
      <h2>Clube</h2>
      <p class="nota">O nome tem de ser igual ao que aparece nas exportações do Wyscout, para a importação saber quais são as linhas da vossa equipa.</p>
      <div class="grelha-2">
        <label>Nome do clube<input name="nome" value="${esc(c.nome_clube)}" ${dis} required></label>
        <label>Outros nomes usados (separados por vírgula)<input name="alt" value="${esc((c.nomes_alternativos || []).join(', '))}" ${dis}></label>
      </div>
      ${ed ? '<button class="btn btn-prim">Guardar</button>' : ''}
    </form>
    <form id="f-et" class="bloco">
      <h2>Equipa técnica</h2>
      <p class="nota">Data do primeiro jogo da equipa técnica atual. Os relatórios da equipa e as fichas dos jogadores mostram os dados antes e desde essa data. Deixe em branco para não separar.</p>
      <div class="grelha-2"><label>Primeiro jogo da equipa técnica atual<input type="date" name="inicio" value="${esc(c.inicio_equipa_tecnica || '')}" ${dis}></label></div>
      ${ed ? '<button class="btn btn-prim">Guardar</button>' : ''}
    </form>
    <form id="f-metricas" class="bloco">
      <h2>Métricas-chave</h2>
      <p class="nota">Aparecem no relatório na comparação "nós vs. adversários" e como opções rápidas nas tendências. ${mets.length ? '' : 'Ficam disponíveis depois da primeira importação.'}</p>
      <div class="chips-lista">${mets.map(m => `<label class="chip-check"><input type="checkbox" name="m" value="${esc(m)}" ${(c.metricas_chave || []).includes(m) ? 'checked' : ''} ${dis}><span>${esc(m)}</span></label>`).join('')}</div>
      ${ed && mets.length ? '<button class="btn btn-prim">Guardar</button>' : ''}
    </form>
    <form id="f-criterios" class="bloco">
      <h2>Critérios de codificação</h2>
      <p class="nota">Aparecem na página de codificação, para todos registarem os eventos da mesma forma.</p>
      <label>Oportunidades de golo<textarea name="op" rows="7" ${dis}>${esc(c.criterios.oportunidade)}</textarea></label>
      <label>Esquemas táticos<textarea name="et" rows="5" ${dis}>${esc(c.criterios.esquema_tatico)}</textarea></label>
      ${ed ? '<button class="btn btn-prim">Guardar</button>' : ''}
    </form>
    ${htmlSimbolos(ed)}
    <section class="bloco">
      <h2>Correspondência de nomes</h2>
      <p class="nota">Quando o Wyscout escreve um nome de forma diferente (ex.: "G.D. Alvorada" em vez de "GD Alvorada"), a importação passa a usar o nome normalizado.</p>
      ${App.d.mapas.length ? `<table class="tabela compacta"><thead><tr><th>Tipo</th><th>No ficheiro</th><th>Passa a</th>${ed && podeApagar() ? '<th></th>' : ''}</tr></thead><tbody>
        ${App.d.mapas.map(m => `<tr><td>${m.tipo === 'equipa' ? 'Equipa' : 'Jogador'}</td><td>${esc(m.original)}</td><td><b>${esc(m.normalizado)}</b></td>${ed && podeApagar() ? `<td class="acoes-linha"><button class="btn-link perigo" data-tipo="${esc(m.tipo)}" data-original="${esc(m.original)}">Apagar</button></td>` : ''}</tr>`).join('')}
      </tbody></table>` : '<p class="fraco">Ainda não há correspondências.</p>'}
      ${ed ? `<form id="f-mapa" class="linha-form">
        <label>Tipo<select name="tipo"><option value="equipa">Equipa</option><option value="jogador">Jogador</option></select></label>
        <label>No ficheiro<input name="original" required></label>
        <label>Passa a<input name="normalizado" required></label>
        <button class="btn">Adicionar</button></form>` : ''}
    </section>
    ${ehDep() && (App.colaboradores || []).length ? `<section class="bloco" id="def-colab">
      <h2>Colaboradores</h2>
      <p class="nota">Os colaboradores criam e editam codificação, observação, jogos, arquivo e as suas tarefas. Aqui pode dar-lhes também acesso à importação das estatísticas de equipa e de jogadores.</p>
      <table class="tabela compacta"><thead><tr><th>Nome</th><th>Importar estatísticas de equipa e jogadores</th></tr></thead><tbody>
        ${App.colaboradores.map(p => `<tr><td>${esc(p.nome || p.email || 'Sem nome')}</td><td><label class="chk"><input type="checkbox" data-pode-importar="${p.id}" ${p.pode_importar ? 'checked' : ''}> Pode importar</label></td></tr>`).join('')}
      </tbody></table><p class="nota" id="colab-estado" role="status"></p>
    </section>` : ''}
    <section class="bloco" id="def-copia">
      <h2>Cópia de segurança</h2>
      <p class="nota">Descarrega todos os dados (jogos, estatísticas, liga, codificação, plantéis, onzes, arquivo, símbolos e definições, de todas as épocas e das duas equipas) num só ficheiro. O plano gratuito do Supabase não faz cópias automáticas: faça uma por semana e guarde-a fora do computador (por exemplo, numa pasta partilhada). Os PDF e vídeos do arquivo e as exportações originais do Wyscout ficam no Supabase e não entram no ficheiro.</p>
      <div class="acoes-esq"><button class="btn" id="b-copia">Descarregar cópia de segurança</button><span class="nota" id="copia-estado">${App.cfgBase?.ultima_copia ? `Última cópia: ${fmtData(App.cfgBase.ultima_copia.slice(0, 10))}${diasDesdeCopia() > 7 ? ` (há ${diasDesdeCopia()} dias)` : ''}.` : 'Ainda não foi feita nenhuma cópia.'}</span></div>
      ${ehDep() ? `<details class="mais-detalhes"><summary>Repor a partir de uma cópia</summary>
        <p class="nota">Volta a pôr na base de dados os registos do ficheiro: os que foram apagados voltam a existir e os que foram alterados voltam ao valor da cópia. Nada do que foi criado depois da cópia é apagado.</p>
        <label class="btn">Escolher ficheiro da cópia<input type="file" id="f-repor" accept=".json,application/json" hidden></label> <span class="nota" id="repor-estado"></span></details>` : ''}
    </section>
    <section class="bloco">
      <h2>Conta e ligação</h2>
      <p>${esc(App.perfil.email || '')} · ${App.perfil.papel === 'departamento' ? 'Departamento (pode editar)' : App.perfil.papel === 'colaborador' ? 'Colaborador' : 'Equipa técnica (só consulta)'}</p>
      <p class="nota">${App.db.modo === 'demo' ? 'Está em modo de demonstração: os dados são fictícios e ficam só neste browser.' : `Ligado a ${esc(App.db.url)}.`}</p>
      <div class="acoes-esq">
        ${App.db.modo === 'demo' ? '<button class="btn" id="b-repor">Repor dados de demonstração</button>' : '<button class="btn" id="b-sair">Sair</button>'}
        ${LIGACAO.url ? '' : '<button class="btn" id="b-ligacao">Mudar ligação</button>'}
      </div>
    </section>`;

  const guardarCfg = async (patch, msg) => {
    try {
      await App.db.upsert('configuracao', [{ id: 1, ...patchCfgEscalao(patch), updated_at: new Date().toISOString() }], 'id');
      toast(msg); await recarregar();
    } catch (err) { toast(err.message, 'erro'); }
  };
  $('#f-clube').addEventListener('submit', e => {
    e.preventDefault(); const f = new FormData(e.target);
    guardarCfg({ nome_clube: f.get('nome').trim(), nomes_alternativos: f.get('alt').split(',').map(s => s.trim()).filter(Boolean) }, 'Clube guardado.');
  });
  $('#f-et').addEventListener('submit', e => {
    e.preventDefault(); guardarCfg({ inicio_equipa_tecnica: new FormData(e.target).get('inicio') || null }, 'Equipa técnica guardada.');
  });
  $('#f-metricas').addEventListener('submit', e => {
    e.preventDefault(); guardarCfg({ metricas_chave: new FormData(e.target).getAll('m') }, 'Métricas-chave guardadas.');
  });
  $('#f-criterios').addEventListener('submit', e => {
    e.preventDefault(); const f = new FormData(e.target);
    guardarCfg({ criterios: { oportunidade: f.get('op'), esquema_tatico: f.get('et') } }, 'Critérios guardados.');
  });
  ligarSimbolos(guardarCfg);
  $$('[data-pode-importar]').forEach(c => c.addEventListener('change', async () => {
    const p = App.colaboradores.find(x => x.id === c.dataset.podeImportar); const est = $('#colab-estado');
    try {
      await App.db.atualizar('perfis', { id: p.id }, { pode_importar: c.checked }); p.pode_importar = c.checked;
      est.textContent = `${p.nome || p.email}: ${c.checked ? 'pode importar estatísticas' : 'deixou de poder importar'}. A alteração vale a partir da próxima vez que abrir a app.`;
    } catch (err) { c.checked = !c.checked; est.textContent = /pode_importar|column/i.test(err.message) ? 'Falta atualizar a base de dados: corra outra vez o schema.sql no Supabase.' : traduzErro(err); }
  }));
  $('#b-copia').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; $('#copia-estado').textContent = 'A preparar a cópia…';
    try {
      const n = await descarregarCopia(); lsSet('analise_ultima_copia', hojeIso());
      try { const agora = new Date().toISOString(); await App.db.upsert('configuracao', [{ id: 1, ultima_copia: agora }], 'id'); App.cfgBase.ultima_copia = App.cfg.ultima_copia = agora; } catch { /* sem a coluna */ }
      $('#copia-estado').textContent = `Cópia descarregada (${n} registos).`; avisoCopia();
    }
    catch (err) { $('#copia-estado').textContent = ''; toast(traduzErro(err.message || String(err)), 'erro'); }
    b.disabled = false;
  });
  $('#f-repor')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!await confirmar(`Repor os dados da cópia "${f.name}"? Os registos apagados voltam e os alterados voltam ao valor da cópia. Nada é apagado.`, 'Repor')) { e.target.value = ''; return; }
    const est = $('#repor-estado');
    try {
      const { n, saltados } = await reporCopia(f, (t, i, tot) => { est.textContent = `A repor ${t} (${i}/${tot})…`; });
      est.textContent = `${n} registos repostos${saltados ? `; ${saltados} não repostos porque já existe um registo igual criado depois da cópia` : ''}.`; toast('Cópia reposta.'); await recarregar();
    } catch (err) { est.textContent = ''; toast(traduzErro(err.message || String(err)), 'erro'); }
    e.target.value = '';
  });
  $('#f-mapa')?.addEventListener('submit', async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try {
      await App.db.upsert('mapeamento_nomes', [{ tipo: f.get('tipo'), original: f.get('original').trim(), normalizado: f.get('normalizado').trim() }], 'tipo,original');
      toast('Correspondência adicionada.'); await recarregar();
    } catch (err) { toast(err.message, 'erro'); }
  });
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-original]'); if (!b) return;
    try { await App.db.apagar('mapeamento_nomes', { tipo: b.dataset.tipo, original: b.dataset.original }); toast('Correspondência apagada.'); await recarregar(); }
    catch (err) { toast(err.message, 'erro'); }
  });
  $('#b-sair')?.addEventListener('click', async () => { await App.db.sair(); location.reload(); });
  $('#b-repor')?.addEventListener('click', async () => {
    if (await confirmar('Repor os dados de demonstração? Tudo o que registou em modo de demonstração é apagado.', 'Repor')) { App.db.repor(); await recarregar(); toast('Dados de demonstração repostos.'); }
  });
  $('#b-ligacao')?.addEventListener('click', async () => {
    if (await confirmar('Desligar deste projeto e escolher outra ligação?', 'Mudar ligação')) {
      if (App.db.modo === 'supabase') await App.db.sair(); lsDel('analise_ligacao'); location.hash = ''; location.reload();
    }
  });
}

// ---- Símbolos das equipas (para os rankings do campeonato) ----
// Sem repetir o mesmo clube escrito de formas diferentes.
function juntarEquipas(nomes) {
  const out = [];
  for (const n of nomes) if (n && !out.some(x => norm(x) === norm(n) || mesmaEquipa(x, n))) out.push(n);
  return out;
}
function equipasConhecidas() {
  const liga = juntarEquipas([...(App.d.liga || []).map(r => r.equipa), ...App.d.jogos.filter(j => (App.d.liga || []).some(r => mesmaEq(r.equipa, j.adversario))).map(j => j.adversario)])
    .sort((a, b) => (eNossaEquipa(b) - eNossaEquipa(a)) || a.localeCompare(b, 'pt'));
  const outras = juntarEquipas([...App.d.jogos.map(j => j.adversario), ...(App.d.estAdv || []).flatMap(r => [r.equipa, r.adversario]),
    ...(App.d.onzes || []).flatMap(o => [o.equipa, o.adversario]), ...(App.d.plantelAdv || []).map(p => p.equipa)])
    .filter(e => !eNossaEquipa(e) && !liga.some(x => mesmaEq(x, e))).sort((a, b) => a.localeCompare(b, 'pt'));
  return { liga, outras };
}
function htmlGrelhaSimbolos(eqs, ed) {
  return `<div class="simbolos-grelha">${eqs.map(e => `
        <div class="simbolo-item">
          ${ed ? `<label class="simbolo-btn" title="Escolher símbolo de ${esc(e)}">${simboloEquipa(e, 'simb simb-grande')}<input type="file" accept="image/*" data-simbolo="${esc(e)}" class="sr-only"></label>` : simboloEquipa(e, 'simb simb-grande')}
          <span>${esc(e)}</span>
          ${ed && podeApagar() && App.cfg.simbolos_equipas?.[norm(e)] ? `<button class="btn-link perigo" data-tirar-simbolo="${esc(e)}">Remover</button>` : ''}
        </div>`).join('')}</div>`;
}
async function gravarSimbolo(nome, valor) {
  const k = norm(nome);
  if (App.semTabelaSimbolos) {
    const atual = { ...(App.cfg.simbolos_equipas || {}) };
    if (valor) atual[k] = valor; else delete atual[k];
    await App.db.upsert('configuracao', [{ id: 1, simbolos_equipas: atual, updated_at: new Date().toISOString() }], 'id');
  } else if (valor) await App.db.upsert('simbolos_equipas', [{ chave: k, imagem: valor, updated_at: new Date().toISOString() }], 'chave');
  else await App.db.apagar('simbolos_equipas', { chave: k });
  const atual = { ...(App.cfg.simbolos_equipas || {}) };
  if (valor) atual[k] = valor; else delete atual[k];
  App.cfg.simbolos_equipas = atual; App.cfgBase && (App.cfgBase.simbolos_equipas = atual);
  if (App.cacheTabelas.simbolos_equipas) delete App.cacheTabelas.simbolos_equipas;
}
async function guardarSimbolo(nome, valor) {
  await gravarSimbolo(nome, valor);
  toast(valor ? `Símbolo de ${nome} guardado.` : `Símbolo de ${nome} removido.`);
}
function htmlSimbolos(ed) {
  const { liga, outras } = equipasConhecidas();
  return `<section class="bloco" id="s-simbolos">
      <h2>Símbolos das equipas</h2>
      <p class="nota">Aparecem nos rankings, no pré-jogo, na observação e nos relatórios. Clique numa equipa para escolher a imagem do símbolo (PNG com fundo transparente fica melhor). A vossa equipa usa o símbolo do clube.</p>
      ${liga.length ? `<h3 class="simb-grupo">Campeonato</h3>${htmlGrelhaSimbolos(liga, ed)}` : '<p class="fraco">As equipas do campeonato aparecem depois de importar o ficheiro da liga.</p>'}
      ${outras.length ? `<h3 class="simb-grupo">Outras competições <small>(taças, Europa e adversários dos adversários observados)</small></h3>${htmlGrelhaSimbolos(outras, ed)}` : ''}
    </section>`;
}
// Reduz a imagem para 320 px (nítida na capa do relatório e na impressão) e guarda-a na configuração.
function imagemParaSimbolo(f) {
  return new Promise((ok, falha) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 320 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/png'));
    };
    img.onerror = () => falha(new Error('Não consegui ler a imagem.')); img.src = url;
  });
}
function ligarSimbolos(guardarCfg) {
  const guardar = async (nome, valor) => {
    try { await gravarSimbolo(nome, valor); } catch (err) { toast(traduzErro(err.message || String(err)), 'erro'); return; }
    toast(valor ? `Símbolo de ${nome} guardado.` : `Símbolo de ${nome} removido.`);
    if (App.vista === 'definicoes') mostrarVista('definicoes');
    $('#s-simbolos')?.scrollIntoView({ block: 'start' });
  };
  void guardarSimbolo;
  $$('[data-simbolo]').forEach(inp => inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return;
    try { await guardar(inp.dataset.simbolo, await imagemParaSimbolo(f)); } catch (err) { toast(err.message, 'erro'); }
  }));
  $$('[data-tirar-simbolo]').forEach(b => b.addEventListener('click', () => guardar(b.dataset.tirarSimbolo, null)));
}

document.addEventListener('keydown', () => { a11yFoco = true; }, { once: true });
window.addEventListener('DOMContentLoaded', iniciar);
// Redesenha os gráficos com o tamanho da página quando se imprime ou exporta em PDF.
const tamanhoImpressao = () => App.graficos.forEach(g => { if (!g.canvas.closest('dialog')) g.resize(700, 230); });
const tamanhoEcra = () => App.graficos.forEach(g => g.resize());
window.matchMedia('print').addEventListener('change', e => (e.matches ? tamanhoImpressao : tamanhoEcra)());
window.addEventListener('beforeprint', tamanhoImpressao);
window.addEventListener('afterprint', tamanhoEcra);
