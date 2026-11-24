// ---------- Relatório da própria equipa ----------
const COR = { nos: '#7A1F2B', adv: '#1A1A1A', tinta: '#17202B', tinta2: '#4B5563', grelha: '#E4E6E1', nosSuave: 'rgba(122,31,43,.45)', movel: '#B88A4A' };
const PADRAO_METRICAS = [/^(xg|golos esperados)$/i, /^(shots|remates)$/i, /(on target|^remates à baliza)$/i, /^(passes \/ accurate %|% passes certos)$/i, /^ppda$/i, /^(recoveries \/ high|recuperações)$/i, /^(possession|posse)/i, /^(touches in penalty area|toques na área)$/i, /^entradas na grande área$/i];
const PADRAO_JOG = ['Goals', 'Golos', 'Assists', 'Assistências', 'xG', 'xA', 'Progressive passes', 'Recoveries', 'Recuperações', 'Passes certos', 'Duelos ganhos'];
// Métricas com nomes diferentes conforme o idioma da exportação.
const SINONIMOS = { golos: ['Goals', 'Golos'], assistencias: ['Assists', 'Assistências'], xg: ['xG'], xa: ['xA'] };
function valorSinonimo(obj, chave) { for (const k of SINONIMOS[chave]) if (Number.isFinite(obj?.[k])) return obj[k]; return null; }
const ePercentagem = k => /%/.test(k);

function chaveXG(mets) { return mets.find(k => /^xg$/i.test(k)) || mets.find(k => /^(expected goals|golos esperados)$/i.test(k)) || null; }

// Data do primeiro jogo da equipa técnica atual (Definições). Separa os dados em "antes" e "desde".
function marcoET() { return App.cfg?.inicio_equipa_tecnica || null; }
const antesDoMarco = j => !j.data || j.data < marcoET();
// Jogos com os filtros de competição e local, sem o filtro de período.
function jogosBaseRelatorio() {
  const f = App.rel;
  // Só jogos já disputados (com resultado ou estatísticas); os jogos por jogar ficam de fora.
  let js = App.d.jogos.filter(j => resultadoJogo(j) || App.idx.estEq[j.id]).sort(compararJogos);
  if (f.competicao !== 'todas') js = js.filter(j => (j.competicao || '') === f.competicao);
  if (f.local !== 'todos') js = js.filter(j => j.local === f.local);
  return js;
}
function jogosDoRelatorio() {
  const f = App.rel; let js = jogosBaseRelatorio();
  if ((f.periodo === 'desde' || f.periodo === 'antes') && marcoET()) js = js.filter(j => (f.periodo === 'antes') === antesDoMarco(j));
  else if (/^\d+$/.test(f.periodo)) js = js.slice(-Number(f.periodo));
  return js;
}
function textoPeriodo(p) {
  if (p === 'desde' && marcoET()) return `desde a nova equipa técnica (${fmtData(marcoET())})`;
  if (p === 'antes' && marcoET()) return `antes da nova equipa técnica (até ${fmtData(marcoET())})`;
  return /^\d+$/.test(p) ? `últimos ${p} jogos` : 'toda a época';
}

// Total, equipa técnica anterior e atual: linhas { rot, t, a, d, melhor (1 / -1 / 0), casas, sufixo }.
function htmlAntesDepois(titulo, nota, linhas, nA, nD, legenda = true) {
  // Sem as linhas sem dados, e sem os separadores que ficam sem linhas.
  const temDados = l => !l.sep && (l.a !== null || l.d !== null);
  const ok = linhas.filter((l, i) => l.sep ? (() => { for (const x of linhas.slice(i + 1)) { if (x.sep) return false; if (temDados(x)) return true; } return false; })() : temDados(l));
  if (!ok.some(temDados)) return '';
  const fmt = (x, l) => x === null ? '–' : `${fmtNum(x, l.casas ?? 2)}${l.sufixo || ''}`;
  const dif = l => {
    if (l.semDif) return '<td></td>';
    if (l.a === null || l.d === null) return '<td class="num fraco">–</td>';
    const d = l.d - l.a; const rel = Math.abs(d) / (Math.abs(l.a) || 1);
    const cls = !l.melhor || rel < 0.05 ? '' : (d > 0) === (l.melhor > 0) ? 'bom' : 'mau';
    return `<td class="num"><span class="pj-dif ${cls}">${fmtSinal(d, l.casas ?? 2)}${l.sufixo === '%' ? ' p.p.' : l.sufixo || ''}</span> ${seta(d, l.a)}</td>`;
  };
  return `<h2>${titulo}</h2>
    <p class="nota">${nota}${nD < 5 ? ` Desde a mudança há só ${nD} ${nD === 1 ? 'jogo' : 'jogos'}: as diferenças ainda podem ser ruído.` : ''}</p>
    <div class="tabela-env"><table class="tabela compacta et-comp">
      <thead><tr><th></th><th class="num">Total<small>${nA + nD} ${nA + nD === 1 ? 'jogo' : 'jogos'}</small></th><th class="num">Equipa técnica anterior<small>${nA} ${nA === 1 ? 'jogo' : 'jogos'}</small></th><th class="num">Equipa técnica atual<small>${nD} ${nD === 1 ? 'jogo' : 'jogos'}</small></th><th class="num">Evolução</th></tr></thead>
      <tbody>${ok.map(l => l.sep ? `<tr class="et-sep"><th colspan="5">${esc(l.sep)}</th></tr>` : `<tr><td>${esc(l.rot)}</td><td class="num et-tot">${fmt(l.t ?? null, l)}</td><td class="num">${fmt(l.a, l)}</td><td class="num">${fmt(l.d, l)}</td>${dif(l)}</tr>`).join('')}</tbody>
    </table></div>
    ${legenda ? '<p class="nota">Evolução: equipa técnica atual em relação à anterior. Verde: melhor; vermelho: pior. Sem cor: diferença inferior a 5% ou métrica de estilo.</p>' : ''}`;
}

// Sentido das métricas de equipa do Wyscout: 1 = mais é melhor, -1 = menos é melhor, 0 = estilo (sem melhor nem pior).
const SENTIDO_EQUIPA = [
  [/ppda|faltas|cart(ão|oes|ões)|cards|fouls|perdas|losses|foras de jogo|offsides|contra(?!-?\s?ataque)|against|sofrid|conceded/i, -1],
  [/posse|possession|passes longos|long passes|ritmo|tempo/i, 0],
  [/xg|golos|goals|remates|shots|toques na área|touches in|entradas|penalty area|recupera|recoveries|duelos|duels|passes certos|accurate|cruzamentos certos|cantos|corners|interce|ataques|attacks|assist/i, 1]
];
function sentidoMetricaEquipa(k) { for (const [re, s] of SENTIDO_EQUIPA) if (re.test(k)) return s; return 0; }
// Classe verde/vermelha de uma diferença: depende do sentido da métrica; variações abaixo de 5% ficam sem cor.
function classeDif(k, dif, base) {
  const s = sentidoMetricaEquipa(k); if (!s || dif === null || base === null) return '';
  if (Math.abs(dif) / (Math.abs(base) || 1) < 0.05) return '';
  return (dif > 0) === (s > 0) ? 'bom' : 'mau';
}

function desenharAntesDepoisEquipa(mets, chave) {
  const el = $('#r-et'); if (!el) return;
  const todos = jogosBaseRelatorio(); const m = marcoET();
  if (!m || !todos.some(antesDoMarco) || !todos.some(j => !antesDoMarco(j))) { el.remove(); return; }
  const f = App.rel;
  // Com «todas as competições», um quadro por competição (campeonato primeiro); com uma competição escolhida, só esse.
  const comps = [...new Set(todos.map(j => j.competicao || ''))];
  const ligas = competicoesLiga().map(norm);
  const ordem = comps.sort((a, b) => (ligas.includes(norm(b)) - ligas.includes(norm(a))) || todos.filter(j => (j.competicao || '') === b).length - todos.filter(j => (j.competicao || '') === a).length);
  const grupos = f.competicao === 'todas' && comps.length > 1
    ? ordem.filter(c => { const js = todos.filter(j => (j.competicao || '') === c); return js.some(antesDoMarco) && js.some(j => !antesDoMarco(j)); }).map(c => ({ titulo: `${ligas.includes(norm(c)) ? 'Campeonato' : nomeCompCurto(c) || 'Outros jogos'}${ligas.includes(norm(c)) ? ` · ${c}` : ''}`, js: todos.filter(j => (j.competicao || '') === c) }))
    : [{ titulo: 'Total e por equipa técnica', js: todos }];
  const porComp = f.competicao === 'todas' && comps.length > 1;
  const filtros = [f.competicao === 'todas' ? (!porComp ? 'todas as competições' : grupos.length > 1 ? 'por competição' : 'as outras competições não têm jogos antes e depois da mudança') : f.competicao, f.local === 'todos' ? '' : f.local === 'casa' ? 'em casa' : 'fora'].filter(Boolean).join(', ');
  if (!grupos.length) { el.remove(); return; }
  el.innerHTML = grupos.map((g, i) => quadroAntesDepoisEquipa(g.js, mets, chave, porComp ? `Total e por equipa técnica · ${g.titulo}` : g.titulo,
    i === 0 ? `Médias por jogo (${esc(filtros)}). A nova equipa técnica começou a ${fmtData(m)}; este quadro ignora o filtro de período.` : '', i === grupos.length - 1)).join('<div class="et-quebra"></div>');
}
function quadroAntesDepoisEquipa(base, mets, chave, titulo, nota, legenda = true) {
  const A = base.filter(antesDoMarco), D = base.filter(j => !antesDoMarco(j));
  const media = (js, f) => { const v = js.map(f).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const pts = j => { const r = resultadoJogo(j); return r === 'V' ? 3 : r === 'E' ? 1 : r === 'D' ? 0 : null; };
  const xg = chaveXG(mets);
  const comEv = js => js.filter(j => (App.idx.eventos[j.id] || []).some(e => e.tipo === 'oportunidade'));
  const ops = (js, lado) => { const c = comEv(js); return c.length ? c.flatMap(j => App.idx.eventos[j.id] || []).filter(e => e.tipo === 'oportunidade' && e.lado === lado).length / c.length : null; };
  // Cada linha com o total e os dois períodos, pela mesma função.
  const T = [...A, ...D]; const tr = (rot, f, melhor, extra = {}) => ({ rot, t: f(T), a: f(A), d: f(D), melhor, ...extra });
  const L = [
    { sep: 'Resultados (por jogo)' },
    tr('Pontos', js => media(js, pts), 1),
    tr('Golos marcados', js => media(js, j => j.golos_marcados), 1),
    tr('Golos sofridos', js => media(js, j => j.golos_sofridos), -1),
    ...(xg ? [tr('xG criado', js => media(js, j => valor(j, 'nos', xg)), 1), tr('xG sofrido', js => media(js, j => valor(j, 'adversario', xg)), -1)] : []),
    tr('Oportunidades criadas (codificadas)', js => ops(js, 'nos'), 1),
    tr('Oportunidades sofridas (codificadas)', js => ops(js, 'adversario'), -1),
    { sep: 'Métricas-chave (por jogo)' },
    ...chave.filter(k => k !== xg).map(k => tr(k, js => media(js, j => valor(j, 'nos', k)), sentidoMetricaEquipa(k), { casas: ePercentagem(k) ? 1 : 2 }))
  ];
  return htmlAntesDepois(esc(titulo), nota, L, A.length, D.length, legenda);
}

function metricasChave(disponiveis) {
  const escolhidas = (App.cfg.metricas_chave || []).filter(m => disponiveis.includes(m));
  if (escolhidas.length) return escolhidas;
  const out = [];
  for (const re of PADRAO_METRICAS) { const k = disponiveis.find(m => re.test(m) && !out.includes(m)); if (k) out.push(k); }
  return out.length ? out : disponiveis.slice(0, 6);
}

function novoGrafico(canvas, config) {
  Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = COR.tinta2;
  const g = new Chart(canvas, config); App.graficos.push(g); return g;
}

function eixos(yTitulo) {
  return {
    x: { grid: { display: false }, border: { color: COR.grelha }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
    y: { grid: { color: COR.grelha }, border: { display: false }, title: yTitulo ? { display: true, text: yTitulo } : undefined, ticks: { maxTicksLimit: 6 } }
  };
}
const OPCOES_LINHA = {
  responsive: true, maintainAspectRatio: false, animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 16 } },
    tooltip: { backgroundColor: '#17202B', padding: 10, cornerRadius: 4, titleFont: { weight: '600' }, callbacks: { label: c => ` ${c.dataset.label}: ${fmtNum(c.parsed.y, 2)}` } }
  }
};

function desenharRelatorioPeriodo() {
  const v = $('#vista');
  const todos = App.d.jogos;
  if (!todos.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Relatório da equipa</h1></div>
      <div class="vazio"><p>Ainda não há jogos para analisar.</p>${ehDep() ? '<p>Comece por importar as estatísticas de equipa do Wyscout em <a href="#importacao">Importação</a>.</p>' : '<p>Os dados aparecem assim que o departamento importar os primeiros jogos.</p>'}</div>`;
    return;
  }
  const comps = [...new Set(todos.map(j => j.competicao).filter(Boolean))].sort();
  const js = jogosDoRelatorio();
  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>Relatório da equipa</h1><p class="nota">${esc(descricaoFiltros(js))}</p></div>
      <button class="btn so-ecra botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
    </div>
    ${htmlFiltros(comps)}
    ${js.length ? `
    <section class="placar" id="r-placar" aria-label="Resumo"></section>
    <section class="bloco" id="r-et"></section>
    <section class="bloco" id="r-tendencia"></section>
    <section class="bloco" id="r-comparacao"></section>
    <section class="bloco" id="r-desempenho"></section>
    <section class="bloco" id="r-oportunidades"></section>
    <section class="bloco" id="r-jogadores"></section>
    <section class="bloco" id="r-classificacao"></section>` : '<div class="vazio"><p>Nenhum jogo corresponde a estes filtros.</p></div>'}`;

  ligarFiltros(v, 'equipa');
  $('#b-pdf').addEventListener('click', () => exportarPdf(`Relatório ${App.cfg.nome_clube || ''} ${hojeIso()}`));
  if (!js.length) return;

  const metsEq = [...new Set(js.flatMap(j => Object.keys(App.idx.estEq[j.id]?.nos || {})))].filter(k => !k.startsWith('_')).sort((a, b) => a.localeCompare(b));
  const chave = metricasChave(metsEq);
  desenharPlacar(js, metsEq);
  desenharAntesDepoisEquipa([...new Set(jogosBaseRelatorio().flatMap(j => Object.keys(App.idx.estEq[j.id]?.nos || {})))], chave);
  desenharTendencia(js, metsEq);
  desenharComparacao(js, chave);
  desenharDesempenho(js, metsEq);
  desenharOportunidades(js);
  desenharJogadores(js);
  desenharClassificacao(js);
}

// ---- Partilhado entre relatório e fichas ----
function hojeIso() { return new Date().toISOString().slice(0, 10); }
function descricaoFiltros(js) {
  const f = App.rel;
  const base = [f.competicao === 'todas' ? 'Todas as competições' : f.competicao, f.local === 'todos' ? 'casa e fora' : f.local === 'casa' ? 'em casa' : 'fora',
    textoPeriodo(f.periodo)].join(', ');
  return `${base} · ${js.length} ${js.length === 1 ? 'jogo' : 'jogos'}${js.length ? `, ${js[0].data || js.length === 1 ? 'de' : 'da'} ${quandoJogo(js[0])} ${js[js.length - 1].data ? 'a' : 'à'} ${quandoJogo(js[js.length - 1])}` : ''}`;
}
function htmlFiltros(comps) {
  const f = App.rel;
  return `<div class="filtros so-ecra" role="group" aria-label="Filtros">
      <label>Competição<select data-f="competicao"><option value="todas">Todas</option>${comps.map(c => `<option ${f.competicao === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Local<select data-f="local"><option value="todos">Casa e fora</option><option value="casa" ${f.local === 'casa' ? 'selected' : ''}>Casa</option><option value="fora" ${f.local === 'fora' ? 'selected' : ''}>Fora</option></select></label>
      <label>Período<select data-f="periodo"><option value="todos">Toda a época</option>${marcoET() ? `<option value="desde" ${f.periodo === 'desde' ? 'selected' : ''}>Desde a nova equipa técnica</option><option value="antes" ${f.periodo === 'antes' ? 'selected' : ''}>Antes da nova equipa técnica</option>` : ''}${[5, 10, 15].map(n => `<option value="${n}" ${String(f.periodo) === String(n) ? 'selected' : ''}>Últimos ${n} jogos</option>`).join('')}</select></label>
    </div>`;
}
function ligarFiltros(v, vista) {
  $$('[data-f]', v).forEach(s => s.addEventListener('change', () => { App.rel[s.dataset.f] = s.value; mostrarVista(vista); }));
}
function cabecalhoImpressao() {
  return `<div class="cab-impressao so-impressao">${marcaSVG()}<div><b>${esc(App.cfg.nome_clube || 'Clube')}${App.escalao === 'sub23' ? ' · Sub-23' : ''}</b><span>Departamento de Análise</span></div><span class="cab-data">${fmtData(hojeIso())}</span></div>`;
}
function iconePdf() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/></svg>';
}
// Os gráficos passam a imagens durante a impressão, para se ajustarem ao tamanho da página.
function graficosParaImpressao() {
  const imgs = [];
  for (const g of App.graficos) {
    const c = g.canvas; if (!c?.isConnected) continue;
    // O gráfico de dispersão do campeonato ocupa uma página: redesenha-o nas proporções da folha.
    const pagina = c.closest('.pj-disp'); if (pagina) g.resize(860, 700);
    const img = new Image(); img.className = 'grafico-img'; img.alt = c.getAttribute('aria-label') || ''; img.src = c.toDataURL('image/png');
    if (pagina) g.resize();
    c.after(img); imgs.push(img);
  }
  document.body.classList.add('a-imprimir');
  return () => { imgs.forEach(i => i.remove()); document.body.classList.remove('a-imprimir'); };
}
// ---------- Exportação em folhas A4 ----------
// Cada página é uma folha A4 montada aqui (fundo, rodapé e margens próprias) e o conteúdo é distribuído
// pelas folhas medindo a altura de cada bloco. Assim o resultado é igual no Chrome e no Safari, que trata
// mal os elementos fixos e as quebras de página automáticas.
const FUNDO_A4 = 'data:image/jpeg;base64,/*FUNDO_A4*/';
const FUNDO_A4_H = 'data:image/jpeg;base64,/*FUNDO_A4_H*/';
const MM = 96 / 25.4;
// Blocos que nunca se partem entre páginas (se couberem numa página inteira).
const INTEIROS = '.tend-mini, .tend-grelha, figure, .campos-inteiros, .op-tab, .pj-rank, .pj-mapa-linha, .placar, .placar-cel, .grafico, .pj-mini, .cab-impressao, .cabecalho-vista, .pj-jogo, .pj-rank-cab, .campo, svg, img, tr, li, p, h1, h2, h3, h4, h5, label, button, .pre-conf, .pj-individual';
// Elementos que se repetem no topo de cada página quando o bloco continua.
const REPETIR = ':scope > thead, :scope > .pj-mapa-escala:not(.oculta-col)';

function criarFolha(horizontal) {
  const f = document.createElement('div'); f.className = 'folha' + (horizontal ? ' horizontal' : '');
  f.innerHTML = `<img class="folha-fundo" alt="" src="${horizontal ? FUNDO_A4_H : FUNDO_A4}"><div class="folha-corpo"><div class="folha-conteudo"></div></div><div class="folha-rodape">Departamento de Análise</div>`;
  return f;
}
function marcarQuebras(raiz) {
  for (const el of raiz.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.breakBefore === 'page' || cs.pageBreakBefore === 'always') el.dataset.fqAntes = '1';
    if (cs.breakAfter === 'page' || cs.pageBreakAfter === 'always') el.dataset.fqDepois = '1';
    if (cs.breakInside === 'avoid' || cs.pageBreakInside === 'avoid') el.dataset.fqInteiro = '1';
    if (cs.breakAfter === 'avoid' || /^H[1-5]$/.test(el.tagName)) el.dataset.fqColar = '1';
    if (cs.display === 'none') el.dataset.fqOculto = '1';
  }
}
function divisivel(no, alturaNo, limite) {
  if (no.nodeType !== 1 || !no.firstElementChild) return false;
  const grande = alturaNo > limite;
  if (!grande && (no.dataset.fqInteiro || no.matches(INTEIROS))) return false;
  if (no.tagName === 'TABLE' || no.tagName === 'TBODY') return true;
  const cs = getComputedStyle(no);
  if (cs.display.startsWith('inline')) return false;
  if (/flex/.test(cs.display) && !cs.flexDirection.startsWith('column') && !grande) return false;
  if (/grid/.test(cs.display) && cs.gridTemplateColumns.split(' ').length > 1 && no.children.length <= 3 && !grande) return false;
  // Só se parte um bloco cujos filhos são blocos (texto corrido não se parte).
  for (const n of no.childNodes) {
    if (n.nodeType === 3 && n.textContent.trim()) return false;
    if (n.nodeType === 1 && !n.dataset.fqOculto && getComputedStyle(n).display.startsWith('inline')) return false;
  }
  return true;
}
function paginarEmFolhas(nos, raiz, horizontal) {
  let conteudo, limite, colocados = 0, forcar = false;
  const nova = () => {
    const f = criarFolha(horizontal); raiz.appendChild(f);
    conteudo = f.querySelector('.folha-conteudo'); limite = f.querySelector('.folha-corpo').clientHeight; colocados = 0;
    return conteudo;
  };
  const altura = () => conteudo.getBoundingClientRect().height;
  // Mede até ao fundo do último bloco colocado (a margem de baixo pode ficar fora da página).
  const cabe = no => (no ? no.getBoundingClientRect().bottom - conteudo.getBoundingClientRect().top : altura()) <= limite + 0.5;
  function fluir(filhos, destino, reabrir) {
    for (const no of filhos) {
      if (no.nodeType !== 1) { if (no.textContent.trim()) destino.appendChild(no); continue; }
      if (no.dataset.fqOculto) continue;
      if ((forcar || no.dataset.fqAntes) && colocados) destino = reabrir();
      forcar = false;
      destino.appendChild(no);
      const h = no.getBoundingClientRect().height;
      if (cabe(no)) {
        // Um título não fica sozinho no fim da página.
        if (no.dataset.fqColar && colocados && limite - altura() < 30 * MM) { no.remove(); destino = reabrir(); destino.appendChild(no); }
        colocados++;
        if (no.dataset.fqDepois) forcar = true;
        continue;
      }
      no.remove();
      if (divisivel(no, h, limite)) {
        const casca = no.cloneNode(false); casca.dataset.fqParcial = '1'; destino.appendChild(casca);
        const repetidos = [...no.querySelectorAll(REPETIR)].map(x => x.cloneNode(true));
        const reabrirFilho = () => {
          destino = reabrir();
          const c = no.cloneNode(false); c.classList.add('folha-continua'); destino.appendChild(c);
          for (const r of repetidos) c.appendChild(r.cloneNode(true));
          return c;
        };
        fluir([...no.childNodes], casca, reabrirFilho);
        if (!casca.firstElementChild) casca.remove();
        if (no.dataset.fqDepois) forcar = true;
      } else {
        // Leva consigo os títulos e notas que o precedem, para não ficarem sozinhos no fim da página.
        const levar = []; let ant = destino.lastElementChild;
        while (ant && (ant.dataset.fqColar || ant.matches('.nota, .pj-rank-legenda')) && levar.length < colocados - 1) { levar.unshift(ant); ant = ant.previousElementSibling; }
        if (colocados) { levar.forEach(x => x.remove()); destino = reabrir(); levar.forEach(x => destino.appendChild(x)); }
        destino.appendChild(no); colocados++;
        if (no.dataset.fqDepois) forcar = true;
      }
    }
    return destino;
  }
  fluir(nos, nova(), nova);
  // Folhas sem conteúdo (por exemplo, só com cascas vazias) saem.
  for (const f of [...raiz.children]) if (!f.querySelector('.folha-conteudo').textContent.trim() && !f.querySelector('.folha-conteudo img')) f.remove();
}
// Tabelas mais largas do que a folha: diminui a letra (até 6,5 pt) e o espaçamento até caberem.
function ajustarTabelasImpressao(raiz) {
  for (const t of $$('table.tabela', raiz)) {
    const env = t.closest('.tabela-env') || t.parentElement;
    const cabe = () => t.scrollWidth <= env.clientWidth + 1;
    if (cabe()) continue;
    t.classList.add('apertada');
    for (const pt of [8.5, 8, 7.5, 7, 6.5]) { t.style.fontSize = `${pt}pt`; if (cabe()) break; }
  }
}
function paginarImpressao(horizontal = false) {
  const vista = $('#vista'); if (!vista) return () => {};
  const html = document.documentElement;
  html.classList.add('medir');
  document.body.classList.add('paginado'); document.body.classList.toggle('impr-h', horizontal);
  const estilo = document.createElement('style'); estilo.textContent = `@page { size: A4 ${horizontal ? 'landscape' : 'portrait'}; margin: 0; }`; document.head.appendChild(estilo);
  const raiz = document.createElement('div'); raiz.className = 'folhas';
  // Trabalha sobre uma cópia: o ecrã volta ao normal sem ter de redesenhar nada.
  const medida = criarFolha(horizontal); raiz.appendChild(medida); vista.appendChild(raiz);
  const copia = medida.querySelector('.folha-conteudo');
  for (const n of vista.childNodes) if (n !== raiz) copia.appendChild(n.cloneNode(true));
  ajustarTabelasImpressao(copia);
  marcarQuebras(copia);
  const nos = [...copia.childNodes]; medida.remove();
  paginarEmFolhas(nos, raiz, horizontal);
  vista.classList.add('com-folhas');
  return () => { raiz.remove(); vista.classList.remove('com-folhas'); estilo.remove(); html.classList.remove('medir'); document.body.classList.remove('paginado', 'impr-h'); };
}
function prepararImpressao(opcoes = {}) {
  const limparGraficos = graficosParaImpressao();
  const limparPaginas = opcoes.paisagem ? () => {} : paginarImpressao(!!opcoes.horizontal);
  return () => { limparPaginas(); limparGraficos(); };
}
// O browser abre a janela de impressão: escolher "Guardar como PDF". O título da página serve de nome ao ficheiro.
function exportarPdf(nomeFicheiro, opcoes = {}) {
  const antes = document.title;
  const estilo = document.createElement('style');
  if (opcoes.paisagem) { estilo.textContent = '@page { size: A4 landscape; margin: 10mm; }'; document.head.appendChild(estilo); }
  document.title = nomeFicheiro.replace(/[\\/:*?"<>|]+/g, '-').trim();
  const limpar = prepararImpressao(opcoes);
  const repor = () => { document.title = antes; estilo.remove(); limpar(); window.removeEventListener('afterprint', repor); };
  window.addEventListener('afterprint', repor);
  // O Safari só imprime as imagens já carregadas: espera por elas antes de abrir a janela.
  Promise.all([...document.querySelectorAll('.folhas img')].map(i => i.decode().catch(() => {}))).then(() => window.print());
}

function valor(j, lado, k) { const m = App.idx.estEq[j.id]?.[lado]; const n = m ? m[k] : null; return Number.isFinite(n) ? n : null; }

function desenharPlacar(js, mets) {
  const res = js.map(resultadoJogo);
  const v = res.filter(r => r === 'V').length, e = res.filter(r => r === 'E').length, d = res.filter(r => r === 'D').length;
  const comRes = v + e + d;
  const gm = soma(js.map(j => j.golos_marcados)), gs = soma(js.map(j => j.golos_sofridos));
  const xg = chaveXG(mets);
  const evs = js.flatMap(j => App.idx.eventos[j.id] || []).filter(x => x.tipo === 'oportunidade');
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  $('#r-placar').innerHTML = [
    cel('Jogos', js.length, comRes ? `${v}V ${e}E ${d}D` : ''),
    (() => { const comp = competicaoDaClassificacao(js); const t = comp ? classificacao(comp) : []; const i = t.findIndex(x => eNossaEquipa(x.equipa));
      return i >= 0 ? cel('Classificação', `${i + 1}.º`, `${t[i].pts} pts em ${t[i].j} jogos`) : ''; })(),
    comRes ? cel('Pontos por jogo', fmtNum((3 * v + e) / comRes, 2)) : '',
    cel('Golos', `${gm}<i>–</i>${gs}`, 'marcados – sofridos'),
    xg ? cel('xG', `${fmtNum(soma(js.map(j => valor(j, 'nos', xg))))}<i>–</i>${fmtNum(soma(js.map(j => valor(j, 'adversario', xg))))}`, 'criado – sofrido') : '',
    evs.length ? cel('Oportunidades', `${evs.filter(x => x.lado === 'nos').length}<i>–</i>${evs.filter(x => x.lado === 'adversario').length}`, 'criadas – sofridas (codificadas)') : ''
  ].join('');
}

// Tendências por grupo (ofensivas, defensivas, passe): um gráfico pequeno por métrica, para ler tudo de uma vez e exportar.
const GRUPOS_TEND = [
  { id: 'of', nome: 'Métricas ofensivas', padrao: [/^golos esperados$|^xg$/i, /^remates$/i, /^remates à baliza$/i, /^toques na área$/i, /^entradas na grande área$/i, /^% ataques posicionais com remates$/i] },
  { id: 'def', nome: 'Métricas defensivas', padrao: [/^xg sofrido$/i, /^remates contra$/i, /^ppda$/i, /^recuperações$/i, /^% duelos defensivos ganhos$/i, /^interse(ç|c)ões$/i] },
  { id: 'pas', nome: 'Métricas de passe', padrao: [/^% passes certos$/i, /^posse$/i, /^passes$/i, /^passes progressivos$/i, /^% passes para terço final/i, /^média de passes por posse$/i] }
];
function gruposTendencia(mets) {
  let g = {}; try { g = JSON.parse(localStorage.getItem('analise_tendencias') || '{}'); } catch { g = {}; }
  const out = {};
  for (const G of GRUPOS_TEND) {
    out[G.id] = Array.isArray(g[G.id]) ? g[G.id].filter(m => mets.includes(m))
      : G.padrao.map(re => mets.find(m => re.test(m))).filter(Boolean);
  }
  return out;
}
function guardarGruposTendencia(g) { try { localStorage.setItem('analise_tendencias', JSON.stringify(g)); } catch { /* sem armazenamento */ } }
// Métricas do lado do adversário que não fazem sentido mostrar (xG sofrido do adversário = o nosso xG).
const semLinhaAdv = k => /sofrid|contra/i.test(k);

function desenharTendencia(js, mets) {
  const el = $('#r-tendencia');
  if (!mets.length) { el.innerHTML = '<h2>Tendências</h2><p class="fraco">Sem estatísticas Wyscout para estes jogos.</p>'; return; }
  const g = gruposTendencia(mets);
  const nome = App.cfg.nome_clube || 'Nós';
  const n5 = Math.min(5, js.length);
  const mini = (gid, k) => {
    const nos = js.map(j => valor(j, 'nos', k));
    const val = nos.filter(Number.isFinite);
    const ult = media(nos.slice(-5)), per = media(nos);
    const d = Number.isFinite(ult) && Number.isFinite(per) ? ult - per : null;
    const sent = sentidoMetricaEquipa(k), rel = d === null ? 0 : Math.abs(d) / (Math.abs(per) || 1);
    const cls = d === null || !sent || rel < 0.05 ? '' : (d > 0) === (sent > 0) ? 'bom' : 'mau';
    const casas = /^%|posse/i.test(k) || Math.abs(per) >= 10 ? 1 : 2;
    const dTxt = d === null ? '' : Math.abs(d) < 0.5 * 10 ** -casas ? '<span class="pj-dif">=</span>' : `<span class="pj-dif ${cls}">${fmtSinal(d, casas)}</span>`;
    return `<figure class="tend-mini" data-g="${gid}" data-k="${esc(k)}">
      <figcaption><b>${esc(k)}</b><button class="tend-x so-ecra" title="Retirar" aria-label="Retirar ${esc(k)}">×</button>
        <span class="tend-res">${val.length ? `Últ. ${Math.min(n5, val.length)}: <b>${fmtNum(ult, casas)}</b> · período: ${fmtNum(per, casas)} ${dTxt}` : 'Sem dados'}</span></figcaption>
      <div class="grafico tend-graf"><canvas aria-label="Evolução de ${esc(k)} por jogo"></canvas></div></figure>`;
  };
  el.innerHTML = `
    <div class="bloco-cab"><h2>Tendências</h2></div>
    <p class="nota">Valor por jogo do Wyscout. Linha a tracejado: média móvel de 5 jogos. Cor da diferença: verde melhor, vermelho pior (últimos ${n5} jogos face ao período).</p>
    <div class="tend-leg"><span><i style="background:${COR.nos}"></i>${esc(nome)}</span><span><i style="background:${COR.adv}"></i>Adversário</span><span><i class="tracejado" style="border-color:${COR.movel}"></i>${esc(nome)}, média móvel de 5 jogos</span></div>
    ${GRUPOS_TEND.map(G => `<div class="tend-grupo" data-g="${G.id}">
      <h3>${G.nome}</h3>
      ${g[G.id].length ? Array.from({ length: Math.ceil(g[G.id].length / 3) }, (_, i) => `<div class="tend-grelha">${g[G.id].slice(i * 3, i * 3 + 3).map(k => mini(G.id, k)).join('')}</div>`).join('') : '<p class="fraco">Nenhuma métrica escolhida.</p>'}
      <div class="tend-edit so-ecra"><select aria-label="Adicionar métrica a ${G.nome}"><option value="">+ Adicionar métrica…</option>${mets.filter(m => !g[G.id].includes(m)).map(m => `<option>${esc(m)}</option>`).join('')}</select>
        <button class="btn-link tend-repor">Repor predefinidas</button></div>
    </div>`).join('')}`;
  const mudar = f => { const n = gruposTendencia(mets); f(n); guardarGruposTendencia(n); desenharTendencia(js, mets); };
  $$('.tend-x', el).forEach(b => b.addEventListener('click', () => { const f = b.closest('.tend-mini'); mudar(n => { n[f.dataset.g] = n[f.dataset.g].filter(m => m !== f.dataset.k); }); }));
  $$('.tend-grupo', el).forEach(gr => {
    $('select', gr).addEventListener('change', e => { const k = e.target.value; if (k) mudar(n => { n[gr.dataset.g].push(k); }); });
    $('.tend-repor', gr).addEventListener('click', () => mudar(n => { const G = GRUPOS_TEND.find(x => x.id === gr.dataset.g); n[G.id] = G.padrao.map(re => mets.find(m => re.test(m))).filter(Boolean); }));
  });
  App.graficos = App.graficos.filter(c => { if (c.canvas.closest('#r-tendencia')) { c.destroy(); return false; } return true; });
  const labels = js.map(j => rotuloJogo(j, true));
  for (const f of $$('.tend-mini', el)) {
    const k = f.dataset.k;
    const nos = js.map(j => valor(j, 'nos', k)), adv = js.map(j => valor(j, 'adversario', k));
    const movel = nos.map((_, i) => media(nos.slice(Math.max(0, i - 4), i + 1)));
    const pt = { borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5, pointBorderColor: '#fff', pointBorderWidth: 1, tension: 0, spanGaps: true };
    const e = eixos();
    novoGrafico($('canvas', f), {
      type: 'line',
      data: { labels, datasets: [
        { label: nome, data: nos, borderColor: COR.nos, backgroundColor: COR.nos, ...pt },
        { label: 'Adversário', data: adv, borderColor: COR.adv, backgroundColor: COR.adv, ...pt, hidden: semLinhaAdv(k) || adv.every(x => x === null) },
        { label: 'Média móvel (5 jogos)', data: movel, borderColor: COR.movel, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 0, tension: 0.3 }
      ] },
      options: { ...OPCOES_LINHA, plugins: { ...OPCOES_LINHA.plugins, legend: { display: false } },
        scales: { ...e, x: { ...(e.x || {}), ticks: { ...(e.x?.ticks || {}), autoSkip: true, maxTicksLimit: 6, maxRotation: 0, font: { size: 10 }, callback: (v, i) => String(labels[i] ?? '').split(' ')[0] } }, y: { ...(e.y || {}), ticks: { ...(e.y?.ticks || {}), maxTicksLimit: 5, font: { size: 10 } } } } }
    });
  }
}

// ---- Liga ----
// Registos da liga nas mesmas jornadas e competições do período filtrado.
function ligaDoPeriodo(js) {
  const chaves = new Set(js.filter(j => j.jornada !== null && j.jornada !== undefined).map(j => `${norm(j.competicao)}|${j.jornada}`));
  if (!chaves.size || !App.d.liga?.length) return null;
  const rows = App.d.liga.filter(r => chaves.has(`${norm(r.competicao)}|${r.jornada}`));
  return rows.length ? rows : null;
}
function eNossaEquipa(nome) { return criarIdentificador(App.cfg, App.d.mapas).eNos(nome); }
// Média da liga (média das médias de cada equipa) e posição da vossa equipa (1.º = valor mais alto).
function comparacaoLiga(rows, k) {
  const porEquipa = {};
  for (const r of rows) { const v = r.metricas?.[k]; if (Number.isFinite(v)) (porEquipa[r.equipa] ||= []).push(v); }
  const medias = Object.entries(porEquipa).map(([e, vs]) => ({ e, v: media(vs) }));
  const nossa = medias.find(x => eNossaEquipa(x.e));
  if (medias.length < 2) return null;
  return { media: media(medias.map(x => x.v)), pos: nossa ? 1 + medias.filter(x => x.v > nossa.v + 1e-9).length : null, n: medias.length };
}
function classificacao(competicao) {
  const t = {};
  for (const r of App.d.liga || []) {
    if (norm(r.competicao) !== norm(competicao) || !Number.isFinite(r.golos) || !Number.isFinite(r.golos_sofridos)) continue;
    const x = (t[r.equipa] ||= { equipa: r.equipa, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0 });
    x.j++; x.gm += r.golos; x.gs += r.golos_sofridos;
    if (r.golos > r.golos_sofridos) x.v++; else if (r.golos === r.golos_sofridos) x.e++; else x.d++;
  }
  return Object.values(t).map(x => ({ ...x, pts: 3 * x.v + x.e, dg: x.gm - x.gs }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gm - a.gm || a.equipa.localeCompare(b.equipa, 'pt'));
}
function competicaoDaClassificacao(js) {
  if (App.rel.competicao !== 'todas') return App.rel.competicao;
  const comJornada = js.filter(j => j.jornada !== null && j.jornada !== undefined);
  return comJornada.length ? comJornada[comJornada.length - 1].competicao : null;
}

function desenharComparacao(js, chave) {
  const el = $('#r-comparacao');
  if (!chave.length) { el.remove(); return; }
  const liga = ligaDoPeriodo(js);
  const linhas = chave.map(k => {
    const n = js.map(j => valor(j, 'nos', k)), a = js.map(j => valor(j, 'adversario', k));
    const mn = media(n), ma = media(a), u5 = media(n.slice(-5));
    return { k, mn, ma, dif: mn !== null && ma !== null ? mn - ma : null, u5, var: u5 !== null && mn !== null ? u5 - mn : null, liga: liga ? comparacaoLiga(liga, k) : null };
  });
  const temLiga = linhas.some(l => l.liga);
  el.innerHTML = `
    <h2>Nós, os adversários e a liga</h2>
    <div class="tabela-env"><table class="tabela">
      <thead><tr><th>Métrica</th><th class="num">${esc(App.cfg.nome_clube || 'Nós')}</th>${temLiga ? '<th class="num">Média da liga</th><th class="num">Posição na liga</th>' : ''}<th class="num">Adversários</th><th class="num">Diferença</th><th class="num">Nós, últimos 5</th><th class="num">Últimos 5 vs. período</th></tr></thead>
      <tbody>${linhas.map(l => `<tr><td>${esc(l.k)}</td><td class="num"><b>${fmtNum(l.mn, 2)}</b></td>
        ${temLiga ? `<td class="num">${fmtNum(l.liga?.media, 2)}</td><td class="num">${l.liga?.pos ? `<b>${l.liga.pos}.º</b> de ${l.liga.n}` : '–'}</td>` : ''}
        <td class="num">${fmtNum(l.ma, 2)}</td><td class="num"><span class="pj-dif ${classeDif(l.k, l.dif, l.mn)}">${fmtSinal(l.dif, 2)}</span></td><td class="num">${fmtNum(l.u5, 2)}</td><td class="num"><span class="pj-dif ${classeDif(l.k, l.var, l.mn)}">${seta(l.var, l.mn)} ${fmtSinal(l.var, 2)}</span></td></tr>`).join('')}</tbody>
    </table></div>
    <dl class="leg-tabela">
      <div><dt>Valores</dt><dd>média por jogo</dd></div>
      ${temLiga ? `<div><dt>Média da liga</dt><dd>média das ${linhas.find(l => l.liga).liga.n} equipas nas mesmas jornadas</dd></div>
      <div><dt>Posição</dt><dd>1.º = valor mais alto</dd></div>` : ''}
      <div><dt>Adversários</dt><dd>média do que os adversários fizeram contra nós</dd></div>
      <div><dt>Diferença</dt><dd>nós menos adversários</dd></div>
      <div><dt>Nós, últimos 5</dt><dd>média dos 5 jogos mais recentes</dd></div>
      <div><dt>Últimos 5 vs. período</dt><dd>últimos 5 menos a média do período (→ menos de 5%)</dd></div>
    </dl>
    <p class="nota">A verde o que é melhor, a vermelho o que é pior (no PPDA, remates contra e xG sofrido, menos é melhor); sem cor, variações abaixo de 5% ou métricas que dependem do modelo de jogo, como a posse.</p>`;
}

function desenharClassificacao(js) {
  const el = $('#r-classificacao'); if (!el) return;
  const comp = competicaoDaClassificacao(js);
  const tabela = comp ? classificacao(comp) : [];
  if (tabela.length < 2) { el.remove(); return; }
  const ultima = Math.max(...App.d.liga.filter(r => norm(r.competicao) === norm(comp)).map(r => r.jornada));
  el.innerHTML = `
    <h2>Classificação</h2>
    <p class="nota">${esc(comp)}, até à jornada ${ultima}, calculada a partir ${App.d.liga.some(r => r.deTeamStats && norm(r.competicao) === norm(comp)) ? 'dos Team stats importados de cada equipa (jornada = n.º do jogo de cada equipa)' : 'do ficheiro da liga'}.</p>
    <div class="tabela-env"><table class="tabela compacta classificacao">
      <thead><tr><th class="num">#</th><th>Equipa</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">Golos</th><th class="num">DG</th><th class="num">Pts</th></tr></thead>
      <tbody>${tabela.map((x, i) => `<tr class="${eNossaEquipa(x.equipa) ? 'nossa' : ''}"><td class="num">${i + 1}</td><td>${esc(x.equipa)}</td><td class="num">${x.j}</td><td class="num">${x.v}</td><td class="num">${x.e}</td><td class="num">${x.d}</td><td class="num">${x.gm}–${x.gs}</td><td class="num">${fmtSinal(x.dg, 0)}</td><td class="num"><b>${x.pts}</b></td></tr>`).join('')}</tbody>
    </table></div>`;
}

function seta(dif, base) {
  if (dif === null || base === null) return '';
  const rel = Math.abs(dif) / (Math.abs(base) || 1);
  if (rel < 0.05) return '<span class="seta" aria-label="estável">→</span>';
  return dif > 0 ? '<span class="seta" aria-label="a subir">↗</span>' : '<span class="seta" aria-label="a descer">↘</span>';
}

function desenharDesempenho(js, mets) {
  const el = $('#r-desempenho');
  const xg = chaveXG(mets);
  const evs = js.flatMap(j => App.idx.eventos[j.id] || []).filter(x => x.tipo === 'oportunidade');
  if (!xg && !evs.length) { el.remove(); return; }
  const gm = soma(js.map(j => j.golos_marcados)), gs = soma(js.map(j => j.golos_sofridos));
  let html = '<h2>Desempenho e resultado</h2>';
  if (xg) {
    const xf = soma(js.map(j => valor(j, 'nos', xg))), xa = soma(js.map(j => valor(j, 'adversario', xg)));
    const leitura = d => Math.abs(d) < 1.5 ? 'em linha com o esperado' : d > 0 ? 'mais do que o esperado' : 'menos do que o esperado';
    html += `<p class="destaque">Marcámos <b>${gm}</b> golos para <b>${fmtNum(xf)}</b> de xG (${fmtSinal(gm - xf)}, ${leitura(gm - xf)}). Sofremos <b>${gs}</b> para <b>${fmtNum(xa)}</b> de xG (${fmtSinal(gs - xa)}, ${leitura(gs - xa)}).</p>
      <p class="nota">Uma diferença grande e persistente entre golos e xG costuma corrigir-se com o tempo: o xG mostra melhor a qualidade do processo do que o resultado.</p>
      <div class="grafico"><canvas aria-label="Golos e xG acumulados"></canvas></div>`;
  }
  if (evs.length) {
    const lado = l => {
      const e = evs.filter(x => x.lado === l); const g = e.filter(x => x.resultado === 'Golo').length; const go = e.filter(x => x.qualidade === 'Grande oportunidade');
      return { n: e.length, g, conv: e.length ? g / e.length * 100 : null, go: go.length, goG: go.filter(x => x.resultado === 'Golo').length };
    };
    const c = lado('nos'), s = lado('adversario');
    html += `<h3>Oportunidades codificadas</h3>
      <div class="tabela-env"><table class="tabela compacta">
        <thead><tr><th></th><th class="num">Oportunidades</th><th class="num">Golos</th><th class="num">Conversão</th><th class="num">Grandes oportunidades</th><th class="num">Golos em grandes oportunidades</th></tr></thead>
        <tbody>
          <tr><td><span class="ponto-cor nos"></span>Criadas</td><td class="num">${c.n}</td><td class="num">${c.g}</td><td class="num">${fmtNum(c.conv, 0)}%</td><td class="num">${c.go}</td><td class="num">${c.goG}</td></tr>
          <tr><td><span class="ponto-cor adv"></span>Sofridas</td><td class="num">${s.n}</td><td class="num">${s.g}</td><td class="num">${fmtNum(s.conv, 0)}%</td><td class="num">${s.go}</td><td class="num">${s.goG}</td></tr>
        </tbody></table></div>`;
  }
  el.innerHTML = html;
  if (xg) {
    const acum = arr => { let t = 0; return arr.map(x => (t += (Number.isFinite(x) ? x : 0))); };
    const base = { borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0 };
    novoGrafico($('canvas', el), {
      type: 'line',
      data: {
        labels: js.map(j => rotuloJogo(j, true)),
        datasets: [
          { ...base, label: 'Golos marcados', data: acum(js.map(j => j.golos_marcados)), borderColor: COR.nos, backgroundColor: COR.nos },
          { ...base, label: 'xG criado', data: acum(js.map(j => valor(j, 'nos', xg))), borderColor: COR.nos, backgroundColor: COR.nos, borderDash: [5, 4] },
          { ...base, label: 'Golos sofridos', data: acum(js.map(j => j.golos_sofridos)), borderColor: COR.adv, backgroundColor: COR.adv },
          { ...base, label: 'xG sofrido', data: acum(js.map(j => valor(j, 'adversario', xg))), borderColor: COR.adv, backgroundColor: COR.adv, borderDash: [5, 4] }
        ]
      },
      options: { ...OPCOES_LINHA, plugins: { ...OPCOES_LINHA.plugins, legend: { ...OPCOES_LINHA.plugins.legend, labels: { ...OPCOES_LINHA.plugins.legend.labels, usePointStyle: false, boxWidth: 22, boxHeight: 2 } } }, scales: eixos('Acumulado') }
    });
  }
}

function desenharOportunidades(js) {
  const el = $('#r-oportunidades');
  // Só as oportunidades codificadas (os esquemas táticos codificados são outra análise e não entram aqui).
  const ops = js.flatMap(j => App.idx.eventos[j.id] || []).filter(e => e.tipo === 'oportunidade' && !e.ep_tipo);
  if (!ops.length) {
    el.innerHTML = `<h2>Oportunidades codificadas</h2><p class="fraco">Ainda não há oportunidades codificadas nestes jogos.${pode() ? ' Registe-as em <a href="#codificacao">Codificação</a>.' : ''}</p>`;
    return;
  }
  const cri = ops.filter(e => e.lado === 'nos'), sof = ops.filter(e => e.lado === 'adversario');
  // Cada lado com as suas tabelas: momento e mecanismo (oportunidades, % do total e golos).
  const tabela = (titulo, campo, l) => {
    const c = contarPor(l, e => dadosOportunidade(e)[campo] || 'Sem indicação');
    const linhas = c.map(([x, n]) => ({ x, n, g: l.filter(e => (dadosOportunidade(e)[campo] || 'Sem indicação') === x && e.resultado === 'Golo').length }))
      .sort((a, b) => b.n - a.n || b.g - a.g);
    if (!linhas.length) return '';
    return `<div class="tabela-env"><table class="tabela compacta op-tab">
      <thead><tr><th>${titulo}</th><th class="num">Oport.</th><th class="num">%</th><th class="num">Golos</th></tr></thead>
      <tbody>${linhas.map(r => `<tr><td>${esc(r.x)}</td><td class="num">${r.n}</td><td class="num">${fmtNum(r.n / l.length * 100, 0)}%</td><td class="num">${r.g || '<span class="fraco">0</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  };
  const lado = (l, cls, rot, extra = '') => `<div class="op-lado">
      <figure><figcaption><span class="ponto-cor ${cls}"></span>${rot}: ${l.length}${extra}</figcaption>${campoSVG({ eventos: l, metade: true })}</figure>
      ${l.length ? `${tabela('Momento', 'momento', l)}${tabela('Mecanismo', 'mecanismo', l)}` : '<p class="fraco">Sem oportunidades.</p>'}
    </div>`;
  el.innerHTML = `
    <h2>Oportunidades codificadas</h2>
    ${legendaCampo()}
    <p class="nota sem-margem">Criadas à esquerda, sofridas à direita (vistas do lado de quem ataca).</p>
    <div class="op-lados">
      ${lado(cri, 'nos', 'Criadas', ` <span class="fraco">· ${cri.filter(e => e.resultado === 'Golo').length} golos</span>`)}
      ${lado(sof, 'adv', 'Sofridas', ` <span class="fraco">· ${sof.filter(e => e.resultado === 'Golo').length} golos</span>`)}
    </div>
    <p class="nota so-ecra">Análise completa (sub-momentos, zonas, jogadores e comparação com as outras equipas) em <a href="#oportunidades">Oportunidades</a>.</p>`;
}

// ---- Jogadores ----
function agregarJogadores(js) {
  const ids = new Set(js.map(j => j.id));
  const linhas = App.d.estJog.filter(r => ids.has(r.jogo_id) && r.lado === 'nos');
  const mets = [...new Set(linhas.flatMap(r => Object.keys(r.metricas || {})))].filter(k => !k.startsWith('_')).sort((a, b) => a.localeCompare(b));
  const porJog = {};
  for (const r of linhas) {
    const p = (porJog[r.jogador] ||= { nome: r.jogador, pos: {}, jogos: 0, minutos: 0, tot: {}, pond: {}, minPond: {} });
    const min = Number.isFinite(r.minutos) ? r.minutos : 0;
    if (min > 0 || r.minutos === null) p.jogos++;
    p.minutos += min;
    if (r.posicao) p.pos[r.posicao] = (p.pos[r.posicao] || 0) + 1;
    for (const [k, v] of Object.entries(r.metricas || {})) {
      if (!Number.isFinite(v)) continue;
      if (ePercentagem(k)) { p.pond[k] = (p.pond[k] || 0) + v * (min || 1); p.minPond[k] = (p.minPond[k] || 0) + (min || 1); }
      else p.tot[k] = (p.tot[k] || 0) + v;
    }
  }
  const jogadores = Object.values(porJog).map(p => ({ ...p, posicao: Object.entries(p.pos).sort((a, b) => b[1] - a[1])[0]?.[0] || '' }));
  return { jogadores, mets, linhas };
}

function valorJogador(p, k, por90) {
  if (ePercentagem(k)) return p.minPond[k] ? p.pond[k] / p.minPond[k] : null;
  const t = p.tot[k]; if (!Number.isFinite(t)) return null;
  return por90 ? (p.minutos > 0 ? t / p.minutos * 90 : null) : t;
}

function desenharJogadores(js) {
  const el = $('#r-jogadores');
  const { jogadores, mets } = agregarJogadores(js);
  if (!jogadores.length) {
    el.innerHTML = `<h2>Jogadores</h2><p class="fraco">Ainda não há estatísticas individuais nestes jogos.${ehDep() ? ' Importe-as em <a href="#importacao">Importação › Jogadores</a>.' : ''}</p>`;
    return;
  }
  const R = App.rel;
  if (!R.metricasJog || !R.metricasJog.every(m => mets.includes(m))) R.metricasJog = PADRAO_JOG.filter(m => mets.includes(m)).slice(0, 5);
  if (!R.metricasJog.length) R.metricasJog = mets.slice(0, 4);
  const sel = R.metricasJog;
  const valorOrdem = p => R.ordem.col === 'nome' ? p.nome : R.ordem.col === 'jogos' ? p.jogos : R.ordem.col === 'minutos' ? p.minutos : valorJogador(p, R.ordem.col, R.por90) ?? -Infinity;
  jogadores.sort((a, b) => {
    const va = valorOrdem(a), vb = valorOrdem(b);
    const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return R.ordem.desc ? -c : c;
  });
  const th = (col, txt, num = true) => {
    const ativo = R.ordem.col === col;
    return `<th class="${num ? 'num' : ''}" aria-sort="${ativo ? (R.ordem.desc ? 'descending' : 'ascending') : 'none'}"><button class="ordenar" data-col="${esc(col)}">${esc(txt)}${ativo ? (R.ordem.desc ? ' ↓' : ' ↑') : ''}</button></th>`;
  };
  el.innerHTML = `
    <div class="bloco-cab"><h2>Jogadores</h2>
      <div class="alternar so-ecra" role="radiogroup" aria-label="Valores">
        <label class="chip"><input type="radio" name="p90" value="1" ${R.por90 ? 'checked' : ''}><span>Por 90 min</span></label>
        <label class="chip"><input type="radio" name="p90" value="0" ${R.por90 ? '' : 'checked'}><span>Totais</span></label>
      </div>
    </div>
    <details class="escolher-metricas so-ecra"><summary>Colunas: ${sel.map(esc).join(', ')}</summary>
      <div class="chips-lista">${mets.map(m => `<label class="chip-check"><input type="checkbox" value="${esc(m)}" ${sel.includes(m) ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('')}</div>
    </details>
    <div class="tabela-env"><table class="tabela jogadores">
      <thead><tr>${th('nome', 'Jogador', false)}<th>Pos.</th>${th('jogos', 'Jogos')}${th('minutos', 'Minutos')}${sel.map(m => th(m, m)).join('')}</tr></thead>
      <tbody>${jogadores.map(p => `<tr><td><button class="btn-link nome-jogador" data-jogador="${esc(p.nome)}">${esc(nomeVisivel(p.nome))}</button></td><td>${esc(p.posicao)}</td><td class="num">${p.jogos}</td><td class="num">${fmtNum(p.minutos, 0)}</td>
        ${sel.map(m => `<td class="num">${fmtNum(valorJogador(p, m, R.por90), ePercentagem(m) ? 1 : (R.por90 ? 2 : 1))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="nota">Percentagens são médias ponderadas pelos minutos. Clique num jogador para abrir a ficha individual.</p>`;
  $$('input[name=p90]', el).forEach(r => r.addEventListener('change', () => { R.por90 = r.value === '1'; desenharJogadores(js); }));
  $$('.escolher-metricas input', el).forEach(c => c.addEventListener('change', () => {
    R.metricasJog = $$('.escolher-metricas input:checked', el).map(x => x.value);
    if (!R.metricasJog.length) R.metricasJog = [c.value];
    desenharJogadores(js); $('.escolher-metricas', $('#r-jogadores')).open = true;
  }));
  $$('.ordenar', el).forEach(b => b.addEventListener('click', () => {
    const col = b.dataset.col;
    R.ordem = { col, desc: R.ordem.col === col ? !R.ordem.desc : col !== 'nome' };
    desenharJogadores(js);
  }));
  $$('[data-jogador]', el).forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.jogador)));
}
