// ---------- Métricas por posição, agrupadas em Ataque, Defesa e Posse ----------
// k: nomes possíveis da métrica (exportação em português ou em inglês).
// d: denominador, para percentagens calculadas a partir dos totais (ex.: passes certos ÷ passes).
// menos: valores mais baixos são melhores (o ranking inverte).
const METRICAS = {
  golos: { r: 'Golos', k: ['Golos', 'Goals'] },
  xg: { r: 'xG', k: ['xG'] },
  remates: { r: 'Remates', k: ['Remates', 'Shots'] },
  remates_pct: { r: 'Remates à baliza (%)', k: ['Remates/à baliza', 'Shots / on target'], d: ['Remates', 'Shots'] },
  assist: { r: 'Assistências', k: ['Assistências', 'Assists'] },
  xa: { r: 'xA', k: ['xA'] },
  assist_remate: { r: 'Assistências para remate', k: ['Assistências para remate', 'Shot assists'] },
  toques_area: { r: 'Toques na área', k: ['Toques na área', 'Touches in penalty area'] },
  dribles: { r: 'Dribles', k: ['Dribbles', 'Dribles'] },
  dribles_pct: { r: 'Dribles com sucesso (%)', k: ['Dribbles/com sucesso', 'Dribbles / successful'], d: ['Dribbles', 'Dribles'] },
  duel_of_pct: { r: 'Duelos ofensivos ganhos (%)', k: ['Duelos ofensivos/ganhos', 'Offensive duels / won'], d: ['Duelos ofensivos', 'Offensive duels'] },
  cruz: { r: 'Cruzamentos', k: ['Cruzamentos', 'Crosses'] },
  cruz_pct: { r: 'Cruzamentos certos (%)', k: ['Cruzamentos/certos', 'Crosses / accurate'], d: ['Cruzamentos', 'Crosses'] },
  corridas: { r: 'Corridas com bola', k: ['Corridas seguidas', 'Progressive runs'] },
  faltas_sofridas: { r: 'Faltas sofridas', k: ['Faltas sofridas', 'Fouls suffered'] },
  foras: { r: 'Foras de jogo', k: ['Foras de jogo', 'Offsides'], menos: true },
  duel_def: { r: 'Duelos defensivos', k: ['Duelos defensivos', 'Defensive duels'] },
  duel_def_pct: { r: 'Duelos defensivos ganhos (%)', k: ['Duelos defensivos/ganhos', 'Defensive duels / won'], d: ['Duelos defensivos', 'Defensive duels'] },
  bola_livre_pct: { r: 'Duelos de bola livre ganhos (%)', k: ['Duelos de bola livre / won', 'Duelos de bola livre/ganhos', 'Loose ball duels / won'], d: ['Duelos de bola livre', 'Loose ball duels'] },
  duel_aereo: { r: 'Duelos aéreos', k: ['Duelos aéreos', 'Aerial duels'] },
  duel_aereo_pct: { r: 'Duelos aéreos ganhos (%)', k: ['Duelos aéreos/ganhos', 'Aerial duels / won'], d: ['Duelos aéreos', 'Aerial duels'] },
  duel_pct: { r: 'Duelos ganhos (%)', k: ['Duelos/ganhos', 'Duels / won'], d: ['Duelos', 'Duels'] },
  intercep: { r: 'Intercepções', k: ['Intercepções', 'Interceptions'] },
  recup: { r: 'Recuperações', k: ['Recuperações', 'Recoveries'] },
  recup_alta: { r: 'Recuperações no meio-campo adversário', k: ['Recuperações/no meio-campo do adversário', 'Recoveries / opp. half'] },
  carrinhos: { r: 'Carrinhos', k: ['Carrinhos', 'Sliding tackles'] },
  alivios: { r: 'Alívios', k: ['Alívios', 'Clearances'] },
  faltas: { r: 'Faltas cometidas', k: ['Faltas', 'Fouls'], menos: true },
  passes: { r: 'Passes', k: ['Passes'] },
  passes_pct: { r: 'Passes certos (%)', k: ['Passes/certos', 'Passes / accurate'], d: ['Passes'] },
  frente: { r: 'Passes para a frente', k: ['Passes para a frente', 'Forward passes'] },
  frente_pct: { r: 'Passes para a frente certos (%)', k: ['Passes para a frente/certos', 'Forward passes / accurate'], d: ['Passes para a frente', 'Forward passes'] },
  longos: { r: 'Passes longos', k: ['Passes longos', 'Long passes'] },
  longos_pct: { r: 'Passes longos certos (%)', k: ['Passes longos/certos', 'Long passes / accurate'], d: ['Passes longos', 'Long passes'] },
  terco: { r: 'Passes para o terço final', k: ['Passes para terço final', 'Passes to final third'] },
  terco_pct: { r: 'Passes para o terço final certos (%)', k: ['Passes para terço final/certos', 'Passes to final third / accurate'], d: ['Passes para terço final', 'Passes to final third'] },
  profundidade: { r: 'Passes em profundidade', k: ['Passes em profundidade', 'Through passes'] },
  grande_area: { r: 'Passes para a grande área', k: ['Passes para a grande área', 'Passes to penalty area'] },
  recebidos: { r: 'Passes recebidos', k: ['Passes recebidos', 'Received passes'] },
  perdas: { r: 'Perdas de bola', k: ['Perdas', 'Losses'], menos: true },
  perdas_baixas: { r: 'Perdas no seu meio-campo', k: ['Perdas/no seu meio-campo', 'Losses / own half'], menos: true },
  // Guarda-redes (exportação própria do Wyscout para guarda-redes)
  gr_sofridos: { r: 'Golos sofridos', k: ['Golos sofridos', 'Conceded goals'], menos: true },
  gr_xg: { r: 'xG contra (xCG)', k: ['xCG', 'xG contra', 'xG against'] },
  // Golos evitados = xG contra − golos sofridos (positivo: sofreu menos do que o esperado).
  gr_evitados: { r: 'Golos evitados', sub: [['xCG', 'xG contra', 'xG against'], ['Golos sofridos', 'Conceded goals']] },
  gr_remates: { r: 'Remates sofridos', k: ['Remates sofridos', 'Remates contra', 'Shots against'] },
  gr_defesas: { r: 'Defesas', k: ['Defesas', 'Saves'] },
  gr_defesas_pct: { r: 'Defesas (%)', k: ['Defesas', 'Saves'], d: ['Remates sofridos', 'Remates contra', 'Shots against'] },
  gr_reflexos: { r: 'Defesas com reflexos', k: ['Defesas/com reflexos', 'Saves / with reflexes'] },
  gr_saidas: { r: 'Saídas', k: ['Saídas', 'Exits'] },
  gr_curtos: { r: 'Passes curtos', k: ['Short passes', 'Passes curtos'] },
  gr_curtos_pct: { r: 'Passes curtos certos (%)', k: ['Short passes / accurate', 'Passes curtos/certos'], d: ['Short passes', 'Passes curtos'] },
  gr_pontapes: { r: 'Pontapés de baliza', k: ['Pontapés de baliza', 'Goal kicks'] },
  gr_pontapes_longos: { r: 'Pontapés de baliza longos (%)', k: ['Pontapés de baliza longos', 'Long goal kicks'], d: ['Pontapés de baliza', 'Goal kicks'], estilo: true }
};

const PERFIS = {
  gr: { nome: 'Guarda-redes', Ataque: [], Defesa: ['gr_sofridos', 'gr_xg', 'gr_evitados', 'gr_remates', 'gr_defesas', 'gr_defesas_pct', 'gr_reflexos', 'gr_saidas'], Posse: ['gr_curtos', 'gr_curtos_pct', 'longos', 'longos_pct', 'gr_pontapes', 'gr_pontapes_longos'] },
  central: { nome: 'Defesa central', Ataque: ['golos', 'xg', 'remates'], Defesa: ['duel_def', 'duel_def_pct', 'duel_aereo', 'duel_aereo_pct', 'bola_livre_pct', 'intercep', 'recup', 'alivios', 'carrinhos', 'faltas'], Posse: ['passes', 'passes_pct', 'frente', 'frente_pct', 'longos', 'longos_pct', 'terco', 'perdas_baixas'] },
  lateral: { nome: 'Lateral', Ataque: ['assist', 'xa', 'assist_remate', 'cruz', 'cruz_pct', 'toques_area', 'dribles', 'corridas'], Defesa: ['duel_def', 'duel_def_pct', 'duel_aereo_pct', 'intercep', 'recup', 'recup_alta', 'faltas'], Posse: ['passes', 'passes_pct', 'terco', 'grande_area', 'recebidos', 'perdas'] },
  medio: { nome: 'Médio defensivo / centro', Ataque: ['golos', 'xg', 'remates', 'assist', 'xa', 'assist_remate'], Defesa: ['duel_def', 'duel_def_pct', 'duel_aereo_pct', 'bola_livre_pct', 'intercep', 'recup', 'recup_alta', 'faltas'], Posse: ['passes', 'passes_pct', 'frente', 'frente_pct', 'terco', 'terco_pct', 'profundidade', 'longos_pct', 'recebidos', 'perdas_baixas'] },
  ofensivo: { nome: 'Médio ofensivo / extremo', Ataque: ['golos', 'xg', 'remates', 'remates_pct', 'assist', 'xa', 'assist_remate', 'toques_area', 'dribles', 'dribles_pct', 'duel_of_pct', 'corridas'], Defesa: ['recup', 'recup_alta', 'duel_def', 'duel_def_pct'], Posse: ['passes', 'passes_pct', 'terco', 'grande_area', 'profundidade', 'recebidos', 'perdas'] },
  pl: { nome: 'Ponta de lança', Ataque: ['golos', 'xg', 'remates', 'remates_pct', 'toques_area', 'assist', 'xa', 'duel_of_pct', 'duel_aereo', 'duel_aereo_pct', 'faltas_sofridas', 'foras'], Defesa: ['recup_alta', 'duel_def', 'duel_pct'], Posse: ['recebidos', 'passes', 'passes_pct', 'grande_area', 'perdas'] }
};
const BLOCOS = ['Ataque', 'Defesa', 'Posse'];
// Bloco mais característico de cada posição (métrica inicial da evolução).
// Métrica inicial da evolução quando não é a primeira do bloco principal.
const METRICA_PRINCIPAL = { gr: 'gr_defesas_pct' };
const BLOCO_PRINCIPAL = { gr: 'Defesa', central: 'Defesa', lateral: 'Ataque', medio: 'Posse', ofensivo: 'Ataque', pl: 'Ataque' };

// Perfil a partir da posição do plantel ("Defesa central") ou da posição do Wyscout ("LCB, RCB").
function perfilDaPosicao(pos) {
  const longo = { 'guarda-redes': 'gr', 'defesa central': 'central', 'lateral direito': 'lateral', 'lateral esquerdo': 'lateral', 'médio defensivo': 'medio', 'médio centro': 'medio',
    'médio ofensivo': 'ofensivo', 'extremo direito': 'ofensivo', 'extremo esquerdo': 'ofensivo', 'ponta de lança': 'pl' }[String(pos || '').toLowerCase().trim()];
  if (longo) return longo;
  const p = String(pos || '').toUpperCase().split(/[,/]/)[0].replace(/[^A-Z]/g, '');
  if (!p) return null;
  if (/^(GK|GR)$/.test(p)) return 'gr';
  if (/^(CB|LCB|RCB|DC)$/.test(p)) return 'central';
  if (/^(RB|LB|RWB|LWB|DD|DE|LD|LE)$/.test(p)) return 'lateral';
  if (/^(DMF|LDMF|RDMF|CMF|LCMF|RCMF|MDC|MC|CM|DM)$/.test(p)) return 'medio';
  if (/^(AMF|LAMF|RAMF|RW|LW|RWF|LWF|MO|ED|EE|AM|RM|LM)$/.test(p)) return 'ofensivo';
  if (/^(CF|ST|SS|PL|FW)$/.test(p)) return 'pl';
  return null;
}
function perfilDoJogador(chave, p) {
  return perfilDaPosicao(jogadorDoPlantel(chave)?.posicao) || perfilDaPosicao(p?.posicao) || null;
}

function chaveExistente(obj, nomes) { for (const n of nomes) if (Number.isFinite(obj?.[n])) return n; return null; }
// Valor agregado de um jogador: por 90 minutos, ou percentagem calculada pelos totais.
function valorMetrica(p, id) {
  const def = METRICAS[id];
  if (def.sub) { const a = chaveExistente(p.tot, def.sub[0]), b = chaveExistente(p.tot, def.sub[1]); return a && b && p.minutos > 0 ? (p.tot[a] - p.tot[b]) / p.minutos * 90 : null; }
  const k = chaveExistente(p.tot, def.k); if (!k) return null;
  if (def.d) { const kd = chaveExistente(p.tot, def.d); return kd && p.tot[kd] > 0 ? p.tot[k] / p.tot[kd] * 100 : null; }
  return p.minutos > 0 ? p.tot[k] / p.minutos * 90 : null;
}
// Valor num só jogo: o total do jogo, ou a percentagem desse jogo.
function valorMetricaJogo(m, id) {
  const def = METRICAS[id];
  if (def.sub) { const a = chaveExistente(m, def.sub[0]), b = chaveExistente(m, def.sub[1]); return a && b ? m[a] - m[b] : null; }
  const k = chaveExistente(m, def.k); if (!k) return null;
  if (def.d) { const kd = chaveExistente(m, def.d); return kd && m[kd] > 0 ? m[k] / m[kd] * 100 : null; }
  return m[k];
}
const ePct = id => !!METRICAS[id]?.d;
