// ---------- Arquivo do pré-jogo, por jornada ----------
// Cada jornada do nosso campeonato: relatório estatístico (PDF guardado na app) e relatório de observação (vídeo no YouTube).
const ARQ_TIPOS = { estatistico: 'Relatório estatístico', observacao: 'Relatório de observação' };
const ARQ_MAX = 50 * 1024 * 1024;

function idYoutube(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function fmtTamanho(b) { return b == null ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`; }
// Outras competições no Arquivo: os jogos vêm de Dados › Jogos (ou do Calendário) com esta competição.
// Cada uma aceita também os nomes com que vem nos ficheiros (Wyscout).
const ARQ_OUTRAS = ['Taça de Portugal', 'Liga Europa'];
const ARQ_NOMES = { 'liga europa': ['europe uefa europa league', 'uefa europa league', 'europa league'] };
function mesmaCompArq(nomeJogo, comp) { const n = norm(nomeJogo || ''), c = norm(comp); return n === c || (ARQ_NOMES[c] || []).includes(n); }
function registoArquivo(comp, jornada, tipo) { return (App.d.arquivo || []).find(r => norm(r.competicao) === norm(comp) && r.jornada === jornada && r.tipo === tipo) || null; }

// Jornadas do nosso campeonato (jogos da liga com a nossa equipa).
// Inclui os jogos agendados (Calendário/Jogos) com jornada; o próximo jogo sem jornada fica com a jornada seguinte à última.
function jornadasArquivo(comp) {
  const porJ = new Map();
  for (const a of App.idx.alvos || []) {
    if (!a.ladoNosso || a.jornada == null || norm(a.competicao || '') !== norm(comp)) continue;
    const jogado = Number.isFinite(a.golosCasa) && Number.isFinite(a.golosFora);
    const ja = porJ.get(a.jornada);
    // A linha do ficheiro da liga ganha, a não ser que esteja por jogar e o jogo registado (Dados › Jogos) já tenha resultado.
    if (ja && !(a.partida && !ja.a.partida) && !(jogado && !ja.jogado)) continue;
    porJ.set(a.jornada, { a, jornada: a.jornada, adversario: a.ladoNosso === 'casa' ? a.fora : a.casa, local: a.ladoNosso, jogado });
  }
  const prox = proximoJogo();
  if (prox && prox.jornada == null && (!prox.competicao || norm(prox.competicao) === norm(comp)) && ![...porJ.values()].some(j => !j.jogado && mesmaEq(j.adversario, prox.adversario))) {
    const n = Math.max(0, ...porJ.keys()) + 1; const local = prox.local === 'fora' ? 'fora' : 'casa';
    porJ.set(n, { a: { data: prox.data, golosCasa: null, golosFora: null }, jornada: n, adversario: prox.adversario, local, jogado: false, inferida: true });
  }
  return [...porJ.values()].sort((x, y) => y.jornada - x.jornada);
}

// Jogos de uma competição sem ficheiro da liga (taças, Europa…), a partir dos jogos registados.
// A chave guardada é a jornada, se o jogo a tiver, ou a data (aaaammdd), para não mudar quando entram jogos novos.
function jogosArquivoOutra(comp) {
  const js = (App.d.jogos || []).filter(j => mesmaCompArq(j.competicao, comp) && (j.jornada != null || j.data)).sort(compararJogos);
  return js.map((j, i) => {
    const casa = j.local !== 'fora'; const gm = j.golos_marcados, gs = j.golos_sofridos;
    const jogado = Number.isFinite(gm) && Number.isFinite(gs);
    return { a: { data: j.data, golosCasa: casa ? gm : gs, golosFora: casa ? gs : gm }, jornada: j.jornada ?? Number(String(j.data).replaceAll('-', '')),
      rotulo: j.jornada != null ? `J${j.jornada}` : `${i + 1}.º`, adversario: j.adversario, local: casa ? 'casa' : 'fora', neutro: j.local === 'neutro', jogado };
  }).reverse();
}
function rotuloArq(j) { return j.rotulo || `J${j.jornada}`; }
function nomeArq(j) { return j.rotulo && !/^J\d/.test(j.rotulo) ? `do jogo com ${j.adversario}` : `da jornada ${j.jornada}`; }

function desenharArquivo() {
  const v = $('#vista'); App.arq ||= {};
  if (App.semArquivo) { v.innerHTML = '<div class="cabecalho-vista"><h1>Arquivo</h1></div><div class="vazio"><p>O arquivo ainda não existe na base de dados. Corra o ficheiro <code>schema.sql</code> no Supabase (SQL Editor) e recarregue a página.</p></div>'; return; }
  const ligas = [...new Set((App.idx.alvos || []).filter(a => a.partida && a.ladoNosso && a.jornada != null).map(a => a.competicao))].sort();
  // Outras: só as escolhidas (ARQ_OUTRAS), as restantes competições dos jogos registados não entram.
  const outras = ARQ_OUTRAS.filter(c => !ligas.some(x => norm(x) === norm(c)));
  const comps = [...ligas, ...outras];
  const A = App.arq; if (!comps.includes(A.comp)) A.comp = ligas[0] || comps[0];
  const ehLiga = ligas.includes(A.comp);
  const js = ehLiga ? jornadasArquivo(A.comp) : jogosArquivoOutra(A.comp);
  const un = ehLiga ? ['jornada', 'jornadas'] : ['jogo', 'jogos'];
  const proxima = [...js].reverse().find(j => !j.jogado);
  const editar = pode();
  const nEst = js.filter(j => registoArquivo(A.comp, j.jornada, 'estatistico')).length, nObs = js.filter(j => registoArquivo(A.comp, j.jornada, 'observacao')).length;
  v.innerHTML = `
    <div class="cabecalho-vista"><div><h1>Arquivo</h1>
      <p class="nota">Pré-jogo de cada jogo: o relatório estatístico em PDF (guardado aqui) e o relatório de observação em vídeo (YouTube).</p></div></div>
    <div class="filtros"><label>Competição<select id="arq-comp">${ligas.length ? `<optgroup label="Campeonato">${ligas.map(c => `<option ${c === A.comp ? 'selected' : ''}>${esc(c)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Outras competições">${outras.map(c => `<option ${c === A.comp ? 'selected' : ''}>${esc(c)}</option>`).join('')}</optgroup></select></label>
      ${js.length ? `<span class="nota">${nEst} ${nEst === 1 ? 'relatório estatístico' : 'relatórios estatísticos'} · ${nObs} ${nObs === 1 ? 'vídeo de observação' : 'vídeos de observação'} em ${js.length} ${js.length === 1 ? un[0] : un[1]}</span>` : ''}</div>
    ${!js.length ? `<div class="vazio"><p>${ehLiga ? 'Importe o ficheiro da liga (Dados › Importação) para ver as jornadas.' : `Ainda não há jogos da ${esc(A.comp)}. Registe-os em Dados › Jogos (ou no Calendário) com a competição «${esc(A.comp)}» e aparecem aqui.`}</p></div>` : ''}
    ${(() => {
      // Primeiro o próximo jogo, depois as jornadas já jogadas (da mais recente); as restantes por jogar ficam no fim.
      const jogadas = js.filter(j => j.jogado), futuras = js.filter(j => !j.jogado && j !== proxima).sort((a, b) => a.jornada - b.jornada);
      return `${proxima ? `<h2 class="arq-sec">Próximo jogo</h2><div class="arq-lista">${htmlJornadaArquivo(A.comp, proxima, true, editar)}</div>` : ''}
        ${jogadas.length ? `<h2 class="arq-sec">${ehLiga ? 'Jornadas anteriores' : 'Jogos anteriores'}</h2><div class="arq-lista">${jogadas.map(j => htmlJornadaArquivo(A.comp, j, false, editar)).join('')}</div>` : ''}
        ${futuras.length ? `<details class="arq-futuras"><summary>${ehLiga ? 'Jornadas seguintes' : 'Jogos seguintes'} (${futuras.length})</summary><div class="arq-lista">${futuras.map(j => htmlJornadaArquivo(A.comp, j, false, editar)).join('')}</div></details>` : ''}`;
    })()}`;
  $('#arq-comp')?.addEventListener('change', e => { A.comp = e.target.value; desenharArquivo(); });
  ligarArquivo(v, A.comp, js);
}

function htmlJornadaArquivo(comp, j, proxima, editar) {
  const est = registoArquivo(comp, j.jornada, 'estatistico'), obs = registoArquivo(comp, j.jornada, 'observacao');
  const a = j.a; const nos = j.local === 'casa';
  const res = j.jogado ? `${a.golosCasa}–${a.golosFora}` : null;
  const r = j.jogado ? (nos ? (a.golosCasa > a.golosFora ? 'v' : a.golosCasa < a.golosFora ? 'd' : 'e') : (a.golosFora > a.golosCasa ? 'v' : a.golosFora < a.golosCasa ? 'd' : 'e')) : '';
  const vid = idYoutube(obs?.video_url);
  const k = `${j.jornada}`;
  return `<article class="arq-j ${proxima ? 'proxima' : ''}" data-j="${k}">
    <header class="arq-cab">
      <span class="arq-num">${esc(rotuloArq(j))}</span>
      ${simboloEquipa(j.adversario, 'arq-simb')}
      <div class="arq-jogo"><b>${esc(j.adversario)}</b><span class="nota">${j.neutro ? 'Campo neutro' : nos ? 'Casa' : 'Fora'}${a.data ? ` · ${fmtData(a.data)}` : ''}${proxima ? ' · próximo jogo' : ''}${j.inferida ? ' · jornada a confirmar' : ''}</span></div>
      ${res ? `<span class="arq-res ${r}">${res}</span>` : '<span class="arq-res futuro">por jogar</span>'}
    </header>
    <div class="arq-itens">
      <div class="arq-item ${est ? 'tem' : ''}">
        <span class="arq-tipo">${iconePdf()} ${ARQ_TIPOS.estatistico}</span>
        ${est ? `<span class="arq-fich">${esc(est.ficheiro_nome || 'relatório.pdf')}<small>${fmtTamanho(est.tamanho)}${est.updated_at ? ` · ${fmtData(String(est.updated_at).slice(0, 10))}` : ''}</small></span>
          <span class="arq-acoes"><button class="btn" data-abrir="${k}">Abrir</button>${editar ? `<label class="btn-link">Substituir<input type="file" accept="application/pdf" data-pdf="${k}" hidden></label>${podeApagar() ? `<button class="btn-link perigo" data-tirar-pdf="${k}">Apagar</button>` : ''}` : ''}</span>`
        : `<span class="arq-vazio fraco">Sem PDF.</span>${editar ? `<span class="arq-acoes"><label class="btn btn-prim">Carregar PDF<input type="file" accept="application/pdf" data-pdf="${k}" hidden></label><button class="btn-link" data-gerar="${k}">Gerar no pré-jogo</button></span>` : ''}`}
      </div>
      <div class="arq-item ${obs ? 'tem' : ''}">
        <span class="arq-tipo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg> ${ARQ_TIPOS.observacao}</span>
        ${obs ? `<a class="arq-video" href="${esc(obs.video_url)}" target="_blank" rel="noopener">${vid ? `<img src="https://i.ytimg.com/vi/${vid}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}<span>Ver no YouTube ↗</span></a>
          ${editar ? `<span class="arq-acoes"><button class="btn-link" data-video-editar="${k}">Alterar link</button>${podeApagar() ? `<button class="btn-link perigo" data-video-tirar="${k}">Retirar</button>` : ''}</span>` : ''}`
        : editar ? `<form class="arq-form" data-video="${k}"><input type="url" required placeholder="https://youtu.be/…" aria-label="Link do vídeo no YouTube"><button class="btn">Guardar</button></form><p class="erro-txt" data-video-erro="${k}" role="alert"></p>`
          : '<span class="arq-vazio fraco">Sem vídeo.</span>'}
      </div>
    </div>
  </article>`;
}

function ligarArquivo(v, comp, js) {
  const porJ = Object.fromEntries(js.map(j => [String(j.jornada), j]));
  const base = (j, tipo) => ({ competicao: comp, jornada: j.jornada, adversario: j.adversario, tipo });
  const guardar = async (j, tipo, patch) => {
    const ex = registoArquivo(comp, j.jornada, tipo);
    const dados = { ...base(j, tipo), ...patch, updated_at: new Date().toISOString() };
    if (ex) await App.db.atualizar('arquivo', { id: ex.id }, dados); else await App.db.inserir('arquivo', dados);
  };
  $$('[data-abrir]', v).forEach(b => b.addEventListener('click', async () => {
    const r = registoArquivo(comp, Number(b.dataset.abrir), 'estatistico');
    // A janela abre já (os browsers bloqueiam janelas abertas depois de esperar pela rede) e recebe o link quando chega.
    const w = window.open('', '_blank');
    try { const url = await App.db.arquivoUrl(r.caminho); if (w) w.location = url; else location.href = url; }
    catch (e) { w?.close(); toast(traduzErro(e.message || String(e)), 'erro'); }
  }));
  $$('[data-pdf]', v).forEach(inp => inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return; const j = porJ[inp.dataset.pdf];
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { toast('Escolha um ficheiro PDF.', 'erro'); return; }
    if (f.size > ARQ_MAX) { toast('O PDF tem mais de 50 MB.', 'erro'); return; }
    const antigo = registoArquivo(comp, j.jornada, 'estatistico');
    const pasta = norm(comp).replace(/\s+/g, '-');
    const caminho = `${pasta}/${j.rotulo && !/^J\d/.test(j.rotulo) ? j.jornada : `J${String(j.jornada).padStart(2, '0')}`}/estatistico-${Date.now()}.pdf`;
    toast('A carregar o PDF…');
    try {
      await App.db.arquivoGuardar(caminho, f);
      await guardar(j, 'estatistico', { caminho, ficheiro_nome: f.name, tamanho: f.size });
      if (antigo?.caminho && antigo.caminho !== caminho) { try { await App.db.arquivoApagar(antigo.caminho); } catch { /* fica o antigo no Storage */ } }
      toast('Relatório estatístico guardado.'); await recarregar();
    } catch (e) { toast(traduzErro(e.message || String(e)), 'erro'); }
  }));
  $$('[data-tirar-pdf]', v).forEach(b => b.addEventListener('click', async () => {
    const r = registoArquivo(comp, Number(b.dataset.tirarPdf), 'estatistico');
    if (!await confirmar(`Apagar o relatório estatístico ${nomeArq(porJ[b.dataset.tirarPdf])}?`)) return;
    try { if (r.caminho) await App.db.arquivoApagar(r.caminho); await App.db.apagar('arquivo', { id: r.id }); toast('PDF apagado.'); await recarregar(); } catch (e) { toast(traduzErro(e.message || String(e)), 'erro'); }
  }));
  $$('[data-gerar]', v).forEach(b => b.addEventListener('click', () => { const j = porJ[b.dataset.gerar]; App.pre ||= {}; App.pre.adversario = j.adversario; location.hash = 'prejogo'; }));
  $$('form[data-video]', v).forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault(); const j = porJ[f.dataset.video]; const url = $('input', f).value.trim();
    const erro = $(`[data-video-erro="${f.dataset.video}"]`, v);
    if (!idYoutube(url)) { erro.textContent = 'Não parece um link do YouTube (youtube.com/watch?v=… ou youtu.be/…).'; return; }
    try { await guardar(j, 'observacao', { video_url: url }); toast('Vídeo guardado.'); await recarregar(); } catch (err) { erro.textContent = traduzErro(err.message || String(err)); }
  }));
  $$('[data-video-editar]', v).forEach(b => b.addEventListener('click', () => {
    const j = porJ[b.dataset.videoEditar]; const r = registoArquivo(comp, j.jornada, 'observacao');
    const item = b.closest('.arq-item');
    item.querySelector('.arq-video')?.remove(); b.closest('.arq-acoes').remove();
    item.insertAdjacentHTML('beforeend', `<form class="arq-form" data-video="${j.jornada}"><input type="url" required value="${esc(r.video_url)}" aria-label="Link do vídeo no YouTube"><button class="btn">Guardar</button></form><p class="erro-txt" data-video-erro="${j.jornada}" role="alert"></p>`);
    ligarArquivo(item, comp, js);
  }));
  $$('[data-video-tirar]', v).forEach(b => b.addEventListener('click', async () => {
    const r = registoArquivo(comp, Number(b.dataset.videoTirar), 'observacao');
    if (!await confirmar(`Retirar o vídeo de observação ${nomeArq(porJ[b.dataset.videoTirar])}? O vídeo continua no YouTube.`)) return;
    try { await App.db.apagar('arquivo', { id: r.id }); await recarregar(); } catch (e) { toast(traduzErro(e.message || String(e)), 'erro'); }
  }));
}
