// ---------- Calendário e microciclo ----------
App.cal = { vista: 'semana', ref: null };
const TIPOS_AGENDA = { treino: 'Treino', reuniao: 'Reunião', tarefa: 'Tarefa', folga: 'Folga', outro: 'Outro' };
const temFolga = evs => evs.some(e => e.tipo === 'folga');
const ESTADOS = { por_fazer: 'Por fazer', em_curso: 'Em curso', feito: 'Feito' };
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Semana-tipo inicial (editável em "Modelo de microciclo").
const MODELO_PADRAO = [
  { md: 1, tipo: 'treino', titulo: 'Recuperação', hora_inicio: '10:00', hora_fim: '11:00', responsavel: 'Equipa técnica' },
  { md: 1, tipo: 'tarefa', titulo: 'Relatório pós-jogo (dados + vídeo)', responsavel: 'Departamento' },
  { md: 1, tipo: 'reuniao', titulo: 'Análise do jogo com a equipa técnica', hora_inicio: '15:00', hora_fim: '16:00', responsavel: 'Departamento' },
  { md: -5, tipo: 'tarefa', titulo: 'Dossiê do adversário: dados e vídeo', responsavel: 'Departamento' },
  { md: -4, tipo: 'treino', titulo: 'Treino: força e situações reduzidas', hora_inicio: '10:00', hora_fim: '11:30', responsavel: 'Equipa técnica' },
  { md: -4, tipo: 'tarefa', titulo: 'Entregar dossiê do adversário à equipa técnica', responsavel: 'Departamento' },
  { md: -3, tipo: 'treino', titulo: 'Treino: organização defensiva', hora_inicio: '10:00', hora_fim: '11:30', responsavel: 'Equipa técnica' },
  { md: -3, tipo: 'reuniao', titulo: 'Plano de jogo com a equipa técnica', hora_inicio: '14:30', hora_fim: '15:30', responsavel: 'Departamento' },
  { md: -2, tipo: 'reuniao', titulo: 'Apresentação do adversário aos jogadores', hora_inicio: '09:30', hora_fim: '10:00', responsavel: 'Departamento' },
  { md: -2, tipo: 'treino', titulo: 'Treino: organização ofensiva', hora_inicio: '10:15', hora_fim: '11:30', responsavel: 'Equipa técnica' },
  { md: -1, tipo: 'treino', titulo: 'Treino: ativação e esquemas táticos', hora_inicio: '10:00', hora_fim: '11:00', responsavel: 'Equipa técnica' },
  { md: -1, tipo: 'tarefa', titulo: 'Rever esquemas táticos do adversário', responsavel: 'Departamento' }
];
const modeloMicrociclo = () => (Array.isArray(App.cfg.modelo_microciclo) && App.cfg.modelo_microciclo.length ? App.cfg.modelo_microciclo : MODELO_PADRAO);

// ---- Datas (sempre em 'YYYY-MM-DD', sem fusos horários) ----
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const paraUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const deUTC = t => new Date(t).toISOString().slice(0, 10);
const somarDias = (iso, n) => deUTC(paraUTC(iso) + n * 86400000);
const diasEntre = (a, b) => Math.round((paraUTC(b) - paraUTC(a)) / 86400000);
const diaSemana = iso => (new Date(paraUTC(iso)).getUTCDay() + 6) % 7; // 0 = segunda
const inicioSemana = iso => somarDias(iso, -diaSemana(iso));
const hhmm = h => (h ? String(h).slice(0, 5) : '');
const mdTexto = n => (n === 0 ? 'MD' : n > 0 ? `MD+${n}` : `MD${n}`);

function jogosComData() { return App.d.jogos.filter(j => j.data).sort((a, b) => a.data.localeCompare(b.data)); }

// Designação do dia em relação aos jogos: MD no dia do jogo, MD+1/MD+2 a seguir, MD-n antes do próximo.
function rotuloMD(iso, jogos) {
  let ant = null, prox = null;
  for (const j of jogos) { if (j.data <= iso) ant = j; if (j.data >= iso && !prox) prox = j; }
  if (prox && prox.data === iso) return 'MD';
  const n = prox ? diasEntre(iso, prox.data) : null, p = ant ? diasEntre(ant.data, iso) : null;
  if (p !== null && p <= 2 && (n === null || p < n)) return `MD+${p}`;
  if (n !== null && n <= 7) return `MD-${n}`;
  if (p !== null && p <= 3) return `MD+${p}`;
  return '';
}

// Filtro das tarefas (só para o departamento, quando há colaboradores): 'todas', 'dep' (sem colaborador) ou o id de um colaborador.
// Os treinos, reuniões e outros eventos aparecem sempre.
function filtroTarefas() {
  const q = App.cal.quem || 'todas';
  if (!ehDep() || !(App.colaboradores || []).length || q === 'todas') return () => true;
  return e => e.tipo !== 'tarefa' || (q === 'dep' ? !e.atribuido_a : e.atribuido_a === q);
}
function eventosDoDia(iso) {
  const f = filtroTarefas();
  return (App.d.agenda || []).filter(e => e.data === iso && f(e))
    .sort((a, b) => (hhmm(a.hora_inicio) || '99').localeCompare(hhmm(b.hora_inicio) || '99') || a.titulo.localeCompare(b.titulo, 'pt'));
}
function cartaoJogo(j, compacto = false) {
  const local = j.local === 'casa' ? '(C)' : j.local === 'fora' ? '(F)' : '';
  const res = resultadoJogo(j);
  return `<div class="cal-jogo">${compacto ? '' : '<span class="cal-jogo-rot">Jogo</span>'}<b>${esc(j.adversario)} ${local}</b>${res ? ` <span class="res res-${res}">${res}</span>${j.golos_marcados}–${j.golos_sofridos}` : ''}${!compacto && j.competicao ? `<small>${esc(j.competicao)}${j.jornada != null ? ` · J${j.jornada}` : ''}</small>` : ''}</div>`;
}

// Quem tem a tarefa: o colaborador a quem foi atribuída, senão o campo livre "Responsável".
function nomeResponsavel(e, vazio = '–') {
  if (e.atribuido_a) {
    if (e.atribuido_a === App.perfil?.id) return App.perfil.nome || App.perfil.email || 'Eu';
    const p = (App.colaboradores || []).find(x => x.id === e.atribuido_a); if (p) return p.nome || p.email;
  }
  return e.responsavel || vazio;
}
function desenharCalendario() {
  if (ehColab() && App.cal.vista === 'modelo') App.cal.vista = 'semana';
  if (App.cal.quem === undefined) App.cal.quem = lsGet('analise_cal_quem') || 'todas';
  if (App.cal.quem !== 'todas' && App.cal.quem !== 'dep' && !(App.colaboradores || []).some(p => p.id === App.cal.quem)) App.cal.quem = 'todas';
  const v = $('#vista'); const C = App.cal;
  if (!C.ref) C.ref = hojeLocal();
  const ed = pode() && !App.semAgenda;
  let titulo = '';
  if (C.vista === 'mes') { const [y, m] = C.ref.split('-').map(Number); titulo = `${MESES_LONGOS[m - 1][0].toUpperCase()}${MESES_LONGOS[m - 1].slice(1)} ${y}`; }
  if (C.vista === 'semana') { const s = inicioSemana(C.ref), f = somarDias(s, 6); titulo = `${fmtData(s)} a ${fmtData(f)}`; }
  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>${C.vista === 'modelo' ? 'Modelo de microciclo' : C.vista === 'semana' ? 'Microciclo' : 'Calendário'}</h1>${titulo ? `<p class="nota cal-titulo">${esc(titulo)}</p>` : ''}</div>
      <div class="cal-acoes so-ecra">
        ${C.vista !== 'modelo' ? `<div class="cal-nav"><button class="btn" id="cal-ant" aria-label="Anterior">‹</button><button class="btn" id="cal-hoje">Hoje</button><button class="btn" id="cal-seg" aria-label="Seguinte">›</button></div>` : ''}
        ${C.vista === 'semana' ? `<button class="btn botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>` : ''}
        ${ed && C.vista !== 'modelo' ? `<button class="btn btn-prim" id="cal-novo">${ehColab() ? 'Nova tarefa' : 'Novo evento'}</button>` : ''}
      </div>
    </div>
    ${ehDep() && (App.colaboradores || []).length && C.vista !== 'modelo' ? `<div class="cal-quem so-ecra"><span>Tarefas</span><div class="segmentado" role="radiogroup" aria-label="Tarefas de quem">
      ${[['todas', 'Todas'], ['dep', 'Departamento'], ...App.colaboradores.map(p => [p.id, p.nome || p.email])].map(([k, t]) => `<label><input type="radio" name="cal-quem" value="${esc(k)}" ${(C.quem || 'todas') === k ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
    </div></div>` : ''}
    <div class="segmentado largo so-ecra" role="radiogroup" aria-label="Vista">
      ${[['mes', 'Mês'], ['semana', 'Semana'], ...(ehDep() ? [['modelo', 'Modelo de microciclo']] : [])].map(([k, t]) => `<label><input type="radio" name="cal-vista" value="${k}" ${C.vista === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}
    </div>
    ${App.semAgenda ? '<div class="avisos"><p>O calendário ainda não existe na base de dados. Corra outra vez o ficheiro <code>schema.sql</code> no Supabase (SQL Editor); os dados que já existem não são apagados.</p></div>' : ''}
    <div id="cal-corpo"></div>`;
  $$('input[name=cal-vista]', v).forEach(r => r.addEventListener('change', () => { C.vista = r.value; desenharCalendario(); }));
  $$('input[name=cal-quem]', v).forEach(r => r.addEventListener('change', () => { C.quem = r.value; lsSet('analise_cal_quem', r.value); desenharCalendario(); }));
  const passo = C.vista === 'mes' ? null : 7;
  $('#cal-ant')?.addEventListener('click', () => { C.ref = passo ? somarDias(C.ref, -passo) : mudarMes(C.ref, -1); desenharCalendario(); });
  $('#cal-seg')?.addEventListener('click', () => { C.ref = passo ? somarDias(C.ref, passo) : mudarMes(C.ref, 1); desenharCalendario(); });
  $('#cal-hoje')?.addEventListener('click', () => { C.ref = hojeLocal(); desenharCalendario(); });
  $('#cal-novo')?.addEventListener('click', () => dialogoEvento(null, C.vista === 'semana' ? (inicioSemana(C.ref) <= hojeLocal() && hojeLocal() <= somarDias(inicioSemana(C.ref), 6) ? hojeLocal() : inicioSemana(C.ref)) : C.ref));
  $('#b-pdf')?.addEventListener('click', () => exportarPdf(`Microciclo ${inicioSemana(C.ref)}`, { paisagem: true }));
  if (C.vista === 'mes') desenharMes(); else if (C.vista === 'semana') desenharSemana(); else desenharModelo();
}
function mudarMes(iso, n) { const [y, m] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); return deUTC(t.getTime()); }

// ---- Mês ----
function desenharMes() {
  const C = App.cal; const [y, m] = C.ref.split('-').map(Number);
  const primeiro = `${y}-${String(m).padStart(2, '0')}-01`;
  const inicio = inicioSemana(primeiro); const hoje = hojeLocal(); const jogos = jogosComData();
  const semanas = [];
  for (let s = inicio; ; s = somarDias(s, 7)) {
    semanas.push(s);
    if (Number(somarDias(s, 7).slice(5, 7)) !== m) break;
  }
  const porDia = {}; for (const j of jogos) (porDia[j.data] ||= []).push(j);
  $('#cal-corpo').innerHTML = `
    <div class="cal-mes" role="grid" aria-label="Mês">
      <div class="cal-mes-cab" role="row">${DIAS_SEMANA.map(d => `<span role="columnheader">${d}</span>`).join('')}</div>
      ${semanas.map(s => `<div class="cal-mes-semana" role="row">${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const d = somarDias(s, i); const evs = eventosDoDia(d); const js = porDia[d] || []; const md = rotuloMD(d, jogos);
        return `<button class="cal-dia ${Number(d.slice(5, 7)) !== m ? 'fora' : ''} ${d === hoje ? 'hoje' : ''} ${js.length ? 'com-jogo' : ''} ${temFolga(evs) ? 'com-folga' : ''}" data-dia="${d}" role="gridcell" aria-label="${fmtData(d)}: ${temFolga(evs) ? 'folga, ' : ''}${js.length ? 'jogo, ' : ''}${evs.length} eventos">
          <span class="cal-dia-cab"><b>${Number(d.slice(8))}</b>${md ? `<small>${md}</small>` : ''}</span>
          ${js.map(j => cartaoJogo(j, true)).join('')}
          ${evs.slice(0, 3).map(e => `<span class="cal-mini tipo-${e.tipo} ${e.estado === 'feito' ? 'feito' : ''}">${hhmm(e.hora_inicio) ? `<i>${hhmm(e.hora_inicio)}</i> ` : ''}${esc(e.titulo)}</span>`).join('')}
          ${evs.length > 3 ? `<span class="cal-mais">+${evs.length - 3}</span>` : ''}
        </button>`;
      }).join('')}</div>`).join('')}
    </div>
    ${legendaAgenda()}
    ${ehDep() && !App.semAgenda ? botaoProximosJogos() : ''}`;
  $$('[data-dia]').forEach(b => b.addEventListener('click', () => { C.ref = b.dataset.dia; C.vista = 'semana'; desenharCalendario(); }));
  ligarProximosJogos();
}
function legendaAgenda() {
  return `<div class="legenda-campo cal-legenda">${Object.entries(TIPOS_AGENDA).map(([k, t]) => `<span><i class="cal-ponto tipo-${k}"></i>${t}</span>`).join('')}<span><i class="cal-ponto tipo-jogo"></i>Jogo</span></div>`;
}

// ---- Semana (microciclo) ----
function desenharSemana() {
  const C = App.cal; const s = inicioSemana(C.ref); const hoje = hojeLocal(); const jogos = jogosComData();
  const dias = [0, 1, 2, 3, 4, 5, 6].map(i => somarDias(s, i));
  const jogosSemana = jogos.filter(j => j.data >= s && j.data <= dias[6]);
  // Jogos desta semana, ou o próximo (até 7 dias depois), que ainda não têm microciclo.
  const proximo = jogos.find(j => j.data > dias[6] && diasEntre(dias[6], j.data) <= 7);
  const semMicro = [...jogosSemana, ...(proximo ? [proximo] : [])].filter(j => !(App.d.agenda || []).some(e => e.jogo_id === j.id));
  const tarefas = dias.flatMap(eventosDoDia).filter(e => e.tipo === 'tarefa');
  const ed = pode() && !App.semAgenda;
  $('#cal-corpo').innerHTML = `
    ${ehColab() ? '<p class="nota so-ecra">Aqui aparecem só as suas tarefas e os jogos.</p>' : ''}
    ${ed && ehDep() && semMicro.length ? `<div class="aviso-suave so-ecra">${semMicro.map(j => `<p><b>${esc(j.adversario)}</b> (${fmtData(j.data)}) ainda não tem microciclo.</p><button class="btn btn-prim" data-aplicar="${j.id}">Criar a partir do modelo</button>`).join('</div><div class="aviso-suave so-ecra">')}</div>` : ''}
    <div class="cal-semana">
      ${dias.map(d => {
        const md = rotuloMD(d, jogos); const js = jogos.filter(j => j.data === d);
        return `<section class="cal-col ${d === hoje ? 'hoje' : ''} ${js.length ? 'com-jogo' : ''} ${temFolga(eventosDoDia(d)) ? 'com-folga' : ''}" aria-label="${fmtData(d)}">
          <header><span>${DIAS_SEMANA[diaSemana(d)]} <b>${Number(d.slice(8))}</b></span>${md ? `<span class="cal-md">${md}</span>` : ''}</header>
          ${js.map(j => cartaoJogo(j)).join('')}
          ${eventosDoDia(d).map(cartaoEvento).join('')}
          ${ed ? `<button class="cal-adicionar so-ecra" data-novo="${d}" aria-label="Adicionar evento a ${fmtData(d)}">+ Adicionar</button>` : ''}
        </section>`;
      }).join('')}
    </div>
    ${legendaAgenda()}
    ${tarefas.length ? `<section class="bloco cal-tarefas"><h2>Tarefas da semana</h2>
      <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Dia</th><th>Tarefa</th><th>Responsável</th><th>Estado</th></tr></thead>
      <tbody>${tarefas.map(e => `<tr><td>${DIAS_SEMANA[diaSemana(e.data)]} ${Number(e.data.slice(8))}${e.md != null ? ` <span class="fraco">${mdTexto(e.md)}</span>` : ''}</td><td>${esc(e.titulo)}</td><td>${esc(nomeResponsavel(e))}</td>
        <td>${chipEstado(e)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  $$('[data-novo]').forEach(b => b.addEventListener('click', () => dialogoEvento(null, b.dataset.novo)));
  $$('[data-evento]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('[data-estado]')) return; dialogoEvento((App.d.agenda || []).find(x => x.id === b.dataset.evento)); }));
  $$('[data-estado]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); mudarEstado(b.dataset.estado); }));
  $$('[data-aplicar]').forEach(b => b.addEventListener('click', () => aplicarModelo([App.idx.jogo[b.dataset.aplicar]], b)));
}
function chipEstado(e) {
  const est = e.estado || 'por_fazer';
  return pode() && !App.semAgenda
    ? `<button class="estado estado-${est}" data-estado="${e.id}" title="Mudar estado">${ESTADOS[est]}</button>`
    : `<span class="estado estado-${est}">${ESTADOS[est]}</span>`;
}
function cartaoEvento(e) {
  const horas = [hhmm(e.hora_inicio), hhmm(e.hora_fim)].filter(Boolean).join('–');
  return `<div class="cal-evento tipo-${e.tipo} ${e.estado === 'feito' ? 'feito' : ''}" data-evento="${e.id}" role="button" tabindex="0">
    <span class="cal-ev-cab"><span class="cal-ev-tipo">${TIPOS_AGENDA[e.tipo] || ''}</span>${horas ? `<span class="cal-ev-hora">${horas}</span>` : ''}</span>
    <b>${esc(e.titulo)}</b>
    ${e.local || nomeResponsavel(e, '') ? `<small>${esc([e.local, nomeResponsavel(e, '')].filter(Boolean).join(' · '))}</small>` : ''}
    ${e.tipo === 'tarefa' || e.tipo === 'reuniao' || e.estado === 'feito' ? chipEstado(e) : ''}
  </div>`;
}
async function mudarEstado(id) {
  const e = App.d.agenda.find(x => x.id === id); if (!e) return;
  const ordem = ['por_fazer', 'em_curso', 'feito'];
  const novo = ordem[(ordem.indexOf(e.estado || 'por_fazer') + 1) % ordem.length];
  try { await App.db.atualizar('agenda', { id }, { estado: novo }); e.estado = novo; desenharSemana(); }
  catch (err) { toast(err.message, 'erro'); }
}
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-evento]')) { e.preventDefault(); e.target.click(); }
});

// ---- Formulário de evento ----
function dialogoEvento(ev, dataInicial) {
  const ed = pode() && !App.semAgenda; const colab = ehColab();
  const colabs = App.colaboradores || [];
  const responsaveis = [...new Set(['Departamento', 'Equipa técnica', ...(App.d.agenda || []).map(e => e.responsavel).filter(Boolean)])];
  const jogos = jogosComData().slice().reverse();
  const d = document.createElement('dialog'); d.className = 'dialogo';
  const dis = ed ? '' : 'disabled';
  d.innerHTML = `<form class="pilha" method="dialog">
    <h2>${ev ? (ed ? (colab ? 'Editar tarefa' : 'Editar evento') : esc(ev.titulo)) : (colab ? 'Nova tarefa' : 'Novo evento')}</h2>
    <div class="grelha-2">
      <label>Tipo<select name="tipo" ${dis}>${Object.entries(TIPOS_AGENDA).filter(([k]) => !colab || k === 'tarefa').map(([k, t]) => `<option value="${k}" ${(ev?.tipo || (colab ? 'tarefa' : 'treino')) === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Data<input name="data" type="date" required value="${esc(ev?.data || dataInicial || hojeLocal())}" ${dis}></label>
      ${ev ? '' : `<label class="so-folga">Até <span class="fraco">(opcional, vários dias)</span><input name="data_fim" type="date" ${dis}></label>`}
    </div>
    <label>Título<input name="titulo" required value="${esc(ev?.titulo || '')}" placeholder="Ex.: Treino: organização defensiva" ${dis}></label>
    <div class="grelha-2">
      <label class="sem-folga">Início<input name="hora_inicio" type="time" value="${hhmm(ev?.hora_inicio)}" ${dis}></label>
      <label class="sem-folga">Fim<input name="hora_fim" type="time" value="${hhmm(ev?.hora_fim)}" ${dis}></label>
      <label>Local<input name="local" value="${esc(ev?.local || '')}" ${dis}></label>
      ${colab ? '' : `<label>Responsável<input name="responsavel" list="ev-resp" value="${esc(ev?.responsavel || '')}" ${dis}><datalist id="ev-resp">${responsaveis.map(r => `<option value="${esc(r)}">`).join('')}</datalist></label>`}
      ${!colab && colabs.length ? `<label class="so-tarefa">Atribuir a colaborador<select name="atribuido_a" ${dis}><option value="">Ninguém (só o departamento)</option>${colabs.map(p => `<option value="${p.id}" ${ev?.atribuido_a === p.id ? 'selected' : ''}>${esc(p.nome || p.email)}</option>`).join('')}</select></label>` : ''}
      <label>Estado<select name="estado" ${dis}>${Object.entries(ESTADOS).map(([k, t]) => `<option value="${k}" ${(ev?.estado || 'por_fazer') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Microciclo do jogo<select name="jogo_id" ${dis}><option value="">–</option>${jogos.map(j => `<option value="${j.id}" ${ev?.jogo_id === j.id ? 'selected' : ''}>${esc(rotuloJogo(j))}</option>`).join('')}</select></label>
    </div>
    <label>Descrição<textarea name="descricao" rows="3" ${dis}>${esc(ev?.descricao || '')}</textarea></label>
    <div class="acoes">
      ${ev && ed && podeApagar() ? '<button type="button" class="btn-link perigo apagar-esq" id="ev-apagar">Apagar</button>' : ''}
      <button class="btn" value="cancelar" formnovalidate>${ed ? 'Cancelar' : 'Fechar'}</button>
      ${ed ? `<button class="btn btn-prim" value="guardar">${ev ? 'Guardar alterações' : colab ? 'Criar tarefa' : 'Criar evento'}</button>` : ''}
    </div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  const tipo = d.querySelector('[name=tipo]');
  const titulo = d.querySelector('[name=titulo]');
  const mostrarEstado = () => {
    $$('.so-tarefa', d).forEach(el => { el.hidden = tipo.value !== 'tarefa'; });
    // Folga: dia inteiro (sem horas), título "Folga" por omissão e, ao criar, pode abranger vários dias.
    const folga = tipo.value === 'folga';
    $$('.sem-folga', d).forEach(el => { el.hidden = folga; el.style.display = folga ? 'none' : ''; });
    $$('.so-folga', d).forEach(el => { el.hidden = !folga; el.style.display = folga ? '' : 'none'; });
    if (folga && !titulo.value.trim()) titulo.value = 'Folga';
    else if (!folga && titulo.value === 'Folga') titulo.value = '';
  };
  tipo.addEventListener('change', mostrarEstado); mostrarEstado();
  $('#ev-apagar', d)?.addEventListener('click', async () => {
    d.close();
    if (await confirmar(`Apagar "${ev.titulo}" (${fmtData(ev.data)})?`)) {
      try { await App.db.apagar('agenda', { id: ev.id }); App.d.agenda = App.d.agenda.filter(x => x.id !== ev.id); toast('Evento apagado.'); desenharCalendario(); }
      catch (err) { toast(err.message, 'erro'); }
    }
  });
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'guardar') return;
    e.preventDefault();
    const f = new FormData(e.target); const val = k => (String(f.get(k) ?? '').trim() || null);
    const jogo = val('jogo_id') ? App.idx.jogo[val('jogo_id')] : null;
    const reg = {
      tipo: val('tipo'), titulo: val('titulo'), data: val('data'), hora_inicio: val('hora_inicio'), hora_fim: val('hora_fim'),
      local: val('local'), responsavel: colab ? (App.perfil.nome || App.perfil.email || null) : val('responsavel'), estado: val('estado') || 'por_fazer',
      descricao: val('descricao'), jogo_id: jogo ? jogo.id : null, md: jogo?.data ? diasEntre(jogo.data, val('data')) : null
    };
    // O colaborador só cria tarefas, sempre atribuídas a si; o departamento escolhe a quem atribuir.
    if (colab) { reg.tipo = 'tarefa'; reg.estado = reg.estado || 'por_fazer'; reg.atribuido_a = App.perfil.id; }
    else if (colabs.length) reg.atribuido_a = reg.tipo === 'tarefa' ? val('atribuido_a') : null;
    if (reg.tipo === 'folga') { reg.hora_inicio = null; reg.hora_fim = null; reg.titulo ||= 'Folga'; }
    if (reg.hora_inicio && reg.hora_fim && reg.hora_fim < reg.hora_inicio) { toast('A hora de fim é anterior à de início.', 'erro'); return; }
    const ate = reg.tipo === 'folga' && !ev ? val('data_fim') : null;
    if (ate && ate < reg.data) { toast('A data "Até" é anterior à data de início.', 'erro'); return; }
    const nDias = ate ? diasEntre(reg.data, ate) + 1 : 1;
    if (nDias > 31) { toast('Uma folga pode ter no máximo 31 dias.', 'erro'); return; }
    try {
      if (ev) { const [r] = await App.db.atualizar('agenda', { id: ev.id }, reg); Object.assign(ev, r || reg); }
      else for (let i = 0; i < nDias; i++) {
        const dia = somarDias(reg.data, i);
        App.d.agenda.push(await App.db.inserir('agenda', { ...reg, data: dia, md: jogo?.data ? diasEntre(jogo.data, dia) : reg.md }));
      }
      d.close(); toast(ev ? 'Evento atualizado.' : nDias > 1 ? `Folga marcada em ${nDias} dias.` : 'Evento criado.');
      App.cal.ref = reg.data; desenharCalendario();
    } catch (err) { toast(err.message, 'erro'); }
  });
}

// ---- Modelo de microciclo ----
async function aplicarModelo(jogos, botao) {
  const modelo = modeloMicrociclo();
  const linhas = jogos.flatMap(j => modelo.map(it => ({
    tipo: it.tipo, titulo: it.titulo, data: somarDias(j.data, Number(it.md)), hora_inicio: it.hora_inicio || null, hora_fim: it.hora_fim || null,
    local: it.local || null, responsavel: it.responsavel || null, estado: it.tipo === 'tarefa' ? 'por_fazer' : null,
    descricao: it.descricao || null, jogo_id: j.id, md: Number(it.md)
  })));
  if (!linhas.length) { toast('O modelo de microciclo está vazio.', 'erro'); return; }
  if (botao) botao.disabled = true;
  try {
    const novos = await App.db.inserirVarios('agenda', linhas);
    App.d.agenda.push(...novos);
    toast(jogos.length === 1 ? `Microciclo de ${jogos[0].adversario} criado (${novos.length} eventos).` : `Microciclos de ${jogos.length} jogos criados (${novos.length} eventos).`);
    desenharCalendario();
  } catch (err) { if (botao) botao.disabled = false; toast(err.message, 'erro'); }
}
function proximosSemMicro() {
  const hoje = hojeLocal();
  return jogosComData().filter(j => j.data >= hoje && !(App.d.agenda || []).some(e => e.jogo_id === j.id));
}
function botaoProximosJogos() {
  const lista = proximosSemMicro();
  return lista.length ? `<div class="aviso-suave so-ecra"><p>${lista.length === 1 ? '1 próximo jogo ainda não tem' : `${lista.length} próximos jogos ainda não têm`} microciclo: ${esc(lista.slice(0, 4).map(j => `${j.adversario} (${fmtData(j.data, true)})`).join(', '))}${lista.length > 4 ? '…' : ''}</p><button class="btn btn-prim" id="cal-aplicar-todos">Criar a partir do modelo</button></div>` : '';
}
function ligarProximosJogos() {
  $('#cal-aplicar-todos')?.addEventListener('click', e => aplicarModelo(proximosSemMicro(), e.currentTarget));
}

function desenharModelo() {
  const ed = pode() && !App.semAgenda; const dis = ed ? '' : 'disabled';
  const ordenar = ls => ls.sort((a, b) => (a.md < 0) - (b.md < 0) || a.md - b.md || (a.hora_inicio || '99').localeCompare(b.hora_inicio || '99'));
  // Ordenado por dia ao abrir e ao guardar; durante a edição, as linhas novas ficam no fim.
  let linhas = ordenar(modeloMicrociclo().map(x => ({ ...x })));
  const opcoesMD = [-6, -5, -4, -3, -2, -1, 1, 2];
  const desenhar = () => {
    $('#cal-corpo').innerHTML = `
      <section class="bloco">
        <p class="nota">A semana-tipo que a app usa para criar o microciclo de cada jogo. MD é o dia do jogo; MD-3 é três dias antes; MD+1 é o dia a seguir. Depois de criado, cada microciclo pode ser ajustado no calendário sem alterar o modelo.</p>
        <div class="tabela-env"><table class="tabela compacta modelo-tabela">
          <thead><tr><th>Dia</th><th>Tipo</th><th>Título</th><th>Início</th><th>Fim</th><th>Responsável</th>${ed ? '<th><span class="sr">Remover</span></th>' : ''}</tr></thead>
          <tbody>${linhas.map((l, i) => `<tr data-i="${i}">
            <td><select data-c="md" ${dis} aria-label="Dia">${opcoesMD.map(n => `<option value="${n}" ${Number(l.md) === n ? 'selected' : ''}>${mdTexto(n)}</option>`).join('')}</select></td>
            <td><select data-c="tipo" ${dis} aria-label="Tipo">${Object.entries(TIPOS_AGENDA).map(([k, t]) => `<option value="${k}" ${l.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
            <td><input data-c="titulo" value="${esc(l.titulo || '')}" ${dis} aria-label="Título"></td>
            <td><input data-c="hora_inicio" type="time" value="${hhmm(l.hora_inicio)}" ${dis} aria-label="Início"></td>
            <td><input data-c="hora_fim" type="time" value="${hhmm(l.hora_fim)}" ${dis} aria-label="Fim"></td>
            <td><input data-c="responsavel" list="ev-resp-m" value="${esc(l.responsavel || '')}" ${dis} aria-label="Responsável"></td>
            ${ed ? `<td><button class="btn-link perigo" data-remover="${i}">Remover</button></td>` : ''}
          </tr>`).join('')}</tbody>
        </table></div>
        <datalist id="ev-resp-m"><option value="Departamento"><option value="Equipa técnica"></datalist>
        ${ed ? `<div class="acoes-esq"><button class="btn" id="m-adicionar">Adicionar linha</button><button class="btn btn-prim" id="m-guardar">Guardar modelo</button><button class="btn-link" id="m-repor">Repor modelo base</button></div>` : ''}
      </section>
      ${ed ? botaoProximosJogos() : ''}`;
    $$('[data-c]').forEach(c => c.addEventListener('change', () => {
      const i = Number(c.closest('tr').dataset.i); linhas[i][c.dataset.c] = c.dataset.c === 'md' ? Number(c.value) : c.value;
    }));
    $$('[data-remover]').forEach(b => b.addEventListener('click', () => { linhas.splice(Number(b.dataset.remover), 1); desenhar(); }));
    $('#m-adicionar')?.addEventListener('click', () => { linhas.push({ md: -1, tipo: 'treino', titulo: '', hora_inicio: '', hora_fim: '', responsavel: '' }); desenhar(); $$('.modelo-tabela input[data-c=titulo]').pop()?.focus(); });
    $('#m-repor')?.addEventListener('click', () => { linhas = ordenar(MODELO_PADRAO.map(x => ({ ...x }))); desenhar(); toast('Modelo base reposto. Clique em "Guardar modelo" para o manter.'); });
    $('#m-guardar')?.addEventListener('click', async () => {
      const limpo = linhas.filter(l => String(l.titulo || '').trim()).map(l => ({ md: Number(l.md), tipo: l.tipo, titulo: l.titulo.trim(), hora_inicio: hhmm(l.hora_inicio) || null, hora_fim: hhmm(l.hora_fim) || null, responsavel: (l.responsavel || '').trim() || null }));
      try {
        await App.db.upsert('configuracao', [{ id: 1, modelo_microciclo: limpo, updated_at: new Date().toISOString() }], 'id');
        App.cfg.modelo_microciclo = limpo; linhas = ordenar(limpo.map(x => ({ ...x }))); toast('Modelo de microciclo guardado.'); desenhar();
      } catch (err) { toast(/modelo_microciclo/.test(err.message) ? 'Falta atualizar a base de dados. Corra outra vez o schema.sql no Supabase.' : err.message, 'erro'); }
    });
    ligarProximosJogos();
  };
  desenhar();
}
