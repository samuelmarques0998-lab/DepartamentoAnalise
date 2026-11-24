// ---------- Campeonato › Classificação e rankings ----------
// Só campeonatos: uma competição com poucas equipas nos dados (ex.: um jogo europeu) não é uma liga e fica de fora.
// O campeonato com mais registos vem primeiro.
function competicoesLiga() {
  const m = new Map();
  for (const r of App.d.liga || []) { const o = m.get(r.competicao) || { eq: new Set(), n: 0 }; o.eq.add(norm(r.equipa)); o.n++; m.set(r.competicao, o); }
  return [...m].filter(([, o]) => o.eq.size >= 4).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], 'pt')).map(([c]) => c);
}
function classificacaoAte(competicao, ateJornada) {
  const t = {};
  for (const r of App.d.liga || []) {
    if (norm(r.competicao) !== norm(competicao) || r.jornada > ateJornada || !Number.isFinite(r.golos) || !Number.isFinite(r.golos_sofridos)) continue;
    const x = (t[r.equipa] ||= { equipa: r.equipa, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, forma: [] });
    x.j++; x.gm += r.golos; x.gs += r.golos_sofridos;
    const res = r.golos > r.golos_sofridos ? 'V' : r.golos === r.golos_sofridos ? 'E' : 'D';
    x[res.toLowerCase()]++; x.forma.push([r.jornada, res]);
  }
  return Object.values(t).map(x => ({ ...x, pts: 3 * x.v + x.e, dg: x.gm - x.gs, forma: x.forma.sort((a, b) => a[0] - b[0]).slice(-5).map(f => f[1]) }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gm - a.gm || a.equipa.localeCompare(b.equipa, 'pt'));
}
function metricasLigaDisponiveis(liga) { return new Set(METRICAS_EQ.filter(d => liga.some(l => valorEq(d, l) !== null)).map(d => d.id)); }

function desenharPaginaRankings() {
  const v = $('#vista'); App.rk ||= { competicao: null, jornada: null, foco: null, outro: '', x: 'xg', y: 'xg_sofrido' }; const R = App.rk;
  const comps = competicoesLiga();
  if (!comps.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Classificação e rankings</h1></div><div class="vazio"><p>Ainda não há dados do campeonato.</p>${pode() ? '<p>Importe o ficheiro da liga em <a href="#importacao">Importação › Estatísticas de equipa</a>.</p>' : ''}</div>`;
    return;
  }
  if (!comps.includes(R.competicao)) R.competicao = comps[0];
  const jornadas = [...new Set(App.d.liga.filter(r => norm(r.competicao) === norm(R.competicao)).map(r => r.jornada))].sort((a, b) => a - b);
  // Por omissão (e sempre que chegam dados novos) mostra a última jornada; só fica noutra se for escolhida à mão.
  if (!R.jornadaManual || !jornadas.includes(R.jornada)) { R.jornada = jornadas[jornadas.length - 1]; R.jornadaManual = false; }
  const liga = linhasLiga(R.competicao, R.jornada);
  // Jornada ainda incompleta: diz quantos jogos já têm dados.
  const ligaComp = App.d.liga.filter(r => norm(r.competicao) === norm(R.competicao));
  const porJornada = j => new Set(ligaComp.filter(r => r.jornada === j).map(r => [norm(r.equipa), norm(r.adversario)].sort().join('|'))).size;
  const jogosCompletos = Math.max(...jornadas.map(porJornada));
  const nJor = porJornada(R.jornada);
  const notaJornada = nJor < jogosCompletos ? ` A jornada ${R.jornada} ainda só tem ${nJor} de ${jogosCompletos} jogos com dados.` : '';
  const equipas = [...new Set(liga.map(l => l.equipa))].sort((a, b) => a.localeCompare(b, 'pt'));
  if (!equipas.includes(R.foco)) R.foco = equipas.find(e => eNossaEquipa(e)) || equipas[0];
  if (R.outro && !equipas.includes(R.outro)) R.outro = '';
  const tabela = classificacaoAte(R.competicao, R.jornada);
  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>Classificação e rankings</h1><p class="nota">${esc(R.competicao)}, até à jornada ${R.jornada}.${notaJornada} Escolha a equipa em foco e, se quiser, outra para comparar.</p></div>
      <button class="btn so-ecra botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
    </div>
    <div class="filtros so-ecra" role="group" aria-label="Filtros">
      ${comps.length > 1 ? `<label>Competição<select id="rk-comp">${comps.map(c => `<option ${c === R.competicao ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>` : ''}
      <label>Até à jornada<select id="rk-jor">${jornadas.slice().reverse().map(j => `<option value="${j}" ${j === R.jornada ? 'selected' : ''}>${j}</option>`).join('')}</select></label>
      <label>Equipa em foco<select id="rk-foco">${equipas.map(e => `<option ${e === R.foco ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
      <label>Comparar com<select id="rk-outro"><option value="">— nenhuma —</option>${equipas.filter(e => e !== R.foco).map(e => `<option ${e === R.outro ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
    </div>
    <section class="bloco">
      <h2>Classificação</h2>
      <div class="tabela-env"><table class="tabela compacta classificacao rk-classificacao">
        <thead><tr><th class="num">#</th><th>Equipa</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">Golos</th><th class="num">DG</th><th class="num">Pts</th><th>Últimos 5</th></tr></thead>
        <tbody>${tabela.map((x, i) => `<tr class="${x.equipa === R.foco ? 'nossa' : x.equipa === R.outro ? 'outra' : ''}"><td class="num">${i + 1}</td><td><span class="rk-eq">${simboloEquipa(x.equipa)}${esc(x.equipa)}</span></td><td class="num">${x.j}</td><td class="num">${x.v}</td><td class="num">${x.e}</td><td class="num">${x.d}</td><td class="num">${x.gm}–${x.gs}</td><td class="num">${fmtSinal(x.dg, 0)}</td><td class="num"><b>${x.pts}</b></td><td class="visao-forma">${formaHTML(x.forma)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="bloco pj-secao" id="rk-liga"></section>`;
  const defs = metricasDoRelatorio(metricasLigaDisponiveis(liga));
  desenharBlocoLiga($('#rk-liga'), { titulo: 'Rankings', competicao: R.competicao, jornada: R.jornada, liga, defs, estado: R, foco: R.foco, outro: R.outro || null, rotuloOutro: '' });
  const muda = (id, campo, num) => $(id)?.addEventListener('change', e => { R[campo] = num ? Number(e.target.value) : e.target.value; desenharPaginaRankings(); });
  $('#rk-comp')?.addEventListener('change', e => { R.competicao = e.target.value; R.jornadaManual = false; desenharPaginaRankings(); });
  $('#rk-jor')?.addEventListener('change', e => { R.jornada = Number(e.target.value); R.jornadaManual = R.jornada !== jornadas[jornadas.length - 1]; desenharPaginaRankings(); }); muda('#rk-foco', 'foco'); muda('#rk-outro', 'outro');
  $('#b-pdf').addEventListener('click', () => exportarPdf(`Classificação e rankings ${R.foco} J${R.jornada}`, { horizontal: true }));
}

// ---------- Adversário › Relatório pré-jogo (primeira versão) ----------
function proximoJogo() {
  const hoje = hojeIso();
  return App.d.jogos.filter(j => !resultadoJogo(j) && (!j.data || j.data >= hoje)).sort(compararJogos)[0] || null;
}
// ---- Oportunidades e esquemas táticos do adversário (entram no PDF) ----
// Conclusões do pré-jogo: os maiores desvios do adversário em relação às outras equipas codificadas (as mesmas da visão geral do PDF 16:9).
function htmlConclusoesPre(eq) {
  const f = { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' };
  const js = jogosDaEquipa(eq, f); if (!js.length) return '';
  const c = conclusoesOportunidades(eq, oportunidadesDe(eq, f, js), oportunidadesDe(eq, { ...f, persp: 'sofridas' }, js), js.length, f);
  if (!c.length) return '';
  return `<h3 class="concl-sub">Oportunidades <span class="nota">(codificação · comparação com as outras equipas codificadas)</span></h3>
    <ol>${c.map(([t, d, lado]) => `<li class="${lado}"><span class="ana-concl-tag">${lado === 'defesa' ? 'Defesa' : 'Ataque'}</span><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>`;
}

function htmlOportunidadesPre(eq) {
  const f = { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' };
  const js = jogosDaEquipa(eq, f); if (!js.length) return '';
  const cri = oportunidadesDe(eq, f, js), sof = oportunidadesDe(eq, { ...f, persp: 'sofridas' }, js);
  const g = l => l.filter(x => x.o.golo).length;
  const coluna = (titulo, ops, quem, espelho = false) => `<div class="pre-cod-col"><h3>${titulo}</h3>
    <p class="nota sem-margem">${ops.length} ${ops.length === 1 ? 'oportunidade' : 'oportunidades'} · ${fmtNum(ops.length / js.length, 1)} por jogo · ${g(ops)} ${g(ops) === 1 ? 'golo' : 'golos'}</p>
    <div class="pre-cod-mapas"><figure><figcaption>Zona de finalização${espelho ? ' (lados de quem defende)' : ''}</figcaption>${mapaZonas('fin', pontosOp(ops, 'fin', espelho))}</figure></div>
    ${barras('Momento', contarPor(ops, x => x.o.momento), ops.length, { max: 5 })}
    ${barras('Mecanismo', contarPor(ops, x => x.o.mecanismo), ops.length, { max: 6 })}
    ${quem ? barras('Quem finaliza', contarPor(ops, x => x.e.jogador), 0, { max: 5 }) : ''}</div>`;
  return `<h2>Oportunidades</h2><p class="nota">${js.length} ${js.length === 1 ? 'jogo codificado' : 'jogos codificados'} de ${esc(eq)}.</p>
    <div class="pre-cod-grelha">${coluna('Como cria', cri, true)}${coluna('Como sofre', sof, false, true)}</div>`;
}
function htmlEsquemasPre(eq) {
  const fa = esquemasDaEquipa(eq, 'favor'), co = esquemasDaEquipa(eq, 'contra');
  const j = Math.max(fa.jogos.length, co.jogos.length); if (!j) return '';
  const pct = l => (l.length ? `${fmtNum(l.filter(x => contactoGanho(x.e)).length / l.length * 100, 0)}%` : '–');
  const g = l => l.filter(x => eGolo(x.e)).length;
  const resumo = (l, ganho) => `${l.length} (${fmtNum(l.length / j, 1)} por jogo) · 1.º contacto ${ganho}: ${pct(l)} · ${g(l)} ${g(l) === 1 ? 'golo' : 'golos'}`;
  return `<h2>Esquemas táticos</h2><p class="nota">Cantos e livres em ${j} ${j === 1 ? 'jogo codificado' : 'jogos codificados'} de ${esc(eq)}.</p>
    <div class="pre-cod-grelha">
      <div class="pre-cod-col"><h3>A favor</h3><p class="nota sem-margem">${resumo(fa.lista, 'ganho')}</p>${mapaZonasEP(fa.lista)}
        ${barras('Mecanismo', contarPor(fa.lista, x => x.e.mecanismo), fa.lista.length, { max: 3 })}</div>
      <div class="pre-cod-col"><h3>Contra</h3><p class="nota sem-margem">${resumo(co.lista, 'ganho pelo adversário')}</p>${mapaZonasEP(co.lista)}
        ${barras('1.º contacto', contarPor(co.lista, x => x.e.primeiro_contacto), co.lista.length, { max: 3 })}</div>
    </div>
    <div class="pre-cod-grelha pre-cod-jog">${tabelaJogadoresEP('Batedores', fa.lista, 'jogador', 6)}${tabelaJogadoresEP('Referências', fa.lista, 'referencia', 6)}</div>`;
}

// ---- Visão geral do pré-jogo ----
// Pares ataque/defesa: o que uma equipa produz e o que a outra concede da mesma coisa.
const PARES_PRE = [['xg', 'xg_sofrido', 'xG'], ['remates', 'remates_sofridos', 'Remates'], ['toques_area', 'toques_area_sof', 'Toques na área'], ['entradas_area', 'entradas_area_sof', 'Entradas na área'], ['op_criadas', 'op_sofridas', 'Oportunidades']];
function rankingLiga(liga, defs) {
  const equipas = [...new Set(liga.map(l => l.equipa))]; const r = {};
  for (const d of defs) {
    const vs = equipas.map(e => ({ e, v: media(liga.filter(l => l.equipa === e).map(l => valorEq(d, l))) })).filter(x => Number.isFinite(x.v));
    if (vs.length < 2) continue;
    const ord = vs.sort((a, b) => (d.melhor === -1 ? a.v - b.v : b.v - a.v));
    r[d.id] = { d, n: ord.length, med: media(ord.map(x => x.v)), pos: e => { const i = ord.findIndex(x => x.e === e); return i < 0 ? null : { p: i + 1, v: ord[i].v }; } };
  }
  return r;
}
function htmlVisaoPre(liga, adv, nossa, defs) {
  const rk = rankingLiga(liga, defs); const ids = Object.keys(rk);
  if (!adv || !ids.length) return '';
  const nomeCurto = e => esc(e);
  // 1. Pontos fortes e fracos (só métricas com melhor/pior).
  const itens = ids.map(id => ({ r: rk[id], x: rk[id].pos(adv) })).filter(o => o.x && o.r.d.melhor);
  const terco = o => Math.ceil(o.r.n / 3);
  const fortes = itens.filter(o => o.x.p <= terco(o)).sort((a, b) => a.x.p - b.x.p).slice(0, 5);
  const fracos = itens.filter(o => o.x.p > o.r.n - terco(o)).sort((a, b) => b.x.p - a.x.p).slice(0, 5);
  const lista = (arr, vazio) => arr.length ? `<ul class="pj-alertas">${arr.map(o => `
    <li><div class="pj-al-nome">${esc(o.r.d.nome)} <span class="pre-area">${esc(o.r.d.area)}</span></div>
      <div class="pj-al-val"><b>${fmtEq(o.r.d, o.x.v)}</b> <span>${o.x.p}.º de ${o.r.n} · média da liga ${fmtEq(o.r.d, o.r.med)}</span></div></li>`).join('')}</ul>` : `<p class="fraco">${vazio}</p>`;
  const estilo = ids.map(id => rk[id]).filter(r => !r.d.melhor && r.pos(adv)).map(r => {
    const x = r.pos(adv); const q = x.p <= Math.ceil(r.n / 3) ? 'alto' : x.p > r.n - Math.ceil(r.n / 3) ? 'baixo' : 'médio';
    return `${esc(r.d.nome)}: <b>${fmtEq(r.d, x.v)}</b> (${q}, ${x.p}.º)`;
  });
  // 2. Confronto: ataque deles vs a nossa defesa e o inverso.
  let confronto = '';
  if (nossa) {
    const linha = (ida, idd, rot, atacante, defensor, nos) => {
      const ra = rk[ida], rd = rk[idd]; if (!ra || !rd) return '';
      const a = ra.pos(atacante), d = rd.pos(defensor); if (!a || !d) return '';
      // Quem leva vantagem: comparação das posições (1.º = melhor ataque / melhor defesa).
      const n = Math.max(ra.n, rd.n), dif = a.p - d.p, lim = Math.max(2, Math.round(n / 3));
      const atacaMelhor = dif <= -lim, defendeMelhor = dif >= lim;
      const bomParaNos = nos === 'ataque' ? atacaMelhor : defendeMelhor, mauParaNos = nos === 'ataque' ? defendeMelhor : atacaMelhor;
      const tag = bomParaNos ? '<span class="pre-tag bom">vantagem</span>' : mauParaNos ? '<span class="pre-tag mau">atenção</span>' : '<span class="pre-tag">equilíbrio</span>';
      const cel = (def, x) => `<td><b>${fmtEq(def, x.v)}</b><span class="pre-pos">${x.p}.º</span></td>`;
      return `<tr><th scope="row">${esc(rot)}</th>${cel(ra.d, a)}${cel(rd.d, d)}<td class="pre-ver">${tag}</td></tr>`;
    };
    const tab = (titulo, cabA, cabD, linhas) => linhas ? `<div class="pre-conf"><h3>${titulo}</h3><table class="pj-tabela pre-conf-tab"><thead><tr><th></th><th>${cabA}</th><th>${cabD}</th><th class="pre-ver"></th></tr></thead><tbody>${linhas}</tbody></table></div>` : '';
    const ataqueDeles = PARES_PRE.map(([a, d, r]) => linha(a, d, r, adv, nossa, 'defesa')).join('');
    const nossoAtaque = PARES_PRE.map(([a, d, r]) => linha(a, d, r, nossa, adv, 'ataque')).join('');
    const t1 = tab('O ataque deles contra a nossa defesa', 'Eles criam', 'Nós concedemos', ataqueDeles);
    const t2 = tab('O nosso ataque contra a defesa deles', 'Nós criamos', 'Eles concedem', nossoAtaque);
    if (t1 || t2) confronto = `<h3 class="pre-sub">Confronto direto das médias</h3><p class="nota">Médias por jogo e posição na liga (1.º = melhor ataque ou melhor defesa). Vantagem ou atenção quando a diferença de posições é de um terço da liga ou mais.</p><div class="pj-duas pre-confs">${t1}${t2}</div>`;
  }
  // 3. Como chega ao jogo: últimos 5 jogos vs o resto da época.
  const ls = liga.filter(l => l.equipa === adv).sort((a, b) => a.jornada - b.jornada);
  let forma = '';
  if (ls.length >= 8) {
    const ult = ls.slice(-5), ant = ls.slice(0, -5);
    const fr = ids.map(id => rk[id].d).filter(d => d.melhor).map(d => {
      const vu = media(ult.map(l => valorEq(d, l))), va = media(ant.map(l => valorEq(d, l))), sd = desvio(ls.map(l => valorEq(d, l)));
      if (!Number.isFinite(vu) || !Number.isFinite(va) || !sd) return null;
      return { d, vu, va, z: (vu - va) / sd * d.melhor };
    }).filter(x => x && Math.abs(x.z) >= LIMIAR_TENDENCIA).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    const sobe = fr.filter(x => x.z > 0).slice(0, 3), desce = fr.filter(x => x.z < 0).slice(0, 3);
    const frase = (x, t) => `<li class="${t}"><span class="pj-icone" aria-hidden="true">${t === 'bom' ? '▲' : '▼'}</span><span><b>${esc(x.d.nome)}</b>: ${fmtEq(x.d, x.vu)} nos últimos 5 jogos, contra ${fmtEq(x.d, x.va)} antes.</span></li>`;
    forma = `<h3 class="pre-sub">Como chega ao jogo</h3><p class="nota">Últimos 5 jogos (J${ult[0].jornada}–J${ult.at(-1).jornada}) comparados com as ${ant.length} jornadas anteriores. ▲ melhorou · ▼ piorou.</p>` +
      (sobe.length || desce.length ? `<ul class="pj-conclusoes">${sobe.map(x => frase(x, 'bom')).join('')}${desce.map(x => frase(x, 'mau')).join('')}</ul>` : '<p class="fraco">Sem mudanças claras em relação ao resto da época.</p>');
  }
  return `
    <h2>Visão geral</h2>
    <p class="nota">Médias por jogo no campeonato. Ponto forte = terço de cima da liga; ponto fraco = terço de baixo.</p>
    <div class="pj-duas">
      <div><h3 class="pj-bom">Pontos fortes</h3>${lista(fortes, 'Nenhuma métrica no terço de cima da liga.')}</div>
      <div><h3 class="pj-mau">Pontos fracos</h3>${lista(fracos, 'Nenhuma métrica no terço de baixo da liga.')}</div>
    </div>
    ${estilo.length ? `<p class="pre-estilo"><span>Estilo</span> ${estilo.join(' · ')}</p>` : ''}
    ${confronto}
    ${forma}`;
}
function desenharPreJogo() {
  const v = $('#vista'); App.pre ||= { adversario: null, x: 'xg', y: 'xg_sofrido' }; const P = App.pre;
  const prox = proximoJogo();
  const comps = competicoesLiga(); const comp = prox?.competicao && comps.includes(prox.competicao) ? prox.competicao : comps[0];
  const jornadas = comp ? App.d.liga.filter(r => norm(r.competicao) === norm(comp)).map(r => r.jornada) : [];
  const ate = jornadas.length ? Math.max(...jornadas) : null;
  const liga = comp ? linhasLiga(comp, ate) : [];
  const equipas = [...new Set([...liga.map(l => l.equipa), ...equipasCodificaveis(), ...equipasComEsquemas(), ...(App.d.estAdv || []).map(r => r.equipa)].filter(e => !eNossaEquipa(e)))]
    .filter((e, i, arr) => arr.findIndex(x => norm(x) === norm(e)) === i).sort((a, b) => a.localeCompare(b, 'pt'));
  if (!equipas.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Relatório pré-jogo</h1></div><div class="vazio"><p>Ainda não há dados de adversários.</p><p>Importe o ficheiro da liga e codifique jogos para começar.</p></div>`;
    return;
  }
  if (P.adversario && !equipas.includes(P.adversario)) P.adversario = equipas.find(e => mesmaEq(e, P.adversario)) || null;
  if (!P.adversario) P.adversario = (prox && equipas.find(e => mesmaEq(e, prox.adversario))) || equipas[0];
  const adv = P.adversario; const ehProximo = prox && mesmaEq(prox.adversario, adv);
  const sit = comp ? classificacaoAte(comp, ate) : []; const pos = sit.findIndex(x => norm(x.equipa) === norm(adv)); const s = sit[pos];
  // Oportunidades e esquemas táticos do adversário (por jogo codificado).
  const advOp = equipasCodificaveis().find(e => mesmaEq(e, adv)); let op = null;
  if (advOp) { const f = { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' }; const js = jogosDaEquipa(advOp, f); if (js.length) op = { j: js.length, c: oportunidadesDe(advOp, f, js).length / js.length, s: oportunidadesDe(advOp, { ...f, persp: 'sofridas' }, js).length / js.length }; }
  const advEP = equipasComEsquemas().find(e => mesmaEq(e, adv)); let ep = null;
  if (advEP) { const fa = esquemasDaEquipa(advEP, 'favor'), co = esquemasDaEquipa(advEP, 'contra'); const j = fa.jogos.length; if (j) ep = { j, f: fa.lista.length / j, gf: fa.lista.filter(x => eGolo(x.e)).length, gc: co.lista.filter(x => eGolo(x.e)).length, cg: fa.lista.length ? fa.lista.filter(x => contactoGanho(x.e)).length / fa.lista.length * 100 : null }; }
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>Relatório pré-jogo</h1><p class="nota">Primeira versão: o adversário no campeonato, nas oportunidades e nos esquemas táticos. A parte de observação (vídeo e texto) entra a seguir.</p></div>
      <div class="botoes-cab so-ecra">
        <button class="btn botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
        ${op ? `<button class="botao-editar" id="b-pdf-op" title="Editar a capa e as conclusões e exportar o relatório de oportunidades e golos (16:9)" aria-label="Editar e exportar o relatório de oportunidades e golos (16:9)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l3 3"/></svg></button>` : ''}
      </div>
    </div>
    <div class="filtros so-ecra"><label>Adversário<select id="pre-adv">${equipas.map(e => `<option ${e === adv ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label></div>
    <section class="pj-jogo">
      <p class="pj-meta">${ehProximo ? esc([prox.competicao, prox.jornada != null ? `Jornada ${prox.jornada}` : '', prox.data ? fmtData(prox.data) : '', prox.local === 'casa' ? 'Em casa' : prox.local === 'fora' ? 'Fora' : ''].filter(Boolean).join(' · ')) : 'Adversário'}</p>
      <div class="pj-placar"><span class="rk-eq pj-eq nossa">${simboloEquipa(adv)}${esc(adv)}</span></div>
      ${s ? `<p class="pj-extra">${pos + 1}.º com ${s.pts} pontos em ${s.j} jogos · ${s.v}V ${s.e}E ${s.d}D · golos ${s.gm}–${s.gs}</p>` : ''}
    </section>
    <section class="placar" aria-label="Resumo">
      ${s ? cel('Últimos 5', `<span class="visao-forma">${formaHTML(s.forma)}</span>`) : ''}
      ${op ? cel('Oportunidades por jogo', `${fmtNum(op.c, 1)}<i>–</i>${fmtNum(op.s, 1)}`, `criadas – sofridas (${op.j} jogos)`) : ''}
      ${ep ? cel('Esquemas táticos por jogo', fmtNum(ep.f, 1), `${fmtNum(ep.cg, 0)}% 1.º contacto ganho`) : ''}
      ${ep ? cel('Golos de esquema tático', `${ep.gf}<i>–</i>${ep.gc}`, 'marcados – sofridos') : ''}
    </section>
    <section class="bloco pj-secao ana-concl" id="pre-concl"></section>
    <div class="acoes-esq so-ecra pre-links">
      ${advOp ? '<button class="btn" id="pre-op">Ver oportunidades em detalhe</button>' : ''}
      ${advEP ? '<button class="btn" id="pre-ep">Ver esquemas táticos em detalhe</button>' : ''}
    </div>
    <section class="bloco pj-secao" id="pre-visao"></section>
    <section class="bloco pj-secao" id="pre-liga"></section>

    ${advOp ? `<section class="bloco pj-secao pre-cod" id="pre-oport">${htmlOportunidadesPre(advOp)}</section>` : ''}
    ${advEP ? `<section class="bloco pj-secao pre-cod" id="pre-esq">${htmlEsquemasPre(advEP)}</section>` : ''}`;
  const eqsLiga = [...new Set(liga.map(l => l.equipa))];
  if (!eqsLiga.some(e => mesmaEq(e, adv)) && estatAdv(adv).length) {
    // Adversário de fora da liga com a exportação do Wyscout: médias e últimos jogos, sem comparação com a liga.
    $('#pre-visao').remove();
    $('#pre-liga').innerHTML = htmlEstatAdvPre(adv);
  } else if (liga.length && !eqsLiga.some(e => mesmaEq(e, adv))) {
    // Adversário de outra competição (taça, outra divisão): sem dados da liga dele, a comparação com a nossa liga não diz nada.
    $('#pre-visao').remove();
    $('#pre-liga').innerHTML = `<h2>Dados estatísticos</h2><p class="fraco">${esc(adv)} não está no ficheiro da liga (${esc(comp)}), por isso não há médias nem posições para comparar. Para ter as médias por jogo, importe o Team stats do Wyscout na <a href="#observacao" id="pre-obs">Observação</a> (onde também estão a forma, o plantel e os últimos onzes).</p>`;
    $('#pre-obs').addEventListener('click', () => { App.pre.adversario = adv; });
  } else if (liga.length) {
    const eqs = eqsLiga;
    const hv = htmlVisaoPre(liga, eqs.find(e => mesmaEq(e, adv)), eqs.find(e => eNossaEquipa(e)), metricasDoRelatorio(metricasLigaDisponiveis(liga)));
    if (hv) $('#pre-visao').innerHTML = hv; else $('#pre-visao').remove();
    desenharBlocoLiga($('#pre-liga'), { titulo: 'No campeonato', competicao: comp, jornada: ate, liga, defs: metricasDoRelatorio(metricasLigaDisponiveis(liga)), estado: P,
      foco: eqs.find(e => mesmaEq(e, adv)), outro: eqs.find(e => eNossaEquipa(e)), rotuloOutro: 'nós' });
  } else { $('#pre-liga').remove(); $('#pre-visao').remove(); }
  // Conclusões (1.ª página): sugestões dos dados estatísticos e das oportunidades; o departamento escolhe e edita.
  { const C = candidatosConclusoesPre(adv, comp, liga, advOp, op); const el = $('#pre-concl');
    if (!C.wy.length && !C.cod.length && !ehDep() && !(estadoConclusoesPre(adv).extra || []).length) el.remove();
    else { el.innerHTML = htmlConclusoesPreEditor(adv, C); ligarConclusoesPre(adv, C); } }
  $('#pre-adv').addEventListener('change', e => { P.adversario = e.target.value; desenharPreJogo(); });
  $('#pre-op')?.addEventListener('click', () => { Object.assign(App.ana, { equipa: advOp, persp: 'criadas', adversario: 'todos' }); location.hash = 'oportunidades'; });
  $('#pre-ep')?.addEventListener('click', () => { App.anaEP = { ...(App.anaEP || {}), equipa: advEP, persp: 'favor', tipo: 'todos' }; location.hash = 'esquemas'; });
  $('#b-pdf').addEventListener('click', () => exportarPdf(`Relatório pré-jogo ${adv} ${hojeIso()}`));
  $('#b-pdf-op')?.addEventListener('click', () => dialogoExportarOportunidades(advOp, { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' }));
}
