// ---------- Relatório de esquemas táticos (diapositivos 16:9) ----------
// Capa, visão geral (números + conclusões) e, para cantos e livres a favor e contra: onde cai a bola e como se bate.

function dadosRelEP(eq) {
  const fav = esquemasDaEquipa(eq, 'favor'), con = esquemasDaEquipa(eq, 'contra');
  const jogos = [...new Map([...fav.jogos, ...con.jogos].map(a => [a.key, a])).values()];
  const adv = a => { const m = ladoDaEquipa(a, eq); return m === 'casa' ? a.fora : a.casa; };
  const L = (lista, t) => lista.filter(x => x.e.ep_tipo === t).map(x => ({ ...x, opp: adv(x.a), hxh: x.e.hxh || [], tdef: x.e.tipo_defesa || null }));
  return { jogos, nj: Math.max(1, jogos.length), L: { favor: { Canto: L(fav.lista, 'Canto'), Livre: L(fav.lista, 'Livre') }, contra: { Canto: L(con.lista, 'Canto'), Livre: L(con.lista, 'Livre') } } };
}
const estEP = l => ({ n: l.length, c: l.filter(x => contactoGanho(x.e)).length, r: l.filter(x => comRemate(x.e)).length, g: l.filter(x => eGolo(x.e)).length });
const pctEP = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
const topoEP = (l, fn) => { const c = contarPor(l, fn); return c[0] ? { k: c[0][0], n: c[0][1] } : null; };

// Conclusões automáticas (o utilizador escolhe, reescreve ou tira antes de exportar).
function conclusoesEsquemas(eq) {
  const { nj, L } = dadosRelEP(eq);
  const pj = n => (n / nj).toFixed(1).replace('.', ',');
  const out = [];
  const outras = equipasComEsquemas().filter(e => !mesmaEquipa(e, eq)).map(e => { const d = dadosRelEP(e); return { e, d, fc: estEP(d.L.favor.Canto), cc: estEP(d.L.contra.Canto) }; }).filter(o => o.fc.n + o.cc.n >= 8);
  const posicao = (v, vals, desc = true) => 1 + vals.filter(x => desc ? x > v : x < v).length;
  // Cantos a favor: volume e primeira bola
  const fc = L.favor.Canto, sfc = estEP(fc);
  if (fc.length >= 5) {
    const cg = sfc.c / sfc.n;
    let rk = '';
    if (outras.length >= 3) { const vals = outras.map(o => o.fc.n ? o.fc.c / o.fc.n : 0); rk = ` (${posicao(cg, vals)}.º de ${outras.length + 1} no 1.º contacto)`; }
    out.push(['ataque', cg >= 0.3 ? 'Ganha muitas primeiras bolas nos cantos' : sfc.n / nj >= 5 ? 'Muitos cantos, pouca primeira bola' : 'Pouca primeira bola nos cantos',
      `${pj(sfc.n)} cantos por jogo (${sfc.n} em ${nj} jogos) e ganha o 1.º contacto em ${pctEP(sfc.c, sfc.n)}${rk}. Remata em ${pctEP(sfc.r, sfc.n)} e marcou ${sfc.g} ${sfc.g === 1 ? 'golo' : 'golos'}.`]);
    // Como bate
    const mec = topoEP(fc, x => x.e.mecanismo), bola = topoEP(fc, x => x.e.tipo_bola), zona = topoEP(fc, x => /^\d/.test(x.e.zona_ep || '') ? x.e.zona_ep : null);
    const bat = contarPor(fc, x => x.e.jogador).slice(0, 2);
    if (mec && bola) out.push(['ataque', `Canto ${mec.k.toLowerCase()} e ${bola.k.toLowerCase()}${zona ? `, sobretudo à zona ${zona.k}` : ''}`,
      `${pctEP(mec.n, fc.length)} ${mec.k.toLowerCase()}s, ${pctEP(bola.n, fc.length)} ${bola.k.toLowerCase()}s${zona ? `; a zona ${zona.k} é a mais procurada (${zona.n} de ${fc.length})` : ''}.${bat.length ? ` ${bat.map(([n, c]) => `${n} (${c})`).join(' e ')} ${bat.length > 1 ? 'batem' : 'bate'} ${pctEP(bat.reduce((s, [, c]) => s + c, 0), fc.length)} dos cantos.` : ''}`]);
    // Alvo e marcação HxH
    const ref = topoEP(fc, x => x.e.referencia);
    const comH = fc.filter(x => x.hxh.length);
    if (ref && ref.n >= 3) {
      let d = `Referência em ${ref.n} cantos (${pctEP(ref.n, fc.length)}).`;
      if (comH.length >= 3) {
        const m = contarPor(comH.flatMap(x => x.hxh.map(h => ({ h }))), y => y.h).slice(0, 3);
        const doRef = comH.filter(x => x.hxh.some(h => mesmaEquipa(h, ref.k) || norm(h) === norm(ref.k))).length;
        d += ` ${doRef ? `Foi marcado HxH em ${doRef} dos ${comH.length} cantos com registo` : `Com marcação HxH registada em ${comH.length} cantos`}; ${m.filter(([h]) => norm(h) !== norm(ref.k)).slice(0, 2).map(([h, n]) => `${h} (${n})`).join(' e ')} também costumam ter marcação individual.`;
      }
      out.push(['ataque', `${ref.k} é o alvo${comH.length >= 3 ? ' — e os adversários sabem' : ''}`, d]);
    }
  }
  // Livres a favor
  const fl = L.favor.Livre, sfl = estEP(fl);
  if (fl.length >= 5 && (sfl.g || sfl.r / sfl.n >= 0.4)) out.push(['ataque', sfl.g ? 'Perigo nos livres' : 'Os livres dão remate', `${fl.length} livres: 1.º contacto em ${pctEP(sfl.c, sfl.n)}, remate em ${pctEP(sfl.r, sfl.n)} e ${sfl.g} ${sfl.g === 1 ? 'golo' : 'golos'}.`]);
  // Cantos contra: tipo de defesa e controlo
  const cc = L.contra.Canto, scc = estEP(cc);
  if (cc.length >= 5) {
    const def = topoEP(cc.filter(x => x.tdef), x => x.tdef);
    const ctrl = scc.c / scc.n <= 0.25 && !scc.g;
    out.push(['defesa', `${def && def.n >= cc.length / 2 ? `Defende os cantos ${def.k === 'HxH' ? 'homem a homem' : def.k.toLowerCase()}` : 'Cantos contra'}${ctrl ? ' e controla-os' : scc.g ? ', mas sofre' : ''}`,
      `${def ? `${def.k} em ${def.n} de ${cc.length} cantos contra (${new Set(cc.filter(x => x.tdef === def.k).map(x => x.opp)).size} jogos). ` : ''}O adversário ganha o 1.º contacto em ${pctEP(scc.c, scc.n)}, remata em ${pctEP(scc.r, scc.n)} e marcou ${scc.g}.`]);
  }
  // Livres contra
  const cl = L.contra.Livre, scl = estEP(cl);
  if (cl.length >= 5) {
    const mec = topoEP(cl, x => x.e.mecanismo);
    const golos = cl.filter(x => eGolo(x.e)).map(x => x.opp);
    const fraco = scl.c / scl.n >= 0.35 || scl.g;
    out.push(['defesa', fraco ? 'Os livres laterais são o ponto fraco' : 'Defende bem os livres',
      `${mec ? `${mec.n} de ${cl.length} livres contra são ${mec.k.toLowerCase()}s. ` : ''}O adversário ganha a 1.ª bola em ${pctEP(scl.c, scl.n)}, remata em ${pctEP(scl.r, scl.n)}${scl.g ? ` e marcou ${scl.g} ${scl.g === 1 ? 'golo' : 'golos'} (${[...new Set(golos)].join(', ')})` : ' e não marcou'}.`]);
  }
  return out.slice(0, 6);
}

function relEsquemas(eq, ed) {
  const { jogos, nj, L } = dadosRelEP(eq);
  if (!jogos.length) return null;
  const pj = n => (n / nj).toFixed(1).replace('.', ',');
  const nomesJ = jogos.map(a => { const m = ladoDaEquipa(a, eq); return m === 'casa' ? a.fora : a.casa; });
  const pe = `<p class="sl-fonte">Fonte: codificação do Departamento de Análise · ${nj} ${nj === 1 ? 'jogo codificado' : 'jogos codificados'}${nj <= 6 ? ` (${esc(nomesJ.join(', '))})` : ''}</p>`;
  const slide = (c, cls = '') => `<section class="sl ${cls}">${c}${pe}</section>`;
  const topo = (t, sub, sec) => `<div class="sl-topo">${simboloEquipa(eq, 'sl-topo-simb')}<span class="sl-olho"><b>${esc(eq)}</b>${sec}</span></div>
    <div class="sl-cab"><div class="sl-regua"></div><h1>${t}</h1>${sub ? `<p class="sl-sub">${sub}</p>` : ''}</div>`;
  const capa = `<section class="sl sl-capa"><div class="capa-centro">
      <div class="capa-sobre">Esquemas táticos</div><h1 class="capa-titulo">${esc(eq.toUpperCase())}</h1>${simboloEquipa(eq, 'capa-simb')}
      <div class="capa-info">${String(ed.capa || '').split('•').map(t => t.trim()).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('<i></i>')}</div></div></section>`;
  const S = { f: { c: estEP(L.favor.Canto), l: estEP(L.favor.Livre) }, c: { c: estEP(L.contra.Canto), l: estEP(L.contra.Livre) } };
  const lin = (rot, a, b) => `<tr><th>${rot}</th><td>${a}</td><td>${b}</td></tr>`;
  const bloco = (t, k) => `<tr class="vg-sep"><th colspan="3">${t}</th></tr>
    ${lin('Por jogo', `${pj(S.f[k].n)} <small>(${S.f[k].n})</small>`, `${pj(S.c[k].n)} <small>(${S.c[k].n})</small>`)}${lin('1.º contacto ganho', pctEP(S.f[k].c, S.f[k].n), pctEP(S.c[k].c, S.c[k].n))}${lin('Com remate', pctEP(S.f[k].r, S.f[k].n), pctEP(S.c[k].r, S.c[k].n))}${lin('Golos', S.f[k].g, S.c[k].g)}`;
  const concl = ed.conclusoes || [];
  const vg = slide(`${topo('Visão geral', `Cantos e livres de ${esc(eq)} e dos adversários, em ${nj} ${nj === 1 ? 'jogo codificado' : 'jogos codificados'}.`, 'Esquemas táticos')}
    <div class="vg"><div class="vg-esq"><table class="vg-tab et-tab"><thead><tr><th></th><th>A favor</th><th>Contra</th></tr></thead><tbody>${bloco('Cantos', 'c')}${bloco('Livres', 'l')}</tbody></table>
      <p class="et-nota">1.º contacto ganho: a primeira bola é da equipa que bate. Com remate: inclui a 2.ª vaga.</p></div>
    ${concl.length ? `<div class="vg-dir"><h2>Conclusões</h2><ol>${concl.map(([l, t, d]) => `<li class="${l === 'defesa' ? 'defesa' : 'ataque'}"><b><i class="vg-tag">${l === 'defesa' ? 'Defesa' : 'Ataque'}</i>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol></div>` : ''}</div>`, 'sl-vg');
  const tabelaHxH = l => {
    const com = l.filter(x => x.hxh.length); if (!com.length) return '';
    const jI = new Set(com.map(x => x.opp)); const m = new Map();
    for (const x of com) for (const h of x.hxh) { const o = m.get(h) || { j: new Set(), c: 0 }; o.j.add(x.opp); o.c++; m.set(h, o); }
    const ls = [...m.entries()].sort((a, b) => b[1].j.size - a[1].j.size || b[1].c - a[1].c).slice(0, 6);
    return `<div><h3>Referências marcadas pelo adversário</h3><div class="tabela-env"><table class="tabela compacta ep-jogadores-tab"><thead><tr><th>Jogador</th><th class="num">Jogos</th><th class="num">Cantos</th></tr></thead>
      <tbody>${ls.map(([n, o]) => `<tr><td>${esc(n)}</td><td class="num"><b>${o.j.size}</b>/${jI.size}</td><td class="num">${o.c}/${com.length}</td></tr>`).join('')}</tbody></table></div>
      <p class="et-nota">Em ${com.length} dos ${l.length} cantos (${jI.size} jogos) foi registado quem o adversário marcou homem a homem.</p></div>`;
  };
  const tabelaDefesa = l => {
    if (!l.some(x => x.tdef)) return '';
    const tipos = [...new Set(l.map(x => x.tdef).filter(Boolean))];
    const gr = [...tipos.map(t => [t, l.filter(x => x.tdef === t)]), ['Sem registo', l.filter(x => !x.tdef)]].filter(([, g]) => g.length);
    return `<section class="bloco"><h2>Tipo de defesa nos cantos</h2><div class="tabela-env"><table class="tabela compacta et-def"><thead><tr><th>Defesa de ${esc(eq)}</th><th class="num">Cantos</th><th class="num">Jogos</th><th class="num">1.º contacto do adversário</th><th class="num">Remates</th><th class="num">Golos</th></tr></thead>
      <tbody>${gr.map(([k, g]) => { const s = estEP(g); return `<tr><td><b>${esc(k)}</b></td><td class="num"><b>${g.length}</b> (${pctEP(g.length, l.length)})</td><td class="num">${new Set(g.map(x => x.opp)).size}</td><td class="num">${pctEP(s.c, g.length)}</td><td class="num">${s.r}</td><td class="num">${s.g}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  };
  const pags = [];
  for (const [p, sec, suf] of [['favor', 'Esquemas ofensivos', 'a favor'], ['contra', 'Esquemas defensivos', 'contra']]) {
    for (const t of ['Canto', 'Livre']) {
      const l = L[p][t]; if (!l.length) continue;
      const n = l.length, s = estEP(l), esq = l.filter(x => x.e.corredor === 'Esquerdo').length, dir = l.filter(x => x.e.corredor === 'Direito').length;
      const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
      const nome = `${t}s ${suf}`;
      const placar = `<section class="placar">${cel(`${t}s por jogo`, pj(n), `${n} em ${nj} jogos · ${esq} da esquerda · ${dir} da direita`)}${cel('1.º contacto ganho', pctEP(s.c, n), `${s.c} de ${n}`)}${cel('Com remate', pctEP(s.r, n), `${s.r} (inclui 2.ª vaga)`)}${cel('Golos', s.g, s.g ? `1 golo a cada ${Math.round(n / s.g)}` : 'nenhum')}</section>`;
      pags.push(slide(`${topo(nome, p === 'favor' ? 'Onde cai a bola: zona 1 é sempre o 1.º poste, o mais próximo de onde se bate.' : 'Onde cai a bola, nos esquemas dos adversários: zona 1 é sempre o 1.º poste. Lado visto por quem bate.', sec)}
        <div class="et-corpo">${placar}<section class="bloco ep-onde">${mapasPorLadoEP(l)}<div class="ana-grelha dois ep-onde-barras">${barras('1.º contacto', contarPor(l, x => x.e.primeiro_contacto), n)}${barras('Resultado', contarPor(l, x => x.e.resultado), n)}</div></section></div>`));
      const temJog = l.some(x => x.e.jogador || x.e.referencia);
      const comDef = p === 'contra' && t === 'Canto' && l.some(x => x.tdef);
      const hxh = p === 'favor' ? tabelaHxH(l) : '';
      pags.push(slide(`${topo(nome, temJog ? 'Como se bate e quem bate.' : 'Como se bate.', sec)}
        <div class="et-corpo"><section class="bloco"><h2>Como se bate</h2><div class="ana-grelha ${t === 'Livre' || comDef ? 'quatro' : 'tres'}">
          ${barras('Mecanismo', contarPor(l, x => x.e.mecanismo), n)}${barras('Tipo de bola', contarPor(l, x => x.e.tipo_bola), n)}${barras('Lado', contarPor(l, x => x.e.corredor), n)}${t === 'Livre' ? barras('Distância', contarPor(l, x => x.e.distancia), n) : ''}${comDef ? barras(`Como defende ${esc(eq)}`, contarPor(l, x => x.tdef || 'Sem registo'), n) : ''}</div></section>
          ${temJog ? `<section class="bloco ep-jogadores"><h2>Jogadores</h2><div class="ana-grelha ${hxh ? 'tres et-jog3' : 'dois'}">${tabelaJogadoresEP('Batedores', l, 'jogador', 6)}${tabelaJogadoresEP('Referências', l, 'referencia', 6)}${hxh}</div></section>`
            : `${comDef ? tabelaDefesa(l) : ''}<section class="bloco"><h2>Jogos</h2>${barras(`${t}s por adversário`, contarPor(l, x => x.opp), n, { max: 10 })}</section>`}
        </div>`));
    }
  }
  return [capa, vg, ...pags].join('');
}

App.relEPEdit = App.relEPEdit || {};
function dialogoExportarEsquemas(eq) {
  const chave = norm(eq);
  const ed = App.relEPEdit[chave] || { capa: infoCapaOp(eq, App.ana || {}), conclusoes: conclusoesEsquemas(eq).map(([l, t, d]) => [t, d, l]) };
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  const linha = (c, i) => `<div class="exp-concl" data-i="${i}">
      <select aria-label="Ataque ou defesa"><option value="ataque" ${c[2] !== 'defesa' ? 'selected' : ''}>Ataque</option><option value="defesa" ${c[2] === 'defesa' ? 'selected' : ''}>Defesa</option></select>
      <div><input type="text" value="${esc(c[0])}" aria-label="Conclusão"><textarea rows="2" aria-label="Detalhe">${esc(c[1])}</textarea></div>
      <button class="btn-link perigo" type="button" data-tirar aria-label="Tirar esta conclusão">Tirar</button></div>`;
  const desenhar = () => {
    d.innerHTML = `<h2>Esquemas táticos (16:9): ${esc(eq)}</h2>
      <p class="nota">Diapositivos 16:9: capa, visão geral com as conclusões e, para cantos e livres a favor e contra, onde cai a bola e como se bate.</p>
      <label class="exp-campo">Linha de baixo da capa<input type="text" id="exp-capa" value="${esc(ed.capa)}"><small class="nota">Separe as partes com •, por exemplo: LIGA EUROPA • Fase de liga • 26 nov 2026</small></label>
      <h3 class="exp-tit">Conclusões da visão geral</h3>
      <p class="nota sem-margem">Sugeridas a partir dos dados. Pode reescrever, tirar ou acrescentar.</p>
      <div id="exp-lista">${ed.conclusoes.map(linha).join('')}</div>
      <div class="exp-acoes-lista"><button class="btn-link" type="button" id="exp-mais">+ Acrescentar conclusão</button><button class="btn-link" type="button" id="exp-repor">Repor as automáticas</button></div>
      <div class="acoes"><button class="btn" value="nao" type="button">Cancelar</button><button class="btn btn-prim" type="button" id="exp-ok">Exportar PDF</button></div>`;
  };
  const ler = () => {
    ed.capa = $('#exp-capa', d).value;
    ed.conclusoes = $$('.exp-concl', d).map(el => [$('input', el).value.trim(), $('textarea', el).value.trim(), $('select', el).value]).filter(c => c[0] || c[1]);
    App.relEPEdit[chave] = ed;
  };
  desenhar(); document.body.appendChild(d); d.showModal();
  d.addEventListener('cancel', () => d.remove());
  d.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.matches('[data-tirar]')) { ler(); ed.conclusoes.splice(Number(b.closest('.exp-concl').dataset.i), 1); desenhar(); return; }
    if (b.id === 'exp-mais') { ler(); ed.conclusoes.push(['', '', 'ataque']); desenhar(); $$('.exp-concl input', d).at(-1)?.focus(); return; }
    if (b.id === 'exp-repor') { ed.conclusoes = conclusoesEsquemas(eq).map(([l, t, dd]) => [t, dd, l]); desenhar(); return; }
    if (b.value === 'nao') { ler(); d.close(); d.remove(); return; }
    if (b.id === 'exp-ok') {
      ler(); b.disabled = true;
      try {
        const html = relEsquemas(eq, { capa: ed.capa, conclusoes: ed.conclusoes.map(([t, dd, l]) => [l, t, dd]) });
        await gerarPdfDiapositivos(html, `Esquemas táticos ${eq} ${hojeIso()}`, (i, n) => { b.textContent = `A preparar ${i}/${n}…`; }, 'sl-et');
        d.close(); d.remove(); toast('PDF exportado.');
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'Exportar PDF'; toast('Não foi possível gerar o PDF.', 'erro'); }
    }
  });
}
