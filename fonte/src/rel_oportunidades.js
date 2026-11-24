// ---------- Relatório de oportunidades e golos (diapositivos 16:9) ----------
// Capa, visão geral, oportunidades criadas por momento, golos marcados, oportunidades sofridas por momento e golos sofridos.
// Nas sofridas, o lado é o da equipa a defender: o esquerdo de quem ataca é o direito de quem defende.

const MOMENTOS_REL = [['Organização', 'Organização', 'jogo exterior e jogo interior', 'o ataque organizado'], ['Transição', 'Transição', 'ataque rápido, contra-ataque e recuperação alta', 'a transição'], ['Esquema tático', 'Esquemas táticos', 'cantos, livres, lançamentos e penáltis', 'os esquemas táticos']];
const TROCA_LADO = { Esquerdo: 'Direito', Direito: 'Esquerdo', Centro: 'Centro' };
const ladoOp = (x, espelho) => espelho ? (TROCA_LADO[x.o.corredor] || x.o.corredor) : x.o.corredor;
// Pontos para os mapas de zonas; nas sofridas o campo é espelhado (lado de quem defende).
function pontosOp(ops, tipo, espelho = false) {
  const [kx, ky] = tipo === 'passe' ? ['passe_x', 'passe_y'] : ['zona_x', 'zona_y'];
  return ops.filter(x => x.e[kx] != null).map(x => ({ x: x.e[kx], y: espelho ? 100 - x.e[ky] : x.e[ky] }));
}

// Linha de baixo da capa: o próximo jogo contra a equipa (competição, casa/fora, data). Edita-se antes de exportar.
function infoCapaOp(eq, F) {
  const prox = App.d.jogos.filter(j => mesmaEquipa(j.adversario, eq) && !resultadoJogo(j) && (!j.data || j.data >= hojeIso())).sort(compararJogos)[0];
  if (prox) return [prox.jornada != null ? `${prox.competicao ? prox.competicao + ' · ' : ''}Jornada ${prox.jornada}` : (prox.competicao || 'Próximo jogo'), prox.local === 'fora' ? 'Fora' : 'Casa', prox.data ? fmtData(prox.data) : ''].filter(Boolean).join(' • ');
  const nj = jogosDaEquipa(eq, F).length;
  return `${nj} ${nj === 1 ? 'jogo codificado' : 'jogos codificados'} • ${fmtData(hojeIso())}`;
}

function relOportunidades(eq, F, opcoes = {}) {
  const jogos = jogosDaEquipa(eq, F); const nj = jogos.length;
  if (!nj) return null;
  const ops = (persp, momento = 'todos') => oportunidadesDe(eq, { ...F, persp, momento, golos: false }, jogos);
  const g = l => l.filter(x => x.o.golo).length;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const pj = n => (n / nj).toFixed(1).replace('.', ',');
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const C = ops('criadas'), S = ops('sofridas');

  // Jogos por competição (para o rodapé e a visão geral).
  const porComp = new Map(); for (const a of jogos) { const k = a.competicao || 'Sem competição'; porComp.set(k, (porComp.get(k) || 0) + 1); }
  const comps = [...porComp.entries()].sort((a, b) => b[1] - a[1]);
  const txtJogos = `${pl(nj, 'jogo codificado', 'jogos codificados')}${comps.length > 1 ? `: ${comps.map(([c, n]) => `${n} ${c}`).join(', ')}` : comps[0][0] !== 'Sem competição' ? ` (${comps[0][0]})` : ''}`;
  const pe = `<p class="sl-fonte">Fonte: codificação do Departamento de Análise · ${esc(txtJogos)}</p>`;
  const slide = (corpo, cls = '') => `<section class="sl ${cls}">${corpo}${pe}</section>`;
  const topo = (t, sub, sec) => `<div class="sl-topo">${simboloEquipa(eq, 'sl-topo-simb')}<span class="sl-olho"><b>${esc(eq)}</b>${sec}</span></div>
    <div class="sl-cab"><div class="sl-regua"></div><h1>${t}</h1>${sub ? `<p class="sl-sub">${sub}</p>` : ''}</div>`;

  // Barras com a parte que acabou em golo a escuro (comGolos) ou simples (páginas de golos).
  const barrasG = (titulo, l, fn, { max = 6, total = true, comGolos = true, fixo = null } = {}) => {
    const c = new Map(); for (const x of l) { const k = fn(x); if (!k) continue; const v = c.get(k) || [0, 0]; v[0]++; if (x.o.golo) v[1]++; c.set(k, v); }
    let e = fixo ? fixo.map(k => [k, c.get(k) || [0, 0]]).filter(([, v]) => v[0]) : [...c.entries()].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1]);
    const resto = e.slice(max).reduce((s, [, v]) => s + v[0], 0); e = e.slice(0, max);
    const alto = Math.max(1, ...e.map(([, v]) => v[0])); const n = l.length;
    return `<div class="gb"><h3>${titulo}</h3>${e.length ? `<ul>${e.map(([k, [t, gg]]) => `<li><span class="gb-rot">${esc(k)}</span><span class="gb-pista"><i style="width:${t / alto * 100}%">${comGolos && gg ? `<s style="width:${gg / t * 100}%"></s>` : ''}</i></span><span class="gb-val"><b>${t}</b>${total ? `<small> · ${pct(t, n)}</small>` : ''}${comGolos && gg ? `<em>${pl(gg, 'golo', 'golos')}</em>` : ''}</span></li>`).join('')}</ul>${resto ? `<p class="gb-resto">E mais ${resto} noutras categorias.</p>` : ''}` : '<p class="gb-resto">Sem dados.</p>'}</div>`;
  };
  const tempo = (l, comGolos = true) => {
    const t = TEMPOS.filter(x => x !== 'Prolongamento' || l.some(y => y.o.tempo === x)).map(x => [x, l.filter(y => y.o.tempo === x)]);
    const max = Math.max(1, ...t.map(([, a]) => a.length));
    return `<div class="gb"><h3>Tempo</h3><div class="tp">${t.map(([k, a]) => `<div class="tp-col"><span class="tp-val">${a.length}${comGolos && g(a) ? `<em>${g(a)}</em>` : ''}</span><span class="tp-barra"><i style="height:${a.length / max * 100}%">${comGolos && g(a) ? `<s style="height:${g(a) / a.length * 100}%"></s>` : ''}</i></span><span class="tp-rot">${k === 'Prolongamento' ? '90+' : k}</span></div>`).join('')}</div></div>`;
  };
  const mapas = (l, esp) => `<div class="mp">
    <figure><figcaption>Zona do passe</figcaption>${mapaZonas('passe', pontosOp(l, 'passe', esp))}</figure>
    <figure><figcaption>Zona de finalização</figcaption>${mapaZonas('fin', pontosOp(l, 'fin', esp))}</figure>
    <p class="mp-nota">${esp ? 'Lados da equipa a defender: à esquerda do desenho fica o lado esquerdo da equipa.' : 'Lados da equipa a atacar, para cima.'}</p></div>`;
  const legenda = cls => `<div class="leg"><span><i class="leg-t ${cls}"></i>Oportunidades</span><span><i class="leg-g ${cls}"></i>Acabaram em golo</span></div>`;
  const tituloLado = esp => esp ? 'Lado (a defender)' : 'Lado';

  // ---- Capa ----
  const capa = `<section class="sl sl-capa"><div class="capa-centro">
      <div class="capa-sobre">Oportunidades e golos</div>
      <h1 class="capa-titulo">${esc(eq.toUpperCase())}</h1>
      ${simboloEquipa(eq, 'capa-simb')}
      <div class="capa-info">${String(opcoes.capa ?? infoCapaOp(eq, F)).split('•').map(t => t.trim()).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('<i></i>')}</div>
    </div></section>`;

  // ---- Visão geral ----
  const barraMom = l => { const t = l.length; return `<div class="vg-pilha">${MOMENTOS_REL.map(([m], i) => { const n = l.filter(x => x.o.momento === m).length; return n ? `<span class="m${i}" style="flex:${n}"><b>${n}</b>${pct(n, t)}</span>` : ''; }).join('')}</div>`; };
  const golMom = l => MOMENTOS_REL.map(([m, nome], i) => { const s = l.filter(x => x.o.momento === m); return `<span><i class="m${i}"></i>${nome}: ${s.length} oport. · ${pl(g(s), 'golo', 'golos')}</span>`; }).join('');
  const linhaNum = (rot, a, b) => `<tr><th>${rot}</th><td>${a}</td><td>${b}</td></tr>`;
  const concl = opcoes.conclusoes || conclusoesOportunidades(eq, C, S, nj, F);
  const vg = slide(`${topo('Visão geral', `O que ${esc(eq)} cria e o que sofre, em ${pl(nj, 'jogo codificado', 'jogos codificados')}.`, 'Observação')}
    <div class="vg"><div class="vg-esq">
        <table class="vg-tab"><thead><tr><th></th><th>A criar</th><th>A sofrer</th></tr></thead><tbody>
          ${linhaNum('Oportunidades', C.length, S.length)}${linhaNum('Por jogo', pj(C.length), pj(S.length))}
          ${linhaNum('Golos', g(C), g(S))}${linhaNum('Golos por jogo', pj(g(C)), pj(g(S)))}${linhaNum('Conversão', pct(g(C), C.length), pct(g(S), S.length))}
        </tbody></table>
        <div class="vg-mom"><h3>Por momento: a criar</h3>${barraMom(C)}<div class="vg-leg">${golMom(C)}</div></div>
        <div class="vg-mom"><h3>Por momento: a sofrer</h3>${barraMom(S)}<div class="vg-leg">${golMom(S)}</div></div>
      </div>
      <div class="vg-dir"><h2>Conclusões</h2><ol>${concl.map(([t, d, lado]) => `<li class="${lado === 'defesa' ? 'defesa' : 'ataque'}"><b><i class="vg-tag">${lado === 'defesa' ? 'Defesa' : 'Ataque'}</i>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol></div></div>`, 'sl-vg');

  // ---- Oportunidades de um momento ----
  const pagMomento = (persp, [m, nome, desc]) => {
    const l = ops(persp, m), n = l.length, esp = persp === 'sofridas';
    const sub = `${pl(n, 'oportunidade', 'oportunidades')} (${pj(n)} por jogo) e ${pl(g(l), 'golo', 'golos')}${n ? ` (${pct(g(l), n)} de conversão)` : ''}: ${desc}.`;
    return slide(`${topo(nome, sub, esp ? 'Oportunidades sofridas' : 'Oportunidades criadas')}
      <div class="pg ${persp}">
        <div class="pg-c1">${barrasG('Sub-momento', l, x => x.o.sub, { max: 4 })}${barrasG('Mecanismo', l, x => x.o.mecanismo, { max: 6 })}${n && n < 10 ? `<p class="pg-aviso">Amostra pequena: ${pl(n, 'oportunidade', 'oportunidades')} em ${pl(nj, 'jogo', 'jogos')}. Ler como casos, não como padrão.</p>` : ''}</div>
        <div class="pg-c2">${barrasG(tituloLado(esp), l, x => ladoOp(x, esp), { fixo: CORREDORES })}${tempo(l)}</div>
        <div class="pg-c3">${mapas(l, esp)}</div>
        <div class="pg-jog">${barrasG('Quem finaliza', l, x => x.e.jogador, { max: 4, total: false })}${barrasG('Quem faz o último passe', l, x => x.e.assistente, { max: 4, total: false })}</div>
        ${legenda(persp)}
      </div>`);
  };
  // ---- Golos (marcados ou sofridos), com a mesma estrutura ----
  const pagGolos = persp => {
    const l = ops(persp).filter(x => x.o.golo), n = l.length, esp = persp === 'sofridas';
    const tit = esp ? 'Golos sofridos' : 'Golos marcados';
    const o = { comGolos: false };
    return slide(`${topo(tit, `${pl(n, 'golo', 'golos')} (${pj(n)} por jogo): por momento, como e onde nasceram, e quem ${esp ? 'marcou' : 'marca'}.`, tit)}
      <div class="pg golos ${persp}">
        <div class="pg-c1">${barrasG('Sub-momento', l, x => x.o.sub, { ...o, max: 5 })}${barrasG('Mecanismo', l, x => x.o.mecanismo, { ...o, max: 5 })}</div>
        <div class="pg-c2">${barrasG('Momento', l, x => x.o.momento, { ...o, fixo: MOMENTOS_REL.map(([k]) => k) })}${barrasG(tituloLado(esp), l, x => ladoOp(x, esp), { ...o, fixo: CORREDORES })}${tempo(l, false)}</div>
        <div class="pg-c3">${mapas(l, esp)}</div>
        <div class="pg-jog">${barrasG(esp ? 'Quem marcou' : 'Quem marca', l, x => x.e.jogador, { ...o, max: 4, total: false })}${barrasG('Quem fez o último passe', l, x => x.e.assistente, { ...o, max: 4, total: false })}</div>
      </div>`);
  };
  return [capa, vg,
    ...MOMENTOS_REL.map(m => pagMomento('criadas', m)), pagGolos('criadas'),
    ...MOMENTOS_REL.map(m => pagMomento('sofridas', m)), pagGolos('sofridas')].join('');
}

// ---------- Conclusões: o que mais sobressai ----------
// Compara a equipa com as outras equipas codificadas (mesmo período) e fica com os desvios mais fortes, sempre com o número que os sustenta.
// Cada candidato tem um peso (desvio padronizado); escolhem-se os maiores, no máximo um por tema, com ataque e defesa equilibrados.
// Os jogos contra a própria equipa ficam de fora (senão as oportunidades dela entravam na comparação ao contrário),
// e só contam equipas com pelo menos 3 jogos codificados.
function baseLigaOportunidades(F, excluir = null) {
  const f = { ...F, adversario: 'todos', local: 'todos', momento: 'todos', golos: false };
  return equipasCodificaveis().map(eq => {
    let js = jogosDaEquipa(eq, f);
    if (excluir) js = js.filter(a => !mesmaEquipa(a.casa, excluir) && !mesmaEquipa(a.fora, excluir) && norm(a.casa) !== norm(excluir) && norm(a.fora) !== norm(excluir));
    if (js.length < 3) return null;
    return { eq, nj: js.length, C: oportunidadesDe(eq, { ...f, persp: 'criadas' }, js), S: oportunidadesDe(eq, { ...f, persp: 'sofridas' }, js) };
  }).filter(Boolean);
}
function conclusoesOportunidades(eq, C, S, nj, F = App.ana) {
  const g = l => l.filter(x => x.o.golo).length;
  const p100 = x => Math.round(x * 100) + '%';
  const pj = n => (n / nj).toFixed(1).replace('.', ',');
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const ord = n => `${n}.ª`;
  const liga = baseLigaOportunidades(F, eq);
  const outros = liga.filter(t => !mesmaEquipa(t.eq, eq) && norm(t.eq) !== norm(eq));
  const cand = [];
  const add = (score, tema, lado, t, d, grupo = null) => { if (Number.isFinite(score)) cand.push({ score, tema, lado, t, d, grupo }); };
  const paiSub = k => Object.keys(MOMENTOS).find(m => MOMENTOS[m].sub.includes(k)) || null;

  if (outros.length >= 3) {
    const T = outros.length + 1;
    // Volume e conversão (ranking entre as equipas codificadas)
    const rank = (val, vals, desc = true) => 1 + vals.filter(v => desc ? v > val : v < val).length;
    const zEquipas = (val, vals) => { const m = vals.reduce((a, b) => a + b, 0) / vals.length; const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, vals.length - 1)) || 1; return [(val - m) / sd, m]; };
    const cpg = C.length / nj, spg = S.length / nj;
    const vc = outros.map(t => t.C.length / t.nj), vs = outros.map(t => t.S.length / t.nj);
    const [zc, mc] = zEquipas(cpg, vc), [zs, ms] = zEquipas(spg, vs);
    const rc = rank(cpg, vc), rs = rank(spg, vs, false);
    add(Math.abs(zc), 'volume', 'ataque', zc > 0 ? `Das equipas que mais oportunidades criam` : `Cria pouco`, `${pj(C.length)} por jogo (${ord(zc > 0 ? rc : T + 1 - rank(cpg, vc, false))} de ${T}); a média das outras equipas é ${mc.toFixed(1).replace('.', ',')}.`);
    add(Math.abs(zs), 'volume', 'defesa', zs < 0 ? `Das equipas que menos oportunidades concedem` : `Concede muitas oportunidades`, `${pj(S.length)} por jogo (${ord(zs < 0 ? rs : T + 1 - rank(spg, vs))} ${zs < 0 ? 'que menos concede' : 'que mais concede'} de ${T}); a média das outras equipas é ${ms.toFixed(1).replace('.', ',')}.`);
    // Proporções contra a liga (teste binomial simples)
    const pooled = k => outros.flatMap(t => t[k]);
    const LC = pooled('C'), LS = pooled('S');
    const zProp = (k, n, K, N) => { if (!n || !N) return [0, 0, 0]; const p = k / n, q = K / N; if (q <= 0 || q >= 1) return [0, p, q]; return [(p - q) / Math.sqrt(q * (1 - q) / n), p, q]; };
    const conv = (l, L, lado) => {
      const [z, p, q] = zProp(g(l), l.length, g(L), L.length);
      if (l.length < 10) return;
      const t = lado === 'ataque' ? (z > 0 ? 'Muito eficaz a finalizar' : 'Pouco eficaz a finalizar') : (z > 0 ? 'Os adversários marcam muito do que criam' : 'Os adversários convertem pouco');
      add(Math.abs(z) * 0.9, 'conversao', lado, t, `${p100(p)} das oportunidades ${lado === 'ataque' ? 'criadas' : 'sofridas'} acabam em golo (${pl(g(l), 'golo', 'golos')} em ${l.length}); nas outras equipas, ${p100(q)}.`);
    };
    conv(C, LC, 'ataque'); conv(S, LS, 'defesa');
    const DIMS = [
      ['momento', x => x.o.momento, k => ({ 'Organização': 'organização', 'Transição': 'transição', 'Esquema tático': 'esquemas táticos' })[k] || k.toLowerCase(), 'em '],
      ['sub', x => x.o.sub, k => k.toLowerCase(), 'em '],
      ['mecanismo', x => x.o.mecanismo, k => k.toLowerCase(), 'com '],
      ['lado', null, k => k === 'Centro' ? 'pelo corredor central' : `pelo ${k === 'Esquerdo' ? 'lado esquerdo' : 'lado direito'}`, ''],
      ['tempo', x => x.o.tempo, k => k === 'Prolongamento' ? 'nos descontos e prolongamento' : `entre os ${k.replace('-', ' e os ')} minutos`, '']];
    for (const [lado, l, L, esp] of [['ataque', C, LC, false], ['defesa', S, LS, true]]) {
      if (l.length < 10) continue;
      for (const [dim, fn0, rot, prep] of DIMS) {
        const fn = fn0 || (x => ladoOp(x, esp));
        const cats = new Set(l.map(fn).concat(L.map(fn)).filter(Boolean));
        for (const k of cats) {
          const kk = l.filter(x => fn(x) === k), KK = L.filter(x => fn(x) === k);
          const [z, p, q] = zProp(kk.length, l.length, KK.length, L.length);
          if (Math.abs(p - q) < 0.06) continue;
          if (z > 0 && kk.length < 4) continue;
          if (z < 0 && l.length * q < 6) continue;
          const verbo = lado === 'ataque' ? (z > 0 ? 'Cria muito' : 'Cria pouco') : (z > 0 ? 'Sofre muito' : 'Sofre pouco');
          const gs = g(kk);
          add(Math.abs(z) * (dim === 'momento' ? 1.1 : dim === 'tempo' ? 0.8 : 1), dim, lado, `${verbo} ${prep}${rot(k)}`,
            `${kk.length} das ${l.length} oportunidades ${lado === 'ataque' ? 'criadas' : 'sofridas'} (${p100(p)}); nas outras equipas, ${p100(q)}.${gs ? ` ${pl(gs, 'acabou em golo', 'acabaram em golo')}.` : ''}`,
            dim === 'momento' ? `${k}|${z > 0}` : dim === 'sub' && paiSub(k) ? `${paiSub(k)}|${z > 0}` : null);
        }
      }
      // Golos por momento (só com golos suficientes)
      const G = g(l), GL = g(L);
      if (G >= 4) for (const [m, nome, , art] of MOMENTOS_REL) {
        const k = l.filter(x => x.o.golo && x.o.momento === m).length, K = L.filter(x => x.o.golo && x.o.momento === m).length;
        const [z, p, q] = zProp(k, G, K, GL);
        if (z <= 0 || k < 3 || p - q < 0.12) continue;
        add(z * 1.15, 'golos-momento', lado, `${p >= .5 ? 'Metade ou mais' : 'Grande parte'} dos golos ${lado === 'ataque' ? 'marcados' : 'sofridos'} vem ${art.startsWith('os ') ? 'dos' : art.startsWith('a ') ? 'da' : 'do'} ${art.replace(/^(os|a|o) /, '')}`,
          `${k} de ${G} golos (${p100(p)}); nas outras equipas, ${p100(q)}.`);
      }
    }
    // Sub-momento mais eficaz (ataque), contra a mesma situação nas outras equipas
    for (const k of new Set(C.map(x => x.o.sub).filter(Boolean))) {
      const kk = C.filter(x => x.o.sub === k), KK = LC.filter(x => x.o.sub === k);
      if (kk.length < 5 || g(kk) < 2 || KK.length < 10) continue;
      const [z, p, q] = zProp(g(kk), kk.length, g(KK), KK.length);
      if (z > 0 && p - q >= 0.1) add(z, 'eficacia', 'ataque', `${k}: o caminho mais eficaz`, `${pl(g(kk), 'golo', 'golos')} em ${kk.length} oportunidades (${p100(p)}); nas outras equipas, ${p100(q)} nesta situação.`);
    }
    // Dependência de um finalizador (ataque)
    const topo = l => { const c = contarPor(l.filter(x => x.o.golo), x => x.e.jogador).sort((a, b) => b[1] - a[1])[0]; return c ? [c[0], c[1] / g(l)] : null; };
    const tp = topo(C); const tps = outros.map(t => topo(t.C)?.[1]).filter(Number.isFinite);
    if (tp && g(C) >= 5 && tps.length >= 3) { const [z] = zEquipas(tp[1], tps); if (z > 0) add(z * 0.9, 'finalizador', 'ataque', `Muito dependente de ${tp[0]}`, `Marca ${Math.round(tp[1] * g(C))} dos ${g(C)} golos (${p100(tp[1])}); nas outras equipas, o melhor marcador tem em média ${p100(tps.reduce((a, b) => a + b, 0) / tps.length)}.`); }
  }

  // Escolha: os maiores desvios, um por tema e por lado, com ataque e defesa equilibrados.
  const fortes = cand.filter(c => c.score >= 1.5).sort((a, b) => b.score - a.score);
  const out = [], vistos = new Set();
  const pega = filtro => { for (const c of fortes) { if (out.length >= 6) return; const k = `${c.lado}|${c.tema}`; const kg = c.grupo && `${c.lado}|g|${c.grupo}`; if (vistos.has(k) || (kg && vistos.has(kg)) || !filtro(c)) continue; if (out.filter(x => x.lado === c.lado).length >= 4) continue; vistos.add(k); if (kg) vistos.add(kg); out.push(c); } };
  pega(c => c.lado === 'ataque' && out.filter(x => x.lado === 'ataque').length < 2);
  pega(c => c.lado === 'defesa' && out.filter(x => x.lado === 'defesa').length < 2);
  pega(() => true);
  // Sem outras equipas para comparar (ou sem desvios fortes): resumo factual.
  if (out.length < 3) {
    const base = [];
    base.push({ lado: 'ataque', t: `Cria ${pj(C.length)} e sofre ${pj(S.length)} oportunidades por jogo`, d: `${pj(g(C))} golos marcados e ${pj(g(S))} sofridos por jogo.` });
    const top = MOMENTOS_REL.map(m => ({ m, l: C.filter(x => x.o.momento === m[0]) })).sort((a, b) => b.l.length - a.l.length)[0];
    if (top?.l.length) base.push({ lado: 'ataque', t: `${top.m[3][0].toUpperCase() + top.m[3].slice(1)} é a base do ataque`, d: `${p100(top.l.length / Math.max(1, C.length))} das oportunidades e ${g(top.l)} dos ${g(C)} golos.` });
    const ms = MOMENTOS_REL.map(m => ({ m, l: S.filter(x => x.o.momento === m[0]) })).sort((a, b) => g(b.l) - g(a.l) || b.l.length - a.l.length)[0];
    if (ms?.l.length) base.push({ lado: 'defesa', t: `A sofrer, o maior perigo vem ${ms.m[3].startsWith('os ') ? 'dos' : ms.m[3].startsWith('a ') ? 'da' : 'do'} ${ms.m[3].replace(/^(os|a|o) /, '')}`, d: `${g(ms.l)} dos ${g(S)} golos sofridos e ${ms.l.length} das ${S.length} oportunidades sofridas.` });
    const efic = contarPor(C, x => x.o.sub).filter(([, n]) => n >= 5).map(([k, n]) => [k, n, g(C.filter(x => x.o.sub === k))]).filter(([, , gg]) => gg >= 2).sort((a, b) => b[2] / b[1] - a[2] / a[1])[0];
    if (efic) base.push({ lado: 'ataque', t: `${efic[0]}: o caminho mais eficaz`, d: `${pl(efic[2], 'golo', 'golos')} em ${efic[1]} oportunidades (${p100(efic[2] / efic[1])} de conversão).` });
    const fins = contarPor(C, x => x.e.jogador).sort((a, b) => b[1] - a[1]);
    if (fins.length >= 2 && C.length) base.push({ lado: 'ataque', t: `${fins[0][0]} e ${fins[1][0]} concentram as finalizações`, d: `${fins[0][1] + fins[1][1]} das ${C.length} oportunidades (${p100((fins[0][1] + fins[1][1]) / C.length)}).` });
    const tm = TEMPOS.map(t => [t, g(C.filter(x => x.o.tempo === t)), g(S.filter(x => x.o.tempo === t))]).sort((a, b) => b[1] - a[1])[0];
    if (tm && tm[1] >= 2) base.push({ lado: 'ataque', t: `Perigo entre os ${tm[0] === 'Prolongamento' ? '90 minutos e o fim' : tm[0].replace('-', ' e os ') + ' minutos'}`, d: `Marca ${tm[1]} dos ${g(C)} golos nesse período${tm[2] ? ` e sofre ${tm[2]} dos ${g(S)}` : ''}.` });
    for (const b of base) if (out.length < 6 && !out.some(o => o.t === b.t)) out.push(b);
  }
  out.sort((a, b) => (a.lado === 'ataque' ? 0 : 1) - (b.lado === 'ataque' ? 0 : 1));
  return out.map(c => [c.t, c.d, c.lado]);
}

// ---------- Conclusões do recorte (página Oportunidades) ----------
// As conclusões acompanham os filtros por clique: a equipa é comparada com as outras equipas no MESMO recorte
// (ex.: organização da equipa contra a organização das outras). Não se repete o que já está filtrado.
const DIMS_COMPARAVEIS = ['momento', 'sub', 'mecanismo', 'lado', 'parte', 'tempo', 'zpasse', 'zfin'];
function conclusoesRecorte(eq, F, sel, valor) {
  const esp = F.persp === 'sofridas', soGolos = !!F.golos;
  const f = { ...F, momento: 'todos' };
  const jogos = jogosDaEquipa(eq, f); const nj = jogos.length;
  const base = oportunidadesDe(eq, { ...f, golos: soGolos }, jogos);
  const filtra = (l, s, menos) => l.filter(x => Object.entries(s).every(([d, v]) => d === menos || String(valor(x, d, esp)) === String(v)));
  const selL = Object.fromEntries(Object.entries(sel).filter(([d]) => DIMS_COMPARAVEIS.includes(d)));
  const g = l => l.filter(x => x.o.golo).length;
  const p100 = x => Math.round(x * 100) + '%';
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const coisa = soGolos ? ['golo', 'golos'] : ['oportunidade', 'oportunidades'];
  const T = filtra(base, sel); const n = T.length;
  const fBase = { ...f, adversario: 'todos', local: 'todos' };
  const outros = equipasCodificaveis().filter(e => norm(e) !== norm(eq) && !mesmaEquipa(e, eq)).map(e => {
    const js = jogosDaEquipa(e, fBase).filter(a => !mesmaEquipa(a.casa, eq) && !mesmaEquipa(a.fora, eq) && norm(a.casa) !== norm(eq) && norm(a.fora) !== norm(eq));
    return js.length >= 3 ? { e, nj: js.length, ops: oportunidadesDe(e, { ...fBase, golos: soGolos }, js) } : null;
  }).filter(Boolean);
  const res = { contexto: [], itens: [], aviso: '' };
  if (outros.length < 3) { res.aviso = 'Ainda não há outras equipas codificadas suficientes (pelo menos 3, com 3 jogos cada) para comparar.'; return res; }
  const L = outros.flatMap(t => t.ops); const LR = filtra(L, selL);
  const zProp = (k, nn, K, N) => { if (!nn || !N) return [0, 0, 0]; const p = k / nn, q = K / N; if (q <= 0 || q >= 1) return [0, p, q]; return [(p - q) / Math.sqrt(q * (1 - q) / nn), p, q]; };
  const ROT = {
    momento: k => ({ 'Organização': 'organização', 'Transição': 'transição', 'Esquema tático': 'esquemas táticos' })[k] || String(k).toLowerCase(),
    sub: k => String(k).toLowerCase(), mecanismo: k => String(k).toLowerCase(),
    lado: k => k === 'Centro' ? 'corredor central' : k === 'Esquerdo' ? 'lado esquerdo' : 'lado direito',
    parte: k => String(k), tempo: k => k === 'Prolongamento' ? 'descontos e prolongamento' : `${k} min`,
    zpasse: k => `passe da zona ${k}`, zfin: k => `finalização na zona ${k}`
  };
  const PREP = { momento: 'em ', sub: 'em ', mecanismo: 'com ', lado: 'pelo ', parte: 'na ', tempo: 'aos ', zpasse: 'com ', zfin: 'com ' };
  // Contexto: o peso de cada filtro ativo, comparado com as outras equipas.
  for (const d of Object.keys(selL)) {
    const sem = filtra(base, sel, d).length, semL = filtra(L, selL, d).length;
    const [, p, q] = zProp(n, sem, LR.length, semL);
    const v = sel[d]; const nome = d === 'zpasse' ? `Passe da zona ${v}` : d === 'zfin' ? `Finalização na zona ${v}` : d === 'lado' ? (v === 'Centro' ? 'Corredor central' : `Lado ${String(v).toLowerCase()}`) : d === 'tempo' ? `${v} min` : String(v);
    if (sem) res.contexto.push(`${nome}: ${n} de ${sem} ${coisa[1]} (${p100(p)}); nas outras equipas, ${semL ? p100(q) : '–'}.`);
  }
  if (n < 10) { res.aviso = `Amostra pequena (${pl(n, ...coisa)}): sem conclusões fortes neste recorte.`; return res; }
  const cand = [];
  const verbo = mais => esp ? (soGolos ? (mais ? 'Sofre muitos golos' : 'Sofre poucos golos') : (mais ? 'Sofre muito' : 'Sofre pouco')) : (soGolos ? (mais ? 'Marca muitos golos' : 'Marca poucos golos') : (mais ? 'Cria muito' : 'Cria pouco'));
  const paiSub = k => Object.keys(MOMENTOS).find(m => MOMENTOS[m].sub.includes(k)) || null;
  for (const d of DIMS_COMPARAVEIS) {
    if (sel[d] != null) continue;
    const cats = new Set(T.map(x => valor(x, d, esp)).concat(LR.map(x => valor(x, d, esp))).filter(v => v != null && v !== ''));
    for (const k of cats) {
      const kk = T.filter(x => String(valor(x, d, esp)) === String(k)), KK = LR.filter(x => String(valor(x, d, esp)) === String(k));
      const [z, p, q] = zProp(kk.length, n, KK.length, LR.length);
      if (Math.abs(p - q) < 0.07) continue;
      if (z > 0 && kk.length < 4) continue;
      if (z < 0 && n * q < 6) continue;
      const gs = soGolos ? 0 : g(kk);
      cand.push({ score: Math.abs(z) * (d === 'tempo' || d === 'parte' ? 0.8 : 1), tema: d, grupo: d === 'momento' ? `${k}|${z > 0}` : d === 'sub' && paiSub(k) ? `${paiSub(k)}|${z > 0}` : null,
        t: `${verbo(z > 0)} ${PREP[d]}${ROT[d](k)}`, d: `${kk.length} das ${n} ${coisa[1]} ${Object.keys(sel).length ? 'deste recorte' : esp ? (soGolos ? 'sofridos' : 'sofridas') : (soGolos ? 'marcados' : 'criadas')} (${p100(p)}); nas outras equipas, ${p100(q)}.${gs ? ` ${pl(gs, 'acabou em golo', 'acabaram em golo')}.` : ''}` });
    }
  }
  if (!soGolos) {
    const [z, p, q] = zProp(g(T), n, g(LR), LR.length);
    cand.push({ score: Math.abs(z) * 0.9, tema: 'conversao', t: esp ? (z > 0 ? 'Os adversários convertem muito' : 'Os adversários convertem pouco') : (z > 0 ? 'Muito eficaz a finalizar' : 'Pouco eficaz a finalizar'), d: `${p100(p)} acabam em golo (${pl(g(T), 'golo', 'golos')} em ${n}); nas outras equipas, ${p100(q)}.` });
  }
  if (!sel.jogo) {
    const taxa = n / Math.max(1, nj), vs = outros.map(t => filtra(t.ops, selL).length / t.nj);
    const m = vs.reduce((a, b) => a + b, 0) / vs.length, sd = Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, vs.length - 1)) || 1;
    const z = (taxa - m) / sd, pos = 1 + vs.filter(v => v > taxa).length;
    const txt = esp ? (soGolos ? 'golos sofridos' : 'oportunidades sofridas') : (soGolos ? 'golos marcados' : 'oportunidades criadas');
    cand.push({ score: Math.abs(z), tema: 'volume', t: `${z > 0 ? 'Muitas' : 'Poucas'} ${txt} ${Object.keys(selL).length ? 'neste recorte' : 'por jogo'}`, d: `${taxa.toFixed(1).replace('.', ',')} por jogo (${pos}.ª de ${vs.length + 1} equipas, da que tem mais para a que tem menos); a média das outras é ${m.toFixed(1).replace('.', ',')}.` });
  }
  const vistos = new Set();
  for (const c of cand.filter(c => c.score >= 1.5).sort((a, b) => b.score - a.score)) {
    if (res.itens.length >= 4) break;
    const kg = c.grupo && 'g|' + c.grupo;
    if (vistos.has(c.tema) || (kg && vistos.has(kg))) continue;
    vistos.add(c.tema); if (kg) vistos.add(kg); res.itens.push([c.t, c.d]);
  }
  if (!res.itens.length) res.aviso = 'Neste recorte não há desvios fortes em relação às outras equipas.';
  return res;
}

// ---------- Exportar o relatório em PDF 16:9 ----------
// O Safari ignora o tamanho de página pedido pelo CSS (sai em A4). Por isso cada diapositivo é desenhado numa imagem
// e o PDF é montado aqui, com páginas 16:9 em qualquer browser.
const LIBS_PDF = {
  screenshot: ['modernScreenshot', 'https://cdn.jsdelivr.net/npm/modern-screenshot@4.6.0/dist/index.js'],
  jspdf: ['jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js']
};
function carregarScript([global, url]) {
  if (window[global]) return Promise.resolve(window[global]);
  return new Promise((ok, falha) => { const s = document.createElement('script'); s.src = url; s.onload = () => ok(window[global]); s.onerror = () => falha(new Error('Não consegui carregar ' + url)); document.head.appendChild(s); });
}
// Letras do Google Fonts embutidas no PDF (sem isto o Safari desenha os diapositivos com letras de substituição,
// e os textos mais largos partem linha e ficam tapados).
let cssLetrasPdf = null;
async function letrasParaPdf() {
  if (cssLetrasPdf !== null) return cssLetrasPdf;
  try {
    const link = [...document.querySelectorAll('link[rel=stylesheet]')].find(l => /fonts\.googleapis/.test(l.href));
    if (!link) return (cssLetrasPdf = '');
    let css = await (await fetch(link.href)).text();
    // Só os blocos latinos (os outros alfabetos não são usados).
    const blocos = css.split('}').filter(b => /@font-face/.test(b)).map(b => b + '}').filter(b => !/unicode-range/.test(b) || /U\+0000-00FF/i.test(b));
    const dataUrl = async u => { const r = await fetch(u); const bl = await r.blob(); return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(bl); }); };
    const out = [];
    for (const b of blocos) { const m = b.match(/url\(([^)]+)\)/); if (!m) continue; out.push(b.replace(m[0], `url(${await dataUrl(m[1].replace(/['"]/g, ''))})`)); }
    cssLetrasPdf = out.join('\n');
  } catch { cssLetrasPdf = ''; }
  return cssLetrasPdf;
}
async function gerarPdfDiapositivos(html, nomeFicheiro, progresso = () => {}, classeExtra = '') {
  const [ms, jp] = await Promise.all([carregarScript(LIBS_PDF.screenshot), carregarScript(LIBS_PDF.jspdf)]);
  const caixa = document.createElement('div');
  caixa.className = `sl-render ${classeExtra}`.trim(); caixa.setAttribute('aria-hidden', 'true'); caixa.innerHTML = html;
  document.body.appendChild(caixa);
  try {
    await (document.fonts?.ready || Promise.resolve());
    const cssLetras = await letrasParaPdf();
    await Promise.all([...caixa.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    // Corpo de cada diapositivo que não cabe na altura disponível: encolhe por igual.
    for (const c of caixa.querySelectorAll('.et-corpo')) { const h = c.scrollHeight; if (h > 700) c.style.transform = `scale(${(700 / h).toFixed(3)})`; }
    const sls = [...caixa.querySelectorAll('.sl')];
    const pdf = new jp.jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080], hotfixes: ['px_scaling'], compress: true });
    for (let i = 0; i < sls.length; i++) {
      progresso(i + 1, sls.length);
      const opts = { width: 1920, height: 1080, scale: 1.6, quality: 0.92, backgroundColor: '#E9E6E0', ...(cssLetras ? { font: { cssText: cssLetras } } : {}) };
      // O Safari às vezes falha as imagens na primeira passagem: a primeira página é desenhada duas vezes.
      if (i === 0) await ms.domToJpeg(sls[i], opts).catch(() => {});
      const img = await ms.domToJpeg(sls[i], opts);
      if (i) pdf.addPage([1920, 1080], 'landscape');
      pdf.addImage(img, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');
    }
    pdf.save(nomeFicheiro.replace(/[\\/:*?"<>|]+/g, '-').trim() + '.pdf');
  } finally { caixa.remove(); }
}

// Antes de exportar: rever a linha da capa e as conclusões (ficam guardadas enquanto a app estiver aberta).
App.relOpEdit = App.relOpEdit || {};
function dialogoExportarOportunidades(eq, F) {
  const jogos = jogosDaEquipa(eq, F); if (!jogos.length) return;
  const chave = `${norm(eq)}|${F.adversario}|${F.local}|${F.periodo}`;
  const C = oportunidadesDe(eq, { ...F, persp: 'criadas', momento: 'todos', golos: false }, jogos);
  const S = oportunidadesDe(eq, { ...F, persp: 'sofridas', momento: 'todos', golos: false }, jogos);
  const ed = App.relOpEdit[chave] || { capa: infoCapaOp(eq, F), conclusoes: conclusoesOportunidades(eq, C, S, jogos.length, F) };
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  const linha = (c, i) => `<div class="exp-concl" data-i="${i}">
      <select aria-label="Ataque ou defesa"><option value="ataque" ${c[2] !== 'defesa' ? 'selected' : ''}>Ataque</option><option value="defesa" ${c[2] === 'defesa' ? 'selected' : ''}>Defesa</option></select>
      <div><input type="text" value="${esc(c[0])}" aria-label="Conclusão"><textarea rows="2" aria-label="Detalhe">${esc(c[1])}</textarea></div>
      <button class="btn-link perigo" type="button" data-tirar aria-label="Tirar esta conclusão">Tirar</button></div>`;
  const desenhar = () => {
    d.innerHTML = `<h2>Oportunidades e golos (16:9): ${esc(eq)}</h2>
      <p class="nota">10 diapositivos 16:9: capa, visão geral, oportunidades criadas por momento, golos marcados, oportunidades sofridas por momento e golos sofridos.</p>
      <label class="exp-campo">Linha de baixo da capa<input type="text" id="exp-capa" value="${esc(ed.capa)}"><small class="nota">Separe as partes com •, por exemplo: 4ª ELIMINATÓRIA • Estádio Nacional do Jamor • 22 nov 2026</small></label>
      <h3 class="exp-tit">Conclusões da visão geral</h3>
      <p class="nota sem-margem">Escolhidas pelos maiores desvios em relação às outras equipas codificadas. Pode reescrever, tirar ou acrescentar.</p>
      <div id="exp-lista">${ed.conclusoes.map(linha).join('')}</div>
      <div class="exp-acoes-lista"><button class="btn-link" type="button" id="exp-mais">+ Acrescentar conclusão</button><button class="btn-link" type="button" id="exp-repor">Repor as automáticas</button></div>
      <div class="acoes"><button class="btn" value="nao" type="button">Cancelar</button><button class="btn btn-prim" value="sim" type="button" id="exp-ok">Exportar PDF</button></div>`;
  };
  const ler = () => {
    ed.capa = $('#exp-capa', d).value;
    ed.conclusoes = $$('.exp-concl', d).map(el => [$('input', el).value.trim(), $('textarea', el).value.trim(), $('select', el).value]).filter(c => c[0] || c[1]);
    App.relOpEdit[chave] = ed;
  };
  desenhar(); document.body.appendChild(d); d.showModal();
  d.addEventListener('cancel', () => d.remove());
  d.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.matches('[data-tirar]')) { ler(); ed.conclusoes.splice(Number(b.closest('.exp-concl').dataset.i), 1); desenhar(); return; }
    if (b.id === 'exp-mais') { ler(); ed.conclusoes.push(['', '', 'ataque']); desenhar(); $$('.exp-concl input', d).at(-1)?.focus(); return; }
    if (b.id === 'exp-repor') { ed.conclusoes = conclusoesOportunidades(eq, C, S, jogos.length, F); ed.capa = infoCapaOp(eq, F); desenhar(); return; }
    if (b.value === 'nao') { ler(); d.close(); d.remove(); return; }
    if (b.id === 'exp-ok') {
      ler(); b.disabled = true;
      try {
        await gerarPdfDiapositivos(relOportunidades(eq, F, ed), `Oportunidades e golos ${eq} ${hojeIso()}`, (i, n) => { b.textContent = `A preparar ${i}/${n}…`; });
        d.close(); d.remove(); toast('PDF exportado.');
      } catch (err) {
        console.error(err); b.disabled = false; b.textContent = 'Exportar PDF';
        toast('Não foi possível gerar o PDF: ' + (err.message || err), 'erro');
      }
    }
  });
}
