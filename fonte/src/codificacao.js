// Ponto a marcar primeiro no campo: o passe (depois passa sozinho para a finalização), exceto quando não há passe.
function pontoInicial() { return C_SEM_PASSE() ? 'fin' : 'passe'; }
function C_SEM_PASSE() { const f = App.cod?.form || {}; return f.sub_momento === 'Penálti' || ['Remate exterior', 'Remate direto'].includes(f.mecanismo); }
// ---------- Codificação de oportunidades (todos os jogos do campeonato) ----------
const CAMPOS_FORM = ['minuto', 'tempo', 'momento', 'sub_momento', 'mecanismo', 'corredor', 'resultado', 'jogador', 'posicao_finalizador', 'assistente', 'posicao_passe', 'qualidade', 'finalizacao', 'video_url', 'notas'];

function reindexarEventos() {
  const ev = {}; for (const r of App.d.eventos) if (r.jogo_id) (ev[r.jogo_id] ||= []).push(r);
  App.idx.eventos = ev;
  indexarAlvos();
}

function chips(nome, opcoes, valor, rotulo, extra = '') {
  return `<fieldset class="grupo-chips"><legend>${rotulo}${extra}</legend><div class="chips">
    ${opcoes.map(o => `<label class="chip"><input type="radio" name="${nome}" value="${esc(o)}" ${o === valor ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
  </div></fieldset>`;
}

// Cor das marcas: SCUT a azul quando joga; nos outros jogos, casa a azul e fora a laranja.
function corLado(a, lado) { return a.ladoNosso ? (lado === a.ladoNosso ? 'nos' : 'adversario') : (lado === 'casa' ? 'nos' : 'adversario'); }
const paraCampo = (a, e) => ({ ...e, lado: corLado(a, ladoNoAlvo(e, a)) });

// Cores das equipas nas páginas de codificação (pedido do departamento). Equipas fora da lista: bordô / preto.
const CORES_EQUIPAS = [
  ['#FFFFFF', ['leiria']],
  ['#1A1A1A', ['portimonense', 'amarante', 'academica', 'farense']],
  ['#C8102E', ['penafiel', 'benfica', 'leixoes', 'avs']],
  ['#1E8449', ['sporting']],
  ['#F2C40F', ['lourosa', 'tondela']],
  ['#5DADE2', ['vizela']],
  ['#7A1F2B', ['torreense']],
  ['#6C3483', ['felgueiras']],
  ['#1F4FBF', ['porto', 'feirense']],
  ['#0B2545', ['chaves']]
];
const CORES_CLARAS = new Set(['#FFFFFF', '#F2C40F', '#5DADE2']);
function corDaEquipa(nome) {
  const n = ` ${norm(nome)} `;
  for (const [cor, chaves] of CORES_EQUIPAS) if (chaves.some(k => n.includes(` ${k} `))) return cor;
  return null;
}
// Põe as cores das duas equipas do jogo nas variáveis usadas pelos botões, pontos e marcas no campo.
function aplicarCoresJogo(el, a) {
  if (!el || !a) return;
  const lNos = corLado(a, 'casa') === 'nos' ? 'casa' : 'fora', lAdv = lNos === 'casa' ? 'fora' : 'casa';
  const cn = corDaEquipa(a[lNos]) || '#7A1F2B';
  let ca = corDaEquipa(a[lAdv]) || '#1A1A1A';
  if (ca === cn) ca = cn === '#8A8F94' ? '#1A1A1A' : '#8A8F94'; // mesma cor nas duas equipas: o adversário fica a cinzento
  for (const [k, c] of [['nos', cn], ['adv', ca]]) {
    el.style.setProperty(`--eq-${k}`, c);
    el.style.setProperty(`--eq-${k}-linha`, { '#FFFFFF': '#4B5563', '#F2C40F': '#B8930A', '#5DADE2': '#2E86C1' }[c] || c); // contorno das marcas: cores claras escurecidas para se verem no campo
    el.style.setProperty(`--eq-${k}-borda`, c === '#FFFFFF' ? '#4B5563' : '#fff');
    el.style.setProperty(`--eq-${k}-txt`, CORES_CLARAS.has(c) ? '#17202B' : '#fff');
  }
}

function opcoesAlvos(selecionado) {
  const alvos = App.idx.alvos; const ev = App.idx.eventosAlvo;
  const liga = alvos.filter(a => a.partida).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0) || a.casa.localeCompare(b.casa, 'pt'));
  const outros = alvos.filter(a => !a.partida).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  const porJornada = {}; for (const a of liga) (porJornada[a.jornada ?? '–'] ||= []).push(a);
  const opt = a => { const n = (ev[a.key] || []).length; return `<option value="${a.key}" ${a.key === selecionado ? 'selected' : ''}>${n ? '✓ ' : ''}${esc(rotuloAlvo(a, true))}${n ? ` (${n})` : ''}</option>`; };
  return Object.entries(porJornada).sort((a, b) => Number(b[0]) - Number(a[0])).map(([j, ls]) => `<optgroup label="Jornada ${j}">${ls.map(opt).join('')}</optgroup>`).join('')
    + (outros.length ? `<optgroup label="Outros jogos do ${esc(nomeNosso())}">${outros.map(opt).join('')}</optgroup>` : '');
}

function desenharCodificacao() {
  const v = $('#vista'); const C = App.cod;
  const alvos = App.idx.alvos || [];
  if (!alvos.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Codificação</h1></div><div class="vazio"><p>Ainda não há jogos para codificar.</p>${pode() ? '<p>Importe o ficheiro da liga em <a href="#importacao">Importação</a>: os jogos de todas as equipas ficam disponíveis aqui.</p>' : ''}</div>`;
    return;
  }
  if (!C.alvo || !App.idx.alvo[C.alvo]) {
    // Por defeito: o último jogo do SCUT no campeonato com resultado; senão, o mais recente.
    const nossos = alvos.filter(a => a.partida && a.ladoNosso && Number.isFinite(a.golosCasa)).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0));
    C.alvo = (nossos[0] || alvos[0]).key; C.side = App.idx.alvo[C.alvo].ladoNosso || 'casa';
  }
  C.form ||= {}; C.side ||= 'casa'; C.ponto ||= pontoInicial();
  const a = App.idx.alvo[C.alvo];
  const liga = alvos.filter(x => x.partida); const feitos = liga.filter(x => (App.idx.eventosAlvo[x.key] || []).length).length;
  v.innerHTML = `
    <div class="cabecalho-vista">
      <div><h1>Codificação</h1><p class="nota">${liga.length ? `${feitos} de ${liga.length} jogos do campeonato codificados.` : 'Importe o ficheiro da liga para codificar os jogos de todas as equipas.'}</p></div>
      <div class="cod-jogo-sel">
        <button class="btn" id="c-ant" aria-label="Jogo anterior">‹</button>
        <label class="seletor-jogo"><span class="sr">Jogo</span><select id="c-jogo">${opcoesAlvos(C.alvo)}</select></label>
        <button class="btn" id="c-seg" aria-label="Jogo seguinte">›</button>
      </div>
    </div>
    <div class="cod-cab-jogo">
      <span class="cod-equipa ${corLado(a, 'casa')}">${esc(a.casa)}</span>
      <b class="cod-resultado">${Number.isFinite(a.golosCasa) ? `${a.golosCasa} – ${a.golosFora}` : 'vs'}</b>
      <span class="cod-equipa ${corLado(a, 'fora')}">${esc(a.fora)}</span>
      <span class="fraco">${esc([a.competicao, a.jornada != null ? `Jornada ${a.jornada}` : null, a.data ? fmtData(a.data) : null].filter(Boolean).join(' · '))}</span>
      ${a.partida && (a.partida.treinador_casa || a.partida.treinador_fora) ? `<span class="fraco">Treinadores: ${esc(a.partida.treinador_casa || '–')} / ${esc(a.partida.treinador_fora || '–')}</span>` : ''}
      ${a.partida && pode() ? '<button class="btn-link" id="c-treinadores">Treinadores</button>' : ''}
    </div>
    <div class="cod-grelha ${pode() ? '' : 'so-leitura'}">
      ${pode() ? '<section class="bloco cod-form" id="c-form-env"></section>' : `<section class="bloco"><h2>Mapa do jogo</h2>${campoSVG({ eventos: (App.idx.eventosAlvo[a.key] || []).map(e => paraCampo(a, e)), passes: true })}${legendaCampo()}</section>`}
      <section class="bloco cod-lista" id="c-lista"></section>
    </div>`;
  const ordem = [...$('#c-jogo').options].map(o => o.value);
  const ir = k => { if (!k) return; C.alvo = k; C.side = App.idx.alvo[k].ladoNosso || 'casa'; C.editarId = null; C.form = {}; C.zona = null; C.passe = null; desenharCodificacao(); };
  $('#c-jogo').addEventListener('change', e => ir(e.target.value));
  $('#c-ant').addEventListener('click', () => ir(ordem[ordem.indexOf(C.alvo) + 1]));
  $('#c-seg').addEventListener('click', () => ir(ordem[ordem.indexOf(C.alvo) - 1]));
  $('#c-treinadores')?.addEventListener('click', () => dialogoTreinadores(a));
  aplicarCoresJogo(v, a);
  if (pode()) desenharFormEvento();
  desenharListaEventos();
}

function dialogoTreinadores(a) {
  const d = document.createElement('dialog'); d.className = 'dialogo';
  d.innerHTML = `<form class="pilha" method="dialog"><h2>Treinadores</h2>
    <label>${esc(a.casa)}<input name="tc" value="${esc(a.partida.treinador_casa || '')}"></label>
    <label>${esc(a.fora)}<input name="tf" value="${esc(a.partida.treinador_fora || '')}"></label>
    <div class="acoes"><button class="btn" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-prim" value="guardar">Guardar</button></div></form>`;
  document.body.appendChild(d); d.showModal(); d.addEventListener('close', () => d.remove());
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'guardar') return; e.preventDefault();
    const f = new FormData(e.target); const patch = { treinador_casa: f.get('tc').trim() || null, treinador_fora: f.get('tf').trim() || null };
    try { await App.db.atualizar('partidas', { id: a.partida.id }, patch); Object.assign(a.partida, patch); d.close(); desenharCodificacao(); }
    catch (err) { toast(err.message, 'erro'); }
  });
}

// Nomes conhecidos de cada equipa (plantel do SCUT e oportunidades já codificadas), com a última posição usada.
function nomesDaEquipa(equipa) {
  const nomes = new Map();
  if (eNossaEquipa(equipa) || norm(equipa) === norm(nomeNosso())) {
    for (const p of App.d.plantel) nomes.set(p.nome, normPosicao(p.posicao));
  }
  for (const e of App.d.eventos) {
    if (!mesmaEquipa(equipaDoEvento(e) || '', equipa)) continue;
    if (e.jogador) nomes.set(e.jogador, e.posicao_finalizador || nomes.get(e.jogador) || null);
    if (e.assistente) nomes.set(e.assistente, e.posicao_passe || nomes.get(e.assistente) || null);
  }
  return nomes;
}

function lerFormParaEstado() {
  const f = $('#c-form'); if (!f) return;
  const fd = new FormData(f); const C = App.cod;
  C.side = fd.get('side') || C.side;
  for (const k of CAMPOS_FORM) if (fd.has(k)) C.form[k] = fd.get(k);
  C.form.qualidade = fd.get('qualidade') ? 'Grande oportunidade' : null;
}

function desenharFormEvento() {
  const C = App.cod; const F = C.form; const a = App.idx.alvo[C.alvo];
  const equipa = a[C.side];
  const nomes = nomesDaEquipa(equipa);
  const mecs = mecanismosDe(F.momento, F.sub_momento);
  const penalti = F.sub_momento === 'Penálti';
  const outros = (App.idx.eventosAlvo[a.key] || []).filter(e => e.id !== C.editarId && ladoNoAlvo(e, a) === C.side).map(e => paraCampo(a, e));
  const parte = parteDoTempo(F.tempo);
  $('#c-form-env').innerHTML = `
    <form id="c-form" class="pilha" novalidate>
      <div class="bloco-cab"><h2>${C.editarId ? 'Editar oportunidade' : 'Nova oportunidade'}</h2>
        <details class="criterios"><summary>Critérios</summary><div class="criterios-texto">${esc(App.cfg.criterios.oportunidade).replace(/\n/g, '<br>')}</div></details>
      </div>
      <div class="segmentado lados" role="radiogroup" aria-label="Equipa">
        ${['casa', 'fora'].map(l => `<label class="lado-${corLado(a, l) === 'nos' ? 'nos' : 'adv'}"><input type="radio" name="side" value="${l}" ${C.side === l ? 'checked' : ''}><span>${esc(a[l])}</span></label>`).join('')}
      </div>
      ${chips('momento', Object.keys(MOMENTOS), F.momento, 'Momento')}
      ${F.momento ? chips('sub_momento', MOMENTOS[F.momento].sub, F.sub_momento, 'Sub-momento') : ''}
      ${F.sub_momento && mecs.length ? chips('mecanismo', mecs, F.mecanismo, 'Mecanismo', ' <span class="fraco">(a última ação que criou a oportunidade)</span>') : ''}
      ${chips('corredor', CORREDORES, F.corredor, 'Lado', ' <span class="fraco">(de quem ataca)</span>')}
      <div class="linha-minuto">
        <label>Minuto<input name="minuto" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" value="${esc(F.minuto ?? '')}" id="c-minuto" placeholder="opcional"></label>
        ${chips('tempo', TEMPOS, F.tempo, 'Tempo', parte ? ` <span class="fraco">· ${parte}</span>` : '')}
      </div>
      <div class="campo-env">
        <div class="cod-ponto-cab">
          <div class="segmentado pequeno" role="radiogroup" aria-label="O que marcar no campo">
            ${penalti ? '' : `<label><input type="radio" name="ponto" value="passe" ${C.ponto === 'passe' ? 'checked' : ''}><span>Passe${C.passe ? ' ✓' : ''}</span></label>`}
            <label><input type="radio" name="ponto" value="fin" ${C.ponto === 'fin' ? 'checked' : ''}><span>Finalização${C.zona ? ' ✓' : ''}</span></label>
          </div>
          <span class="campo-dica">${C.ponto === 'fin' ? 'Clique onde aconteceu a finalização' : 'Clique onde foi feito o último passe'}</span>
          ${C.zona || C.passe ? '<button type="button" class="btn-link" id="c-limpar-zona">Limpar pontos</button>' : ''}
        </div>
        <div id="c-campo" class="lado-${corLado(a, C.side) === 'nos' ? 'nos' : 'adversario'}">${campoSVG({ eventos: outros, interativo: true, marcador: C.zona, marcadorPasse: C.passe, classe: 'com-fantasmas' })}</div>
        <p class="nota zonas-info">${C.zona ? `Zona de finalização ${zonaFinalizacao(C.zona.x, C.zona.y)}` : ''}${C.passe ? `${C.zona ? ' · ' : ''}Zona do passe ${zonaPasse(C.passe.x, C.passe.y)}` : ''}</p>
      </div>
      <div class="grelha-2">
        <label>Quem finaliza<input name="jogador" list="l-jog" value="${esc(F.jogador || '')}" autocomplete="off" id="c-fin"></label>
        <label>Posição<select name="posicao_finalizador" id="c-fin-pos"><option value="">–</option>${POSICOES_EV.map(p => `<option ${F.posicao_finalizador === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        ${penalti ? '' : `<label>Quem faz o passe<input name="assistente" list="l-jog" value="${esc(F.assistente || '')}" autocomplete="off" id="c-pas"></label>
        <label>Posição<select name="posicao_passe" id="c-pas-pos"><option value="">–</option>${POSICOES_EV.map(p => `<option ${F.posicao_passe === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>`}
      </div>
      <datalist id="l-jog">${[...nomes.keys()].sort((x, y) => x.localeCompare(y, 'pt')).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      ${chips('resultado', RESULTADOS, F.resultado, 'Resultado')}
      <details class="mais-detalhes" ${F.qualidade || F.finalizacao || F.video_url || F.notas ? 'open' : ''}><summary>Mais detalhes (opcional)</summary>
        <div class="pilha">
          <label class="em-linha caixa"><input type="checkbox" name="qualidade" ${F.qualidade === 'Grande oportunidade' ? 'checked' : ''}> Grande oportunidade (esperava-se golo)</label>
          ${chips('finalizacao', MAIS_DETALHES.finalizacao, F.finalizacao, 'Finalização')}
          <div class="grelha-2">
            <label>Ligação para o vídeo<input name="video_url" type="url" placeholder="https://" value="${esc(F.video_url || '')}"></label>
            <label>Notas<input name="notas" value="${esc(F.notas || '')}"></label>
          </div>
        </div>
      </details>
      <p class="erro" id="c-erro" role="alert" hidden></p>
      <div class="acoes-esq">
        <button class="btn btn-prim">${C.editarId ? 'Guardar alterações' : 'Guardar oportunidade'}</button>
        ${C.editarId ? '<button type="button" class="btn" id="c-cancelar">Cancelar edição</button>' : ''}
      </div>
    </form>`;
  const form = $('#c-form');
  form.addEventListener('change', e => {
    const n = e.target.name;
    if (n === 'ponto') { lerFormParaEstado(); C.ponto = e.target.value; desenharFormEvento(); return; }
    if (n === 'mecanismo' && ['Remate exterior', 'Remate direto'].includes(e.target.value) && C.ponto === 'passe' && !C.passe) { lerFormParaEstado(); C.ponto = 'fin'; desenharFormEvento(); return; }
    if (['side', 'momento', 'sub_momento'].includes(n)) {
      lerFormParaEstado();
      if (n === 'momento') { C.form.sub_momento = null; C.form.mecanismo = null; }
      if (n === 'sub_momento') {
        C.form.mecanismo = null;
        // Penálti: finalização na marca de penálti e sem passe.
        if (C.form.sub_momento === 'Penálti') { C.zona ||= { x: 89.6, y: 49 }; C.passe = null; C.ponto = 'fin'; C.form.corredor ||= 'Centro'; }
      }
      desenharFormEvento(); if (n === 'side') desenharListaEventos(); return;
    }
    if (n === 'tempo') { lerFormParaEstado(); desenharFormEvento(); }
  });
  // Minuto: enquanto se escreve só marca o tempo correspondente (redesenhar o formulário tirava o cursor do sítio).
  $('#c-minuto').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    const t = tempoDoMinuto(parseNum(e.target.value)); if (!t) return;
    C.form.tempo = t;
    const r = $(`input[name="tempo"][value="${CSS.escape(t)}"]`); if (r) r.checked = true;
  });
  $('#c-minuto').addEventListener('change', () => { lerFormParaEstado(); desenharFormEvento(); });
  const posicaoAuto = (inp, sel) => inp?.addEventListener('change', () => { const p = nomes.get(inp.value.trim()); if (p && !sel.value) sel.value = p; });
  posicaoAuto($('#c-fin'), $('#c-fin-pos')); posicaoAuto($('#c-pas'), $('#c-pas-pos'));
  $('#c-campo svg').addEventListener('click', e => {
    const svg = e.currentTarget; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const ponto = { x: Math.round(Math.min(105, Math.max(0, p.x)) / 1.05 * 10) / 10, y: Math.round(Math.min(68, Math.max(0, p.y)) / 0.68 * 10) / 10 };
    lerFormParaEstado();
    if (C.ponto === 'passe') {
      C.passe = ponto;
      if (!C.form.corredor) { const ym = metrosY(ponto.y); C.form.corredor = ym < M.areaY0 ? 'Esquerdo' : ym > M.areaY1 ? 'Direito' : 'Centro'; }
      if (!C.zona) C.ponto = 'fin';
    } else {
      C.zona = ponto;
    }
    desenharFormEvento();
  });
  $('#c-limpar-zona')?.addEventListener('click', () => { lerFormParaEstado(); C.zona = null; C.passe = null; C.ponto = pontoInicial(); desenharFormEvento(); });
  $('#c-cancelar')?.addEventListener('click', () => { C.editarId = null; C.form = {}; C.zona = null; C.passe = null; C.ponto = pontoInicial(); desenharFormEvento(); desenharListaEventos(); });
  form.addEventListener('submit', guardarEvento);
}

async function guardarEvento(e) {
  e.preventDefault();
  lerFormParaEstado();
  const C = App.cod; const F = C.form; const a = App.idx.alvo[C.alvo];
  const erros = [];
  const minuto = F.minuto === '' || F.minuto === undefined || F.minuto === null ? null : Number(F.minuto);
  if (minuto !== null && (!Number.isInteger(minuto) || minuto < 0 || minuto > 130)) erros.push('um minuto válido');
  if (!F.momento) erros.push('o momento');
  else if (!F.sub_momento) erros.push('o sub-momento');
  else if (mecanismosDe(F.momento, F.sub_momento).length && !F.mecanismo) erros.push('o mecanismo');
  if (!F.corredor) erros.push('o lado');
  if (!F.tempo) erros.push('o tempo');
  if (!C.zona) erros.push('o local da finalização no campo');
  if (!F.resultado) erros.push('o resultado');
  if (F.video_url && !/^https?:\/\//i.test(F.video_url)) erros.push('uma ligação de vídeo válida (começa por https://)');
  const elErro = $('#c-erro');
  if (erros.length) { elErro.textContent = `Falta indicar ${erros.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`; elErro.hidden = false; return; }
  const jogo_id = a.jogo?.id || a.partida?.jogo_id || null;
  const penalti = F.sub_momento === 'Penálti';
  const reg = {
    partida_id: a.partida?.id || null, jogo_id, equipa: a[C.side], lado: jogo_id && a.ladoNosso ? (C.side === a.ladoNosso ? 'nos' : 'adversario') : null,
    tipo: 'oportunidade', minuto, tempo: F.tempo, parte: parteDoTempo(F.tempo),
    momento: F.momento, sub_momento: F.sub_momento, mecanismo: penalti ? null : F.mecanismo || null, corredor: F.corredor,
    qualidade: F.qualidade || (penalti ? 'Grande oportunidade' : 'Oportunidade'), finalizacao: F.finalizacao || null, resultado: F.resultado,
    zona_x: C.zona.x, zona_y: C.zona.y, passe_x: penalti ? null : C.passe?.x ?? null, passe_y: penalti ? null : C.passe?.y ?? null, local_aprox: false,
    jogador: normNome(F.jogador), posicao_finalizador: F.posicao_finalizador || null,
    assistente: penalti ? null : normNome(F.assistente), posicao_passe: penalti ? null : F.posicao_passe || null,
    video_url: (F.video_url || '').trim() || null, notas: (F.notas || '').trim() || null
  };
  const btn = $('#c-form button.btn-prim'); btn.disabled = true;
  try {
    if (C.editarId) {
      // Uma oportunidade da folha antiga já tem o passe nas faixas novas: grava-se a marca para não voltar a ser convertida.
      if (App.d.eventos.find(x => x.id === C.editarId)?.origem === 'folha_z') reg.origem = 'folha_z';
      const [r] = await App.db.atualizar('eventos', { id: C.editarId }, reg);
      App.d.eventos = App.d.eventos.map(x => x.id === C.editarId ? (r || { ...x, ...reg }) : x);
      toast('Oportunidade atualizada.');
    } else {
      App.d.eventos.push(await App.db.inserir('eventos', reg));
      toast(`Oportunidade de ${reg.equipa} guardada.`);
    }
    reindexarEventos();
    C.editarId = null; C.zona = null; C.passe = null; C.ponto = pontoInicial();
    C.form = {};
    desenharCodificacao();
  } catch (err) {
    btn.disabled = false;
    elErro.textContent = /partida_id|sub_momento|mecanismo|corredor|passe_x|column/i.test(err.message) ? 'A base de dados precisa de ser atualizada para este método de codificação. Corra outra vez o schema.sql no Supabase (SQL Editor).' : err.message;
    elErro.hidden = false;
  }
}

function desenharListaEventos() {
  const C = App.cod; const el = $('#c-lista'); const a = App.idx.alvo[C.alvo];
  const ordemTempo = e => (Number.isFinite(e.minuto) ? e.minuto : (TEMPOS.indexOf(dadosOportunidade(e).tempo) * 15 + 7));
  const todos = (App.idx.eventosAlvo[a.key] || []).slice().sort((x, y) => ordemTempo(x) - ordemTempo(y));
  C.filtro ||= 'todos';
  const lista = C.filtro === 'todos' ? todos : todos.filter(e => ladoNoAlvo(e, a) === C.filtro);
  const de = l => todos.filter(e => ladoNoAlvo(e, a) === l);
  el.innerHTML = `
    <div class="bloco-cab"><h2>Oportunidades deste jogo</h2>
      <div class="alternar" role="radiogroup" aria-label="Filtrar">
        ${[['todos', 'Todas'], ['casa', a.casa], ['fora', a.fora]].map(([v, t]) => `<label class="chip"><input type="radio" name="filtro" value="${v}" ${C.filtro === v ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
      </div>
    </div>
    <div class="tabela-env"><table class="tabela compacta resumo-cod">
      <thead><tr><th></th><th class="num">Oport.</th><th class="num">Golos</th><th class="num">Esquemas</th></tr></thead>
      <tbody>${['casa', 'fora'].map(l => { const evs = de(l); const et = evs.filter(e => dadosOportunidade(e).momento === 'Esquema tático').length;
        return `<tr><td><span class="ponto-cor ${corLado(a, l) === 'nos' ? 'nos' : 'adv'}"></span>${esc(a[l])}</td><td class="num">${evs.length}</td><td class="num">${evs.filter(e => e.resultado === 'Golo').length}</td><td class="num">${et}</td></tr>`; }).join('')}</tbody>
    </table></div>
    ${lista.length ? `<ol class="lista-eventos">${lista.map(e => { const o = dadosOportunidade(e); const l = ladoNoAlvo(e, a); return `
      <li class="${e.id === C.editarId ? 'a-editar' : ''}">
        <span class="ev-min ${Number.isFinite(e.minuto) ? '' : 'ev-tempo'}">${Number.isFinite(e.minuto) ? `${e.minuto}'` : esc(o.tempo || '–')}</span>
        <span class="ponto-cor ${corLado(a, l) === 'nos' ? 'nos' : 'adv'}" title="${esc(a[l] || '')}"></span>
        <div class="ev-txt">
          <b>${esc([o.momento, o.sub, o.mecanismo].filter(Boolean).join(' · ') || 'Oportunidade')}</b>
          <span class="${o.golo ? 'golo' : ''}">${esc(e.resultado || '')}${e.qualidade === 'Grande oportunidade' ? ' · grande oportunidade' : ''}${o.corredor ? ` · lado ${o.corredor.toLowerCase()}` : ''}</span>
          <small>${esc([e.jogador && `${e.jogador}${e.posicao_finalizador ? ` (${e.posicao_finalizador})` : ''}`, e.assistente && `passe de ${e.assistente}${e.posicao_passe ? ` (${e.posicao_passe})` : ''}`].filter(Boolean).join(' · '))}</small>
          ${e.local_aprox ? '<small class="fraco">Local aproximado (importado da folha por zonas)</small>' : ''}
          ${e.notas ? `<small class="fraco">${esc(e.notas)}</small>` : ''}
        </div>
        <div class="ev-acoes">
          ${e.video_url && /^https?:\/\//i.test(e.video_url) ? `<a class="btn-link" href="${esc(e.video_url)}" target="_blank" rel="noopener">Vídeo</a>` : ''}
          ${pode() ? `<button class="btn-link" data-ev-editar="${e.id}">Editar</button>${podeApagar() ? `<button class="btn-link perigo" data-ev-apagar="${e.id}">Apagar</button>` : ''}` : ''}
        </div>
      </li>`; }).join('')}</ol>` : `<p class="fraco vazio-curto">${todos.length ? 'Nenhuma oportunidade para este filtro.' : 'Ainda não há oportunidades codificadas neste jogo.'}</p>`}`;
  $$('input[name=filtro]', el).forEach(r => r.addEventListener('change', () => { C.filtro = r.value; desenharListaEventos(); }));
  $$('[data-ev-editar]', el).forEach(b => b.addEventListener('click', () => {
    const ev = App.d.eventos.find(x => x.id === b.dataset.evEditar); const o = dadosOportunidade(ev);
    Object.assign(C, { editarId: ev.id, side: ladoNoAlvo(ev, a) || 'casa', ponto: 'fin',
      zona: ev.zona_x != null ? { x: Number(ev.zona_x), y: Number(ev.zona_y) } : null, passe: ev.passe_x != null ? { x: Number(ev.passe_x), y: Number(ev.passe_y) } : null });
    C.form = { ...Object.fromEntries(CAMPOS_FORM.map(k => [k, ev[k] ?? null])), momento: o.momento, sub_momento: o.sub, mecanismo: o.mecanismo, tempo: o.tempo,
      resultado: RESULTADOS.includes(ev.resultado) ? ev.resultado : null };
    desenharFormEvento(); desenharListaEventos();
    $('#c-form-env').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('[data-ev-apagar]', el).forEach(b => b.addEventListener('click', async () => {
    const ev = App.d.eventos.find(x => x.id === b.dataset.evApagar);
    if (!(await confirmar(`Apagar esta oportunidade de ${equipaDoEvento(ev) || ''}?`))) return;
    try {
      await App.db.apagar('eventos', { id: ev.id });
      App.d.eventos = App.d.eventos.filter(x => x.id !== ev.id); reindexarEventos();
      if (C.editarId === ev.id) { C.editarId = null; C.form = {}; C.zona = null; C.passe = null; }
      desenharCodificacao(); toast('Oportunidade apagada.');
    } catch (err) { toast(err.message, 'erro'); }
  }));
}
