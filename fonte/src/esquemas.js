// ---------- Esquemas táticos (cantos e livres) ----------
// Codificados em todos os jogos do campeonato. Cada esquema pertence à equipa que bate:
// conta "a favor" dessa equipa e "contra" o adversário nesse jogo.
const EP = {
  tipos: ['Canto', 'Livre'],
  lados: ['Esquerdo', 'Centro', 'Direito'],
  distancias: ['Curto', 'Médio', 'Longo'],
  mecanismos: ['Direto', 'Cruzamento', 'Combinado'],
  bolas: ['Aberto', 'Fechado'],
  contactos: ['Ataque', 'Defesa', 'Guarda-redes', 'Fora'],
  zonas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Baliza', 'Fora de área'],
  resultados: ['Golo', 'Remate fora', 'Remate bloqueado', 'Defesa GR', 'Corte defesa', 'Corte GR', 'Passe', 'Falta atacante', 'Falta defensiva', 'Fora']
};
// Resultados que se escolhem nos botões ("Fora" é posto automaticamente quando o 1.º contacto é fora).
const EP_RES_BOTOES = EP.resultados.filter(r => r !== 'Fora');
// Minuto "35:20" ou "35" → { minuto, segundo }; null se vazio; false se inválido.
function lerMinutoEP(v) {
  const t = String(v ?? '').trim(); if (!t) return null;
  const m = t.match(/^(\d{1,3})(?:[:.,'](\d{1,2}))?$/); if (!m) return false;
  const minuto = Number(m[1]), segundo = m[2] != null ? Number(m[2]) : null;
  if (minuto > 130 || (segundo !== null && segundo > 59)) return false;
  return { minuto, segundo };
}
const fmtMinutoEP = e => Number.isFinite(e.minuto) ? (Number.isFinite(e.segundo) ? `${e.minuto}:${String(e.segundo).padStart(2, '0')}` : `${e.minuto}'`) : '–';
const EP_REMATE = new Set(['Golo', 'Remate fora', 'Remate bloqueado', 'Defesa GR']);
const EP_AJUDA = {
  zonas: 'Zona 1 primeiro poste · 2 centro da baliza · 3 segundo poste (na largura da pequena área) · 4 entrada da área · Baliza: bola dirigida à baliza',
  distancias: 'Curto: junto à área · Médio: da entrada da área à zona intermédia · Longo: do último quarto ao meio-campo'
};
// Aceita as grafias da folha ("Média", "Corte Defesa", "Guarda-Redes"…).
function normEP(lista, v) {
  const n = norm(v); if (!n) return null;
  const alias = { media: 'Médio', medio: 'Médio', longa: 'Longo', curta: 'Curto', 'fora da area': 'Fora de área', 'fora de area': 'Fora de área' };
  if (alias[n] && lista.includes(alias[n])) return alias[n];
  return lista.find(x => norm(x) === n) || null;
}
const eEsquema = e => !!e?.ep_tipo;

// ---- Geometria (coordenadas em %: x para a baliza adversária, y = 0 à esquerda de quem ataca) ----
const COLS_EP = [[M.peqY0, M.peqY0 + (M.peqY1 - M.peqY0) / 3], [M.peqY0 + (M.peqY1 - M.peqY0) / 3, M.peqY1 - (M.peqY1 - M.peqY0) / 3], [M.peqY1 - (M.peqY1 - M.peqY0) / 3, M.peqY1]];
// Zona onde cai a bola; a zona 1 é sempre o primeiro poste (o lado de onde se bate).
function zonaQuedaEP(p, lado) {
  if (!p) return null;
  const d = distBaliza(p.x), ym = metrosY(p.y);
  const dentroLargura = ym >= M.areaY0 && ym <= M.areaY1;
  if (d <= M.area && dentroLargura) {
    const col = ym < COLS_EP[0][1] ? 0 : ym < COLS_EP[1][1] ? 1 : 2;
    return `Zona ${lado === 'Direito' ? 3 - col : col + 1}`;
  }
  if (d <= M.area + 11 && dentroLargura) return 'Zona 4';
  return 'Fora de área';
}
function ladoBatidaEP(p) { const ym = metrosY(p.y); return Math.abs(ym - M.larg / 2) <= 4 ? 'Centro' : ym < M.larg / 2 ? 'Esquerdo' : 'Direito'; }
function distanciaBatidaEP(p) {
  const d = distBaliza(p.x), ym = metrosY(p.y);
  if (d <= 11 || (d <= 22 && ym >= M.areaY0 && ym <= M.areaY1)) return 'Curto';
  return d <= 36 ? 'Médio' : 'Longo';
}
const CANTO_EP = { Esquerdo: { x: 99.6, y: 0.6 }, Direito: { x: 99.6, y: 99.4 } };
// Ponto aproximado (para a folha, que só tem zonas): determinístico a partir de uma semente.
function aleatorioDe(semente) { let h = 2166136261; for (const c of semente) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const deMetros = (d, ym) => ({ x: Math.round((100 - d / M.comp * 100) * 10) / 10, y: Math.round(ym / M.larg * 1000) / 10 });
function pontoBatidaEP(tipo, lado, dist, semente) {
  const r = aleatorioDe(semente); const entre = (a, b) => a + r() * (b - a);
  if (tipo === 'Canto') return CANTO_EP[lado === 'Direito' ? 'Direito' : 'Esquerdo'];
  const [d0, d1] = dist === 'Curto' ? [6, 11] : dist === 'Longo' ? [38, 50] : [22, 33];
  const [y0, y1] = lado === 'Direito' ? [M.areaY1 - 6, M.larg - 3] : lado === 'Centro' ? [M.areaY0 + 8, M.areaY1 - 8] : [3, M.areaY0 + 6];
  return deMetros(entre(d0, d1), entre(y0, y1));
}
function pontoQuedaEP(zona, lado, semente) {
  const r = aleatorioDe(semente); const entre = (a, b) => a + r() * (b - a);
  const m = /^Zona ([1-3])$/.exec(zona || '');
  if (m) { const col = lado === 'Direito' ? 3 - Number(m[1]) : Number(m[1]) - 1; const [y0, y1] = COLS_EP[col]; return deMetros(entre(1.5, 12), entre(y0 + .6, y1 - .6)); }
  if (zona === 'Zona 4') return deMetros(entre(17.5, 25), entre(M.areaY0 + 6, M.areaY1 - 6));
  if (zona === 'Baliza') return deMetros(.4, entre(M.larg / 2 - 3, M.larg / 2 + 3));
  if (zona === 'Fora de área') return deMetros(entre(18, 28), r() < .5 ? entre(4, M.areaY0 - 1) : entre(M.areaY1 + 1, M.larg - 4));
  return null;
}

// ---- Índices ----
function esquemasDoAlvo(a) { return (App.idx.esquemasAlvo?.[a.key] || []); }
function equipasComEsquemas() {
  const s = new Map();
  for (const a of App.idx.alvos || []) if (esquemasDoAlvo(a).length) for (const n of [a.casa, a.fora]) if (!s.has(norm(n))) s.set(norm(n), n);
  return [...s.values()].sort((a, b) => a.localeCompare(b, 'pt'));
}
// Jogos da equipa com esquemas codificados e os esquemas a favor ou contra.
function esquemasDaEquipa(eq, persp, tipo = 'todos') {
  const jogos = (App.idx.alvos || []).filter(a => ladoDaEquipa(a, eq) && esquemasDoAlvo(a).length)
    .sort((a, b) => (a.jornada ?? 999) - (b.jornada ?? 999) || String(a.data || '').localeCompare(String(b.data || '')));
  const lista = [];
  for (const a of jogos) {
    const meu = ladoDaEquipa(a, eq);
    for (const e of esquemasDoAlvo(a)) {
      const l = ladoNoAlvo(e, a);
      if ((persp === 'favor') !== (l === meu)) continue;
      if (tipo !== 'todos' && e.ep_tipo !== tipo) continue;
      lista.push({ e, a });
    }
  }
  return { jogos, lista };
}
const contactoGanho = e => e.primeiro_contacto === 'Ataque';
const comRemate = e => EP_REMATE.has(e.resultado) || EP_REMATE.has(e.segunda_vaga);
const eGolo = e => e.resultado === 'Golo' || e.segunda_vaga === 'Golo';

// ---------- Codificação ----------
const CAMPOS_EP = ['ep_tipo', 'corredor', 'distancia', 'mecanismo', 'tipo_bola', 'primeiro_contacto', 'zona_ep', 'resultado', 'segunda_vaga', 'jogador', 'referencia', 'tipo_defesa', 'minuto', 'tempo', 'video_url', 'notas'];
const EP_DEFESAS = ['HxH', 'Zona', 'Misto'];
function desenharCodEsquemas() {
  const v = $('#vista'); App.codEP ||= { alvo: null, side: null, form: {}, ponto: 'batida', batida: null, queda: null, editarId: null, filtro: 'todos' };
  const C = App.codEP; const alvos = App.idx.alvos || [];
  if (!alvos.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Codificação de esquemas táticos</h1></div><div class="vazio"><p>Ainda não há jogos para codificar.</p><p>Importe o ficheiro da liga em <a href="#importacao">Importação</a>.</p></div>`;
    return;
  }
  if (!C.alvo || !App.idx.alvo[C.alvo]) {
    const nossos = alvos.filter(a => a.partida && a.ladoNosso && Number.isFinite(a.golosCasa)).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0));
    C.alvo = (nossos[0] || alvos[0]).key; C.side = App.idx.alvo[C.alvo].ladoNosso || 'casa';
  }
  C.side ||= 'casa';
  const a = App.idx.alvo[C.alvo];
  const liga = alvos.filter(x => x.partida); const feitos = liga.filter(x => esquemasDoAlvo(x).length).length;
  const opt = x => { const n = esquemasDoAlvo(x).length; return `<option value="${x.key}" ${x.key === C.alvo ? 'selected' : ''}>${n ? '✓ ' : ''}${esc(rotuloAlvo(x, true))}${n ? ` (${n})` : ''}</option>`; };
  const porJ = {}; for (const x of liga.slice().sort((p, q) => (q.jornada ?? 0) - (p.jornada ?? 0) || p.casa.localeCompare(q.casa, 'pt'))) (porJ[x.jornada ?? '–'] ||= []).push(x);
  const outros = alvos.filter(x => !x.partida);
  v.innerHTML = `
    <div class="cabecalho-vista">
      <div><h1>Esquemas táticos</h1><p class="nota">${feitos} de ${liga.length} jogos do campeonato com esquemas táticos codificados.</p></div>
      <div class="cod-jogo-sel">
        <button class="btn" id="e-ant" aria-label="Jogo anterior">‹</button>
        <label class="seletor-jogo"><span class="sr">Jogo</span><select id="e-jogo">${Object.entries(porJ).sort((p, q) => Number(q[0]) - Number(p[0])).map(([j, ls]) => `<optgroup label="Jornada ${j}">${ls.map(opt).join('')}</optgroup>`).join('')}${outros.length ? `<optgroup label="Outros jogos do ${esc(nomeNosso())}">${outros.map(opt).join('')}</optgroup>` : ''}</select></label>
        <button class="btn" id="e-seg" aria-label="Jogo seguinte">›</button>
        ${pode() ? '<button class="btn" id="e-nomes-btn" title="Juntar nomes diferentes do mesmo jogador">Nomes dos jogadores</button>' : ''}
      </div>
    </div>
    <div class="cod-cab-jogo">
      <span class="cod-equipa ${corLado(a, 'casa')}">${esc(a.casa)}</span>
      <b class="cod-resultado">${Number.isFinite(a.golosCasa) ? `${a.golosCasa} – ${a.golosFora}` : 'vs'}</b>
      <span class="cod-equipa ${corLado(a, 'fora')}">${esc(a.fora)}</span>
      <span class="fraco">${esc([a.competicao, a.jornada != null ? `Jornada ${a.jornada}` : null, a.data ? fmtData(a.data) : null].filter(Boolean).join(' · '))}</span>
    </div>
    <div class="cod-grelha">
      <section class="bloco cod-form" id="e-form-env"></section>
      <section class="bloco cod-lista" id="e-lista"></section>
    </div>`;
  $('#e-nomes-btn')?.addEventListener('click', () => {
    const eqs = [...new Set(App.d.eventos.filter(e => e.ep_tipo).map(e => equipaDoEvento(e)).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'pt'));
    dialogoNomesEP(eqs, a[C.side]);
  });
  const ordem = [...$('#e-jogo').options].map(o => o.value);
  const ir = k => { if (!k) return; Object.assign(C, { alvo: k, side: App.idx.alvo[k].ladoNosso || 'casa', editarId: null, form: {}, batida: null, queda: null, ponto: 'batida' }); desenharCodEsquemas(); };
  $('#e-jogo').addEventListener('change', e => ir(e.target.value));
  $('#e-ant').addEventListener('click', () => ir(ordem[ordem.indexOf(C.alvo) + 1]));
  $('#e-seg').addEventListener('click', () => ir(ordem[ordem.indexOf(C.alvo) - 1]));
  aplicarCoresJogo(v, a);
  desenharFormEP(); desenharListaEP();
}

// ---------- Nomes de jogadores (o mesmo jogador escrito de formas diferentes) ----------
const nossaEqEP = eq => eNossaEquipa(eq) || norm(eq) === norm(nomeNosso());
// Nomes do plantel da equipa (o nosso, ou o do adversário na observação).
function plantelNomesEP(equipa) {
  const l = nossaEqEP(equipa) ? App.d.plantel : (typeof plantelAdv === 'function' ? plantelAdv(equipa) : []);
  return [...new Set((l || []).map(p => p.nome).filter(Boolean))];
}
// Nomes usados nos eventos da equipa, com quantas vezes aparecem.
function usosNomesEP(equipa) {
  const m = new Map();
  for (const e of App.d.eventos) { if (!mesmaEquipa(equipaDoEvento(e) || '', equipa)) continue; for (const n of [e.jogador, e.assistente, e.referencia]) if (n) m.set(n, (m.get(n) || 0) + 1); }
  return m;
}
function levEP(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Dois nomes do mesmo jogador? Acentos/maiúsculas, um nome contido no outro ("Musa" / "Musa Drammeh"),
// diminutivo do 1.º nome ("Leo Rivas" / "Leonardo Rivas") ou uma letra trocada ("Talyssom" / "Talysson").
function nomesParecidosEP(a, b) {
  const A = norm(a), B = norm(b); if (!A || !B) return false; if (A === B) return true;
  const ta = A.split(' '), tb = B.split(' ');
  const [cur, lon] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (cur.length < lon.length && cur.every(t => lon.includes(t))) return 'contido';
  if (ta.length === tb.length && ta.length > 1 && ta.at(-1) === tb.at(-1) && ta.slice(0, -1).every((t, i) => t.startsWith(tb[i]) || tb[i].startsWith(t))) return true;
  if (ta.length === tb.length && A.length >= 5 && levEP(A, B) <= (A.length >= 10 ? 2 : 1)) return true;
  return false;
}
// Nome "oficial" para um nome escrito: o do plantel (ou outro nome já usado) quando só há um parecido; senão o próprio.
function nomeCanonicoEP(equipa, nome, nomes = null) {
  const n = normNome(nome); if (!n) return n;
  const pl = plantelNomesEP(equipa);
  const base = nomes || [...pl, ...usosNomesEP(equipa).keys()];
  if (base.includes(n)) return pl.find(p => norm(p) === norm(n)) || n;
  const cand = [...new Set(base.filter(x => x !== n && nomesParecidosEP(n, x)))];
  const doPlantel = cand.filter(x => pl.includes(x));
  if (doPlantel.length === 1) return doPlantel[0];
  if (cand.length === 1) return cand[0];
  return n;
}
// Lista para escolher: plantel + nomes usados que não são variantes de um nome do plantel.
function nomesEP(equipa) {
  const pl = plantelNomesEP(equipa); const s = new Set(pl);
  for (const n of usosNomesEP(equipa).keys()) if (!pl.some(p => nomesParecidosEP(n, p))) s.add(n);
  return [...s].sort((x, y) => x.localeCompare(y, 'pt'));
}
// Sugestões de nomes a juntar numa equipa: cada nome aponta para o nome que fica (ou para si próprio).
function sugestoesNomesEP(equipa) {
  const usos = usosNomesEP(equipa), pl = plantelNomesEP(equipa);
  const nomes = [...new Set([...usos.keys()])];
  const todos = [...new Set([...pl, ...nomes])];
  const dest = new Map();
  for (const n of nomes) {
    const cand = todos.filter(x => x !== n && nomesParecidosEP(n, x));
    if (!cand.length) { dest.set(n, n); continue; }
    // Fica o nome do plantel; senão o mais completo e mais usado.
    const grupo = [n, ...cand];
    const doPl = grupo.filter(x => pl.includes(x));
    let alvo = doPl.length === 1 ? doPl[0] : doPl.length > 1 ? n
      : grupo.slice().sort((x, y) => y.split(' ').length - x.split(' ').length || (usos.get(y) || 0) - (usos.get(x) || 0) || y.length - x.length)[0];
    // Nome curto que cabe em vários nomes longos ("Silva"): não junta sozinho.
    if (cand.filter(x => nomesParecidosEP(n, x) === 'contido' && x.split(' ').length > n.split(' ').length).length > 1 && !doPl.length) alvo = n;
    dest.set(n, alvo);
  }
  return { usos, pl, dest };
}
function dialogoNomesEP(equipas, inicial) {
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  let eq = inicial;
  const desenhar = () => {
    const { usos, pl, dest } = sugestoesNomesEP(eq);
    const nomes = [...usos.keys()].sort((x, y) => x.localeCompare(y, 'pt'));
    const opcoes = [...new Set([...pl, ...nomes])].sort((x, y) => x.localeCompare(y, 'pt'));
    const nSug = nomes.filter(n => dest.get(n) !== n).length;
    d.innerHTML = `<div class="bloco-cab"><h2>Nomes dos jogadores</h2><button class="btn" id="nm-fechar">Fechar</button></div>
      <div class="filtros"><label>Equipa<select id="nm-eq">${equipas.map(e => `<option ${e === eq ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label></div>
      <p class="nota">Os nomes usados nos eventos desta equipa (esquemas táticos e oportunidades). Quando dois nomes são o mesmo jogador, escolha em "Fica como" o nome certo: os eventos passam todos para esse nome. ${pl.length ? 'Os nomes do plantel estão marcados com ✓.' : 'Esta equipa ainda não tem plantel na app; com o plantel importado, a app sugere os nomes certos.'}</p>
      ${nSug ? `<p class="aviso">${nSug} ${nSug === 1 ? 'nome parece' : 'nomes parecem'} variantes de outro (já sugerido em baixo). Confirme e clique em Unificar.</p>` : '<p class="fraco">Não encontrei nomes repetidos. Pode juntar nomes à mão em "Fica como".</p>'}
      <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>Nome usado</th><th class="num">Eventos</th><th>Fica como</th></tr></thead><tbody>
      ${nomes.map(n => `<tr class="${dest.get(n) !== n ? 'nm-sug' : ''}"><td>${esc(n)}${pl.includes(n) ? ' <span class="fraco">✓</span>' : ''}</td><td class="num">${usos.get(n)}</td>
        <td><select data-nome="${esc(n)}"><option value="${esc(n)}">${esc(n)} (manter)</option>${opcoes.filter(o => o !== n).map(o => `<option value="${esc(o)}" ${dest.get(n) === o ? 'selected' : ''}>${esc(o)}${pl.includes(o) ? ' ✓' : ''}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div>
      <p class="erro-form" id="nm-msg" hidden></p>
      <div class="acoes-esq"><button class="btn btn-prim" id="nm-ok">Unificar nomes</button></div>`;
    $('#nm-fechar', d).addEventListener('click', () => d.close());
    $('#nm-eq', d).addEventListener('change', e => { eq = e.target.value; desenhar(); });
    $('#nm-ok', d).addEventListener('click', async ev => {
      const mapa = new Map($$('[data-nome]', d).map(s => [s.dataset.nome, s.value]).filter(([a, b]) => a !== b));
      // Encadeados (A -> B -> C) vão direto para o fim.
      for (const [a] of mapa) { let b = mapa.get(a), k = 0; while (mapa.has(b) && k++ < 10) b = mapa.get(b); mapa.set(a, b); }
      if (!mapa.size) { toast('Nada para mudar.'); return; }
      const evs = App.d.eventos.filter(e => mesmaEquipa(equipaDoEvento(e) || '', eq) && ['jogador', 'assistente', 'referencia'].some(k => mapa.has(e[k])));
      ev.currentTarget.disabled = true; ev.currentTarget.textContent = `A atualizar ${evs.length} eventos…`;
      try {
        for (const e of evs) {
          const patch = {}; for (const k of ['jogador', 'assistente', 'referencia']) if (mapa.has(e[k])) patch[k] = mapa.get(e[k]);
          await App.db.atualizar('eventos', { id: e.id }, patch); Object.assign(e, patch);
        }
        toast(`${mapa.size} ${mapa.size === 1 ? 'nome unificado' : 'nomes unificados'} em ${evs.length} eventos.`);
        desenhar(); desenharListaEP(); desenharFormEP();
      } catch (err) { const m = $('#nm-msg', d); m.textContent = traduzErro(err); m.hidden = false; ev.currentTarget.disabled = false; ev.currentTarget.textContent = 'Unificar nomes'; }
    });
  };
  document.body.appendChild(d); desenhar(); d.showModal();
  d.addEventListener('close', () => d.remove());
}
function lerFormEP() {
  const f = $('#e-form'); if (!f) return; const fd = new FormData(f); const C = App.codEP;
  C.side = fd.get('side') || C.side;
  for (const k of CAMPOS_EP) if (fd.has(k)) C.form[k] = fd.get(k);
  if (C.form.tipo_defesa === '—') C.form.tipo_defesa = null;
  if (f.querySelector('[name="hxh"]')) C.form.hxh = fd.getAll('hxh');
}
function desenharFormEP() {
  const C = App.codEP; const F = C.form; const a = App.idx.alvo[C.alvo];
  const livre = F.ep_tipo === 'Livre', canto = F.ep_tipo === 'Canto';
  const outros = esquemasDoAlvo(a).filter(e => e.id !== C.editarId && ladoNoAlvo(e, a) === C.side).map(e => paraCampo(a, e));
  const opc = (nome, lista, valor, rot, extra = '') => chips(nome, lista, valor, rot, extra);
  $('#e-form-env').innerHTML = `
    <form id="e-form" class="pilha" novalidate>
      <div class="bloco-cab"><h2>${C.editarId ? 'Editar esquema tático' : 'Novo esquema tático'}</h2>
        <details class="criterios"><summary>Critérios</summary><div class="criterios-texto">${esc(App.cfg.criterios.esquema_tatico || '').replace(/\n/g, '<br>')}<br><br>${esc(EP_AJUDA.zonas)}<br>${esc(EP_AJUDA.distancias)}</div></details>
      </div>
      <div class="segmentado lados" role="radiogroup" aria-label="Equipa que bate">
        ${['casa', 'fora'].map(l => `<label class="lado-${corLado(a, l) === 'nos' ? 'nos' : 'adv'}"><input type="radio" name="side" value="${l}" ${C.side === l ? 'checked' : ''}><span>${esc(a[l])}</span></label>`).join('')}
      </div>
      ${opc('ep_tipo', EP.tipos, F.ep_tipo, 'Tipo')}
      <div class="campo-env">
        <div class="cod-ponto-cab">
          <div class="segmentado pequeno" role="radiogroup" aria-label="O que marcar no campo">
            <label><input type="radio" name="ponto" value="batida" ${C.ponto === 'batida' ? 'checked' : ''}><span>Batida${C.batida ? ' ✓' : ''}</span></label>
            <label><input type="radio" name="ponto" value="queda" ${C.ponto === 'queda' ? 'checked' : ''}><span>Onde cai${C.queda ? ' ✓' : ''}</span></label>
          </div>
          <span class="campo-dica">${C.ponto === 'batida' ? (canto ? 'Clique perto da bandeirola de onde se bate' : 'Clique de onde é batido') : 'Clique onde cai a bola'}</span>
          ${C.batida || C.queda ? '<button type="button" class="btn-link" id="e-limpar">Limpar pontos</button>' : ''}
        </div>
        <div id="e-campo" class="lado-${corLado(a, C.side) === 'nos' ? 'nos' : 'adversario'}">${campoSVG({ eventos: outros, interativo: true, metade: true, marcador: C.queda, marcadorPasse: C.batida, classe: 'com-fantasmas', setores: true })}</div>
        <p class="nota zonas-info">${[F.corredor && `Lado ${F.corredor.toLowerCase()}`, livre && F.distancia && `distância ${F.distancia.toLowerCase()}`, F.zona_ep].filter(Boolean).join(' · ')}</p>
      </div>
      ${opc('corredor', EP.lados, F.corredor, 'Lado', ' <span class="fraco">(de onde se bate, visto por quem ataca)</span>')}
      ${livre ? opc('distancia', EP.distancias, F.distancia, 'Distância') : ''}
      ${opc('mecanismo', canto ? EP.mecanismos.filter(m => m !== 'Cruzamento') : EP.mecanismos, F.mecanismo, 'Mecanismo')}
      ${opc('tipo_bola', EP.bolas, F.tipo_bola, 'Tipo de bola')}
      ${opc('zona_ep', EP.zonas, F.zona_ep, 'Zona onde cai', ' <span class="fraco">(calculada pelo clique; zona 1 = primeiro poste)</span>')}
      ${opc('primeiro_contacto', EP.contactos, F.primeiro_contacto, '1.º contacto')}
      ${F.primeiro_contacto === 'Fora' ? '<div class="ep-fora"><span class="rot">Resultado</span><p class="nota">Fora: a bola saiu no 1.º contacto, sem resultado nem 2.ª vaga.</p></div>' : `${opc('resultado', EP_RES_BOTOES, F.resultado, 'Resultado')}
      ${chips('segunda_vaga', ['—', ...EP_RES_BOTOES], F.segunda_vaga || '—', '2.ª vaga', ' <span class="fraco">(opcional)</span>')}`}
      <div class="grelha-2">
        <label>Batedor<input name="jogador" list="e-nomes" value="${esc(F.jogador || '')}" autocomplete="off"></label>
        <label>Referência<input name="referencia" list="e-nomes" value="${esc(F.referencia || '')}" autocomplete="off" placeholder="jogador a quem se dirige"></label>
      </div>
      <datalist id="e-nomes">${nomesEP(a[C.side]).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      ${chips('tipo_defesa', ['—', ...EP_DEFESAS], F.tipo_defesa || '—', `Defesa de ${esc(a[C.side === 'casa' ? 'fora' : 'casa'])}`, ' <span class="fraco">(opcional; como defende quem não bate)</span>')}
      ${F.tipo_defesa === 'HxH' || F.tipo_defesa === 'Misto' ? (() => {
        const sel = F.hxh || []; const nomes = [...new Set([...nomesEP(a[C.side]), ...sel])].sort((x, y) => x.localeCompare(y, 'pt'));
        return `<fieldset class="grupo-chips ep-hxh"><legend>Marcados HxH <span class="fraco">(jogadores de ${esc(a[C.side])} com marcação individual)</span></legend>
          <div class="chips">${nomes.map(n => `<label class="chip"><input type="checkbox" name="hxh" value="${esc(n)}" ${sel.includes(n) ? 'checked' : ''}><span>${esc(n)}</span></label>`).join('') || '<span class="fraco">Ainda não há nomes desta equipa; escreva abaixo.</span>'}</div>
          <div class="linha-hxh"><input id="e-hxh-novo" list="e-nomes" placeholder="Acrescentar jogador…" autocomplete="off"><button type="button" class="btn" id="e-hxh-add">Acrescentar</button></div>
        </fieldset>`;
      })() : ''}
      <details class="mais-detalhes" ${F.minuto || F.video_url || F.notas ? 'open' : ''}><summary>Mais detalhes (opcional)</summary>
        <div class="pilha">
          <div class="linha-minuto"><label>Minuto <span class="fraco">(ex.: 35:20)</span><input name="minuto" type="text" inputmode="numeric" maxlength="6" placeholder="mm:ss" value="${esc(F.minuto ?? '')}"></label></div>
          <div class="grelha-2">
            <label>Ligação para o vídeo<input name="video_url" type="url" placeholder="https://" value="${esc(F.video_url || '')}"></label>
            <label>Notas<input name="notas" value="${esc(F.notas || '')}"></label>
          </div>
        </div>
      </details>
      <p class="erro" id="e-erro" role="alert" hidden></p>
      <div class="acoes-esq">
        <button class="btn btn-prim">${C.editarId ? 'Guardar alterações' : 'Guardar esquema tático'}</button>
        ${C.editarId ? '<button type="button" class="btn" id="e-cancelar">Cancelar edição</button>' : ''}
      </div>
    </form>`;
  const form = $('#e-form');
  form.addEventListener('change', e => {
    const n = e.target.name;
    if (['ponto', 'side', 'ep_tipo', 'corredor', 'primeiro_contacto', 'tipo_defesa'].includes(n)) {
      lerFormEP();
      if (n === 'ponto') C.ponto = e.target.value;
      if (n === 'primeiro_contacto') { if (C.form.primeiro_contacto === 'Fora') { C.form.resultado = 'Fora'; C.form.segunda_vaga = null; } else if (C.form.resultado === 'Fora') C.form.resultado = null; }
      if (n === 'ep_tipo' || n === 'corredor') {
        if (C.form.ep_tipo === 'Canto') { C.form.distancia = null; if (C.form.mecanismo === 'Cruzamento') C.form.mecanismo = null; if (C.form.corredor && CANTO_EP[C.form.corredor]) { C.batida = CANTO_EP[C.form.corredor]; if (!C.queda) C.ponto = 'queda'; } }
        if (C.queda) C.form.zona_ep = C.form.zona_ep === 'Baliza' ? 'Baliza' : zonaQuedaEP(C.queda, C.form.corredor);
      }
      if (n === 'side') C.form.hxh = [];
      desenharFormEP(); if (n === 'side') desenharListaEP();
    }
  });
  const addHxH = () => {
    const i = $('#e-hxh-novo'); const nome = nomeCanonicoEP(a[C.side], i?.value || ''); if (!nome) return;
    lerFormEP(); C.form.hxh = [...new Set([...(C.form.hxh || []), nome])]; desenharFormEP(); $('#e-hxh-novo')?.focus();
  };
  $('#e-hxh-add')?.addEventListener('click', addHxH);
  $('#e-hxh-novo')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addHxH(); } });
  $('#e-campo svg').addEventListener('click', e => {
    const svg = e.currentTarget; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const ponto = { x: Math.round(Math.min(105, Math.max(0, p.x)) / 1.05 * 10) / 10, y: Math.round(Math.min(68, Math.max(0, p.y)) / 0.68 * 10) / 10 };
    lerFormEP();
    if (C.ponto === 'batida') {
      // Perto da linha de fundo e da bandeirola: é canto.
      const canto = distBaliza(ponto.x) < 3 && (metrosY(ponto.y) < 6 || metrosY(ponto.y) > M.larg - 6);
      if (canto) { C.form.ep_tipo = 'Canto'; if (C.form.mecanismo === 'Cruzamento') C.form.mecanismo = null; C.form.corredor = metrosY(ponto.y) < M.larg / 2 ? 'Esquerdo' : 'Direito'; C.batida = CANTO_EP[C.form.corredor]; C.form.distancia = null; }
      else { C.batida = ponto; C.form.ep_tipo ||= 'Livre'; C.form.corredor = ladoBatidaEP(ponto); if (C.form.ep_tipo === 'Livre') C.form.distancia = distanciaBatidaEP(ponto); }
      if (!C.queda) C.ponto = 'queda';
    } else {
      C.queda = ponto;
      if (C.form.zona_ep !== 'Baliza') C.form.zona_ep = zonaQuedaEP(ponto, C.form.corredor);
    }
    if (C.queda && C.form.zona_ep !== 'Baliza') C.form.zona_ep = zonaQuedaEP(C.queda, C.form.corredor);
    desenharFormEP();
  });
  $('#e-limpar')?.addEventListener('click', () => { lerFormEP(); C.batida = null; C.queda = null; C.ponto = 'batida'; desenharFormEP(); });
  $('#e-cancelar')?.addEventListener('click', () => { Object.assign(C, { editarId: null, form: {}, batida: null, queda: null, ponto: 'batida' }); desenharFormEP(); desenharListaEP(); });
  form.addEventListener('submit', guardarEP);
}

async function guardarEP(e) {
  e.preventDefault(); lerFormEP();
  const C = App.codEP; const F = C.form; const a = App.idx.alvo[C.alvo];
  const erros = [];
  const tm = lerMinutoEP(F.minuto); if (tm === false) erros.push('um minuto válido (por exemplo 35 ou 35:20)');
  const minuto = tm ? tm.minuto : null, segundo = tm ? tm.segundo : null;
  if (F.primeiro_contacto === 'Fora') { F.resultado = 'Fora'; F.segunda_vaga = null; }
  if (!F.ep_tipo) erros.push('o tipo');
  if (!F.corredor) erros.push('o lado');
  if (F.ep_tipo === 'Livre' && !F.distancia) erros.push('a distância');
  if (!F.mecanismo) erros.push('o mecanismo');
  if (F.ep_tipo === 'Canto' && F.mecanismo === 'Cruzamento') erros.push('o mecanismo (um canto é direto ou combinado)');
  if (!F.tipo_bola) erros.push('o tipo de bola');
  if (!F.zona_ep) erros.push('a zona onde cai');
  if (!F.primeiro_contacto) erros.push('o 1.º contacto');
  if (!F.resultado) erros.push('o resultado');
  if (F.video_url && !/^https?:\/\//i.test(F.video_url)) erros.push('uma ligação de vídeo válida (começa por https://)');
  const elErro = $('#e-erro');
  if (erros.length) { elErro.textContent = `Falta indicar ${erros.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`; elErro.hidden = false; return; }
  const jogo_id = a.jogo?.id || a.partida?.jogo_id || null;
  const reg = {
    partida_id: a.partida?.id || null, jogo_id, equipa: a[C.side], lado: jogo_id && a.ladoNosso ? (C.side === a.ladoNosso ? 'nos' : 'adversario') : null,
    tipo: 'esquema_tatico', momento: 'Esquema tático', sub_momento: F.ep_tipo, ep_tipo: F.ep_tipo, corredor: F.corredor,
    distancia: F.ep_tipo === 'Livre' ? F.distancia : null, mecanismo: F.mecanismo, tipo_bola: F.tipo_bola, primeiro_contacto: F.primeiro_contacto,
    zona_ep: F.zona_ep, resultado: F.resultado, segunda_vaga: F.segunda_vaga && F.segunda_vaga !== '—' ? F.segunda_vaga : null,
    jogador: nomeCanonicoEP(a[C.side], F.jogador), referencia: nomeCanonicoEP(a[C.side], F.referencia),
    tipo_defesa: F.tipo_defesa && F.tipo_defesa !== '—' ? F.tipo_defesa : null,
    hxh: (F.tipo_defesa === 'HxH' || F.tipo_defesa === 'Misto') && F.hxh?.length ? F.hxh.map(n => nomeCanonicoEP(a[C.side], n)).filter(Boolean) : null, minuto, segundo, tempo: minuto !== null ? tempoDoMinuto(minuto) : null,
    zona_x: C.queda?.x ?? null, zona_y: C.queda?.y ?? null, passe_x: C.batida?.x ?? null, passe_y: C.batida?.y ?? null, local_aprox: false, origem: 'app',
    video_url: (F.video_url || '').trim() || null, notas: (F.notas || '').trim() || null
  };
  const btn = $('#e-form button.btn-prim'); btn.disabled = true;
  try {
    if (C.editarId) {
      const [r] = await App.db.atualizar('eventos', { id: C.editarId }, reg);
      App.d.eventos = App.d.eventos.map(x => (x.id === C.editarId ? (r || { ...x, ...reg }) : x)); toast('Esquema tático atualizado.');
    } else { App.d.eventos.push(await App.db.inserir('eventos', reg)); toast(`${reg.ep_tipo} de ${reg.equipa} guardado.`); }
    reindexarEventos();
    // Mantém equipa, tipo e lado para o próximo (é comum haver vários cantos seguidos).
    Object.assign(C, { editarId: null, batida: F.ep_tipo === 'Canto' ? CANTO_EP[F.corredor] : null, queda: null, ponto: F.ep_tipo === 'Canto' ? 'queda' : 'batida', form: { ep_tipo: F.ep_tipo, corredor: F.ep_tipo === 'Canto' ? F.corredor : null, jogador: F.ep_tipo === 'Canto' ? F.jogador : null, tipo_defesa: F.tipo_defesa || null, hxh: F.ep_tipo === 'Canto' ? (F.hxh || []) : [] } });
    desenharCodEsquemas();
  } catch (err) {
    btn.disabled = false;
    elErro.textContent = /ep_tipo|primeiro_contacto|zona_ep|segunda_vaga|referencia|tipo_bola|distancia|tipo_defesa|hxh|column/i.test(err.message) ? 'A base de dados precisa de ser atualizada para os esquemas táticos. Corra outra vez o schema.sql no Supabase (SQL Editor).' : err.message;
    elErro.hidden = false;
  }
}

function desenharListaEP() {
  const C = App.codEP; const el = $('#e-lista'); const a = App.idx.alvo[C.alvo];
  const todos = esquemasDoAlvo(a).slice().sort((x, y) => (x.minuto ?? 999) - (y.minuto ?? 999) || (x.segundo ?? 0) - (y.segundo ?? 0));
  const lista = C.filtro === 'todos' ? todos : todos.filter(e => ladoNoAlvo(e, a) === C.filtro);
  const de = l => todos.filter(e => ladoNoAlvo(e, a) === l);
  el.innerHTML = `
    <div class="bloco-cab"><h2>Esquemas deste jogo</h2>
      <div class="alternar" role="radiogroup" aria-label="Filtrar">
        ${[['todos', 'Todos'], ['casa', a.casa], ['fora', a.fora]].map(([v, t]) => `<label class="chip"><input type="radio" name="e-filtro" value="${v}" ${C.filtro === v ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
      </div>
    </div>
    <div class="tabela-env"><table class="tabela compacta resumo-cod">
      <thead><tr><th></th><th class="num">Cantos</th><th class="num">Livres</th><th class="num">1.º contacto</th><th class="num">Remates</th><th class="num">Golos</th></tr></thead>
      <tbody>${['casa', 'fora'].map(l => { const evs = de(l); return `<tr><td><span class="ponto-cor ${corLado(a, l) === 'nos' ? 'nos' : 'adv'}"></span>${esc(a[l])}</td><td class="num">${evs.filter(e => e.ep_tipo === 'Canto').length}</td><td class="num">${evs.filter(e => e.ep_tipo === 'Livre').length}</td><td class="num">${evs.filter(contactoGanho).length}</td><td class="num">${evs.filter(comRemate).length}</td><td class="num">${evs.filter(eGolo).length}</td></tr>`; }).join('')}</tbody>
    </table></div>
    ${lista.length ? `<ol class="lista-eventos">${lista.map(e => { const l = ladoNoAlvo(e, a); return `
      <li class="${e.id === C.editarId ? 'a-editar' : ''}">
        <span class="ev-min ${Number.isFinite(e.minuto) ? '' : 'ev-tempo'}">${fmtMinutoEP(e)}</span>
        <span class="ponto-cor ${corLado(a, l) === 'nos' ? 'nos' : 'adv'}" title="${esc(a[l] || '')}"></span>
        <div class="ev-txt">
          <b>${esc([e.ep_tipo, e.corredor && `lado ${e.corredor.toLowerCase()}`, e.distancia && e.distancia.toLowerCase(), e.mecanismo, e.tipo_bola && e.tipo_bola.toLowerCase()].filter(Boolean).join(' · '))}</b>
          <span class="${eGolo(e) ? 'golo' : ''}">${esc([e.zona_ep, e.primeiro_contacto && `1.º contacto: ${e.primeiro_contacto.toLowerCase()}`, e.resultado, e.segunda_vaga && `2.ª vaga: ${e.segunda_vaga.toLowerCase()}`].filter(Boolean).join(' · '))}</span>
          <small>${esc([e.jogador && `bate ${e.jogador}`, e.referencia && `referência ${e.referencia}`, e.tipo_defesa && `defesa ${e.tipo_defesa}${e.hxh?.length ? ` (HxH: ${e.hxh.join(', ')})` : ''}`].filter(Boolean).join(' · '))}</small>
          ${e.local_aprox ? '<small class="fraco">Local aproximado (importado da folha por zonas)</small>' : ''}
        </div>
        <div class="ev-acoes">
          ${e.video_url && /^https?:\/\//i.test(e.video_url) ? `<a class="btn-link" href="${esc(e.video_url)}" target="_blank" rel="noopener">Vídeo</a>` : ''}
          <button class="btn-link" data-ep-editar="${e.id}">Editar</button>${podeApagar() ? `<button class="btn-link perigo" data-ep-apagar="${e.id}">Apagar</button>` : ''}
        </div>
      </li>`; }).join('')}</ol>` : `<p class="fraco vazio-curto">${todos.length ? 'Nenhum esquema para este filtro.' : 'Ainda não há esquemas táticos codificados neste jogo.'}</p>`}`;
  $$('input[name=e-filtro]', el).forEach(r => r.addEventListener('change', () => { C.filtro = r.value; desenharListaEP(); }));
  $$('[data-ep-editar]', el).forEach(b => b.addEventListener('click', () => {
    const ev = App.d.eventos.find(x => x.id === b.dataset.epEditar);
    Object.assign(C, { editarId: ev.id, side: ladoNoAlvo(ev, a) || 'casa', ponto: 'queda',
      queda: ev.zona_x != null ? { x: Number(ev.zona_x), y: Number(ev.zona_y) } : null, batida: ev.passe_x != null ? { x: Number(ev.passe_x), y: Number(ev.passe_y) } : null,
      form: { ...Object.fromEntries(CAMPOS_EP.map(k => [k, ev[k] ?? null])), hxh: Array.isArray(ev.hxh) ? [...ev.hxh] : [], minuto: Number.isFinite(ev.minuto) ? (Number.isFinite(ev.segundo) ? `${ev.minuto}:${String(ev.segundo).padStart(2, '0')}` : String(ev.minuto)) : null } });
    desenharFormEP(); desenharListaEP(); $('#e-form-env').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('[data-ep-apagar]', el).forEach(b => b.addEventListener('click', async () => {
    const ev = App.d.eventos.find(x => x.id === b.dataset.epApagar);
    if (!(await confirmar(`Apagar este ${(ev.ep_tipo || 'esquema').toLowerCase()} de ${equipaDoEvento(ev) || ''}?`))) return;
    try {
      await App.db.apagar('eventos', { id: ev.id }); App.d.eventos = App.d.eventos.filter(x => x.id !== ev.id); reindexarEventos();
      if (C.editarId === ev.id) Object.assign(C, { editarId: null, form: {}, batida: null, queda: null });
      desenharCodEsquemas(); toast('Esquema tático apagado.');
    } catch (err) { toast(err.message, 'erro'); }
  }));
}

// ---------- Análise (Campeonato › Esquemas táticos) ----------
function mapaZonasEP(lista, comNota = true, espelho = false) {
  const conta = Object.fromEntries(EP.zonas.map(z => [z, { n: 0, g: 0 }]));
  for (const { e } of lista) { const c = conta[e.zona_ep]; if (c) { c.n++; if (contactoGanho(e)) c.g++; } }
  const total = Math.max(1, lista.length); const max = Math.max(1, ...Object.values(conta).map(c => c.n));
  const W = 68; const alfa = n => (n ? 0.12 + 0.68 * n / max : 0);
  const rect = (x, y, w, h, z, rot) => { const c = conta[z]; return `<g class="zona"><rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill-opacity:${alfa(c.n)}"/><text x="${x + w / 2}" y="${y + h / 2 - 1.2}" class="${alfa(c.n) > 0.5 ? 'claro' : ''}">${rot}</text><text x="${x + w / 2}" y="${y + h / 2 + 2.4}" class="sub ${alfa(c.n) > 0.5 ? 'claro' : ''}">${fmtNum(c.n / total * 100, 0)}%</text><title>${z}: ${c.n} (${c.n ? fmtNum(c.g / c.n * 100, 0) : 0}% de 1.º contacto ganho)</title></g>`; };
  const [c0, c1, c2] = COLS_EP;
  // Batidos da direita: o 1.º poste fica à direita, como se vê no campo.
  const [cA, cC] = espelho ? [c2, c0] : [c0, c2];
  const zonas = rect(cA[0], 0, cA[1] - cA[0], 16.5, 'Zona 1', '1') + rect(c1[0], 0, c1[1] - c1[0], 16.5, 'Zona 2', '2') + rect(cC[0], 0, cC[1] - cC[0], 16.5, 'Zona 3', '3') + rect(M.areaY0, 16.5, M.areaY1 - M.areaY0, 11, 'Zona 4', '4');
  const linhas = `<g class="linhas-v"><rect x="0" y="0" width="${W}" height="30"/><rect x="${M.areaY0}" y="0" width="${M.areaY1 - M.areaY0}" height="16.5"/><rect x="${M.peqY0}" y="0" width="${M.peqY1 - M.peqY0}" height="5.5"/><rect x="${W / 2 - 3.66}" y="-1.6" width="7.32" height="1.6"/><path d="M${W / 2 - 7.3} 16.5 A9.15 9.15 0 0 0 ${W / 2 + 7.3} 16.5"/></g>`;
  const fora = conta['Fora de área'], bal = conta.Baliza;
  const semZona = lista.length - Object.values(conta).reduce((a, c) => a + c.n, 0);
  const pc = n => ` (${fmtNum(n / total * 100, 0)}%)`;
  const resto = `Baliza: <b>${bal.n}</b>${bal.n ? pc(bal.n) : ''} · Fora de área: <b>${fora.n}</b>${fora.n ? pc(fora.n) : ''}${semZona ? ` · Sem zona registada: <b>${semZona}</b>${pc(semZona)}` : ''}`;
  return `<svg class="mapa-zonas" viewBox="-2 -5 72 37" role="img" aria-label="Zonas onde cai a bola">${zonas}${linhas}<text x="${(c0[0] + c0[1]) / 2 - 6}" y="-2.4" class="lado-poste fim">${espelho ? '2.º' : '1.º'} poste</text><text x="${(c2[0] + c2[1]) / 2 + 6}" y="-2.4" class="lado-poste">${espelho ? '1.º' : '2.º'} poste</text></svg>
    <p class="mapa-fora">${resto}${comNota ? ' · Zona 1 é sempre o primeiro poste (o lado de onde se bate).' : ''}</p>`;
}
// Três mapas lado a lado: todos os esquemas e, depois, só os batidos de cada lado.
function mapasPorLadoEP(lista, rotulo = '') {
  const fig = (titulo, ls, espelho = false) => `<figure class="ep-mapa"><figcaption><b>${titulo}</b><span>${ls.length} ${ls.length === 1 ? 'esquema' : 'esquemas'}</span></figcaption>${ls.length ? mapaZonasEP(ls, false, espelho) : '<div class="ep-mapa-vazio">Sem esquemas deste lado.</div>'}</figure>`;
  return `${rotulo ? `<h3 class="ep-mapas-rot">${rotulo}</h3>` : ''}<div class="ep-mapas">${fig('Gerais', lista)}${fig('Lado esquerdo', lista.filter(x => x.e.corredor === 'Esquerdo'))}${fig('Lado direito', lista.filter(x => x.e.corredor === 'Direito'), true)}</div>`;
}
function tabelaJogadoresEP(titulo, lista, campo, max = 8) {
  const por = new Map();
  const nomeDe = new Map(); // nome normalizado → primeira grafia encontrada
  for (const { e } of lista) { const bruto = e[campo]; if (!bruto) continue; const k = norm(bruto); if (!nomeDe.has(k)) nomeDe.set(k, bruto); const n = nomeDe.get(k); const x = por.get(n) || { n: 0, c: 0, r: 0, g: 0, ab: 0 }; x.n++; if (contactoGanho(e)) x.c++; if (comRemate(e)) x.r++; if (eGolo(e)) x.g++; if (e.tipo_bola === 'Aberto') x.ab++; por.set(n, x); }
  const ls = [...por.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, max);
  if (!ls.length) return `<div><h3>${titulo}</h3><p class="fraco">Sem dados.</p></div>`;
  // Fotografia dos jogadores que estão no plantel (com iniciais para os outros, para a coluna ficar alinhada).
  const doPlantel = nome => App.idx.plantelPorEstat?.[norm(nome)] || null;
  const comFotos = ls.some(([nome]) => doPlantel(nome)?.foto);
  const celNome = nome => comFotos ? `<span class="ep-jog">${avatarJogador(doPlantel(nome) || { nome }, 'avatar-mini')}<span>${esc(nome)}</span></span>` : esc(nome);
  return `<div><h3>${titulo}</h3><div class="tabela-env"><table class="tabela compacta ep-jogadores-tab">
    <thead><tr><th>Jogador</th><th class="num">Esquemas</th>${campo === 'jogador' ? '<th class="num">Aberto / fechado</th>' : ''}<th class="num">1.º contacto</th><th class="num">Remates</th><th class="num">Golos</th></tr></thead>
    <tbody>${ls.map(([nome, x]) => `<tr><td>${celNome(nome)}</td><td class="num"><b>${x.n}</b></td>${campo === 'jogador' ? `<td class="num">${x.ab}/${x.n - x.ab}</td>` : ''}<td class="num">${fmtNum(x.c / x.n * 100, 0)}%</td><td class="num">${x.r}</td><td class="num">${x.g}</td></tr>`).join('')}</tbody>
  </table></div></div>`;
}
// Uma secção completa por tipo de esquema: cantos e livres não se misturam.
function secaoTipoEP(t, lista, nj, rotPersp = '') {
  const n = lista.length;
  const titulo = `${t}s${rotPersp}`;
  if (!n) return `<section class="ep-tipo" id="ep-${norm(t)}"><h2 class="ep-tipo-tit">${titulo}</h2><div class="vazio"><p>Sem ${titulo.toLowerCase()} codificados.</p></div></section>`;
  const ganhos = lista.filter(x => contactoGanho(x.e)).length, remates = lista.filter(x => comRemate(x.e)).length, golos = lista.filter(x => eGolo(x.e)).length;
  const esq = lista.filter(x => x.e.corredor === 'Esquerdo').length, dir = lista.filter(x => x.e.corredor === 'Direito').length;
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  const pct = k => `${fmtNum(k / n * 100, 0)}%`;
  const livre = t === 'Livre';
  return `<section class="ep-tipo" id="ep-${norm(t)}">
    <h2 class="ep-tipo-tit">${titulo}</h2>
    <section class="placar" aria-label="Resumo dos ${titulo.toLowerCase()}">
      ${cel(`${titulo} por jogo`, fmtNum(n / nj, 1), `${n} no total · ${esq} da esquerda · ${dir} da direita`)}
      ${cel('1.º contacto ganho', pct(ganhos), `${ganhos} de ${n}`)}
      ${cel('Com remate', pct(remates), `${remates} (inclui 2.ª vaga)`)}
      ${cel('Golos', golos, golos ? `1 golo a cada ${fmtNum(n / golos, 0)}` : 'nenhum')}
    </section>
    <section class="bloco ep-onde">
      <h2>Onde cai a bola</h2>
      ${mapasPorLadoEP(lista)}
      <p class="mapa-fora">Zona 1 é sempre o 1.º poste, o mais próximo de onde se bate. Lado visto por quem ataca.</p>
      <div class="ana-grelha dois ep-onde-barras">
        ${barras('1.º contacto', contarPor(lista, x => x.e.primeiro_contacto), n)}${barras('Resultado', contarPor(lista, x => x.e.resultado), n)}
      </div>
    </section>
    <section class="bloco">
      <h2>Como se bate</h2>
      <div class="ana-grelha tres">
        ${barras('Mecanismo', contarPor(lista, x => x.e.mecanismo), n)}
        ${barras('Tipo de bola', contarPor(lista, x => x.e.tipo_bola), n)}
        ${barras('Lado', contarPor(lista, x => x.e.corredor), n)}
        ${livre ? barras('Distância', contarPor(lista, x => x.e.distancia), n) : ''}
      </div>
    </section>
    <section class="bloco ep-jogadores">
      <h2>Jogadores</h2>
      <div class="ana-grelha dois">${tabelaJogadoresEP('Batedores', lista, 'jogador')}${tabelaJogadoresEP('Referências', lista, 'referencia')}</div>
    </section>
  </section>`;
}
function desenharPaginaEsquemas() {
  const v = $('#vista'); App.anaEP ||= { equipa: null, persp: 'favor', tipo: 'todos' }; const F = App.anaEP;
  const equipas = equipasComEsquemas();
  if (!equipas.length) {
    v.innerHTML = `<div class="cabecalho-vista"><h1>Esquemas táticos</h1></div><div class="vazio"><p>Ainda não há esquemas táticos codificados.</p>${pode() ? '<p>Codifique-os em <a href="#codesquemas">Codificação › Esquemas táticos</a> ou importe a folha em <a href="#importacao">Importação</a>.</p>' : ''}</div>`;
    return;
  }
  if (!F.equipa || !equipas.includes(F.equipa)) F.equipa = equipas.find(e => eNossaEquipa(e)) || equipas[0];
  const { jogos, lista } = esquemasDaEquipa(F.equipa, F.persp, 'todos');
  const nj = Math.max(1, jogos.length);
  const tipos = F.tipo === 'todos' ? EP.tipos : [F.tipo];
  const verbo = F.persp === 'favor' ? 'a favor' : 'contra';
  v.innerHTML = `
    ${cabecalhoImpressao()}
    <div class="cabecalho-vista">
      <div><h1>Esquemas táticos ${verbo}: ${esc(F.equipa)}</h1><p class="nota">${jogos.length} ${jogos.length === 1 ? 'jogo codificado' : 'jogos codificados'}. ${F.persp === 'favor' ? 'Batidos pela equipa.' : 'Batidos pelos adversários: mostra como a equipa defende.'}</p></div>
      <button class="btn so-ecra botao-pdf" id="b-pdf">${iconePdf()}Exportar PDF</button>
    </div>
    <div class="filtros so-ecra" role="group" aria-label="Filtros">
      <label>Equipa<select id="ep-equipa">${equipas.map(e => `<option ${e === F.equipa ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
      <label>Esquemas<select id="ep-persp"><option value="favor" ${F.persp === 'favor' ? 'selected' : ''}>A favor</option><option value="contra" ${F.persp === 'contra' ? 'selected' : ''}>Contra</option></select></label>
      <label>Mostrar<select id="ep-tipo"><option value="todos">Cantos e livres</option>${EP.tipos.map(t => `<option value="${t}" ${t === F.tipo ? 'selected' : ''}>Só ${t.toLowerCase()}s</option>`).join('')}</select></label>
    </div>
    ${tipos.map(t => secaoTipoEP(t, lista.filter(x => x.e.ep_tipo === t), nj)).join('')}
    <section class="bloco" id="ep-liga"></section>`;
  $('#ep-equipa').addEventListener('change', e => { F.equipa = e.target.value; desenharPaginaEsquemas(); });
  $('#ep-persp').addEventListener('change', e => { F.persp = e.target.value; desenharPaginaEsquemas(); });
  $('#ep-tipo').addEventListener('change', e => { F.tipo = e.target.value; desenharPaginaEsquemas(); });
  $('#b-pdf').addEventListener('click', () => dialogoExportarEsquemas(F.equipa));
  desenharTabelaLigaEP();
}
// O PDF leva sempre os dois blocos: primeiro os esquemas ofensivos (a favor), depois os defensivos (contra).
function exportarEsquemasEP(tipos) {
  const v = $('#vista'); const F = App.anaEP;
  const bloco = (persp, nome, desc) => {
    const { jogos, lista } = esquemasDaEquipa(F.equipa, persp, 'todos');
    const nj = Math.max(1, jogos.length);
    const rot = persp === 'favor' ? ' a favor' : ' contra';
    return `<div class="ep-persp">
      <div class="ep-persp-cab"><h1>Esquemas táticos ${nome}: ${esc(F.equipa)}</h1><p class="nota">${jogos.length} ${jogos.length === 1 ? 'jogo codificado' : 'jogos codificados'}. ${desc}</p></div>
      ${tipos.map(t => secaoTipoEP(t, lista.filter(x => x.e.ep_tipo === t), nj, rot)).join('')}
    </div>`;
  };
  v.innerHTML = `${cabecalhoImpressao()}
    ${bloco('favor', 'ofensivos', 'Batidos pela equipa.')}
    ${bloco('contra', 'defensivos', 'Batidos pelos adversários: mostra como a equipa defende.')}
    <section class="bloco" id="ep-liga"></section>`;
  desenharTabelaLigaEP();
  const voltar = () => { window.removeEventListener('afterprint', voltar); desenharPaginaEsquemas(); };
  exportarPdf(`Esquemas táticos ${F.equipa} ${hojeIso()}`);
  window.addEventListener('afterprint', voltar);
}
function desenharTabelaLigaEP() {
  const el = $('#ep-liga'); const F = App.anaEP;
  const linhas = equipasComEsquemas().map(eq => {
    const fa = esquemasDaEquipa(eq, 'favor', F.tipo), co = esquemasDaEquipa(eq, 'contra', F.tipo); const j = fa.jogos.length; if (!j) return null;
    const p = (ls, fn) => (ls.length ? ls.filter(x => fn(x.e)).length / ls.length * 100 : null);
    return { eq, j, f: fa.lista.length / j, c: co.lista.length / j, cf: p(fa.lista, contactoGanho), cc: p(co.lista, e => !contactoGanho(e)), gf: fa.lista.filter(x => eGolo(x.e)).length, gc: co.lista.filter(x => eGolo(x.e)).length, rf: p(fa.lista, comRemate), rc: p(co.lista, comRemate) };
  }).filter(Boolean).sort((a, b) => b.gf - a.gf || b.rf - a.rf);
  if (linhas.length < 2) { el.remove(); return; }
  el.innerHTML = `
    <h2>Todas as equipas</h2>
    <p class="nota">Por jogo codificado${F.tipo !== 'todos' ? `, só ${F.tipo.toLowerCase()}s` : ''}. "1.º contacto defendido" é a percentagem dos esquemas contra em que o adversário não ganhou o 1.º contacto. Clique numa equipa para a analisar.</p>
    <div class="tabela-env"><table class="tabela compacta classificacao">
      <thead><tr><th>Equipa</th><th class="num">Jogos</th><th class="num">A favor / jogo</th><th class="num">1.º contacto ganho</th><th class="num">Com remate</th><th class="num">Golos</th><th class="num">Contra / jogo</th><th class="num">1.º contacto defendido</th><th class="num">Remates sofridos</th><th class="num">Golos sofridos</th></tr></thead>
      <tbody>${linhas.map(l => `<tr class="${l.eq === F.equipa ? 'nossa' : ''} clicavel" data-eq="${esc(l.eq)}" tabindex="0"><td>${esc(l.eq)}</td><td class="num">${l.j}</td><td class="num"><b>${fmtNum(l.f, 1)}</b></td><td class="num">${fmtNum(l.cf, 0)}%</td><td class="num">${fmtNum(l.rf, 0)}%</td><td class="num">${l.gf}</td><td class="num">${fmtNum(l.c, 1)}</td><td class="num">${fmtNum(l.cc, 0)}%</td><td class="num">${fmtNum(l.rc, 0)}%</td><td class="num">${l.gc}</td></tr>`).join('')}</tbody>
    </table></div>`;
  $$('[data-eq]', el).forEach(r => { const ir = () => { F.equipa = r.dataset.eq; desenharPaginaEsquemas(); window.scrollTo(0, 0); }; r.addEventListener('click', ir); r.addEventListener('keydown', e => { if (e.key === 'Enter') ir(); }); });
}

// ---------- Importação da folha de esquemas táticos ----------
const COLS_FOLHA_EP = {
  equipa: /^(equipa|clube)$/i, adversario: /^advers[aá]rio$/i, treinador: /^treinador$/i, jornada: /^(j|jornada)$/i,
  lado: /^lado$/i, distancia: /^dist[aâ]ncia$/i, tipo: /^(etd|tipo|esquema)$/i, mecanismo: /^mecanismo$/i, bola: /^tipo de bola$/i,
  contacto: /^1\s*[ºo°.]?\s*contacto$/i, zona: /^zona$/i, resultado: /^(outcome|resultado)$/i, vaga: /^2\s*[ªa]?\s*vaga$/i, batedor: /^batedor$/i, referencia: /^refer[eê]ncia$/i,
  tdef: /^tipo de defesa$/i, hxh: /^jogadores\s*hxh/i
};
function detetarFolhaEsquemas(linhas) {
  for (let ih = 0; ih < Math.min(5, linhas.length); ih++) {
    const cab = linhas[ih].map(c => String(c ?? '').trim());
    const idx = Object.fromEntries(Object.entries(COLS_FOLHA_EP).map(([k, re]) => [k, cab.findIndex(c => re.test(c))]));
    if (['equipa', 'adversario', 'tipo', 'contacto', 'zona'].every(k => idx[k] >= 0)) return { formato: 'esquemas', idx, linhas: linhas.slice(ih + 1) };
  }
  return null;
}
// Equipa da folha → equipa dos jogos do campeonato (correspondências guardadas, nome parecido ou escolhida na pré-visualização).
function sugerirEquipaLiga(nome, equipasLiga, escolhas) {
  if (escolhas[nome]) return escolhas[nome];
  const mapa = App.d.mapas.find(m => m.tipo === 'equipa' && norm(m.original) === norm(nome)); if (mapa) return equipasLiga.find(e => norm(e) === norm(mapa.normalizado)) || null;
  const exato = equipasLiga.find(e => norm(e) === norm(nome) || mesmaEquipa(e, nome)); if (exato) return exato;
  // Siglas com uma letra trocada (ex.: AFS / AVS).
  const n = norm(nome).replace(/\s/g, '');
  const parecidas = equipasLiga.filter(e => { const x = norm(e).replace(/\s/g, ''); return x.length === n.length && n.length <= 5 && [...x].filter((c, i) => c !== n[i]).length === 1; });
  return parecidas.length === 1 ? parecidas[0] : null;
}
function analisarFolhaEsquemas(tab, partidas, escolhas = {}) {
  const I = tab.idx; const v = (l, k) => (I[k] >= 0 ? String(l[I[k]] ?? '').trim() : '');
  const equipasLiga = [...new Set(partidas.flatMap(p => [p.casa, p.fora]))];
  const nomesFolha = [...new Set(tab.linhas.flatMap(l => [v(l, 'equipa'), v(l, 'adversario')]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  const corresp = Object.fromEntries(nomesFolha.map(n => [n, sugerirEquipaLiga(n, equipasLiga, escolhas)]));
  const registos = [], semJogo = new Map(), ambiguos = new Map(), divergentes = new Map(), treinadores = new Map(); let vazias = 0;
  tab.linhas.forEach((l, i) => {
    const eq = v(l, 'equipa'), adv = v(l, 'adversario');
    if (!eq && !adv) { vazias++; return; }
    const E = corresp[eq], A = corresp[adv];
    if (!E || !A) { semJogo.set(`${eq} – ${adv}`, (semJogo.get(`${eq} – ${adv}`) || 0) + 1); return; }
    const jornada = parseNum(v(l, 'jornada'));
    let cands = partidas.filter(p => (norm(p.casa) === norm(E) && norm(p.fora) === norm(A)) || (norm(p.casa) === norm(A) && norm(p.fora) === norm(E)));
    if (jornada !== null) {
      const naJornada = cands.filter(p => p.jornada === jornada);
      // Jogo adiado ou jornada registada de outra forma: se o confronto só existe uma vez, usa-o e avisa.
      if (!naJornada.length && cands.length === 1) divergentes.set(`${eq} – ${adv}`, `J${jornada} na folha, ${cands[0].jornada != null ? 'J' + cands[0].jornada : 'sem jornada'} na aplicação`);
      else cands = naJornada;
    }
    if (!cands.length) { semJogo.set(`${eq} – ${adv}`, (semJogo.get(`${eq} – ${adv}`) || 0) + 1); return; }
    // Sem jornada e com ida e volta: usa o jogo já disputado mais antigo e avisa.
    cands.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));
    if (cands.length > 1) ambiguos.set(`${eq} – ${adv}`, cands.map(p => p.jornada));
    const p = cands[0]; const lado = norm(p.casa) === norm(E) ? 'casa' : 'fora';
    if (v(l, 'treinador')) treinadores.set(`${p.id}|${lado}`, v(l, 'treinador'));
    const tipo = normEP(EP.tipos, v(l, 'tipo')); const ladoEP = normEP(EP.lados, v(l, 'lado'));
    const dist = tipo === 'Livre' ? normEP(EP.distancias, v(l, 'distancia')) : null; const zona = normEP(EP.zonas, v(l, 'zona'));
    const semente = `${p.id}|${i}`;
    const batida = tipo ? pontoBatidaEP(tipo, ladoEP, dist, semente + 'b') : null, queda = pontoQuedaEP(zona, ladoEP, semente + 'q');
    registos.push({
      partida: p, lado, equipa: p[lado], tipo: 'esquema_tatico', momento: 'Esquema tático', sub_momento: tipo, ep_tipo: tipo || 'Livre', corredor: ladoEP, distancia: dist,
      mecanismo: normEP(EP.mecanismos, v(l, 'mecanismo')), tipo_bola: normEP(EP.bolas, v(l, 'bola')), primeiro_contacto: normEP(EP.contactos, v(l, 'contacto')),
      zona_ep: zona, resultado: normEP(EP.resultados, v(l, 'resultado')), segunda_vaga: normEP(EP.resultados, v(l, 'vaga')),
      jogador: normNome(v(l, 'batedor')), referencia: normNome(v(l, 'referencia')),
      tipo_defesa: /^h\s*x\s*h$/i.test(v(l, 'tdef')) ? 'HxH' : (v(l, 'tdef') || null), hxh: v(l, 'hxh') ? v(l, 'hxh').split(/[;,]/).map(x => normNome(x)).filter(Boolean) : null,
      zona_x: queda?.x ?? null, zona_y: queda?.y ?? null, passe_x: batida?.x ?? null, passe_y: batida?.y ?? null, local_aprox: true, origem: 'folha_ep'
    });
  });
  const avisos = [];
  if (semJogo.size) avisos.push(`${[...semJogo.values()].reduce((a, b) => a + b, 0)} linhas sem jogo do campeonato correspondente (${[...semJogo.keys()].slice(0, 6).join('; ')}${semJogo.size > 6 ? '…' : ''}).`);
  if (divergentes.size) avisos.push(`Jornada diferente da registada na aplicação, mas o confronto só existe uma vez e foi associado: ${[...divergentes].map(([k, t]) => `${k} (${t})`).join('; ')}.`);
    if (ambiguos.size) avisos.push(`A folha não tem jornada e ${ambiguos.size} ${ambiguos.size === 1 ? 'jogo aparece' : 'jogos aparecem'} na ida e na volta: usei o da 1.ª volta. Acrescente uma coluna "Jornada" para a 2.ª volta.`);
  return { registos, corresp, nomesFolha, equipasLiga, avisos, treinadores, vazias };
}
function desenharAnaliseFolhaEP() {
  const I = App.imp; const el = $('#i-analise');
  if (!App.d.partidas.length) { el.innerHTML = '<ul class="avisos"><li>Ainda não há jogos do campeonato. Importe primeiro o ficheiro da liga (separador "Estatísticas de equipa").</li></ul>'; return; }
  I.escolhasEP ||= {};
  const A = I.analise = analisarFolhaEsquemas(I.tab, App.d.partidas, I.escolhasEP);
  const R = A.registos;
  const jogos = new Set(R.map(r => r.partida.id));
  const antigos = App.d.eventos.filter(e => e.origem === 'folha_ep' && jogos.has(e.partida_id)).length;
  const porEquipa = {}; for (const r of R) { const x = (porEquipa[r.equipa] ||= { c: 0, l: 0, g: 0 }); if (r.ep_tipo === 'Canto') x.c++; else x.l++; if (eGolo(r)) x.g++; }
  const diferentes = A.nomesFolha.filter(n => A.corresp[n] && norm(A.corresp[n]) !== norm(n));
  const faltam = A.nomesFolha.filter(n => !A.corresp[n]);
  el.innerHTML = `
    <h2>Equipas</h2>
    <p class="nota">Cada nome da folha tem de corresponder a uma equipa do ficheiro da liga. As correspondências diferentes ficam guardadas (Definições › Correspondência de nomes).</p>
    <div class="grelha-2 ep-corresp">${[...faltam, ...diferentes].map(n => `<label>${esc(n)} <span class="fraco">na folha</span><select data-corresp="${esc(n)}"><option value="">— sem correspondência —</option>${A.equipasLiga.slice().sort((a, b) => a.localeCompare(b, 'pt')).map(e => `<option ${A.corresp[n] === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></label>`).join('') || '<p class="fraco">Todos os nomes correspondem diretamente.</p>'}</div>
    <h2>Pré-visualização</h2>
    <p class="destaque">${R.length} esquemas táticos (${R.filter(r => r.ep_tipo === 'Canto').length} cantos e ${R.filter(r => r.ep_tipo === 'Livre').length} livres) em ${jogos.size} jogos.${antigos ? ` Substituem ${antigos} importados antes da mesma folha.` : ''}</p>
    ${A.avisos.length ? `<ul class="avisos" role="status">${A.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    <p class="nota">A folha tem zonas e não pontos: cada esquema fica num ponto dentro da zona (local aproximado). As análises por zona ficam exatas.</p>
    <div class="tabela-env"><table class="tabela compacta">
      <thead><tr><th>Equipa (a bater)</th><th class="num">Cantos</th><th class="num">Livres</th><th class="num">Golos</th></tr></thead>
      <tbody>${Object.entries(porEquipa).sort((a, b) => (b[1].c + b[1].l) - (a[1].c + a[1].l)).map(([e, x]) => `<tr><td>${esc(e)}</td><td class="num">${x.c}</td><td class="num">${x.l}</td><td class="num">${x.g}</td></tr>`).join('')}</tbody>
    </table></div>
    ${R.length ? `<div class="acoes-esq"><button class="btn btn-prim" id="i-importar">Importar ${R.length} esquemas táticos</button></div>` : ''}`;
  $$('[data-corresp]', el).forEach(s => s.addEventListener('change', () => { I.escolhasEP[s.dataset.corresp] = s.value || null; desenharAnaliseFolhaEP(); }));
  $('#i-importar')?.addEventListener('click', e => importarFolhaEP(e.currentTarget));
}
async function importarFolhaEP(btn) {
  const A = App.imp.analise; btn.disabled = true; btn.textContent = 'A importar…';
  try {
    const { avisoFicheiro } = await registarImportacao('esquemas', A.registos.length, {});
    // Correspondências de nomes (para as próximas folhas e importações).
    const novas = A.nomesFolha.filter(n => A.corresp[n] && norm(A.corresp[n]) !== norm(n) && !mesmaEquipa(A.corresp[n], n) && !App.d.mapas.some(m => m.tipo === 'equipa' && norm(m.original) === norm(n)));
    if (novas.length) await App.db.upsert('mapeamento_nomes', novas.map(n => ({ tipo: 'equipa', original: n, normalizado: A.corresp[n] })), 'tipo,original');
    // Treinadores (só preenche os que faltam).
    for (const [k, nome] of A.treinadores) {
      const [id, lado] = k.split('|'); const p = App.d.partidas.find(x => x.id === id); const campo = lado === 'casa' ? 'treinador_casa' : 'treinador_fora';
      if (p && !p[campo]) await App.db.atualizar('partidas', { id }, { [campo]: nome });
    }
    const ids = [...new Set(A.registos.map(r => r.partida.id))];
    for (const id of ids) await App.db.apagar('eventos', { partida_id: id, origem: 'folha_ep' });
    const linhas = A.registos.map(r => {
      const { partida, lado, ...ev } = r; const jogo_id = partida.jogo_id || null;
      return { ...ev, partida_id: partida.id, jogo_id, lado: jogo_id ? (eNossaEquipa(r.equipa) ? 'nos' : 'adversario') : null };
    });
    await App.db.inserirVarios('eventos', linhas);
    terminarImportacao(`${linhas.length} esquemas táticos importados.`, avisoFicheiro);
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Tentar outra vez';
    toast(/ep_tipo|primeiro_contacto|zona_ep|segunda_vaga|referencia|tipo_bola|distancia|importacoes_tipo|column/i.test(err.message) ? 'A base de dados precisa de ser atualizada para os esquemas táticos. Corra outra vez o schema.sql no Supabase (SQL Editor).' : err.message, 'erro');
  }
}
