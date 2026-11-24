// ---------- Importar do Transfermarkt ----------
// Usa o serviço /api/transfermarkt (pasta api/ do projeto na Vercel), que lê a página
// do jogador ou da equipa e devolve os dados. Só existe na app publicada, ligada ao Supabase.
const tmDisponivel = () => App.db.modo === 'supabase' && !App.semPlantel && ehDep();

async function tmChamar(url) {
  const ses = await App.db.sb.auth.getSession();
  const token = ses.data.session ? ses.data.session.access_token : '';
  let r, j = null;
  try { r = await fetch('/api/transfermarkt?url=' + encodeURIComponent(url), { headers: { Authorization: 'Bearer ' + token } }); }
  catch { throw new Error('Não consegui ligar ao importador. Verifique a ligação à internet.'); }
  try { j = await r.json(); } catch { /* resposta sem JSON */ }
  if (r.status === 404 && !j) throw new Error('O importador não está publicado. Confirme que a pasta api/ (com transfermarkt.py) foi enviada para o GitHub e a Vercel.');
  if (!r.ok || !j || !j.ok) throw new Error(j && j.erro ? j.erro : 'O importador não respondeu. Tente daqui a pouco.');
  return j;
}

function posicaoTm(raw) {
  const direta = posicaoLonga(raw); if (direta) return direta;
  const t = norm(raw);
  const regras = [['Guarda-redes', ['guarda redes', 'goalkeeper']], ['Lateral direito', ['lateral dir', 'defesa dir', 'right back']], ['Lateral esquerdo', ['lateral esq', 'defesa esq', 'left back']],
    ['Defesa central', ['defesa central', 'centre back', 'center back']], ['Médio defensivo', ['medio defensivo', 'defensive midfield']], ['Médio ofensivo', ['medio ofensivo', 'attacking midfield']],
    ['Extremo direito', ['extremo direito', 'right wing', 'medio direito', 'right midfield']], ['Extremo esquerdo', ['extremo esquerdo', 'left wing', 'medio esquerdo', 'left midfield']],
    ['Ponta de lanca', ['ponta de lanca', 'centre forward', 'center forward', 'segundo avancado', 'second striker']], ['Médio centro', ['medio centro', 'central midfield', 'medio']]];
  for (const [pos, chaves] of regras) if (chaves.some(c => t.includes(c))) return pos === 'Ponta de lanca' ? 'Ponta de lança' : pos;
  if (t.startsWith('defesa')) return 'Defesa central';
  if (t.startsWith('avanc')) return 'Ponta de lança';
  return null;
}
function peTm(raw) { const t = norm(raw); return /^(dir|right)/.test(t) ? 'Direito' : /^(esq|left)/.test(t) ? 'Esquerdo' : /^(amb|both)/.test(t) ? 'Ambos' : null; }

// Procura o jogador no plantel: primeiro pelo ID do Transfermarkt, depois pelo nome.
function tmExistente(j) {
  return App.d.plantel.find(p => p.tm_id && j.transfermarktId && p.tm_id === String(j.transfermarktId))
    || App.d.plantel.find(p => norm(p.nome) === norm(j.name)) || null;
}

async function tmGuardar(j) {
  const ex = tmExistente(j);
  const num = parseInt(j.shirtNumber, 10);
  const dados = {
    posicao: posicaoTm(j.position) ?? ex?.posicao ?? null,
    data_nascimento: /^\d{4}-\d{2}-\d{2}$/.test(j.birthDate || '') ? j.birthDate : ex?.data_nascimento ?? null,
    altura: j.heightCm >= 120 && j.heightCm <= 230 ? j.heightCm : ex?.altura ?? null,
    pe: peTm(j.foot) ?? ex?.pe ?? null,
    numero: num >= 0 && num <= 99 ? num : ex?.numero ?? null,
    nacionalidade: j.nationality || ex?.nacionalidade || null,
    tm_id: j.transfermarktId ? String(j.transfermarktId) : ex?.tm_id ?? null,
    tm_url: j.sourceUrl || ex?.tm_url || null
  };
  // A fotografia só entra se o jogador ainda não tiver uma.
  if (!ex?.foto && /^data:image\//.test(j.photo || '')) { try { dados.foto = await reduzirFoto(j.photo); } catch { /* sem foto */ } }
  if (ex) {
    const [r] = await App.db.atualizar('jogadores', { id: ex.id }, dados);
    Object.assign(ex, r || dados);
    return 'atualizado';
  }
  const novo = await App.db.inserir('jogadores', { nome: j.name, ...dados });
  App.d.plantel.push(novo); indexarPlantel();
  return 'novo';
}

function dialogoTransfermarkt() {
  let ocupado = false, parar = false;
  const d = document.createElement('dialog'); d.className = 'dialogo dialogo-largo';
  d.innerHTML = `<div class="pilha">
    <div class="bloco-cab"><h2>Importar do Transfermarkt</h2><button class="btn" id="tm-fechar">Fechar</button></div>
    <form id="tm-form" class="linha-form tm-linha">
      <label>Link do jogador ou da equipa<input id="tm-url" type="url" required autocomplete="off" placeholder="https://www.transfermarkt.pt/…"></label>
      <button class="btn btn-prim" id="tm-procurar">Procurar</button>
    </form>
    <p class="nota sem-margem">Com o link de um jogador, importa esse jogador. Com o link da equipa, importa o plantel inteiro (cerca de 4 segundos por jogador). Os jogadores que já existem são atualizados; o nome no Wyscout, as notas e a fotografia que já tenham ficam como estão.</p>
    <p class="tm-msg" id="tm-msg" role="status"></p>
    <div id="tm-saida"></div>
  </div>`;
  document.body.appendChild(d); d.showModal();
  const msg = (t, erro) => { const m = $('#tm-msg', d); m.textContent = t; m.classList.toggle('erro', !!erro); };
  const saida = $('#tm-saida', d);
  const fechar = async () => { d.close(); d.remove(); await recarregar(); };
  $('#tm-fechar', d).addEventListener('click', () => { if (ocupado) { parar = true; msg('A parar…'); return; } fechar(); });
  d.addEventListener('cancel', e => { e.preventDefault(); if (!ocupado) fechar(); });

  const mostrarJogador = j => {
    const ex = tmExistente(j);
    const pj = { nome: j.name, numero: parseInt(j.shirtNumber, 10), foto: /^data:image\//.test(j.photo || '') ? j.photo : null };
    if (!Number.isFinite(pj.numero)) pj.numero = null;
    const ida = idade(j.birthDate);
    saida.innerHTML = `<div class="tm-cartao">${avatarJogador(pj, 'avatar-grande')}<div><b>${esc(j.name)}</b>
      <p class="cartao-meta">${esc([posicaoTm(j.position), ida !== null && !isNaN(ida) ? `${ida} anos` : null, j.heightCm ? `${j.heightCm} cm` : null, peTm(j.foot), j.nationality, j.club].filter(Boolean).join(' · '))}</p>
      ${ex ? `<p class="fraco">Já está no plantel como ${esc(ex.nome)}.</p>` : ''}</div></div>
      <div class="acoes-esq"><button class="btn btn-prim" id="tm-guardar">${ex ? 'Atualizar jogador' : 'Adicionar ao plantel'}</button></div>`;
    msg('Confirme os dados e guarde.');
    $('#tm-guardar', d).addEventListener('click', async e => {
      e.currentTarget.disabled = true; msg('A guardar…');
      try {
        const r = await tmGuardar(j);
        msg(r === 'novo' ? `${j.name} adicionado ao plantel.` : `${j.name} atualizado.`);
        saida.innerHTML = ''; $('#tm-url', d).value = ''; $('#tm-url', d).focus();
      } catch (err) { e.currentTarget.disabled = false; msg(err.message, true); }
    });
  };

  const mostrarEquipa = lista => {
    msg(`Encontrei ${lista.length === 1 ? '1 jogador' : `${lista.length} jogadores`}. A importação demora cerca de ${Math.max(1, Math.ceil(lista.length * 4 / 60))} min.`);
    saida.innerHTML = `<ul class="tm-lista">${lista.map(x => `<li>${esc(x.name)}${tmExistente(x) ? ' <span class="fraco">(já no plantel)</span>' : ''}</li>`).join('')}</ul>
      <div class="acoes-esq"><button class="btn btn-prim" id="tm-todos">Importar todos</button></div>`;
    $('#tm-todos', d).addEventListener('click', async e => {
      e.currentTarget.remove();
      ocupado = true; parar = false; $('#tm-procurar', d).disabled = true; $('#tm-fechar', d).textContent = 'Parar';
      const barra = document.createElement('div'); barra.className = 'tm-barra'; barra.innerHTML = '<i></i>'; saida.prepend(barra);
      let ok = 0; const falhas = []; const pausa = window.__TMPAUSA ?? 2500;
      for (let i = 0; i < lista.length && !parar; i++) {
        msg(`${i + 1} de ${lista.length}: ${lista[i].name}`);
        try { const r = await tmChamar(lista[i].url); await tmGuardar(r.jogador); ok++; } catch { falhas.push(lista[i].name); }
        barra.firstChild.style.width = `${(i + 1) / lista.length * 100}%`;
        if (i < lista.length - 1 && !parar) await new Promise(res => setTimeout(res, pausa));
      }
      ocupado = false; $('#tm-procurar', d).disabled = false; $('#tm-fechar', d).textContent = 'Fechar'; barra.remove();
      msg(`${ok === 1 ? '1 jogador importado' : `${ok} jogadores importados`}${parar ? ' (parado)' : ''}.${falhas.length ? ` Falharam: ${falhas.join(', ')}.` : ''}`, falhas.length > 0);
    });
  };

  $('#tm-form', d).addEventListener('submit', async e => {
    e.preventDefault(); if (ocupado) return;
    const url = $('#tm-url', d).value.trim(); saida.innerHTML = '';
    $('#tm-procurar', d).disabled = true; msg('A procurar no Transfermarkt…');
    try { const r = await tmChamar(url); if (r.equipa) mostrarEquipa(r.equipa); else mostrarJogador(r.jogador); }
    catch (err) { msg(err.message, true); }
    $('#tm-procurar', d).disabled = false;
  });
  $('#tm-url', d).focus();
}

async function tmAtualizarJogador(pj, botao) {
  botao.disabled = true; const texto = botao.textContent; botao.textContent = 'A atualizar…';
  try { const r = await tmChamar(pj.tm_url); await tmGuardar(r.jogador); toast(`${pj.nome}: dados atualizados do Transfermarkt.`); await recarregar(); }
  catch (err) { toast(err.message, 'erro'); botao.disabled = false; botao.textContent = texto; }
}
