// ---------- Relatório pós-jogo da equipa ----------
// k: colunas da própria equipa; ka: colunas do adversário no mesmo jogo (o que deixámos fazer).
// ops: oportunidades da codificação ('c' criadas, 's' sofridas).
// melhor: 1 = mais é melhor, -1 = menos é melhor, 0 = indicador de estilo (sem melhor nem pior).
const METRICAS_EQ = [
  { id: 'xg', area: 'Ataque', nome: 'xG', k: ['Golos esperados', 'xG'], melhor: 1, casas: 2 },
  { id: 'remates', area: 'Ataque', nome: 'Remates', k: ['Remates', 'Shots'], melhor: 1, casas: 0 },
  { id: 'remates_alvo_pct', area: 'Ataque', nome: 'Remates à baliza (%)', k: ['% Remates à baliza', 'Shots / on target %'], melhor: 1, casas: 0, pct: true },
  { id: 'toques_area', area: 'Ataque', nome: 'Toques na área', k: ['Toques na área', 'Touches in penalty area'], melhor: 1, casas: 0 },
  { id: 'entradas_area', area: 'Ataque', nome: 'Entradas na grande área', k: ['Entradas na grande área', 'Penalty area entries'], melhor: 1, casas: 0 },
  { id: 'entradas_conducao', area: 'Ataque', nome: 'Entradas na área em condução', k: ['Entradas na grande área corridas', 'Penalty area entries / runs'], melhor: 1, casas: 0 },
  { id: 'entradas_cruz', area: 'Ataque', nome: 'Entradas na área por cruzamento', k: ['Entradas na grande área cruzamentos', 'Penalty area entries / crosses'], melhor: 1, casas: 0 },
  { id: 'profundidade', area: 'Ataque', nome: 'Passes em profundidade recebidos', k: ['Passes em profundidade recebidos', 'Deep completed passes'], melhor: 1, casas: 0 },
  { id: 'ap_remate', area: 'Ataque', nome: 'Ataques posicionais com remate (%)', k: ['% Ataques posicionais com remates', 'Positional attacks / with shots %'], melhor: 1, casas: 0, pct: true },
  { id: 'ca_remate', area: 'Ataque', nome: 'Contra-ataques com remate (%)', k: ['% Contra-ataques com remates', 'Counterattacks / with shots %'], melhor: 1, casas: 0, pct: true },
  { id: 'bp_remate', area: 'Ataque', nome: 'Bolas paradas com remate (%)', k: ['% Bolas paradas com remates', 'Set pieces / with shots %'], melhor: 1, casas: 0, pct: true },
  { id: 'op_criadas', area: 'Ataque', nome: 'Oportunidades criadas', ops: 'c', melhor: 1, casas: 0 },
  { id: 'xg_sofrido', area: 'Defesa', nome: 'xG sofrido', k: ['xG Sofrido'], ka: ['Golos esperados', 'xG'], melhor: -1, casas: 2 },
  { id: 'remates_sofridos', area: 'Defesa', nome: 'Remates sofridos', k: ['Remates contra'], ka: ['Remates', 'Shots'], melhor: -1, casas: 0 },
  { id: 'remates_sofridos_alvo', area: 'Defesa', nome: 'Remates sofridos à baliza', k: ['Remates contra no alvo'], ka: ['Remates à baliza', 'Shots / on target'], melhor: -1, casas: 0 },
  { id: 'toques_area_sof', area: 'Defesa', nome: 'Toques na área sofridos', ka: ['Toques na área', 'Touches in penalty area'], melhor: -1, casas: 0 },
  { id: 'entradas_area_sof', area: 'Defesa', nome: 'Entradas na área sofridas', ka: ['Entradas na grande área', 'Penalty area entries'], melhor: -1, casas: 0 },
  { id: 'ppda', area: 'Defesa', nome: 'PPDA', k: ['PPDA'], melhor: -1, casas: 1, ajuda: 'passes do adversário por cada ação defensiva nossa: quanto mais baixo, mais alta a pressão' },
  { id: 'recup_altas', area: 'Defesa', nome: 'Recuperações altas', k: ['Recuperações longo', 'Recoveries / high'], melhor: 1, casas: 0 },
  { id: 'duelos_def_pct', area: 'Defesa', nome: 'Duelos defensivos ganhos (%)', k: ['% Duelos defensivos ganhos', 'Defensive duels / won %'], melhor: 1, casas: 0, pct: true },
  { id: 'duelos_aereos_pct', area: 'Defesa', nome: 'Duelos aéreos ganhos (%)', k: ['% Duelos aéreos ganhos', 'Aerial duels / won %'], melhor: 1, casas: 0, pct: true },
  { id: 'op_sofridas', area: 'Defesa', nome: 'Oportunidades sofridas', ops: 's', melhor: -1, casas: 0 },
  { id: 'posse', area: 'Posse', nome: 'Posse (%)', k: ['Posse', 'Possession, %'], melhor: 0, casas: 0, pct: true },
  { id: 'passes_pct', area: 'Posse', nome: 'Passes certos (%)', k: ['% Passes certos', 'Passes / accurate %'], melhor: 1, casas: 0, pct: true },
  { id: 'terco_final', area: 'Posse', nome: 'Passes certos para o terço final', k: ['Passes para terço final certos', 'Passes to final third / accurate'], melhor: 1, casas: 0 },
  { id: 'progressivos', area: 'Posse', nome: 'Passes progressivos certos', k: ['Passes progressivos precisos', 'Progressive passes / accurate'], melhor: 1, casas: 0 },
  { id: 'passes_posse', area: 'Posse', nome: 'Passes por posse', k: ['Média de passes por posse', 'Average passes per possession'], melhor: 0, casas: 2 },
  { id: 'passe_longo_pct', area: 'Posse', nome: 'Passe longo (%)', k: ['% de passe longo', 'Long pass %'], melhor: 0, casas: 1, pct: true },
  { id: 'perdas_baixas', area: 'Posse', nome: 'Perdas no terço defensivo', k: ['Perdas curto', 'Losses / low'], melhor: -1, casas: 0 },
  { id: 'intensidade', area: 'Posse', nome: 'Intensidade de jogo', k: ['Intensidade de jogo', 'Match tempo'], melhor: 1, casas: 1 }
];
const AREAS_EQ = ['Ataque', 'Defesa', 'Posse'];
// Nome da métrica do ponto de vista do adversário (nas frases).
// Rankings que entram no PDF (duas métricas por área).
const RANKING_CHAVE = { Ataque: ['xg', 'toques_area'], Defesa: ['xg_sofrido', 'ppda'], Posse: ['passes_pct', 'progressivos'] };
const NOME_ADV = { xg: 'xG', toques_area: 'toques na área', remates: 'remates', op_criadas: 'oportunidades', xg_sofrido: 'xG', toques_area_sof: 'toques na área', remates_sofridos: 'remates', op_sofridas: 'oportunidades' };
const DEF_EQ = Object.fromEntries(METRICAS_EQ.map(d => [d.id, d]));
const LS_METRICAS_REL = 'analise_rel_metricas';
// Limiares: um desvio-padrão para assinalar uma diferença; os indicadores individuais são mais exigentes.
const LIMIAR_EQ = 1, LIMIAR_TENDENCIA = 0.75, LIMIAR_IND = 1.25, MIN_MINUTOS = 45;

function valorEq(def, L) {
  if (!L) return null;
  if (def.ops) return L.ops ? L.ops[def.ops] : null;
  const k = def.k && chaveExistente(L.m, def.k); if (k) return L.m[k];
  const ka = def.ka && chaveExistente(L.a, def.ka); return ka ? L.a[ka] : null;
}
const fmtEq = (def, n) => (n === null || n === undefined ? '–' : `${fmtNum(n, def.casas)}${def.pct ? '%' : ''}`);
const fmtDifEq = (def, n) => (n === null || n === undefined ? '–' : `${fmtSinal(n, def.casas)}${def.pct ? ' p.p.' : ''}`);
function desvio(arr) {
  const v = arr.filter(Number.isFinite); if (v.length < 2) return null;
  const m = media(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}
const mesmaEq = (a, b) => !!a && !!b && (norm(a) === norm(b) || mesmaEquipa(a, b));

// ---- Dados ----
function contarOps(a) {
  const evs = (App.idx.eventosAlvo?.[a.key] || []).filter(e => e.tipo === 'oportunidade');
  if (!evs.length) return null;
  const c = { casa: 0, fora: 0 };
  for (const e of evs) { const l = ladoNoAlvo(e, a); if (l) c[l]++; }
  return c;
}
function opsDoJogo(j) {
  const a = App.idx.alvoJogo?.[j.id]; if (!a || !a.ladoNosso) return null;
  const c = contarOps(a); if (!c) return null;
  return { c: c[a.ladoNosso], s: c[a.ladoNosso === 'casa' ? 'fora' : 'casa'] };
}
// Os nossos jogos já disputados, por ordem.
function linhasNossas() {
  return App.d.jogos.filter(j => App.idx.estEq[j.id]?.nos || resultadoJogo(j)).sort(compararJogos)
    .map(j => ({ j, m: App.idx.estEq[j.id]?.nos || {}, a: App.idx.estEq[j.id]?.adversario || {}, ops: opsDoJogo(j) }));
}
// Uma linha por equipa e por jogo do ficheiro da liga, com a linha do adversário ao lado.
function linhasLiga(competicao, ateJornada) {
  if (!competicao) return [];
  const rows = (App.d.liga || []).filter(r => norm(r.competicao) === norm(competicao) && (ateJornada == null || r.jornada <= ateJornada));
  const porChave = {}; for (const r of rows) porChave[`${r.jornada}|${norm(r.equipa)}|${norm(r.adversario)}`] = r;
  const alvoPor = {};
  for (const a of App.idx.alvos || []) {
    if (a.jornada == null || norm(a.competicao) !== norm(competicao)) continue;
    alvoPor[`${a.jornada}|${norm(a.casa)}`] = { a, l: 'casa' }; alvoPor[`${a.jornada}|${norm(a.fora)}`] = { a, l: 'fora' };
  }
  const cache = {};
  return rows.map(r => {
    const op = porChave[`${r.jornada}|${norm(r.adversario)}|${norm(r.equipa)}`];
    const x = alvoPor[`${r.jornada}|${norm(r.equipa)}`]; let ops = null;
    if (x) { const c = (cache[x.a.key] ??= contarOps(x.a)); if (c) ops = { c: c[x.l], s: c[x.l === 'casa' ? 'fora' : 'casa'] }; }
    return { jornada: r.jornada, equipa: r.equipa, adversario: r.adversario, local: r.local, m: r.metricas || {}, a: op?.metricas || {}, ops };
  });
}
function metricasDoRelatorio(disponiveis) {
  const guardadas = App.cfg.relatorio_equipa?.metricas || lsGet(LS_METRICAS_REL);
  const ids = Array.isArray(guardadas) && guardadas.length ? guardadas.filter(id => DEF_EQ[id]) : METRICAS_EQ.map(d => d.id);
  return ids.filter(id => disponiveis.has(id)).map(id => DEF_EQ[id]);
}

// ---- Análise do jogo ----
function analisarMetrica(def, linhas, i, liga) {
  const L = linhas[i]; const x = valorEq(def, L); if (x === null || x === undefined) return null;
  const hist = linhas.slice(0, i).map(l => valorEq(def, l)).filter(Number.isFinite);
  const mu = media(hist), sd = desvio(hist);
  const z = hist.length >= 3 && sd > 0 ? (x - mu) / sd : null;
  // Último jogo anterior com valor (um jogo só com resultado, sem estatísticas, é saltado).
  let ant = null, antJ = null, antSalto = false;
  for (let k = i - 1; k >= 0; k--) { const v = valorEq(def, linhas[k]); if (Number.isFinite(v)) { ant = v; antJ = linhas[k].j; antSalto = k < i - 1; break; } }
  const ult5 = linhas.slice(Math.max(0, i - 4), i + 1).map(l => valorEq(def, l)).filter(Number.isFinite);
  const u5 = ult5.length >= 3 ? media(ult5) : null;
  const zt = hist.length >= 5 && sd > 0 && u5 !== null ? (u5 - mu) / sd : null;
  let recorde = null;
  if (hist.length >= 4) { if (x > Math.max(...hist)) recorde = 'max'; else if (x < Math.min(...hist)) recorde = 'min'; }
  // Valor esperado para ESTE jogo: a nossa média, mais o quanto o adversário se afasta da média da liga
  // (o que as equipas costumam ter contra ele: o que ele concede, ou o que ele cria nas métricas do que sofremos),
  // mais o efeito de jogar em casa ou fora. O peso do adversário cresce com os jogos dele (n / (n + 4)).
  let esperado = null, nEsp = 0, efeitoAdv = null, efeitoLocal = 0, esp = null, muL = null;
  if (liga.length) {
    const outros = liga.filter(l => !eNossaEquipa(l.equipa));
    const vals = outros.map(l => valorEq(def, l)).filter(Number.isFinite);
    const vs = outros.filter(l => mesmaEq(l.adversario, L.j.adversario)).map(l => valorEq(def, l)).filter(Number.isFinite);
    if (vs.length >= 2) { esperado = media(vs); nEsp = vs.length; }
    if (vs.length >= 3 && vals.length >= 10 && mu !== null && hist.length >= 3) {
      muL = media(vals);
      efeitoAdv = (esperado - muL) * vs.length / (vs.length + 4);
      const lado = L.j.local === 'casa' || L.j.local === 'fora' ? outros.filter(l => l.local === L.j.local).map(l => valorEq(def, l)).filter(Number.isFinite) : [];
      if (lado.length >= 10) efeitoLocal = media(lado) - muL;
      esp = mu + efeitoAdv + efeitoLocal;
      if (def.pct) esp = Math.max(0, Math.min(100, esp)); else esp = Math.max(0, esp);
    }
  }
  const sMedia = z !== null ? z * def.melhor : null; // positivo = melhor do que a nossa média
  const zEsp = esp !== null && sd > 0 ? (x - esp) / sd : null;
  // A avaliação usa o esperado quando existe; senão, a nossa média.
  const s = zEsp !== null ? zEsp * def.melhor : sMedia;
  return { def, x, mu, sd, z, s, sMedia, zEsp, esp, efeitoAdv, efeitoLocal, muL, n: hist.length, ant, antJ, antSalto, u5, zt, recorde, esperado, nEsp };
}

// Indicadores individuais: cada jogador comparado com a sua própria média (por 90 min).
function alertasIndividuais(linhas, i) {
  const jogo = linhas[i].j; const anteriores = linhas.slice(0, i).map(l => l.j);
  const regs = (App.idx.estJog[jogo.id] || []).filter(r => r.lado === 'nos' && r.minutos >= MIN_MINUTOS);
  const valor = (r, id) => {
    const def = METRICAS[id]; const v = valorMetricaJogo(r.metricas || {}, id); if (!Number.isFinite(v)) return null;
    if (def.d) { const kd = chaveExistente(r.metricas, def.d); return kd && r.metricas[kd] >= 4 ? v : null; }
    return v / r.minutos * 90;
  };
  const out = [];
  for (const r of regs) {
    const perfil = perfilDoJogador(r.jogador, r); if (!perfil) continue;
    const ids = [...new Set(BLOCOS.flatMap(b => PERFIS[perfil][b]))].filter(id => !METRICAS[id].estilo);
    const hist = anteriores.map(g => (App.idx.estJog[g.id] || []).find(x => x.lado === 'nos' && x.jogador === r.jogador && x.minutos >= MIN_MINUTOS)).filter(Boolean);
    if (hist.length < 3) continue;
    const cand = [];
    for (const id of ids) {
      const x = valor(r, id); if (x === null) continue;
      const h = hist.map(g => valor(g, id)).filter(Number.isFinite); if (h.length < 3) continue;
      const mu = media(h), sd = desvio(h); if (!sd) continue;
      if (x === 0 && METRICAS[id].menos) continue; // zero de algo negativo raramente é notícia
      const s = (x - mu) / sd * (METRICAS[id].menos ? -1 : 1);
      if (Math.abs(s) >= LIMIAR_IND) cand.push({ jogador: r.jogador, minutos: r.minutos, id, x, mu, s, pct: !!METRICAS[id].d });
    }
    cand.sort((a, b) => Math.abs(b.s) - Math.abs(a.s));
    out.push(...cand.filter(c => c.s > 0).slice(0, 2), ...cand.filter(c => c.s < 0).slice(0, 2));
  }
  return { destaque: out.filter(c => c.s > 0).sort((a, b) => b.s - a.s).slice(0, 6), abaixo: out.filter(c => c.s < 0).sort((a, b) => a.s - b.s).slice(0, 6), n: regs.length };
}

// ---- Página ----
function desenharRelatorio() {
  const v = $('#vista');
  const linhas = linhasNossas();
  App.pj ||= { jogoId: null, x: 'xg', y: 'xg_sofrido' };
  App.graficos.forEach(g => g.destroy()); App.graficos = [];
  if (!linhas.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Relatório pós-jogo</h1></div>
      <div class="vazio"><p>Ainda não há jogos disputados com dados.</p><p>Importe o ficheiro da liga ou as estatísticas de equipa do Wyscout em <a href="#importacao">Importação</a>.</p></div>`;
    return;
  }
  const comDados = linhas.filter(l => Object.keys(l.m).length);
  let i = linhas.findIndex(l => l.j.id === App.pj.jogoId);
  if (i < 0) i = linhas.indexOf(comDados[comDados.length - 1] || linhas[linhas.length - 1]);
  App.pj.jogoId = linhas[i].j.id;
  const L = linhas[i]; const j = L.j;
  const liga = j.jornada != null ? linhasLiga(j.competicao, j.jornada) : [];
  // As comparações (média, jogo anterior, tendência, individual) usam só os jogos da mesma competição:
  // o campeonato não se mistura com a Liga Europa nem com as taças.
  const mesmaComp = l => norm(l.j.competicao || '') === norm(j.competicao || '');
  const lc = linhas.filter(mesmaComp), ic = lc.indexOf(L);
  const nAntComp = lc.slice(0, ic).filter(l => Object.keys(l.m).length).length;
  const disponiveis = new Set(METRICAS_EQ.filter(d => lc.slice(0, ic + 1).some(l => valorEq(d, l) !== null)).map(d => d.id));
  const defs = metricasDoRelatorio(disponiveis);
  const an = defs.map(d => analisarMetrica(d, lc, ic, liga)).filter(Boolean);
  const nome = App.cfg.nome_clube || 'Nós';

  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>Relatório pós-jogo</h1><p class="nota">Cada jogo comparado com o que era de esperar contra este adversário (a nossa média ajustada ao que ele costuma fazer e ao local), com o jogo anterior e com a tendência dos últimos 5.</p></div>
      <button class="btn so-ecra botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
    </div>
    <div class="pj-seletor so-ecra">
      <button class="btn" id="pj-ant" ${i === 0 ? 'disabled' : ''} aria-label="Jogo anterior">‹</button>
      <label class="pj-select"><span class="sr-only">Jogo</span><select id="pj-jogo">${linhas.slice().reverse().map(l => `<option value="${l.j.id}" ${l.j.id === j.id ? 'selected' : ''}>${esc(rotuloJogo(l.j))}${Object.keys(l.m).length ? '' : ' (sem estatísticas)'}</option>`).join('')}</select></label>
      <button class="btn" id="pj-seg" ${i === linhas.length - 1 ? 'disabled' : ''} aria-label="Jogo seguinte">›</button>
    </div>
    <section class="pj-jogo" id="pj-cab">${cabecalhoJogo(L, nome)}</section>
    ${!Object.keys(L.m).length ? `<div class="vazio"><p>Este jogo ainda não tem estatísticas de equipa.</p><p>Importe o ficheiro da liga ou as estatísticas do Wyscout em <a href="#importacao">Importação</a>.</p></div>` : `
    <section class="bloco pj-secao" id="pj-visao">
      <h2>1. Visão geral</h2>
      <p class="nota pj-comp">Comparado só com os jogos ${j.competicao ? `desta competição (${esc(j.competicao)})` : 'sem competição'}: ${nAntComp} ${nAntComp === 1 ? 'jogo anterior' : 'jogos anteriores'} com estatísticas.</p>
      ${nAntComp < 3 ? `<p class="nota">${nAntComp ? `Só ${nAntComp === 1 ? 'há 1 jogo anterior' : `há ${nAntComp} jogos anteriores`} nesta competição` : 'É o primeiro jogo com estatísticas nesta competição'}: ainda não há média fiável, por isso há poucas ou nenhumas conclusões. Ficam mais completas à medida que houver mais jogos desta competição.</p>` : ''}
      ${htmlConclusoes(L, an, nome)}
      ${htmlMelhoriasPioras(an)}
      <div class="pj-individual"><h3>Individual</h3>
      ${htmlIndividual(lc, ic)}</div>
    </section>
    <section class="bloco pj-secao" id="pj-dados">
      <div class="bloco-cab"><h2>2. Dados por área</h2>${htmlEscolherMetricas(disponiveis, defs)}</div>
      <p class="nota so-ecra">Uma barra por jogo: a destacada é este jogo (verde se foi melhor do que o esperado, vermelho se foi pior). A linha dourada tracejada é a média dos jogos anteriores; o losango azul é o valor esperado neste jogo, ajustado ao adversário e ao local.</p>
      ${AREAS_EQ.map(area => htmlArea(area, an.filter(a => a.def.area === area))).join('')}
    </section>
    <section class="bloco pj-secao" id="pj-liga"></section>`}`;

  $('#b-pdf').addEventListener('click', () => exportarPdf(`Relatório pós-jogo ${nome} ${j.adversario} ${j.data || (j.jornada != null ? 'J' + j.jornada : '')}`));
  $('#pj-jogo').addEventListener('change', e => { App.pj.jogoId = e.target.value; desenharRelatorio(); });
  $('#pj-ant').addEventListener('click', () => { App.pj.jogoId = linhas[i - 1].j.id; desenharRelatorio(); });
  $('#pj-seg').addEventListener('click', () => { App.pj.jogoId = linhas[i + 1].j.id; desenharRelatorio(); });
  if (!Object.keys(L.m).length) return;
  ligarEscolherMetricas();
  $$('[data-ficha]', v).forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.ficha)));
  for (const a of an) desenharMini(a, lc, ic);
  desenharLigaPj(j, defs, liga);
}

function cabecalhoJogo(L, nome) {
  const j = L.j; const res = resultadoJogo(j);
  const gm = j.golos_marcados ?? '–', gs = j.golos_sofridos ?? '–';
  const [casa, fora, gc, gf] = j.local === 'fora' ? [j.adversario, nome, gs, gm] : [nome, j.adversario, gm, gs];
  const xg = valorEq(DEF_EQ.xg, L), xgs = valorEq(DEF_EQ.xg_sofrido, L);
  // Mesma ordem do resultado (casa–fora).
  const emFora = j.local === 'fora'; const par = (a, b) => (emFora ? `${b}–${a}` : `${a}–${b}`);
  const extra = [xg !== null && xgs !== null ? `xG ${par(fmtNum(xg, 2), fmtNum(xgs, 2))}` : '', L.ops ? `oportunidades ${par(L.ops.c, L.ops.s)}` : ''].filter(Boolean).join(' · ');
  return `
    <p class="pj-meta">${[j.competicao, j.jornada != null ? `Jornada ${j.jornada}` : '', j.data ? fmtData(j.data) : '', j.local === 'casa' ? 'Em casa' : j.local === 'fora' ? 'Fora' : ''].filter(Boolean).map(esc).join(' · ')}</p>
    <div class="pj-placar">
      <span class="pj-eq ${j.local === 'fora' ? '' : 'nossa'}">${esc(casa)}</span>
      <span class="pj-res">${gc}<i>–</i>${gf}</span>
      <span class="pj-eq ${j.local === 'fora' ? 'nossa' : ''}">${esc(fora)}</span>
      ${res ? `<span class="res res-${res}" aria-label="${({ V: 'Vitória', E: 'Empate', D: 'Derrota' })[res]}">${res}</span>` : ''}
    </div>
    ${extra ? `<p class="pj-extra">${esc(extra)}</p>` : ''}`;
}

// Frases com as conclusões mais pertinentes do jogo.
function htmlConclusoes(L, an, nome) {
  const j = L.j; const por = id => an.find(a => a.def.id === id);
  const frases = [];
  const xg = por('xg'), xgs = por('xg_sofrido');
  if (xg && xgs && Number.isFinite(j.golos_marcados)) {
    const dif = xg.x - xgs.x; const res = resultadoJogo(j);
    let leitura = '';
    if (res !== 'V' && dif >= 0.5) leitura = ' O desempenho justificava mais do que o resultado.';
    else if (res !== 'D' && dif <= -0.5) leitura = ' O resultado foi melhor do que o desempenho.';
    else if (Math.abs(dif) < 0.3) leitura = ' Um jogo equilibrado em qualidade de oportunidades.';
    const ef = j.golos_marcados - xg.x;
    if (ef >= 1) leitura += ' Muito eficazes na finalização.'; else if (ef <= -1) leitura += ' Faltou eficácia na finalização.';
    frases.push({ t: dif >= 0.3 ? 'bom' : dif <= -0.3 ? 'mau' : 'neutro', h: `${({ V: 'Vitória', E: 'Empate', D: 'Derrota' })[res] || 'Resultado'} por ${j.golos_marcados}–${j.golos_sofridos} com <b>${fmtNum(xg.x, 2)}</b> de xG criado e <b>${fmtNum(xgs.x, 2)}</b> sofrido.${leitura}` });
  }
  // Recordes: em relação à nossa própria época (o ajuste ao adversário entra nas frases seguintes).
  const assinaladas = an.filter(a => a.sMedia !== null && Math.abs(a.sMedia) >= LIMIAR_EQ).sort((a, b) => Math.abs(b.sMedia) - Math.abs(a.sMedia));
  const frase = a => {
    const acima = a.x > a.mu; const forte = Math.abs(a.z) >= 2 ? 'muito ' : '';
    const rec = a.recorde ? ` É o valor mais ${a.recorde === 'max' ? 'alto' : 'baixo'} da época.` : '';
    const ctx = a.esp !== null && Math.sign(a.s) !== Math.sign(a.sMedia) ? ` Mas, contra este adversário, esperava-se ${fmtEq(a.def, a.esp)}: foi ${a.s > 0 ? 'melhor' : 'pior'} do que o esperado.` : '';
    return `<b>${esc(a.def.nome)}</b>: ${fmtEq(a.def, a.x)}, ${forte}${acima ? 'acima' : 'abaixo'} da média da época (${fmtEq(a.def, a.mu)}).${rec}${ctx}`;
  };
  // Recordes da época (o resto das diferenças aparece nas listas abaixo).
  for (const a of assinaladas.filter(a => a.recorde && a.def.melhor).slice(0, 3)) frases.push({ id: a.def.id, t: (Math.sign(a.s) !== Math.sign(a.sMedia) ? a.s : a.sMedia) > 0 ? 'bom' : 'mau', h: frase(a) });
  // Contra este adversário. Primeiro, as métricas em que as duas leituras se contradizem
  // (pior do que a nossa média, mas melhor do que o esperado contra este adversário, ou o contrário).
  const adv = esc(j.adversario);
  const papel = a => a.def.ops ? (a.def.ops === 'c' ? 'ataque' : 'defesa') : /sofrid|_sof$/.test(a.def.id) ? 'defesa' : 'ataque';
  const nomeM = a => esc(a.def.nome.toLowerCase());
  const habitoAdv = a => `contra o ${adv}, as outras equipas têm em média <b>${fmtEq(a.def, a.esperado)}</b> de ${nomeM(a)} (média da liga: ${fmtEq(a.def, a.muL)})`;
  const ditos = new Set(frases.map(f => f.id).filter(Boolean));
  const contra = an.filter(a => !ditos.has(a.def.id) && a.zEsp !== null && a.sMedia !== null && a.def.melhor && Math.abs(a.s) >= 0.8 && Math.abs(a.sMedia) >= 0.5 && Math.sign(a.s) !== Math.sign(a.sMedia))
    .sort((p, q) => Math.abs(q.s) - Math.abs(p.s)).slice(0, 3);
  for (const a of contra) {
    const bom = a.s > 0;
    frases.push({ t: bom ? 'bom' : 'mau', h: `<b>${esc(a.def.nome)}</b>: ${fmtEq(a.def, a.x)}, ${a.x > a.mu ? 'acima' : 'abaixo'} da nossa média (${fmtEq(a.def, a.mu)}), mas ${habitoAdv(a)}. Para este jogo esperava-se <b>${fmtEq(a.def, a.esp)}</b>: ${bom ? 'foi melhor do que o esperado' : 'foi pior do que o esperado'}.` });
  }
  // Depois, em ataque e em defesa, o maior desvio em relação ao esperado (se ainda não foi dito).
  for (const lado of ['ataque', 'defesa']) {
    const c = an.filter(a => !ditos.has(a.def.id) && a.zEsp !== null && a.def.melhor && papel(a) === lado && !contra.includes(a) && Math.abs(a.s) >= LIMIAR_EQ).sort((p, q) => Math.abs(q.s) - Math.abs(p.s))[0];
    if (!c) continue;
    const bom = c.s > 0;
    frases.push({ t: bom ? 'bom' : 'mau', h: `<b>${esc(c.def.nome)}</b>: ${fmtEq(c.def, c.x)}, contra <b>${fmtEq(c.def, c.esp)}</b> esperados para este jogo. A nossa média é ${fmtEq(c.def, c.mu)}; ${habitoAdv(c)}${c.efeitoLocal ? `; a jogar ${j.local === 'casa' ? 'em casa' : 'fora'}` : ''}. ${bom ? 'Melhor' : 'Pior'} do que o esperado.` });
  }
  // Tendências dos últimos 5 jogos.
  const tend = an.filter(a => a.zt !== null && a.def.melhor && Math.abs(a.zt) >= LIMIAR_TENDENCIA).sort((a, b) => Math.abs(b.zt) - Math.abs(a.zt));
  for (const a of [tend.find(a => a.zt * a.def.melhor > 0), tend.find(a => a.zt * a.def.melhor < 0)].filter(Boolean)) {
    const bom = a.zt * a.def.melhor > 0;
    frases.push({ t: bom ? 'bom' : 'mau', h: `Tendência dos últimos 5 jogos: <b>${esc(a.def.nome)}</b> ${bom ? 'a melhorar' : 'a piorar'} (${fmtEq(a.def, a.u5)} por jogo, contra ${fmtEq(a.def, a.mu)} na época).` });
  }
  if (!frases.length) return '<p class="fraco">Sem diferenças relevantes em relação ao habitual.</p>';
  return `<ul class="pj-conclusoes">${frases.map(f => `<li class="${f.t}"><span class="pj-icone" aria-hidden="true">${f.t === 'bom' ? '▲' : f.t === 'mau' ? '▼' : '●'}</span><span>${f.h}</span></li>`).join('')}</ul>`;
}

function htmlMelhoriasPioras(an) {
  const lista = (itens, vazio) => itens.length ? `<ul class="pj-alertas">${itens.map(a => `
    <li><div class="pj-al-nome">${esc(a.def.nome)}</div>
      <div class="pj-al-val"><b>${fmtEq(a.def, a.x)}</b> <span>${a.esp !== null ? `esperado ${fmtEq(a.def, a.esp)} · ` : ''}média ${fmtEq(a.def, a.mu)}${a.antJ ? ` · ${a.antSalto ? 'último jogo com dados' : 'jogo anterior'} (${esc(a.antJ.adversario || '')}) ${fmtEq(a.def, a.ant)}` : ''}</span></div></li>`).join('')}</ul>` : `<p class="fraco">${vazio}</p>`;
  const sinal = an.filter(a => a.s !== null);
  const melhores = sinal.filter(a => a.s >= LIMIAR_EQ).sort((a, b) => b.s - a.s).slice(0, 5);
  const piores = sinal.filter(a => a.s <= -LIMIAR_EQ).sort((a, b) => a.s - b.s).slice(0, 5);
  const estilo = an.filter(a => !a.def.melhor && a.z !== null && Math.abs(a.z) >= 1.5);
  return `
    <div class="pj-duas">
      <div><h3 class="pj-bom">Melhor do que o esperado</h3>${lista(melhores, 'Nenhuma métrica claramente melhor do que o esperado.')}</div>
      <div><h3 class="pj-mau">Pior do que o esperado</h3>${lista(piores, 'Nenhuma métrica claramente pior do que o esperado.')}</div>
    </div>
    ${estilo.length ? `<p class="nota">Estilo diferente do habitual: ${estilo.map(a => `${esc(a.def.nome)} ${fmtEq(a.def, a.x)} (média ${fmtEq(a.def, a.mu)})`).join('; ')}.</p>` : ''}
    <p class="nota">${an.some(a => a.esp !== null) ? 'O esperado é a nossa média ajustada a este adversário (o que as equipas costumam ter contra ele, ou o que ele costuma ter) e a jogar em casa ou fora, com base no ficheiro da liga. Sem jogos suficientes do adversário (pelo menos 3), a comparação é só com a nossa média. ' : 'Sem o ficheiro da liga com jogos suficientes deste adversário, a comparação é só com a nossa média. '}Assinalado quando o valor se afasta mais de um desvio-padrão, no sentido bom ou mau de cada métrica.</p>`;
}

function htmlIndividual(linhas, i) {
  const r = alertasIndividuais(linhas, i);
  if (!r.n) return `<p class="fraco">Sem estatísticas individuais deste jogo. Importe os ficheiros dos jogadores em <a href="#importacao">Importação › Estatísticas de jogadores</a>.</p>`;
  const item = c => `<li><button class="btn-link" data-ficha="${esc(c.jogador)}">${esc(nomeVisivel(c.jogador))}</button>
    <span class="pj-ind-met">${esc(METRICAS[c.id].r.replace(/ \(%\)$/, ''))}: <b>${c.pct ? `${fmtNum(c.x, 0)}%` : fmtNum(c.x, 2)}</b> <span class="fraco">${c.pct ? '' : 'por 90 min '}(média ${c.pct ? `${fmtNum(c.mu, 0)}%` : fmtNum(c.mu, 2)})</span></span></li>`;
  return `
    <div class="pj-duas">
      <div><h4 class="pj-bom">Em destaque</h4>${r.destaque.length ? `<ul class="pj-ind">${r.destaque.map(item).join('')}</ul>` : '<p class="fraco">Ninguém claramente acima do seu habitual.</p>'}</div>
      <div><h4 class="pj-mau">Abaixo do seu habitual</h4>${r.abaixo.length ? `<ul class="pj-ind">${r.abaixo.map(item).join('')}</ul>` : '<p class="fraco">Ninguém claramente abaixo do seu habitual.</p>'}</div>
    </div>
    <p class="nota">Cada jogador comparado com a sua própria média, por 90 minutos, nos jogos em que fez pelo menos ${MIN_MINUTOS} minutos (mínimo 3 jogos anteriores). Métricas do perfil da posição.</p>`;
}

function htmlArea(area, an) {
  if (!an.length) return '';
  const temEsp = an.some(a => a.esperado !== null), temPrev = an.some(a => a.esp !== null);
  return `
    <div class="pj-area">
      <h3>${area}</h3>
      <div class="tabela-env"><table class="tabela compacta pj-tabela">
        <thead><tr><th>Métrica</th><th class="num">Este jogo</th><th class="num">Média da época</th><th class="num">Diferença</th><th class="num">Jogo anterior</th><th class="num">Últimos 5</th>${temEsp ? '<th class="num">Habitual contra o adversário</th>' : ''}${temPrev ? '<th class="num">Esperado neste jogo</th><th class="num">Diferença</th>' : ''}</tr></thead>
        <tbody>${an.map(a => {
          const cls = classeEq(a);
          return `<tr><td>${esc(a.def.nome)}${a.def.ajuda ? ` <span class="fraco" title="${esc(a.def.ajuda)}">ⓘ</span>` : ''}</td><td class="num"><b>${fmtEq(a.def, a.x)}</b></td><td class="num">${fmtEq(a.def, a.mu)}</td>
            <td class="num pj-dif ${a.esp !== null ? '' : cls}">${a.mu === null ? '–' : fmtDifEq(a.def, a.x - a.mu)}</td><td class="num">${fmtEq(a.def, a.ant)}</td><td class="num">${fmtEq(a.def, a.u5)}</td>${temEsp ? `<td class="num">${fmtEq(a.def, a.esperado)}</td>` : ''}${temPrev ? `<td class="num"><b>${fmtEq(a.def, a.esp)}</b></td><td class="num pj-dif ${a.esp !== null ? cls : ''}">${a.esp === null ? '–' : fmtDifEq(a.def, a.x - a.esp)}</td>` : ''}</tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="pj-graficos">${an.map(a => { const c = classeEq(a); return `<figure class="pj-mini">
        <figcaption><span class="pj-mini-nome">${esc(a.def.nome)}</span>
          <span class="pj-mini-val"><b class="${c}">${fmtEq(a.def, a.x)}</b>${a.esp !== null ? `<span class="pj-mini-dif ${c}">${fmtDifEq(a.def, a.x - a.esp)} vs esperado</span>` : a.mu !== null ? `<span class="pj-mini-dif ${c}">${fmtDifEq(a.def, a.x - a.mu)} vs média</span>` : ''}</span></figcaption>
        <div class="pj-mini-g"><canvas data-mini="${a.def.id}" aria-label="${esc(a.def.nome)} jogo a jogo"></canvas></div></figure>`; }).join('')}</div>
    </div>`;
}

// Bom/mau em relação à média (para cores).
function classeEq(a) { return a.s === null || !a.def.melhor ? '' : a.s >= LIMIAR_EQ ? 'bom' : a.s <= -LIMIAR_EQ ? 'mau' : ''; }
function desenharMini(a, linhas, i) {
  const cv = $(`canvas[data-mini="${a.def.id}"]`); if (!cv) return;
  // Só os jogos com valor (ex.: jogos da taça sem estatísticas ficam de fora); o último é este jogo.
  const ls = linhas.slice(0, i + 1).filter(l => Number.isFinite(valorEq(a.def, l)));
  const vals = ls.map(l => valorEq(a.def, l)); i = ls.length - 1;
  const mu = media(vals.length > 1 ? vals.slice(0, -1) : vals);
  const c = classeEq(a); const destaque = c === 'bom' ? '#1F7A4D' : c === 'mau' ? '#B42318' : '#13284A';
  novoGrafico(cv, {
    type: 'bar',
    data: {
      labels: ls.map(l => (l.j.jornada != null ? `J${l.j.jornada}` : fmtData(l.j.data, true))),
      datasets: [
        { type: 'line', data: ls.map(() => mu), borderColor: '#B88A4A', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, label: 'Média da época', order: 0 },
        ...(a.esp !== null ? [{ type: 'line', data: ls.map((_, k) => (k === i ? a.esp : null)), borderColor: '#13284A', backgroundColor: '#fff', borderWidth: 2, pointRadius: 4, pointStyle: 'rectRot', showLine: false, label: 'Esperado neste jogo', order: -1 }] : []),
        { type: 'bar', data: vals, backgroundColor: ls.map((_, k) => (k === i ? destaque : '#CDD3DB')), borderRadius: 2, maxBarThickness: 18, categoryPercentage: 0.8, barPercentage: 0.9, label: a.def.nome, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#17202B', padding: 8, callbacks: { title: it => rotuloJogo(ls[it[0].dataIndex].j, true), label: x => ` ${x.dataset.label}: ${fmtEq(a.def, x.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false }, border: { color: '#B9BEB5' }, ticks: { font: { size: 9 }, color: '#5F6672', maxRotation: 0, autoSkip: true, autoSkipPadding: 4 } },
        y: { beginAtZero: true, grid: { color: 'rgba(23,32,43,.07)' }, border: { display: false }, ticks: { maxTicksLimit: 3, font: { size: 9 }, color: '#5F6672' } }
      }
    }
  });
}

// ---- Escolha das métricas (guardada para todo o departamento) ----
function htmlEscolherMetricas(disponiveis, defs) {
  if (!ehDep()) return '';
  const sel = new Set(defs.map(d => d.id));
  return `<details class="escolher-metricas so-ecra pj-escolher"><summary>Escolher métricas (${defs.length})</summary>
    <form id="pj-f-metricas">
      <div class="pj-escolher-grelha">${AREAS_EQ.map(area => `<fieldset><legend>${area}</legend>${METRICAS_EQ.filter(d => d.area === area).map(d => `
        <label class="em-linha"><input type="checkbox" name="m" value="${d.id}" ${sel.has(d.id) ? 'checked' : ''} ${disponiveis.has(d.id) ? '' : 'disabled'}> ${esc(d.nome)}${disponiveis.has(d.id) ? '' : ' <span class="fraco">(sem dados)</span>'}</label>`).join('')}</fieldset>`).join('')}</div>
      <div class="acoes-esq"><button class="btn btn-prim">Guardar escolha</button><button type="button" class="btn" id="pj-repor">Repor todas</button></div>
    </form></details>`;
}
function ligarEscolherMetricas() {
  const guardar = async ids => {
    try {
      await App.db.upsert('configuracao', [{ id: 1, ...patchCfgEscalao({ relatorio_equipa: { metricas: ids } }), updated_at: new Date().toISOString() }], 'id');
      App.cfg.relatorio_equipa = { metricas: ids }; lsDel(LS_METRICAS_REL); toast('Métricas do relatório guardadas.');
    } catch (err) {
      if (!/relatorio_equipa/i.test(err.message)) { toast(err.message, 'erro'); return; }
      lsSet(LS_METRICAS_REL, ids);
      toast('Guardado só neste computador. Para ficar igual para todo o departamento, corra outra vez o schema.sql no Supabase.', 'erro');
    }
    desenharRelatorio();
  };
  $('#pj-f-metricas')?.addEventListener('submit', e => { e.preventDefault(); const ids = new FormData(e.target).getAll('m'); if (!ids.length) { toast('Escolha pelo menos uma métrica.', 'erro'); return; } guardar(ids); });
  $('#pj-repor')?.addEventListener('click', () => guardar(METRICAS_EQ.map(d => d.id)));
}

// ---- 3. Campeonato ----
// Símbolo da equipa (carregado nas Definições); a nossa equipa usa o símbolo do clube.
let SIMBOLO_URL = null;
fetch(SIMBOLO).then(r => r.blob()).then(b => { SIMBOLO_URL = URL.createObjectURL(b); }).catch(() => {});
function simboloEquipa(nome, classe = 'simb') {
  const S = App.cfg?.simbolos_equipas || {};
  // O mesmo clube escrito de outra forma ("Besiktas JK" / "Beşiktaş", "Kilmarnock FC" / "Kilmarnock") usa o mesmo símbolo.
  const s = S[norm(nome)] || (eNossaEquipa(nome) ? (SIMBOLO_URL || SIMBOLO) : null) || Object.entries(S).find(([k]) => mesmaEquipa(k, nome))?.[1] || null;
  if (s) return `<img class="${classe}" src="${s}" alt="">`;
  const pal = String(nome).split(/\s+/).filter(w => w.length > 2 && !/^(de|da|do|dos|das)$/i.test(w));
  const ini = (pal.length > 1 ? pal[0][0] + pal[1][0] : String(nome).slice(0, 2)).toUpperCase();
  return `<span class="${classe} simb-ini" aria-hidden="true">${esc(ini)}</span>`;
}
const rotulosPontos = {
  id: 'rotulosPontos',
  afterDatasetsDraw(ch, _args, opts) {
    const { ctx, scales: { x, y } } = ch;
    ctx.save();
    if (opts.mx !== null && opts.mx !== undefined && opts.my !== null && opts.my !== undefined) {
      ctx.strokeStyle = '#B9BEB5'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      const px = x.getPixelForValue(opts.mx), py = y.getPixelForValue(opts.my);
      ctx.beginPath(); ctx.moveTo(px, y.top); ctx.lineTo(px, y.bottom); ctx.moveTo(x.left, py); ctx.lineTo(x.right, py); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.textBaseline = 'middle';
    ch.getDatasetMeta(0).data.forEach((pt, k) => {
      const d = ch.data.datasets[0].data[k];
      ctx.font = d.nossa ? "600 12px 'Barlow', sans-serif" : "11px 'Barlow', sans-serif";
      ctx.fillStyle = d.nossa ? COR.nos : COR.tinta2;
      const txt = d.rot.length > 16 ? d.rot.slice(0, 15) + '…' : d.rot;
      const w = ctx.measureText(txt).width; const dir = pt.x + 8 + w > ch.chartArea.right;
      ctx.fillText(txt, dir ? pt.x - 8 - w : pt.x + 8, pt.y);
    });
    ctx.restore();
  }
};
function desenharLigaPj(j, defs, liga) {
  const el = $('#pj-liga'); if (!el) return;
  if (!liga.length) {
    el.innerHTML = `<h2>3. Campeonato</h2><p class="fraco">${j.jornada == null ? 'Este jogo não é do campeonato.' : 'Ainda não há dados do campeonato. Importe o ficheiro da liga (Importação › Estatísticas de equipa).'}</p>`;
    return;
  }
  const equipas = [...new Set(liga.map(l => l.equipa))];
  desenharBlocoLiga(el, { titulo: '3. Campeonato', competicao: j.competicao, jornada: j.jornada, liga, defs, estado: App.pj,
    foco: equipas.find(e => eNossaEquipa(e)), outro: equipas.find(e => mesmaEq(e, j.adversario)), rotuloOutro: 'adversário' });
}
// Mapa de posições, rankings e comparação de duas métricas para uma equipa (foco) e, opcionalmente, outra.
function desenharBlocoLiga(el, o) {
  const { liga, defs, jornada } = o; const j = { competicao: o.competicao, jornada };
  const equipas = [...new Set(liga.map(l => l.equipa))];
  const medias = {}; // equipa -> id -> média
  for (const e of equipas) {
    const ls = liga.filter(l => l.equipa === e); medias[e] = {};
    for (const d of defs) medias[e][d.id] = media(ls.map(l => valorEq(d, l)));
  }
  const nossa = o.foco || null, adv = o.outro || null; const S = o.estado;
  const linhas = defs.map(d => {
    const vs = equipas.map(e => ({ e, v: medias[e][d.id] })).filter(x => Number.isFinite(x.v));
    if (vs.length < 2) return null;
    const ord = vs.slice().sort((a, b) => (d.melhor === -1 ? a.v - b.v : b.v - a.v));
    return { d, ord, med: media(vs.map(x => x.v)) };
  }).filter(Boolean);
  if (!linhas.length) {
    el.innerHTML = `<h2>${esc(o.titulo)}</h2><p class="fraco">Não há métricas do campeonato com dados de pelo menos duas equipas${jornada != null ? ` até à jornada ${jornada}` : ''}${o.competicao ? ` (${esc(o.competicao)})` : ''}. Confirme se o ficheiro da liga desta competição está importado.</p>`;
    return;
  }
  const comLiga = new Set(linhas.map(l => l.d.id));
  if (!comLiga.has(S.x)) S.x = linhas[0]?.d.id; if (!comLiga.has(S.y)) S.y = linhas[1]?.d.id || linhas[0]?.d.id;
  const opcoes = sel => linhas.map(l => `<option value="${l.d.id}" ${l.d.id === sel ? 'selected' : ''}>${esc(l.d.nome)}</option>`).join('');
  const cartao = l => `
    <div class="pj-rank">
      <div class="pj-rank-cab">${esc(l.d.nome)}<span>${l.d.melhor === -1 ? 'menos é melhor' : !l.d.melhor ? 'estilo' : 'mais é melhor'}</span></div>
      <ol class="pj-rank-lista">${l.ord.map((x, k) => `<li class="${x.e === nossa ? 'nossa' : x.e === adv ? 'adv' : ''}"><span class="pj-rk-pos">${k + 1}.</span>${simboloEquipa(x.e)}<span class="pj-rk-eq">${esc(x.e)}</span><span class="pj-rk-val">${fmtEq(l.d, x.v)}</span></li>`).join('')}</ol>
      <div class="pj-rank-med"><span>Média da liga</span><b>${fmtEq(l.d, l.med)}</b></div>
    </div>`;
  // Mapa de posições: uma régua do 1.º ao último lugar por métrica.
  const n = equipas.length;
  const posDe = (l, e) => (e ? l.ord.findIndex(x => x.e === e) + 1 : 0);
  const pct = p => (n > 1 ? (n - p) / (n - 1) * 100 : 100); // o melhor fica à direita
  const linhaMapa = l => {
    const pn = posDe(l, nossa), pa = posDe(l, adv); const vn = l.ord[pn - 1]?.v;
    const zona = !l.d.melhor ? '' : pn <= Math.ceil(n / 3) ? 'bom' : pn > n - Math.ceil(n / 3) ? 'mau' : '';
    // Onde ficaria uma equipa com o valor exato da média da liga (interpolado entre as posições vizinhas).
    let pm = null; const o2 = l.ord;
    for (let i = 0; i < o2.length - 1; i++) {
      const a = o2[i].v, b = o2[i + 1].v;
      if ((l.med - a) * (l.med - b) <= 0) { pm = i + 1 + (a === b ? 0.5 : (l.med - a) / (b - a)); break; }
    }
    return `<div class="pj-mapa-linha">
      <span class="pj-mapa-nome">${esc(l.d.nome)}${!l.d.melhor ? ' <em>estilo</em>' : ''}</span>
      <div class="pj-mapa-pista ${l.d.melhor ? '' : 'neutra'}">
        ${pm ? `<span class="pj-mapa-media" style="left:${pct(pm)}%" title="Média da liga: ${fmtEq(l.d, l.med)}"></span>` : ''}
        ${pa ? `<span class="pj-mapa-ponto adv" style="left:${pct(pa)}%" title="${esc(adv)}: ${pa}.º">${pa}</span>` : ''}
        ${pn ? `<span class="pj-mapa-ponto nossa" style="left:${pct(pn)}%" title="${esc(nossa)}: ${pn}.º">${pn}</span>` : ''}
      </div>
      <span class="pj-mapa-val ${zona}">${pn ? `<b>${pn}.º</b> ${fmtEq(l.d, vn)}` : '–'}<small>média ${fmtEq(l.d, l.med)}</small></span>
    </div>`;
  };
  const mapa = `
    <div class="pj-mapa">
      ${(() => {
        // Duas colunas (Ataque | Defesa e Posse): no PDF horizontal ficam lado a lado; no resto, uma por baixo da outra.
        const escala = `<div class="pj-mapa-escala"><span></span><div><span>${n}.º · pior</span><span class="pj-mapa-leg-media"><i></i>média da liga</span><span>melhor · 1.º</span></div><span></span></div>`;
        const grupo = area => { const ls = linhas.filter(l => l.d.area === area); return ls.length ? `<h4>${area}</h4>${ls.map(linhaMapa).join('')}` : ''; };
        const c1 = grupo(AREAS_EQ[0]), c2 = AREAS_EQ.slice(1).map(grupo).join('');
        return `<div class="pj-mapa-col">${escala}${c1}</div>${c2 ? `<div class="pj-mapa-col">${escala}${c2}</div>` : ''}`;
      })()}
    </div>`;
  // Rankings-chave (os que vão para o PDF): duas métricas por área.
  const chave = AREAS_EQ.map(area => {
    const ls = linhas.filter(l => l.d.area === area);
    const pref = RANKING_CHAVE[area].map(id => ls.find(l => l.d.id === id)).filter(Boolean);
    return { area, ls: (pref.length ? pref : ls).slice(0, 2) };
  }).filter(x => x.ls.length);
  el.innerHTML = `
    <h2>${esc(o.titulo)}</h2>
    <p class="nota">${esc(j.competicao || '')}, médias por jogo até à jornada ${j.jornada} (${n} equipas), do melhor para o pior valor.</p>
    <p class="pj-rank-legenda"><em class="so-impressao">Médias por jogo até à jornada ${j.jornada}.</em>${nossa ? `<span class="nossa">${simboloEquipa(nossa)}${esc(nossa)}</span>` : ''}${adv ? `<span class="adv">${simboloEquipa(adv)}${esc(adv)}${o.rotuloOutro ? ` · ${esc(o.rotuloOutro)}` : ''}</span>` : ''}</p>
    <h3>Posição em cada métrica</h3>
    ${mapa}
    <div class="so-impressao pj-rank-chave">
      <h3>Rankings</h3>
      <div class="pj-rank-colunas">${chave.map(c => `<div><h4>${c.area}</h4>${c.ls.map(cartao).join('')}</div>`).join('')}</div>
    </div>
    <div class="so-ecra">
    ${AREAS_EQ.map(area => { const ls = linhas.filter(l => l.d.area === area); return ls.length ? `
      <div class="pj-rank-area"><h3>Ranking · ${area}</h3><div class="pj-rank-grelha">${ls.map(cartao).join('')}</div></div>` : ''; }).join('')}
    </div>
    <div class="so-ecra pj-comparar">
      <h3>Comparar duas métricas</h3>
      <div class="filtros"><label>Eixo horizontal<select class="lg-x">${opcoes(S.x)}</select></label><label>Eixo vertical<select class="lg-y">${opcoes(S.y)}</select></label></div>
      <div class="grafico alto pj-disp"><canvas aria-label="Equipas do campeonato em duas métricas"></canvas></div>
      <p class="nota">As linhas tracejadas marcam a média da liga. Esta comparação não entra no PDF.</p>
    </div>`;
  const dx = DEF_EQ[S.x] || linhas[0].d, dy = DEF_EQ[S.y] || (linhas[1] || linhas[0]).d;
  const pts = equipas.map(e => ({ x: medias[e][dx.id], y: medias[e][dy.id], rot: e, nossa: e === nossa, outra: e === adv })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  novoGrafico($('canvas', el), {
    type: 'scatter',
    data: { datasets: [{ data: pts, pointRadius: pts.map(p => (p.nossa || p.outra ? 7 : 4.5)), pointBackgroundColor: pts.map(p => (p.nossa ? '#5C1E29' : p.outra ? '#13284A' : '#8A919C')), pointBorderColor: '#fff', pointBorderWidth: 1.5 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { right: 8 } },
      plugins: { legend: { display: false }, rotulosPontos: { mx: media(pts.map(p => p.x)), my: media(pts.map(p => p.y)) },
        tooltip: { backgroundColor: '#17202B', callbacks: { label: c => ` ${c.raw.rot}: ${fmtEq(dx, c.raw.x)} · ${fmtEq(dy, c.raw.y)}` } } },
      scales: {
        x: { title: { display: true, text: dx.nome + (dx.melhor === -1 ? ' (menos é melhor)' : '') }, grid: { color: COR.grelha }, reverse: false },
        y: { title: { display: true, text: dy.nome + (dy.melhor === -1 ? ' (menos é melhor)' : '') }, grid: { color: COR.grelha } }
      }
    },
    plugins: [rotulosPontos]
  });
  const mudar = () => { S.x = $('.lg-x', el).value; S.y = $('.lg-y', el).value; App.graficos = App.graficos.filter(g => { if (el.contains(g.canvas)) { g.destroy(); return false; } return true; }); desenharBlocoLiga(el, o); };
  $('.lg-x', el).addEventListener('change', mudar); $('.lg-y', el).addEventListener('change', mudar);
}
