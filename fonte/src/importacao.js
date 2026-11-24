// ---------- Importação Wyscout ----------
function desenharImportacao() {
  const v = $('#vista'); const I = App.imp;
  const eq = I.tipo === 'equipa';
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Importação</h1><p class="nota">Arraste a exportação do Wyscout. O ficheiro original fica guardado e os dados entram na base de dados; importar o mesmo jogo outra vez atualiza-o em vez de o duplicar.</p></div></div>
    <div class="segmentado largo" role="radiogroup" aria-label="Tipo de ficheiro">
      <label><input type="radio" name="imp-tipo" value="equipa" ${I.tipo === 'equipa' ? 'checked' : ''}><span>Estatísticas de equipa</span></label>
      <label><input type="radio" name="imp-tipo" value="jogadores" ${I.tipo === 'jogadores' ? 'checked' : ''}><span>Estatísticas de jogadores</span></label>
      <label><input type="radio" name="imp-tipo" value="oportunidades" ${I.tipo === 'oportunidades' ? 'checked' : ''}><span>Oportunidades (folha)</span></label>
      <label><input type="radio" name="imp-tipo" value="esquemas" ${I.tipo === 'esquemas' ? 'checked' : ''}><span>Esquemas táticos (folha)</span></label>
    </div>
    <section class="bloco">
      <p class="instrucao">${I.tipo === 'esquemas' ? 'A folha de esquemas táticos (colunas Equipa, Adversário, Treinador, Lado, Distância, ETD, Mecanismo, Tipo de Bola, 1º Contacto, Zona, Outcome, 2a vaga, Batedor, Referência; a coluna Jornada é opcional mas necessária na 2.ª volta). Importe primeiro o ficheiro da liga. Importar a folha outra vez substitui os esquemas que vieram dela nos mesmos jogos; os codificados na app não são tocados.' : I.tipo === 'oportunidades' ? 'A folha de codificação de oportunidades por zonas (colunas Clube, Jornada, Adversário, Momento, Sub-Momento, Mecanismo, Zona de Finalização, Golo?…). Importe primeiro o ficheiro da liga, para as oportunidades ficarem ligadas aos jogos do campeonato. Importar a folha outra vez substitui as oportunidades que vieram dela nos mesmos jogos; as codificadas na app não são tocadas.' : eq
        ? 'No Wyscout, abra a página da equipa, separador <b>Estatísticas</b> (Team stats), e exporte para Excel ou CSV. Cada jogo tem duas linhas: a equipa e o adversário. O ficheiro da vossa equipa entra nos vossos jogos; os <b>Team stats de adversários</b> (pode escolher vários ficheiros de uma vez) ficam guardados para a observação e o pré-jogo. Também aceita o ficheiro de estatísticas da liga (uma linha por equipa e por jornada).'
        : 'Aceita a exportação de um <b>jogador</b> do Wyscout (todos os jogos dele: só entram os desta época com a vossa equipa, e os jogos da liga ganham a data) ou as estatísticas dos jogadores de um jogo. O nome do jogador é sugerido a partir do nome do ficheiro.'}</p>
      <label class="zona-ficheiro" id="i-zona">
        <input type="file" id="i-ficheiro" accept=".xlsx,.xls,.csv,.tsv,.txt" ${I.tipo === 'jogadores' || I.tipo === 'equipa' ? 'multiple' : ''}>
        <span class="zona-titulo">${I.loteAdv ? `${I.loteAdv.length} ${I.loteAdv.length === 1 ? 'ficheiro' : 'ficheiros'} de adversários` : I.lote ? `${I.lote.length} ficheiros` : I.ficheiro ? esc(I.ficheiro.name) : I.tipo === 'jogadores' ? 'Arraste os ficheiros para aqui' : 'Arraste o ficheiro para aqui'}</span>
        <span class="zona-sub">${I.ficheiro || I.lote || I.loteAdv ? 'Clique ou arraste outros ficheiros para trocar' : I.tipo === 'jogadores' ? 'ou clique para escolher; pode escolher os ficheiros de vários jogadores de uma vez' : 'ou clique para escolher (.xlsx, .xls, .csv ou .txt)'}</span>
      </label>
      <div id="i-analise"></div>
    </section>
    <section class="bloco" id="i-historico"></section>`;
  $$('input[name=imp-tipo]', v).forEach(r => r.addEventListener('change', () => { Object.assign(I, { tipo: r.value, tab: null, ficheiro: null, analise: null, lote: null, loteAdv: null }); desenharImportacao(); }));
  const zona = $('#i-zona');
  $('#i-ficheiro').addEventListener('change', e => lerFicheiros([...e.target.files]));
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('arrastar'); }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, () => zona.classList.remove('arrastar')));
  zona.addEventListener('drop', e => { e.preventDefault(); lerFicheiros([...e.dataTransfer.files]); });
  if (I.loteAdv) desenharLoteAdv(); else if (I.lote) desenharLote(); else if (I.tab) desenharAnalise();
  desenharHistorico();
}

function lerFicheiros(fs) {
  if (!fs.length) return;
  if (fs.length > 1 && App.imp.tipo === 'jogadores') return lerLote(fs);
  if (App.imp.tipo === 'equipa') return lerTeamStatsEquipas(fs);
  if (fs.length > 1) toast('Este tipo de importação aceita um ficheiro de cada vez: usei o primeiro.', 'erro');
  return lerFicheiro(fs[0]);
}

async function lerFicheiro(f) {
  const I = App.imp; I.lote = null; I.loteAdv = null;
  try {
    const linhas = await lerFicheiroTabela(f);
    if (!linhas.length) throw new Error('O ficheiro está vazio.');
    I.ficheiro = f;
    if (I.tipo === 'esquemas') {
      I.tab = detetarFolhaEsquemas(linhas); I.escolhasEP = {};
      if (!I.tab) throw new Error('não encontrei as colunas da folha de esquemas táticos (Equipa, Adversário, ETD, 1º Contacto, Zona).');
    } else if (I.tipo === 'oportunidades') {
      I.tab = detetarFolhaOportunidades(linhas);
      if (!I.tab) throw new Error('não encontrei as colunas da folha de oportunidades (Clube, Adversário, Momento, Zona de Finalização, Golo?).');
    } else I.tab = (I.tipo === 'equipa' && detetarFormatoLiga(linhas)) || prepararTabela(linhas, I.tipo === 'equipa' ? PAPEIS_EQUIPA : PAPEIS_JOGADOR);
    I.equipaNossa = null; I.criarJogos = true;
    // Ficheiro de um só jogador (sem coluna do nome): adivinha o jogador pelo nome do ficheiro.
    I.jogadorNome = I.tipo === 'jogadores' ? adivinharJogador(f.name) : null;
    I.jogoId = null;
    desenharImportacao();
  } catch (err) {
    toast(`Não consegui ler o ficheiro: ${err.message}`, 'erro');
  }
}

function analisarAtual() {
  const I = App.imp;
  I.analise = I.tipo === 'equipa'
    ? analisarEquipa(I.tab, App.cfg, App.d.mapas, App.d.jogos)
    : analisarJogadores(I.tab, App.cfg, App.d.mapas, App.d.jogos, { jogoId: I.jogoId, ladoPadrao: I.lado, jogador: chaveDoNome(I.jogadorNome), criarJogos: I.criarJogos !== false });
}

function desenharAnalise() {
  if (App.imp.tab.formato === 'liga') return desenharAnaliseLiga();
  if (App.imp.tab.formato === 'oportunidades') return desenharAnaliseFolha();
  if (App.imp.tab.formato === 'esquemas') return desenharAnaliseFolhaEP();
  const I = App.imp; const T = I.tab; const eq = I.tipo === 'equipa';
  analisarAtual();
  const A = I.analise;
  const papeis = eq ? PAPEIS_EQUIPA : PAPEIS_JOGADOR;
  const semData = !eq && (T.papeis.data === null || T.papeis.data === undefined);
  const jogos = App.d.jogos.slice().sort((a, b) => compararJogos(b, a));
  const n = eq ? A.jogos.length : A.linhas.length;
  let resumo = '';
  if (eq && n) {
    const novos = A.jogos.filter(j => !j.existe).length;
    resumo = `${n} ${n === 1 ? 'jogo encontrado' : 'jogos encontrados'}: ${novos} ${novos === 1 ? 'novo' : 'novos'}, ${n - novos} já ${n - novos === 1 ? 'existia (será atualizado)' : 'existiam (serão atualizados)'}. ${A.nMetricas} métricas por jogo.`;
  } else if (!eq && n) {
    const nJogos = new Set(A.linhas.map(l => l.jogo_id || `n${l.jogo.data}${l.jogo.adversario}`)).size;
    const nos = A.linhas.filter(l => l.lado === 'nos').length;
    resumo = A.umJogador
      ? `${n} jogos de ${A.linhas[0].jogador}${A.epoca ? ` na época ${A.epoca.slice(0, 4)}/${String(Number(A.epoca.slice(0, 4)) + 1).slice(2)}` : ''}: ${n - A.nNovos > 0 ? `${A.linhas.filter(l => !l.novoJogo).length} ligados a jogos que já existem` : ''}${A.nNovos ? `${n - A.nNovos > 0 ? ', ' : ''}${A.nNovos} ${A.nNovos === 1 ? 'jogo novo' : 'jogos novos'} a criar` : ''}. ${A.nMetricas} métricas por jogo.${A.outrosClubes || A.epocasAnteriores ? ` Ficam de fora ${A.outrosClubes + A.epocasAnteriores} jogos de outros clubes ou épocas anteriores.` : ''}`
      : `${n} registos de jogadores em ${nJogos} ${nJogos === 1 ? 'jogo' : 'jogos'} (${nos} da vossa equipa, ${n - nos} do adversário). ${A.nMetricas} métricas por jogador.`;
  }
  $('#i-analise').innerHTML = `
    <h2>Colunas</h2>
    <p class="nota">Detetei automaticamente as colunas principais. Corrija se alguma estiver errada; todas as restantes colunas numéricas são guardadas como métricas.</p>
    <div class="papeis">
      ${papeis.map(p => `<label>${PAPEIS[p].rotulo}<select data-papel="${p}"><option value="">— nenhuma —</option>${T.colunas.map((c, i) => `<option value="${i}" ${T.papeis[p] === i ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`).join('')}
    </div>
    ${!eq && (T.papeis.jogador === null || T.papeis.jogador === undefined) ? `<div class="grelha-2">
      <label>Jogador deste ficheiro<input id="i-jogador" list="i-jogadores" value="${esc(I.jogadorNome || '')}" autocomplete="off" placeholder="Nome do jogador"><datalist id="i-jogadores">${App.d.plantel.map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist></label>
      ${T.papeis.jogo !== null && T.papeis.jogo !== undefined ? `<label class="em-linha caixa"><input type="checkbox" id="i-criar" ${I.criarJogos !== false ? 'checked' : ''}> Criar os jogos da vossa equipa que ainda não existem na app (por exemplo, taças e jogos europeus)</label>` : ''}
    </div>` : ''}
    ${semData && (T.papeis.jogo === null || T.papeis.jogo === undefined) ? `<div class="grelha-2">
      <label>Jogo deste ficheiro<select id="i-jogo"><option value="">Escolha o jogo…</option>${jogos.map(j => `<option value="${j.id}" ${I.jogoId === j.id ? 'selected' : ''}>${esc(rotuloJogo(j))}</option>`).join('')}</select></label>
      ${T.papeis.equipa === null || T.papeis.equipa === undefined ? `<label>Os jogadores são de<select id="i-lado"><option value="nos" ${I.lado === 'nos' ? 'selected' : ''}>${esc(App.cfg.nome_clube || 'Nós')}</option><option value="adversario" ${I.lado === 'adversario' ? 'selected' : ''}>Adversário</option></select></label>` : ''}
    </div>` : ''}
    ${A.avisos.length ? `<ul class="avisos" role="status">${A.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${n ? `<h2>Pré-visualização</h2><p class="destaque">${esc(resumo)}${A.ignoradas ? ` <span class="fraco">${A.ignoradas} linhas ignoradas (sem data, totais ou sem jogo).</span>` : ''}</p>
      ${eq ? tabelaPreviaEquipa(A.jogos) : tabelaPreviaJogadores(A.linhas)}
      <div class="acoes-esq"><button class="btn btn-prim" id="i-importar">Importar ${n} ${eq ? (n === 1 ? 'jogo' : 'jogos') : 'registos'}</button></div>` : ''}`;
  $$('[data-papel]').forEach(s => s.addEventListener('change', () => {
    const p = s.dataset.papel; const val = s.value === '' ? null : Number(s.value);
    for (const k of Object.keys(T.papeis)) if (k !== p && T.papeis[k] === val && val !== null) T.papeis[k] = null;
    T.papeis[p] = val; desenharAnalise();
  }));
  $('#i-jogador')?.addEventListener('change', e => { I.jogadorNome = e.target.value.trim() || null; desenharAnalise(); });
  $('#i-criar')?.addEventListener('change', e => { I.criarJogos = e.target.checked; desenharAnalise(); });
  $('#i-jogo')?.addEventListener('change', e => { I.jogoId = e.target.value || null; desenharAnalise(); });
  $('#i-lado')?.addEventListener('change', e => { I.lado = e.target.value; desenharAnalise(); });
  $('#i-importar')?.addEventListener('click', e => (eq ? importarEquipa : importarJogadores)(e.currentTarget));
}

function tabelaPreviaEquipa(jogos) {
  return `<div class="tabela-env"><table class="tabela compacta">
    <thead><tr><th>Data</th><th>Adversário</th><th>Competição</th><th>Local</th><th class="num">Resultado</th><th>Estado</th></tr></thead>
    <tbody>${jogos.map(j => `<tr><td>${fmtData(j.data)}</td><td>${esc(j.adversario)}</td><td>${esc(j.competicao || '–')}</td>
      <td>${j.local === 'casa' ? 'Casa' : j.local === 'fora' ? 'Fora' : '–'}</td>
      <td class="num">${Number.isFinite(j.golos_marcados) && Number.isFinite(j.golos_sofridos) ? `${j.golos_marcados}–${j.golos_sofridos}` : '–'}</td>
      <td>${j.existe ? 'Atualiza' : '<b>Novo</b>'}${j.metricasAdv ? '' : ' <span class="fraco">(sem linha do adversário)</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}

function tabelaPreviaJogadores(linhas) {
  const mostrar = linhas.slice(0, 40);
  return `<div class="tabela-env"><table class="tabela compacta">
    <thead><tr><th>Jogo</th><th>Estado</th><th>Jogador</th><th>Equipa</th><th>Posição</th><th class="num">Minutos</th><th class="num">Métricas</th></tr></thead>
    <tbody>${mostrar.map(l => `<tr><td>${esc(rotuloJogo(l.jogo, true))}${l.jogo.competicao && l.novoJogo ? ` <span class="fraco">${esc(l.jogo.competicao)}</span>` : ''}</td>
      <td>${l.novoJogo ? '<b>Jogo novo</b>' : l.atualizaData ? `Liga a ${esc(quandoJogo(l.jogo, true))} (+ data${l.resultadoNovo ? ' e resultado' : ''})` : 'Jogo existente'}</td><td>${esc(l.jogador)}</td><td><span class="ponto-cor ${l.lado === 'nos' ? 'nos' : 'adv'}"></span>${esc(l.equipa || '')}</td>
      <td>${esc(l.posicao || '–')}</td><td class="num">${fmtNum(l.minutos, 0)}</td><td class="num">${Object.keys(l.metricas).length}</td></tr>`).join('')}</tbody></table></div>
    ${linhas.length > mostrar.length ? `<p class="nota">E mais ${linhas.length - mostrar.length} registos.</p>` : ''}`;
}

async function registarImportacao(tipo, linhas, resumo, ficheiro = App.imp.ficheiro) {
  let caminho = null; let avisoFicheiro = null;
  try { caminho = await App.db.carregarFicheiro(ficheiro); } catch (err) { avisoFicheiro = err.message; }
  const imp = await App.db.inserir('importacoes', { tipo, ficheiro: ficheiro.name, caminho_storage: caminho, linhas, resumo });
  return { imp, avisoFicheiro };
}

async function importarEquipa(btn) {
  const A = App.imp.analise; btn.disabled = true; btn.textContent = 'A importar…';
  try {
    const existentes = {}; for (const j of App.d.jogos) existentes[`${j.data}|${norm(j.adversario)}`] = j;
    const novos = A.jogos.filter(j => !j.existe).length;
    const { imp, avisoFicheiro } = await registarImportacao('equipa', A.jogos.length, { novos, atualizados: A.jogos.length - novos });
    // Mantém os valores já registados quando o ficheiro não os traz.
    const linhasJogos = A.jogos.map(j => {
      const ex = existentes[`${j.data}|${norm(j.adversario)}`] || {};
      return {
        data: j.data, adversario: ex.adversario || j.adversario, competicao: j.competicao ?? ex.competicao ?? null, local: j.local ?? ex.local ?? null,
        golos_marcados: j.golos_marcados ?? ex.golos_marcados ?? null, golos_sofridos: j.golos_sofridos ?? ex.golos_sofridos ?? null
      };
    });
    const guardados = await App.db.upsert('jogos', linhasJogos, 'data,adversario');
    const idPorChave = {}; for (const g of guardados) idPorChave[`${g.data}|${norm(g.adversario)}`] = g.id;
    const agora = new Date().toISOString(); const est = [];
    for (const j of A.jogos) {
      const jogo_id = idPorChave[`${j.data}|${norm(j.adversario)}`]; if (!jogo_id) continue;
      est.push({ jogo_id, lado: 'nos', equipa: j.equipaNos, metricas: j.metricasNos, importacao_id: imp.id, updated_at: agora });
      if (j.metricasAdv) est.push({ jogo_id, lado: 'adversario', equipa: j.equipaAdv, metricas: j.metricasAdv, importacao_id: imp.id, updated_at: agora });
    }
    await App.db.upsert('estatisticas_equipa', est, 'jogo_id,lado');
    terminarImportacao(`${A.jogos.length} ${A.jogos.length === 1 ? 'jogo importado' : 'jogos importados'} (${novos} ${novos === 1 ? 'novo' : 'novos'}).`, avisoFicheiro);
  } catch (err) { btn.disabled = false; btn.textContent = 'Tentar outra vez'; toast(err.message, 'erro'); }
}

async function importarJogadores(btn) {
  const A = App.imp.analise; btn.disabled = true; btn.textContent = 'A importar…';
  try {
    const { novos, avisoFicheiro } = await gravarJogadores(A, App.imp.ficheiro);
    terminarImportacao(A.umJogador ? `${A.linhas.length} jogos de ${A.linhas[0].jogador} importados${novos ? ` (${novos} ${novos === 1 ? 'jogo novo criado' : 'jogos novos criados'})` : ''}.` : `${A.linhas.length} registos de jogadores importados.`, avisoFicheiro);
  } catch (err) { btn.disabled = false; btn.textContent = 'Tentar outra vez'; toast(err.message, 'erro'); }
}

// Grava uma análise de jogadores (um ficheiro). Devolve o número de jogos novos criados.
async function gravarJogadores(A, ficheiro) {
  const { imp, avisoFicheiro } = await registarImportacao('jogadores', A.linhas.length, { jogador: A.umJogador ? A.linhas[0]?.jogador : null, jogos_novos: A.nNovos || 0 }, ficheiro);
  const agora = new Date().toISOString();
  // 1) Jogos novos (de outras competições) e 2) datas em falta nos jogos que vieram do ficheiro da liga.
  const novos = [...new Set(A.linhas.filter(l => l.novoJogo).map(l => l.novoJogo))];
  if (novos.length) {
    const guardados = await App.db.upsert('jogos', novos.map(j => ({ data: j.data, adversario: j.adversario, competicao: j.competicao, local: j.local, golos_marcados: j.golos_marcados, golos_sofridos: j.golos_sofridos })), 'data,adversario');
    for (const l of A.linhas) if (l.novoJogo) l.jogo_id = guardados.find(g => g.data === l.novoJogo.data && norm(g.adversario) === norm(l.novoJogo.adversario))?.id;
  }
  for (const l of A.linhas) {
    const patch = { ...(l.atualizaData ? { data: l.atualizaData } : {}), ...(l.resultadoNovo || {}) };
    if (l.jogo_id && Object.keys(patch).length) await App.db.atualizar('jogos', { id: l.jogo_id }, patch);
  }
  await App.db.upsert('estatisticas_jogador', A.linhas.filter(l => l.jogo_id).map(l => ({
    jogo_id: l.jogo_id, jogador: l.jogador, lado: l.lado, equipa: l.equipa, posicao: l.posicao, minutos: l.minutos, metricas: l.metricas, importacao_id: imp.id, updated_at: agora
  })), 'jogo_id,jogador,lado');
  return { novos: new Set(novos.map(j => `${j.data}|${norm(j.adversario)}`)).size, avisoFicheiro };
}

function chaveDoNome(nome) { const pj = App.d.plantel.find(p => norm(p.nome) === norm(nome)); return pj ? chaveEstat(pj) : nome; }

// ---- Vários ficheiros de jogadores de uma vez ----
async function lerLote(fs) {
  const I = App.imp; const lote = [];
  for (const f of fs) {
    const item = { ficheiro: f, jogadorNome: adivinharJogador(f.name) };
    try {
      const linhas = await lerFicheiroTabela(f); if (!linhas.length) throw new Error('o ficheiro está vazio');
      item.tab = prepararTabela(linhas, PAPEIS_JOGADOR);
    } catch (err) { item.erro = err.message; }
    lote.push(item);
  }
  Object.assign(I, { lote, tab: null, ficheiro: null, analise: null, jogoId: null });
  desenharImportacao();
}
function analisarItem(item) {
  item.analise = null; if (item.erro) return;
  const T = item.tab;
  if ((T.papeis.data === null || T.papeis.data === undefined) && (T.papeis.jogo === null || T.papeis.jogo === undefined)) { item.problema = 'sem datas nem jogos: importe este ficheiro sozinho para escolher o jogo'; return; }
  if ((T.papeis.jogador === null || T.papeis.jogador === undefined) && !item.jogadorNome) { item.problema = 'indique o jogador'; return; }
  item.problema = null;
  item.analise = analisarJogadores(T, App.cfg, App.d.mapas, App.d.jogos, { jogoId: null, ladoPadrao: 'nos', jogador: chaveDoNome(item.jogadorNome), criarJogos: true });
}
function desenharLote() {
  const I = App.imp; const lote = I.lote;
  lote.forEach(analisarItem);
  const validos = lote.filter(it => it.analise?.linhas.length);
  const estado = it => it.erro ? `<span class="erro-txt">Não consegui ler: ${esc(it.erro)}</span>` : it.problema ? `<span class="erro-txt">${esc(it.problema)}</span>`
    : !it.analise.linhas.length ? `<span class="erro-txt">Sem jogos desta época com a vossa equipa${it.analise.avisos[0] ? `: ${esc(it.analise.avisos[0])}` : ''}</span>`
    : `${it.analise.linhas.length} ${it.analise.linhas.length === 1 ? 'jogo' : 'jogos'}${it.analise.nNovos ? `, ${it.analise.nNovos} ${it.analise.nNovos === 1 ? 'jogo novo' : 'jogos novos'}` : ''}`;
  const semJogadorCol = it => it.tab && (it.tab.papeis.jogador === null || it.tab.papeis.jogador === undefined);
  $('#i-analise').innerHTML = `
    <h2>${lote.length} ficheiros</h2>
    <p class="nota">O jogador de cada ficheiro é sugerido pelo nome do ficheiro: confirme antes de importar. Cada ficheiro traz a época toda do jogador, por isso importar outra vez atualiza os jogos que já existiam.</p>
    <div class="tabela-env"><table class="tabela compacta lote">
      <thead><tr><th>Ficheiro</th><th>Jogador</th><th>Estado</th></tr></thead>
      <tbody>${lote.map((it, k) => `<tr><td>${esc(it.ficheiro.name)}</td>
        <td>${semJogadorCol(it) ? `<input data-lote="${k}" list="i-jogadores" value="${esc(it.jogadorNome || '')}" autocomplete="off" placeholder="Nome do jogador" aria-label="Jogador de ${esc(it.ficheiro.name)}">` : '<span class="fraco">vários (coluna do ficheiro)</span>'}</td>
        <td>${estado(it)}</td></tr>`).join('')}</tbody>
    </table></div>
    <datalist id="i-jogadores">${App.d.plantel.map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist>
    <div class="acoes-esq">
      ${validos.length ? `<button class="btn btn-prim" id="i-importar-lote">Importar ${validos.length} ${validos.length === 1 ? 'ficheiro' : 'ficheiros'}</button>` : ''}
      <button class="btn" id="i-cancelar-lote">Cancelar</button>
    </div>`;
  $$('[data-lote]').forEach(inp => inp.addEventListener('change', () => { lote[Number(inp.dataset.lote)].jogadorNome = inp.value.trim() || null; desenharLote(); }));
  $('#i-cancelar-lote').addEventListener('click', () => { I.lote = null; desenharImportacao(); });
  $('#i-importar-lote')?.addEventListener('click', e => importarLote(e.currentTarget));
}
async function importarLote(btn) {
  const I = App.imp; const itens = I.lote.filter(it => it.analise?.linhas.length);
  btn.disabled = true; let feitos = 0, jogos = 0, novos = 0; const falhas = [], avisos = [];
  for (const it of itens) {
    btn.textContent = `A importar ${feitos + falhas.length + 1} de ${itens.length}…`;
    try {
      analisarItem(it); // com os jogos já atualizados pelos ficheiros anteriores
      if (!it.analise?.linhas.length) throw new Error('sem jogos');
      const r = await gravarJogadores(it.analise, it.ficheiro);
      feitos++; jogos += it.analise.linhas.length; novos += r.novos; if (r.avisoFicheiro) avisos.push(r.avisoFicheiro);
      await carregarDados();
    } catch (err) { falhas.push(`${it.jogadorNome || it.ficheiro.name} (${err.message})`); }
  }
  I.lote = null;
  if (falhas.length) toast(`Não foi possível importar: ${falhas.join('; ')}`, 'erro');
  terminarImportacao(`${feitos} ${feitos === 1 ? 'jogador importado' : 'jogadores importados'} (${jogos} registos de jogos${novos ? `, ${novos} ${novos === 1 ? 'jogo novo' : 'jogos novos'}` : ''}).`, avisos[0]);
}

async function terminarImportacao(msg, avisoFicheiro) {
  Object.assign(App.imp, { tab: null, ficheiro: null, analise: null, jogoId: null });
  await recarregar();
  toast(msg);
  if (avisoFicheiro) toast(`Os dados foram importados, mas o ficheiro original não foi guardado: ${avisoFicheiro}`, 'erro');
}

function desenharHistorico() {
  const el = $('#i-historico');
  const lista = App.d.importacoes.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 12);
  el.innerHTML = `<h2>Últimas importações</h2>${lista.length ? `<div class="tabela-env"><table class="tabela compacta">
    <thead><tr><th>Quando</th><th>Tipo</th><th>Ficheiro</th><th class="num">Linhas</th></tr></thead>
    <tbody>${lista.map(i => `<tr><td>${new Date(i.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${({ equipa: 'Equipa', jogadores: 'Jogadores', liga: 'Liga', oportunidades: 'Oportunidades', esquemas: 'Esquemas táticos' })[i.tipo] || i.tipo}</td><td>${esc(i.ficheiro)}</td><td class="num">${i.linhas ?? '–'}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="fraco">Ainda não foi importado nenhum ficheiro.</p>'}`;
}

// ---------- Ficheiro da liga ----------
function desenharAnaliseLiga() {
  const I = App.imp; const T = I.tab;
  I.analise = analisarLiga(T, App.cfg, App.d.mapas, App.d.jogos, I.equipaNossa);
  const A = I.analise;
  if (!I.equipaNossa && A.nossa) I.equipaNossa = A.nossa;
  const jornadas = [...new Set(A.liga.map(r => r.jornada))];
  const novos = A.jogos.filter(j => !j.existe).length + A.porJogar.filter(j => !j.existe).length;
  $('#i-analise').innerHTML = `
    <h2>Ficheiro da liga</h2>
    <p class="destaque">${T.equipas.length} equipas, ${A.liga.length} registos de ${jornadas.length} ${jornadas.length === 1 ? 'jornada' : 'jornadas'} (J${Math.min(...jornadas)} a J${Math.max(...jornadas)}), ${A.nMetricas} indicadores por equipa.</p>
    <div class="grelha-2">
      <label>Época<select id="i-epoca">${opcoesEpoca().map(e => `<option ${e === App.epoca ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      <label>A vossa equipa neste ficheiro<select id="i-nossa"><option value="">Escolha a equipa…</option>${T.equipas.map(e => `<option ${norm(e) === norm(A.nossa) ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
    </div>
    ${A.avisos.length || App.epoca !== epocaDe(hojeIso()) ? `<ul class="avisos" role="status">${App.epoca !== epocaDe(hojeIso()) ? `<li>Vai importar para a época ${App.epoca}, que não é a época atual (${epocaDe(hojeIso())}). Confirme a época acima.</li>` : ''}${A.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${A.nossa ? `
      <h2>Pré-visualização</h2>
      <p class="destaque">${A.jogos.length} ${A.jogos.length === 1 ? 'jogo realizado' : 'jogos realizados'} de ${esc(A.nossa)}${A.porJogar.length ? ` e ${A.porJogar.length} por jogar` : ''}; ${novos} ${novos === 1 ? 'jogo novo' : 'jogos novos'} na base de dados. As estatísticas de todas as equipas ficam guardadas para a comparação com a liga.</p>
      <div class="tabela-env"><table class="tabela compacta">
        <thead><tr><th>Jornada</th><th>Adversário</th><th>Local</th><th class="num">Resultado</th><th>Estado</th></tr></thead>
        <tbody>${[...A.jogos, ...A.porJogar].sort((a, b) => a.jornada - b.jornada).map(j => `<tr><td>J${j.jornada}</td><td>${esc(j.adversario)}</td>
          <td>${j.local === 'casa' ? 'Casa' : j.local === 'fora' ? 'Fora' : '–'}</td>
          <td class="num">${j.jogado && Number.isFinite(j.golos_marcados) ? `${j.golos_marcados}–${j.golos_sofridos ?? '?'}` : '–'}</td>
          <td>${!j.jogado ? '<span class="fraco">Por jogar</span>' : j.existe ? 'Atualiza' : '<b>Novo</b>'}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="acoes-esq"><button class="btn btn-prim" id="i-importar">Importar ${A.liga.length} registos da liga</button></div>` : ''}`;
  $('#i-nossa').addEventListener('change', e => { I.equipaNossa = e.target.value || null; desenharAnaliseLiga(); });
  $('#i-epoca').addEventListener('change', async e => { await mudarEpoca(e.target.value, false); desenharAnaliseLiga(); });
  $('#i-importar')?.addEventListener('click', e => importarLiga(e.currentTarget));
}

async function importarLiga(btn) {
  const A = App.imp.analise; btn.disabled = true; btn.textContent = 'A importar…';
  // O ficheiro fica na época selecionada (os dados em memória — e o que é substituído — são só dessa época).
  const E = App.epoca;
  try {
    const todos = [...A.jogos, ...A.porJogar];
    const { imp, avisoFicheiro } = await registarImportacao('liga', A.liga.length, { equipa: A.nossa, jogos: A.jogos.length, por_jogar: A.porJogar.length });
    // Jogos da vossa equipa: mantém o que já estava registado (data, notas) quando o ficheiro não traz o valor.
    const ex = {}; for (const j of App.d.jogos) ex[`${norm(j.competicao)}|${j.jornada}|${norm(j.adversario)}`] = j;
    const linhasJogos = todos.map(j => {
      const e = ex[`${norm(j.competicao)}|${j.jornada}|${norm(j.adversario)}`] || {};
      return { epoca: E, competicao: j.competicao, jornada: j.jornada, adversario: e.adversario || j.adversario, data: e.data ?? null, local: j.local ?? e.local ?? null,
        golos_marcados: j.golos_marcados ?? e.golos_marcados ?? null, golos_sofridos: j.golos_sofridos ?? e.golos_sofridos ?? null };
    });
    const guardados = await App.db.upsert('jogos', linhasJogos, 'epoca,competicao,jornada,adversario');
    const idPor = {}; for (const g of guardados) idPor[`${norm(g.competicao)}|${g.jornada}|${norm(g.adversario)}`] = g.id;
    const agora = new Date().toISOString(); const est = [];
    for (const j of A.jogos) {
      const jogo_id = idPor[`${norm(j.competicao)}|${j.jornada}|${norm(j.adversario)}`]; if (!jogo_id) continue;
      est.push({ jogo_id, lado: 'nos', equipa: j.equipaNos, metricas: j.metricasNos, importacao_id: imp.id, updated_at: agora });
      if (j.metricasAdv) est.push({ jogo_id, lado: 'adversario', equipa: j.equipaAdv, metricas: j.metricasAdv, importacao_id: imp.id, updated_at: agora });
    }
    if (est.length) await App.db.upsert('estatisticas_equipa', est, 'jogo_id,lado');
    await App.db.upsert('estatisticas_liga', A.liga.map(r => ({
      epoca: E, competicao: r.competicao, jornada: r.jornada, equipa: r.equipa, adversario: r.adversario, local: r.local,
      golos: r.golos, golos_sofridos: r.golos_sofridos, metricas: r.metricas, importacao_id: imp.id, updated_at: agora
    })), 'epoca,competicao,jornada,equipa,adversario');
    // Acrescenta/atualiza; nunca apaga outras jornadas. Só sai um registo antigo quando a mesma equipa, na mesma jornada,
    // aparece no ficheiro com outro adversário (o jogo foi corrigido).
    const novas = new Set(A.liga.map(r => `${norm(r.competicao)}|${r.jornada}|${norm(r.equipa)}|${norm(r.adversario)}`));
    const eqJor = new Set(A.liga.map(r => `${norm(r.competicao)}|${r.jornada}|${norm(r.equipa)}`));
    const antigos = (App.d.liga || []).filter(r => !r.deTeamStats && eqJor.has(`${norm(r.competicao)}|${r.jornada}|${norm(r.equipa)}`) && !novas.has(`${norm(r.competicao)}|${r.jornada}|${norm(r.equipa)}|${norm(r.adversario)}`));
    for (const r of antigos) await App.db.apagar('estatisticas_liga', { id: r.id });
    // Jogos do campeonato: atualiza jornada e resultado; remove os que já não existem e não têm oportunidades codificadas.
    try {
      const nossaChave = j => `${norm(j.competicao)}|${j.jornada}|${norm(j.adversario)}`;
      const linhasP = A.partidas.map(p => {
        const nossa = norm(p.casa) === norm(A.nossa) || mesmaEquipa(p.casa, A.nossa) ? 'casa' : norm(p.fora) === norm(A.nossa) || mesmaEquipa(p.fora, A.nossa) ? 'fora' : null;
        const jogo_id = nossa ? idPor[nossaChave({ competicao: p.competicao, jornada: p.jornada, adversario: nossa === 'casa' ? p.fora : p.casa })] || null : null;
        return { ...p, epoca: E, jogo_id, updated_at: agora };
      });
      await App.db.upsert('partidas', linhasP, 'epoca,competicao,casa,fora');
      const chavesP = new Set(linhasP.map(p => `${norm(p.competicao)}|${norm(p.casa)}|${norm(p.fora)}`));
      const comps = new Set(linhasP.map(p => norm(p.competicao)));
      const comEventos = new Set(App.d.eventos.map(e => e.partida_id).filter(Boolean));
      // Só sai um jogo antigo da mesma jornada em que uma das equipas joga outro jogo no ficheiro (e sem codificação).
      const eqNaJornada = new Set(linhasP.flatMap(p => [`${norm(p.competicao)}|${p.jornada}|${norm(p.casa)}`, `${norm(p.competicao)}|${p.jornada}|${norm(p.fora)}`]));
      for (const p of App.d.partidas.filter(p => comps.has(norm(p.competicao)) && !chavesP.has(`${norm(p.competicao)}|${norm(p.casa)}|${norm(p.fora)}`) && !comEventos.has(p.id)
        && (eqNaJornada.has(`${norm(p.competicao)}|${p.jornada}|${norm(p.casa)}`) || eqNaJornada.has(`${norm(p.competicao)}|${p.jornada}|${norm(p.fora)}`)))) await App.db.apagar('partidas', { id: p.id });
    } catch (err) {
      if (/partidas/i.test(err.message)) toast('Os jogos do campeonato não foram guardados: corra outra vez o schema.sql no Supabase para os poder codificar.', 'erro'); else throw err;
    }
    // A equipa escolhida passa a ser reconhecida nas próximas importações.
    const nomes = [App.cfg.nome_clube, ...(App.cfg.nomes_alternativos || [])].map(norm);
    if (!nomes.includes(norm(A.nossa))) {
      const patch = App.cfg.nome_clube ? { nomes_alternativos: [...(App.cfg.nomes_alternativos || []), A.nossa] } : { nome_clube: A.nossa };
      await App.db.upsert('configuracao', [{ id: 1, ...patch, updated_at: agora }], 'id');
    }
    terminarImportacao(`${A.jogos.length} jogos de ${A.nossa} e ${A.liga.length} registos da liga importados${antigos.length ? `; ${antigos.length} ${antigos.length === 1 ? 'jogo corrigido (a equipa tinha outro adversário nessa jornada)' : 'jogos corrigidos (as equipas tinham outro adversário nessas jornadas)'}` : ''}.`, avisoFicheiro);
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Tentar outra vez';
    toast(/estatisticas_liga|jornada|importacoes_tipo/i.test(err.message) ? 'A base de dados precisa de ser atualizada para este ficheiro. Corra outra vez o schema.sql no Supabase (SQL Editor).' : err.message, 'erro');
  }
}

// "Player_stats_Volnei.xlsx" -> "Volnei" (procura no plantel pelo nome, apelido ou nome no Wyscout).
function adivinharJogador(ficheiro) {
  const n = norm(ficheiro.replace(/\.[^.]+$/, '').replace(/player|stats|estatisticas|jogador|wyscout/gi, ' '));
  if (!n) return null;
  const pj = App.d.plantel.find(p => [p.nome, p.nome_wyscout].filter(Boolean).some(x => n.includes(norm(x))))
    || App.d.plantel.find(p => { const partes = norm(p.nome).split(' '); return partes.length > 1 && n.split(' ').includes(partes[partes.length - 1]); });
  if (pj) return pj.nome;
  // Só o primeiro nome no ficheiro: aceita se corresponder a um único jogador do plantel.
  const pelo1 = App.d.plantel.filter(p => n.split(' ').includes(norm(p.nome).split(' ')[0]));
  if (pelo1.length === 1) return pelo1[0].nome;
  const palavras = ficheiro.replace(/\.[^.]+$/, '').replace(/player|stats|estat[ií]sticas|jogador|wyscout/gi, ' ').split(/[_\s-]+/).filter(Boolean);
  return palavras.length ? palavras.join(' ') : null;
}

// ---------- Folha de oportunidades ----------
function desenharAnaliseFolha() {
  const I = App.imp; const el = $('#i-analise');
  if (!App.d.partidas.length) {
    el.innerHTML = `<ul class="avisos"><li>Ainda não há jogos do campeonato. Importe primeiro o ficheiro da liga (separador "Estatísticas de equipa"), para as oportunidades ficarem ligadas aos jogos certos.</li></ul>`;
    return;
  }
  const A = I.analise = analisarFolha(I.tab, App.d.partidas);
  const R = A.registos;
  const jogos = new Set(R.map(r => r.partida.id || `${r.partida.jornada}${r.partida.casa}`));
  const jornadas = [...new Set(R.map(r => r.partida.jornada))].sort((a, b) => a - b);
  const idsPartidas = new Set(R.map(r => r.partida.id).filter(Boolean));
  const antigas = App.d.eventos.filter(e => (e.origem === 'folha' || e.origem === 'folha_z') && idsPartidas.has(e.partida_id)).length;
  const porEquipa = {}; for (const r of R) { const x = (porEquipa[r.equipa] ||= { n: 0, g: 0 }); x.n++; if (r.resultado === 'Golo') x.g++; }
  el.innerHTML = `
    <h2>Pré-visualização</h2>
    <p class="destaque">${R.length} oportunidades (${R.filter(r => r.resultado === 'Golo').length} golos) em ${jogos.size} jogos${jornadas.length ? `, da jornada ${jornadas[0]} à ${jornadas[jornadas.length - 1]}` : ''}.${antigas ? ` Substituem ${antigas} oportunidades importadas antes da mesma folha.` : ''}</p>
    ${A.avisos.length ? `<ul class="avisos" role="status">${A.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    <p class="nota">A folha só tem zonas: cada oportunidade fica num ponto dentro da zona codificada (marcado como "local aproximado"). Os mapas por zonas ficam exatos; os mapas de pontos são aproximados para estas oportunidades.</p>
    <div class="tabela-env"><table class="tabela compacta">
      <thead><tr><th>Equipa</th><th class="num">Oportunidades</th><th class="num">Golos</th></tr></thead>
      <tbody>${Object.entries(porEquipa).sort((a, b) => b[1].n - a[1].n).map(([e, x]) => `<tr><td>${esc(e)}</td><td class="num">${x.n}</td><td class="num">${x.g}</td></tr>`).join('')}</tbody>
    </table></div>
    ${R.length ? `<div class="acoes-esq"><button class="btn btn-prim" id="i-importar">Importar ${R.length} oportunidades</button></div>` : ''}`;
  $('#i-importar')?.addEventListener('click', e => importarFolha(e.currentTarget));
}

async function importarFolha(btn) {
  const A = App.imp.analise; btn.disabled = true; btn.textContent = 'A importar…';
  try {
    const { imp, avisoFicheiro } = await registarImportacao('oportunidades', A.registos.length, { jogos_novos: A.novos.length });
    // 1) Jogos que faltavam no ficheiro da liga.
    if (A.novos.length) {
      const criados = await App.db.upsert('partidas', A.novos.map(p => ({ epoca: App.epoca, competicao: p.competicao, jornada: p.jornada, casa: p.casa, fora: p.fora })), 'epoca,competicao,casa,fora');
      for (const p of A.novos) p.id = criados.find(c => norm(c.casa) === norm(p.casa) && norm(c.fora) === norm(p.fora))?.id;
    }
    // 2) Treinadores de cada equipa em cada jogo.
    const porPartida = {};
    for (const [k, nome] of A.treinadores) {
      const [chave, lado] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)];
      const id = chave.startsWith('n:') ? A.novos.find(p => `n:${p.jornada}|${norm(p.casa)}|${norm(p.fora)}` === chave)?.id : chave;
      if (id) (porPartida[id] ||= {})[lado === 'casa' ? 'treinador_casa' : 'treinador_fora'] = nome;
    }
    for (const [id, patch] of Object.entries(porPartida)) await App.db.atualizar('partidas', { id }, patch);
    // 3) Substitui as oportunidades que vieram antes da folha nos mesmos jogos.
    const ids = [...new Set(A.registos.map(r => r.partida.id).filter(Boolean))];
    for (const id of ids) for (const origem of ['folha', 'folha_z']) await App.db.apagar('eventos', { partida_id: id, origem });
    // 4) Oportunidades (ligadas ao jogo do SCUT quando é o caso).
    const linhas = A.registos.filter(r => r.partida.id).map(r => {
      const { partida, lado, ...ev } = r;
      const jogo_id = partida.jogo_id || null;
      return { ...ev, partida_id: partida.id, jogo_id, lado: jogo_id ? (eNossaEquipa(r.equipa) ? 'nos' : 'adversario') : null };
    });
    await App.db.inserirVarios('eventos', linhas);
    terminarImportacao(`${linhas.length} oportunidades importadas.`, avisoFicheiro);
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Tentar outra vez';
    toast(/partida|sub_momento|origem|column|importacoes_tipo/i.test(err.message) ? 'A base de dados precisa de ser atualizada. Corra outra vez o schema.sql no Supabase (SQL Editor).' : err.message, 'erro');
  }
}

// ---------- Team stats de adversários (um ou vários ficheiros) ----------
// Um ficheiro só, da vossa equipa (ou o ficheiro da liga), segue a importação normal; os restantes são Team stats de outras equipas.
async function lerTeamStatsEquipas(fs) {
  const I = App.imp; const id = criarIdentificador(App.cfg, App.d.mapas || []);
  const itens = [];
  for (const f of fs) {
    let linhas, an;
    try { linhas = await lerFicheiroTabela(f); an = analisarTeamStats(linhas); } catch (e) { itens.push({ f, erro: 'Não foi possível ler o ficheiro.' }); continue; }
    if (an.erro || !an.jogos.length) { itens.push({ f, linhas, erro: an.erro || 'Sem jogos.' }); continue; }
    const eq = equipaDoTeamStats(an);
    itens.push({ f, linhas, an, eq, nossa: !!eq && id.eNos(eq) });
  }
  // Um só ficheiro que não é Team stats de outra equipa: importação normal (vossa equipa ou ficheiro da liga).
  if (fs.length === 1 && (itens[0].nossa || itens[0].erro)) { I.loteAdv = null; return lerFicheiro(fs[0]); }
  I.lote = null; I.tab = null; I.ficheiro = null; I.loteAdv = itens;
  desenharImportacao();
}
function desenharLoteAdv() {
  const I = App.imp; const itens = I.loteAdv;
  for (const it of itens) if (it.an && !it.nossa) it.registos = linhasEstatAdv(it.an, it.eq);
  const validos = itens.filter(it => it.registos?.length);
  const datas = rs => { const d = rs.map(r => r.data).sort(); return `${fmtData(d[0])} a ${fmtData(d[d.length - 1])}`; };
  $('#i-analise').innerHTML = `<h3>Team stats de adversários</h3>
    <p class="nota">Ficam guardados por equipa (${esc(ESCALOES[App.escalao] || '')}) e aparecem na observação e no pré-jogo. Importar outra vez a mesma equipa atualiza os jogos em vez de os duplicar.</p>
    <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Ficheiro</th><th>Equipa</th><th class="num">Jogos</th><th>Período</th><th>Competições</th></tr></thead><tbody>
    ${itens.map(it => `<tr><td>${esc(it.f.name)}</td>${it.erro ? `<td colspan="4" class="erro-txt">${esc(it.erro)}</td>`
      : it.nossa ? `<td colspan="4" class="fraco">${esc(it.eq)}: é a vossa equipa. Importe este ficheiro sozinho para entrar nos vossos jogos.</td>`
      : `<td><b>${esc(it.eq)}</b></td><td class="num">${it.registos.length}</td><td>${it.registos.length ? datas(it.registos) : '–'}</td><td>${esc([...new Set(it.registos.map(r => nomeCompCurto(r.competicao)).filter(Boolean))].join(', '))}</td>`}</tr>`).join('')}
    </tbody></table></div>
    <div class="acoes-esq"><button class="btn btn-prim" id="i-adv-ok" ${validos.length ? '' : 'disabled'}>Importar ${validos.length} ${validos.length === 1 ? 'equipa' : 'equipas'} (${validos.reduce((s, it) => s + it.registos.length, 0)} jogos)</button><button class="btn" id="i-adv-cancelar">Cancelar</button></div>`;
  $('#i-adv-cancelar').addEventListener('click', () => { I.loteAdv = null; desenharImportacao(); });
  $('#i-adv-ok').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'A importar…';
    try {
      for (const it of validos) {
        await App.db.upsert('estatisticas_adversario', it.registos, 'epoca,equipa,data,adversario');
        try { await registarImportacao('equipa', it.registos.length, { equipa: it.eq, adversario: true }, it.f); } catch { /* o histórico é opcional */ }
      }
      toast(`${validos.length} ${validos.length === 1 ? 'equipa importada' : 'equipas importadas'} (${validos.reduce((s, it) => s + it.registos.length, 0)} jogos).`);
      I.loteAdv = null; await recarregar(); desenharImportacao();
    } catch (err) { e.target.disabled = false; e.target.textContent = 'Importar'; toast(traduzErro(err.message || String(err)), 'erro'); }
  });
}
