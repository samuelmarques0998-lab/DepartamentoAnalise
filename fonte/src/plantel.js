// ---------- Plantel ----------
const POSICOES = ['Guarda-redes', 'Defesa central', 'Lateral direito', 'Lateral esquerdo', 'Médio defensivo', 'Médio centro', 'Médio ofensivo', 'Extremo direito', 'Extremo esquerdo', 'Ponta de lança'];
const SECTORES = [['Guarda-redes', 'Guarda-redes'], ['Defesa', 'Defesas'], ['Médio', 'Médios'], ['Avançado', 'Avançados'], [null, 'Sem posição']];
App.plantelPesquisa = '';

function indexarPlantel() {
  const idx = {};
  for (const pj of App.d.plantel) { idx[norm(pj.nome)] = pj; if (pj.nome_wyscout) idx[norm(pj.nome_wyscout)] = pj; }
  App.idx.plantelPorEstat = idx;
}

// Converte abreviaturas (do Wyscout ou portuguesas) para os nomes de posição usados no plantel.
function posicaoLonga(abrev) {
  const p = String(abrev || '').toUpperCase().replace(/[^A-Z]/g, '');
  const mapa = { GR: 0, GK: 0, DC: 1, CB: 1, RCB: 1, LCB: 1, DD: 2, RB: 2, RWB: 2, LD: 2, DE: 3, LB: 3, LWB: 3, LE: 3, MDC: 4, DMF: 4, RDMF: 4, LDMF: 4, MC: 5, CMF: 5, RCMF: 5, LCMF: 5, MO: 6, AMF: 6, RAMF: 6, LAMF: 6, ED: 7, RW: 7, RWF: 7, RM: 7, EE: 8, LW: 8, LWF: 8, LM: 8, PL: 9, CF: 9, ST: 9, FW: 9, SS: 9, CM: 5, DM: 4, AM: 6 };
  if (p in mapa) return POSICOES[mapa[p]];
  const ingles = { goalkeeper: 0, 'centre back': 1, 'center back': 1, 'right back': 2, 'left back': 3, 'defensive midfield': 4, 'central midfield': 5, 'attacking midfield': 6, 'right winger': 7, 'left winger': 8, 'centre forward': 9, 'center forward': 9, 'second striker': 9, 'right midfield': 7, 'left midfield': 8,
    'medio defensivo': 4, 'medio centro': 5, 'medio ofensivo': 6, 'extremo direito': 7, 'extremo esquerdo': 8, 'ponta de lanca': 9, 'avancado centro': 9, 'segundo avancado': 9, 'guarda redes': 0, 'defesa central': 1, 'defesa direito': 2, 'defesa esquerdo': 3, 'lateral direito': 2, 'lateral esquerdo': 3 }[norm(abrev)];
  if (ingles !== undefined) return POSICOES[ingles];
  return POSICOES.find(x => norm(x) === norm(abrev)) || null;
}

function desenharPlantel() {
  const v = $('#vista');
  const todos = App.d.plantel.slice().sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome, 'pt'));
  // Minutos e golos de cada jogador, para a linha de resumo do cartão.
  const resumo = {};
  for (const r of App.d.estJog) {
    if (r.lado !== 'nos') continue;
    const pj = jogadorDoPlantel(r.jogador); if (!pj) continue;
    const x = (resumo[pj.id] ||= { jogos: 0, min: 0, golos: 0 });
    if (Number(r.minutos) > 0) x.jogos++;
    x.min += Number(r.minutos) || 0; x.golos += Number(valorSinonimo(r.metricas, 'golos')) || 0;
  }
  const semPlantel = [...new Set(App.d.estJog.filter(r => r.lado === 'nos').map(r => r.jogador))].filter(n => !jogadorDoPlantel(n));
  const q = norm(App.plantelPesquisa);
  const visiveis = q ? todos.filter(pj => norm(`${pj.nome} ${pj.nome_wyscout || ''} ${pj.numero ?? ''} ${pj.posicao || ''}`).includes(q)) : todos;

  const cartao = pj => {
    const r = resumo[pj.id];
    return `<button class="cartao-jogador" data-pj="${pj.id}">
      ${avatarJogador(pj)}
      <span class="cartao-texto">
        <b>${esc(pj.nome)}</b>
        <span class="cartao-meta">${esc(metaJogador(pj)) || '<span class="fraco">Sem dados</span>'}</span>
        ${r ? `<span class="cartao-estat">${r.jogos} ${r.jogos === 1 ? 'jogo' : 'jogos'} · ${fmtNum(r.min, 0)} min${r.golos ? ` · ${r.golos} ${r.golos === 1 ? 'golo' : 'golos'}` : ''}</span>` : ''}
      </span>
    </button>`;
  };

  v.innerHTML = `
    <div class="cabecalho-vista plantel-cab">
      <h1>Plantel</h1>
      <div class="plantel-acoes">
        <span class="fraco">${todos.length} ${todos.length === 1 ? 'jogador' : 'jogadores'}</span>
        ${ehDep() && !App.semPlantel ? `${tmDisponivel() ? '<button class="btn" id="p-tm">Importar do Transfermarkt</button>' : ''}<button class="btn" id="p-importar">Importar lista</button><button class="btn btn-prim" id="p-novo">Adicionar jogador</button>` : ''}
      </div>
    </div>
    ${App.semPlantel ? `<div class="avisos"><p>A tabela do plantel ainda não existe na base de dados. Corra outra vez o ficheiro <code>schema.sql</code> no Supabase (SQL Editor); os dados que já existem não são apagados.</p></div>` : ''}
    ${todos.length ? `<label class="pesquisa"><span class="sr">Procurar jogador</span><input type="search" id="p-pesquisa" placeholder="Procurar jogador" value="${esc(App.plantelPesquisa)}" autocomplete="off"></label>` : ''}
    ${ehDep() && semPlantel.length && !App.semPlantel ? `<div class="aviso-suave"><p><b>${semPlantel.length}</b> ${semPlantel.length === 1 ? 'jogador tem' : 'jogadores têm'} estatísticas mas não ${semPlantel.length === 1 ? 'está' : 'estão'} no plantel: ${esc(semPlantel.slice(0, 6).join(', '))}${semPlantel.length > 6 ? '…' : ''}</p><button class="btn" id="p-criar-estat">Adicionar ao plantel</button></div>` : ''}
    <div id="p-grupos">
      ${!todos.length && !App.semPlantel ? `<div class="vazio"><p>O plantel está vazio.</p>${ehDep() ? '<p>Adicione os jogadores um a um, importe uma lista em Excel, ou crie-os a partir das estatísticas já importadas.</p>' : ''}</div>` : ''}
      ${todos.length && !visiveis.length ? `<p class="fraco">Nenhum jogador corresponde a "${esc(App.plantelPesquisa)}".</p>` : ''}
      ${SECTORES.map(([sec, titulo]) => {
        const lista = visiveis.filter(pj => sectorPosicao(pj.posicao) === sec);
        return lista.length ? `<section class="grupo-plantel" aria-label="${titulo}"><h2>${titulo} <span>(${lista.length})</span></h2><div class="grelha-plantel">${lista.map(cartao).join('')}</div></section>` : '';
      }).join('')}
    </div>
    ${ehDep() && !App.semPlantel && App.db.modo === 'demo' ? '<p class="nota">A importação do Transfermarkt está disponível na app publicada na Vercel, ligada ao Supabase.</p>' : ''}`;

  $('#p-pesquisa')?.addEventListener('input', e => {
    App.plantelPesquisa = e.target.value;
    const pos = e.target.selectionStart; desenharPlantel();
    const i = $('#p-pesquisa'); i.focus(); i.setSelectionRange(pos, pos);
  });
  $$('[data-pj]', v).forEach(b => b.addEventListener('click', () => {
    const pj = App.d.plantel.find(x => x.id === b.dataset.pj); abrirFicha(chaveEstat(pj));
  }));
  $('#p-novo')?.addEventListener('click', () => dialogoJogador(null));
  $('#p-importar')?.addEventListener('click', dialogoImportarPlantel);
  $('#p-tm')?.addEventListener('click', dialogoTransfermarkt);
  $('#p-criar-estat')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    const posPorNome = {};
    for (const r of App.d.estJog) if (r.lado === 'nos' && r.posicao) (posPorNome[r.jogador] ||= {})[r.posicao] = (posPorNome[r.jogador][r.posicao] || 0) + 1;
    const novos = semPlantel.map(n => {
      const pos = Object.entries(posPorNome[n] || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
      return { nome: n, nome_wyscout: n, posicao: posicaoLonga(pos) };
    });
    try { await App.db.upsert('jogadores', novos, 'nome'); toast(`${novos.length} ${novos.length === 1 ? 'jogador adicionado' : 'jogadores adicionados'} ao plantel. Complete os dados de cada um.`); await recarregar(); }
    catch (err) { toast(err.message, 'erro'); e.currentTarget.disabled = false; }
  });
}

// Reduz a fotografia a 240×240 px, recortada ao centro (cerca de 15 KB).
function reduzirFoto(ficheiro) {
  return new Promise((resolve, reject) => {
    // Aceita um ficheiro escolhido pelo utilizador ou uma imagem já em data URL (Transfermarkt).
    const img = new Image(); const eTexto = typeof ficheiro === 'string'; const url = eTexto ? ficheiro : URL.createObjectURL(ficheiro);
    const libertar = () => { if (!eTexto) URL.revokeObjectURL(url); };
    img.onload = () => {
      const t = 240, c = document.createElement('canvas'); c.width = c.height = t;
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2, sy = Math.max(0, (img.height - lado) / 2 - lado * 0.08); // ligeiramente acima do centro: rostos
      c.getContext('2d').drawImage(img, sx, Math.min(sy, img.height - lado), lado, lado, 0, 0, t, t);
      libertar(); resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { libertar(); reject(new Error('Não consegui ler a imagem.')); };
    img.src = url;
  });
}

function dialogoJogador(pj) {
  const existe = pj?.id;
  const nomesEstat = [...new Set(App.d.estJog.filter(r => r.lado === 'nos').map(r => r.jogador))].sort((a, b) => a.localeCompare(b, 'pt'));
  let foto = pj?.foto || null;
  const d = document.createElement('dialog'); d.className = 'dialogo';
  d.innerHTML = `<form class="pilha" method="dialog">
    <h2>${existe ? 'Editar jogador' : 'Adicionar jogador'}</h2>
    <div class="foto-campo">
      <span id="dj-avatar">${avatarJogador({ ...pj, foto, nome: pj?.nome || '?' }, 'avatar-grande')}</span>
      <div class="pilha-curta">
        <label class="btn btn-ficheiro">Escolher fotografia<input type="file" id="dj-foto" accept="image/*"></label>
        <button type="button" class="btn-link perigo" id="dj-sem-foto" ${foto ? '' : 'hidden'}>Remover fotografia</button>
      </div>
    </div>
    <div class="grelha-2">
      <label>Nome<input name="nome" required value="${esc(pj?.nome || '')}" id="dj-nome"></label>
      <label>Número<input name="numero" type="number" min="0" max="99" value="${pj?.numero ?? ''}"></label>
      <label>Posição<select name="posicao"><option value="">–</option>${POSICOES.map(x => `<option ${pj?.posicao === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Data de nascimento<input name="data_nascimento" type="date" value="${esc(pj?.data_nascimento || '')}"></label>
      <label>Altura (cm)<input name="altura" type="number" min="120" max="230" value="${pj?.altura ?? ''}"></label>
      <label>Pé preferido<select name="pe"><option value="">–</option>${['Direito', 'Esquerdo', 'Ambos'].map(x => `<option ${pj?.pe === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    </div>
    <label>Nome no Wyscout<input name="nome_wyscout" list="dj-estat" value="${esc(pj?.nome_wyscout || '')}" placeholder="Ex.: M. Viana" autocomplete="off"><datalist id="dj-estat">${nomesEstat.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
    <p class="nota sem-margem">Liga o jogador às estatísticas importadas. Deixe vazio se o nome for igual.</p>
    <label>Notas<textarea name="notas" rows="2">${esc(pj?.notas || '')}</textarea></label>
    <p class="erro" id="dj-erro" role="alert" hidden></p>
    <div class="acoes">
      ${existe ? '<button type="button" class="btn-link perigo apagar-esq" id="dj-apagar">Remover do plantel</button>' : ''}
      <button class="btn" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-prim" value="guardar">${existe ? 'Guardar alterações' : 'Adicionar jogador'}</button>
    </div>
  </form>`;
  document.body.appendChild(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  const atualizarAvatar = () => { $('#dj-avatar', d).innerHTML = avatarJogador({ ...pj, foto, nome: $('#dj-nome', d).value || '?', numero: d.querySelector('[name=numero]').value === '' ? null : Number(d.querySelector('[name=numero]').value) }, 'avatar-grande'); $('#dj-sem-foto', d).hidden = !foto; };
  $('#dj-foto', d).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { foto = await reduzirFoto(f); atualizarAvatar(); } catch (err) { toast(err.message, 'erro'); }
  });
  $('#dj-sem-foto', d).addEventListener('click', () => { foto = null; atualizarAvatar(); });
  d.querySelector('[name=numero]').addEventListener('input', atualizarAvatar);
  $('#dj-apagar', d)?.addEventListener('click', async () => {
    d.close();
    if (await confirmar(`Remover ${pj.nome} do plantel? As estatísticas e os eventos já registados não são apagados.`, 'Remover')) {
      try { await App.db.apagar('jogadores', { id: pj.id }); App.jog.modo = 'plantel'; toast('Jogador removido do plantel.'); await recarregar(); }
      catch (err) { toast(err.message, 'erro'); }
    }
  });
  d.querySelector('form').addEventListener('submit', async e => {
    if (e.submitter?.value !== 'guardar') return;
    e.preventDefault();
    const f = new FormData(e.target); const num = x => (f.get(x) === '' ? null : Number(f.get(x)));
    const reg = {
      nome: f.get('nome').trim(), numero: num('numero'), posicao: f.get('posicao') || null, data_nascimento: f.get('data_nascimento') || null,
      altura: num('altura'), pe: f.get('pe') || null, nome_wyscout: f.get('nome_wyscout').trim() || null, foto, notas: f.get('notas').trim() || null
    };
    const erro = $('#dj-erro', d);
    const repetido = App.d.plantel.find(x => norm(x.nome) === norm(reg.nome) && x.id !== pj?.id);
    if (repetido) { erro.textContent = `Já existe um jogador chamado ${repetido.nome} no plantel.`; erro.hidden = false; return; }
    try {
      if (existe) await App.db.atualizar('jogadores', { id: pj.id }, reg); else await App.db.inserir('jogadores', reg);
      d.close(); toast(existe ? 'Jogador atualizado.' : `${reg.nome} adicionado ao plantel.`);
      if (App.jog.modo === 'ficha') App.jog.nome = reg.nome_wyscout || reg.nome;
      await recarregar();
    } catch (err) { erro.textContent = err.message; erro.hidden = false; }
  });
}

// Importa uma lista de jogadores (Excel ou CSV) com colunas como Nome, Número, Posição, Nascimento, Altura, Pé.
function dialogoImportarPlantel() {
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  d.innerHTML = `<div class="pilha">
    <div class="bloco-cab"><h2>Importar lista de jogadores</h2><button class="btn" data-fechar>Fechar</button></div>
    <p class="nota sem-margem">Um ficheiro Excel ou CSV com uma linha por jogador. Colunas reconhecidas: Nome, Número, Posição, Data de nascimento (ou Idade), Altura, Pé, Nome no Wyscout. Jogadores que já existem (mesmo nome) são atualizados.</p>
    <label class="zona-ficheiro"><input type="file" id="ip-ficheiro" accept=".xlsx,.xls,.csv"><span class="zona-titulo">Escolher ficheiro</span><span class="zona-sub">.xlsx, .xls ou .csv</span></label>
    <div id="ip-previa"></div>
  </div>`;
  document.body.appendChild(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => { if (e.target.closest('[data-fechar]')) d.close(); });
  $('#ip-ficheiro', d).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const linhas = await lerFolha(await f.arrayBuffer());
      const lista = lerListaPlantel(linhas);
      if (!lista.length) throw new Error('Não encontrei uma coluna com o nome dos jogadores.');
      $('#ip-previa', d).innerHTML = `<p class="destaque">${lista.length} jogadores encontrados.</p>
        <div class="tabela-env"><table class="tabela compacta"><thead><tr><th>N.º</th><th>Nome</th><th>Posição</th><th>Nascimento</th><th class="num">Altura</th><th>Pé</th></tr></thead>
        <tbody>${lista.map(j => `<tr><td>${j.numero ?? '–'}</td><td>${esc(j.nome)}</td><td>${esc(j.posicao || '–')}</td><td>${j.data_nascimento ? fmtData(j.data_nascimento) : '–'}</td><td class="num">${j.altura ?? '–'}</td><td>${esc(j.pe || '–')}</td></tr>`).join('')}</tbody></table></div>
        <div class="acoes-esq"><button class="btn btn-prim" id="ip-importar">Importar ${lista.length} jogadores</button></div>`;
      $('#ip-importar', d).addEventListener('click', async ev => {
        ev.currentTarget.disabled = true;
        // Mantém o que já existe quando a lista não traz o valor.
        const ex = Object.fromEntries(App.d.plantel.map(p => [norm(p.nome), p]));
        const regs = lista.map(j => { const a = ex[norm(j.nome)] || {}; const r = { nome: a.nome || j.nome };
          for (const k of ['numero', 'posicao', 'data_nascimento', 'altura', 'pe', 'nome_wyscout', 'foto', 'notas']) r[k] = j[k] ?? a[k] ?? null; return r; });
        try { await App.db.upsert('jogadores', regs, 'nome'); d.close(); toast(`${regs.length} jogadores importados.`); await recarregar(); }
        catch (err) { toast(err.message, 'erro'); ev.currentTarget.disabled = false; }
      });
    } catch (err) { $('#ip-previa', d).innerHTML = `<p class="erro">${esc(err.message)}</p>`; }
  });
}

function lerListaPlantel(linhas) {
  const P = {
    nome: /^(nome|name|jogador|player)$/i, numero: /^(n\.?º?|n[uú]mero|number|#|nr\.?)$/i, posicao: /^(posi[cç][aã]o|position|pos\.?)$/i,
    nasc: /^(data de nascimento|nascimento|date of birth|birth ?date|dob|nasc\.?)/i, idade: /^(idade|age)$/i,
    altura: /^(altura|height)/i, pe: /^(p[eé]( preferido)?|foot|p[eé] dominante)$/i, wy: /wyscout/i
  };
  let ih = -1, cab = [];
  for (let i = 0; i < Math.min(10, linhas.length); i++) {
    const c = linhas[i].map(x => String(x).trim());
    if (c.some(x => P.nome.test(x))) { ih = i; cab = c; break; }
  }
  if (ih < 0) return [];
  const col = k => cab.findIndex(x => P[k].test(x));
  const C = Object.fromEntries(Object.keys(P).map(k => [k, col(k)]));
  const pe = v => { const s = norm(v); return /^(dir|right|r$|d$)/.test(s) ? 'Direito' : /^(esq|left|l$|e$)/.test(s) ? 'Esquerdo' : /^(amb|both)/.test(s) ? 'Ambos' : null; };
  return linhas.slice(ih + 1).map(l => {
    const nome = String(l[C.nome] ?? '').trim(); if (!nome) return null;
    let nasc = C.nasc >= 0 ? parseData(String(l[C.nasc]).replace(/\s*\(\d+\)\s*$/, '') || l[C.nasc]) : null;
    if (!nasc && C.nasc >= 0 && l[C.nasc] instanceof Date) nasc = parseData(l[C.nasc]);
    const alt = C.altura >= 0 ? parseNum(String(l[C.altura]).replace(/m$/i, '').trim()) : null;
    return {
      nome, numero: C.numero >= 0 ? (parseNum(l[C.numero]) ?? null) : null,
      posicao: C.posicao >= 0 ? (posicaoLonga(l[C.posicao]) || String(l[C.posicao]).trim() || null) : null,
      data_nascimento: nasc,
      altura: alt === null ? null : Math.round(alt < 3 ? alt * 100 : alt),
      pe: C.pe >= 0 ? pe(l[C.pe]) : null,
      nome_wyscout: C.wy >= 0 ? String(l[C.wy] ?? '').trim() || null : null
    };
  }).filter(Boolean);
}
