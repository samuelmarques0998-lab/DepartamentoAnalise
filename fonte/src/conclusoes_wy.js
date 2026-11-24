// ---------- Conclusões a partir dos dados estatísticos (Wyscout) ----------
// Adversário da liga: o que o distingue das outras equipas (média por jogo, posição e desvio em relação à liga).
// Adversário de fora da liga: o que muda dentro da própria equipa (últimos 5, casa/fora, Europa/campeonato).

// Métricas parecidas contam como um só tema (fica a mais saliente).
const GRUPO_EQ = { xg: 'fin', remates: 'fin', remates_alvo_pct: 'fin2', toques_area: 'area', entradas_area: 'area', entradas_conducao: 'area2', entradas_cruz: 'area3',
  xg_sofrido: 'fin_s', remates_sofridos: 'fin_s', remates_sofridos_alvo: 'fin_s2', toques_area_sof: 'area_s', entradas_area_sof: 'area_s',
  posse: 'posse', passes_pct: 'passe', passes_posse: 'posse2', passe_longo_pct: 'longo' };
const ladoDaArea = d => (d.area === 'Defesa' ? 'defesa' : 'ataque');
const mediaDe = v => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);
const desvioDe = v => { if (v.length < 2) return null; const m = mediaDe(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
function leituraEq(d, alto) {
  if (!d.melhor) return 'Traço de estilo.';
  return (alto === (d.melhor > 0)) ? 'Ponto forte.' : 'Ponto fraco.';
}
// Todas as candidatas (por ordem de saliência, sem repetir a métrica), com as sugeridas marcadas.
function marcarSugeridas(cands, max, total) {
  const sug = new Set(escolherConclusoes(cands.filter(c => c.forte), max, total));
  const vistos = new Set(); const out = [];
  // No máximo 7 por contexto (Europa, casa/fora, últimos 5…), para a lista não ficar só com um tema.
  const porCtx = {};
  for (const c of [...cands].sort((a, b) => (sug.has(b) - sug.has(a)) || b.s - a.s)) {
    const ctx = c.id.split(':').length > 2 ? c.id.split(':')[1] : 'liga';
    if (vistos.has(c.id) || (!sug.has(c) && (porCtx[ctx] || 0) >= 7)) continue;
    vistos.add(c.id); porCtx[ctx] = (porCtx[ctx] || 0) + 1; out.push({ ...c, sugerida: sug.has(c) });
  }
  return out.slice(0, 16);
}
// Escolhe as mais salientes: uma por tema, no máximo 4 de cada lado.
function escolherConclusoes(cands, max = 3, total = 5) {
  const out = [], grupos = new Set(), porLado = { ataque: 0, defesa: 0 };
  for (const c of cands.sort((a, b) => b.s - a.s)) {
    const g = GRUPO_EQ[c.d.id] || c.d.id;
    if (out.length >= total || grupos.has(g) || porLado[c.lado] >= max) continue;
    grupos.add(g); porLado[c.lado]++; out.push(c);
  }
  return out;
}

function conclusoesWyLiga(adv, comp, liga, todas = false) {
  const porEq = {};
  for (const L of liga) (porEq[L.equipa] ||= []).push(L);
  const eqs = Object.keys(porEq).filter(e => porEq[e].length >= 3);
  const nome = eqs.find(e => mesmaEq(e, adv)); if (!nome) return [];
  const cands = [];
  for (const d of METRICAS_EQ) {
    if (d.ops) continue;
    const medias = eqs.map(e => ({ e, m: mediaDe(porEq[e].map(L => valorEq(d, L)).filter(Number.isFinite)) })).filter(x => x.m !== null);
    if (medias.length < 6) continue;
    const eu = medias.find(x => x.e === nome); if (!eu) continue;
    const vals = medias.map(x => x.m); const mu = mediaDe(vals), sd = desvioDe(vals); if (!sd) continue;
    const z = (eu.m - mu) / sd;
    const ordem = [...medias].sort((a, b) => b.m - a.m); const pos = ordem.findIndex(x => x.e === nome) + 1;
    const alto = z > 0; const rank = alto ? pos : medias.length - pos + 1;
    const forte = Math.abs(z) >= 1.1 && rank <= 3;
    if (!forte && (!todas || Math.abs(z) < 0.75 || rank > 5)) continue;
    const posTxt = rank === 1 ? `o valor ${alto ? 'mais alto' : 'mais baixo'} da liga` : `${rank}.º ${alto ? 'mais alto' : 'mais baixo'} da liga`;
    cands.push({ d, forte, id: `wy:${d.id}`, lado: ladoDaArea(d), s: Math.abs(z) + (rank === 1 ? 0.3 : 0),
      t: `${d.nome}: ${fmtEq(d, eu.m)}${d.pct || d.id === 'ppda' || d.id === 'intensidade' || d.id === 'passes_posse' ? '' : ' por jogo'}, ${posTxt}`,
      det: `Média da liga ${fmtEq(d, mu)} (${medias.length} equipas). ${leituraEq(d, alto)}${d.id === 'ppda' ? ' Quanto mais baixo, mais alta a pressão.' : ''}` });
  }
  return todas ? marcarSugeridas(cands, 3, 5) : escolherConclusoes(cands);
}

// Diferença entre dois grupos de jogos da mesma equipa: só conta se for grande face à variação jogo a jogo.
function compararGrupos(d, A, B, todos, zMin = 2) {
  const va = A.map(L => valorEq(d, L)).filter(Number.isFinite), vb = B.map(L => valorEq(d, L)).filter(Number.isFinite);
  if (va.length < 3 || vb.length < 3) return null;
  const sd = desvioDe(todos.map(L => valorEq(d, L)).filter(Number.isFinite)); if (!sd) return null;
  const ma = mediaDe(va), mb = mediaDe(vb); const z = (ma - mb) / (sd * Math.sqrt(1 / va.length + 1 / vb.length));
  const rel = Math.abs(ma - mb) / (Math.abs(mb) || 1);
  if (Math.abs(z) < zMin || (!d.pct && rel < 0.12) || (d.pct && Math.abs(ma - mb) < 3)) return null;
  return { ma, mb, z, forte: Math.abs(z) >= 2 && (d.pct ? Math.abs(ma - mb) >= 4 : rel >= 0.15) };
}
function conclusoesWyEquipa(adv, todas = false) {
  const rs = estatAdv(adv); if (rs.length < 6) return [];
  const L = r => ({ m: r.metricas || {}, a: r.metricas_adv || {} });
  const todos = rs.map(L);
  const ult = rs.slice(-5), antes = rs.slice(0, -5);
  const casa = rs.filter(r => r.local === 'casa'), fora = rs.filter(r => r.local === 'fora');
  const comps = {}; for (const r of rs) (comps[nomeCompCurto(r.competicao)] ||= []).push(r);
  // Europa: cada competição europeia em separado; conta a Liga Europa (ou, sem ela, a europeia com mais jogos).
  const nomesEur = Object.keys(comps).filter(c => /liga europa|liga dos campe|confer/i.test(c));
  const europa = nomesEur.includes('Liga Europa') ? 'Liga Europa' : nomesEur.sort((a, b) => comps[b].length - comps[a].length)[0] || null;
  const jogosEur = europa ? comps[europa] : [];
  const domestica = Object.keys(comps).filter(c => !nomesEur.includes(c) && !/ta[cç]a|cup/i.test(c)).sort((a, b) => comps[b].length - comps[a].length)[0];
  const cands = [];
  for (const d of METRICAS_EQ) {
    if (d.ops) continue;
    const tenta = (A, B, fn, ctx) => { const r = compararGrupos(d, A.map(L), B.map(L), todos, todas ? 1.5 : 2); if (r && (todas || r.forte)) cands.push({ d, id: `wy:${ctx}:${d.id}`, forte: r.forte, lado: ladoDaArea(d), s: Math.abs(r.z), ...fn(r) }); };
    if (antes.length >= 4) tenta(ult, antes, r => ({ t: `${d.nome} nos últimos 5 jogos: ${fmtEq(d, r.ma)}, contra ${fmtEq(d, r.mb)} antes`,
      det: `${r.ma > r.mb ? 'Subiu' : 'Desceu'} na fase mais recente. ${d.melhor ? ((r.ma > r.mb) === (d.melhor > 0) ? 'Está melhor.' : 'Está pior.') : 'Mudança de estilo.'}` }), 'ult');
    tenta(casa, fora, r => ({ t: `${d.nome}: ${fmtEq(d, r.ma)} em casa e ${fmtEq(d, r.mb)} fora`,
      det: `Diferença grande entre casa (${casa.length} jogos) e fora (${fora.length} jogos).` }), 'local');
    if (europa && domestica) tenta(comps[europa], comps[domestica], r => ({ t: `${d.nome} na ${europa}: ${fmtEq(d, r.ma)}, contra ${fmtEq(d, r.mb)} na ${domestica}`,
      det: `Na ${europa} (${jogosEur.length} jogos) é uma equipa diferente do campeonato (${comps[domestica].length} jogos).` }), `comp-${norm(europa).replace(/ /g, '-')}`);
  }
  return todas ? marcarSugeridas(cands, 3, 4) : escolherConclusoes(cands, 3, 4);
}

function htmlConclusoesWy(lista, contexto) {
  if (!lista.length) return '';
  return `<h3 class="concl-sub">Dados estatísticos <span class="nota">(Wyscout · ${esc(contexto)})</span></h3>
    <ol>${lista.map(c => `<li class="${c.lado}"><span class="ana-concl-tag">${esc(c.d.area)}</span><b>${esc(c.t)}</b><span>${esc(c.det)}</span></li>`).join('')}</ol>`;
}

// ---------- Conclusões do relatório pré-jogo: sugestões + escolha e edição pelo departamento ----------
function candidatosConclusoesPre(adv, comp, liga, advOp, op) {
  const naLiga = liga.some(l => mesmaEq(l.equipa, adv));
  const wy = (naLiga ? conclusoesWyLiga(adv, comp, liga, true) : conclusoesWyEquipa(adv, true))
    .map(c => ({ id: c.id, fonte: 'Wyscout', area: c.d.area, lado: c.lado, t: c.t, d: c.det, sugerida: c.sugerida }));
  let cod = [];
  if (op && advOp) {
    const f = { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' };
    const js = jogosDaEquipa(advOp, f);
    if (js.length) cod = conclusoesOportunidades(advOp, oportunidadesDe(advOp, f, js), oportunidadesDe(advOp, { ...f, persp: 'sofridas' }, js), js.length, f)
      .map(([t, d, lado], i) => ({ id: `op:${norm(t).slice(0, 60) || i}`, fonte: 'Oportunidades', area: lado === 'defesa' ? 'Defesa' : 'Ataque', lado: lado === 'defesa' ? 'defesa' : 'ataque', t, d, sugerida: true }));
  }
  return { wy, cod, contexto: naLiga ? `comparação com as equipas da ${comp}` : 'últimos jogos, casa e fora e Europa/campeonato da própria equipa' };
}
function estadoConclusoesPre(adv) { return (App.cfg.conclusoes_pre || {})[norm(adv)] || { itens: {}, extra: [] }; }
function itensConclusoesPre(adv, C) {
  const E = estadoConclusoesPre(adv);
  const comEstado = c => { const e = E.itens?.[c.id]; return { ...c, t0: c.t, d0: c.d, on: e ? !!e.on : c.sugerida, t: e?.t ?? c.t, d: e?.d ?? c.d, lado: e?.lado ?? c.lado }; };
  return { wy: C.wy.map(comEstado), cod: C.cod.map(comEstado), extra: (E.extra || []).map(x => ({ ...x, fonte: 'Departamento', area: x.lado === 'defesa' ? 'Defesa' : 'Ataque' })) };
}
const tagConcl = c => (c.fonte === 'Wyscout' ? c.area : c.lado === 'defesa' ? 'Defesa' : 'Ataque');
function htmlListaConclusoesPre(adv, C) {
  const I = itensConclusoesPre(adv, C);
  const escolhidas = [...I.wy, ...I.cod, ...I.extra].filter(c => c.on && c.t);
  return escolhidas.length ? `<ol>${escolhidas.map(c => `<li class="${c.lado}${tagConcl(c) === 'Posse' ? ' posse' : ''}"><span class="ana-concl-tag">${esc(tagConcl(c))}</span><b>${esc(c.t)}</b>${c.d ? `<span>${esc(c.d)}</span>` : ''}</li>`).join('')}</ol>` : '<p class="fraco">Sem conclusões escolhidas.</p>';
}
function htmlConclusoesPreEditor(adv, C) {
  const I = itensConclusoesPre(adv, C);
  const ed = ehDep();
  const linha = (c, extra = false) => `<div class="cpe-item${c.on ? ' on' : ''}" data-cid="${esc(c.id)}"${extra ? ' data-extra="1"' : ` data-t0="${esc(c.t0)}" data-d0="${esc(c.d0)}"`}>
      <input type="checkbox" class="cpe-on" ${c.on ? 'checked' : ''} aria-label="Incluir no relatório">
      <select class="cpe-lado" aria-label="Ataque ou defesa"><option value="ataque" ${c.lado !== 'defesa' ? 'selected' : ''}>${c.fonte === 'Wyscout' && c.area === 'Posse' ? 'Posse' : 'Ataque'}</option><option value="defesa" ${c.lado === 'defesa' ? 'selected' : ''}>Defesa</option></select>
      <div class="cpe-txt"><input type="text" class="cpe-t" value="${esc(c.t)}" aria-label="Conclusão"><textarea class="cpe-d" rows="2" aria-label="Detalhe">${esc(c.d)}</textarea></div>
      ${extra ? '<button type="button" class="btn-link perigo cpe-tirar">Tirar</button>' : `<span class="cpe-fonte">${c.sugerida ? 'Sugerida' : ''}</span>`}
    </div>`;
  const grupo = (tit, l, nota) => (l.length ? `<h3 class="concl-sub">${tit} <span class="nota">(${esc(nota)})</span></h3><div class="cpe-lista">${l.map(c => linha(c)).join('')}</div>` : '');
  return `<h2>Conclusões</h2>
    <div class="cpe-print${ed ? ' so-impressao' : ''}">${htmlListaConclusoesPre(adv, C)}</div>
    ${ed ? `<div class="so-ecra cpe">
      <p class="nota sem-margem">Escolha as conclusões que entram no relatório (o PDF só leva as marcadas) e ajuste o texto. As marcadas como «Sugerida» são as que mais se destacam. Fica guardado para ${esc(adv)}.</p>
      ${grupo('Dados estatísticos', I.wy, `Wyscout · ${C.contexto}`)}
      ${grupo('Oportunidades', I.cod, 'codificação · comparação com as outras equipas codificadas')}
      <h3 class="concl-sub">As nossas <span class="nota">(escritas pelo departamento)</span></h3>
      <div class="cpe-lista" id="cpe-extra">${I.extra.map(c => linha(c, true)).join('')}</div>
      <div class="acoes-esq"><button type="button" class="btn" id="cpe-nova">Adicionar conclusão</button><button type="button" class="btn-link" id="cpe-repor">Repor sugestões</button></div>
    </div>` : ''}`;
}
function ligarConclusoesPre(adv, C) {
  const raiz = $('#pre-concl'); if (!raiz || !ehDep()) return;
  const redesenhar = () => { raiz.innerHTML = htmlConclusoesPreEditor(adv, C); };
  const atualizarLista = () => { const l = $('.cpe-print', raiz); if (l) l.innerHTML = htmlListaConclusoesPre(adv, C); };
  let espera = null;
  const guardar = async (imediato = false) => {
    clearTimeout(espera);
    const fazer = async () => {
      const E = { itens: {}, extra: [] };
      for (const el of $$('.cpe-item', raiz)) {
        const v = { on: el.querySelector('.cpe-on').checked, lado: el.querySelector('.cpe-lado').value, t: el.querySelector('.cpe-t').value.trim(), d: el.querySelector('.cpe-d').value.trim() };
        if (el.dataset.extra) { E.extra.push({ id: el.dataset.cid, ...v }); continue; }
        // Só guarda o texto se foi alterado (assim as sugestões continuam a atualizar-se com os dados novos).
        if (v.t === el.dataset.t0) delete v.t; if (v.d === el.dataset.d0) delete v.d;
        E.itens[el.dataset.cid] = v;
      }
      const todas = { ...(App.cfg.conclusoes_pre || {}), [norm(adv)]: E };
      try { await App.db.upsert('configuracao', [{ id: 1, conclusoes_pre: todas, updated_at: new Date().toISOString() }], 'id'); App.cfg.conclusoes_pre = todas; }
      catch (err) { toast(`Não foi possível guardar as conclusões: ${traduzErro(err.message || String(err))}`, 'erro'); }
    };
    if (imediato) await fazer(); else espera = setTimeout(fazer, 600);
  };
  raiz.addEventListener('change', async e => { if (e.target.matches('.cpe-on, .cpe-lado')) { e.target.closest('.cpe-item').classList.toggle('on', e.target.closest('.cpe-item').querySelector('.cpe-on').checked); await guardar(true); atualizarLista(); } });
  raiz.addEventListener('input', e => { if (e.target.matches('.cpe-t, .cpe-d')) guardar(); });
  raiz.addEventListener('focusout', async e => { if (e.target.matches('.cpe-t, .cpe-d')) { await guardar(true); atualizarLista(); } });
  raiz.addEventListener('click', async e => {
    if (e.target.id === 'cpe-nova') {
      const E = estadoConclusoesPre(adv); const novo = { id: `x:${Date.now()}`, on: true, lado: 'ataque', t: 'Nova conclusão', d: '' };
      const todas = { ...(App.cfg.conclusoes_pre || {}), [norm(adv)]: { itens: E.itens || {}, extra: [...(E.extra || []), novo] } };
      await App.db.upsert('configuracao', [{ id: 1, conclusoes_pre: todas, updated_at: new Date().toISOString() }], 'id'); App.cfg.conclusoes_pre = todas; redesenhar();
      setTimeout(() => { const i = $(`[data-cid="${novo.id}"] .cpe-t`); if (i) { i.focus(); i.select(); } }, 50);
    }
    if (e.target.classList.contains('cpe-tirar')) { e.target.closest('.cpe-item').remove(); await guardar(true); atualizarLista(); }
    if (e.target.id === 'cpe-repor' && await confirmar(`Repor as conclusões sugeridas para ${adv}? As alterações ao texto e as conclusões escritas pelo departamento perdem-se.`)) {
      const todas = { ...(App.cfg.conclusoes_pre || {}) }; delete todas[norm(adv)];
      await App.db.upsert('configuracao', [{ id: 1, conclusoes_pre: todas, updated_at: new Date().toISOString() }], 'id'); App.cfg.conclusoes_pre = todas; redesenhar();
    }
  });
}
