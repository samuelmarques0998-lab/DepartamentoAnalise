// ---------- Dados estatísticos de cada equipa por jogo (exportação "Team stats" do Wyscout) ----------
// O ficheiro traz a época toda da equipa (e, se exportado "com dados do adversário", também a linha do adversário).
// A app reconhece os jogos do campeonato, ignora o resto (taças, Europa, linhas de médias) e grava no formato da liga.

// Quando o nome do Wyscout não chega ao da liga só pela regra geral.
const ALIAS_WY = { '% posse': 'Posse', posse: 'Posse', 'comprimento medio de passes': 'Comprimento médio de passe', '% passes inteligentes certos': '% Passes Inteligentes' };
const IGNORAR_WY = /^(data|jogo|competi[cç][aã]o|dura[cç][aã]o|equipa|sistema|golos|golos sofridos)$/i;
const OUTRAS_COMP_WY = /ta[cç]a|cup|copa|europa|champions|conference|amig|friendl|supertaça/i;

function chaveSolta(nome) { const pct = /%/.test(nome); return (pct ? '% ' : '') + norm(String(nome).replace(/%/g, ' ')); }

// Cabeçalhos agrupados do Wyscout -> um nome por coluna, como no ficheiro da liga:
// "Remates / à baliza" (3 colunas) -> Remates, Remates à baliza, % Remates à baliza
// "Perdas / curto/ médio / longo" (4) -> Perdas, Perdas curto, Perdas médio, Perdas longo
// "Entradas na grande área (corridas/cruzamentos)" (3) -> Entradas na grande área, … corridas, … cruzamentos
function colunasWyscout(cab) {
  const txt = i => String(cab[i] ?? '').replace(/\s+/g, ' ').trim();
  const out = []; let i = 0;
  while (i < cab.length) {
    const base = txt(i); let n = 0;
    while (i + 1 + n < cab.length && !txt(i + 1 + n)) n++;
    if (!base) { out.push(null); i++; continue; }
    if (!n) out.push(base.replace(/[,\s]+$/, ''));
    else {
      const m = base.match(/^(.*?)\s*\((.*)\)\s*$/);
      const raiz = (m ? m[1] : base.split('/')[0]).trim();
      const subs = (m ? m[2].split('/') : base.split('/').slice(1)).map(s => s.trim()).filter(Boolean);
      const nomes = [raiz];
      // Primeiro as sub-colunas com nome; a seguinte é a percentagem da primeira; as restantes ficam numeradas.
      for (let k = 0; k < n; k++) nomes.push(k < subs.length ? `${raiz} ${subs[k]}` : k === subs.length ? `% ${raiz} ${subs[0] || ''}`.trim() : `${raiz} (${k + 1})`);
      out.push(...nomes);
    }
    i += n + 1;
  }
  return out;
}

// Liga cada coluna à métrica com o mesmo nome no ficheiro da liga (as que não existem ficam com o nome do Wyscout).
function mapaMetricasLiga() {
  const m = new Map();
  for (const r of App.d.liga || []) for (const k of Object.keys(r.metricas || {})) if (!m.has(chaveSolta(k))) m.set(chaveSolta(k), k);
  return m;
}
function nomeNaLiga(nome, mapa) {
  const c = chaveSolta(nome);
  return mapa.get(c) || ALIAS_WY[c] || ALIAS_WY[norm(nome)] || nome;
}

// Lê o ficheiro: um registo por jogo, com as métricas de cada equipa.
function analisarTeamStats(linhas) {
  const ih = linhas.findIndex(l => l.some(c => /^data$/i.test(String(c).trim())) && l.some(c => /^equipa$/i.test(String(c).trim())));
  if (ih < 0) return { erro: 'Não encontrei o cabeçalho do Wyscout (colunas Data, Jogo, Equipa…). Exporte em Team stats › Excel.' };
  const nomes = colunasWyscout(linhas[ih]);
  const col = re => nomes.findIndex(n => n && re.test(n));
  const iD = col(/^data$/i), iJ = col(/^jogo$/i), iC = col(/^competi[cç][aã]o$/i), iE = col(/^equipa$/i);
  const mapa = mapaMetricasLiga();
  const metricasIdx = nomes.map((n, i) => (n && !IGNORAR_WY.test(n) && i !== iD && i !== iJ && i !== iC && i !== iE ? i : -1)).filter(i => i >= 0);
  const desconhecidas = new Set();
  const grupos = new Map();
  let ant = null; // no CSV, a linha do adversário vem logo a seguir, sem data nem jogo
  for (const l of linhas.slice(ih + 1)) {
    let data = parseData(l[iD]), jogo = String(l[iJ] ?? '').trim();
    if (!data && !jogo && ant && String(l[iE] ?? '').trim()) ({ data, jogo } = ant);
    if (!data) { ant = null; continue; } // linhas de médias e vazias
    ant = { data, jogo };
    const k = `${data}|${jogo}`;
    if (!grupos.has(k)) grupos.set(k, { data, texto: jogo, comp: String(l[iC] ?? '').trim(), linhas: [] });
    const met = {};
    for (const i of metricasIdx) {
      const v = parseNum(l[i]); if (v === null) continue;
      const nm = nomeNaLiga(nomes[i], mapa); if (mapa.size && ![...mapa.values()].includes(nm)) desconhecidas.add(nm);
      met[nm] = v;
    }
    grupos.get(k).linhas.push({ equipa: String(l[iE] ?? '').trim(), met });
  }
  const jogos = [...grupos.values()].map(g => ({ ...g, ...(lerTextoJogo(g.texto) || {}) })).filter(g => g.casa);
  return { jogos, desconhecidas: [...desconhecidas], nMetricas: metricasIdx.length };
}

// Nome da equipa como aparece nos jogos do campeonato (senão, o nome do ficheiro com a correspondência de nomes).
function nomeEquipaLiga(nome, partidas, igual, id) {
  for (const p of partidas) { if (igual(p.casa, nome)) return p.casa; if (igual(p.fora, nome)) return p.fora; }
  return id.equipa(nome);
}
// Jornada provável de um jogo novo: a do nosso jogo da mesma semana (±3 dias); senão, a seguinte à última jornada das duas equipas.
function adivinharJornada(g, comp, partidas, igual) {
  const t = Date.parse(g.data);
  const nosso = (App.d.jogos || []).filter(j => norm(j.competicao) === norm(comp) && j.data && j.jornada != null && Math.abs(Date.parse(j.data) - t) <= 3 * 864e5)
    .sort((a, b) => Math.abs(Date.parse(a.data) - t) - Math.abs(Date.parse(b.data) - t))[0];
  if (nosso) return nosso.jornada;
  const js = partidas.filter(p => [g.casa, g.fora].some(e => igual(p.casa, e) || igual(p.fora, e))).map(p => p.jornada).filter(Number.isFinite);
  return js.length ? Math.max(...js) + 1 : null;
}

// Associa cada jogo do ficheiro ao jogo do campeonato e prepara os registos (um por equipa).
function prepararDadosLiga(analise, comp) {
  const id = criarIdentificador(App.cfg, App.d.mapas || []);
  const igual = (a, b) => mesmaEquipa(a, b) || norm(id.equipa(a)) === norm(id.equipa(b));
  const partidas = (App.d.partidas || []).filter(p => norm(p.competicao) === norm(comp));
  const existe = (jornada, equipa) => (App.d.liga || []).find(r => norm(r.competicao) === norm(comp) && r.jornada === jornada && igual(r.equipa, equipa)) || null;
  const out = []; let ignorados = 0;
  for (const g of analise.jogos) {
    if (OUTRAS_COMP_WY.test(g.comp)) { ignorados++; continue; }
    let p = partidas.find(p => igual(p.casa, g.casa) && igual(p.fora, g.fora));
    // Jogo do campeonato que ainda não existe na app (ex.: jornada posterior ao último ficheiro da liga): fica como jogo novo, com a jornada a confirmar.
    if (!p) p = { novo: true, competicao: comp, jornada: adivinharJornada(g, comp, partidas, igual), casa: nomeEquipaLiga(g.casa, partidas, igual, id), fora: nomeEquipaLiga(g.fora, partidas, igual, id), jogo_id: null };
    const lado = { casa: null, fora: null };
    for (const l of g.linhas) { if (!lado.casa && igual(l.equipa, g.casa)) lado.casa = l.met; else if (!lado.fora && igual(l.equipa, g.fora)) lado.fora = l.met; }
    // Linhas com nomes que não reconheço: a 1.ª é a da casa ou a da fora, conforme a que já foi encontrada.
    const resto = g.linhas.filter(l => l.met !== lado.casa && l.met !== lado.fora);
    if (!lado.casa && resto.length) lado.casa = resto.shift().met;
    if (!lado.fora && resto.length) lado.fora = resto.shift().met;
    const registos = [];
    for (const s of ['casa', 'fora']) {
      const met = lado[s]; if (!met || !Object.keys(met).length) continue;
      const o = lado[s === 'casa' ? 'fora' : 'casa'];
      const m = { ...met };
      // O que o Wyscout não dá diretamente vem do adversário.
      if (o && m['xG Sofrido'] == null && Number.isFinite(o['Golos esperados'])) m['xG Sofrido'] = o['Golos esperados'];
      if (o && m['Remates contra'] == null && Number.isFinite(o['Remates'])) m['Remates contra'] = o['Remates'];
      if (o && m['Remates contra no alvo'] == null && Number.isFinite(o['Remates à baliza'])) m['Remates contra no alvo'] = o['Remates à baliza'];
      const equipa = s === 'casa' ? p.casa : p.fora, adversario = s === 'casa' ? p.fora : p.casa;
      const golos = Number.isFinite(g.gc) ? (s === 'casa' ? g.gc : g.gf) : null, sofridos = Number.isFinite(g.gc) ? (s === 'casa' ? g.gf : g.gc) : null;
      registos.push({ lado: s, competicao: p.competicao, jornada: p.jornada, equipa, adversario, local: s, golos, golos_sofridos: sofridos, metricas: m, atual: existe(p.jornada, equipa) });
    }
    if (registos.length) out.push({ p, g, registos });
  }
  out.sort((a, b) => a.p.jornada - b.p.jornada);
  return { jogos: out, ignorados };
}

async function guardarDadosLiga(jogos) {
  const E = App.epoca; const agora = new Date().toISOString();
  for (const j of jogos.filter(j => j.p.novo)) {
    const p = j.p, gc = Number.isFinite(j.g.gc) ? j.g.gc : null, gf = Number.isFinite(j.g.gf) ? j.g.gf : null;
    for (const r of j.registos) r.jornada = p.jornada;
    const id = criarIdentificador(App.cfg, App.d.mapas || []);
    const nosso = id.eNos(p.casa) ? 'casa' : id.eNos(p.fora) ? 'fora' : null;
    if (nosso) {
      const adv = nosso === 'casa' ? p.fora : p.casa;
      const [jg] = await App.db.upsert('jogos', [{ epoca: E, competicao: p.competicao, jornada: p.jornada, adversario: adv, data: j.g.data || null, local: nosso,
        golos_marcados: nosso === 'casa' ? gc : gf, golos_sofridos: nosso === 'casa' ? gf : gc }], 'epoca,competicao,jornada,adversario');
      p.jogo_id = jg?.id || null;
    }
    const [pg] = await App.db.upsert('partidas', [{ epoca: E, competicao: p.competicao, jornada: p.jornada, casa: p.casa, fora: p.fora, golos_casa: gc, golos_fora: gf, jogo_id: p.jogo_id, updated_at: agora }], 'epoca,competicao,casa,fora');
    if (pg) { p.id = pg.id; p.novo = false; }
  }
  const liga = jogos.flatMap(j => j.registos.map(r => ({ epoca: E, competicao: r.competicao, jornada: r.jornada, equipa: r.equipa, adversario: r.adversario, local: r.local,
    golos: r.golos, golos_sofridos: r.golos_sofridos, metricas: r.metricas, updated_at: agora })));
  await App.db.upsert('estatisticas_liga', liga, 'epoca,competicao,jornada,equipa,adversario');
  // Jogos da nossa equipa: também nas estatísticas do jogo (relatório da equipa e pós-jogo).
  const eq = [];
  for (const j of jogos) {
    if (!j.p.jogo_id) continue;
    for (const r of j.registos) eq.push({ jogo_id: j.p.jogo_id, lado: eNossaEquipa(r.equipa) ? 'nos' : 'adversario', equipa: r.equipa, metricas: r.metricas, updated_at: agora });
  }
  if (eq.length) await App.db.upsert('estatisticas_equipa', eq, 'jogo_id,lado');
  return liga.length;
}

// Diálogo aberto a partir de um jogo (Estado por jornada › Dados <equipa>).
function dialogoDadosEquipa(a, equipa) {
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo dd';
  d.innerHTML = `<div class="pilha">
      <h2>${equipa ? `Dados de ${esc(equipa)}` : 'Dados estatísticos (Wyscout)'}</h2>
      <p class="nota sem-margem">${equipa ? `J${a.jornada} · ${esc(a.casa)} – ${esc(a.fora)}` : esc(a.competicao)}</p>
      <label class="dd-ficheiro"><span>Exportação <b>Team stats</b> do Wyscout${equipa ? ` de ${esc(equipa)}` : ''} (Excel ou CSV), de preferência com os dados do adversário</span>
        <input type="file" accept=".xlsx,.xls,.csv" id="dd-f"></label>
      <p class="nota">Pode trazer a época toda: a app vai buscar este jogo e mostra os outros jogos do campeonato que estão no ficheiro.</p>
      <div id="dd-res"></div>
      <div class="acoes"><button class="btn" id="dd-cancelar">Cancelar</button><button class="btn btn-prim" id="dd-guardar" disabled>Guardar</button></div>
    </div>`;
  document.body.appendChild(d); d.showModal(); d.addEventListener('close', () => d.remove());
  $('#dd-cancelar', d).addEventListener('click', () => d.close());
  let prep = null;
  const chaveJogo = j => `${norm(j.p.casa)}|${norm(j.p.fora)}`;
  const esteJogo = j => !!equipa && (j.p.id === a.partida?.id || (j.p.jornada === a.jornada && mesmaEquipa(j.p.casa, a.casa) && mesmaEquipa(j.p.fora, a.fora)));
  const semJornada = () => $$('[data-dd]:checked', d).some(c => { const i = $(`[data-jor="${c.dataset.dd}"]`, d); return i && !(Number(i.value) >= 1); });
  const atualizarBotao = () => { const n = $$('[data-dd]:checked', d).length; const b = $('#dd-guardar', d); b.disabled = !n || semJornada(); b.textContent = n ? `Guardar ${n} ${n === 1 ? 'jogo' : 'jogos'}` : 'Guardar'; };
  $('#dd-f', d).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return; const res = $('#dd-res', d);
    try {
      const an = analisarTeamStats(await lerFicheiroTabela(f));
      if (an.erro) { res.innerHTML = `<p class="erro-txt">${esc(an.erro)}</p>`; return; }
      prep = prepararDadosLiga(an, a.competicao);
      if (!prep.jogos.length) { res.innerHTML = `<p class="erro-txt">Nenhum jogo do ficheiro corresponde a jogos de ${esc(a.competicao)}. Confirme a equipa e os nomes em Definições › Correspondência de nomes.</p>`; return; }
      const meu = equipa ? prep.jogos.find(esteJogo) : null;
      const KEYS = ['Golos esperados', 'xG Sofrido', 'Remates', 'Remates à baliza', 'Posse', '% Passes certos', 'PPDA', 'Toques na área'];
      const previa = (() => {
        if (!equipa) return '';
        if (!meu) return `<p class="aviso">Este jogo não está no ficheiro. Confirme que exportou ${esc(equipa)} e que o jogo já tem estatísticas no Wyscout.</p>`;
        const r = meu.registos.find(r => mesmaEquipa(r.equipa, equipa)) || meu.registos[0];
        return `<h3>${esc(r.equipa)} neste jogo</h3><div class="tabela-env"><table class="tabela compacta"><thead><tr><th></th><th class="num">Atual</th><th class="num">Ficheiro</th></tr></thead><tbody>
          ${KEYS.filter(k => r.metricas[k] != null || r.atual?.metricas?.[k] != null).map(k => `<tr><td>${esc(k)}</td><td class="num">${r.atual?.metricas?.[k] != null ? fmtNum(r.atual.metricas[k], 2) : '–'}</td><td class="num"><b>${r.metricas[k] != null ? fmtNum(r.metricas[k], 2) : '–'}</b></td></tr>`).join('')}
          </tbody></table></div><p class="nota">${Object.keys(r.metricas).length} métricas lidas${meu.registos.length > 1 ? `, e também as de ${esc(meu.registos.find(x => x !== r).equipa)} (vêm no mesmo ficheiro)` : ' (sem a linha do adversário: exporte com os dados do adversário para ter os dois lados)'}.</p>`;
      })();
      const estado = j => { if (j.p.novo) return ['novo', 'Jogo novo na app']; const n = j.registos.filter(r => r.atual).length; return n === 0 ? ['novo', 'Sem dados'] : n < j.registos.length ? ['parcial', 'Falta uma equipa'] : ['tem', 'Já tem dados (substitui)']; };
      res.innerHTML = `${previa}
        <h3>Jogos do campeonato no ficheiro (${prep.jogos.length})</h3>
        <div class="dd-lista">${prep.jogos.map(j => { const [cls, txt] = estado(j); const marcar = esteJogo(j) || cls !== 'tem';
          return `<label class="dd-jogo ${cls} ${esteJogo(j) ? 'este' : ''}"><input type="checkbox" data-dd="${esc(chaveJogo(j))}" ${marcar ? 'checked' : ''}>
            ${j.p.novo ? `<span class="dd-j">J<input type="number" min="1" max="60" class="dd-jor" data-jor="${esc(chaveJogo(j))}" value="${j.p.jornada ?? ''}" aria-label="Jornada" title="Confirme a jornada"></span>` : `<span class="dd-j">J${j.p.jornada}</span>`}<span>${esc(j.p.casa)} <b>${Number.isFinite(j.g.gc) ? `${j.g.gc}–${j.g.gf}` : '–'}</b> ${esc(j.p.fora)}</span>
            <span class="dd-est">${txt}${j.registos.length < 2 ? ' · só uma equipa no ficheiro' : ''}</span></label>`; }).join('')}</div>
        ${prep.jogos.some(j => j.p.novo) ? '<p class="nota">Jogos novos: ainda não estão nos jogos do campeonato da app (o último ficheiro da liga é anterior). Confirme a jornada; o jogo é criado ao guardar.</p>' : ''}
        ${prep.ignorados ? `<p class="nota">${prep.ignorados} ${prep.ignorados === 1 ? 'jogo ignorado' : 'jogos ignorados'} por não serem de ${esc(a.competicao)} (taças, Europa, outras ligas).</p>` : ''}
        ${an.desconhecidas.length ? `<p class="nota">Métricas que não existiam na liga (ficam guardadas com o nome do Wyscout): ${esc(an.desconhecidas.join(', '))}.</p>` : ''}`;
      $$('[data-dd]', d).forEach(c => c.addEventListener('change', atualizarBotao));
      $$('[data-jor]', d).forEach(i => i.addEventListener('input', atualizarBotao));
      atualizarBotao();
    } catch (err) { res.innerHTML = `<p class="erro-txt">${esc(traduzErro(err.message || String(err)))}</p>`; }
  });
  $('#dd-guardar', d).addEventListener('click', async e => {
    const marcados = new Set($$('[data-dd]:checked', d).map(c => c.dataset.dd));
    const jogos = prep.jogos.filter(j => marcados.has(chaveJogo(j)));
    for (const j of jogos) { const i = $(`[data-jor="${chaveJogo(j)}"]`, d); if (i) j.p.jornada = Number(i.value); }
    e.target.disabled = true; e.target.textContent = 'A guardar…';
    try { const n = await guardarDadosLiga(jogos); d.close(); toast(`${n} ${n === 1 ? 'registo guardado' : 'registos guardados'} em ${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'}.`); await recarregar(); }
    catch (err) { e.target.disabled = false; atualizarBotao(); toast(traduzErro(err.message || String(err)), 'erro'); }
  });
}
