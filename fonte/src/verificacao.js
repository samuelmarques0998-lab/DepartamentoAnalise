// ---------- Dados › Verificação e Codificação › Estado por jornada ----------

// Semelhança entre dois nomes normalizados (0 a 1), pela distância de edição.
function semelhanca(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let ant = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    ant = cur;
  }
  return 1 - ant[n] / Math.max(m, n);
}
const PRIMEIRA_PARTE = ['0-15', '15-30', '30-45'], SEGUNDA_PARTE = ['45-60', '60-75', '75-90'];
const ehParte = (p, n) => new RegExp(`^${n}`).test(String(p || '').trim());

// Todas as verificações, sobre as oportunidades e os esquemas táticos codificados.
function verificarDados() {
  const alvos = App.idx.alvos || [];
  const golos = [], equipaFora = [], duplicados = [], parteTempo = [];
  for (const a of alvos) {
    const ops = App.idx.eventosAlvo[a.key] || [], eps = App.idx.esquemasAlvo[a.key] || [];
    // 1. Golos codificados (oportunidades) contra o resultado do jogo.
    if (ops.length && Number.isFinite(a.golosCasa) && Number.isFinite(a.golosFora)) {
      const g = { casa: 0, fora: 0 };
      for (const e of ops) if (e.resultado === 'Golo') { const l = ladoNoAlvo(e, a); if (l) g[l]++; }
      if (g.casa !== a.golosCasa || g.fora !== a.golosFora) golos.push({ a, g });
    }
    for (const e of [...ops, ...eps]) {
      // 2. Equipa que não joga este jogo.
      if (e.equipa && !mesmaEquipa(e.equipa, a.casa) && !mesmaEquipa(e.equipa, a.fora) && norm(e.equipa) !== norm(a.casa) && norm(e.equipa) !== norm(a.fora)) equipaFora.push({ a, e });
      // 3. Parte e tempo que não batem (1.ª parte com 45-60 fica de fora: são os descontos).
      if (e.tempo && e.parte) {
        if ((ehParte(e.parte, 1) && SEGUNDA_PARTE.slice(1).includes(e.tempo)) || (ehParte(e.parte, 2) && PRIMEIRA_PARTE.includes(e.tempo))) parteTempo.push({ a, e });
      }
    }
    // 4. Registos repetidos: tudo igual dentro do mesmo jogo.
    // Só nas oportunidades: os esquemas táticos não têm minuto e repetem-se com frequência (mesmo batedor, mesma zona).
    const grupos = {};
    for (const e of ops) {
      const k = [e.tipo, e.ep_tipo, norm(e.equipa || e.lado), e.parte, e.tempo, e.minuto, norm(e.jogador), norm(e.assistente), norm(e.referencia), e.momento, e.sub_momento, e.mecanismo, e.resultado, e.segunda_vaga, e.zona_ep,
        ...posicaoParaComparar(e)].join('|');
      (grupos[k] ||= []).push(e);
    }
    for (const g of Object.values(grupos)) if (g.length > 1) duplicados.push({ a, evs: g });
  }
  return { golos, equipaFora, duplicados, parteTempo, nomes: variantesDeNomes(), treinadores: variantesDeTreinadores() };
}
// Nomes de jogadores escritos de formas diferentes na mesma equipa.
function variantesDeNomes() {
  const porEquipa = {};
  for (const e of App.d.eventos) {
    const eq = chaveEquipaCanonica(equipaDoEvento(e) || ''); if (!eq) continue;
    for (const campo of ['jogador', 'assistente', 'referencia']) {
      const v = String(e[campo] || '').trim(); if (!v || v === '-') continue;
      const m = ((porEquipa[eq] ||= {})[v] ||= { nome: v, n: 0, evs: [] }); m.n++; m.evs.push([e, campo]);
    }
  }
  const pares = [];
  for (const [eq, nomes] of Object.entries(porEquipa)) {
    const lista = Object.values(nomes);
    const usados = new Set();
    for (let i = 0; i < lista.length; i++) {
      if (usados.has(i)) continue;
      const grupo = [lista[i]];
      for (let j = i + 1; j < lista.length; j++) {
        if (usados.has(j)) continue;
        const a = norm(lista[i].nome), b = norm(lista[j].nome);
        const pa = a.split(' '), pb = b.split(' ');
        const mesmo = a === b || semelhanca(a, b) >= 0.86 || (a.length > 3 && b.length > 3 && pa[0] === pb[0] && (pa.length === 1 || pb.length === 1) && (b.startsWith(a + ' ') || a.startsWith(b + ' ')));
        if (mesmo) { grupo.push(lista[j]); usados.add(j); }
      }
      if (grupo.length > 1) { usados.add(i); grupo.sort((x, y) => y.n - x.n); pares.push({ equipa: eq, grupo }); }
    }
  }
  return pares.sort((x, y) => x.equipa.localeCompare(y.equipa, 'pt'));
}
function variantesDeTreinadores() {
  const porEquipa = {};
  for (const p of App.d.partidas) for (const [eq, t, campo] of [[p.casa, p.treinador_casa, 'treinador_casa'], [p.fora, p.treinador_fora, 'treinador_fora']]) {
    if (!t) continue; const k = chaveEquipaCanonica(eq);
    const m = ((porEquipa[k] ||= {})[t] ||= { nome: t, n: 0, refs: [] }); m.n++; m.refs.push([p, campo]);
  }
  const out = [];
  for (const [eq, nomes] of Object.entries(porEquipa)) {
    const lista = Object.values(nomes); const vistos = new Set();
    for (const x of lista) {
      if (vistos.has(x.nome)) continue;
      const grupo = lista.filter(y => !vistos.has(y.nome) && (norm(y.nome) === norm(x.nome) || semelhanca(norm(y.nome), norm(x.nome)) >= 0.86));
      grupo.forEach(y => vistos.add(y.nome));
      if (grupo.length > 1) out.push({ equipa: eq, grupo: grupo.sort((a, b) => b.n - a.n), treinador: true });
    }
  }
  return out;
}
// Ponto do evento para comparar: a zona, quando o ponto é aproximado (folhas importadas); o ponto, quando foi marcado no campo.
function posicaoParaComparar(e) {
  if (e.local_aprox || e.origem === 'folha_ep') return [e.zona_ep || (e.zona_x != null ? zonaFinalizacao(e.zona_x, e.zona_y) : ''), e.passe_x != null ? zonaPasse(e.passe_x, e.passe_y) : ''];
  return [e.zona_x != null ? Math.round(e.zona_x) : '', e.zona_y != null ? Math.round(e.zona_y) : ''];
}
const rotuloCurto = a => rotuloAlvo(a);
function descreverEvento(e) {
  const tipo = e.ep_tipo ? e.ep_tipo : 'Oportunidade';
  return [tipo, e.parte, e.tempo, e.jogador, e.resultado].filter(Boolean).join(' · ');
}

function desenharVerificacao() {
  const v = $('#vista'); const editar = ehDep();
  const R = verificarDados();
  // O colaborador só consulta e não vê a secção dos nomes escritos de formas diferentes.
  const total = R.golos.length + R.equipaFora.length + R.duplicados.length + R.parteTempo.length + (editar ? R.nomes.length + R.treinadores.length : 0);
  const sec = (id, titulo, n, explica, corpo) => `<section class="bloco vf-sec" id="${id}">
    <div class="bloco-cab"><h2>${titulo}</h2><span class="vf-n ${n ? 'aviso' : 'ok'}">${n ? n : 'OK'}</span></div>
    <p class="nota">${explica}</p>${n ? corpo : ''}</section>`;
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Verificação de dados</h1>
      <p class="nota">Confere as oportunidades e os esquemas táticos codificados. ${total ? `${total} ${total === 1 ? 'ponto a confirmar' : 'pontos a confirmar'}.` : 'Não foi encontrado nenhum problema.'}</p></div></div>
    ${editar ? '' : '<p class="aviso-suave">Só consulta: as correções são feitas pelo departamento.</p>'}
    <p class="nota">As correções feitas aqui ficam na aplicação. Se os dados vierem de uma folha, corrija também a folha: ao importá-la outra vez, os eventos da folha são substituídos.</p>
    ${sec('vf-golos', 'Golos codificados vs resultado', R.golos.length, 'Jogos em que o número de oportunidades com golo de cada equipa não bate com o resultado. Pode ser um golo em falta, um golo atribuído à equipa errada ou um autogolo (que não se codifica).',
      `<div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Jogo</th><th class="num">Resultado</th><th class="num">Codificados</th><th></th></tr></thead><tbody>
      ${R.golos.map(({ a, g }) => `<tr><td>${esc(rotuloCurto(a))}</td><td class="num">${a.golosCasa}–${a.golosFora}</td><td class="num"><b>${g.casa}–${g.fora}</b></td><td>${editar ? `<button class="btn-link" data-ir="${esc(a.key)}">Abrir codificação</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>`)}
    ${sec('vf-eq', 'Equipa que não joga o jogo', R.equipaFora.length, 'Eventos registados com uma equipa que não é nenhuma das duas do jogo (equipa ou adversário trocados).',
      `<ul class="vf-lista">${R.equipaFora.map(({ a, e }) => `<li><b>${esc(e.equipa)}</b> em ${esc(rotuloCurto(a))} — ${esc(descreverEvento(e))}</li>`).join('')}</ul>`)}
    ${sec('vf-parte', 'Parte e tempo que não batem', R.parteTempo.length, 'Por exemplo, "1.ª parte" com 75-90 ou "2.ª parte" com 15-30. A 1.ª parte com 45-60 não é assinalada (descontos).',
      `<ul class="vf-lista">${R.parteTempo.map(({ a, e }) => `<li>${esc(rotuloCurto(a))} — ${esc(e.equipa || '')}: <b>${esc(e.parte)} · ${esc(e.tempo)}</b> (${esc(descreverEvento(e))})${editar ? ` <button class="btn-link" data-parte="${esc(e.id)}" data-valor="${PRIMEIRA_PARTE.includes(e.tempo) ? '1ª' : '2ª'}">Mudar para ${PRIMEIRA_PARTE.includes(e.tempo) ? '1.ª' : '2.ª'} parte</button>` : ''}</li>`).join('')}</ul>`)}
    ${sec('vf-dup', 'Registos repetidos', R.duplicados.length, 'Oportunidades iguais em tudo no mesmo jogo (parte, tempo, jogadores, momento, mecanismo, zonas e resultado). Podem ser duas jogadas parecidas; confirme antes de apagar.',
      `<ul class="vf-lista">${R.duplicados.map(({ a, evs }, i) => `<li>${evs.length}× ${esc(rotuloCurto(a))} — ${esc(evs[0].equipa || '')}: ${esc(descreverEvento(evs[0]))}${editar && podeApagar() ? ` <button class="btn-link perigo" data-dup="${i}">Manter só um</button>` : ''}</li>`).join('')}</ul>`)}
    ${!editar ? '' : sec('vf-nomes', 'Nomes escritos de formas diferentes', R.nomes.length + R.treinadores.length, 'Jogadores (finalizador, passe, batedor, referência) e treinadores da mesma equipa com grafias parecidas. Escolha a grafia certa e uniformize.',
      `<div class="vf-nomes">${[...R.nomes, ...R.treinadores].map((x, i) => `<div class="vf-nome"><span class="vf-eq">${esc(x.equipa)}${x.treinador ? ' · treinador' : ''}</span>
        <span class="vf-vars">${x.grupo.map(g => `<span>${esc(g.nome)} <i>${g.n}</i></span>`).join('')}</span>
        ${editar ? `<span class="vf-acao"><select data-escolha="${i}">${x.grupo.map(g => `<option>${esc(g.nome)}</option>`).join('')}</select><button class="btn" data-uniformizar="${i}">Uniformizar</button></span>` : ''}</div>`).join('')}</div>`)}`;
  if (!editar) return;
  $$('[data-ir]', v).forEach(b => b.addEventListener('click', () => { App.cod.alvo = b.dataset.ir; location.hash = 'codificacao'; }));
  $$('[data-parte]', v).forEach(b => b.addEventListener('click', async () => {
    try { await App.db.atualizar('eventos', { id: b.dataset.parte }, { parte: b.dataset.valor }); toast('Parte corrigida.'); await recarregar(); } catch (e) { toast(traduzErro(e), 'erro'); }
  }));
  $$('[data-dup]', v).forEach(b => b.addEventListener('click', async () => {
    const g = R.duplicados[Number(b.dataset.dup)]; if (!await confirmar(`Apagar ${g.evs.length - 1} ${g.evs.length - 1 === 1 ? 'registo repetido' : 'registos repetidos'} e manter um?`)) return;
    try { for (const e of g.evs.slice(1)) await App.db.apagar('eventos', { id: e.id }); toast('Repetidos apagados.'); await recarregar(); } catch (e) { toast(traduzErro(e), 'erro'); }
  }));
  const todos = [...R.nomes, ...R.treinadores];
  $$('[data-uniformizar]', v).forEach(b => b.addEventListener('click', async () => {
    const i = Number(b.dataset.uniformizar), x = todos[i], alvo = $(`[data-escolha="${i}"]`, v).value;
    const outros = x.grupo.filter(g => g.nome !== alvo);
    b.disabled = true;
    try {
      if (x.treinador) { for (const g of outros) for (const [p, campo] of g.refs) await App.db.atualizar('partidas', { id: p.id }, { [campo]: alvo }); }
      else { for (const g of outros) for (const [e, campo] of g.evs) await App.db.atualizar('eventos', { id: e.id }, { [campo]: alvo }); }
      toast(`Uniformizado para "${alvo}".`); await recarregar();
    } catch (e) { b.disabled = false; toast(traduzErro(e), 'erro'); }
  }));
}

// ---- Estado da codificação por jornada ----
function temDadosLiga(a, eq) { return (App.d.liga || []).some(r => norm(r.competicao) === norm(a.competicao) && r.jornada === a.jornada && mesmaEquipa(r.equipa, eq)); }
function desenharEstadoCodificacao() {
  const v = $('#vista'); App.estCod ||= {};
  const alvos = (App.idx.alvos || []).filter(a => a.partida && a.jornada != null);
  const comps = [...new Set(alvos.map(a => a.competicao))].sort();
  if (!comps.length) { v.innerHTML = '<div class="cabecalho-vista"><h1>Estado da codificação</h1></div><div class="vazio"><p>Importe o ficheiro da liga para ver os jogos de cada jornada.</p></div>'; return; }
  const E = App.estCod; if (!comps.includes(E.comp)) E.comp = comps.find(c => alvos.some(a => a.competicao === c && a.ladoNosso)) || comps[0];
  const lista = alvos.filter(a => a.competicao === E.comp);
  const jornadas = [...new Set(lista.map(a => a.jornada))].sort((a, b) => a - b);
  const jogado = a => Number.isFinite(a.golosCasa) && Number.isFinite(a.golosFora);
  const contar = (evs, a) => { const c = { casa: 0, fora: 0 }; for (const e of evs) { const l = ladoNoAlvo(e, a); if (l) c[l]++; } return c; };
  let jog = 0, opOk = 0, epOk = 0;
  const linhas = jornadas.map(j => {
    const jogos = lista.filter(a => a.jornada === j).sort((a, b) => a.casa.localeCompare(b.casa, 'pt'));
    const cels = jogos.map(a => {
      const op = contar(App.idx.eventosAlvo[a.key] || [], a), ep = contar(App.idx.esquemasAlvo[a.key] || [], a);
      const temOp = op.casa + op.fora > 0, temEp = ep.casa + ep.fora > 0;
      if (jogado(a)) { jog++; if (temOp) opOk++; if (temEp) epOk++; }
      const est = !jogado(a) ? 'futuro' : temOp && temEp ? 'completo' : temOp || temEp ? 'parcial' : 'falta';
      const ind = (rot, c, tem, chave) => `<button type="button" class="ec-ind ${tem ? 'sim' : 'nao'}" data-cod="${chave}" data-alvo="${esc(a.key)}" ${jogado(a) && pode() ? '' : 'disabled'} title="${rot}: ${c.casa} ${esc(a.casa)} · ${c.fora} ${esc(a.fora)}">${rot} ${tem ? `${c.casa}·${c.fora}` : '—'}</button>`;
      return `<div class="ec-jogo ${est}"${a.ladoNosso ? ' data-nosso="1"' : ''}>
        <span class="ec-eqs">${esc(a.casa)} <b>${jogado(a) ? `${a.golosCasa}–${a.golosFora}` : '–'}</b> ${esc(a.fora)}</span>
        ${jogado(a) ? `<span class="ec-inds">${ind('OP', op, temOp, 'op')}${ind('EP', ep, temEp, 'ep')}</span>` : '<span class="ec-inds fraco">por jogar</span>'}
        ${jogado(a) && ehDep() ? `<span class="ec-dados">${[a.casa, a.fora].map(eq => `<button type="button" class="ec-ind ec-dd ${temDadosLiga(a, eq) ? 'sim' : 'nao'}" data-dados="${esc(a.key)}" data-eq="${esc(eq)}" title="${temDadosLiga(a, eq) ? 'Já tem' : 'Sem'} dados estatísticos de ${esc(eq)}: carregar a exportação do Wyscout">Dados ${esc(eq)}</button>`).join('')}</span>` : ''}
      </div>`;
    }).join('');
    const feitos = jogos.filter(a => jogado(a)).length;
    return `<div class="ec-linha"><span class="ec-j">J${j}<small>${feitos}/${jogos.length}</small></span><div class="ec-jogos">${cels}</div></div>`;
  }).join('');
  const pct = (x, t) => (t ? Math.round(x / t * 100) : 0);
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Estado da codificação</h1><p class="nota">Jogos de cada jornada com oportunidades (OP) e esquemas táticos (EP) codificados (números da equipa da casa · fora)${ehDep() ? ', e os dados estatísticos de cada equipa: «Dados» abre o carregamento da exportação do Wyscout' : ''}.</p></div></div>
    <div class="filtros"><label>Competição<select id="ec-comp">${comps.map(c => `<option ${c === E.comp ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>${ehDep() ? '<button class="btn" id="ec-wy">Carregar Team stats (Wyscout)</button>' : ''}</div>
    <section class="placar">
      <div class="placar-cel"><span class="placar-rot">Jogos realizados</span><b class="placar-val">${jog}</b></div>
      <div class="placar-cel"><span class="placar-rot">Oportunidades</span><b class="placar-val">${opOk}<small>/${jog}</small></b><span class="placar-sub">${pct(opOk, jog)}% dos jogos codificados</span></div>
      <div class="placar-cel"><span class="placar-rot">Esquemas táticos</span><b class="placar-val">${epOk}<small>/${jog}</small></b><span class="placar-sub">${pct(epOk, jog)}% dos jogos codificados</span></div>
    </section>
    <div class="ec-legenda"><span class="ec-jogo completo">Completo</span><span class="ec-jogo parcial">Falta OP ou EP</span><span class="ec-jogo falta">Por codificar</span><span class="ec-jogo futuro">Por jogar</span></div>
    <section class="bloco ec-grelha">${linhas}</section>`;
  $('#ec-comp').addEventListener('change', e => { E.comp = e.target.value; desenharEstadoCodificacao(); });
  $('#ec-wy')?.addEventListener('click', () => dialogoDadosEquipa({ competicao: E.comp }, null));
  $$('[data-dados]', v).forEach(b => b.addEventListener('click', () => dialogoDadosEquipa(App.idx.alvo[b.dataset.dados], b.dataset.eq)));
  $$('[data-cod]', v).forEach(b => b.addEventListener('click', () => {
    const a = App.idx.alvo[b.dataset.alvo];
    if (b.dataset.cod === 'op') { Object.assign(App.cod, { alvo: a.key, side: a.ladoNosso || 'casa' }); location.hash = 'codificacao'; }
    else { App.codEP ||= { form: {}, ponto: 'batida', filtro: 'todos' }; Object.assign(App.codEP, { alvo: a.key, side: a.ladoNosso || 'casa' }); location.hash = 'codesquemas'; }
  }));
}
