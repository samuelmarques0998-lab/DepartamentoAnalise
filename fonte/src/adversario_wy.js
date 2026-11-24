// ---------- Adversários de fora da liga: estatísticas Wyscout (Team stats) ----------
// Para equipas que não estão no ficheiro da liga (Liga Europa, Taça…). O ficheiro traz todas as competições
// da equipa; cada jogo fica guardado com as métricas da equipa e as do adversário desse jogo.

// "Scotland. Premiership" -> "Premiership"; "Europe. UEFA Europa League" -> "Liga Europa".
function nomeCompCurto(c) {
  const s = String(c || '').trim(); if (!s) return '';
  if (/europa league/i.test(s)) return 'Liga Europa';
  if (/conference league/i.test(s)) return 'Liga Conferência';
  if (/champions league/i.test(s)) return 'Liga dos Campeões';
  return s.replace(/^[^.]{2,30}\.\s+/, '');
}
// Os amigáveis ficam guardados mas não entram na forma nem nas médias.
const eAmigavel = r => /friendl|amig[aá]ve/i.test(r.competicao || '');
function estatAdv(eq, comAmigaveis = false) { return (App.d.estAdv || []).filter(r => mesmaEq(r.equipa, eq) && (comAmigaveis || !eAmigavel(r))).sort((a, b) => a.data.localeCompare(b.data)); }
function equipaNaLiga(eq) { return (App.d.liga || []).some(l => mesmaEq(l.equipa, eq)); }

// Equipa de um ficheiro Team stats: a que aparece em (quase) todos os jogos.
function equipaDoTeamStats(an) {
  // A 1.ª linha de cada jogo é a da equipa exportada; desempata pelas presenças nos jogos.
  const c = new Map();
  const somar = (e, v) => { if (!e) return; const k = [...c.keys()].find(x => mesmaEq(x, e)) || e; c.set(k, (c.get(k) || 0) + v); };
  for (const g of an.jogos) { somar(g.linhas[0]?.equipa, 1000); for (const e of new Set([g.casa, g.fora].filter(Boolean))) somar(e, 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
async function importarEstatAdversario(eq, f) {
  let an;
  try { an = analisarTeamStats(await lerFicheiroTabela(f)); } catch (e) { toast('Não foi possível ler o ficheiro.', 'erro'); return; }
  if (an.erro) { toast(an.erro, 'erro'); return; }
  const linhas = linhasEstatAdv(an, eq);
  if (!linhas.length) { toast(`O ficheiro não tem jogos de ${eq}. Exporte o Team stats desta equipa.`, 'erro'); return; }
  try { await App.db.upsert('estatisticas_adversario', linhas, 'epoca,equipa,data,adversario'); }
  catch (e) { toast(traduzErro(e), 'erro'); return; }
  const comps = [...new Set(linhas.map(l => nomeCompCurto(l.competicao)).filter(Boolean))];
  toast(`${linhas.length} jogos de ${eq} guardados${comps.length ? ` (${comps.join(', ')})` : ''}.`);
  await recarregar();
}
// Registos (um por jogo) do Team stats de uma equipa, para estatisticas_adversario.
function linhasEstatAdv(an, eq) {
  const linhas = []; let semEquipa = 0;
  for (const g of an.jogos) {
    const nos = g.linhas.find(l => mesmaEq(l.equipa, eq));
    if (!nos) { semEquipa++; continue; }
    const outro = g.linhas.find(l => l !== nos) || null;
    const local = mesmaEq(g.casa, eq) ? 'casa' : mesmaEq(g.fora, eq) ? 'fora' : null;
    if (!local) { semEquipa++; continue; }
    const adversario = local === 'casa' ? g.fora : g.casa;
    const temRes = Number.isFinite(g.gc) && Number.isFinite(g.gf);
    const m = { ...nos.met }, a = outro ? { ...outro.met } : null;
    // O que o Wyscout não traz na linha da equipa vem da linha do adversário.
    if (a && m['xG Sofrido'] == null && Number.isFinite(a['Golos esperados'])) m['xG Sofrido'] = a['Golos esperados'];
    if (a && m['Remates contra'] == null && Number.isFinite(a['Remates'])) m['Remates contra'] = a['Remates'];
    if (a && m['Remates contra no alvo'] == null && Number.isFinite(a['Remates à baliza'])) m['Remates contra no alvo'] = a['Remates à baliza'];
    linhas.push({ epoca: epocaDe(g.data), equipa: eq, data: g.data, jogo: g.texto, competicao: g.comp || null, local, adversario,
      golos: temRes ? (local === 'casa' ? g.gc : g.gf) : null, golos_sofridos: temRes ? (local === 'casa' ? g.gf : g.gc) : null,
      metricas: m, metricas_adv: a, updated_at: new Date().toISOString() });
  }
  return linhas;
}

// Linha da página Observação: estado e botão para importar.
function htmlEstatAdvObs(eq, editar) {
  if (equipaNaLiga(eq)) return '';
  const rs = estatAdv(eq, true); const am = rs.filter(eAmigavel).length;
  const txt = rs.length ? `Estatísticas Wyscout: <b>${rs.length - am} jogos oficiais</b>${am ? ` (e ${am} ${am === 1 ? 'amigável, que não conta' : 'amigáveis, que não contam'})` : ''} de ${fmtData(rs[0].data)} a ${fmtData(rs[rs.length - 1].data)} (${esc([...new Set(rs.filter(r => !eAmigavel(r)).map(r => nomeCompCurto(r.competicao)).filter(Boolean))].join(', '))}).`
    : `${esc(eq)} não está no ficheiro da liga. Importe o Team stats do Wyscout para ter a forma e as médias no pré-jogo.`;
  return `<div class="obs-wy"><span class="nota">${txt}</span>${editar ? botaoSimbolosObs(eq) : ''}${editar ? `<label class="btn" title="Exportação Team stats do Wyscout (Excel), com os dados do adversário">${rs.length ? 'Atualizar' : 'Importar'} estatísticas (Wyscout)<input type="file" id="obs-wy-fich" accept=".csv,.xlsx,.xls" hidden></label>` : ''}</div>`;
}

// Símbolos das equipas que aparecem na observação (o adversário, os adversários dele na forma, nos onzes e nos últimos jogos).
function equipasDaObservacao(eq) {
  return juntarEquipas([eq, ...jogosForma(eq).map(l => l.adversario), ...onzesAdv(eq).map(o => o.adversario), ...estatAdv(eq).slice(-10).map(r => r.adversario)]);
}
function botaoSimbolosObs(eq) {
  const S = App.cfg?.simbolos_equipas || {};
  const falta = equipasDaObservacao(eq).filter(e => !S[norm(e)] && !Object.keys(S).some(k => mesmaEquipa(k, e))).length;
  return `<button class="btn" type="button" id="obs-simbolos">Símbolos das equipas${falta ? ` (${falta} em falta)` : ''}</button>`;
}
function dialogoSimbolosObs(eq) {
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  const desenhar = () => {
    d.innerHTML = `<h2>Símbolos das equipas</h2>
      <p class="nota">Equipas que aparecem na observação de ${esc(eq)}. Clique num símbolo para escolher a imagem (PNG com fundo transparente fica melhor). Ficam guardados para toda a app; também pode geri-los em Definições.</p>
      ${htmlGrelhaSimbolos(equipasDaObservacao(eq), true)}
      <div class="acoes"><button class="btn btn-prim" type="button" id="ds-fechar">Fechar</button></div>`;
    $('#ds-fechar', d).addEventListener('click', () => d.close());
    $$('[data-simbolo]', d).forEach(inp => inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      try { await guardarSimbolo(inp.dataset.simbolo, await imagemParaSimbolo(f)); desenhar(); } catch (err) { toast(err.message || String(err), 'erro'); }
    }));
    $$('[data-tirar-simbolo]', d).forEach(b => b.addEventListener('click', async () => { try { await guardarSimbolo(b.dataset.tirarSimbolo, null); desenhar(); } catch (err) { toast(err.message || String(err), 'erro'); } }));
  };
  desenhar(); document.body.appendChild(d); d.showModal();
  d.addEventListener('close', () => { d.remove(); desenharObservacao(); });
}

// Pré-jogo: médias por jogo (todas as competições, por competição e últimos 5) e os últimos jogos.
function htmlEstatAdvPre(eq) {
  const rs = estatAdv(eq); if (!rs.length) return '';
  const L = r => ({ m: r.metricas || {}, a: r.metricas_adv || {} });
  const media = (lista, d) => { const v = lista.map(r => valorEq(d, L(r))).filter(Number.isFinite); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const comps = [...new Set(rs.map(r => nomeCompCurto(r.competicao)).filter(Boolean))];
  const ult = rs.slice(-5);
  const cols = [{ rot: 'Todos', sub: `${rs.length} jogos`, lista: rs },
    ...(comps.length > 1 ? comps.map(c => { const l = rs.filter(r => nomeCompCurto(r.competicao) === c); return { rot: c, sub: `${l.length} ${l.length === 1 ? 'jogo' : 'jogos'}`, lista: l }; }) : []),
    { rot: 'Últimos 5', sub: `${ult.length} jogos`, lista: ult }];
  const defs = METRICAS_EQ.filter(d => !d.ops && rs.some(r => valorEq(d, L(r)) !== null));
  const areas = [...new Set(defs.map(d => d.area))];
  const res = r => (!Number.isFinite(r.golos) ? '' : r.golos > r.golos_sofridos ? 'v' : r.golos < r.golos_sofridos ? 'd' : 'e');
  const v = rs.filter(r => res(r) === 'v').length, e = rs.filter(r => res(r) === 'e').length, dd = rs.filter(r => res(r) === 'd').length;
  const gm = rs.reduce((s, r) => s + (r.golos || 0), 0), gs = rs.reduce((s, r) => s + (r.golos_sofridos || 0), 0);
  const xg = METRICAS_EQ.find(d => d.id === 'xg'), xgs = METRICAS_EQ.find(d => d.id === 'xg_sofrido');
  const cel = (rot, val, sub = '') => `<div class="placar-cel"><span class="placar-rot">${rot}</span><span class="placar-val">${val}</span>${sub ? `<span class="placar-sub">${sub}</span>` : ''}</div>`;
  return `<h2>Dados estatísticos (Wyscout)</h2>
    <p class="nota">${esc(eq)} não está na nossa liga: médias por jogo nas competições do ficheiro do Wyscout, sem comparação com a liga. Atualize em Observação › Importar estatísticas.</p>
    <section class="placar">
      ${cel('Jogos', rs.length, `${v}V ${e}E ${dd}D`)}
      ${cel('Golos por jogo', `${fmtNum(gm / rs.length, 1)}<i>–</i>${fmtNum(gs / rs.length, 1)}`, 'marcados – sofridos')}
      ${media(rs, xg) !== null ? cel('xG por jogo', `${fmtNum(media(rs, xg), 2)}<i>–</i>${fmtNum(media(rs, xgs), 2)}`, 'criado – sofrido') : ''}
      ${media(ult, xg) !== null ? cel('xG nos últimos 5', `${fmtNum(media(ult, xg), 2)}<i>–</i>${fmtNum(media(ult, xgs), 2)}`, 'criado – sofrido') : ''}
    </section>
    <div class="tabela-env"><table class="tabela compacta wy-med">
      <thead><tr><th></th>${cols.map(c => `<th class="num">${esc(c.rot)}<small>${c.sub}</small></th>`).join('')}</tr></thead>
      <tbody>${areas.map(a => `<tr class="et-sep"><th colspan="${cols.length + 1}">${esc(a)}</th></tr>${defs.filter(d => d.area === a).map(d => `<tr><td>${esc(d.nome)}</td>${cols.map(c => `<td class="num">${fmtEq(d, media(c.lista, d))}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody>
    </table></div>
    <h3 class="wy-tit">Últimos jogos</h3>
    <div class="tabela-env"><table class="tabela compacta">
      <thead><tr><th>Data</th><th>Competição</th><th>Jogo</th><th class="num">Resultado</th><th class="num">xG</th><th class="num">Remates</th><th class="num">Posse</th></tr></thead>
      <tbody>${rs.slice(-10).reverse().map(r => { const l = L(r); const x = valorEq(xg, l), xa = valorEq(xgs, l);
        const rem = valorEq(METRICAS_EQ.find(d => d.id === 'remates'), l), rems = valorEq(METRICAS_EQ.find(d => d.id === 'remates_sofridos'), l), pos = valorEq(METRICAS_EQ.find(d => d.id === 'posse'), l);
        return `<tr><td>${fmtData(r.data)}</td><td>${esc(nomeCompCurto(r.competicao))}</td><td>${esc(r.adversario)} <span class="fraco">(${r.local === 'casa' ? 'C' : 'F'})</span></td>
          <td class="num"><span class="wy-res ${res(r)}">${Number.isFinite(r.golos) ? `${r.golos}–${r.golos_sofridos}` : '–'}</span></td>
          <td class="num">${x !== null ? `${fmtNum(x, 2)} – ${fmtNum(xa, 2)}` : '–'}</td><td class="num">${rem !== null ? `${fmtNum(rem, 0)} – ${fmtNum(rems, 0)}` : '–'}</td><td class="num">${pos !== null ? `${fmtNum(pos, 0)}%` : '–'}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <p class="nota">Valores da equipa – do adversário. (C) jogo em casa, (F) jogo fora.</p>`;
}
