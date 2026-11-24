// ---------- Visão geral ----------
function jogosOrdenados() { return App.d.jogos.slice().sort(compararJogos); }
const jogoDisputado = j => Number.isFinite(j.golos_marcados) && Number.isFinite(j.golos_sofridos);

function desenharVisao() {
  const v = $('#vista'); const hoje = hojeLocal();
  const jogos = jogosOrdenados();
  const disputados = jogos.filter(jogoDisputado);
  const proximo = jogos.filter(j => !jogoDisputado(j) && (!j.data || j.data >= hoje))[0] || null;
  const ultimo = disputados[disputados.length - 1] || null;
  const [y, m, d] = hoje.split('-').map(Number);
  v.innerHTML = `
    <div class="cabecalho-vista">
      <div><h1>Visão geral</h1><p class="nota">${DIAS_SEMANA_LONGOS[diaSemana(hoje)]}, ${d} de ${MESES_LONGOS[m - 1]} de ${y}</p></div>
    </div>
    ${!jogos.length ? `<div class="vazio"><p>Ainda não há jogos registados.</p>${ehDep() ? '<p>Comece por importar o ficheiro da liga em <a href="#importacao">Importação</a>.</p>' : ''}</div>` : `
    <div class="visao-grelha">
      <section class="bloco visao-proximo">${cartaoProximo(proximo, hoje)}</section>
      <section class="bloco visao-epoca">${cartaoEpoca(disputados, ultimo)}</section>
      <section class="bloco visao-semana">${cartaoSemana(hoje, proximo)}</section>
      ${pode() ? `<section class="bloco visao-dep">${cartaoDepartamento()}</section>` : ''}
    </div>`}`;
  $$('[data-ver-adversario]', v).forEach(b => b.addEventListener('click', () => {
    App.pre = { ...(App.pre || { x: 'xg', y: 'xg_sofrido' }), adversario: b.dataset.verAdversario }; location.hash = 'prejogo';
  }));
  $$('[data-criar-micro]', v).forEach(b => b.addEventListener('click', async () => { await aplicarModelo([App.idx.jogo[b.dataset.criarMicro]], b); mostrarVista('visao'); }));
  $$('[data-ir-semana]', v).forEach(b => b.addEventListener('click', () => { App.cal.vista = 'semana'; App.cal.ref = b.dataset.irSemana; location.hash = 'calendario'; }));
}
const DIAS_SEMANA_LONGOS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

// Posição e forma de uma equipa no campeonato (ficheiro da liga).
function situacaoNaLiga(nome, competicao) {
  if (!competicao || !App.d.liga?.length) return null;
  const t = classificacao(competicao); const i = t.findIndex(x => mesmaEquipa(x.equipa, nome) || norm(x.equipa) === norm(nome));
  if (i < 0) return null;
  const forma = App.d.liga.filter(r => norm(r.competicao) === norm(competicao) && (mesmaEquipa(r.equipa, nome) || norm(r.equipa) === norm(nome)) && Number.isFinite(r.golos))
    .sort((a, b) => a.jornada - b.jornada).slice(-5).map(r => (r.golos > r.golos_sofridos ? 'V' : r.golos < r.golos_sofridos ? 'D' : 'E'));
  return { pos: i + 1, n: t.length, ...t[i], forma };
}
const formaHTML = f => f.map(r => `<span class="res res-${r}">${r}</span>`).join('');

function cartaoProximo(j, hoje) {
  if (!j) return '<h2>Próximo jogo</h2><p class="fraco">Não há jogos por disputar registados.</p>';
  const dias = j.data ? diasEntre(hoje, j.data) : null;
  const quando = j.data ? (dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Daqui a ${dias} dias`) : (j.jornada != null ? `Jornada ${j.jornada}` : '');
  const sit = situacaoNaLiga(j.adversario, j.competicao);
  // Oportunidades do adversário nos jogos já codificados.
  const adv = equipasCodificaveis().find(e => mesmaEquipa(e, j.adversario) || norm(e) === norm(j.adversario));
  let ops = null;
  if (adv) {
    const f = { persp: 'criadas', adversario: 'todos', local: 'todos', periodo: 'todos', golos: false, momento: 'todos' };
    const js = jogosDaEquipa(adv, f);
    if (js.length) ops = { j: js.length, c: oportunidadesDe(adv, f, js).length / js.length, s: oportunidadesDe(adv, { ...f, persp: 'sofridas' }, js).length / js.length };
  }
  const temMicro = (App.d.agenda || []).some(e => e.jogo_id === j.id);
  return `
    <p class="visao-rot">Próximo jogo</p>
    <div class="visao-jogo">
      <div><h2>${esc(j.adversario)}</h2>
        <p class="visao-detalhe">${j.local === 'casa' ? 'Em casa' : j.local === 'fora' ? 'Fora' : ''}${j.data ? ` · ${DIAS_SEMANA_LONGOS[diaSemana(j.data)].toLowerCase()}, ${fmtData(j.data)}` : ''}${j.competicao ? ` · ${esc(j.competicao)}` : ''}${j.jornada != null && j.data ? ` · J${j.jornada}` : ''}</p></div>
      ${quando ? `<span class="visao-contagem">${quando}</span>` : ''}
    </div>
    <dl class="visao-dados">
      ${sit ? `<div><dt>Classificação</dt><dd><b>${sit.pos}.º</b> · ${sit.pts} pts em ${sit.j} jogos</dd></div><div><dt>Últimos jogos</dt><dd class="visao-forma">${formaHTML(sit.forma) || '–'}</dd></div><div><dt>Golos</dt><dd>${sit.gm} marcados · ${sit.gs} sofridos</dd></div>` : ''}
      ${ops ? `<div><dt>Oportunidades por jogo</dt><dd>${fmtNum(ops.c, 1)} criadas · ${fmtNum(ops.s, 1)} sofridas <span class="fraco">(${ops.j} ${ops.j === 1 ? 'jogo codificado' : 'jogos codificados'})</span></dd></div>` : ''}
    </dl>
    <div class="acoes-esq">
      <button class="btn" data-ver-adversario="${esc(adv || j.adversario)}">Pré-jogo: ${esc(j.adversario)}</button>
      ${j.data && ehDep() && !App.semAgenda && !temMicro ? `<button class="btn btn-prim" data-criar-micro="${j.id}">Criar microciclo</button>` : ''}
      ${!j.data && pode() ? '<span class="nota">Acrescente a data em <a href="#jogos">Jogos</a> para o jogo entrar no calendário.</span>' : ''}
    </div>`;
}

function cartaoEpoca(disputados, ultimo) {
  const comp = ultimo?.competicao;
  const sit = situacaoNaLiga(App.cfg.nome_clube, comp) || (App.d.liga?.length ? situacaoNaLiga((classificacao(comp || '').find(x => eNossaEquipa(x.equipa)) || {}).equipa, comp) : null);
  const liga = disputados.filter(j => !comp || j.competicao === comp);
  const forma = liga.slice(-5).map(resultadoJogo);
  const v = liga.filter(j => resultadoJogo(j) === 'V').length, e = liga.filter(j => resultadoJogo(j) === 'E').length, d = liga.filter(j => resultadoJogo(j) === 'D').length;
  const est = ultimo ? App.idx.estEq[ultimo.id] : null; const xg = est ? chaveXG(Object.keys(est.nos || {})) : null;
  const opsU = ultimo ? (App.idx.eventos[ultimo.id] || []).filter(x => x.tipo === 'oportunidade') : [];
  return `
    <p class="visao-rot">Época${comp ? ` · ${esc(comp)}` : ''}</p>
    <div class="visao-numeros">
      ${sit ? `<div><span class="visao-num">${sit.pos}.º</span><span class="fraco">de ${sit.n}</span></div><div><span class="visao-num">${sit.pts}</span><span class="fraco">pontos</span></div>` : ''}
      <div><span class="visao-num">${v}-${e}-${d}</span><span class="fraco">V-E-D</span></div>
      <div><span class="visao-num">${soma(liga.map(j => j.golos_marcados))}–${soma(liga.map(j => j.golos_sofridos))}</span><span class="fraco">golos</span></div>
    </div>
    ${forma.length ? `<p class="visao-forma-linha"><span class="fraco">Últimos ${forma.length}:</span> ${formaHTML(forma)}</p>` : ''}
    ${ultimo ? `<div class="visao-ultimo">
      <p class="visao-rot">Último jogo</p>
      <p><b>${esc(ultimo.adversario)}</b> ${ultimo.local === 'casa' ? '(C)' : ultimo.local === 'fora' ? '(F)' : ''} <span class="res res-${resultadoJogo(ultimo)}">${resultadoJogo(ultimo)}</span>${ultimo.golos_marcados}–${ultimo.golos_sofridos} <span class="fraco">${esc(quandoJogo(ultimo))}</span></p>
      <p class="fraco">${[xg ? `xG ${fmtNum(est.nos?.[xg], 2)}–${fmtNum(est.adversario?.[xg], 2)}` : null, opsU.length ? `oportunidades ${opsU.filter(x => x.lado === 'nos').length}–${opsU.filter(x => x.lado === 'adversario').length}` : null].filter(Boolean).join(' · ') || 'Sem estatísticas importadas'}</p>
    </div>` : ''}
    <p><a href="#relatorio">Ver relatório da equipa</a></p>`;
}

function cartaoSemana(hoje, proximo) {
  const ini = inicioSemana(hoje); const dias = [0, 1, 2, 3, 4, 5, 6].map(i => somarDias(ini, i));
  const jogosD = jogosComData();
  const tarefas = dias.flatMap(eventosDoDia).filter(e => e.tipo === 'tarefa');
  const porFazer = tarefas.filter(e => e.estado !== 'feito');
  return `
    <div class="bloco-cab"><p class="visao-rot">Esta semana</p><button class="btn-link" data-ir-semana="${hoje}">Abrir microciclo</button></div>
    ${App.semAgenda ? '<p class="fraco">O calendário ainda não está ativo na base de dados.</p>' : `
    <ol class="visao-dias">${dias.map(d => {
      const evs = eventosDoDia(d); const js = jogosD.filter(j => j.data === d); const md = rotuloMD(d, jogosD);
      return `<li class="${d === hoje ? 'hoje' : ''} ${d < hoje ? 'passado' : ''}">
        <span class="visao-dia"><b>${DIAS_SEMANA[diaSemana(d)]} ${Number(d.slice(8))}</b>${md ? `<small>${md}</small>` : ''}</span>
        <span class="visao-evs">${js.map(j => `<span class="cal-mini tipo-jogo-mini"><b>Jogo: ${esc(j.adversario)}</b></span>`).join('')}${evs.map(e => `<span class="cal-mini tipo-${e.tipo} ${e.estado === 'feito' ? 'feito' : ''}">${hhmm(e.hora_inicio) ? `<i>${hhmm(e.hora_inicio)}</i> ` : ''}${esc(e.titulo)}</span>`).join('') || (js.length ? '' : '<span class="fraco">–</span>')}</span>
      </li>`;
    }).join('')}</ol>
    ${tarefas.length ? `<p class="visao-tarefas"><b>${porFazer.length}</b> de ${tarefas.length} ${tarefas.length === 1 ? 'tarefa' : 'tarefas'} por concluir esta semana${porFazer.length ? `: ${esc(porFazer.slice(0, 3).map(e => e.titulo).join('; '))}${porFazer.length > 3 ? '…' : ''}` : '.'}</p>` : ''}`}`;
}

function cartaoDepartamento() {
  const liga = (App.idx.alvos || []).filter(a => a.partida);
  const comOps = liga.filter(a => (App.idx.eventosAlvo[a.key] || []).length);
  const jornadasJogadas = [...new Set(liga.filter(a => Number.isFinite(a.golosCasa)).map(a => a.jornada))].sort((a, b) => b - a);
  const ultimaJ = jornadasJogadas[0];
  const emFalta = ultimaJ != null ? liga.filter(a => a.jornada === ultimaJ && !(App.idx.eventosAlvo[a.key] || []).length) : [];
  const imp = App.d.importacoes.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const ultimaDe = t => imp.find(i => i.tipo === t);
  const quando = i => (i ? new Date(i.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '–');
  const semEstat = App.d.plantel.filter(p => !App.d.estJog.some(r => r.lado === 'nos' && (norm(r.jogador) === norm(p.nome) || norm(r.jogador) === norm(p.nome_wyscout)))).length;
  return `
    <p class="visao-rot">Departamento</p>
    ${liga.length ? `<div class="visao-progresso"><div class="visao-barra"><i style="width:${comOps.length / liga.length * 100}%"></i></div>
      <p><b>${comOps.length}</b> de ${liga.length} jogos do campeonato codificados${ultimaJ != null ? (emFalta.length ? `; na jornada ${ultimaJ} faltam ${emFalta.length}: ${esc(emFalta.slice(0, 4).map(a => `${a.casa}–${a.fora}`).join(', '))}${emFalta.length > 4 ? '…' : ''}.` : `; a jornada ${ultimaJ} está completa.`) : '.'}</p></div>` : '<p class="fraco">Importe o ficheiro da liga para acompanhar a codificação.</p>'}
    <dl class="visao-dados">
      <div><dt>Ficheiro da liga</dt><dd>${quando(ultimaDe('liga'))}</dd></div>
      <div><dt>Estatísticas de jogadores</dt><dd>${quando(ultimaDe('jogadores'))}</dd></div>
      <div><dt>Folha de oportunidades</dt><dd>${quando(ultimaDe('oportunidades'))}</dd></div>
      ${App.d.plantel.length ? `<div><dt>Plantel sem estatísticas</dt><dd>${semEstat} de ${App.d.plantel.length} jogadores</dd></div>` : ''}
    </dl>
    <div class="acoes-esq"><a class="btn" href="#codificacao">Codificar</a><a class="btn" href="#importacao">Importar</a></div>`;
}
