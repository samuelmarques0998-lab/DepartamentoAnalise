// ---------- Método de codificação de oportunidades (departamento) ----------
const BOLA_CORRIDA = ['Cruzamento alto', 'Cruzamento rasteiro', 'Cruzamento atrasado', 'Rotura', 'Combinação interior', '1x1', 'Remate exterior', '2.ª bola'];
const MOMENTOS = {
  'Organização': { sub: ['Jogo exterior', 'Jogo interior'] },
  'Transição': { sub: ['Ataque rápido', 'Contra-ataque', 'Recuperação alta'] },
  'Esquema tático': { sub: ['Canto', 'Livre', 'Lançamento', 'Penálti'] }
};
const MEC_ESQUEMA = { Canto: ['Direto', 'Combinado', '2.ª bola'], Livre: ['Remate direto', 'Cruzamento', 'Combinado', '2.ª bola'], 'Lançamento': ['Direto', 'Combinado', '2.ª bola'], 'Penálti': [] };
const TEMPOS = ['0-15', '15-30', '30-45', '45-60', '60-75', '75-90', 'Prolongamento'];
const CORREDORES = ['Esquerdo', 'Centro', 'Direito'];
const POSICOES_EV = ['Guarda-redes', 'Defesa direito', 'Defesa central', 'Defesa esquerdo', 'Médio defensivo', 'Médio centro', 'Médio ofensivo', 'Extremo direito', 'Extremo esquerdo', 'Ponta de lança'];
const RESULTADOS = ['Golo', 'Defesa do GR', 'Fora', 'Bloqueado', 'Ferro'];
const MAIS_DETALHES = { finalizacao: ['Pé direito', 'Pé esquerdo', 'Cabeça', 'Outra'] };

function mecanismosDe(momento, sub) {
  if (momento === 'Esquema tático') return MEC_ESQUEMA[sub] || [];
  return momento ? BOLA_CORRIDA : [];
}
function tempoDoMinuto(m) {
  if (!Number.isFinite(m)) return null;
  if (m > 90 && m <= 95) return '75-90'; // descontos da 2.ª parte
  if (m > 95) return 'Prolongamento';
  return TEMPOS[Math.min(5, Math.floor(Math.max(0, m - 0.0001) / 15))];
}
const parteDoTempo = t => (!t ? null : t === 'Prolongamento' ? 'Prolongamento' : ['0-15', '15-30', '30-45'].includes(t) ? '1.ª parte' : '2.ª parte');

// ---- Normalização (folha antiga e eventos da primeira versão da app) ----
const procurar = (lista, v) => lista.find(x => norm(x) === norm(v)) || null;
function normMomento(v) {
  const t = norm(v);
  if (!t) return null;
  if (t.startsWith('organiza')) return 'Organização';
  if (t.startsWith('transi') || t === 'recuperacao alta') return 'Transição';
  if (t.startsWith('esquema') || t.startsWith('bola parada')) return 'Esquema tático';
  return v;
}
function normSub(momento, v) {
  const t = norm(v);
  if (!t || t === '-') return null;
  if (t.startsWith('lancamento')) return 'Lançamento';
  if (t.startsWith('penal')) return 'Penálti';
  return procurar(MOMENTOS[momento]?.sub || [], v) || procurar(Object.values(MOMENTOS).flatMap(m => m.sub), v) || v.trim();
}
// Um só mecanismo: a última ação que criou a oportunidade ("1x1, Cruzamento Alto" -> Cruzamento alto),
// exceto o remate exterior depois de outra ação ("2ª Bola, Remate Exterior" -> 2.ª bola).
function normMecanismo(momento, sub, v) {
  let partes = String(v ?? '').split(',').map(x => x.trim()).filter(x => x && x !== '-');
  if (!partes.length) return null;
  if (partes.length > 1 && norm(partes[partes.length - 1]) === 'remate exterior') partes = partes.slice(0, -1);
  const raw = partes[partes.length - 1]; const t = norm(raw);
  const segunda = t === '2 bola' || t === '2a bola' || t === 'segunda bola';
  if (momento === 'Esquema tático') {
    if (sub === 'Penálti') return null;
    if (segunda) return '2.ª bola';
    if (t.startsWith('cruzamento')) return sub === 'Livre' ? 'Cruzamento' : 'Direto';
    if (t === 'direto') return sub === 'Livre' ? 'Remate direto' : 'Direto';
    return procurar(MEC_ESQUEMA[sub] || [], raw) || procurar(BOLA_CORRIDA, raw) || raw;
  }
  if (segunda) return '2.ª bola';
  return procurar(BOLA_CORRIDA, raw) || raw;
}
function normPosicao(v) {
  const t = norm(v); if (!t || t === '-') return null;
  if (t === 'guarda redes' || t === 'gr') return 'Guarda-redes';
  const m = { 'lateral direito': 'Defesa direito', 'lateral esquerdo': 'Defesa esquerdo' }[t];
  return m || procurar(POSICOES_EV, v) || v.trim();
}
const normNome = v => { const s = String(v ?? '').trim(); return !s || s === '-' ? null : s; };

// Dados de uma oportunidade, já normalizados (para análises e listas).
function dadosOportunidade(e) {
  const momento = normMomento(e.momento) || (e.tipo === 'esquema_tatico' ? 'Esquema tático' : null);
  const sub = e.sub_momento || (e.tipo === 'esquema_tatico' ? normSub('Esquema tático', e.subtipo) : (norm(e.momento) === 'recuperacao alta' ? 'Recuperação alta' : null));
  return {
    momento, sub, mecanismo: e.mecanismo || e.ultima_acao || null,
    corredor: e.corredor || null, tempo: e.tempo || tempoDoMinuto(e.minuto), parte: e.parte || parteDoTempo(e.tempo || tempoDoMinuto(e.minuto)),
    golo: e.resultado === 'Golo'
  };
}

// ---- Zonas do método antigo (mapa do departamento) ----
// Coordenadas da app: x e y em % (0–100), a atacar para a direita; y pequeno = lado esquerdo de quem ataca.
const M = { comp: 105, larg: 68, area: 16.5, areaY0: 13.84, areaY1: 54.16, peq: 5.5, peqY0: 24.84, peqY1: 43.16 };
const distBaliza = x => (100 - x) / 100 * M.comp;
const metrosY = y => y / 100 * M.larg;
// Faixas do método do departamento: 1-3 junto à baliza (até meio da área), 4-6 até à linha da área, 7-9 até aos 30 m, 10-12 até ao meio-campo.
const FAIXAS_PASSE = [[0, 8.25], [8.25, 16.5], [16.5, 30], [30, 52.5]];
// Faixas usadas até novembro de 2026. As oportunidades importadas da folha nessa altura (origem 'folha') têm o ponto
// gerado dentro destas faixas: ao carregar, o ponto passa para a mesma posição relativa na faixa nova, mantendo o n.º da zona.
const FAIXAS_PASSE_ANTIGAS = [[0, 16.5], [16.5, 25], [25, 35], [35, 52.5]];
function atualizarZonasPasseAntigas(eventos) {
  for (const e of eventos) {
    if (e.origem !== 'folha') continue;
    e.origem = 'folha_z';
    if (e.passe_x == null) continue;
    const d = distBaliza(Number(e.passe_x)); if (d > 52.5) continue;
    const r = FAIXAS_PASSE_ANTIGAS.findIndex(([, b]) => d < b || b === 52.5);
    const [a, b] = FAIXAS_PASSE_ANTIGAS[r], [a2, b2] = FAIXAS_PASSE[r];
    const d2 = a2 + (d - a) / (b - a) * (b2 - a2);
    e.passe_x = Math.round((100 - d2 / M.comp * 100) * 10) / 10;
  }
}
const CORR_PASSE = [[0, M.areaY0], [M.areaY0, M.areaY1], [M.areaY1, M.larg]];
const FAIXAS_FIN = [[0, 5.5], [5.5, 11], [11, 16.5]];
const COLS_FIN = [[M.areaY0, M.peqY0], [M.peqY0, M.larg / 2], [M.larg / 2, M.peqY1], [M.peqY1, M.areaY1]];

function zonaPasse(x, y) {
  if (x === null || x === undefined || y === null || y === undefined) return null;
  const d = distBaliza(Number(x)), ym = metrosY(Number(y));
  if (d > 52.5) return 13;
  const r = FAIXAS_PASSE.findIndex(([a, b]) => d < b || b === 52.5);
  const c = ym < M.areaY0 ? 0 : ym > M.areaY1 ? 2 : 1;
  return r * 3 + c + 1;
}
function zonaFinalizacao(x, y) {
  if (x === null || x === undefined || y === null || y === undefined) return null;
  const d = distBaliza(Number(x)), ym = metrosY(Number(y));
  if (d > M.area || ym < M.areaY0 || ym > M.areaY1) return 13;
  const r = d < 5.5 ? 0 : d < 11 ? 1 : 2;
  const c = COLS_FIN.findIndex(([a, b]) => ym < b); return r * 4 + (c < 0 ? 3 : c) + 1;
}
// Ponto dentro de uma zona antiga (para importar a folha): aleatório mas sempre igual para a mesma semente.
function pontoNaZona(tipo, zona, semente) {
  let s = 0; for (const ch of String(semente)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const entre = ([a, b]) => { const m = (b - a) * 0.15; return a + m + rnd() * (b - a - 2 * m); };
  let d, ym; zona = Number(zona);
  if (tipo === 'passe') {
    if (zona === 13) { d = entre([55, 75]); ym = entre([10, 58]); }
    else { d = entre(FAIXAS_PASSE[Math.ceil(zona / 3) - 1]); ym = entre(CORR_PASSE[(zona - 1) % 3]); }
  } else {
    if (zona === 13) { d = entre([17, 30]); ym = entre([16, 52]); }
    else { d = entre(FAIXAS_FIN[Math.ceil(zona / 4) - 1]); ym = entre(COLS_FIN[(zona - 1) % 4]); }
  }
  return { x: Math.round((100 - d / M.comp * 100) * 10) / 10, y: Math.round(ym / M.larg * 1000) / 10 };
}

// ---- Jogos que se podem codificar ----
// Jogos do campeonato (partidas) e jogos do SCUT que não pertencem ao campeonato (taças, Europa).
function nomeNosso() { return App.cfg.nome_clube || 'Nós'; }
function alvosCodificacao() {
  const ligados = new Set(App.d.partidas.map(p => p.jogo_id).filter(Boolean));
  const alvos = App.d.partidas.map(p => {
    const jogo = p.jogo_id ? App.idx.jogo[p.jogo_id] : null;
    // O ficheiro da liga pode ter sido importado antes do jogo: nesse caso o resultado vem do jogo ligado (Dados › Jogos).
    let golosCasa = p.golos_casa, golosFora = p.golos_fora;
    if (!(Number.isFinite(golosCasa) && Number.isFinite(golosFora)) && jogo && Number.isFinite(jogo.golos_marcados) && Number.isFinite(jogo.golos_sofridos)) {
      const nosFora = eNossaEquipa(p.fora) || (!eNossaEquipa(p.casa) && jogo.local === 'fora');
      [golosCasa, golosFora] = nosFora ? [jogo.golos_sofridos, jogo.golos_marcados] : [jogo.golos_marcados, jogo.golos_sofridos];
    }
    return { key: `p:${p.id}`, partida: p, jogo, casa: p.casa, fora: p.fora, competicao: p.competicao, jornada: p.jornada, data: jogo?.data || null, golosCasa, golosFora };
  });
  for (const j of App.d.jogos) {
    if (ligados.has(j.id)) continue;
    const fora = j.local === 'fora';
    alvos.push({ key: `j:${j.id}`, partida: null, jogo: j, casa: fora ? j.adversario : nomeNosso(), fora: fora ? nomeNosso() : j.adversario,
      competicao: j.competicao, jornada: j.jornada, data: j.data, golosCasa: fora ? j.golos_sofridos : j.golos_marcados, golosFora: fora ? j.golos_marcados : j.golos_sofridos, scut: true });
  }
  for (const a of alvos) a.ladoNosso = eNossaEquipa(a.casa) ? 'casa' : eNossaEquipa(a.fora) ? 'fora' : (a.jogo ? (a.jogo.local === 'fora' ? 'fora' : 'casa') : null);
  return alvos;
}
function indexarAlvos() {
  const alvos = alvosCodificacao();
  const porKey = {}, porPartida = {}, porJogo = {};
  for (const a of alvos) { porKey[a.key] = a; if (a.partida) porPartida[a.partida.id] = a; if (a.jogo) porJogo[a.jogo.id] = a; }
  // Oportunidades e esquemas táticos (cantos e livres) em índices separados.
  const eventosPorKey = {}, esquemasPorKey = {};
  for (const e of App.d.eventos) {
    const a = (e.partida_id && porPartida[e.partida_id]) || (e.jogo_id && porJogo[e.jogo_id]); if (!a) continue;
    ((e.ep_tipo ? esquemasPorKey : eventosPorKey)[a.key] ||= []).push(e);
  }
  App.idx.alvos = alvos; App.idx.alvo = porKey; App.idx.alvoPartida = porPartida; App.idx.alvoJogo = porJogo; App.idx.eventosAlvo = eventosPorKey; App.idx.esquemasAlvo = esquemasPorKey;
}
const alvoDoEvento = e => (e.partida_id && App.idx.alvoPartida?.[e.partida_id]) || (e.jogo_id && App.idx.alvoJogo?.[e.jogo_id]) || null;
// 'casa' ou 'fora': de que equipa é a oportunidade, dentro do seu jogo.
function ladoNoAlvo(e, a) {
  if (!a) return null;
  if (e.equipa) return mesmaEquipa(e.equipa, a.casa) || norm(e.equipa) === norm(a.casa) ? 'casa' : 'fora';
  if (e.lado && a.ladoNosso) return e.lado === 'nos' ? a.ladoNosso : (a.ladoNosso === 'casa' ? 'fora' : 'casa');
  return null;
}
function equipaDoEvento(e) { const a = alvoDoEvento(e); const l = ladoNoAlvo(e, a); return l ? a[l] : (e.equipa || null); }
function rotuloAlvo(a, curto = false) {
  const res = Number.isFinite(a.golosCasa) && Number.isFinite(a.golosFora) ? ` ${a.golosCasa}–${a.golosFora} ` : ' – ';
  const quando = a.jornada != null ? `J${a.jornada}` : a.data ? fmtData(a.data, true) : '';
  return curto ? `${a.casa}${res}${a.fora}` : `${quando ? quando + ' · ' : ''}${a.casa}${res}${a.fora}`;
}
// Equipa (normalizada) usada nas listas e filtros: o nome como aparece no ficheiro da liga.
function chaveEquipaCanonica(nome) {
  const lista = [...new Set(App.d.partidas.flatMap(p => [p.casa, p.fora]))];
  return lista.find(x => mesmaEquipa(x, nome)) || nome;
}
