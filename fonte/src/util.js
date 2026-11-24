// ---------- Utilitários ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Normaliza nomes para comparação: minúsculas, sem acentos nem pontuação.
function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Lê números em formatos variados: 1.25 | 1,25 | 52% | "-" | 1 234
function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s/g, '').replace('%', '');
  if (s === '' || s === '-' || s === '—') return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Devolve 'YYYY-MM-DD' ou null.
function parseData(v) {
  if (v === null || v === undefined || v === '') return null;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (v instanceof Date && !isNaN(v)) {
    // As datas do Excel chegam à meia-noite UTC; arredonda ao dia mais próximo.
    return iso(new Date(v.getTime() + 12 * 3600 * 1000));
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) { // número de série do Excel
    const d = new Date(Math.round((v - 25569) * 86400 * 1000) + 12 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtData(iso, curta = false) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return curta ? `${d}/${m}` : `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
}

// Ordena jogos pela data; quando falta a data (ficheiros por jornada), pela jornada.
function compararJogos(a, b) {
  if (a._ordem && b._ordem && a._ordem !== b._ordem) return a._ordem.localeCompare(b._ordem);
  if (a.data && b.data && a.data !== b.data) return a.data.localeCompare(b.data);
  const ja = a.jornada ?? null, jb = b.jornada ?? null;
  if (ja !== null && jb !== null && ja !== jb) return ja - jb;
  return String(a.data || '').localeCompare(String(b.data || '')) || String(a.competicao || '').localeCompare(String(b.competicao || ''));
}
// Data aproximada para ordenar jogos sem data: parte da jornada mais próxima que tem data (uma semana por jornada).
function calcularOrdemJogos(jogos) {
  const porComp = {};
  for (const j of jogos) if (j.data && j.jornada !== null && j.jornada !== undefined) (porComp[norm(j.competicao)] ||= []).push(j);
  const dia = 86400000;
  for (const j of jogos) {
    if (j.data) { j._ordem = j.data; continue; }
    const ref = (porComp[norm(j.competicao)] || []).slice().sort((a, b) => Math.abs(a.jornada - j.jornada) - Math.abs(b.jornada - j.jornada))[0];
    if (ref && j.jornada !== null && j.jornada !== undefined) {
      j._ordem = new Date(Date.parse(ref.data) + (j.jornada - ref.jornada) * 7 * dia).toISOString().slice(0, 10) + '~';
    } else j._ordem = null;
  }
}

// "9 ago 2026", ou "Jornada 5" / "J5" quando não há data.
function quandoJogo(j, curto = false) {
  if (!j) return '';
  if (j.data) return fmtData(j.data, curto);
  if (j.jornada !== null && j.jornada !== undefined) return curto ? `J${j.jornada}` : `Jornada ${j.jornada}`;
  return '';
}

function fmtNum(n, casas = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const arred = Math.round(n * 10 ** casas) / 10 ** casas + 0;
  return arred.toLocaleString('pt-PT', { minimumFractionDigits: Number.isInteger(arred) ? 0 : casas, maximumFractionDigits: casas });
}

function fmtSinal(n, casas = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const t = fmtNum(Math.abs(n), casas);
  return n > 0 ? `+${t}` : n < 0 ? `−${t}` : t;
}

function media(arr) {
  const v = arr.filter(x => x !== null && x !== undefined && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function soma(arr) {
  return arr.filter(x => Number.isFinite(x)).reduce((a, b) => a + b, 0);
}

function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 7000 : 3200);
}

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* sem armazenamento */ } }

function confirmar(msg, botao = 'Apagar') {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'dialogo';
    d.innerHTML = `<p>${esc(msg)}</p><div class="acoes"><button class="btn" value="nao">Cancelar</button><button class="btn btn-perigo" value="sim">${esc(botao)}</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      d.close(); d.remove(); resolve(b.value === 'sim');
    });
    d.addEventListener('cancel', () => { d.remove(); resolve(false); });
    d.showModal();
  });
}

// ---------- Épocas ----------
// A época começa a 1 de julho: 2026-08-15 -> "2026/27"; 2027-03-01 -> "2026/27".
const EPOCA_INICIAL = '2026/27';
const EPOCA_TABELAS = new Set(['jogos', 'partidas', 'estatisticas_liga', 'onzes', 'arquivo', 'estatisticas_adversario']);
// Equipa (escalão): Equipa Principal ou Sub-23. Estas tabelas guardam o escalão; as chaves únicas incluem-no.
const ESCALOES = { principal: 'Equipa Principal', sub23: 'Sub-23' };
const ESCALAO_TABELAS = new Set(['jogos', 'partidas', 'estatisticas_liga', 'onzes', 'arquivo', 'estatisticas_adversario', 'jogadores', 'jogadores_adversarios', 'agenda', 'importacoes']);
const ESCALAO_UNICAS = new Set(['jogos', 'partidas', 'estatisticas_liga', 'arquivo', 'estatisticas_adversario', 'jogadores', 'jogadores_adversarios']);
const escalaoDaLinha = r => r?.escalao || 'principal';
function escalaoAtual() { return (typeof App !== 'undefined' && App.escalao) || 'principal'; }
function comEscalao(tabela, linha) { return ESCALAO_TABELAS.has(tabela) && linha && !linha.escalao ? { ...linha, escalao: escalaoAtual() } : linha; }
function conflitoComEscalao(tabela, onConflict) { return ESCALAO_UNICAS.has(tabela) && onConflict && !/\bescalao\b/.test(onConflict) ? `escalao,${onConflict}` : onConflict; }
function epocaDe(iso) {
  const [y, m] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m) return null;
  const ini = m >= 7 ? y : y - 1;
  return `${ini}/${String((ini + 1) % 100).padStart(2, '0')}`;
}
function epocaValida(e) { return typeof e === 'string' && /^\d{4}\/\d{2}$/.test(e); }
function epocaDaLinha(r) { return r?.epoca || (r?.data ? epocaDe(r.data) : null) || EPOCA_INICIAL; }
// Completa a época nas linhas novas (pela data, ou a época selecionada na app).
function comEpoca(tabela, linha) {
  linha = comEscalao(tabela, linha);
  if (!EPOCA_TABELAS.has(tabela) || !linha || linha.epoca) return linha;
  return { ...linha, epoca: (linha.data && epocaDe(linha.data)) || (typeof App !== 'undefined' && App.epoca) || EPOCA_INICIAL };
}
