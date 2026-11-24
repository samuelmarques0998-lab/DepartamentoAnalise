// ---------- Leitura das exportações Wyscout ----------
// As exportações do Wyscout têm cabeçalhos como "Shots / on target" que ocupam
// várias colunas (total, sucesso, %). As colunas vazias a seguir são nomeadas:
//   "Shots", "Shots / on target", "Shots / on target %"

const PAPEIS = {
  data: { rotulo: 'Data', re: /^(date|data|fecha)$/i },
  jogo: { rotulo: 'Jogo', re: /^(match|jogo|partida|game)$/i },
  competicao: { rotulo: 'Competição', re: /^(competition|competi[cç][aã]o|liga|torneio)$/i },
  equipa: { rotulo: 'Equipa', re: /^(team|equipa|equipo|clube)$/i },
  golos: { rotulo: 'Golos', re: /^(goals|golos|goles)$/i },
  esquema: { rotulo: 'Sistema tático', re: /^(scheme|esquema|sistema|formation)$/i },
  jogador: { rotulo: 'Jogador', re: /^(player|jogador|jugador|name|nome)$/i },
  posicao: { rotulo: 'Posição', re: /^(position|posi[cç][aã]o|pos\.?)$/i },
  minutos: { rotulo: 'Minutos', re: /^(minutes played|minutes|minutos( jogados)?|min\.?):?$/i }
};
const PAPEIS_EQUIPA = ['data', 'jogo', 'competicao', 'equipa', 'golos', 'esquema'];
const PAPEIS_JOGADOR = ['jogador', 'equipa', 'posicao', 'minutos', 'data', 'jogo', 'competicao'];

// A biblioteca do Excel (~1 MB) só é descarregada quando é precisa (importações), não ao abrir a app.
async function lerFolha(buffer) {
  if (!window.XLSX) await carregarScript(['XLSX', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js']);
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
    .filter(r => r.some(c => String(c).trim() !== ''));
}

function detetarCabecalho(linhas) {
  const reTodos = Object.values(PAPEIS).map(p => p.re);
  for (let i = 0; i < Math.min(15, linhas.length); i++) {
    const textos = linhas[i].filter(c => typeof c === 'string' && c.trim() && parseNum(c) === null);
    if (textos.length >= 3 && textos.some(t => reTodos.some(re => re.test(t.trim())))) return i;
  }
  return 0;
}

function nomesColunas(cabecalho, largura) {
  const nomes = []; const brutos = [];
  for (let i = 0; i < largura; i++) brutos.push(String(cabecalho[i] ?? '').replace(/\s+/g, ' ').trim());
  let i = 0;
  while (i < largura) {
    const base = brutos[i];
    if (!base) { nomes.push(`Coluna ${i + 1}`); i++; continue; }
    let n = 0; while (i + 1 + n < largura && !brutos[i + 1 + n]) n++;
    const partes = base.split(/\s*\/\s*/);
    if (n === 0) nomes.push(base);
    else if (partes.length > 1) {
      nomes.push(partes[0], base);
      for (let k = 2; k <= n; k++) nomes.push(k === 2 ? `${base} %` : `${base} (${k})`);
    } else {
      nomes.push(base);
      for (let k = 1; k <= n; k++) nomes.push(`${base} (${k + 1})`);
    }
    i += n + 1;
  }
  // Nomes repetidos ficam com sufixo.
  const vistos = {};
  return nomes.map(nm => { vistos[nm] = (vistos[nm] || 0) + 1; return vistos[nm] > 1 ? `${nm} (${vistos[nm]})` : nm; });
}

// Nomes das métricas do Team stats no formato antigo da importação ("Remates / à baliza", "Posse, %", "Perdas / curto/ médio / longo (3)"…)
// -> o mesmo nome do ficheiro da liga / Team stats ("Remates à baliza", "Posse", "Perdas longo"…), para tudo se comparar.
const CANON_FIXOS = { 'posse, %': 'Posse', 'interseções,': 'Interseções', 'comprimento médio de passes': 'Comprimento médio de passe' };
function canonMetrica(k) {
  const t = String(k).replace(/\s+/g, ' ').trim(); const lo = t.toLowerCase();
  if (CANON_FIXOS[lo]) return CANON_FIXOS[lo];
  // Grupos de 4 colunas: total, curto, médio, longo.
  let m = t.match(/^(Perdas|Recuperações) \/ curto\s*\/\s*médio \/ longo( %| \(3\))?$/i);
  if (m) return `${m[1]} ${!m[2] ? 'curto' : m[2].trim() === '%' ? 'médio' : 'longo'}`;
  // Entradas na grande área (corridas/cruzamentos): total, corridas, cruzamentos.
  m = t.match(/^Entradas na grande área \(corridas(\/cruzamentos\))?( %)?$/i);
  if (m) return !m[1] ? 'Entradas na grande área' : m[2] ? 'Entradas na grande área cruzamentos' : 'Entradas na grande área corridas';
  // "A / B %" -> "% A B"; "A / B" -> "A B"
  m = t.match(/^(.+?)\s*\/\s*(.+?)( %)?$/);
  if (m && !/\//.test(m[2])) return m[3] ? `% ${m[1]} ${m[2]}` : `${m[1]} ${m[2]}`;
  return t;
}
// Aplica aos registos já guardados; usa a grafia que já existe noutros dados (liga / Team stats) quando só muda maiúsculas.
function canonMetricas(met, grafias) {
  if (!met) return met;
  let mudou = false; const out = {};
  for (const [k, v] of Object.entries(met)) {
    if (k.startsWith('_')) { out[k] = v; continue; }
    let c = canonMetrica(k); c = grafias?.get(c.toLowerCase()) || c;
    if (c !== k) mudou = true;
    if (!(c in out) || c === k) out[c] = v;
  }
  return mudou ? out : met;
}

// Prepara a tabela: nomes de colunas, linhas de dados, papéis detetados e colunas numéricas.
function prepararTabela(linhas, papeisPossiveis) {
  const ih = detetarCabecalho(linhas);
  const largura = Math.max(...linhas.map(r => r.length));
  const colunas = nomesColunas(linhas[ih] || [], largura);
  const dadosLinhas = linhas.slice(ih + 1);
  const papeis = {};
  for (const p of papeisPossiveis) {
    const idx = colunas.findIndex((c, i) => PAPEIS[p].re.test(c) && !Object.values(papeis).includes(i));
    papeis[p] = idx >= 0 ? idx : null;
  }
  const numericas = colunas.map((_, ci) => {
    const vals = dadosLinhas.map(r => r[ci]).filter(v => v !== '' && v !== null && v !== undefined);
    if (!vals.length) return false;
    return vals.filter(v => !(v instanceof Date) && parseNum(v) !== null).length / vals.length >= 0.6;
  });
  return { colunas, linhas: dadosLinhas, papeis, numericas };
}

function colunasMetricas(tab) {
  const usadas = new Set(Object.values(tab.papeis).filter(v => v !== null));
  const ignorar = /^(duration|dura[cç][aã]o|age|idade|height|altura|weight|peso|market value|valor de mercado|contract expires|n\.?º|number|#)$/i;
  return tab.colunas.map((c, i) => i).filter(i => tab.numericas[i] && !usadas.has(i) && !ignorar.test(tab.colunas[i]));
}

function lerMetricas(tab, linha) {
  const m = {};
  for (const i of colunasMetricas(tab)) {
    const n = parseNum(linha[i]);
    if (n !== null) m[canonMetrica(tab.colunas[i])] = n;
  }
  if (tab.papeis.golos !== null && tab.papeis.golos !== undefined) {
    const g = parseNum(linha[tab.papeis.golos]); if (g !== null) m['Goals'] = g;
  }
  if (tab.papeis.esquema !== null && tab.papeis.esquema !== undefined && linha[tab.papeis.esquema]) m._esquema = String(linha[tab.papeis.esquema]);
  return m;
}

// "Casa - Fora 2:1" -> { casa, fora, gc, gf }
function lerTextoJogo(txt) {
  const s = String(txt ?? '').trim();
  let m = s.match(/^(.+?)\s+[-–]\s+(.+?)\s+(\d+)\s*[:\-–]\s*(\d+)\s*(\(.*\))?$/);
  if (m) return { casa: m[1].trim(), fora: m[2].trim(), gc: Number(m[3]), gf: Number(m[4]) };
  m = s.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (m) return { casa: m[1].trim(), fora: m[2].trim(), gc: null, gf: null };
  return null;
}

function criarIdentificador(cfg, mapeamentos) {
  const proprios = [cfg.nome_clube, ...(cfg.nomes_alternativos || [])].map(norm).filter(Boolean);
  const mapa = {};
  for (const m of mapeamentos) mapa[`${m.tipo}|${norm(m.original)}`] = m.normalizado;
  return {
    // "Torreense U23" / "Torreense Sub-23" também é a vossa equipa (os dados já vêm separados por escalão).
    eNos: nome => { const n = norm(mapa[`equipa|${norm(nome)}`] || nome).replace(/\s+(u\s?23|sub\s?23|u\s?21|sub\s?21|b)$/, ''); return !!n && proprios.some(p => n === p); },
    equipa: nome => mapa[`equipa|${norm(nome)}`] || String(nome ?? '').trim(),
    jogador: nome => mapa[`jogador|${norm(nome)}`] || String(nome ?? '').trim(),
    temClube: proprios.length > 0
  };
}

// ---- Estatísticas de equipa: uma linha por equipa e por jogo ----
function analisarEquipa(tab, cfg, mapeamentos, jogosExistentes) {
  const id = criarIdentificador(cfg, mapeamentos);
  const P = tab.papeis; const avisos = [];
  if (!id.temClube) avisos.push('Defina o nome do clube em Definições para identificar as linhas da vossa equipa.');
  if (P.data === null) avisos.push('Não encontrei a coluna da data. Escolha-a acima.');
  if (P.equipa === null && P.jogo === null) avisos.push('Escolha a coluna da equipa ou do jogo.');
  if (avisos.length) return { jogos: [], avisos, ignoradas: 0 };

  const grupos = new Map(); let ignoradas = 0;
  for (const linha of tab.linhas) {
    const data = parseData(linha[P.data]);
    if (!data) { ignoradas++; continue; }
    const txt = P.jogo !== null ? String(linha[P.jogo] ?? '').trim() : '';
    const chave = `${data}|${txt}`;
    if (!grupos.has(chave)) grupos.set(chave, { data, txt, competicao: P.competicao !== null ? String(linha[P.competicao] ?? '').trim() : '', linhas: [] });
    grupos.get(chave).linhas.push(linha);
  }

  const existentes = new Set(jogosExistentes.map(j => `${j.data}|${norm(j.adversario)}`));
  const porChave = new Map();
  for (const g of grupos.values()) {
    const tj = lerTextoJogo(g.txt);
    let linhaNos = null, linhaAdv = null;
    for (const l of g.linhas) {
      const eq = P.equipa !== null ? l[P.equipa] : null;
      if (eq && id.eNos(eq)) linhaNos = linhaNos || l; else linhaAdv = linhaAdv || l;
    }
    if (P.equipa === null) { linhaNos = g.linhas[0]; linhaAdv = g.linhas[1] || null; }
    let local = null, gm = null, gs = null, adversario = null;
    if (tj) {
      if (id.eNos(tj.casa)) { local = 'casa'; adversario = id.equipa(tj.fora); gm = tj.gc; gs = tj.gf; }
      else if (id.eNos(tj.fora)) { local = 'fora'; adversario = id.equipa(tj.casa); gm = tj.gf; gs = tj.gc; }
    }
    if (!linhaNos && P.equipa !== null) {
      avisos.push(`${fmtData(g.data)} — ${g.txt || 'jogo sem descrição'}: a vossa equipa não aparece. Confirme o nome do clube em Definições.`);
      continue;
    }
    if (!adversario && linhaAdv && P.equipa !== null) adversario = id.equipa(linhaAdv[P.equipa]);
    if (!adversario) { avisos.push(`${fmtData(g.data)}: não consegui identificar o adversário.`); continue; }
    const mN = lerMetricas(tab, linhaNos);
    const mA = linhaAdv ? lerMetricas(tab, linhaAdv) : null;
    if (gm === null && Number.isFinite(mN['Goals'])) gm = mN['Goals'];
    if (gs === null && mA && Number.isFinite(mA['Goals'])) gs = mA['Goals'];
    const j = {
      data: g.data, adversario, competicao: g.competicao || null, local, golos_marcados: gm, golos_sofridos: gs,
      equipaNos: P.equipa !== null ? String(linhaNos[P.equipa]) : cfg.nome_clube,
      equipaAdv: linhaAdv && P.equipa !== null ? String(linhaAdv[P.equipa]) : adversario,
      metricasNos: mN, metricasAdv: mA,
      existe: existentes.has(`${g.data}|${norm(adversario)}`)
    };
    porChave.set(`${j.data}|${norm(j.adversario)}`, j); // ficheiros com o mesmo jogo repetido: fica o último
  }
  const jogos = [...porChave.values()].sort((a, b) => a.data.localeCompare(b.data));
  return { jogos, avisos, ignoradas, nMetricas: colunasMetricas(tab).length };
}

// ---- Estatísticas de jogadores ----
// opcoes: { jogoId, ladoPadrao }  (jogoId é usado quando o ficheiro não tem data)
// Compara nomes de equipas escritos de formas diferentes ("Benfica II" / "Benfica B", "UD Leiria" / "União Leiria").
function chaveEquipa(nome) {
  return norm(nome).replace(/\b(fc|sc|cd|ud|ad|gd|cf|sl|cp|sad|futebol|clube|club|sport|uniao|de|da|do|dos|das)\b/g, ' ')
    .replace(/\b(ii|sub 23|u23)\b/g, 'b').replace(/\s+/g, ' ').trim();
}
function mesmaEquipa(a, b) {
  const x = chaveEquipa(a), y = chaveEquipa(b);
  if (!x || !y) return false;
  const px = x.split(' '), py = y.split(' ');
  // Uma equipa B nunca é a equipa principal ("Benfica B" ≠ "Benfica").
  if (px.includes('b') !== py.includes('b')) return false;
  if (x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ')) return true;
  if (px.includes('b') && px[0] === py[0] && px[0].length > 3) return true; // "Sporting B" / "Sporting CP B"
  return px[0] === py[0] && px[0].length > 3 && (px.length === 1 || py.length === 1) && !px.includes('b') && !py.includes('b');
}
// Início da época (1 de julho) de uma data 'YYYY-MM-DD'.
function inicioEpoca(d) { const [y, m] = d.split('-').map(Number); return `${m >= 7 ? y : y - 1}-07-01`; }

// opcoes: { jogoId, ladoPadrao, jogador (quando o ficheiro é de um só jogador), criarJogos }
function analisarJogadores(tab, cfg, mapeamentos, jogos, opcoes) {
  const id = criarIdentificador(cfg, mapeamentos);
  const P = tab.papeis; const avisos = [];
  const tem = k => P[k] !== null && P[k] !== undefined;
  const umJogador = !tem('jogador');
  if (umJogador && !opcoes.jogador) return { linhas: [], avisos: ['Indique de que jogador é este ficheiro.'], ignoradas: 0, umJogador };
  const nossos = [cfg.nome_clube, ...(cfg.nomes_alternativos || [])].filter(Boolean);
  const eNos = nome => id.eNos(nome) || nossos.some(n => mesmaEquipa(n, nome));

  // Ficheiros com a coluna do jogo ("Casa - Fora 1:0"): só contam os jogos da vossa equipa, na época mais recente.
  const datas = tem('data') ? tab.linhas.map(l => parseData(l[P.data])).filter(Boolean) : [];
  let epoca = null;
  if (tem('jogo') && datas.length) {
    const dosNossos = tab.linhas.filter(l => { const t = lerTextoJogo(l[P.jogo]); return t && (eNos(t.casa) || eNos(t.fora)); }).map(l => parseData(l[P.data])).filter(Boolean).sort();
    if (dosNossos.length) epoca = inicioEpoca(dosNossos[dosNossos.length - 1]);
  }

  const porData = {}; for (const j of jogos) if (j.data) (porData[j.data] ||= []).push(j);
  const usados = new Set(); const novos = new Map();
  const resultado = new Map(); let ignoradas = 0, outrosClubes = 0, epocasAnteriores = 0; const datasSemJogo = new Set();
  for (const linha of tab.linhas) {
    const bruto = umJogador ? opcoes.jogador : String(linha[P.jogador] ?? '').trim();
    if (!bruto || /^(total|totais|m[eé]dia|average|sum)\b/i.test(bruto)) { ignoradas++; continue; }
    const d = tem('data') ? parseData(linha[P.data]) : null;
    let jogo = null, novoJogo = null, atualizaData = false, resultadoNovo = null;
    if (tem('jogo')) {
      const t = lerTextoJogo(linha[P.jogo]);
      if (!t) { ignoradas++; continue; }
      const casa = eNos(t.casa), fora = eNos(t.fora);
      if (!casa && !fora) { outrosClubes++; continue; }
      if (epoca && d && d < epoca) { epocasAnteriores++; continue; }
      const adv = casa ? t.fora : t.casa, local = casa ? 'casa' : 'fora';
      const gm = casa ? t.gc : t.gf, gs = casa ? t.gf : t.gc;
      // 1) mesma data e adversário; 2) jogo sem data com o mesmo adversário e local (de preferência com o mesmo resultado)
      jogo = (d ? (porData[d] || []) : []).find(j => mesmaEquipa(j.adversario, adv)) || null;
      if (!jogo) {
        let cand = jogos.filter(j => !j.data && !usados.has(j.id) && mesmaEquipa(j.adversario, adv) && (!j.local || j.local === local));
        const mesmoRes = cand.filter(j => j.golos_marcados === gm && j.golos_sofridos === gs);
        if (mesmoRes.length) cand = mesmoRes;
        const exato = cand.filter(j => chaveEquipa(j.adversario) === chaveEquipa(adv));
        if (exato.length === 1) cand = exato;
        if (cand.length === 1) { jogo = cand[0]; atualizaData = !!d; }
      }
      // Jogo ainda sem resultado (ex.: "por jogar" no ficheiro da liga): fica com o resultado deste ficheiro.
      if (jogo && !Number.isFinite(jogo.golos_marcados) && Number.isFinite(gm)) resultadoNovo = { golos_marcados: gm, golos_sofridos: gs };
      if (jogo) usados.add(jogo.id);
      else if (d && opcoes.criarJogos !== false) {
        const k = `${d}|${norm(adv)}`;
        if (!novos.has(k)) novos.set(k, { data: d, adversario: id.equipa(adv), competicao: tem('competicao') ? String(linha[P.competicao] ?? '').trim() || null : null, local, golos_marcados: gm, golos_sofridos: gs, novo: true });
        novoJogo = novos.get(k);
      } else { ignoradas++; continue; }
    } else if (tem('data')) {
      const cand = d ? porData[d] || [] : [];
      if (cand.length === 1) jogo = cand[0];
      else if (d) datasSemJogo.add(d);
    } else if (opcoes.jogoId) jogo = jogos.find(j => j.id === opcoes.jogoId);
    if (!jogo && !novoJogo) { ignoradas++; continue; }
    let lado = opcoes.ladoPadrao || 'nos'; let equipa = null;
    if (tem('equipa') && linha[P.equipa]) { equipa = String(linha[P.equipa]).trim(); lado = eNos(equipa) ? 'nos' : 'adversario'; }
    if (tem('jogo') && !tem('equipa')) lado = 'nos';
    const alvo = jogo || novoJogo;
    const reg = {
      jogo_id: jogo ? jogo.id : null, jogo: alvo, novoJogo, atualizaData: atualizaData ? d : null, resultadoNovo,
      jogador: umJogador ? bruto : id.jogador(bruto), lado, equipa: equipa || (lado === 'nos' ? cfg.nome_clube : alvo.adversario),
      posicao: tem('posicao') ? String(linha[P.posicao] ?? '').trim() || null : null,
      minutos: tem('minutos') ? parseNum(linha[P.minutos]) : null, metricas: lerMetricas(tab, linha)
    };
    resultado.set(`${jogo ? jogo.id : `novo|${novoJogo.data}|${novoJogo.adversario}`}|${reg.jogador}|${reg.lado}`, reg);
  }
  if (!tem('data') && !tem('jogo') && !opcoes.jogoId) avisos.push('O ficheiro não tem data: escolha o jogo a que pertence.');
  for (const d of datasSemJogo) avisos.push(`Não há um jogo único registado a ${fmtData(d)}. Importe primeiro as estatísticas de equipa ou crie o jogo em Jogos.`);
  return { linhas: [...resultado.values()], avisos, ignoradas, outrosClubes, epocasAnteriores, epoca, umJogador, nNovos: novos.size, nMetricas: colunasMetricas(tab).length };
}

// ---------- Ficheiros CSV (separador ; ou , e decimais com vírgula) ----------
// Lidos à mão: o leitor de Excel interpreta "1,27" como 127 e nem sempre deteta o ";".
function lerCsv(texto) {
  texto = texto.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/, 1)[0];
  const sep = [';', '\t', ','].map(c => [c, primeira.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = []; let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.map(l => l.map(x => x.trim())).filter(l => l.some(x => x !== ''));
}

async function lerFicheiroTabela(f) {
  if (/\.(csv|txt|tsv)$/i.test(f.name)) {
    const buf = await f.arrayBuffer();
    let texto = new TextDecoder('utf-8').decode(buf);
    if (texto.includes(String.fromCharCode(0xFFFD))) texto = new TextDecoder('windows-1252').decode(buf); // ficheiros gravados pelo Excel em Windows
    return lerCsv(texto);
  }
  return lerFolha(await f.arrayBuffer());
}

// ---------- Ficheiro da liga: uma linha por equipa e por jornada, sem datas ----------
const COLS_LIGA = {
  competicao: /^competi[cç][aã]o$|^competition$/i, jornada: /^(j|jornada|round|matchday)$/i, equipa: /^(equipa|team)$/i,
  adversario: /^(advers[aá]rio|opponent)$/i, local: /^(local|venue|casa\/fora)$/i, resultado: /^(resultados?|result|score)$/i,
  golos: /^(golos|goals)$/i, golos_sofridos: /^(golos sofridos|goals conceded|goals against)$/i
};

// Devolve a tabela preparada se o ficheiro tiver o formato da liga; senão null.
function detetarFormatoLiga(linhas) {
  const cab = (linhas[0] || []).map(c => String(c).replace(/\s+/g, ' ').trim());
  const idx = Object.fromEntries(Object.entries(COLS_LIGA).map(([k, re]) => [k, cab.findIndex(c => re.test(c))]));
  // Se houver várias colunas "J"/"Jornada", prefere a numérica.
  const candidatasJ = cab.map((c, i) => i).filter(i => COLS_LIGA.jornada.test(cab[i]));
  const numerica = candidatasJ.find(i => linhas.slice(1, 6).every(l => parseNum(l[i]) !== null || String(l[i] ?? '').trim() === ''));
  if (numerica !== undefined) idx.jornada = numerica;
  const temData = cab.some(c => PAPEIS.data.re.test(c));
  if (temData || idx.equipa < 0 || idx.adversario < 0 || idx.jornada < 0) return null;
  const papeis = new Set(Object.values(idx).filter(i => i >= 0));
  candidatasJ.forEach(i => papeis.add(i));
  const dados = linhas.slice(1);
  const metricas = cab.map((c, i) => i).filter(i => !papeis.has(i) && cab[i] &&
    dados.some(l => parseNum(l[i]) !== null) && dados.every(l => String(l[i] ?? '').trim() === '' || parseNum(l[i]) !== null));
  const equipas = [...new Set(dados.map(l => String(l[idx.equipa] ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  return { formato: 'liga', cab, idx, metricas, linhas: dados, equipas };
}

// equipaNossa: nome da equipa no ficheiro (escolhido pelo utilizador ou detetado pelas Definições).
function analisarLiga(tab, cfg, mapeamentos, jogosExistentes, equipaNossa) {
  const id = criarIdentificador(cfg, mapeamentos);
  const I = tab.idx; const avisos = [];
  const nossa = equipaNossa || tab.equipas.find(e => id.eNos(e)) || null;
  const liga = [], jogos = [], porJogar = [];
  const existentes = {};
  for (const j of jogosExistentes) existentes[`${norm(j.competicao)}|${j.jornada}|${norm(j.adversario)}`] = j;
  const val = (l, k) => (I[k] >= 0 ? l[I[k]] : null);
  const registo = l => {
    const metricas = {};
    for (const i of tab.metricas) { const n = parseNum(l[i]); if (n !== null) metricas[tab.cab[i]] = n; }
    return metricas;
  };
  // Equipa + adversário: aguenta jogos em atraso registados na mesma jornada.
  const chave = (comp, jor, eq, adv) => `${norm(comp)}|${jor}|${norm(eq)}|${norm(adv)}`;
  const porEquipa = {};
  let ignoradas = 0;
  for (const l of tab.linhas) {
    const jornada = parseNum(val(l, 'jornada')); const equipa = String(val(l, 'equipa') ?? '').trim();
    if (jornada === null || !equipa) { ignoradas++; continue; }
    const competicao = String(val(l, 'competicao') ?? '').trim() || 'Liga';
    const advFicheiro = String(val(l, 'adversario') ?? '').trim();
    const metricas = registo(l);
    const r = {
      competicao, jornada, equipa: id.equipa(equipa), equipaFicheiro: equipa, adversario: id.equipa(advFicheiro), adversarioFicheiro: advFicheiro,
      local: /^casa|^home/i.test(String(val(l, 'local') ?? '')) ? 'casa' : /^fora|^away/i.test(String(val(l, 'local') ?? '')) ? 'fora' : null,
      golos: parseNum(val(l, 'golos')), golos_sofridos: parseNum(val(l, 'golos_sofridos')), metricas,
      jogado: Object.keys(metricas).length > 0
    };
    porEquipa[chave(competicao, jornada, equipa, advFicheiro)] = r;
    if (r.jogado) liga.push(r);
  }
  // Golos sofridos: se a coluna não existir, vêm dos golos do adversário.
  for (const r of liga) if (r.golos_sofridos === null) r.golos_sofridos = porEquipa[chave(r.competicao, r.jornada, r.adversarioFicheiro, r.equipaFicheiro)]?.golos ?? null;
  if (!nossa) avisos.push('Escolha qual é a vossa equipa neste ficheiro.');
  else {
    for (const r of Object.values(porEquipa)) {
      if (norm(r.equipaFicheiro) !== norm(nossa)) continue;
      const adv = porEquipa[chave(r.competicao, r.jornada, r.adversarioFicheiro, r.equipaFicheiro)];
      const ex = existentes[`${norm(r.competicao)}|${r.jornada}|${norm(r.adversario)}`];
      const j = {
        competicao: r.competicao, jornada: r.jornada, adversario: r.adversario, local: r.local,
        golos_marcados: r.jogado ? r.golos : null, golos_sofridos: r.jogado ? r.golos_sofridos : null,
        metricasNos: r.jogado ? r.metricas : null, metricasAdv: r.jogado && adv?.jogado ? adv.metricas : null,
        equipaNos: r.equipa, equipaAdv: r.adversario, existe: !!ex, jogado: r.jogado
      };
      (r.jogado ? jogos : porJogar).push(j);
    }
    jogos.sort((a, b) => a.jornada - b.jornada); porJogar.sort((a, b) => a.jornada - b.jornada);
    if (!jogos.length && !porJogar.length) avisos.push(`A equipa "${nossa}" não tem jogos neste ficheiro.`);
  }
  // Jogos do campeonato (todas as equipas): um por par casa/fora.
  const partidas = new Map();
  for (const r of Object.values(porEquipa)) {
    const casa = r.local === 'fora' ? r.adversario : r.equipa, fora = r.local === 'fora' ? r.equipa : r.adversario;
    if (r.local === null && norm(r.equipa) > norm(r.adversario)) continue; // sem coluna "Local": um registo por par
    const k = `${norm(r.competicao)}|${norm(casa)}|${norm(fora)}`;
    const ehCasa = r.local !== 'fora';
    const atual = partidas.get(k) || { competicao: r.competicao, jornada: r.jornada, casa, fora, golos_casa: null, golos_fora: null };
    if (r.jogado) { atual.golos_casa = ehCasa ? r.golos : r.golos_sofridos; atual.golos_fora = ehCasa ? r.golos_sofridos : r.golos; }
    partidas.set(k, atual);
  }
  // Uma equipa com dois jogos na mesma jornada indica uma jornada mal escrita no ficheiro (ex.: jogo adiado).
  const porJornada = new Map();
  for (const r of Object.values(porEquipa)) { const k = `${norm(r.competicao)}|${r.jornada}|${norm(r.equipa)}`; if (!porJornada.has(k)) porJornada.set(k, { r, advs: [] }); porJornada.get(k).advs.push(r.adversario); }
  const duplas = [...porJornada.values()].filter(x => x.advs.length > 1);
  if (duplas.length) avisos.push(`Jornada repetida — confirme no ficheiro: ${duplas.slice(0, 6).map(x => `${x.r.equipa} tem ${x.advs.length} jogos na J${x.r.jornada} (${x.advs.join(', ')})`).join('; ')}${duplas.length > 6 ? '…' : ''}.`);
  return { formato: 'liga', nossa, liga, jogos, porJogar, partidas: [...partidas.values()], avisos, ignoradas, nMetricas: tab.metricas.length, equipas: tab.equipas };
}

// ---------- Folha de codificação de oportunidades (método antigo, por zonas) ----------
const COLS_FOLHA = {
  clube: /^clube$|^equipa$/i, jornada: /^jornada$|^j$/i, adversario: /^advers[aá]rio$/i, treinador: /^treinador$/i, local: /^local$/i,
  momento: /^momento$/i, sub: /^sub.?momento$/i, mecanismo: /^mecanismo$/i, lado: /^lado$/i, parte: /^parte$/i, tempo: /^tempo$/i,
  zonaPasse: /^zona do passe$/i, quemPassa: /^quem faz o passe$/i, posPassa: /^posi[cç][aã]o de quem faz o passe$/i,
  zonaFin: /^zona de finaliza[cç][aã]o$/i, quemFin: /^quem finaliza$/i, posFin: /^posi[cç][aã]o de quem finaliza$/i, golo: /^golo\??$/i
};
function detetarFolhaOportunidades(linhas) {
  for (let ih = 0; ih < Math.min(5, linhas.length); ih++) {
    const cab = linhas[ih].map(c => String(c ?? '').trim());
    const idx = Object.fromEntries(Object.entries(COLS_FOLHA).map(([k, re]) => [k, cab.findIndex(c => re.test(c))]));
    if (['clube', 'adversario', 'momento', 'zonaFin', 'golo'].every(k => idx[k] >= 0)) return { formato: 'oportunidades', idx, linhas: linhas.slice(ih + 1) };
  }
  return null;
}

function analisarFolha(tab, partidas) {
  const I = tab.idx; const v = (l, k) => (I[k] >= 0 ? String(l[I[k]] ?? '').trim() : '');
  const comps = [...new Set(partidas.map(p => p.competicao))];
  const avisos = []; const registos = []; const semJornada = [], vazias = [], localTrocado = [], novos = new Map(), nomesLigados = new Map();
  const treinadores = new Map();
  tab.linhas.forEach((l, i) => {
    if (!v(l, 'clube') && !v(l, 'adversario')) { vazias.push(i + 2); return; }
    const jornada = parseNum(v(l, 'jornada'));
    if (jornada === null) { semJornada.push(i + 2); return; }
    const clube = v(l, 'clube'), adv = v(l, 'adversario');
    // Jogo do campeonato: mesma jornada e as duas equipas; senão, as duas equipas em qualquer jornada.
    const comEquipas = partidas.filter(p => (mesmaEquipa(p.casa, clube) && mesmaEquipa(p.fora, adv)) || (mesmaEquipa(p.fora, clube) && mesmaEquipa(p.casa, adv)));
    let p = comEquipas.find(x => x.jornada === jornada) || (comEquipas.length === 1 ? comEquipas[0] : null);
    if (!p) {
      const emCasa = !/^fora/i.test(v(l, 'local'));
      const k = `${jornada}|${norm(emCasa ? clube : adv)}|${norm(emCasa ? adv : clube)}`;
      if (!novos.has(k)) novos.set(k, { novo: true, competicao: comps[0] || 'Liga', jornada, casa: emCasa ? clube : adv, fora: emCasa ? adv : clube });
      p = novos.get(k);
    }
    const lado = mesmaEquipa(p.casa, clube) ? 'casa' : 'fora';
    if (norm(p[lado]) !== norm(clube)) nomesLigados.set(clube, p[lado]);
    if ((/^casa/i.test(v(l, 'local')) && lado === 'fora') || (/^fora/i.test(v(l, 'local')) && lado === 'casa')) localTrocado.push({ linha: i + 2, jornada, clube, jogador: v(l, 'quemFin') });
    const chaveP = p.novo ? `n:${p.jornada}|${norm(p.casa)}|${norm(p.fora)}` : p.id;
    if (v(l, 'treinador')) treinadores.set(`${chaveP}|${lado}`, v(l, 'treinador'));
    const momento = normMomento(v(l, 'momento')); const sub = normSub(momento, v(l, 'sub'));
    const zf = parseNum(v(l, 'zonaFin')), zp = parseNum(v(l, 'zonaPasse'));
    const semente = `${chaveP}|${i}`;
    const fin = zf >= 1 && zf <= 13 ? pontoNaZona('fin', zf, semente + 'f') : (sub === 'Penálti' ? { x: 89.6, y: 49 } : null);
    const pas = zp >= 1 && zp <= 13 && sub !== 'Penálti' ? pontoNaZona('passe', zp, semente + 'p') : null;
    const parte = /^1/.test(v(l, 'parte')) ? '1.ª parte' : /^2/.test(v(l, 'parte')) ? '2.ª parte' : null;
    const tempo = TEMPOS.find(t => norm(t) === norm(v(l, 'tempo'))) || null;
    registos.push({
      partida: p, lado, equipa: p[lado],
      tipo: 'oportunidade', momento, sub_momento: sub, mecanismo: normMecanismo(momento, sub, v(l, 'mecanismo')),
      corredor: CORREDORES.find(c => norm(c) === norm(v(l, 'lado'))) || null, parte: parte || parteDoTempo(tempo), tempo, minuto: null,
      zona_x: fin?.x ?? null, zona_y: fin?.y ?? null, passe_x: pas?.x ?? null, passe_y: pas?.y ?? null, local_aprox: true,
      assistente: normNome(v(l, 'quemPassa')), posicao_passe: normPosicao(v(l, 'posPassa')),
      jogador: normNome(v(l, 'quemFin')), posicao_finalizador: normPosicao(v(l, 'posFin')),
      resultado: /^s/i.test(v(l, 'golo')) ? 'Golo' : 'Sem golo', qualidade: sub === 'Penálti' ? 'Grande oportunidade' : 'Oportunidade', origem: 'folha_z'
    });
  });
  if (semJornada.length) avisos.push(`${semJornada.length} linhas sem jornada ficam de fora (jogos fora do campeonato).`);
  if (vazias.length) avisos.push(`${vazias.length} linhas vazias ignoradas.`);
  for (const [a, b] of nomesLigados) avisos.push(`"${a}" foi ligado a "${b}" (nome do ficheiro da liga).`);
  if (localTrocado.length) avisos.push(`${localTrocado.length === 1 ? '1 linha tem' : `${localTrocado.length} linhas têm`} o local trocado em relação ao jogo; ficam na equipa indicada em "Clube": ${localTrocado.slice(0, 4).map(x => `linha ${x.linha} (J${x.jornada}, ${x.clube}${x.jogador ? ', ' + x.jogador : ''})`).join('; ')}.`);
  if (novos.size) avisos.push(`${novos.size} ${novos.size === 1 ? 'jogo não existe' : 'jogos não existem'} no ficheiro da liga e ${novos.size === 1 ? 'vai ser criado' : 'vão ser criados'}: ${[...novos.values()].slice(0, 4).map(p => `J${p.jornada} ${p.casa}–${p.fora}`).join(', ')}.`);
  return { formato: 'oportunidades', registos, novos: [...novos.values()], treinadores, avisos, semJornada: semJornada.length };
}
