// ---------- Análise de oportunidades (todas as equipas do campeonato) ----------
App.ana = { equipa: null, persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos', mapa: 'zonas' };

function equipasCodificaveis() {
  const s = new Map();
  for (const a of App.idx.alvos || []) for (const n of [a.casa, a.fora]) if (!s.has(norm(n))) s.set(norm(n), n);
  return [...s.values()].sort((a, b) => a.localeCompare(b, 'pt'));
}
const ladoDaEquipa = (a, eq) => (mesmaEquipa(a.casa, eq) || norm(a.casa) === norm(eq) ? 'casa' : mesmaEquipa(a.fora, eq) || norm(a.fora) === norm(eq) ? 'fora' : null);

// Jogos codificados da equipa (com pelo menos uma oportunidade), já filtrados.
function jogosDaEquipa(eq, f) {
  let js = (App.idx.alvos || []).filter(a => ladoDaEquipa(a, eq) && (App.idx.eventosAlvo[a.key] || []).length);
  if (f.local !== 'todos') js = js.filter(a => ladoDaEquipa(a, eq) === f.local);
  if (f.adversario !== 'todos') js = js.filter(a => mesmaEquipa(a[ladoDaEquipa(a, eq) === 'casa' ? 'fora' : 'casa'], f.adversario));
  js.sort((a, b) => (a.jornada ?? 999) - (b.jornada ?? 999) || String(a.data || '').localeCompare(String(b.data || '')));
  if (f.periodo !== 'todos') js = js.slice(-Number(f.periodo));
  return js;
}
function oportunidadesDe(eq, f, jogos) {
  const out = [];
  for (const a of jogos) {
    const meu = ladoDaEquipa(a, eq);
    for (const e of App.idx.eventosAlvo[a.key] || []) {
      const l = ladoNoAlvo(e, a);
      if ((f.persp === 'criadas') !== (l === meu)) continue;
      const o = dadosOportunidade(e);
      if (f.golos && !o.golo) continue;
      if (f.momento !== 'todos' && o.momento !== f.momento) continue;
      out.push({ e, o, a, cor: f.persp === 'criadas' ? 'nos' : 'adversario' });
    }
  }
  return out;
}

function barras(titulo, entradas, total, { max = 10, vazio = 'Sem dados' } = {}) {
  const lista = entradas.filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  const mostrar = lista.slice(0, max); const resto = lista.slice(max).reduce((s, [, n]) => s + n, 0);
  const topo = Math.max(1, ...mostrar.map(([, n]) => n));
  return `<div class="ana-barras"><h3>${titulo}</h3>${mostrar.length ? `<ul>${mostrar.map(([k, n]) => `<li><span class="ana-rot" title="${esc(k)}">${esc(k)}</span><span class="ana-pista"><i style="width:${n / topo * 100}%"></i></span><span class="ana-val">${n}<small>${total ? ` · ${fmtNum(n / total * 100, 0)}%` : ''}</small></span></li>`).join('')}</ul>${resto ? `<p class="nota">E mais ${resto} noutras categorias.</p>` : ''}` : `<p class="fraco">${vazio}</p>`}</div>`;
}
const contarPor = (lista, fn) => { const c = new Map(); for (const x of lista) { const k = fn(x); if (k) c.set(k, (c.get(k) || 0) + 1); } return [...c.entries()]; };

// Meio-campo ofensivo na vertical (baliza em cima), com as zonas do método do departamento.
// pontos: {x, y} (coordenadas) ou {z, g} (zona já calculada e se foi golo). opcoes.dim torna as zonas clicáveis (filtros da página).
function mapaZonas(tipo, pontos, opcoes = {}) {
  const conta = Array(14).fill(0), golos = Array(14).fill(0);
  for (const p of pontos) { const z = p.z ?? (tipo === 'passe' ? zonaPasse(p.x, p.y) : zonaFinalizacao(p.x, p.y)); if (z) { conta[z]++; if (p.g) golos[z]++; } }
  const max = Math.max(1, ...conta.slice(1, 13));
  const alfa = n => (n ? 0.12 + 0.68 * n / max : 0);
  const { dim, sel, dica } = opcoes;
  const attrs = z => dim ? ` role="button" tabindex="0" data-dim="${dim}" data-val="${z}" data-tip="${esc(dica ? dica(z, conta[z], golos[z]) : `Zona ${z}: ${conta[z]}`)}"` : '';
  const cls = z => `zona${dim ? ' clicavel' : ''}${sel != null ? (Number(sel) === z ? ' on' : ' esb') : ''}`;
  const W = 68, rect = (x, y, w, h, z) => `<g class="${cls(z)}"${attrs(z)}><rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill-opacity:${alfa(conta[z])}"/><text x="${x + w / 2}" y="${y + h / 2}" class="${alfa(conta[z]) > 0.5 ? 'claro' : ''}">${conta[z]}</text>${dim ? '' : `<title>Zona ${z}: ${conta[z]}</title>`}</g>`;
  const linhas = `<g class="linhas-v"><rect x="0" y="0" width="${W}" height="${tipo === 'passe' ? 52.5 : 30}"/><rect x="${M.areaY0}" y="0" width="${M.areaY1 - M.areaY0}" height="16.5"/><rect x="${M.peqY0}" y="0" width="${M.peqY1 - M.peqY0}" height="5.5"/><rect x="${W / 2 - 3.66}" y="-1.6" width="7.32" height="1.6"/><path d="M${W / 2 - 7.3} 16.5 A9.15 9.15 0 0 0 ${W / 2 + 7.3} 16.5"/>${tipo === 'passe' ? `<path d="M${W / 2 - 9.15} 52.5 A9.15 9.15 0 0 1 ${W / 2 + 9.15} 52.5"/>` : ''}</g>`;
  let zonas = '';
  if (tipo === 'passe') {
    FAIXAS_PASSE.forEach(([d0, d1], r) => CORR_PASSE.forEach(([y0, y1], c) => { zonas += rect(y0, d0, y1 - y0, d1 - d0, r * 3 + c + 1); }));
    return `<svg class="mapa-zonas" viewBox="-2 -3 72 61" role="img" aria-label="Zonas do passe">${zonas}${linhas}</svg><p class="mapa-fora${dim ? ' clicavel' : ''}${sel != null ? (Number(sel) === 13 ? ' on' : ' esb') : ''}"${attrs(13)}>Meio-campo defensivo (zona 13): <b>${conta[13]}</b></p>`;
  }
  FAIXAS_FIN.forEach(([d0, d1], r) => COLS_FIN.forEach(([y0, y1], c) => { zonas += rect(y0, d0, y1 - y0, d1 - d0, r * 4 + c + 1); }));
  return `<svg class="mapa-zonas" viewBox="-2 -3 72 35" role="img" aria-label="Zonas de finalização">${zonas}${linhas}<g class="${dim ? 'clicavel' : ''}${sel != null ? (Number(sel) === 13 ? ' on' : ' esb') : ''}"${attrs(13)}><text x="${W / 2}" y="24.5" class="fora-area">Fora da área (zona 13): ${conta[13]}</text></g></svg>`;
}

// ---- Página interativa: clicar numa barra, coluna ou zona filtra todos os gráficos (e mostra os lances) ----
const DIM_OP = {
  momento: { rot: 'Momento', fn: x => x.o.momento },
  sub: { rot: 'Sub-momento', fn: x => x.o.sub },
  mecanismo: { rot: 'Mecanismo', fn: x => x.o.mecanismo },
  lado: { rot: 'Lado', fn: (x, esp) => ladoOp(x, esp) },
  parte: { rot: 'Parte', fn: x => x.o.parte },
  tempo: { rot: 'Tempo', fn: x => x.o.tempo },
  zpasse: { rot: 'Zona do passe', fn: (x, esp) => x.e.passe_x != null ? zonaPasse(x.e.passe_x, esp ? 100 - x.e.passe_y : x.e.passe_y) : null },
  zfin: { rot: 'Zona de finalização', fn: (x, esp) => x.e.zona_x != null ? zonaFinalizacao(x.e.zona_x, esp ? 100 - x.e.zona_y : x.e.zona_y) : null },
  jogador: { rot: 'Finalizador', fn: x => x.e.jogador },
  assistente: { rot: 'Último passe', fn: x => x.e.assistente },
  posfin: { rot: 'Posição de quem finaliza', fn: x => x.e.posicao_finalizador },
  pospasse: { rot: 'Posição de quem faz o passe', fn: x => x.e.posicao_passe },
  jogo: { rot: 'Jogo', fn: x => x.a.key }
};
App.ana.sel = App.ana.sel || {};

function desenharPaginaOportunidades() {
  const v = $('#vista'); const F = App.ana; F.sel = F.sel || {};
  const equipas = equipasCodificaveis();
  if (!equipas.length || !App.d.eventos.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Oportunidades</h1></div><div class="vazio"><p>Ainda não há oportunidades codificadas.</p>${pode() ? '<p>Codifique jogos em <a href="#codificacao">Codificação</a> ou importe a folha de oportunidades em <a href="#importacao">Importação</a>.</p>' : ''}</div>`;
    return;
  }
  if (!F.equipa || !equipas.includes(F.equipa)) F.equipa = equipas.find(e => eNossaEquipa(e)) || equipas.find(e => norm(e) === norm(nomeNosso())) || equipas[0];
  const fBase = { ...F, momento: 'todos' };
  const jogos = jogosDaEquipa(F.equipa, fBase);
  const esp = F.persp === 'sofridas';
  const base = oportunidadesDe(F.equipa, { ...fBase, golos: F.golos }, jogos);
  const valor = (x, d) => DIM_OP[d].fn(x, esp);
  const sel = F.sel;
  const filtra = (l, menos) => l.filter(x => Object.entries(sel).every(([d, val]) => d === menos || String(valor(x, d)) === String(val)));
  const ops = filtra(base);
  const adversarios = [...new Set((App.idx.alvos || []).filter(a => ladoDaEquipa(a, F.equipa)).map(a => a[ladoDaEquipa(a, F.equipa) === 'casa' ? 'fora' : 'casa']))].sort((a, b) => a.localeCompare(b, 'pt'));
  const g = l => l.filter(x => x.o.golo).length;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const coisa = F.golos ? ['golo', 'golos'] : ['oportunidade', 'oportunidades'];
  const nomeJogo = a => { const adv = a[ladoDaEquipa(a, F.equipa) === 'casa' ? 'fora' : 'casa']; return `${a.jornada != null ? `J${a.jornada} · ` : a.data ? fmtData(a.data, true) + ' · ' : ''}${adv} (${ladoDaEquipa(a, F.equipa) === 'casa' ? 'C' : 'F'})`; };
  const rotVal = (d, val) => d === 'jogo' ? nomeJogo(jogos.find(a => a.key === val) || {}) : d === 'zpasse' || d === 'zfin' ? `Zona ${val}` : val;
  const dica = (k, l, n) => `${k}: ${pl(l.length, ...coisa)}${n ? ` (${pct(l.length, n)})` : ''}${F.golos ? '' : ` · ${pl(g(l), 'golo', 'golos')}${l.length ? ` (${pct(g(l), l.length)} de conversão)` : ''}`}`;

  // Barras clicáveis: o gráfico de cada dimensão usa todos os filtros menos o seu (vê-se o resto das opções).
  const barrasI = (d, titulo, { max = 8, total = true, fixo = null, ordem = null } = {}) => {
    const l = filtra(base, d); const c = new Map();
    for (const x of l) { const k = valor(x, d); if (k == null || k === '') continue; if (!c.has(k)) c.set(k, []); c.get(k).push(x); }
    let e = fixo ? fixo.map(k => [k, c.get(k) || []]).filter(([, a]) => a.length) : [...c.entries()].sort((a, b) => b[1].length - a[1].length || g(b[1]) - g(a[1]));
    if (ordem) e.sort(ordem);
    const ativo = sel[d] != null;
    const resto = e.slice(max).reduce((s, [, a]) => s + a.length, 0); e = e.slice(0, max);
    const alto = Math.max(1, ...e.map(([, a]) => a.length));
    return `<div class="ana-barras ib ${esp ? 'sofridas' : 'criadas'}"><h3>${titulo}${ativo ? ` <button class="ib-limpar so-ecra" data-limpar="${d}" type="button">limpar</button>` : ''}</h3>${e.length ? `<ul>${e.map(([k, a]) => {
      const on = ativo && String(sel[d]) === String(k);
      return `<li class="${on ? 'on' : ativo ? 'esb' : ''}" role="button" tabindex="0" data-dim="${d}" data-val="${esc(String(k))}" data-tip="${esc(dica(rotVal(d, k), a, total ? l.length : 0))}" aria-pressed="${on}"><span class="ana-rot">${esc(rotVal(d, k))}</span><span class="ana-pista"><i style="width:${a.length / alto * 100}%">${!F.golos && g(a) ? `<s style="width:${g(a) / a.length * 100}%"></s>` : ''}</i></span><span class="ana-val">${a.length}<small>${total ? ` · ${pct(a.length, l.length)}` : ''}</small>${!F.golos && g(a) ? `<em>${g(a)}</em>` : ''}</span></li>`; }).join('')}</ul>${resto ? `<p class="nota">E mais ${resto} noutras categorias.</p>` : ''}` : '<p class="fraco">Sem dados</p>'}</div>`;
  };
  const tempoI = () => {
    const l = filtra(base, 'tempo'); const ativo = sel.tempo != null;
    const t = TEMPOS.filter(x => x !== 'Prolongamento' || l.some(y => y.o.tempo === x)).map(x => [x, l.filter(y => y.o.tempo === x)]);
    const max = Math.max(1, ...t.map(([, a]) => a.length));
    return `<div class="ana-barras ib ${esp ? 'sofridas' : 'criadas'}"><h3>Tempo${ativo ? ' <button class="ib-limpar so-ecra" data-limpar="tempo" type="button">limpar</button>' : ''}</h3><div class="ana-colunas">${t.map(([k, a]) => {
      const on = ativo && sel.tempo === k;
      return `<div class="ana-col ${on ? 'on' : ativo ? 'esb' : ''}" role="button" tabindex="0" data-dim="tempo" data-val="${k}" data-tip="${esc(dica(k === 'Prolongamento' ? '90+' : k + ' min', a, l.length))}"><span class="ana-col-val">${a.length}</span><span class="ana-col-barra"><i style="height:${a.length / max * 100}%">${!F.golos && g(a) ? `<s style="height:${g(a) / a.length * 100}%"></s>` : ''}</i></span><span class="ana-col-rot">${k === 'Prolongamento' ? '90+' : k}</span></div>`; }).join('')}</div></div>`;
  };
  const mapaI = (tipo) => {
    const d = tipo === 'passe' ? 'zpasse' : 'zfin'; const l = filtra(base, d);
    return mapaZonas(tipo, l.map(x => ({ z: valor(x, d), g: x.o.golo })).filter(p => p.z), { dim: d, sel: sel[d], dica: (z, n, gg) => `Zona ${z}: ${pl(n, ...coisa)}${l.length ? ` (${pct(n, l.length)})` : ''}${F.golos ? '' : ` · ${pl(gg, 'golo', 'golos')}`}` });
  };
  const chips = Object.entries(sel).map(([d, val]) => `<button class="chip-filtro" type="button" data-limpar="${d}">${esc(DIM_OP[d].rot)}: <b>${esc(rotVal(d, val))}</b><span aria-hidden="true">×</span></button>`).join('');
  const top = fn => { const c = contarPor(ops, fn).sort((a, b) => b[1] - a[1]); return c[0] || null; };
  const fin = top(x => x.e.jogador), pas = top(x => x.e.assistente);
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  const njSel = sel.jogo ? 1 : jogos.length;
  const rc = jogos.length ? conclusoesRecorte(F.equipa, F, sel, (x, d, e) => DIM_OP[d].fn(x, e)) : null;
  v.innerHTML = `<div class="ana-pag">
    <div class="cabecalho-vista">
      <div><h1>${F.golos ? `Golos ${esp ? 'sofridos' : 'marcados'}` : `Oportunidades ${esp ? 'sofridas' : 'criadas'}`}: ${esc(F.equipa)}</h1>
        <p class="nota">${pl(jogos.length, 'jogo codificado', 'jogos codificados')}${F.adversario !== 'todos' ? ` contra ${esc(F.adversario)}` : ''}${F.local !== 'todos' ? `, ${F.local === 'casa' ? 'em casa' : 'fora'}` : ''}. Clique numa barra, coluna ou zona para filtrar todos os gráficos; volte a clicar para tirar o filtro.${esp ? ' Nas sofridas, o lado e os mapas são os da equipa a defender.' : ''}</p></div>
      <button class="btn so-ecra botao-pdf" id="b-pdf" ${jogos.length ? '' : 'disabled'}>${iconePdf()}Exportar PDF</button>
    </div>
    <div class="filtros so-ecra" role="group" aria-label="Filtros">
      <label>Equipa<select id="a-equipa">${equipas.map(e => `<option ${e === F.equipa ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
      <div class="segmentado" role="radiogroup" aria-label="Oportunidades"><label><input type="radio" name="a-persp" value="criadas" ${!esp ? 'checked' : ''}><span>Criadas</span></label><label><input type="radio" name="a-persp" value="sofridas" ${esp ? 'checked' : ''}><span>Sofridas</span></label></div>
      <label>Adversário<select id="a-adv"><option value="todos">Todos</option>${adversarios.map(e => `<option ${e === F.adversario ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
      <label>Local<select id="a-local"><option value="todos">Casa e fora</option><option value="casa" ${F.local === 'casa' ? 'selected' : ''}>Casa</option><option value="fora" ${F.local === 'fora' ? 'selected' : ''}>Fora</option></select></label>
      <label>Período<select id="a-periodo"><option value="todos">Todos os jogos</option>${[3, 5, 10].map(n => `<option value="${n}" ${String(F.periodo) === String(n) ? 'selected' : ''}>Últimos ${n} jogos</option>`).join('')}</select></label>
      <label class="em-linha caixa ana-golos"><input type="checkbox" id="a-golos" ${F.golos ? 'checked' : ''}> Só golos</label>
    </div>
    ${chips ? `<div class="chips-filtro so-ecra"><span>Filtros:</span>${chips}<button class="btn-link" type="button" id="a-limpar-tudo">Limpar tudo</button></div>` : ''}
    ${jogos.length ? `
    <section class="placar" aria-label="Resumo">
      ${cel('Jogos', njSel)}
      ${cel(F.golos ? 'Golos' : 'Oportunidades', ops.length, njSel ? `${fmtNum(ops.length / njSel, 1)} por jogo` : '')}
      ${F.golos ? '' : cel('Golos', g(ops), ops.length ? `${pct(g(ops), ops.length)} de conversão` : '')}
      ${cel('Bola corrida / esquemas', `${ops.filter(x => x.o.momento !== 'Esquema tático').length}<i>/</i>${ops.filter(x => x.o.momento === 'Esquema tático').length}`)}
      ${fin ? cel('Mais finalizações', esc(fin[0]), pl(fin[1], ...coisa)) : ''}
      ${pas ? cel('Mais passes', esc(pas[0]), pl(pas[1], ...coisa)) : ''}
    </section>
    ${rc ? `<section class="bloco ana-concl ${esp ? 'sofridas' : 'criadas'}"><h2>${Object.keys(sel).length ? 'O que sobressai neste recorte' : 'O que sobressai'}</h2>
      <p class="nota sem-margem">${Object.keys(sel).length ? 'Comparado com as outras equipas no mesmo recorte.' : `Os maiores desvios de ${esc(F.equipa)} em relação às outras equipas codificadas.`} Mudam conforme os filtros e os cliques.</p>
      ${rc.contexto.length ? `<p class="ana-concl-ctx">${rc.contexto.map(esc).join('<br>')}</p>` : ''}
      ${rc.itens.length ? `<ol>${rc.itens.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>` : ''}
      ${rc.aviso ? `<p class="fraco">${esc(rc.aviso)}</p>` : ''}</section>` : ''}
    <section class="bloco">
      <div class="ana-grelha tres">
        ${barrasI('momento', 'Momento', { fixo: MOMENTOS_REL.map(([m]) => m) })}
        ${barrasI('sub', 'Sub-momento')}
        ${barrasI('mecanismo', 'Mecanismo')}
      </div>
    </section>
    <section class="bloco">
      <div class="ana-grelha tres">
        ${barrasI('lado', esp ? 'Lado (a defender)' : 'Lado', { fixo: CORREDORES })}
        ${barrasI('parte', 'Parte', { fixo: ['1.ª parte', '2.ª parte', 'Prolongamento'] })}
        ${tempoI()}
      </div>
    </section>
    <section class="bloco">
      <div class="bloco-cab"><h2>Onde</h2></div>
      <div class="ana-mapas">
        <figure><figcaption>Zona do passe</figcaption>${mapaI('passe')}</figure>
        <figure><figcaption>Zona de finalização</figcaption>${mapaI('fin')}</figure>
      </div><p class="nota">${esp ? 'Lados da equipa a defender: à esquerda do desenho fica o lado esquerdo da equipa.' : 'A atacar para cima; o lado esquerdo do desenho é o lado esquerdo de quem ataca.'} Clique numa zona para filtrar.</p>
    </section>
    <section class="bloco">
      <div class="ana-grelha dois">
        ${barrasI('jogador', 'Quem finaliza', { total: false })}
        ${barrasI('assistente', 'Quem faz o último passe', { total: false })}
        ${barrasI('posfin', 'Posição de quem finaliza')}
        ${barrasI('pospasse', 'Posição de quem faz o passe')}
      </div>
    </section>
    <section class="bloco">
      <div class="ana-jogos">${barrasI('jogo', 'Por jogo', { max: 40, total: false, ordem: (a, b) => jogos.findIndex(j => j.key === a[0]) - jogos.findIndex(j => j.key === b[0]) })}</div>
    </section>
    <section class="bloco so-ecra">
      <div class="ana-lances"><h3>${Object.keys(sel).length ? `Os ${pl(ops.length, ...coisa)} com estes filtros` : `Todas as ${coisa[1]}`}</h3>
        <div class="tabela-env ana-lances-tab"><table class="tabela compacta"><thead><tr><th>Jogo</th><th>Tempo</th><th>Momento</th><th>Mecanismo</th><th>Finalizador</th><th>Passe</th><th></th></tr></thead><tbody>
        ${ops.slice(0, 200).map(x => `<tr><td>${esc(nomeJogo(x.a))}</td><td>${esc(x.o.tempo || '')}</td><td>${esc(x.o.sub || x.o.momento || '')}</td><td>${esc(x.o.mecanismo || '')}</td><td>${esc(x.e.jogador || '')}</td><td>${esc(x.e.assistente || '')}</td><td>${x.o.golo ? '<b class="ana-golo">Golo</b>' : ''}</td></tr>`).join('')}
        </tbody></table></div>${ops.length > 200 ? `<p class="nota">Mostram-se as primeiras 200.</p>` : ''}</div>
    </section>` : '<div class="vazio"><p>Esta equipa ainda não tem jogos codificados com estes filtros.</p></div>'}
    <section class="bloco so-ecra" id="a-liga"></section></div>`;
  const raiz = $('.ana-pag', v);
  const mudar = (k, val) => { F[k] = val; if (k === 'equipa') { F.adversario = 'todos'; F.sel = {}; } if (k === 'persp' || k === 'adversario' || k === 'local' || k === 'periodo') F.sel = {}; desenharPaginaOportunidades(); };
  $('#a-equipa').addEventListener('change', e => mudar('equipa', e.target.value));
  $$('input[name=a-persp]').forEach(r => r.addEventListener('change', () => mudar('persp', r.value)));
  $('#a-adv').addEventListener('change', e => mudar('adversario', e.target.value));
  $('#a-local').addEventListener('change', e => mudar('local', e.target.value));
  $('#a-periodo').addEventListener('change', e => mudar('periodo', e.target.value));
  $('#a-golos').addEventListener('change', e => mudar('golos', e.target.checked));
  $('#b-pdf').addEventListener('click', () => exportarPdf(`${F.golos ? 'Golos' : 'Oportunidades'} ${esp ? (F.golos ? 'sofridos' : 'sofridas') : (F.golos ? 'marcados' : 'criadas')} ${F.equipa} ${hojeIso()}`));
  const alternar = (d, val) => { if (String(sel[d]) === String(val)) delete sel[d]; else sel[d] = val; const y = window.scrollY; desenharPaginaOportunidades(); window.scrollTo(0, y); };
  raiz.addEventListener('click', ev => {
    const lim = ev.target.closest('[data-limpar]'); if (lim) { delete sel[lim.dataset.limpar]; const y = window.scrollY; desenharPaginaOportunidades(); window.scrollTo(0, y); return; }
    if (ev.target.closest('#a-limpar-tudo')) { F.sel = {}; const y = window.scrollY; desenharPaginaOportunidades(); window.scrollTo(0, y); return; }
    const el = ev.target.closest('[data-dim]'); if (el) alternar(el.dataset.dim, el.dataset.dim === 'zpasse' || el.dataset.dim === 'zfin' ? Number(el.dataset.val) : el.dataset.val);
  });
  raiz.addEventListener('keydown', ev => { const el = ev.target.closest('[data-dim]'); if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); el.click(); } });
  ativarDicas(raiz);
  desenharTabelaLiga();
}

// Dica que segue o rato (barras, colunas e zonas com data-tip).
function ativarDicas(raiz) {
  let tip = $('#dica-graf');
  if (!tip) { tip = document.createElement('div'); tip.id = 'dica-graf'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tip.classList.remove('on');
  const mostrar = (el, x, y) => { tip.textContent = el.dataset.tip; tip.classList.add('on'); const r = tip.getBoundingClientRect(); tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px'; tip.style.top = Math.max(8, y - r.height - 10) + 'px'; };
  raiz.addEventListener('mousemove', e => { const el = e.target.closest('[data-tip]'); if (el) mostrar(el, e.clientX, e.clientY); else tip.classList.remove('on'); });
  raiz.addEventListener('mouseleave', () => tip.classList.remove('on'));
  raiz.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); mostrar(el, r.left, r.top); } });
  raiz.addEventListener('focusout', () => tip.classList.remove('on'));
}

function colunasTempo(ops) {
  const n = TEMPOS.map(t => ops.filter(x => x.o.tempo === t).length);
  const mostrar = TEMPOS.map((t, i) => [t, n[i]]).filter(([t, c]) => t !== 'Prolongamento' || c);
  const max = Math.max(1, ...n);
  return `<div class="ana-colunas">${mostrar.map(([t, c]) => `<div class="ana-col" title="${t}: ${c}"><span class="ana-col-val">${c}</span><span class="ana-col-barra"><i style="height:${c / max * 100}%"></i></span><span class="ana-col-rot">${t === 'Prolongamento' ? '90+' : t}</span></div>`).join('')}</div>`;
}

function desenharTabelaLiga() {
  const el = $('#a-liga'); const F = App.ana;
  const f = { ...F, adversario: 'todos', local: 'todos', momento: 'todos', golos: false };
  const linhas = equipasCodificaveis().map(eq => {
    const js = jogosDaEquipa(eq, f); if (!js.length) return null;
    const cri = oportunidadesDe(eq, { ...f, persp: 'criadas' }, js), sof = oportunidadesDe(eq, { ...f, persp: 'sofridas' }, js);
    const gc = cri.filter(x => x.o.golo).length, gs = sof.filter(x => x.o.golo).length;
    return { eq, j: js.length, c: cri.length / js.length, s: sof.length / js.length, gc, gs, conv: cri.length ? gc / cri.length * 100 : null, convS: sof.length ? gs / sof.length * 100 : null };
  }).filter(Boolean).sort((a, b) => b.c - a.c);
  if (linhas.length < 2) { el.remove(); return; }
  el.innerHTML = `
    <h2>Todas as equipas</h2>
    <p class="nota">Por jogo codificado${F.periodo !== 'todos' ? `, nos últimos ${F.periodo} jogos de cada equipa` : ''}. Clique numa equipa para a analisar.</p>
    <div class="tabela-env"><table class="tabela compacta classificacao">
      <thead><tr><th>Equipa</th><th class="num">Jogos</th><th class="num">Criadas / jogo</th><th class="num">Sofridas / jogo</th><th class="num">Golos</th><th class="num">Conversão</th><th class="num">Conversão sofrida</th></tr></thead>
      <tbody>${linhas.map(l => `<tr class="${l.eq === F.equipa ? 'nossa' : ''} clicavel" data-eq="${esc(l.eq)}" tabindex="0"><td>${esc(l.eq)}</td><td class="num">${l.j}</td><td class="num"><b>${fmtNum(l.c, 1)}</b></td><td class="num">${fmtNum(l.s, 1)}</td><td class="num">${l.gc}–${l.gs}</td><td class="num">${fmtNum(l.conv, 0)}%</td><td class="num">${fmtNum(l.convS, 0)}%</td></tr>`).join('')}</tbody>
    </table></div>`;
  $$('[data-eq]', el).forEach(r => { const ir = () => { F.equipa = r.dataset.eq; F.adversario = 'todos'; F.sel = {}; desenharPaginaOportunidades(); window.scrollTo(0, 0); }; r.addEventListener('click', ir); r.addEventListener('keydown', e => { if (e.key === 'Enter') ir(); }); });
}
