// ---------- Ficha individual do jogador ----------
App.jog = { modo: 'plantel', nome: null, comparar: 'posicao', metrica: null, metricas: null };

function abrirFicha(nome) {
  App.jog.nome = nome; App.jog.modo = 'ficha'; App.jog.metrica = null; App.jog.perfil = null;
  if (location.hash === '#jogadores') mostrarVista('jogadores'); else location.hash = 'jogadores';
}

// Agrupa posições (abreviaturas portuguesas ou do Wyscout) em quatro sectores.
function sectorPosicao(pos) {
  const longo = { 'guarda-redes': 'Guarda-redes', 'defesa central': 'Defesa', 'lateral direito': 'Defesa', 'lateral esquerdo': 'Defesa', 'médio defensivo': 'Médio', 'médio centro': 'Médio', 'médio ofensivo': 'Médio', 'extremo direito': 'Avançado', 'extremo esquerdo': 'Avançado', 'ponta de lança': 'Avançado', 'segundo avançado': 'Avançado' }[String(pos || '').toLowerCase().trim()];
  if (longo) return longo;
  const p = String(pos || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!p) return null;
  if (/^(GR|GK|G)$/.test(p)) return 'Guarda-redes';
  if (/^(DC|DD|DE|LD|LE|CB|RCB|LCB|RB|LB|RWB|LWB|DL|DR|DEF)/.test(p)) return 'Defesa';
  if (/^(MDC|MC|MO|MD|ME|DMF|RDMF|LDMF|CMF|RCMF|LCMF|AMF|RAMF|LAMF|CM|DM|AM)/.test(p)) return 'Médio';
  if (/^(ED|EE|PL|AV|PL|CF|ST|SS|RW|LW|RWF|LWF|FW|EXT)/.test(p)) return 'Avançado';
  return null;
}

// Chave de estatísticas de um jogador do plantel (o nome como aparece no Wyscout).
function chaveEstat(pj) { return pj.nome_wyscout || pj.nome; }
function jogadorDoPlantel(chave) { return App.idx.plantelPorEstat?.[norm(chave)] || null; }
function nomeVisivel(chave) { return jogadorDoPlantel(chave)?.nome || chave; }

// Lista para o seletor: plantel primeiro (pelo número), depois quem só tem estatísticas.
function nomesDosJogadores() {
  const doPlantel = App.d.plantel.slice().sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome, 'pt')).map(chaveEstat);
  const vistos = new Set(doPlantel.map(norm));
  const soEstat = [...new Set(App.d.estJog.filter(r => r.lado === 'nos').map(r => r.jogador))].filter(n => !vistos.has(norm(n))).sort((a, b) => a.localeCompare(b, 'pt'));
  return [...doPlantel, ...soEstat];
}

function idade(dataNasc) {
  if (!dataNasc) return null;
  const [y, m, d] = dataNasc.split('-').map(Number); const h = new Date();
  return h.getFullYear() - y - ((h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) ? 1 : 0);
}
function metaJogador(pj) {
  return [pj.posicao, idade(pj.data_nascimento) !== null ? `${idade(pj.data_nascimento)} anos` : null, pj.altura ? `${pj.altura} cm` : null, pj.pe].filter(Boolean).join(' · ');
}
function avatarJogador(pj, classe = '') {
  const num = pj?.numero ?? null;
  if (pj?.foto) return `<span class="avatar ${classe}"><img src="${esc(pj.foto)}" alt="">${num !== null ? `<b class="avatar-num">${num}</b>` : ''}</span>`;
  const iniciais = String(pj?.nome || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return `<span class="avatar avatar-sem-foto ${classe}">${num !== null ? num : esc(iniciais)}</span>`;
}

function desenharFicha() {
  const v = $('#vista');
  const nomes = nomesDosJogadores();
  if (!nomes.length) { App.jog.modo = 'plantel'; desenharPlantel(); return; }
  const J = App.jog;
  if (!J.nome || !nomes.some(n => norm(n) === norm(J.nome))) {
    const { jogadores } = agregarJogadores(App.d.jogos);
    J.nome = jogadores.sort((a, b) => b.minutos - a.minutos)[0]?.nome || nomes[0];
  }
  J.nome = nomes.find(n => norm(n) === norm(J.nome)) || J.nome;
  const pj = jogadorDoPlantel(J.nome);
  const js = jogosDoRelatorio();
  const comps = [...new Set(App.d.jogos.map(j => j.competicao).filter(Boolean))].sort();
  const { jogadores, mets } = agregarJogadores(js);
  const p = jogadores.find(x => norm(x.nome) === norm(J.nome));
  const ids = new Set(js.map(j => j.id));
  const regs = App.d.estJog.filter(r => norm(r.jogador) === norm(J.nome) && r.lado === 'nos' && ids.has(r.jogo_id))
    .map(r => ({ ...r, jogo: App.idx.jogo[r.jogo_id] })).sort((a, b) => compararJogos(a.jogo, b.jogo));
  const sector = sectorPosicao(pj?.posicao) || (p ? sectorPosicao(p.posicao) : null);
  const meta = pj ? [metaJogador(pj), pj.nacionalidade].filter(Boolean).join(' · ') : (p ? [p.posicao, sector].filter(Boolean).join(' · ') : '');

  v.innerHTML = `
    ${cabecalhoImpressao()}
    <a class="voltar so-ecra" href="#jogadores" id="f-voltar">← Plantel</a>
    <div class="cabecalho-vista">
      <div class="ficha-titulo">
        ${avatarJogador(pj || { nome: nomeVisivel(J.nome) }, 'avatar-grande')}
        <div>
          <p class="ficha-tipo">Ficha individual</p>
          <h1>${esc(nomeVisivel(J.nome))}</h1>
          ${meta ? `<p class="ficha-meta">${esc(meta)}</p>` : ''}
          <p class="nota">${esc(descricaoFiltros(js))}${pj?.nome_wyscout && pj.nome_wyscout !== pj.nome ? ` · no Wyscout: ${esc(pj.nome_wyscout)}` : ''}${pj?.tm_url && /^https:\/\/([\w-]+\.)?transfermarkt\./.test(pj.tm_url) ? ` · <a class="so-ecra" href="${esc(pj.tm_url)}" target="_blank" rel="noopener">Ver no Transfermarkt</a>` : ''}</p>
        </div>
      </div>
      <div class="ficha-acoes so-ecra">
        <label>Jogador<select id="f-jogador">${nomes.map(n => `<option value="${esc(n)}" ${n === J.nome ? 'selected' : ''}>${esc(nomeVisivel(n))}</option>`).join('')}</select></label>
        ${ehDep() ? `<button class="btn" id="f-editar">${pj ? 'Editar dados' : 'Adicionar ao plantel'}</button>` : ''}
        ${pj?.tm_url && tmDisponivel() ? '<button class="btn" id="f-tm">Atualizar do Transfermarkt</button>' : ''}
        <button class="btn botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
      </div>
    </div>
    ${pj?.notas ? `<p class="ficha-notas">${esc(pj.notas)}</p>` : ''}
    ${htmlFiltros(comps)}
    ${p ? `
      <section class="placar" id="f-placar" aria-label="Resumo do jogador"></section>
      <section class="bloco" id="f-et"></section>
      <section class="bloco" id="f-perfil"></section>
      <section class="bloco" id="f-evolucao"></section>
      <section class="bloco" id="f-oportunidades"></section>
      <section class="bloco" id="f-jogos"></section>`
      : `<div class="vazio"><p>${esc(nomeVisivel(J.nome))} não tem estatísticas com estes filtros.</p>${pj && !pj.nome_wyscout ? '<p>Se já tem jogos importados, indique o nome usado no Wyscout em "Editar dados".</p>' : ''}</div>`}`;

  ligarFiltros(v, 'jogadores');
  $('#f-jogador').addEventListener('change', e => { J.nome = e.target.value; J.metrica = null; J.perfil = null; desenharFicha(); });
  $('#b-pdf').addEventListener('click', () => exportarPdf(`Ficha ${nomeVisivel(J.nome)} ${hojeIso()}`));
  $('#f-voltar').addEventListener('click', e => { e.preventDefault(); J.modo = 'plantel'; mostrarVista('jogadores'); });
  $('#f-tm')?.addEventListener('click', e => tmAtualizarJogador(pj, e.currentTarget));
  $('#f-editar')?.addEventListener('click', () => dialogoJogador(pj || { nome: J.nome, nome_wyscout: J.nome, posicao: posicaoLonga(p?.posicao) }));
  if (!p) return;

  const disponiveis = mets.filter(m => Number.isFinite(p.tot[m]) || p.minPond[m]);
  // Perfil de métricas: o escolhido na página, ou o da posição do jogador (central por defeito).
  const perfil = J.perfil || perfilDoJogador(J.nome, p) || 'central';
  desenharPlacarJogador(p, js, regs, perfil);
  desenharAntesDepoisJogador(J.nome, perfil);
  desenharPerfil(p, jogadores, perfil);
  desenharEvolucao(regs, disponiveis, perfil);
  desenharOportunidadesJogador(js);
  desenharJogoAJogo(regs, perfil);
}

function desenharPlacarJogador(p, js, regs, perfil) {
  const possiveis = js.length * 90;
  const titular = regs.filter(r => Number(r.minutos) >= 60).length;
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  const tot = c => valorSinonimo(p.tot, c);
  const p90 = c => (tot(c) !== null && p.minutos > 0 ? tot(c) / p.minutos * 90 : null);
  const g = tot('golos'), a = tot('assistencias');
  if (perfil === 'gr') {
    const v = id => valorMetrica(p, id), tj = id => regs.reduce((acc, r) => acc + (valorMetricaJogo(r.metricas || {}, id) ?? 0), 0);
    const semSofrer = regs.filter(r => (valorMetricaJogo(r.metricas || {}, 'gr_sofridos') ?? 1) === 0 && Number(r.minutos) >= 60).length;
    $('#f-placar').innerHTML = [
      cel('Jogos', p.jogos, `${regs.filter(r => Number(r.minutos) >= 60).length} com 60+ minutos`),
      cel('Minutos', fmtNum(p.minutos, 0), possiveis ? `${fmtNum(p.minutos / possiveis * 100, 0)}% dos possíveis` : ''),
      v('gr_sofridos') !== null ? cel('Golos sofridos', fmtNum(tj('gr_sofridos'), 0), `${fmtNum(v('gr_sofridos'), 2)} por 90 min`) : '',
      v('gr_defesas_pct') !== null ? cel('Defesas', `${fmtNum(v('gr_defesas_pct'), 0)}%`, `${fmtNum(tj('gr_defesas'), 0)} de ${fmtNum(tj('gr_remates'), 0)} remates`) : '',
      v('gr_evitados') !== null ? cel('Golos evitados', fmtSinal(tj('gr_evitados'), 1), 'xG contra − golos sofridos') : '',
      cel('Sem sofrer', semSofrer, 'jogos com 60+ minutos')
    ].join('');
    return;
  }
  $('#f-placar').innerHTML = [
    cel('Jogos', p.jogos, `${titular} com 60+ minutos`),
    cel('Minutos', fmtNum(p.minutos, 0), possiveis ? `${fmtNum(p.minutos / possiveis * 100, 0)}% dos possíveis` : ''),
    g !== null ? cel('Golos', fmtNum(g, 0), `${fmtNum(p90('golos'), 2)} por 90 min`) : '',
    a !== null ? cel('Assistências', fmtNum(a, 0), `${fmtNum(p90('assistencias'), 2)} por 90 min`) : '',
    tot('xg') !== null ? cel('xG', fmtNum(tot('xg'), 2), `${fmtNum(p90('xg'), 2)} por 90 min`) : '',
    tot('xa') !== null ? cel('xA', fmtNum(tot('xa'), 2), `${fmtNum(p90('xa'), 2)} por 90 min`) : ''
  ].join('');
}

// Antes e desde a nova equipa técnica: utilização e métricas do perfil, por 90 minutos.
function desenharAntesDepoisJogador(nome, perfil) {
  const el = $('#f-et'); if (!el) return;
  const base = jogosBaseRelatorio(); const m = marcoET();
  const A = m ? base.filter(antesDoMarco) : [], D = m ? base.filter(j => !antesDoMarco(j)) : [];
  const de = js => agregarJogadores(js).jogadores.find(x => norm(x.nome) === norm(nome)) || null;
  const pA = A.length ? de(A) : null, pD = D.length ? de(D) : null, pT = de([...A, ...D]); const T = [...A, ...D];
  if (!A.length || !D.length || (!pA && !pD)) { el.remove(); return; }
  const regs = js => { const ids = new Set(js.map(j => j.id)); return App.d.estJog.filter(r => r.lado === 'nos' && ids.has(r.jogo_id) && norm(r.jogador) === norm(nome)); };
  const tit = js => regs(js).filter(r => Number(r.minutos) >= 60).length;
  const P = PERFIS[perfil] || PERFIS.central;
  const L = [
    { sep: 'Utilização' },
    { rot: 'Jogos', t: pT?.jogos ?? 0, a: pA?.jogos ?? 0, d: pD?.jogos ?? 0, casas: 0, melhor: 0, semDif: true },
    { rot: 'Minutos por jogo da equipa', t: (pT?.minutos ?? 0) / T.length, a: (pA?.minutos ?? 0) / A.length, d: (pD?.minutos ?? 0) / D.length, casas: 0, melhor: 0 },
    { rot: 'Jogos com 60+ minutos (%)', t: tit(T) / T.length * 100, a: tit(A) / A.length * 100, d: tit(D) / D.length * 100, casas: 0, sufixo: '%', melhor: 0 },
    ...BLOCOS.flatMap(b => { const ids = (P[b] || []).filter(id => METRICAS[id]); if (!ids.length) return [];
      return [{ sep: `${b} (por 90 min)` }, ...ids.map(id => { const d = METRICAS[id]; return { rot: d.r, t: pT ? valorMetrica(pT, id) : null, a: pA ? valorMetrica(pA, id) : null, d: pD ? valorMetrica(pD, id) : null, melhor: d.estilo ? 0 : d.menos ? -1 : 1, casas: d.d ? 0 : 2, sufixo: d.d ? '%' : '' }; })]; })
  ];
  el.innerHTML = htmlAntesDepois('Total e por equipa técnica', `Perfil: ${esc(P.nome)}. A nova equipa técnica começou a ${fmtData(m)}; este quadro ignora o filtro de período. Com poucos minutos num dos períodos, os valores por 90 minutos oscilam muito.`, L, A.length, D.length);
}

function desenharPerfil(p, jogadores, perfil) {
  const J = App.jog; const el = $('#f-perfil'); const P = PERFIS[perfil];
  const maxMin = Math.max(...jogadores.map(x => x.minutos));
  const minimo = Math.min(270, Math.round(maxMin * 0.25));
  const base = jogadores.filter(x => x.minutos >= minimo || x.nome === p.nome);
  // Grupo de comparação: mesmo perfil; se forem menos de 3, o mesmo setor (ex.: todos os defesas); senão, o plantel.
  const SETOR = { gr: 'gr', central: 'def', lateral: 'def', medio: 'med', ofensivo: 'ata', pl: 'ata' };
  const mesmoPerfil = base.filter(x => x.nome === p.nome || perfilDoJogador(x.nome, x) === perfil);
  const mesmoSetor = base.filter(x => x.nome === p.nome || SETOR[perfilDoJogador(x.nome, x)] === SETOR[perfil]);
  const opcaoPosicao = mesmoPerfil.length >= 3 ? 'perfil' : mesmoSetor.length >= 3 ? 'setor' : null;
  const porPerfil = J.comparar !== 'plantel' && !!opcaoPosicao;
  const grupo = !porPerfil ? base : opcaoPosicao === 'perfil' ? mesmoPerfil : mesmoSetor;
  const nomeSetor = { gr: 'guarda-redes', def: 'defesas', med: 'médios', ata: 'avançados e extremos' }[SETOR[perfil]];

  const linha = id => {
    const def = METRICAS[id];
    const meu = valorMetrica(p, id); if (meu === null) return null;
    const lista = grupo.map(x => valorMetrica(x, id)).filter(v => v !== null);
    if (lista.length < 2) return { id, def, meu, so: true };
    const mn = Math.min(...lista), mx = Math.max(...lista), md = media(lista);
    const pos = 1 + lista.filter(x => (def.menos ? x < meu - 1e-9 : x > meu + 1e-9)).length;
    const esc01 = x => mx === mn ? 50 : (x - mn) / (mx - mn) * 100;
    return { id, def, meu, mn, mx, md, pos, n: lista.length, pMeu: esc01(meu), pMd: esc01(md) };
  };
  const casas = id => (ePct(id) ? 1 : 2);
  const fmt = (id, v) => `${fmtNum(v, casas(id))}${ePct(id) ? '%' : ''}`;
  const blocos = BLOCOS.map(b => ({ b, linhas: P[b].map(linha).filter(Boolean) })).filter(x => x.linhas.length);
  const temComparacao = blocos.some(x => x.linhas.some(l => !l.so));
  el.innerHTML = `
    <div class="bloco-cab"><h2>Perfil: ${esc(P.nome)}</h2>
      <div class="perfil-controlos so-ecra">
        <label class="em-linha">Métricas de<select id="f-perfil-sel">${Object.entries(PERFIS).map(([k, v]) => `<option value="${k}" ${k === perfil ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select></label>
        <div class="alternar" role="radiogroup" aria-label="Comparar com">
          <label class="chip"><input type="radio" name="comparar" value="posicao" ${porPerfil ? 'checked' : ''} ${opcaoPosicao ? '' : 'disabled'}><span>${opcaoPosicao === 'setor' ? 'Mesmo setor' : 'Mesma posição'}</span></label>
          <label class="chip"><input type="radio" name="comparar" value="plantel" ${porPerfil ? '' : 'checked'}><span>Todo o plantel</span></label>
        </div>
      </div>
    </div>
    <p class="nota">Por 90 minutos; as percentagens são calculadas sobre os totais. Comparação com ${!porPerfil ? 'todo o plantel' : opcaoPosicao === 'perfil' ? `os jogadores com o perfil ${esc(P.nome.toLowerCase())}` : `os ${nomeSetor} (há poucos jogadores com o perfil ${esc(P.nome.toLowerCase())})`} com pelo menos ${minimo} minutos neste período (${grupo.length} ${grupo.length === 1 ? 'jogador' : 'jogadores'}). No ranking, 1.º é o melhor valor do grupo; nas métricas marcadas com "menos é melhor", o valor mais baixo.</p>
    ${blocos.length ? blocos.map(({ b, linhas }) => `
      <h3 class="perfil-bloco">${b}</h3>
      <div class="perfil">
        <div class="perfil-cab" aria-hidden="true"><span>Métrica</span><span class="num">${esc(nomeVisivel(p.nome).split(' ')[0])}</span><span>Do mínimo ao máximo do grupo</span><span class="num">Ranking</span></div>
        ${linhas.map(l => `<div class="perfil-linha">
          <span class="perfil-met">${esc(l.def.r)}${l.def.menos ? ' <small class="menos">menos é melhor</small>' : ''}${l.def.estilo ? ' <small class="menos">estilo, sem ranking</small>' : ''}</span>
          <span class="num perfil-val">${fmt(l.id, l.meu)}</span>
          ${l.so ? '<span class="faixa fraco">Sem dados de outros jogadores</span><span class="num perfil-pos">–</span>' : `
          <span class="faixa" role="img" aria-label="${esc(l.def.r)}: ${fmt(l.id, l.meu)}; média do grupo ${fmt(l.id, l.md)}; entre ${fmt(l.id, l.mn)} e ${fmt(l.id, l.mx)}">
            <span class="faixa-min">${fmtNum(l.mn, casas(l.id))}</span>
            <span class="faixa-pista"><i class="faixa-media" style="left:${l.pMd}%" title="Média do grupo: ${fmt(l.id, l.md)}"></i><i class="faixa-ponto" style="left:${l.pMeu}%"></i></span>
            <span class="faixa-max">${fmtNum(l.mx, casas(l.id))}</span>
          </span>
          <span class="num perfil-pos">${l.def.estilo ? '–' : `<b>${l.pos}.º</b> de ${l.n}`}</span>`}
        </div>`).join('')}
      </div>`).join('') : '<p class="fraco">As métricas deste perfil não existem nos dados importados. Escolha outro perfil acima.</p>'}
    ${temComparacao ? `<div class="legenda-campo"><span><i class="leg-ponto"></i>${esc(nomeVisivel(p.nome))}</span><span><i class="leg-media"></i>Média do grupo</span></div>` : ''}`;
  $$('input[name=comparar]', el).forEach(r => r.addEventListener('change', () => { J.comparar = r.value; desenharPerfil(p, jogadores, perfil); }));
  $('#f-perfil-sel', el).addEventListener('change', e => { J.perfil = e.target.value; J.metrica = null; desenharFicha(); });
}

function desenharEvolucao(regs, disponiveis, perfil) {
  const J = App.jog; const el = $('#f-evolucao'); const P = PERFIS[perfil];
  // Opções: as métricas do perfil (com dados), agrupadas por bloco; depois todas as métricas importadas.
  const comDados = id => regs.some(r => valorMetricaJogo(r.metricas || {}, id) !== null);
  const grupos = BLOCOS.map(b => [b, P[b].filter(comDados)]).filter(([, ids]) => ids.length);
  const valido = v => (v?.startsWith('m:') ? comDados(v.slice(2)) : disponiveis.includes(v?.slice(2)));
  const principal = grupos.find(([b]) => b === BLOCO_PRINCIPAL[perfil]) || grupos[0];
  const preferida = METRICA_PRINCIPAL[perfil] && comDados(METRICA_PRINCIPAL[perfil]) ? METRICA_PRINCIPAL[perfil] : null;
  if (!J.metrica || !valido(J.metrica)) J.metrica = preferida ? `m:${preferida}` : principal ? `m:${principal[1][0]}` : `r:${disponiveis[0]}`;
  const eDef = J.metrica.startsWith('m:'); const id = J.metrica.slice(2);
  const rotulo = eDef ? METRICAS[id].r : id;
  const vals = regs.map(r => { const v = eDef ? valorMetricaJogo(r.metricas || {}, id) : r.metricas?.[id]; return Number.isFinite(v) ? v : null; });
  const ult = media(vals.slice(-5)), tot = media(vals);
  const fv = v => (eDef && ePct(id) ? `${fmtNum(v, 0)}%` : fmtNum(v, 2));
  App.graficos = App.graficos.filter(g => { if (g.canvas.closest('#f-evolucao')) { g.destroy(); return false; } return true; });
  el.innerHTML = `
    <div class="bloco-cab"><h2>Evolução: ${esc(rotulo)}</h2>
      <label class="em-linha so-ecra">Métrica<select id="f-met">
        ${grupos.map(([b, ids]) => `<optgroup label="${b}">${ids.map(m => `<option value="m:${m}" ${J.metrica === `m:${m}` ? 'selected' : ''}>${esc(METRICAS[m].r)}</option>`).join('')}</optgroup>`).join('')}
        <optgroup label="Todas as métricas importadas">${disponiveis.map(m => `<option value="r:${esc(m)}" ${J.metrica === `r:${m}` ? 'selected' : ''}>${esc(m)}</option>`).join('')}</optgroup>
      </select></label>
    </div>
    <p class="destaque">Média por jogo nos últimos ${Math.min(5, vals.filter(Number.isFinite).length)} jogos: <b>${fv(ult)}</b>, contra <b>${fv(tot)}</b> no período.</p>
    <div class="grafico"><canvas aria-label="${esc(rotulo)} por jogo"></canvas></div>
    <h3>Minutos por jogo</h3>
    <div class="grafico baixo"><canvas aria-label="Minutos por jogo"></canvas></div>`;
  $('#f-met', el).addEventListener('change', e => { J.metrica = e.target.value; desenharEvolucao(regs, disponiveis, perfil); });
  const labels = regs.map(r => rotuloJogo(r.jogo, true));
  const [c1, c2] = $$('canvas', el);
  const opBarras = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: OPCOES_LINHA.plugins.tooltip } };
  novoGrafico(c1, { type: 'bar', data: { labels, datasets: [{ label: rotulo, data: vals, backgroundColor: COR.nos, borderRadius: 4, maxBarThickness: 30 }] }, options: { ...opBarras, scales: eixos() } });
  novoGrafico(c2, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Minutos', data: regs.map(r => r.minutos), backgroundColor: '#9AA6B8', borderRadius: 3, maxBarThickness: 30 }] },
    options: { ...opBarras, scales: { ...eixos(), y: { ...eixos().y, max: Math.max(90, ...regs.map(r => Number(r.minutos) || 0)), ticks: { stepSize: 45 } } } }
  });
}

function desenharOportunidadesJogador(js) {
  const nome = App.jog.nome; const el = $('#f-oportunidades');
  const ids = new Set(js.map(j => j.id));
  const pj = jogadorDoPlantel(nome);
  const aceites = new Set([nome, pj?.nome, pj?.nome_wyscout].filter(Boolean).map(norm));
  const e1 = x => aceites.has(norm(x));
  // Eventos dos nossos jogos: registados no jogo (lado 'nos') ou na codificação da liga (partida ligada ao jogo, equipa nossa).
  const evs = App.d.eventos.filter(e => {
    if (e.jogo_id && ids.has(e.jogo_id)) return e.lado === 'nos' || (e.equipa && eNossaEquipa(e.equipa));
    const a = e.partida_id ? alvoDoEvento(e) : null;
    return !!(a?.jogo && ids.has(a.jogo.id) && eNossaEquipa(equipaDoEvento(e)));
  });
  const fin = evs.filter(e => e.tipo === 'oportunidade' && e1(e.jogador));
  const ass = evs.filter(e => e.tipo === 'oportunidade' && e1(e.assistente));
  const et = evs.filter(e => e.tipo === 'esquema_tatico' && e1(e.jogador));
  if (!fin.length && !ass.length && !et.length) {
    el.innerHTML = `<h2>Oportunidades codificadas</h2><p class="fraco">Sem oportunidades codificadas com ${esc(nomeVisivel(nome))} como finalizador ou assistente neste período.</p>`;
    return;
  }
  const golos = fin.filter(e => e.resultado === 'Golo').length;
  const grandes = fin.filter(e => e.qualidade === 'Grande oportunidade');
  const contarO = (lista, campo) => Object.entries(lista.reduce((a, e) => { const k = dadosOportunidade(e)[campo] || 'Sem indicação'; a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  el.innerHTML = `
    <h2>Oportunidades codificadas</h2>
    <p class="destaque">Finalizou <b>${fin.length}</b> ${fin.length === 1 ? 'oportunidade' : 'oportunidades'} e marcou <b>${golos}</b>${fin.length ? ` (${fmtNum(golos / fin.length * 100, 0)}%)` : ''}. Em grandes oportunidades: ${grandes.filter(e => e.resultado === 'Golo').length} de ${grandes.length}. Assistiu para ${ass.length} ${ass.length === 1 ? 'oportunidade' : 'oportunidades'}${et.length ? `; participou em ${et.length} ${et.length === 1 ? 'esquema tático' : 'esquemas táticos'}` : ''}.</p>
    <div class="dois-campos">
      <figure><figcaption><span class="ponto-cor nos"></span>Onde finalizou</figcaption>${campoSVG({ eventos: fin, metade: true })}${legendaCampo()}</figure>
      <div>
        <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Mecanismo</th><th class="num">Oport.</th></tr></thead>
          <tbody>${contarO(fin, 'mecanismo').map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join('') || '<tr><td colspan="2" class="fraco">–</td></tr>'}</tbody></table></div>
        <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Momento</th><th class="num">Oport.</th></tr></thead>
          <tbody>${contarO(fin, 'momento').map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join('') || '<tr><td colspan="2" class="fraco">–</td></tr>'}</tbody></table></div>
      </div>
    </div>
    <p class="nota">Conta os eventos em que o nome do jogador foi registado como no plantel ou como no Wyscout.</p>`;
}

function desenharJogoAJogo(regs, perfil) {
  const el = $('#f-jogos'); if (!el) return;
  const P = PERFIS[perfil];
  // As duas primeiras métricas com dados de cada bloco do perfil.
  const cols = BLOCOS.flatMap(b => P[b].filter(id => regs.some(r => valorMetricaJogo(r.metricas || {}, id) !== null)).slice(0, 2));
  el.innerHTML = `
    <h2>Jogo a jogo</h2>
    <div class="tabela-env"><table class="tabela compacta">
      <thead><tr><th>Jogo</th><th>Adversário</th><th class="num">Res.</th><th>Pos.</th><th class="num">Min.</th>${cols.map(id => `<th class="num">${esc(METRICAS[id].r)}</th>`).join('')}</tr></thead>
      <tbody>${regs.slice().reverse().map(r => {
        const res = resultadoJogo(r.jogo);
        return `<tr><td>${quandoJogo(r.jogo)}</td><td>${esc(r.jogo.adversario)} ${r.jogo.local === 'casa' ? '(C)' : r.jogo.local === 'fora' ? '(F)' : ''}</td>
          <td class="num">${res ? `<span class="res res-${res}">${res}</span>${r.jogo.golos_marcados}–${r.jogo.golos_sofridos}` : '–'}</td>
          <td>${esc(r.posicao || '–')}</td><td class="num">${fmtNum(r.minutos, 0)}</td>
          ${cols.map(id => { const v = valorMetricaJogo(r.metricas || {}, id); return `<td class="num">${v === null ? '–' : `${fmtNum(v, ePct(id) ? 0 : 2)}${ePct(id) ? '%' : ''}`}</td>`; }).join('')}</tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="nota">Valores de cada jogo (totais, não por 90 minutos): as duas primeiras métricas de ataque, defesa e posse do perfil.</p>`;
}
