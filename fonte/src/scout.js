// ---------- Scout (só o departamento) ----------
// Equipas e jogadores de outras equipas, vindos do Transfermarkt (plantel, foto, dados) e das exportações
// do Wyscout (estatísticas). Cada jogador tem uma avaliação: rendimento, potencial e margem de venda (1 a 5) e um comentário.
// A tabela das avaliações já aceita várias por jogador (para o futuro); por agora usa-se só a mais recente.

const SC_PARAMS = [
  { k: 'rendimento', nome: 'Rendimento', curto: 'Rend.', niveis: ['Abaixo do nível', 'Razoável', 'Bom', 'Muito bom', 'Excelente'] },
  { k: 'potencial', nome: 'Potencial', curto: 'Pot.', niveis: ['Baixo', 'Razoável', 'Bom', 'Muito bom', 'Excelente'] },
  { k: 'margem_venda', nome: 'Margem de venda', curto: 'Venda', niveis: ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta'] }
];
const SC_POSICOES = ['Guarda-redes', 'Defesa central', 'Lateral direito', 'Lateral esquerdo', 'Médio defensivo', 'Médio centro', 'Médio ofensivo', 'Extremo direito', 'Extremo esquerdo', 'Ponta de lança'];
// Códigos de posição do Wyscout (inglês e português).
const SC_POS_WY = {
  gk: 'Guarda-redes', gr: 'Guarda-redes',
  cb: 'Defesa central', lcb: 'Defesa central', rcb: 'Defesa central', dc: 'Defesa central', dce: 'Defesa central', dcd: 'Defesa central',
  rb: 'Lateral direito', rwb: 'Lateral direito', dd: 'Lateral direito', ld: 'Lateral direito',
  lb: 'Lateral esquerdo', lwb: 'Lateral esquerdo', de: 'Lateral esquerdo', le: 'Lateral esquerdo',
  dmf: 'Médio defensivo', ldmf: 'Médio defensivo', rdmf: 'Médio defensivo', mdf: 'Médio defensivo', md: 'Médio defensivo',
  cmf: 'Médio centro', lcmf: 'Médio centro', rcmf: 'Médio centro', mc: 'Médio centro', mce: 'Médio centro', mcd: 'Médio centro',
  amf: 'Médio ofensivo', mo: 'Médio ofensivo', mco: 'Médio ofensivo',
  rw: 'Extremo direito', rwf: 'Extremo direito', ramf: 'Extremo direito', ed: 'Extremo direito', rm: 'Extremo direito',
  lw: 'Extremo esquerdo', lwf: 'Extremo esquerdo', lamf: 'Extremo esquerdo', ee: 'Extremo esquerdo', lm: 'Extremo esquerdo',
  cf: 'Ponta de lança', ss: 'Ponta de lança', pl: 'Ponta de lança', av: 'Ponta de lança'
};
function posicaoScoutWy(raw) {
  const s = String(raw || '').trim(); if (!s) return null;
  const cod = norm(s.split(/[,;/]/)[0]).replace(/\s+/g, '');
  return SC_POS_WY[cod] || posicaoTm(s) || null;
}

const scoutJogadores = () => App.d.scout || [];
function scoutEquipas() {
  const m = new Map();
  for (const p of scoutJogadores()) { const o = m.get(p.equipa) || { equipa: p.equipa, n: 0, av: 0 }; o.n++; if (avaliacaoScout(p.id)) o.av++; m.set(p.equipa, o); }
  return [...m.values()].sort((a, b) => a.equipa.localeCompare(b.equipa, 'pt'));
}
// Avaliação em uso: a mais recente do jogador.
function avaliacaoScout(id) {
  let melhor = null;
  for (const a of App.d.scoutAval || []) if (a.jogador_id === id && (!melhor || String(a.updated_at || a.created_at) > String(melhor.updated_at || melhor.created_at))) melhor = a;
  return melhor;
}
const mediaScout = a => { const v = a ? SC_PARAMS.map(p => a[p.k]).filter(Number.isFinite) : []; return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
// Valor de mercado: o Wyscout dá um número (1500000), o Transfermarkt um texto ("1,50 M €").
function valorScout(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : (/^\d+(\.\d+)?$/.test(String(v).trim()) ? Number(v) : null);
  if (n === null) return String(v);
  if (!n) return '–';
  return n >= 1e6 ? `${fmtNum(n / 1e6, n % 1e6 ? 1 : 0)} M€` : `${fmtNum(n / 1e3, 0)} mil €`;
}
const contratoScout = c => (c && /^\d{4}-\d{2}-\d{2}$/.test(c) ? fmtData(c) : c || null);
const idadeScout = p => { const i = idade(p.nascimento); return i !== null && !isNaN(i) ? i : p.idade ?? null; };
function equipaScoutExistente(nome) {
  const n = String(nome || '').trim(); if (!n) return null;
  return scoutEquipas().map(e => e.equipa).find(e => norm(e) === norm(n) || mesmaEquipa(e, n)) || n;
}
// Métricas do Wyscout mostradas na tabela (procuradas pelo nome da coluna, em inglês ou português).
const SC_COLUNAS_WY = [
  { id: 'jogos', rot: 'J', titulo: 'Jogos', re: /^(partidas jogadas|jogos( disputados)?|matches played)$/i },
  { id: 'min', rot: 'Min', titulo: 'Minutos jogados', re: /^(minutos jogados|minutes played|minutos)$/i },
  { id: 'golos', rot: 'G', titulo: 'Golos', re: /^(golos|goals)$/i },
  { id: 'xg', rot: 'xG', titulo: 'Golos esperados', re: /^xg$/i },
  { id: 'ast', rot: 'A', titulo: 'Assistências', re: /^(assist[eê]ncias|assists)$/i },
  { id: 'xa', rot: 'xA', titulo: 'Assistências esperadas', re: /^xa$/i }
];
function valorWy(p, col) {
  const W = p.wyscout; if (!W) return null;
  const k = Object.keys(W).find(x => col.re.test(x.trim())); return k != null && Number.isFinite(W[k]) ? W[k] : null;
}

function notaScoutHtml(v, param) {
  if (!Number.isFinite(v)) return '<span class="sc-nota vazia" title="Sem nota">–</span>';
  return `<span class="sc-nota n${v}" title="${esc(param ? `${param.nome}: ${v} – ${param.niveis[v - 1]}` : String(v))}">${'<i></i>'.repeat(v)}${'<i class="off"></i>'.repeat(5 - v)}<b>${v}</b></span>`;
}

function desenharScout() {
  const v = $('#vista');
  App.sc ||= { equipa: '', pos: '', estado: '', busca: '', ordem: 'nome' };
  const S = App.sc;
  if (!ehDep()) { v.innerHTML = '<div class="cabecalho-vista"><h1>Scout</h1></div><div class="vazio"><p>Esta área é só do departamento.</p></div>'; return; }
  if (App.semScout) {
    v.innerHTML = '<div class="cabecalho-vista"><h1>Scout</h1></div><div class="vazio"><p>Falta atualizar a base de dados para o Scout. Corra outra vez o ficheiro schema.sql no Supabase (SQL Editor).</p></div>'; return;
  }
  const eqs = scoutEquipas();
  if (S.equipa && !eqs.some(e => e.equipa === S.equipa)) S.equipa = '';
  const tm = tmDisponivel();
  const botoes = `<div class="acoes-esq">
      ${tm ? '<button class="btn" id="sc-tm">Importar plantel do Transfermarkt</button><button class="btn" id="sc-tm-jog">Adicionar jogador do Transfermarkt</button>' : ''}
      <button class="btn" id="sc-wy">Importar Wyscout</button>
      <button class="btn" id="sc-novo">Adicionar jogador à mão</button>
    </div>`;
  let corpo;
  if (!eqs.length) {
    corpo = `<div class="vazio"><p>Ainda não há equipas no Scout.</p><p>${tm ? 'Importe o plantel de uma equipa com o link do Transfermarkt, ou' : 'Importe'} uma exportação de jogadores do Wyscout (com a coluna da equipa, ou escolhendo a equipa ao importar).</p></div>`;
  } else if (!S.equipa && !S.busca && !S.estado && !S.pos) {
    corpo = `<section class="bloco"><h2>Equipas</h2><div class="sc-equipas">${eqs.map(e => `
      <button type="button" class="sc-eq" data-eq="${esc(e.equipa)}">${simboloEquipa(e.equipa, 'sc-simb')}<span><b>${esc(e.equipa)}</b><small>${e.n} ${e.n === 1 ? 'jogador' : 'jogadores'} · ${e.av} ${e.av === 1 ? 'avaliado' : 'avaliados'}</small></span></button>`).join('')}</div></section>
      ${htmlMelhoresScout()}`;
  } else corpo = htmlTabelaScout();
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Scout</h1><p class="nota">Só visível para o departamento. Carregue num jogador para o avaliar.</p></div></div>
    <div class="filtros" role="group" aria-label="Filtros">
      <label>Equipa<select id="sc-eq-sel"><option value="">Todas</option>${eqs.map(e => `<option ${e.equipa === S.equipa ? 'selected' : ''}>${esc(e.equipa)}</option>`).join('')}</select></label>
      <label>Posição<select id="sc-pos"><option value="">Todas</option>${SC_POSICOES.map(p => `<option ${p === S.pos ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <label>Avaliação<select id="sc-estado"><option value="">Todos</option><option value="sim" ${S.estado === 'sim' ? 'selected' : ''}>Avaliados</option><option value="nao" ${S.estado === 'nao' ? 'selected' : ''}>Por avaliar</option></select></label>
      <label>Procurar<input id="sc-busca" type="search" value="${esc(S.busca)}" placeholder="Nome do jogador" autocomplete="off"></label>
    </div>
    ${botoes}
    <div class="sc-corpo">${corpo}</div>`;
  const redesenhar = () => desenharScout();
  $('#sc-eq-sel').addEventListener('change', e => { S.equipa = e.target.value; redesenhar(); });
  $('#sc-pos').addEventListener('change', e => { S.pos = e.target.value; redesenhar(); });
  $('#sc-estado').addEventListener('change', e => { S.estado = e.target.value; redesenhar(); });
  let tBusca; $('#sc-busca').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => { S.busca = e.target.value; redesenhar(); const i = $('#sc-busca'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
  $$('.sc-eq').forEach(b => b.addEventListener('click', () => { S.equipa = b.dataset.eq; redesenhar(); }));
  $$('[data-sc-jog]').forEach(b => b.addEventListener('click', () => dialogoScoutJogador(scoutJogadores().find(p => p.id === b.dataset.scJog))));
  $$('[data-sc-ordem]').forEach(b => b.addEventListener('click', () => { const o = b.dataset.scOrdem; S.ordem = S.ordem === o ? `-${o}` : o; redesenhar(); }));
  $('#sc-tm')?.addEventListener('click', () => dialogoScoutTm(false));
  $('#sc-tm-jog')?.addEventListener('click', () => dialogoScoutTm(true));
  $('#sc-wy').addEventListener('click', () => dialogoScoutWyscout());
  $('#sc-novo').addEventListener('click', () => dialogoScoutJogador(null));
  $('#sc-apagar-eq')?.addEventListener('click', async () => {
    const ps = scoutJogadores().filter(p => p.equipa === S.equipa);
    if (!await confirmar(`Apagar ${S.equipa} do Scout? Saem ${ps.length} jogadores e as avaliações deles.`)) return;
    try { for (const p of ps) await App.db.apagar('scout_jogadores', { id: p.id }); S.equipa = ''; await recarregar(); toast('Equipa apagada do Scout.'); }
    catch (err) { toast(traduzErro(err), 'erro'); }
  });
  $('#sc-voltar')?.addEventListener('click', () => { Object.assign(S, { equipa: '', pos: '', estado: '', busca: '' }); redesenhar(); });
}

// Os jogadores mais bem avaliados (em todas as equipas), na página inicial do Scout.
function htmlMelhoresScout() {
  const l = scoutJogadores().map(p => ({ p, a: avaliacaoScout(p.id) })).filter(x => mediaScout(x.a) !== null)
    .sort((x, y) => mediaScout(y.a) - mediaScout(x.a) || (y.a.potencial || 0) - (x.a.potencial || 0)).slice(0, 10);
  if (!l.length) return '';
  return `<section class="bloco"><h2>Mais bem avaliados</h2><div class="tabela-env"><table class="tabela compacta sc-tabela">
    <thead><tr><th>Jogador</th><th>Equipa</th><th>Posição</th><th class="num">Idade</th>${SC_PARAMS.map(p => `<th>${p.nome}</th>`).join('')}</tr></thead>
    <tbody>${l.map(({ p, a }) => `<tr class="clicavel" data-sc-jog="${esc(p.id)}" tabindex="0"><td><span class="sc-jog">${avatarJogador(p, 'avatar-pequeno')}<b>${esc(p.nome)}</b></span></td><td>${esc(p.equipa)}</td><td>${esc(p.posicao || '–')}</td><td class="num">${idadeScout(p) ?? '–'}</td>${SC_PARAMS.map(x => `<td>${notaScoutHtml(a[x.k], x)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></section>`;
}

function htmlTabelaScout() {
  const S = App.sc;
  let ps = scoutJogadores().filter(p => (!S.equipa || p.equipa === S.equipa) && (!S.pos || p.posicao === S.pos));
  if (S.estado) ps = ps.filter(p => !!avaliacaoScout(p.id) === (S.estado === 'sim'));
  if (S.busca.trim()) { const b = norm(S.busca); ps = ps.filter(p => norm(p.nome).includes(b) || norm(p.nome_wyscout || '').includes(b)); }
  const cols = SC_COLUNAS_WY.filter(c => ps.some(p => valorWy(p, c) !== null));
  const chave = {
    nome: p => p.nome, posicao: p => SC_POSICOES.indexOf(p.posicao) < 0 ? 99 : SC_POSICOES.indexOf(p.posicao), idade: p => idadeScout(p) ?? 99,
    media: p => -(mediaScout(avaliacaoScout(p.id)) ?? -1),
    ...Object.fromEntries(SC_PARAMS.map(x => [x.k, p => -(avaliacaoScout(p.id)?.[x.k] ?? -1)])),
    ...Object.fromEntries(cols.map(c => [c.id, p => -(valorWy(p, c) ?? -1)]))
  };
  const o = S.ordem.replace(/^-/, ''), inv = S.ordem.startsWith('-') ? -1 : 1, f = chave[o] || chave.nome;
  ps.sort((a, b) => { const x = f(a), y = f(b); return inv * (typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y) || a.nome.localeCompare(b.nome, 'pt'); });
  const th = (k, rot, cls = '', titulo = '') => `<th class="${cls}"><button type="button" class="sc-ord ${o === k ? 'ativo' : ''}" data-sc-ordem="${k}" ${titulo ? `title="${esc(titulo)}"` : ''}>${rot}${o === k ? (inv > 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  const titulo = S.equipa ? `<div class="sc-titulo">${simboloEquipa(S.equipa, 'sc-simb')}<h2>${esc(S.equipa)}</h2><span class="nota">${ps.length} ${ps.length === 1 ? 'jogador' : 'jogadores'}</span>` : `<div class="sc-titulo"><h2>Jogadores</h2><span class="nota">${ps.length}</span>`;
  const info = S.equipa ? scoutJogadores().find(p => p.equipa === S.equipa && p.wyscout_info)?.wyscout_info : null;
  return `<section class="bloco">
    ${titulo}<span class="sc-titulo-acoes"><button class="btn-link" id="sc-voltar">← Todas as equipas</button>${S.equipa && podeApagar() ? '<button class="btn-link perigo" id="sc-apagar-eq">Apagar equipa</button>' : ''}</span></div>
    ${info ? `<p class="nota">Estatísticas do Wyscout: ${esc([info.ficheiro, info.data ? `importado a ${fmtData(info.data)}` : null].filter(Boolean).join(' · '))}</p>` : ''}
    ${ps.length ? `<div class="tabela-env"><table class="tabela compacta sc-tabela">
      <thead><tr>${th('nome', 'Jogador')}${S.equipa ? '' : '<th>Equipa</th>'}${th('posicao', 'Posição')}${th('idade', 'Idade', 'num')}<th>Valor</th><th>Contrato</th>
        ${cols.map(c => th(c.id, c.rot, 'num', c.titulo)).join('')}${SC_PARAMS.map(x => th(x.k, x.curto, '', x.nome)).join('')}<th></th></tr></thead>
      <tbody>${ps.map(p => { const a = avaliacaoScout(p.id); return `<tr class="clicavel" data-sc-jog="${esc(p.id)}" tabindex="0">
        <td><span class="sc-jog">${avatarJogador(p, 'avatar-pequeno')}<b>${esc(p.nome)}</b></span></td>${S.equipa ? '' : `<td>${esc(p.equipa)}</td>`}
        <td class="sc-nw">${esc(p.posicao || '–')}</td><td class="num">${idadeScout(p) ?? '–'}</td>
        <td class="sc-nw">${esc(valorScout(p.valor_mercado) || '–')}</td><td class="sc-nw">${esc(contratoScout(p.contrato) || '–')}</td>
        ${cols.map(c => { const x = valorWy(p, c); return `<td class="num">${x === null ? '–' : fmtNum(x, /x/.test(c.id) ? 2 : 0)}</td>`; }).join('')}
        ${SC_PARAMS.map(x => `<td>${notaScoutHtml(a?.[x.k], x)}</td>`).join('')}
        <td>${a?.comentario ? `<span class="sc-com" title="${esc(a.comentario)}">💬</span>` : ''}</td></tr>`; }).join('')}</tbody>
    </table></div>` : '<p class="fraco">Nenhum jogador com estes filtros.</p>'}
  </section>`;
}

// ---- Ficha do jogador e avaliação ----
function dialogoScoutJogador(p) {
  const novo = !p; p ||= { equipa: App.sc.equipa || '', nome: '' };
  const a = novo ? null : avaliacaoScout(p.id);
  const notas = Object.fromEntries(SC_PARAMS.map(x => [x.k, a?.[x.k] ?? null]));
  const eqs = scoutEquipas().map(e => e.equipa);
  const ida = idadeScout(p);
  const W = p.wyscout || {};
  const chavesW = Object.keys(W).filter(k => Number.isFinite(W[k]));
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo sc-dialogo';
  d.innerHTML = `<form method="dialog" class="pilha" id="sc-form">
    <div class="bloco-cab"><div class="sc-ficha-cab">${novo ? '' : avatarJogador(p, 'avatar-grande')}<div>
      <h2>${novo ? 'Novo jogador' : esc(p.nome)}</h2>
      ${novo ? '' : `<p class="cartao-meta">${esc([p.posicao, ida !== null ? `${ida} anos` : null, p.altura ? `${p.altura} cm` : null, p.pe ? `pé ${p.pe.toLowerCase()}` : null, p.nacionalidade].filter(Boolean).join(' · '))}</p>
      <p class="cartao-meta">${simboloEquipa(p.equipa, 'simb')} ${esc(p.equipa)}${p.valor_mercado ? ` · valor ${esc(valorScout(p.valor_mercado))}` : ''}${p.contrato ? ` · contrato até ${esc(contratoScout(p.contrato))}` : ''}${p.tm_url ? ` · <a href="${esc(p.tm_url)}" target="_blank" rel="noopener">Transfermarkt</a>` : ''}</p>`}
    </div></div><button type="button" class="btn" id="sc-fechar">Fechar</button></div>
    ${novo ? '' : `<fieldset class="sc-aval"><legend>Avaliação${a?.updated_at ? ` <span class="fraco">(última alteração a ${fmtData(String(a.updated_at).slice(0, 10))})</span>` : ''}</legend>
      ${SC_PARAMS.map(x => `<div class="sc-param"><span class="sc-param-nome">${x.nome}</span><div class="sc-botoes" role="radiogroup" aria-label="${x.nome}">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="sc-bot ${notas[x.k] === n ? 'ativo' : ''}" data-param="${x.k}" data-n="${n}" role="radio" aria-checked="${notas[x.k] === n}" title="${esc(x.niveis[n - 1])}">${n}</button>`).join('')}
        </div><span class="sc-nivel" id="sc-nivel-${x.k}">${notas[x.k] ? esc(x.niveis[notas[x.k] - 1]) : '<span class="fraco">sem nota</span>'}</span></div>`).join('')}
      <label>Comentário<textarea name="comentario" rows="4" placeholder="Pontos fortes, pontos a melhorar, contexto da observação…">${esc(a?.comentario || '')}</textarea></label>
    </fieldset>`}
    <details class="mais-detalhes" ${novo ? 'open' : ''}><summary>Dados do jogador</summary>
      <div class="grelha-form">
        <label>Nome<input name="nome" required value="${esc(p.nome || '')}" autocomplete="off"></label>
        <label>Equipa<input name="equipa" required list="sc-eqs" value="${esc(p.equipa || '')}" autocomplete="off"><datalist id="sc-eqs">${eqs.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
        <label>Posição<select name="posicao"><option value="">—</option>${SC_POSICOES.map(x => `<option ${x === p.posicao ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Data de nascimento<input name="nascimento" type="date" value="${esc(p.nascimento || '')}"></label>
        <label>Pé<select name="pe"><option value="">—</option>${['Direito', 'Esquerdo', 'Ambos'].map(x => `<option ${x === p.pe ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Altura (cm)<input name="altura" type="number" min="140" max="220" value="${p.altura ?? ''}"></label>
        <label>Nacionalidade<input name="nacionalidade" value="${esc(p.nacionalidade || '')}"></label>
        <label>Valor de mercado<input name="valor_mercado" value="${esc(p.valor_mercado || '')}"></label>
        <label>Contrato até<input name="contrato" value="${esc(p.contrato || '')}"></label>
      </div>
    </details>
    ${chavesW.length ? `<details class="mais-detalhes"><summary>Estatísticas do Wyscout (${chavesW.length})</summary>
      ${p.wyscout_info?.ficheiro ? `<p class="nota">${esc(p.wyscout_info.ficheiro)}${p.nome_wyscout && p.nome_wyscout !== p.nome ? ` · no Wyscout: ${esc(p.nome_wyscout)}` : ''}</p>` : ''}
      <input type="search" id="sc-wy-filtro" placeholder="Filtrar métricas…" autocomplete="off">
      <div class="sc-wy-lista">${chavesW.map(k => `<div class="sc-wy-linha" data-k="${esc(norm(k))}"><span>${esc(k)}</span><b>${fmtNum(W[k], Number.isInteger(W[k]) ? 0 : 2)}</b></div>`).join('')}</div>
    </details>` : ''}
    <p class="erro" id="sc-erro" role="alert"></p>
    <div class="acoes">${!novo && podeApagar() ? '<button type="button" class="btn-link perigo apagar-esq" id="sc-apagar">Apagar jogador</button>' : ''}<button type="button" class="btn" id="sc-cancelar">Cancelar</button><button class="btn btn-prim" id="sc-guardar">${novo ? 'Adicionar' : 'Guardar'}</button></div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  const fechar = () => { d.close(); d.remove(); };
  $('#sc-fechar', d).addEventListener('click', fechar); $('#sc-cancelar', d).addEventListener('click', fechar);
  d.addEventListener('cancel', fechar);
  $$('.sc-bot', d).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.param, n = Number(b.dataset.n);
    notas[k] = notas[k] === n ? null : n; // carregar outra vez na mesma nota tira-a
    $$(`.sc-bot[data-param="${k}"]`, d).forEach(x => { const on = Number(x.dataset.n) === notas[k]; x.classList.toggle('ativo', on); x.setAttribute('aria-checked', String(on)); });
    const par = SC_PARAMS.find(x => x.k === k); $(`#sc-nivel-${k}`, d).innerHTML = notas[k] ? esc(par.niveis[notas[k] - 1]) : '<span class="fraco">sem nota</span>';
  }));
  $('#sc-wy-filtro', d)?.addEventListener('input', e => { const t = norm(e.target.value); $$('.sc-wy-linha', d).forEach(l => { l.hidden = !!t && !l.dataset.k.includes(t); }); });
  $('#sc-apagar', d)?.addEventListener('click', async () => {
    if (!await confirmar(`Apagar ${p.nome} do Scout (e a avaliação)?`)) return;
    try { await App.db.apagar('scout_jogadores', { id: p.id }); App.d.scout = scoutJogadores().filter(x => x.id !== p.id); App.d.scoutAval = (App.d.scoutAval || []).filter(x => x.jogador_id !== p.id); fechar(); desenharScout(); }
    catch (err) { $('#sc-erro', d).textContent = traduzErro(err); }
  });
  $('#sc-form', d).addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target); const txt = k => String(fd.get(k) || '').trim() || null;
    const dados = { nome: txt('nome'), equipa: equipaScoutExistente(txt('equipa')), posicao: txt('posicao'), nascimento: txt('nascimento'), pe: txt('pe'),
      altura: Number(fd.get('altura')) || null, nacionalidade: txt('nacionalidade'), valor_mercado: txt('valor_mercado'), contrato: txt('contrato') };
    if (!dados.nome || !dados.equipa) { $('#sc-erro', d).textContent = 'Indique o nome e a equipa.'; return; }
    $('#sc-guardar', d).disabled = true;
    try {
      let jog = p;
      if (novo) { jog = await App.db.inserir('scout_jogadores', dados); (App.d.scout ||= []).push(jog); }
      else {
        const mudou = Object.entries(dados).some(([k, v]) => (p[k] ?? null) !== v);
        if (mudou) { await App.db.atualizar('scout_jogadores', { id: p.id }, dados); Object.assign(p, dados); }
        const av = { ...notas, comentario: txt('comentario') };
        const vazia = SC_PARAMS.every(x => !av[x.k]) && !av.comentario;
        if (a) {
          if (SC_PARAMS.some(x => (a[x.k] ?? null) !== av[x.k]) || (a.comentario ?? null) !== av.comentario) {
            const r = await App.db.atualizar('scout_avaliacoes', { id: a.id }, av); Object.assign(a, r?.[0] || av, av);
            if (!r?.[0]) a.updated_at = new Date().toISOString();
          }
        } else if (!vazia) {
          const n = await App.db.inserir('scout_avaliacoes', { jogador_id: p.id, ...av });
          (App.d.scoutAval ||= []).push({ updated_at: new Date().toISOString(), ...n });
        }
      }
      fechar(); desenharScout(); toast(novo ? `${dados.nome} adicionado ao Scout.` : 'Guardado.');
    } catch (err) { $('#sc-guardar', d).disabled = false; $('#sc-erro', d).textContent = traduzErro(err); }
  });
}

// ---- Transfermarkt ----
async function tmGuardarScout(eq, j) {
  const equipa = equipaScoutExistente(eq || j.club) || 'Sem equipa';
  const ex = scoutJogadores().find(p => mesmaEquipa(p.equipa, equipa) && ((p.tm_id && j.transfermarktId && p.tm_id === String(j.transfermarktId)) || norm(p.nome) === norm(j.name) || norm(p.nome_wyscout || '') === norm(j.name)))
    || scoutJogadores().find(p => p.tm_id && j.transfermarktId && p.tm_id === String(j.transfermarktId));
  const num = parseInt(j.shirtNumber, 10);
  const dados = {
    equipa: ex?.equipa || equipa, nome: j.name || ex?.nome,
    posicao: posicaoTm(j.position) || ex?.posicao || null,
    nascimento: /^\d{4}-\d{2}-\d{2}$/.test(j.birthDate || '') ? j.birthDate : ex?.nascimento ?? null,
    altura: j.heightCm >= 120 && j.heightCm <= 230 ? j.heightCm : ex?.altura ?? null,
    pe: peTm(j.foot) ?? ex?.pe ?? null, numero: num >= 0 && num <= 99 ? num : ex?.numero ?? null,
    nacionalidade: j.nationality || ex?.nacionalidade || null,
    valor_mercado: j.marketValue || ex?.valor_mercado || null, contrato: j.contractUntil || ex?.contrato || null,
    tm_id: j.transfermarktId ? String(j.transfermarktId) : ex?.tm_id ?? null, tm_url: j.sourceUrl || ex?.tm_url || null
  };
  if (/^data:image\//.test(j.photo || '')) { try { dados.foto = await reduzirFoto(j.photo); } catch { /* sem foto */ } }
  if (ex) { await App.db.atualizar('scout_jogadores', { id: ex.id }, dados); Object.assign(ex, dados); return 'atualizado'; }
  const novo = await App.db.inserir('scout_jogadores', dados); (App.d.scout ||= []).push(novo); return 'novo';
}
function dialogoScoutTm(soJogador) {
  let ocupado = false, parar = false;
  const eqs = scoutEquipas().map(e => e.equipa);
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  d.innerHTML = `<div class="pilha">
    <div class="bloco-cab"><h2>${soJogador ? 'Adicionar jogador' : 'Importar plantel'} · Transfermarkt</h2><button class="btn" id="st-fechar">Fechar</button></div>
    <form id="st-form" class="pilha">
      <label>${soJogador ? 'Link do jogador' : 'Link da equipa'} no Transfermarkt<input id="st-url" type="url" required placeholder="https://www.transfermarkt.pt/…/${soJogador ? 'profil/spieler/…' : 'startseite/verein/…'}"></label>
      <label>Equipa no Scout <span class="fraco">(opcional; sem nada usa o clube do Transfermarkt)</span><input id="st-eq" list="st-eqs" value="${esc(App.sc?.equipa || '')}" autocomplete="off"><datalist id="st-eqs">${eqs.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
      <div class="acoes-esq"><button class="btn btn-prim" id="st-ir">${soJogador ? 'Procurar' : 'Importar'}</button></div>
    </form>
    <p class="tm-msg" id="st-msg" role="status"></p><div id="st-saida"></div></div>`;
  document.body.appendChild(d); d.showModal();
  const msg = (t, erro) => { const m = $('#st-msg', d); m.textContent = t; m.classList.toggle('erro', !!erro); };
  const fechar = () => { d.close(); d.remove(); desenharScout(); };
  $('#st-fechar', d).addEventListener('click', () => { if (ocupado) { parar = true; msg('A parar…'); return; } fechar(); });
  d.addEventListener('cancel', e => { e.preventDefault(); if (!ocupado) fechar(); });
  $('#st-form', d).addEventListener('submit', async e => {
    e.preventDefault(); if (ocupado) return;
    const url = $('#st-url', d).value.trim(), eq = $('#st-eq', d).value.trim();
    $('#st-saida', d).innerHTML = ''; msg('A procurar no Transfermarkt…');
    let r; try { r = await tmChamar(url); } catch (err) { msg(err.message, true); return; }
    if (soJogador || r.jogador) {
      if (!r.jogador) { msg('Esse link é de uma equipa: use "Importar plantel do Transfermarkt".', true); return; }
      try { const res = await tmGuardarScout(eq, r.jogador); msg(`${r.jogador.name} ${res === 'novo' ? 'adicionado' : 'atualizado'}.`); $('#st-url', d).value = ''; }
      catch (err) { msg(traduzErro(err), true); }
      return;
    }
    const lista = r.equipa || [];
    ocupado = true; parar = false; $('#st-ir', d).disabled = true; $('#st-fechar', d).textContent = 'Parar';
    const barra = document.createElement('div'); barra.className = 'tm-barra'; barra.innerHTML = '<i></i>'; $('#st-saida', d).append(barra);
    let ok = 0; const falhas = []; const pausa = window.__TMPAUSA ?? 2500; let eqUsada = eq;
    for (let i = 0; i < lista.length && !parar; i++) {
      msg(`${i + 1} de ${lista.length}: ${lista[i].name}`);
      try { const x = await tmChamar(lista[i].url); eqUsada ||= x.jogador.club; await tmGuardarScout(eqUsada, x.jogador); ok++; }
      catch (err) { falhas.push(lista[i].name); if (/schema|relation|column/i.test(err.message)) { msg(traduzErro(err), true); break; } }
      barra.firstChild.style.width = `${(i + 1) / lista.length * 100}%`;
      if (i < lista.length - 1 && !parar) await new Promise(res => setTimeout(res, pausa));
    }
    ocupado = false; $('#st-ir', d).disabled = false; $('#st-fechar', d).textContent = 'Fechar'; barra.remove();
    if (eqUsada) App.sc.equipa = equipaScoutExistente(eqUsada);
    msg(`${ok === 1 ? '1 jogador importado' : `${ok} jogadores importados`}${parar ? ' (parado)' : ''}.${falhas.length ? ` Falharam: ${falhas.join(', ')}.` : ''}`, falhas.length > 0);
  });
}

// ---- Wyscout: exportação de jogadores (uma linha por jogador) ----
const SC_WY_CAMPOS = {
  jogador: /^(player|jogador|jugador|name|nome)$/i,
  equipa: /^(team|equipa|equipo|clube|club)$/i,
  equipaPeriodo: /(team within selected timeframe|equipa (durante|no|dentro d[oe]) per[ií]odo)/i,
  posicao: /^(position|posi[cç][aã]o|posi[cç][oõ]es|pos\.?)$/i,
  idade: /^(age|idade|edad)$/i,
  nascimento: /^(birthday|date of birth|data de nascimento|nascimento)$/i,
  valor: /^(market value|valor de mercado|valor)$/i,
  contrato: /(contract expires|contrato (expira|termina|até)|fim de contrato|contrato)/i,
  nacionalidade: /^(passport country|birth country|nacionalidade|pa[ií]s( de nascimento| do passaporte)?)$/i,
  pe: /^(foot|p[eé]|p[eé] preferido)$/i,
  altura: /^(height|altura)$/i,
  peso: /^(weight|peso)$/i,
  emprestimo: /^(on loan|emprestado|empr[eé]stimo)$/i
};
async function lerScoutWyscout(ficheiro, equipaPadrao) {
  const linhas = await lerFolha(await ficheiro.arrayBuffer());
  if (!linhas.length) throw new Error(`${ficheiro.name}: o ficheiro está vazio.`);
  const ic = detetarCabecalho(linhas);
  const largura = Math.max(...linhas.map(l => l.length));
  const nomes = nomesColunas(linhas[ic], largura);
  const col = {}; for (const [k, re] of Object.entries(SC_WY_CAMPOS)) { const i = nomes.findIndex(n => re.test(n.trim())); if (i >= 0) col[k] = i; }
  if (col.jogador === undefined) throw new Error(`${ficheiro.name}: não encontrei a coluna dos jogadores (Player / Jogador).`);
  const usadas = new Set(Object.values(col));
  const out = [];
  for (const l of linhas.slice(ic + 1)) {
    const nome = String(l[col.jogador] ?? '').trim();
    if (!nome || /^(total|totais|m[eé]dia|average)\b/i.test(nome)) continue;
    const t = k => (col[k] === undefined ? null : String(l[col[k]] ?? '').trim() || null);
    const equipa = t('equipa') || t('equipaPeriodo') || equipaPadrao || null;
    const met = {};
    nomes.forEach((n, i) => { if (usadas.has(i)) return; const v = parseNum(l[i]); if (v !== null) met[n] = v; });
    let nasc = col.nascimento !== undefined ? parseData(l[col.nascimento]) : null;
    const alt = parseNum(t('altura'));
    out.push({ nome, equipa, posicao: posicaoScoutWy(t('posicao')), posicao_wy: t('posicao'), idade: parseNum(t('idade')), nascimento: nasc,
      valor: col.valor !== undefined && Number.isFinite(parseNum(l[col.valor])) ? String(parseNum(l[col.valor])) : t('valor'), contrato: col.contrato !== undefined ? (parseData(l[col.contrato]) || t('contrato')) : null, nacionalidade: t('nacionalidade'),
      pe: peTm(t('pe')), altura: alt >= 140 && alt <= 230 ? Math.round(alt) : null, metricas: met });
  }
  return { ficheiro: ficheiro.name, linhas: out, temEquipa: col.equipa !== undefined || col.equipaPeriodo !== undefined };
}
function procurarScout(equipa, nome) {
  const daEq = scoutJogadores().filter(p => mesmaEquipa(p.equipa, equipa));
  const exato = daEq.find(p => norm(p.nome_wyscout || '') === norm(nome) || norm(p.nome) === norm(nome)); if (exato) return exato;
  const cand = daEq.filter(p => !p.nome_wyscout && nomesParecidosEP(nome, p.nome));
  return cand.length === 1 ? cand[0] : null;
}
async function gravarScoutWyscout(lidos) {
  let novos = 0, atualizados = 0;
  const hoje = hojeIso();
  for (const f of lidos) for (const r of f.linhas) {
    const equipa = equipaScoutExistente(r.equipa);
    const ex = procurarScout(equipa, r.nome);
    const info = { ficheiro: f.ficheiro, data: hoje };
    // O Transfermarkt é melhor fonte para os dados pessoais: do Wyscout só se preenche o que falta.
    const base = { posicao: r.posicao, idade: r.idade, nascimento: r.nascimento, valor_mercado: r.valor, contrato: r.contrato, nacionalidade: r.nacionalidade, pe: r.pe, altura: r.altura };
    if (ex) {
      const patch = { wyscout: r.metricas, wyscout_info: info, nome_wyscout: r.nome };
      for (const [k, v] of Object.entries(base)) if (v != null && (ex[k] == null || ex[k] === '')) patch[k] = v;
      await App.db.atualizar('scout_jogadores', { id: ex.id }, patch); Object.assign(ex, patch); atualizados++;
    } else {
      const n = await App.db.inserir('scout_jogadores', { equipa, nome: r.nome, nome_wyscout: r.nome, ...Object.fromEntries(Object.entries(base).filter(([, v]) => v != null)), wyscout: r.metricas, wyscout_info: info });
      (App.d.scout ||= []).push(n); novos++;
    }
  }
  return { novos, atualizados };
}
function dialogoScoutWyscout() {
  const eqs = scoutEquipas().map(e => e.equipa);
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  d.innerHTML = `<form class="pilha" id="sw-form">
    <div class="bloco-cab"><h2>Importar Wyscout</h2><button type="button" class="btn" id="sw-fechar">Fechar</button></div>
    <p class="nota sem-margem">Exportação de jogadores do Wyscout (Excel), uma linha por jogador. Pode escolher vários ficheiros.
      Os jogadores que já estão no Scout ficam com as estatísticas atualizadas (o nome é reconhecido mesmo abreviado, ex.: "J. Silva"); os outros são acrescentados.</p>
    <label>Ficheiros<input type="file" id="sw-fich" accept=".xlsx,.xls,.csv" multiple required></label>
    <label>Equipa <span class="fraco">(só para ficheiros sem a coluna da equipa)</span><input id="sw-eq" list="sw-eqs" value="${esc(App.sc?.equipa || '')}" autocomplete="off"><datalist id="sw-eqs">${eqs.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
    <div id="sw-resumo"></div>
    <p class="erro" id="sw-erro" role="alert"></p>
    <div class="acoes"><button class="btn btn-prim" id="sw-ir" disabled>Importar</button></div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  const fechar = () => { d.close(); d.remove(); desenharScout(); };
  $('#sw-fechar', d).addEventListener('click', fechar); d.addEventListener('cancel', fechar);
  let lidos = [];
  const ler = async () => {
    const fs = [...$('#sw-fich', d).files]; $('#sw-erro', d).textContent = ''; $('#sw-ir', d).disabled = true; lidos = [];
    if (!fs.length) { $('#sw-resumo', d).innerHTML = ''; return; }
    $('#sw-resumo', d).innerHTML = '<p class="nota">A ler…</p>';
    const eq = $('#sw-eq', d).value.trim();
    const erros = [];
    for (const f of fs) { try { lidos.push(await lerScoutWyscout(f, eq)); } catch (err) { erros.push(err.message); } }
    const semEq = lidos.filter(f => f.linhas.some(r => !r.equipa));
    const linhas = lidos.flatMap(f => f.linhas.filter(r => r.equipa));
    const porEq = new Map(); for (const r of linhas) { const e = equipaScoutExistente(r.equipa); const o = porEq.get(e) || { n: 0, ja: 0 }; o.n++; if (procurarScout(e, r.nome)) o.ja++; porEq.set(e, o); }
    $('#sw-resumo', d).innerHTML = porEq.size ? `<div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Equipa</th><th class="num">Jogadores</th><th class="num">Já no Scout</th><th class="num">Novos</th></tr></thead>
      <tbody>${[...porEq].map(([e, o]) => `<tr><td>${esc(e)}${eqs.includes(e) ? '' : ' <span class="fraco">(nova)</span>'}</td><td class="num">${o.n}</td><td class="num">${o.ja}</td><td class="num">${o.n - o.ja}</td></tr>`).join('')}</tbody></table></div>` : '';
    if (semEq.length) erros.push(`${semEq.map(f => f.ficheiro).join(', ')}: sem coluna da equipa. Escreva a equipa acima.`);
    $('#sw-erro', d).textContent = erros.join(' ');
    $('#sw-ir', d).disabled = !linhas.length || semEq.length > 0;
  };
  $('#sw-fich', d).addEventListener('change', ler);
  let tEq; $('#sw-eq', d).addEventListener('input', () => { clearTimeout(tEq); tEq = setTimeout(ler, 400); });
  $('#sw-form', d).addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#sw-ir', d); b.disabled = true; b.textContent = 'A importar…';
    try {
      const r = await gravarScoutWyscout(lidos);
      const eqsF = [...new Set(lidos.flatMap(f => f.linhas.map(x => equipaScoutExistente(x.equipa))))];
      if (eqsF.length === 1) App.sc.equipa = eqsF[0];
      fechar(); toast(`Wyscout importado: ${r.novos} ${r.novos === 1 ? 'jogador novo' : 'jogadores novos'}, ${r.atualizados} ${r.atualizados === 1 ? 'atualizado' : 'atualizados'}.`);
    } catch (err) { b.disabled = false; b.textContent = 'Importar'; $('#sw-erro', d).textContent = traduzErro(err); }
  });
}
