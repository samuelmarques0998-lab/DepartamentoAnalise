// ---------- Adversário › Observação: forma, plantel e últimos onzes ----------
// Plantel dos adversários (Transfermarkt ou à mão) e onzes (à mão; mais tarde também do Transfermarkt).

// Papel de cada posição no campo: x/y em % de um campo vertical (ataque para cima).
const POS_PAPEL = { GR: 'Guarda-redes', DC: 'Defesa central', DD: 'Lateral direito', DE: 'Lateral esquerdo', MD: 'Médio defensivo', MC: 'Médio centro', MO: 'Médio ofensivo', ED: 'Extremo direito', EE: 'Extremo esquerdo', PL: 'Ponta de lança' };
const PAPEL_DA_POS = Object.fromEntries(Object.entries(POS_PAPEL).map(([k, v]) => [v, k]));
const SL = (p, x, y) => ({ p, x, y });
const LINHA4 = [SL('DD', 86, 71), SL('DC', 62, 76), SL('DC', 38, 76), SL('DE', 14, 71)];
const LINHA3 = [SL('DC', 74, 75), SL('DC', 50, 78), SL('DC', 26, 75)];
const FORMACOES = {
  '1-4-4-2': [SL('GR', 50, 92), ...LINHA4, SL('ED', 86, 44), SL('MC', 61, 50), SL('MC', 39, 50), SL('EE', 14, 44), SL('PL', 61, 19), SL('PL', 39, 19)],
  '1-4-2-3-1': [SL('GR', 50, 92), ...LINHA4, SL('MD', 62, 55), SL('MD', 38, 55), SL('ED', 86, 33), SL('MO', 50, 36), SL('EE', 14, 33), SL('PL', 50, 13)],
  '1-4-3-3': [SL('GR', 50, 92), ...LINHA4, SL('MD', 50, 57), SL('MC', 70, 43), SL('MC', 30, 43), SL('ED', 86, 20), SL('PL', 50, 13), SL('EE', 14, 20)],
  '1-4-1-4-1': [SL('GR', 50, 92), ...LINHA4, SL('MD', 50, 58), SL('ED', 86, 38), SL('MC', 63, 41), SL('MC', 37, 41), SL('EE', 14, 38), SL('PL', 50, 14)],
  '1-4-4-2 losango': [SL('GR', 50, 92), ...LINHA4, SL('MD', 50, 59), SL('MC', 72, 46), SL('MC', 28, 46), SL('MO', 50, 33), SL('PL', 61, 14), SL('PL', 39, 14)],
  '1-4-3-1-2': [SL('GR', 50, 92), ...LINHA4, SL('MC', 72, 52), SL('MD', 50, 57), SL('MC', 28, 52), SL('MO', 50, 34), SL('PL', 61, 14), SL('PL', 39, 14)],
  '1-3-5-2': [SL('GR', 50, 92), ...LINHA3, SL('DD', 88, 46), SL('MD', 50, 56), SL('MC', 68, 42), SL('MC', 32, 42), SL('DE', 12, 46), SL('PL', 61, 15), SL('PL', 39, 15)],
  '1-3-4-3': [SL('GR', 50, 92), ...LINHA3, SL('DD', 88, 47), SL('MC', 61, 52), SL('MC', 39, 52), SL('DE', 12, 47), SL('ED', 80, 20), SL('PL', 50, 13), SL('EE', 20, 20)],
  '1-3-4-2-1': [SL('GR', 50, 92), ...LINHA3, SL('DD', 88, 50), SL('MC', 61, 54), SL('MC', 39, 54), SL('DE', 12, 50), SL('MO', 64, 31), SL('MO', 36, 31), SL('PL', 50, 13)],
  '1-5-3-2': [SL('GR', 50, 92), SL('DD', 88, 64), SL('DC', 70, 75), SL('DC', 50, 78), SL('DC', 30, 75), SL('DE', 12, 64), SL('MC', 69, 44), SL('MD', 50, 51), SL('MC', 31, 44), SL('PL', 61, 15), SL('PL', 39, 15)],
  '1-5-4-1': [SL('GR', 50, 92), SL('DD', 88, 66), SL('DC', 70, 75), SL('DC', 50, 78), SL('DC', 30, 75), SL('DE', 12, 66), SL('ED', 84, 40), SL('MC', 61, 46), SL('MC', 39, 46), SL('EE', 16, 40), SL('PL', 50, 15)]
};
// Zonas do plantel no campo (linha, coluna): 0 = ataque, 5 = baliza; colunas esquerda/centro/direita.
const ZONAS_PLANTEL = {
  'Ponta de lança': [0, 1], 'Extremo esquerdo': [1, 0], 'Médio ofensivo': [1, 1], 'Extremo direito': [1, 2],
  'Médio centro': [2, 1], 'Médio defensivo': [3, 1], 'Lateral esquerdo': [4, 0], 'Defesa central': [4, 1], 'Lateral direito': [4, 2], 'Guarda-redes': [5, 1]
};

function epocaAtual() { const d = new Date(); const a = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1; return `${a}/${String(a + 1).slice(2)}`; }
function plantelAdv(eq) { return (App.d.plantelAdv || []).filter(p => mesmaEq(p.equipa, eq)); }
function jogadorAdv(eq, nome) { const n = norm(nome); return plantelAdv(eq).find(p => norm(p.nome) === n) || null; }
function onzesAdv(eq) {
  return (App.d.onzes || []).filter(o => mesmaEq(o.equipa, eq))
    .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.jornada ?? -1) - (a.jornada ?? -1) || String(b.created_at).localeCompare(String(a.created_at)));
}
function equipasObservaveis() {
  const s = new Map();
  for (const l of App.d.liga || []) for (const e of [l.equipa, l.adversario]) if (e && !eNossaEquipa(e)) s.set(norm(e), e);
  for (const p of App.d.plantelAdv || []) if (!s.has(norm(p.equipa))) s.set(norm(p.equipa), p.equipa);
  for (const j of App.d.jogos || []) if (j.adversario && !s.has(norm(j.adversario))) s.set(norm(j.adversario), j.adversario);
  for (const r of App.d.estAdv || []) if (!s.has(norm(r.equipa))) s.set(norm(r.equipa), r.equipa);
  return [...s.values()].sort((a, b) => a.localeCompare(b, 'pt'));
}
function rotuloJogoOnze(o) { return o.rotulo || (o.jornada != null ? `Jornada ${o.jornada}` : (o.competicao || 'Jogo')); }
const iniciaisDe = nome => String(nome || '?').split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();

// Pé preferido: pegada direita, esquerda (espelhada) ou as duas.
const PEGADA = '<path d="M3.2 9.2C3 6.6 4.6 5.6 6.4 5.8c1.9.2 2.9 1.6 2.6 4-.3 2.2-1.3 3.3-1.4 5.4-.1 1.8.3 3.7-1.6 4.1-1.9.4-2.6-1.4-2.7-3.4-.1-2.3.1-4.4-.1-6.7Z"/><circle cx="3.6" cy="3.4" r="1.5"/><circle cx="6.1" cy="2.3" r="1.05"/><circle cx="8" cy="2.6" r=".9"/><circle cx="9.5" cy="3.6" r=".75"/><circle cx="10.5" cy="5" r=".65"/>';
function iconePe(pe) {
  const t = norm(pe || '');
  const lados = /^dir|^right/.test(t) ? ['d'] : /^esq|^left/.test(t) ? ['e'] : /^amb|^both/.test(t) ? ['e', 'd'] : [];
  if (!lados.length) return '';
  const titulo = lados.length === 2 ? 'Ambos os pés' : lados[0] === 'd' ? 'Pé direito' : 'Pé esquerdo';
  return `<span class="cj-pe${lados.length === 2 ? ' cj-pe-2' : ''}" title="${titulo}"><span class="cj-pe-pes">${lados.map(l => `<svg viewBox="0 0 12 20" aria-hidden="true"${l === 'e' ? ' style="transform:scaleX(-1)"' : ''}>${PEGADA}</svg>`).join('')}</span><i>${lados.length === 2 ? 'A' : l2(lados[0])}</i></span>`;
}
const l2 = l => (l === 'd' ? 'D' : 'E');

// Cartão de jogador (foto, número, idade, altura e jogos/minutos).
function cartaoJogadorAdv(p, extra = {}) {
  const nome = p?.nome || extra.nome || '?';
  const ida = idade(p?.data_nascimento);
  const info = [ida !== null && !isNaN(ida) ? `${ida} A` : null, p?.altura ? `${p.altura} CM` : null].filter(Boolean).join(' | ');
  const temMin = p && (p.jogos != null || p.minutos != null);
  const pct = temMin && extra.maxMin ? Math.max(4, Math.min(100, (p.minutos || 0) / extra.maxMin * 100)) : 0;
  const curto = nome.length > 16 ? nome.split(/\s+/).map((w, i, a) => (i < a.length - 1 && a.length > 1 ? w[0] + '.' : w)).join(' ') : nome;
  return `<div class="cj ${extra.classe || ''}">
    ${extra.topo || ''}
    ${p?.numero != null ? `<span class="cj-num">${p.numero}</span>` : ''}
    <div class="cj-foto">${p?.foto ? `<img src="${esc(p.foto)}" alt="">` : `<span>${esc(iniciaisDe(nome))}</span>`}</div>
    ${extra.marcas || ''}
    ${iconePe(p?.pe)}
    <b class="cj-nome" title="${esc(nome)}">${esc(curto)}</b>
    ${info ? `<span class="cj-info">${esc(info)}</span>` : ''}
    ${temMin ? `<span class="cj-barra"><i style="width:${pct}%"></i><em>${p.jogos ?? 0} J | ${p.minutos ?? 0} M</em></span>` : ''}
  </div>`;
}
function campoVertical() {
  return `<svg class="cv-linhas" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0.5" y="0.5" width="67" height="104"/><line x1="0.5" y1="52.5" x2="67.5" y2="52.5"/><circle cx="34" cy="52.5" r="9.15"/>
    <rect x="13.84" y="0.5" width="40.32" height="16.5"/><rect x="24.84" y="0.5" width="18.32" height="5.5"/>
    <rect x="13.84" y="88" width="40.32" height="16.5"/><rect x="24.84" y="99" width="18.32" height="5.5"/>
    <path d="M26.7 17 A9.15 9.15 0 0 0 41.3 17"/><path d="M26.7 88 A9.15 9.15 0 0 1 41.3 88"/></svg>`;
}

// ---- Forma ----
function jogosForma(eq, n = 5) {
  const liga = (App.d.liga || []).filter(l => mesmaEq(l.equipa, eq) && Number.isFinite(l.golos) && Number.isFinite(l.golos_sofridos));
  const vistos = new Set(liga.map(l => `${norm(l.competicao)}|${l.jornada}`));
  const extra = (App.d.onzes || []).filter(o => mesmaEq(o.equipa, eq) && Number.isFinite(o.golos_pro) && Number.isFinite(o.golos_contra) && !vistos.has(`${norm(o.competicao)}|${o.jornada}`))
    .map(o => ({ competicao: o.competicao, jornada: o.jornada, rotulo: o.rotulo, data: o.data, equipa: eq, adversario: o.adversario, local: o.local, golos: o.golos_pro, golos_sofridos: o.golos_contra }));
  // Sem datas na liga: ordena pela jornada; os jogos de outras competições entram pela data, se a tiverem.
  // Adversários de fora da liga: jogos da exportação Team stats do Wyscout.
  // O mesmo jogo registado no onze e no Wyscout (nomes às vezes diferentes: "Besiktas JK" / "Beşiktaş") conta uma vez, com os dados do Wyscout.
  const wy = estatAdv(eq).filter(r => Number.isFinite(r.golos))
    .map(r => ({ competicao: nomeCompCurto(r.competicao), rotulo: '', data: r.data, equipa: eq, adversario: r.adversario, local: r.local, golos: r.golos, golos_sofridos: r.golos_sofridos, _wy: r }));
  const mesmoJogo = (x, w) => (x.data && w.data ? x.data === w.data : true) && (mesmaEq(x.adversario, w.adversario) || (x.data && x.data === w.data && x.golos === w.golos && x.golos_sofridos === w.golos_sofridos));
  const extraSemWy = extra.filter(x => !wy.some(w => mesmoJogo(x, w)));
  const todos = [...liga, ...extraSemWy, ...wy].sort((a, b) => (a.data && b.data ? a.data.localeCompare(b.data) : (a.jornada ?? 99) - (b.jornada ?? 99)));
  return todos.slice(-n);
}
// xG do jogo [equipa, adversário]: primeiro o ficheiro do onze, depois as linhas do ficheiro da liga.
function xgDoJogoForma(eq, l) {
  const num = x => (Number.isFinite(x) ? x : null);
  const pega = (M, ks) => { if (!M) return null; for (const k of ks) if (Number.isFinite(M[k])) return M[k]; return null; };
  const KS = ['Golos esperados', 'xG', 'Expected goals'];
  if (l._wy) { const a = pega(l._wy.metricas, KS), b = pega(l._wy.metricas_adv, KS) ?? pega(l._wy.metricas, ['xG Sofrido']); return a != null && b != null ? [a, b] : null; }
  const o = (App.d.onzes || []).find(x => mesmaEq(x.equipa, eq) && x.jornada === l.jornada && (!l.competicao || !x.competicao || norm(x.competicao) === norm(l.competicao)) && x.estatisticas?.metricas);
  if (o) {
    const M = o.estatisticas.metricas, A = o.estatisticas.metricas_adv;
    const a = pega(M, KS), b = A ? pega(A, KS) : pega(M, ['xG Sofrido', 'xG contra']);
    if (a != null && b != null) return [a, b];
  }
  const n = linhaLigaDoJogo(eq, l), ad = l.adversario ? linhaLigaDoJogo(l.adversario, l) : null;
  const a = num(pega(n?.metricas, KS)), b = num(pega(ad?.metricas, KS)) ?? num(pega(n?.metricas, ['xG Sofrido', 'xG contra']));
  return a != null && b != null ? [a, b] : null;
}
function htmlForma(eq) {
  const js = jogosForma(eq);
  if (!js.length) return `<h2>Forma</h2><p class="fraco">Sem resultados de ${esc(eq)} no ficheiro da liga.</p>`;
  let xgPro = 0, xgContra = 0, comXg = 0;
  const cards = js.map((l, i) => {
    const fora = l.local === 'fora';
    const casa = fora ? l.adversario : l.equipa, visit = fora ? l.equipa : l.adversario;
    const gc = fora ? l.golos_sofridos : l.golos, gf = fora ? l.golos : l.golos_sofridos;
    const r = l.golos > l.golos_sofridos ? 'v' : l.golos < l.golos_sofridos ? 'd' : 'e';
    const comp = l.competicao || 'Liga';
    const ronda = l.rotulo ? l.rotulo.replace(new RegExp('^' + comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[·\\-–]?\\s*', 'i'), '') : l.jornada != null ? `J${l.jornada}` : '';
    const xg = xgDoJogoForma(eq, l);
    if (xg) { xgPro += xg[0]; xgContra += xg[1]; comXg++; }
    const [xc, xf] = xg ? (fora ? [xg[1], xg[0]] : xg) : [];
    const eqHtml = (nome, foco) => `<div class="fm-eq${foco ? ' foco' : ''}">${simboloEquipa(nome, 'fm-simb')}<span class="fm-nome">${esc(nome || '?')}</span></div>`;
    return `<div class="fm-cartao${i === js.length - 1 && js.length > 1 ? ' recente' : ''}">
      ${i === js.length - 1 && js.length > 1 ? '<span class="fm-recente">Mais recente</span>' : ''}
      <div class="fm-comp">${esc(comp)}${ronda ? `<b>${esc(ronda)}</b>` : ''}</div>
      <div class="fm-par">${eqHtml(casa, !fora)}<b class="fm-vs">vs</b>${eqHtml(visit, fora)}</div>
      <div class="fm-resultado"><span class="fm-res ${r}">${gc}–${gf}</span><span class="fm-veredito ${r}">${r === 'v' ? 'Vitória' : r === 'd' ? 'Derrota' : 'Empate'}</span></div>
      ${xg ? `<div class="fm-xg"><span>xG</span><b>${fmtNum(xc, 2)} – ${fmtNum(xf, 2)}</b></div>` : ''}
      ${l.local ? `<div class="fm-local">${fora ? 'Fora' : 'Casa'}</div>` : ''}
    </div>`;
  }).join('');
  const v = js.filter(l => l.golos > l.golos_sofridos).length, e = js.filter(l => l.golos === l.golos_sofridos).length, d = js.length - v - e;
  const gm = js.reduce((s, l) => s + l.golos, 0), gs = js.reduce((s, l) => s + l.golos_sofridos, 0);
  const chip = (n, t) => `<div><b>${n}</b>${t}</div>`;
  const chips = [
    v ? chip(v, v === 1 ? 'vitória' : 'vitórias') : '', e ? chip(e, e === 1 ? 'empate' : 'empates') : '', d ? chip(d, d === 1 ? 'derrota' : 'derrotas') : '',
    chip(gm, gm === 1 ? 'golo marcado' : 'golos marcados'), chip(gs, gs === 1 ? 'golo sofrido' : 'golos sofridos'),
    comXg ? chip(fmtNum(xgPro, 2), 'xG a favor') + chip(fmtNum(xgContra, 2), 'xG contra') : ''
  ].join('');
  const n = js.length === 1 ? 'Último jogo' : `Últimos ${js.length} jogos`;
  return `<div class="fm-topo">${simboloEquipa(eq, 'fm-topo-simb')}<span class="fm-olho"><b>${esc(eq)}</b>Observação</span></div>
    <div class="fm-regua"></div>
    <h2 class="fm-titulo">Forma</h2>
    <p class="fm-sub">${n} do <b>${esc(eq)}</b>${js.length > 1 ? ', do mais antigo para o mais recente' : ''}.</p>
    <div class="fm-resumo">${chips}</div>
    <div class="fm-grelha">${cards}</div>
    ${comXg ? `<p class="fm-fonte">Fonte: Wyscout · xG da equipa da casa – equipa de fora${comXg < js.length ? ` (xG em ${comXg} dos ${js.length} jogos)` : ''}</p>` : ''}`;
}

// ---- Plantel ----
// Muitos jogadores na mesma posição (ex.: 10 centrais): cartões mais pequenos e repartidos em linhas iguais,
// para a zona não crescer e invadir a linha de cima (os médios).
function celulaCheia(n, col) {
  const max = col === 1 ? 6 : 2; if (n <= (col === 1 ? 4 : 2)) return '';
  const linhas = Math.ceil(n / max), porLinha = Math.ceil(n / linhas);
  return ` pl-cheia" style="--pl-por-linha:${porLinha}`;
}
function htmlPlantelAdv(eq) {
  const ps = plantelAdv(eq);
  const editar = pode();
  const botoes = `<div class="acoes-esq so-ecra">${editar ? `<button class="btn" id="obs-novo-jog">Adicionar jogador</button>${tmDisponivel() ? '<button class="btn" id="obs-tm-jog">Adicionar jogador do Transfermarkt</button><button class="btn" id="obs-tm">Importar plantel do Transfermarkt</button>' : ''}` : ''}</div>`;
  if (!ps.length) return `<div class="obs-titulo">${simboloEquipa(eq, 'obs-simb')}<h2>Plantel ${epocaAtual()}</h2></div>
    <p class="fraco">Ainda não há plantel de ${esc(eq)}. ${tmDisponivel() ? 'Importe-o do Transfermarkt com o link da equipa ou adicione os jogadores à mão.' : 'Adicione os jogadores à mão' + (App.db.modo === 'supabase' ? '.' : ' (a importação do Transfermarkt só existe na app publicada).')}</p>${botoes}`;
  const maxMin = Math.max(1, ...ps.map(p => p.minutos || 0));
  const grelha = Array.from({ length: 6 }, () => [[], [], []]); const semPos = [];
  const ordem = (a, b) => (b.minutos || 0) - (a.minutos || 0) || (a.numero ?? 99) - (b.numero ?? 99);
  for (const p of [...ps].sort(ordem)) { const z = ZONAS_PLANTEL[p.posicao]; if (z) grelha[z[0]][z[1]].push(p); else semPos.push(p); }
  // Centrais: pé esquerdo à esquerda, pé direito à direita (dentro de cada grupo mantém-se a ordem por minutos).
  const ladoPe = p => /^e/i.test(p.pe || '') ? 0 : /^d/i.test(p.pe || '') ? 2 : 1;
  grelha[4][1].sort((a, b) => ladoPe(a) - ladoPe(b));
  const card = p => `<button type="button" class="cj-bot" data-jog="${esc(p.id)}" ${editar ? '' : 'disabled'}>${cartaoJogadorAdv(p, { maxMin })}</button>`;
  return `<div class="pl-grelha">
    <aside class="pl-lado">
      <div class="pl-cab">${simboloEquipa(eq, 'pl-simb')}<h2>Plantel ${epocaAtual()}</h2><span class="nota">${ps.length} jogadores${ps.some(p => p.jogos != null) ? ' · jogos e minutos da época' : ''}</span></div>
      ${botoes}
    </aside>
    <div class="pl-campo${grelha.some(l => l.some((cel, c) => celulaCheia(cel.length, c))) ? ' pl-compacto' : ''}">${campoVertical()}
      ${grelha.map((linha, i) => `<div class="pl-linha pl-l${i}${linha[1].length > 4 ? ' pl-larga' : ''}">${linha.map((cel, c) => `<div class="pl-cel pl-c${c}${celulaCheia(cel.length, c)}">${cel.map(card).join('')}</div>`).join('')}</div>`).join('')}
    </div>
  </div>
  ${semPos.length ? `<div class="pl-sempos"><h3>Sem posição</h3><div class="pl-cel">${semPos.map(card).join('')}</div></div>` : ''}`;
}

// ---- Onzes ----
function linhaLigaDoJogo(eq, o) {
  return (App.d.liga || []).find(l => mesmaEq(l.equipa, eq) && l.jornada === o.jornada && (!o.competicao || norm(l.competicao) === norm(o.competicao))) || null;
}
// Estatísticas do jogo guardadas no onze (ficheiro Wyscout da equipa, uma linha por jogo).
function estatisticasDoFicheiro(o) {
  const M = o.estatisticas?.metricas; if (!M) return '';
  const A = o.estatisticas?.metricas_adv || null;
  const g = (...ks) => { for (const k of ks) if (Number.isFinite(M[k])) return M[k]; return null; };
  const ga = (...ks) => { if (!A) return null; for (const k of ks) if (Number.isFinite(A[k])) return A[k]; return null; };
  const f = (x, c = 0) => (x == null ? '–' : fmtNum(x, c));
  const pc = x => (x == null ? '' : ` (${fmtNum(x, 0)}%)`);
  const par = (a, b) => (a == null ? '–' : `${f(a)}${b != null ? ` (${f(b)})` : ''}`);
  const posse = g('Posse');
  const linha = (rot, fn, semAdv) => [rot, fn(g), A ? fn(ga) : semAdv];
  const linhas = [
    ['Golos', f(g('Golos')), A ? f(ga('Golos')) : f(g('Golos sofridos'))],
    ['xG', f(g('Golos esperados'), 2), A ? f(ga('Golos esperados'), 2) : f(g('xG Sofrido'), 2)],
    ['Remates (à baliza)', par(g('Remates'), g('Remates à baliza')), A ? par(ga('Remates'), ga('Remates à baliza')) : par(g('Remates contra'), g('Remates contra no alvo'))],
    ['Posse de bola', posse == null ? '–' : `${fmtNum(posse, 0)}%`, A && ga('Posse') != null ? `${fmtNum(ga('Posse'), 0)}%` : posse == null ? '–' : `${fmtNum(100 - posse, 0)}%`],
    linha('Passes (acerto)', G => G('Passes') == null ? '–' : `${f(G('Passes'))}${pc(G('% Passes certos'))}`, '–'),
    linha('Passes por posse', G => f(G('Média de passes por posse'), 1), '–'),
    linha('Duelos (ganhos)', G => G('Duelos') == null ? '–' : `${f(G('Duelos'))}${pc(G('% Duelos ganhos'))}`, '–'),
    linha('Recuperações', G => f(G('Recuperações')), '–'),
    linha('Perdas', G => f(G('Perdas')), '–'),
    linha('Entradas na área', G => f(G('Entradas na grande área')), '–'),
    linha('Toques na área', G => f(G('Toques na área')), '–'),
    linha('Cruzamentos (certos)', G => G('Cruzamentos') == null ? '–' : `${f(G('Cruzamentos'))}${pc(G('% Cruzamentos certos'))}`, '–'),
    linha('Cantos', G => f(G('Cantos')), '–'),
    linha('PPDA', G => f(G('PPDA'), 1), '–')
  ].filter(([, x, y]) => x !== '–' || y !== '–');
  if (!linhas.length) return '';
  const fora = o.local === 'fora'; // a equipa da casa fica sempre à esquerda, como no cabeçalho do jogo
  const [e1, e2] = fora ? [o.adversario || 'Adversário', o.equipa] : [o.equipa, o.adversario || 'Adversário'];
  return `<div class="on-est"><h3>Estatísticas <span class="nota">(Wyscout)</span></h3><table><thead><tr><th>${esc(e1)}</th><th></th><th>${esc(e2)}</th></tr></thead>
    <tbody>${linhas.map(([rot, x, y]) => `<tr><td>${fora ? y : x}</td><th scope="row">${rot}</th><td>${fora ? x : y}</td></tr>`).join('')}</tbody></table></div>`;
}
// Linha do Team stats do Wyscout (adversários de fora da liga) que corresponde ao jogo do onze.
function estatAdvDoOnze(o) {
  const rs = (App.d.estAdv || []).filter(r => mesmaEq(r.equipa, o.equipa));
  return (o.data && rs.find(r => r.data === o.data)) || (!o.data && rs.find(r => mesmaEq(r.adversario, o.adversario))) || null;
}
function estatisticasOnze(o) {
  if (o.estatisticas?.metricas) return estatisticasDoFicheiro(o);
  const wy = estatAdvDoOnze(o);
  if (wy) return estatisticasDoFicheiro({ ...o, estatisticas: {
    metricas: { ...wy.metricas, ...(Number.isFinite(wy.golos) ? { Golos: wy.golos } : {}) },
    metricas_adv: wy.metricas_adv ? { ...wy.metricas_adv, ...(Number.isFinite(wy.golos_sofridos) ? { Golos: wy.golos_sofridos } : {}) } : null } });
  // Equipa da liga: as métricas do ficheiro da liga, com a mesma lista de estatísticas.
  const n = linhaLigaDoJogo(o.equipa, o), a = linhaLigaDoJogo(o.adversario, { ...o });
  if (!n) return '';
  return estatisticasDoFicheiro({ ...o, estatisticas: {
    metricas: { ...(n.metricas || {}), ...(Number.isFinite(n.golos) ? { Golos: n.golos } : {}), ...(Number.isFinite(n.golos_sofridos) ? { 'Golos sofridos': n.golos_sofridos } : {}) },
    metricas_adv: a ? { ...(a.metricas || {}), ...(Number.isFinite(a.golos) ? { Golos: a.golos } : {}) } : null } });
}
function htmlOnze(o, editar) {
  const slots = FORMACOES[o.sistema] || FORMACOES['1-4-3-3'];
  const casa = o.local !== 'fora';
  const [ec, ef] = casa ? [o.equipa, o.adversario] : [o.adversario, o.equipa];
  const [gc, gf] = casa ? [o.golos_pro, o.golos_contra] : [o.golos_contra, o.golos_pro];
  const temRes = Number.isFinite(gc) && Number.isFinite(gf);
  const maxMin = Math.max(1, ...plantelAdv(o.equipa).map(p => p.minutos || 0));
  const marcas = x => `${x.amarelo ? '<i class="cj-amarelo" title="Amarelo"></i>' : ''}${x.vermelho ? '<i class="cj-vermelho" title="Vermelho"></i>' : ''}`;
  const pos = (o.titulares || []).map(t => {
    const s = slots[t.slot]; if (!s) return '';
    const p = jogadorAdv(o.equipa, t.nome) || { nome: t.nome };
    return `<div class="on-slot" style="left:${s.x}%;top:${s.y}%">${cartaoJogadorAdv(p, { maxMin, topo: t.saiu != null ? `<span class="cj-sai">↓ ${t.saiu}'</span>` : '', marcas: marcas(t) })}</div>`;
  }).join('');
  const banco = (o.banco || []).map(b => cartaoJogadorAdv(jogadorAdv(o.equipa, b.nome) || { nome: b.nome }, { maxMin, topo: b.entrou != null ? `<span class="cj-entra">↑ ${b.entrou}'</span>` : '', marcas: marcas(b), classe: b.entrou == null ? 'nao-entrou' : '' })).join('');
  return `<article class="onze" data-onze="${esc(o.id)}">
    <header class="on-cab">
      <div class="on-jogo">${simboloEquipa(ec, 'on-simb')}<span class="on-res">${temRes ? `${gc}<i>-</i>${gf}` : 'vs'}</span>${simboloEquipa(ef, 'on-simb')}</div>
      <div class="on-tit"><h2>${esc(rotuloJogoOnze(o))}</h2><p class="nota">${esc(ec)} – ${esc(ef)}${o.data ? ` · ${fmtData(o.data)}` : ''}</p></div>
      ${editar ? `<div class="acoes-esq so-ecra"><button class="btn" data-editar-onze="${esc(o.id)}">Editar</button>${podeApagar() ? `<button class="btn-link perigo" data-apagar-onze="${esc(o.id)}">Apagar</button>` : ''}</div>` : ''}
    </header>
    <div class="on-corpo">
      <div class="on-campo-env"><div class="on-sistema"><span>11 inicial</span><b>${esc(o.sistema || '')}</b></div><div class="on-campo">${campoVertical()}${pos}</div></div>
      <div class="on-dir">
        <div class="on-banco"><h3>Banco | Substituições</h3>${banco ? `<div class="on-banco-grelha">${banco}</div>` : '<p class="fraco">Sem banco registado.</p>'}</div>
        ${estatisticasOnze(o)}
      </div>
    </div>
  </article>`;
}

// Junta a cada onze a linha do jogo correspondente (pelo adversário e pela jornada).
async function importarEstatOnzes(eq, f) {
  let linhas;
  try { linhas = await lerFicheiroTabela(f); } catch (e) { toast('Não foi possível ler o ficheiro.', 'erro'); return; }
  const cab = (linhas[0] || []).map(c => String(c ?? '').replace(/\s+/g, ' ').trim());
  const col = re => cab.findIndex(c => re.test(c));
  const iEq = col(/^(equipa|team)$/i), iAdv = col(/^(advers[aá]rio|opponent)$/i), iJ = col(/^(j|round|matchday)$/i), iComp = col(/^(competi[cç][aã]o|competition)$/i);
  if (iEq < 0 || iAdv < 0) { toast('O ficheiro precisa das colunas Equipa e Adversário (uma linha por jogo).', 'erro'); return; }
  const texto = new Set([iEq, iAdv, iJ, iComp, col(/^jornada$/i), col(/^local$/i), col(/^resultados?$/i)]);
  const onzes = onzesAdv(eq); const feitos = new Set(); const semOnze = [];
  for (const l of linhas.slice(1)) {
    const a = String(l[iEq] ?? '').trim(), b = String(l[iAdv] ?? '').trim();
    const adv = mesmaEq(a, eq) ? b : mesmaEq(b, eq) ? a : null; if (!adv) continue;
    const j = iJ >= 0 ? parseNum(l[iJ]) : null;
    let cand = onzes.filter(o => mesmaEq(o.adversario, adv) && !feitos.has(o.id));
    if (cand.length > 1 && j != null) cand = cand.filter(o => o.jornada === j);
    if (cand.length > 1 && iComp >= 0) cand = cand.filter(o => norm(o.competicao || o.rotulo || '').includes(norm(l[iComp]).split(' ')[0]));
    const o = cand[0]; if (!o) { semOnze.push(adv); continue; }
    const metricas = {};
    cab.forEach((c, i) => { if (!c || texto.has(i)) return; const v = parseNum(l[i]); if (v !== null) metricas[c] = v; });
    try { await App.db.atualizar('onzes', { id: o.id }, { estatisticas: { fonte: 'wyscout', ficheiro: f.name, metricas } }); feitos.add(o.id); }
    catch (e) { toast(traduzErro(e), 'erro'); return; }
  }
  toast(`Estatísticas juntas a ${feitos.size} ${feitos.size === 1 ? 'onze' : 'onzes'}.${semOnze.length ? ` Sem onze registado: ${semOnze.join(', ')}.` : ''}`, feitos.size ? 'ok' : 'erro');
  if (feitos.size) await recarregar();
}

// ---- PDF 16:9: um diapositivo por secção (forma, plantel e cada um dos 3 últimos onzes) ----
// Cada secção é desenhada como no ecrã e ajustada ao diapositivo (escolhe a largura que deixa o conteúdo maior).
async function exportarObservacao16x9(eq, progresso) {
  const secoes = $$('#vista .obs-secao').filter(s => !s.classList.contains('so-ecra'));
  const caixa = document.createElement('div'); caixa.className = 'sl-render obs-render'; caixa.setAttribute('aria-hidden', 'true');
  document.body.appendChild(caixa);
  try {
    for (const s of secoes) {
      const sl = document.createElement('div');
      const copia = s.cloneNode(true);
      copia.querySelectorAll('button:not(.cj-bot), .so-ecra, .acoes-esq, input, [data-editar-onze]').forEach(x => x.remove());
      if (s.id === 'obs-forma') { sl.className = 'sl obs-sl-forma'; sl.appendChild(copia); caixa.appendChild(sl); continue; }
      const plantel = s.id === 'obs-plantel';
      sl.className = `sl obs-sl${plantel ? ' obs-sl-plantel' : ''}`;
      sl.innerHTML = `<div class="obs-sl-pos"><div class="obs-sl-in"></div></div><p class="sl-rodape">Departamento de Análise</p>`;
      const dentro = sl.querySelector('.obs-sl-in'); dentro.appendChild(copia); caixa.appendChild(sl);
      const pos = sl.querySelector('.obs-sl-pos');
      // Escala com transform (o Safari trata mal o "zoom" na captura: textos partidos e campos deformados).
      const escalar = z => { dentro.style.transformOrigin = '0 0'; dentro.style.transform = `scale(${z})`; };
      if (plantel) {
        // Coluna do símbolo à esquerda e campo com proporções de campo; o maior zoom em que os jogadores cabem.
        const AH = 900; pos.style.left = '130px'; pos.style.top = '60px';
        let z = 1.6;
        for (; z > 0.7; z -= 0.05) {
          const h = AH / z, wCampo = h * 1.12;
          dentro.style.width = `${300 + 40 + wCampo}px`; dentro.style.height = `${h}px`;
          const c = dentro.querySelector('.pl-campo');
          if (!c || (c.scrollHeight <= c.clientHeight + 1 && dentro.scrollHeight <= dentro.clientHeight + 1)) break;
        }
        escalar(z);
        continue;
      }
      // Onze: experimenta várias larguras e fica com a que dá o maior tamanho.
      const AW = 1620, AH = 880; let melhor = { z: 0, w: AW };
      for (const w of [1100, 1200, 1300, 1400, 1500, 1600]) {
        dentro.style.width = `${w}px`; ajustarEstatisticasOnzes(dentro);
        const h = dentro.scrollHeight; const z = Math.min(AW / w, AH / h);
        if (z > melhor.z) melhor = { z, w };
      }
      dentro.style.width = `${melhor.w}px`; ajustarEstatisticasOnzes(dentro); escalar(melhor.z);
      pos.style.left = `${(1920 - melhor.w * melhor.z) / 2}px`; pos.style.top = '60px';
    }
    const html = caixa.innerHTML; caixa.remove();
    await gerarPdfDiapositivos(html, `Observação ${eq} ${hojeIso()}`, progresso, 'obs-render');
  } finally { caixa.remove(); }
}

// As estatísticas do onze têm de caber na altura do campo: reduz a letra e o espaço entre linhas até caberem.
function ajustarEstatisticasOnzes(raiz) {
  for (const est of raiz.querySelectorAll('.on-dir .on-est')) {
    const dir = est.closest('.on-dir'); let k = 1; est.style.setProperty('--k', k);
    if (getComputedStyle(dir).minHeight === '0px') continue; // ecrã estreito: uma coluna, sem limite de altura
    while (k > 0.6 && (dir.scrollHeight > dir.clientHeight + 1 || est.scrollHeight > est.clientHeight + 1)) { k = Math.round((k - 0.04) * 100) / 100; est.style.setProperty('--k', k); }
  }
}

// ---- Página ----
function desenharObservacao() {
  const v = $('#vista'); App.pre ||= {};
  const eqs = equipasObservaveis();
  if (!eqs.length) { v.innerHTML = '<div class="cabecalho-vista"><h1>Observação</h1></div><div class="vazio"><p>Importe primeiro o ficheiro da liga (Dados › Importação) para escolher o adversário.</p></div>'; return; }
  const prox = proximoJogo();
  if (!App.pre.adversario || !eqs.some(e => mesmaEq(e, App.pre.adversario))) App.pre.adversario = (prox && eqs.find(e => mesmaEq(e, prox.adversario))) || eqs[0];
  const eq = eqs.find(e => mesmaEq(e, App.pre.adversario));
  const editar = pode();
  const onzes = onzesAdv(eq);
  v.innerHTML = `
    <div class="so-ecra">
    <div class="cabecalho-vista">
      <div><h1>Observação: ${esc(eq)}</h1><p class="nota">Forma, plantel e últimos onzes. O PDF sai em 16:9, um diapositivo por tema.</p></div>
      <button class="btn botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
    </div>
    <div class="filtros"><label>Adversário<select id="obs-adv">${eqs.map(e => `<option ${e === eq ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label></div>
    ${htmlEstatAdvObs(eq, editar)}
    </div>
    <section class="bloco obs-secao" id="obs-forma">${htmlForma(eq)}</section>
    <section class="bloco obs-secao" id="obs-plantel">${htmlPlantelAdv(eq)}</section>
    <section class="bloco obs-secao so-ecra" id="obs-onzes-lista">
      <div class="bloco-cab"><h2>Últimos onzes</h2>${editar ? `<div class="acoes-esq">${onzes.length ? '<label class="btn" title="Ficheiro Wyscout da equipa com uma linha por jogo">Importar estatísticas<input type="file" id="obs-est-fich" accept=".csv,.xlsx,.xls,.txt" hidden></label>' : ''}<button class="btn btn-prim" id="obs-novo-onze">Adicionar onze</button></div>` : ''}</div>
      <p class="nota">${onzes.length ? `O PDF leva os 3 mais recentes${onzes.length > 3 ? ` (há ${onzes.length} registados)` : ''}.` : `Ainda não há onzes de ${esc(eq)}.${editar ? ' Adicione-os a partir do plantel: escolha o jogo, o sistema e os jogadores.' : ''}`}</p>
    </section>
    ${onzes.slice(0, 3).map(o => `<section class="bloco obs-secao obs-onze">${htmlOnze(o, editar)}</section>`).join('')}`;
  requestAnimationFrame(() => ajustarEstatisticasOnzes(v));
  $('#obs-adv').addEventListener('change', e => { App.pre.adversario = e.target.value; desenharObservacao(); });
  $('#b-pdf').addEventListener('click', async e => {
    const b = e.currentTarget; const txt = b.innerHTML; b.disabled = true;
    try { await exportarObservacao16x9(eq, (i, n) => { b.textContent = `A preparar ${i}/${n}…`; }); }
    catch (err) { toast(`Não foi possível gerar o PDF: ${err.message || err}`, 'erro'); }
    finally { b.disabled = false; b.innerHTML = txt; }
  });
  if (!editar) return;
  $('#obs-simbolos')?.addEventListener('click', () => dialogoSimbolosObs(eq));
  $('#obs-wy-fich')?.addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importarEstatAdversario(eq, f); });
  $('#obs-novo-jog')?.addEventListener('click', () => dialogoJogadorAdv(eq, null));
  $('#obs-tm')?.addEventListener('click', () => dialogoTmAdversario(eq));
  $('#obs-tm-jog')?.addEventListener('click', () => dialogoTmAdversario(eq, true));
  $$('#obs-plantel [data-jog]').forEach(b => b.addEventListener('click', () => dialogoJogadorAdv(eq, plantelAdv(eq).find(p => p.id === b.dataset.jog))));
  $('#obs-novo-onze')?.addEventListener('click', () => dialogoOnze(eq, null));
  $('#obs-est-fich')?.addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importarEstatOnzes(eq, f); });
  $$('[data-editar-onze]').forEach(b => b.addEventListener('click', () => dialogoOnze(eq, onzes.find(o => o.id === b.dataset.editarOnze))));
  $$('[data-apagar-onze]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Apagar este onze?')) return;
    try { await App.db.apagar('onzes', { id: b.dataset.apagarOnze }); toast('Onze apagado.'); await recarregar(); } catch (e) { toast(traduzErro(e), 'erro'); }
  }));
}

// ---- Jogador do adversário (à mão) ----
function dialogoJogadorAdv(eq, p) {
  const d = document.createElement('dialog'); d.className = 'dialogo';
  let foto = p?.foto || null;
  d.innerHTML = `<form method="dialog" class="pilha" id="ja-form">
    <div class="bloco-cab"><h2>${p ? esc(p.nome) : `Novo jogador · ${esc(eq)}`}</h2></div>
    <div class="foto-campo"><span id="ja-av">${cartaoJogadorAdv(p || { nome: '?' })}</span>
      <div class="pilha"><label class="btn btn-ficheiro">Escolher fotografia<input type="file" id="ja-foto" accept="image/*"></label></div></div>
    <div class="grelha-form">
      <label>Nome<input name="nome" required value="${esc(p?.nome || '')}"></label>
      <label>Número<input name="numero" type="number" min="0" max="99" value="${p?.numero ?? ''}"></label>
      <label>Posição<select name="posicao"><option value="">—</option>${POSICOES.map(x => `<option ${x === p?.posicao ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Data de nascimento<input name="data_nascimento" type="date" value="${esc(p?.data_nascimento || '')}"></label>
      <label>Altura (cm)<input name="altura" type="number" min="140" max="215" value="${p?.altura ?? ''}"></label>
      <label>Jogos<input name="jogos" type="number" min="0" value="${p?.jogos ?? ''}"></label>
      <label>Minutos<input name="minutos" type="number" min="0" value="${p?.minutos ?? ''}"></label>
    </div>
    <p class="erro-txt" id="ja-erro" role="alert"></p>
    <div class="acoes">${p && podeApagar() ? '<button type="button" class="btn-link perigo" id="ja-apagar">Apagar jogador</button>' : ''}<span class="espaco"></span><button type="button" class="btn" value="cancelar" id="ja-cancelar">Cancelar</button><button class="btn btn-prim" id="ja-guardar">Guardar</button></div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  const fechar = () => { d.close(); d.remove(); };
  d.addEventListener('cancel', fechar);
  $('#ja-cancelar', d).addEventListener('click', fechar);
  $('#ja-foto', d).addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { foto = await reduzirFoto(f); $('#ja-av', d).innerHTML = cartaoJogadorAdv({ ...(p || {}), nome: $('[name=nome]', d).value || '?', foto }); } catch (err) { toast(err.message, 'erro'); } });
  $('#ja-apagar', d)?.addEventListener('click', async () => {
    if (!await confirmar(`Apagar ${p.nome} do plantel de ${eq}?`)) return;
    try { await App.db.apagar('jogadores_adversarios', { id: p.id }); fechar(); await recarregar(); } catch (e) { $('#ja-erro', d).textContent = traduzErro(e); }
  });
  $('#ja-form', d).addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const num = k => (f.get(k) === '' ? null : Number(f.get(k)));
    const dados = { equipa: p?.equipa || eq, nome: f.get('nome').trim(), numero: num('numero'), posicao: f.get('posicao') || null, data_nascimento: f.get('data_nascimento') || null, altura: num('altura'),
      jogos: num('jogos'), minutos: num('minutos'), foto, updated_at: new Date().toISOString() };
    try {
      if (p) await App.db.atualizar('jogadores_adversarios', { id: p.id }, dados); else await App.db.inserir('jogadores_adversarios', dados);
      fechar(); await recarregar();
    } catch (err) { $('#ja-erro', d).textContent = traduzErro(err); }
  });
}

// ---- Plantel do adversário a partir do Transfermarkt ----
async function tmGuardarAdv(eq, j) {
  const ex = plantelAdv(eq).find(p => (p.tm_id && j.transfermarktId && p.tm_id === String(j.transfermarktId)) || norm(p.nome) === norm(j.name));
  const num = parseInt(j.shirtNumber, 10), n = x => (Number.isFinite(Number(x)) && x !== null && x !== '' ? Number(x) : null);
  const dados = {
    equipa: ex?.equipa || eq, nome: ex?.nome || j.name,
    posicao: ex?.posicao || posicaoTm(j.position) || null,
    data_nascimento: /^\d{4}-\d{2}-\d{2}$/.test(j.birthDate || '') ? j.birthDate : ex?.data_nascimento ?? null,
    altura: j.heightCm >= 120 && j.heightCm <= 230 ? j.heightCm : ex?.altura ?? null,
    pe: peTm(j.foot) ?? ex?.pe ?? null, numero: num >= 0 && num <= 99 ? num : ex?.numero ?? null, nacionalidade: j.nationality || ex?.nacionalidade || null,
    jogos: n(j.gamesPlayed) ?? ex?.jogos ?? null, minutos: n(j.minutesPlayed) ?? ex?.minutos ?? null, golos: n(j.goals) ?? ex?.golos ?? null, assistencias: n(j.assists) ?? ex?.assistencias ?? null,
    tm_id: j.transfermarktId ? String(j.transfermarktId) : ex?.tm_id ?? null, tm_url: j.sourceUrl || ex?.tm_url || null, updated_at: new Date().toISOString()
  };
  if (!ex?.foto && /^data:image\//.test(j.photo || '')) { try { dados.foto = await reduzirFoto(j.photo); } catch { /* sem foto */ } }
  if (ex) { await App.db.atualizar('jogadores_adversarios', { id: ex.id }, dados); Object.assign(ex, dados); return 'atualizado'; }
  const novo = await App.db.inserir('jogadores_adversarios', dados); (App.d.plantelAdv ||= []).push(novo); return 'novo';
}
// soJogador: diálogo para acrescentar um jogador a partir do link dele.
function dialogoTmAdversario(eq, soJogador = false) {
  let ocupado = false, parar = false;
  const guardado = soJogador ? '' : App.cfg.tm_equipas?.[norm(eq)] || '';
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  d.innerHTML = `<div class="pilha">
    <div class="bloco-cab"><h2>${soJogador ? `Adicionar jogador a ${esc(eq)}` : `Plantel de ${esc(eq)}`} · Transfermarkt</h2><button class="btn" id="ta-fechar">Fechar</button></div>
    <form id="ta-form" class="linha-form tm-linha"><label>${soJogador ? 'Link do jogador' : 'Link da equipa'} no Transfermarkt<input id="ta-url" type="url" required value="${esc(guardado)}" placeholder="https://www.transfermarkt.pt/…/${soJogador ? 'profil/spieler/…' : 'startseite/verein/…'}"></label><button class="btn btn-prim" id="ta-procurar">Procurar</button></form>
    <p class="nota sem-margem">${soJogador ? 'Importa o jogador com foto, número, posição, idade, altura, pé e jogos/minutos da época. Se já estiver no plantel, os dados são atualizados.' : 'Importa os jogadores com foto, número, posição, idade, altura e jogos/minutos da época (cerca de 4 segundos por jogador). O link fica guardado para atualizar mais tarde.'}</p>
    <p class="tm-msg" id="ta-msg" role="status"></p><div id="ta-saida"></div></div>`;
  document.body.appendChild(d); d.showModal();
  const msg = (t, erro) => { const m = $('#ta-msg', d); m.textContent = t; m.classList.toggle('erro', !!erro); };
  const fechar = async () => { d.close(); d.remove(); await recarregar(); };
  $('#ta-fechar', d).addEventListener('click', () => { if (ocupado) { parar = true; msg('A parar…'); return; } fechar(); });
  d.addEventListener('cancel', e => { e.preventDefault(); if (!ocupado) fechar(); });
  $('#ta-form', d).addEventListener('submit', async e => {
    e.preventDefault(); if (ocupado) return;
    const url = $('#ta-url', d).value.trim(); $('#ta-saida', d).innerHTML = ''; msg('A procurar no Transfermarkt…');
    let r; try { r = await tmChamar(url); } catch (err) { msg(err.message, true); return; }
    if (soJogador || r.jogador) {
      if (!r.jogador) { msg('Esse link é de uma equipa. Cole o link do jogador (ou use "Importar plantel do Transfermarkt").', true); return; }
      const j = r.jogador, ida = idade(j.birthDate);
      const ex = plantelAdv(eq).find(p => (p.tm_id && j.transfermarktId && p.tm_id === String(j.transfermarktId)) || norm(p.nome) === norm(j.name));
      const pj = { nome: j.name, numero: Number.isFinite(parseInt(j.shirtNumber, 10)) ? parseInt(j.shirtNumber, 10) : null, foto: /^data:image\//.test(j.photo || '') ? j.photo : null };
      $('#ta-saida', d).innerHTML = `<div class="tm-cartao">${avatarJogador(pj, 'avatar-grande')}<div><b>${esc(j.name)}</b>
        <p class="cartao-meta">${esc([posicaoTm(j.position), ida !== null && !isNaN(ida) ? `${ida} anos` : null, j.heightCm ? `${j.heightCm} cm` : null, peTm(j.foot) ? `pé ${peTm(j.foot).toLowerCase()}` : null, j.club].filter(Boolean).join(' · '))}</p>
        ${j.club && !mesmaEq(j.club, eq) ? `<p class="fraco">No Transfermarkt está no ${esc(j.club)}; vai ser acrescentado ao plantel de ${esc(eq)}.</p>` : ''}
        ${ex ? `<p class="fraco">Já está no plantel como ${esc(ex.nome)}: os dados vão ser atualizados.</p>` : ''}</div></div>
        <div class="acoes-esq"><button class="btn btn-prim" id="ta-guardar">${ex ? 'Atualizar jogador' : 'Adicionar ao plantel'}</button></div>`;
      msg('Confirme os dados e guarde.');
      $('#ta-guardar', d).addEventListener('click', async ev => {
        ev.currentTarget.disabled = true; msg('A guardar…');
        try { const res = await tmGuardarAdv(eq, j); msg(res === 'novo' ? `${j.name} adicionado ao plantel.` : `${j.name} atualizado.`); $('#ta-saida', d).innerHTML = ''; $('#ta-url', d).value = ''; $('#ta-url', d).focus(); }
        catch (err) { ev.currentTarget.disabled = false; msg(traduzErro(err), true); }
      });
      return;
    }
    const lista = r.equipa;
    try { const mapa = { ...(App.cfg.tm_equipas || {}), [norm(eq)]: url }; await App.db.atualizar('configuracao', { id: App.cfg.id }, { tm_equipas: mapa }); App.cfg.tm_equipas = mapa; } catch { /* sem a coluna: só não guarda o link */ }
    ocupado = true; parar = false; $('#ta-procurar', d).disabled = true; $('#ta-fechar', d).textContent = 'Parar';
    const barra = document.createElement('div'); barra.className = 'tm-barra'; barra.innerHTML = '<i></i>'; $('#ta-saida', d).append(barra);
    let ok = 0; const falhas = []; const pausa = window.__TMPAUSA ?? 2500;
    for (let i = 0; i < lista.length && !parar; i++) {
      msg(`${i + 1} de ${lista.length}: ${lista[i].name}`);
      try { const x = await tmChamar(lista[i].url); await tmGuardarAdv(eq, x.jogador); ok++; } catch (err) { falhas.push(lista[i].name); if (/schema|relation|column/i.test(err.message)) { msg(traduzErro(err), true); break; } }
      barra.firstChild.style.width = `${(i + 1) / lista.length * 100}%`;
      if (i < lista.length - 1 && !parar) await new Promise(res => setTimeout(res, pausa));
    }
    ocupado = false; $('#ta-procurar', d).disabled = false; $('#ta-fechar', d).textContent = 'Fechar'; barra.remove();
    msg(`${ok === 1 ? '1 jogador importado' : `${ok} jogadores importados`}${parar ? ' (parado)' : ''}.${falhas.length ? ` Falharam: ${falhas.join(', ')}.` : ''}`, falhas.length > 0);
  });
}

// ---- Editor de onze ----
// ---- Ficha de jogo do Transfermarkt -> onze ----
// Lê a página (HTML) da ficha de jogo: sistema, titulares com a posição no campo, banco,
// substituições e cartões de cada equipa. Não grava nada: devolve os dados para o diálogo.
function lerFichaTm(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const idDe = href => (String(href || '').match(/\/spieler\/(\d+)/) || [])[1] || null;
  const slugDe = href => (String(href || '').match(/^\/([^/]+)\//) || [])[1] || '';
  const minutoDe = el => {
    const m = String(el?.getAttribute('style') || '').match(/background-position:\s*-?(\d+)px\s+-?(\d+)px/);
    if (!m) { const n = parseInt(txt(el), 10); return Number.isFinite(n) ? n : null; }
    return Math.floor(Number(m[2]) / 36) * 10 + Math.floor(Number(m[1]) / 36) + 1;
  };
  // Nomes completos (o campo só mostra o apelido): banco e acontecimentos têm o nome inteiro.
  const nomes = {};
  for (const a of doc.querySelectorAll('a[href*="/spieler/"]')) { const id = idDe(a.getAttribute('href')); const t = a.getAttribute('title') || ''; if (id && t && !nomes[id]) nomes[id] = t.trim(); }
  const equipas = [...doc.querySelectorAll('.formation-subtitle')].map(sub => {
    const box = sub.closest('.large-6') || sub.parentElement.parentElement;
    const link = box.querySelector('.sb-vereinslink') || box.querySelector('a[href*="/verein/"]');
    const sis = txt(sub).replace(/^[^:]*:\s*/, '');
    const titulares = [...box.querySelectorAll('.formation-player-container')].map(c => {
      const a = c.querySelector('.formation-number-name a') || c.querySelector('a[href*="/spieler/"]');
      const st = c.getAttribute('style') || ''; const pc = k => { const m = st.match(new RegExp(k + ':\\s*([\\d.]+)%')); return m ? Number(m[1]) : null; };
      return { id: idDe(a?.getAttribute('href')), slug: slugDe(a?.getAttribute('href')), curto: txt(a), numero: parseInt(txt(c.querySelector('.tm-shirt-number')), 10) || null, top: pc('top'), left: pc('left') };
    }).filter(t => t.curto);
    const banco = [...box.querySelectorAll('table.ersatzbank tr')].map(tr => {
      const a = tr.querySelector('a[href*="/spieler/"]'); if (!a) return null;
      const tds = tr.querySelectorAll('td');
      return { id: idDe(a.getAttribute('href')), slug: slugDe(a.getAttribute('href')), curto: txt(a), numero: parseInt(txt(tds[0]), 10) || null, pos: txt(tds[2]) };
    }).filter(Boolean);
    return { nome: txt(link), sistemaTm: sis, titulares, banco };
  });
  // Acontecimentos: substituições e cartões (os golos não entram no onze).
  const subs = [], cartoes = [];
  for (const li of doc.querySelectorAll('.sb-ereignisse li')) {
    const min = minutoDe(li.querySelector('.sb-sprite-uhr-klein'));
    const ein = li.querySelector('.sb-aktion-wechsel-ein a[href*="/spieler/"]'), aus = li.querySelector('.sb-aktion-wechsel-aus a[href*="/spieler/"]');
    if (ein && aus) { subs.push({ entra: idDe(ein.getAttribute('href')), sai: idDe(aus.getAttribute('href')), min }); continue; }
    const marca = li.querySelector('.sb-aktion-spielstand .sb-sprite');
    const a = li.querySelector('.sb-aktion-aktion a[href*="/spieler/"]');
    if (marca && a) { const c = marca.className; const tipo = /sb-gelbrot|sb-rot/.test(c) ? 'vermelho' : /sb-gelb/.test(c) ? 'amarelo' : null; if (tipo) cartoes.push({ id: idDe(a.getAttribute('href')), tipo, min }); }
  }
  // Jogo: jornada, data e resultado.
  const dados = txt(doc.querySelector('.sb-spieldaten'));
  const jornada = parseInt((dados.match(/(\d+)\.\s*jornada/i) || [])[1], 10);
  const dm = dados.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  const data = dm ? `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2]}-${dm[1]}` : null;
  const res = (txt(doc.querySelector('.sb-endstand')).match(/(\d+)\s*:\s*(\d+)/) || []).slice(1).map(Number);
  const partesTitulo = (doc.title || '').split(/\s+-\s+/);
  const competicao = partesTitulo.length >= 3 ? partesTitulo[2].trim() : '';
  return { equipas, subs, cartoes, nomes, jornada: Number.isFinite(jornada) ? jornada : null, data, golos: res.length === 2 ? res : null, competicao };
}

// Converte "4-2-3-1" do Transfermarkt nos sistemas da app.
function sistemaDoTm(s) {
  const t = norm(s); const n = (String(s).match(/\d(?:\s*-\s*\d)+/) || [''])[0].replace(/\s+/g, '');
  if (/losango|diamante|diamond/.test(t) && n === '4-4-2') return '1-4-4-2 losango';
  const k = '1-' + n; if (FORMACOES[k]) return k;
  const cands = Object.keys(FORMACOES).filter(f => f.startsWith(k.slice(0, 5)));
  return cands[0] || '1-4-3-3';
}

// Põe cada titular no lugar do sistema mais próximo da posição no campo do Transfermarkt.
function onzeDaFichaTm(f, iEq, eq) {
  const E = f.equipas[iEq]; const sistema = sistemaDoTm(E.sistemaTm); const slots = FORMACOES[sistema];
  const ps = plantelAdv(eq);
  const nomeDe = j => {
    const p = ps.find(p => p.tm_id && j.id && String(p.tm_id) === String(j.id)) || ps.find(p => norm(p.nome).replace(/\s+/g, '-') === norm(j.slug).replace(/\s+/g, '-')) || ps.find(p => norm(p.nome) === norm(f.nomes[j.id] || j.curto));
    return p?.nome || f.nomes[j.id] || j.curto;
  };
  const tops = E.titulares.map(t => t.top).filter(v => v != null); const tMin = Math.min(...tops), tMax = Math.max(...tops);
  const pos = E.titulares.map(t => ({ t, x: (t.left ?? 40) + 10, y: tMax > tMin ? 13 + (t.top - tMin) * (92 - 13) / (tMax - tMin) : 50 }));
  const pares = [];
  pos.forEach((p, i) => slots.forEach((s, k) => pares.push({ i, k, d: (p.x - s.x) ** 2 + 1.5 * (p.y - s.y) ** 2 })));
  pares.sort((a, b) => a.d - b.d);
  const usadoJ = new Set(), usadoS = new Set(), lugar = {};
  for (const q of pares) if (!usadoJ.has(q.i) && !usadoS.has(q.k)) { usadoJ.add(q.i); usadoS.add(q.k); lugar[q.i] = q.k; }
  const ids = new Set([...E.titulares, ...E.banco].map(j => j.id));
  const cart = id => { const c = f.cartoes.filter(c => c.id === id); return { amarelo: c.some(c => c.tipo === 'amarelo'), vermelho: c.some(c => c.tipo === 'vermelho') }; };
  const saiu = id => f.subs.find(s => s.sai === id)?.min ?? null;
  const titulares = pos.map((p, i) => ({ slot: lugar[i], nome: nomeDe(p.t), saiu: saiu(p.t.id), ...cart(p.t.id) })).filter(t => t.slot != null);
  const porId = Object.fromEntries([...E.titulares, ...E.banco].map(j => [j.id, j]));
  const banco = E.banco.map(b => { const s = f.subs.find(s => s.entra === b.id && ids.has(s.entra)); return { nome: nomeDe(b), entrou: s?.min ?? null, substituiu: s && porId[s.sai] ? nomeDe(porId[s.sai]) : null, amarelo: cart(b.id).amarelo }; });
  const outro = f.equipas[1 - iEq]; const casa = iEq === 0;
  const gp = f.golos ? f.golos[casa ? 0 : 1] : null, gc = f.golos ? f.golos[casa ? 1 : 0] : null;
  return { sistema, titulares, banco, adversario: outro?.nome || null, local: casa ? 'casa' : 'fora', golos_pro: gp, golos_contra: gc, data: f.data, jornada: f.jornada, competicao: f.competicao };
}

function dialogoOnze(eq, o) {
  const ps = plantelAdv(eq);
  const jogosLiga = (App.d.liga || []).filter(l => mesmaEq(l.equipa, eq)).sort((a, b) => b.jornada - a.jornada);
  const ult = onzesAdv(eq)[0];
  const base = o ? structuredClone(o) : { equipa: eq, sistema: ult?.sistema || '1-4-3-3', titulares: [], banco: [], local: 'casa', origem: 'manual' };
  if (!o && jogosLiga.length) { const usados = new Set(onzesAdv(eq).map(x => `${norm(x.competicao)}|${x.jornada}`)); const l = jogosLiga.find(l => !usados.has(`${norm(l.competicao)}|${l.jornada}`)) || jogosLiga[0]; Object.assign(base, { competicao: l.competicao, jornada: l.jornada, adversario: l.adversario, local: l.local, golos_pro: l.golos, golos_contra: l.golos_sofridos }); }
  // Sem onze guardado: propõe os titulares do último onze ou os jogadores com mais minutos em cada posição.
  if (!o && !base.titulares.length) base.titulares = proporTitulares(eq, base.sistema, ult);
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  const lista = `<datalist id="on-nomes">${ps.map(p => `<option value="${esc(p.nome)}">${p.numero != null ? p.numero + ' · ' : ''}${esc(p.posicao || '')}</option>`).join('')}</datalist>`;
  const chaveJogo = x => `${x.competicao}|${x.jornada}`;
  d.innerHTML = `<form class="pilha" id="on-form">${lista}
    <div class="bloco-cab"><h2>${o ? 'Editar onze' : 'Novo onze'} · ${esc(eq)}</h2></div>
    <div class="on-tm">
      <p class="nota sem-margem"><b>Preencher a partir da ficha de jogo do Transfermarkt</b>${tmDisponivel() ? ' — cole o link ou escolha a página guardada (.html).' : ' — escolha a página guardada (.html).'}</p>
      <div class="on-tm-linha">${tmDisponivel() ? '<input id="on-tm-url" type="url" placeholder="https://www.transfermarkt.pt/…/spielbericht/…" aria-label="Link da ficha de jogo"><button type="button" class="btn" id="on-tm-ler">Ler</button>' : ''}
        <label class="btn">Página guardada<input id="on-tm-fich" type="file" accept=".html,.htm,text/html" hidden></label></div>
      <p class="nota sem-margem" id="on-tm-msg" role="status"></p>
    </div>
    <div class="grelha-form">
      <label>Jogo<select id="on-jogo"><option value="">Outro jogo (taça, particular…)</option>${jogosLiga.map(l => `<option value="${esc(chaveJogo(l))}" ${l.jornada === base.jornada && norm(l.competicao) === norm(base.competicao || '') ? 'selected' : ''}>J${l.jornada} · ${l.local === 'fora' ? 'em' : 'vs'} ${esc(l.adversario)} (${l.golos}-${l.golos_sofridos})</option>`).join('')}</select></label>
      <label>Sistema<select id="on-sistema">${Object.keys(FORMACOES).map(k => `<option ${k === base.sistema ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    </div>
    <div class="grelha-form" id="on-outro" ${base.jornada != null && jogosLiga.length ? 'hidden' : ''}>
      <label>Competição / jornada<input id="on-rotulo" value="${esc(base.rotulo || '')}" placeholder="Taça de Portugal 3.ª eliminatória"></label>
      <label>Adversário<input id="on-advers" value="${esc(base.adversario || '')}"></label>
      <label>Local<select id="on-local"><option value="casa" ${base.local !== 'fora' ? 'selected' : ''}>Casa</option><option value="fora" ${base.local === 'fora' ? 'selected' : ''}>Fora</option></select></label>
      <label>Resultado (${esc(eq)} – adversário)<span class="linha-form"><input id="on-gp" type="number" min="0" value="${base.golos_pro ?? ''}" style="width:4.5rem"> – <input id="on-gc" type="number" min="0" value="${base.golos_contra ?? ''}" style="width:4.5rem"></span></label>
      <label>Data<input id="on-data" type="date" value="${esc(base.data || '')}"></label>
    </div>
    <h3>Titulares</h3><div id="on-tit" class="on-ed-lista"></div>
    <h3>Banco</h3><p class="nota sem-margem">Escreva os suplentes; nos que entraram indique o minuto e quem substituíram.</p><div id="on-banco" class="on-ed-lista"></div>
    <div class="acoes-esq"><button type="button" class="btn" id="on-mais">+ Suplente</button></div>
    <p class="erro-txt" id="on-erro" role="alert"></p>
    <div class="acoes"><span class="espaco"></span><button type="button" class="btn" id="on-cancelar">Cancelar</button><button class="btn btn-prim">Guardar</button></div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  const fechar = () => { d.close(); d.remove(); };
  d.addEventListener('cancel', fechar); $('#on-cancelar', d).addEventListener('click', fechar);
  const linhaTit = (s, i, t = {}) => `<div class="on-ed-linha" data-slot="${i}"><span class="on-ed-papel">${s.p}</span>
    <input class="on-nome" list="on-nomes" value="${esc(t.nome || '')}" placeholder="${esc(POS_PAPEL[s.p])}" aria-label="${esc(POS_PAPEL[s.p])}">
    <label class="on-min">Saiu<input type="number" min="1" max="130" class="on-saiu" value="${t.saiu ?? ''}"></label>
    <label class="caixa"><input type="checkbox" class="on-am" ${t.amarelo ? 'checked' : ''}>Amarelo</label><label class="caixa"><input type="checkbox" class="on-vm" ${t.vermelho ? 'checked' : ''}>Vermelho</label></div>`;
  const linhaBanco = (b = {}) => `<div class="on-ed-linha on-ed-banco"><input class="on-nome" list="on-nomes" value="${esc(b.nome || '')}" placeholder="Suplente">
    <label class="on-min">Entrou<input type="number" min="1" max="130" class="on-entrou" value="${b.entrou ?? ''}"></label>
    <label class="on-subst">por<input class="on-por" list="on-nomes" value="${esc(b.substituiu || '')}"></label>
    <label class="caixa"><input type="checkbox" class="on-am" ${b.amarelo ? 'checked' : ''}>Amarelo</label><button type="button" class="btn-link perigo on-tirar" aria-label="Retirar suplente">×</button></div>`;
  const desenharTit = () => { const slots = FORMACOES[base.sistema]; $('#on-tit', d).innerHTML = slots.map((s, i) => linhaTit(s, i, base.titulares.find(t => t.slot === i))).join(''); };
  const lerTit = () => $$('#on-tit .on-ed-linha', d).map(l => ({ slot: Number(l.dataset.slot), nome: $('.on-nome', l).value.trim(), saiu: $('.on-saiu', l).value === '' ? null : Number($('.on-saiu', l).value), amarelo: $('.on-am', l).checked, vermelho: $('.on-vm', l).checked })).filter(t => t.nome);
  desenharTit();
  $('#on-banco', d).innerHTML = (base.banco.length ? base.banco : Array.from({ length: 7 }, () => ({}))).map(linhaBanco).join('');
  $('#on-mais', d).addEventListener('click', () => $('#on-banco', d).insertAdjacentHTML('beforeend', linhaBanco()));
  $('#on-banco', d).addEventListener('click', e => { if (e.target.closest('.on-tirar')) e.target.closest('.on-ed-linha').remove(); });
  $('#on-sistema', d).addEventListener('change', e => {
    // Ao mudar de sistema mantém os jogadores pela mesma ordem de linhas (do GR para a frente).
    const atuais = lerTit(); base.sistema = e.target.value;
    const novos = FORMACOES[base.sistema]; const livres = [...atuais];
    base.titulares = novos.map((s, i) => { let k = livres.findIndex(t => { const pj = jogadorAdv(eq, t.nome); return pj && PAPEL_DA_POS[pj.posicao] === s.p; }); if (k < 0) k = 0; const t = livres.splice(k, 1)[0]; return t ? { ...t, slot: i } : null; }).filter(Boolean);
    desenharTit();
  });
  $('#on-jogo', d).addEventListener('change', e => { $('#on-outro', d).hidden = !!e.target.value; });
  // ---- Transfermarkt ----
  const msg = t => { $('#on-tm-msg', d).textContent = t; };
  const aplicarFicha = (f, i) => {
    const r = onzeDaFichaTm(f, i, eq);
    base.sistema = r.sistema; base.titulares = r.titulares; base.dataTm = r.data; base.tm = true;
    $('#on-sistema', d).value = r.sistema; desenharTit();
    $('#on-banco', d).innerHTML = (r.banco.length ? r.banco : [{}]).map(linhaBanco).join('');
    const l = jogosLiga.find(l => r.jornada != null && l.jornada === r.jornada && mesmaEq(l.adversario, r.adversario || ''));
    if (l) { $('#on-jogo', d).value = chaveJogo(l); $('#on-outro', d).hidden = true; }
    else {
      $('#on-jogo', d).value = ''; $('#on-outro', d).hidden = false;
      $('#on-rotulo', d).value = [r.competicao, r.jornada != null ? `J${r.jornada}` : ''].filter(Boolean).join(' · ');
      $('#on-advers', d).value = r.adversario || ''; $('#on-local', d).value = r.local;
      $('#on-gp', d).value = r.golos_pro ?? ''; $('#on-gc', d).value = r.golos_contra ?? ''; $('#on-data', d).value = r.data || '';
    }
    const semNome = r.titulares.length < 11 ? ` Só encontrei ${r.titulares.length} titulares.` : '';
    msg(`Onze de ${f.equipas[i].nome} lido (${r.sistema}, ${r.banco.filter(b => b.entrou != null).length} substituições). Confirme as posições e guarde.${semNome}`);
  };
  const usarFicha = html => {
    let f; try { f = lerFichaTm(html); } catch { f = null; }
    if (!f || !f.equipas.length || !f.equipas.some(e => e.titulares.length)) { msg('Não encontrei os onzes nesta página. Confirme que é a ficha de jogo (página "Ficha de jogo").'); return; }
    const i = f.equipas.findIndex(e => mesmaEq(e.nome, eq));
    if (i >= 0) return aplicarFicha(f, i);
    // Nome diferente na app e no Transfermarkt: pergunta qual das duas equipas é.
    $('#on-tm-msg', d).innerHTML = `Qual destas equipas é ${esc(eq)}? ${f.equipas.map((e, k) => `<button type="button" class="btn-link" data-tm-eq="${k}">${esc(e.nome)}</button>`).join(' · ')}`;
    $$('[data-tm-eq]', d).forEach(b => b.addEventListener('click', () => aplicarFicha(f, Number(b.dataset.tmEq))));
  };
  $('#on-tm-fich', d).addEventListener('change', async e => { const fi = e.target.files[0]; if (fi) usarFicha(await fi.text()); e.target.value = ''; });
  $('#on-tm-ler', d)?.addEventListener('click', async e => {
    const url = $('#on-tm-url', d).value.trim(); if (!url) { msg('Cole primeiro o link da ficha de jogo.'); return; }
    const btn = e.currentTarget; btn.disabled = true; msg('A ler a ficha de jogo…');
    try { const j = await tmChamar(url); if (!j.ficha) throw new Error('Esse link não é uma ficha de jogo. Use o link da página "Ficha de jogo".'); usarFicha(j.ficha); }
    catch (err) { msg(err.message); }
    finally { btn.disabled = false; }
  });
  $('#on-form', d).addEventListener('submit', async e => {
    e.preventDefault();
    const tit = lerTit();
    if (tit.length < 7) { $('#on-erro', d).textContent = 'Indique pelo menos 7 titulares.'; return; }
    const banco = $$('#on-banco .on-ed-linha', d).map(l => ({ nome: $('.on-nome', l).value.trim(), entrou: $('.on-entrou', l).value === '' ? null : Number($('.on-entrou', l).value), substituiu: $('.on-por', l).value.trim() || null, amarelo: $('.on-am', l).checked })).filter(b => b.nome);
    // Quem saiu fica com o minuto da entrada de quem o substituiu, se não tiver.
    for (const b of banco) if (b.substituiu && b.entrou != null) { const t = tit.find(x => norm(x.nome) === norm(b.substituiu)); if (t && t.saiu == null) t.saiu = b.entrou; }
    const sel = $('#on-jogo', d).value; let jogo;
    if (sel) { const l = jogosLiga.find(x => chaveJogo(x) === sel); jogo = { competicao: l.competicao, jornada: l.jornada, rotulo: null, adversario: l.adversario, local: l.local, golos_pro: l.golos, golos_contra: l.golos_sofridos, data: base.dataTm || base.data || null }; }
    else { const n = id => ($(id, d).value === '' ? null : Number($(id, d).value)); jogo = { competicao: null, jornada: null, rotulo: $('#on-rotulo', d).value.trim() || null, adversario: $('#on-advers', d).value.trim() || null, local: $('#on-local', d).value, golos_pro: n('#on-gp'), golos_contra: n('#on-gc'), data: $('#on-data', d).value || null }; }
    const reg = { equipa: eq, ...jogo, sistema: base.sistema, titulares: tit, banco, origem: base.tm ? 'transfermarkt' : (o?.origem || 'manual') };
    try { if (o) await App.db.atualizar('onzes', { id: o.id }, reg); else await App.db.inserir('onzes', reg); fechar(); toast('Onze guardado.'); await recarregar(); }
    catch (err) { $('#on-erro', d).textContent = traduzErro(err); }
  });
}
function proporTitulares(eq, sistema, ult) {
  const slots = FORMACOES[sistema];
  if (ult?.titulares?.length) { const dele = FORMACOES[ult.sistema]; if (dele && dele.length === slots.length) return ult.titulares.map(t => ({ slot: t.slot, nome: t.nome })); }
  const livres = [...plantelAdv(eq)].sort((a, b) => (b.minutos || 0) - (a.minutos || 0));
  return slots.map((s, i) => { const k = livres.findIndex(p => PAPEL_DA_POS[p.posicao] === s.p); if (k < 0) return null; return { slot: i, nome: livres.splice(k, 1)[0].nome }; }).filter(Boolean);
}
