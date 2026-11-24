// ---------- Dados de demonstração (fictícios) ----------
function gerarDemo() {
  let semente = 20261110;
  const rnd = () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; };
  const entre = (a, b) => a + rnd() * (b - a);
  const inteiro = (a, b) => Math.floor(entre(a, b + 1));
  const escolher = arr => arr[Math.floor(rnd() * arr.length)];
  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;

  const clube = 'SCUT';
  const adversarios = ['Estrela da Serra', 'União de Vale Verde', 'Atlético Costa Norte', 'SC Planície', 'Académico do Rio',
    'Desportivo da Barra', 'GD Alvorada', 'Naval do Sul', 'FC Montalvo', 'Juventude Lezíria', 'Os Mareantes', 'SC Penedo', 'Grupo Recreativo Tojal', 'AD Cabeço'];
  const plantel = [
    ['Rui Calado', 'GR'], ['Tiago Mendes', 'DD'], ['Bruno Faria', 'DC'], ['Hugo Teles', 'DC'], ['Diogo Lapa', 'DE'],
    ['Nuno Brito', 'MDC'], ['André Sousa', 'MC'], ['Filipe Rocha', 'MC'], ['Luís Pinho', 'ED'], ['Gonçalo Reis', 'EE'],
    ['Marco Viana', 'PL'], ['Pedro Lobo', 'PL'], ['Ivo Serrão', 'MC'], ['Sérgio Neto', 'DC'], ['Ricardo Gaio', 'ED'], ['Vasco Leal', 'DD']];

  const dados = {
    configuracao: [{ id: 1, nome_clube: clube, nomes_alternativos: ['Torreense', 'SC União Torreense'], metricas_chave: [], criterios: {}, updated_at: new Date().toISOString() }],
    jogos: [], estatisticas_equipa: [], estatisticas_jogador: [], eventos: [], importacoes: [], mapeamento_nomes: [
      { tipo: 'equipa', original: 'G.D. Alvorada', normalizado: 'GD Alvorada' }]
  };

  // Plantel (dados fictícios)
  const POS_LONGA = { GR: 'Guarda-redes', DD: 'Lateral direito', DE: 'Lateral esquerdo', DC: 'Defesa central', MDC: 'Médio defensivo', MC: 'Médio centro', ED: 'Extremo direito', EE: 'Extremo esquerdo', PL: 'Ponta de lança' };
  const ALTURA = { GR: 191, DC: 186, DD: 177, DE: 178, MDC: 183, MC: 178, ED: 174, EE: 175, PL: 184 };
  const numeros = [1, 2, 4, 5, 3, 6, 8, 10, 7, 11, 9, 19, 14, 15, 17, 22];
  dados.jogadores = [...plantel, ['Tomás Arruda', 'GR'], ['Rafael Couto', 'DC']].map(([nome, pos], i) => ({
    id: uuid(), nome, numero: numeros[i] ?? 30 + i, posicao: POS_LONGA[pos],
    data_nascimento: `${1993 + (i * 7) % 12}-${String(1 + (i * 5) % 12).padStart(2, '0')}-${String(3 + (i * 11) % 25).padStart(2, '0')}`,
    altura: ALTURA[pos] + ((i * 3) % 7) - 3, pe: ['DE', 'EE'].includes(pos) || i === 7 ? 'Esquerdo' : i === 12 ? 'Ambos' : 'Direito',
    nome_wyscout: i < plantel.length ? nome : null, foto: null, notas: null, created_at: new Date().toISOString()
  }));

  // Métricas de uma equipa num jogo, com os nomes das colunas do ficheiro da liga.
  const metricasLiga = (xg, golos, f) => {
    const remates = Math.max(golos + 1, inteiro(Math.round(7 * f), Math.round(15 * f)));
    const enq = inteiro(Math.max(golos, Math.round(remates * 0.25)), Math.max(golos, Math.round(remates * 0.45)));
    const passes = inteiro(Math.round(300 * f), Math.round(460 * f)); const certos = Math.round(passes * entre(0.72, 0.86));
    const cruz = inteiro(9, 22); const cruzC = Math.round(cruz * entre(0.22, 0.4));
    const dd = inteiro(30, 55), dda = inteiro(14, 32), dof = inteiro(28, 50);
    const pc = inteiro(8, 30), pm = inteiro(30, 55), pl = inteiro(35, 70);
    const rc = inteiro(22, 48), rm = inteiro(22, 45), rl = Math.round(entre(5, 16) * f);
    const ap = inteiro(Math.round(18 * f), Math.round(34 * f)), apR = Math.round(ap * entre(0.18, 0.4) * Math.sqrt(f));
    const ca = inteiro(1, 7), caR = Math.round(ca * entre(0, 0.6)), bp = inteiro(4, 12), bpR = Math.round(bp * entre(0.15, 0.45));
    const ent = Math.round(entre(14, 30) * f), entC = Math.round(ent * entre(0.3, 0.55));
    const tf = Math.round(entre(45, 80) * f), prog = Math.round(entre(60, 95) * f);
    const pct = (a, b) => (b ? r1(a / b * 100) : 0);
    return {
      'Golos esperados': xg, 'Remates': remates, 'Remates à baliza': enq, '% Remates à baliza': pct(enq, remates),
      'Passes': passes, 'Passes certos': certos, '% Passes certos': pct(certos, passes), 'Posse': 50,
      'Perdas': pc + pm + pl, 'Perdas curto': pc, 'Perdas médio': pm, 'Perdas longo': pl,
      'Recuperações': rc + rm + rl, 'Recuperações curto': rc, 'Recuperações médio': rm, 'Recuperações longo': rl,
      'Ataques posicionais': ap, 'Ataques posicionais com remates': apR, '% Ataques posicionais com remates': pct(apR, ap),
      'Contra-ataques': ca, 'Contra-ataques com remates': caR, '% Contra-ataques com remates': pct(caR, ca),
      'Bolas paradas': bp, 'Bolas paradas com remates': bpR, '% Bolas paradas com remates': pct(bpR, bp), 'Cantos': inteiro(2, 9),
      'Cruzamentos': cruz, 'Cruzamentos certos': cruzC, '% Cruzamentos certos': pct(cruzC, cruz),
      'Passes em profundidade recebidos': Math.round(entre(2, 9) * f), 'Entradas na grande área': ent, 'Entradas na grande área corridas': ent - entC, 'Entradas na grande área cruzamentos': entC,
      'Toques na área': Math.round(entre(10, 24) * f),
      'Duelos defensivos': dd, 'Duelos defensivos ganhos': Math.round(dd * entre(0.55, 0.72)), '% Duelos defensivos ganhos': 0,
      'Duelos aéreos': dda, 'Duelos aéreos ganhos': Math.round(dda * entre(0.38, 0.62)), '% Duelos aéreos ganhos': 0,
      'Duelos ofensivos': dof, 'Interseções': inteiro(28, 52), 'Alívios': inteiro(10, 30), 'Faltas': inteiro(8, 18),
      'Passes para terço final': Math.round(tf * 1.4), 'Passes para terço final certos': tf, 'Passes progressivos': Math.round(prog * 1.3), 'Passes progressivos precisos': prog,
      'Intensidade de jogo': r2(entre(14.5, 18) * Math.sqrt(f)), 'Média de passes por posse': r2(entre(2.6, 4.4) * f), '% de passe longo': r2(entre(7, 17) / f), 'PPDA': r2(entre(7, 14) / f)
    };
  };
  // Completa os valores que dependem do adversário (posse, remates e xG sofridos).
  const parMetricas = (a, b) => {
    for (const m of [a, b]) for (const k of ['Duelos defensivos', 'Duelos aéreos']) m[`% ${k} ganhos`] = m[k] ? r1(m[`${k} ganhos`] / m[k] * 100) : 0;
    a['Posse'] = r2(a['Passes'] / (a['Passes'] + b['Passes']) * 100); b['Posse'] = r2(100 - a['Posse']);
    for (const [x, y] of [[a, b], [b, a]]) { x['xG Sofrido'] = y['Golos esperados']; x['Remates contra'] = y['Remates']; x['Remates contra no alvo'] = y['Remates à baliza']; }
    return [a, b];
  };
  const forca = Object.fromEntries(adversarios.map((a, i) => [a, 0.8 + ((i * 7) % 11) / 22]));
  dados.estatisticas_liga = [];
  const linhaLiga = (jornada, equipa, adversario, local, golos, sofridos, metricas, data) => {
    const m = { ...metricas };
    dados.estatisticas_liga.push({ id: uuid(), competicao: 'Liga', jornada, equipa, adversario, local, golos, golos_sofridos: sofridos, metricas: m, updated_at: data });
  };

  const inicio = new Date(Date.UTC(2026, 7, 9));
  adversarios.forEach((adv, i) => {
    const d = new Date(inicio.getTime() + i * 7 * 86400000);
    const data = d.toISOString().slice(0, 10);
    const local = i % 2 === 0 ? 'casa' : 'fora';
    const forma = 1 + 0.25 * Math.sin(i / 2.2) + (local === 'casa' ? 0.1 : -0.05);
    const xgN = r2(Math.max(0.3, entre(0.8, 2.0) * forma));
    const xgA = r2(Math.max(0.2, entre(0.5, 1.6) / forma));
    const gm = Math.max(0, Math.round(xgN + entre(-1, 1.1)));
    const gs = Math.max(0, Math.round(xgA + entre(-0.9, 0.9)));
    const id = uuid();
    dados.jogos.push({ id, data, adversario: adv, competicao: i === 6 ? 'Taça' : 'Liga', local, golos_marcados: gm, golos_sofridos: gs, notas: null, created_at: new Date().toISOString() });

    const [mN, mA] = parMetricas(metricasLiga(xgN, gm, forma), metricasLiga(xgA, gs, 1 / forma));
    dados.estatisticas_equipa.push({ id: uuid(), jogo_id: id, lado: 'nos', equipa: clube, metricas: mN, importacao_id: null, updated_at: data });
    dados.estatisticas_equipa.push({ id: uuid(), jogo_id: id, lado: 'adversario', equipa: adv, metricas: mA, importacao_id: null, updated_at: data });

    // Jogadores
    const titulares = plantel.slice(0, 11).map(p => [...p, 90]);
    const suplentes = plantel.slice(11).sort(() => rnd() - 0.5).slice(0, 3).map(p => [...p, inteiro(10, 35)]);
    if (i === 4) titulares[10][2] = 0; // lesionado
    const atacantes = ['PL', 'ED', 'EE', 'MC'];
    let golosPorDar = gm;
    [...titulares, ...suplentes].filter(p => p[2] > 0).forEach(([nome, pos, min]) => {
      const peso = (pos === 'PL' ? 3 : pos === 'ED' || pos === 'EE' ? 2 : pos.startsWith('M') ? 1 : 0.3) * min / 90;
      const xg = r2(xgN * peso / 9 * entre(0.5, 1.5));
      const g = golosPorDar > 0 && atacantes.includes(pos) && rnd() < 0.5 ? 1 : 0; golosPorDar -= g;
      const passes = inteiro(pos === 'PL' ? 12 : 25, pos.startsWith('M') ? 70 : 50) * min / 90;
      dados.estatisticas_jogador.push({
        id: uuid(), jogo_id: id, jogador: nome, lado: 'nos', equipa: clube, posicao: pos, minutos: min, importacao_id: null, updated_at: data,
        metricas: (() => {
          const k = min / 90; const n = (a, b) => Math.round(entre(a, b) * k);
          const def = pos.startsWith('D') || pos === 'GR', med = pos.startsWith('M'), ata = ['PL', 'ED', 'EE'].includes(pos), lat = ['DD', 'DE'].includes(pos);
          const pas = n(pos === 'PL' ? 14 : 30, med || pos === 'DC' ? 65 : 45), pasC = Math.round(pas * entre(0.72, 0.9));
          const fr = Math.round(pas * entre(0.25, 0.4)), lg = n(pos === 'DC' || pos === 'GR' ? 4 : 1, pos === 'DC' || pos === 'GR' ? 10 : 4), tf = n(med || lat ? 4 : 1, med || lat ? 11 : 4);
          const dd = n(def ? 6 : 2, def ? 12 : 6), dof = n(ata ? 6 : 1, ata ? 14 : 4), du = dd + dof + n(3, 8), bl = n(2, 6);
          const rem = Math.round(xg * entre(5, 9)) + (ata ? n(0, 2) : 0), dr = n(ata || lat ? 2 : 0, ata || lat ? 7 : 2), cr = n(lat || ata ? 2 : 0, lat || ata ? 7 : 1), perdas = n(6, ata ? 18 : 12);
          return {
            'Golos': g, 'Assistências': g && rnd() < 0.6 ? 0 : (rnd() < 0.1 ? 1 : 0), 'xG': xg, 'xA': r2(xgN * entre(0, 0.15)),
            'Remates': rem, 'Remates/à baliza': Math.round(rem * entre(0.25, 0.55)), 'Assistências para remate': n(0, ata || med ? 3 : 1), 'Toques na área': n(0, ata ? 7 : 1),
            'Passes': pas, 'Passes/certos': pasC, 'Passes para a frente': fr, 'Passes para a frente/certos': Math.round(fr * entre(0.6, 0.85)),
            'Passes longos': lg, 'Passes longos/certos': Math.round(lg * entre(0.35, 0.7)), 'Passes para terço final': tf, 'Passes para terço final/certos': Math.round(tf * entre(0.55, 0.85)),
            'Passes em profundidade': n(0, med || ata ? 3 : 1), 'Passes para a grande área': n(0, ata || lat ? 4 : 1), 'Passes recebidos': Math.round(pas * entre(0.7, 1.1)),
            'Perdas': perdas, 'Perdas/no seu meio-campo': Math.round(perdas * entre(0.1, def ? 0.45 : 0.25)),
            'Duelos': du, 'Duelos/ganhos': Math.round(du * entre(0.4, 0.62)), 'Duelos defensivos': dd, 'Duelos defensivos/ganhos': Math.round(dd * entre(0.5, 0.78)),
            'Duelos ofensivos': dof, 'Duelos ofensivos/ganhos': Math.round(dof * entre(0.3, 0.55)), ...(() => { const a = n(pos === 'DC' || pos === 'PL' ? 3 : 0, pos === 'DC' || pos === 'PL' ? 9 : 3); return { 'Duelos aéreos': a, 'Duelos aéreos/ganhos': Math.round(a * entre(0.35, 0.7)) }; })(), 'Duelos de bola livre': bl, 'Duelos de bola livre / won': Math.round(bl * entre(0.35, 0.7)),
            'Intercepções': n(def || pos === 'MDC' ? 3 : 0, def || pos === 'MDC' ? 9 : 4), 'Recuperações': n(def || med ? 5 : 2, def || med ? 11 : 7), 'Recuperações/no meio-campo do adversário': n(0, ata || med ? 4 : 2),
            'Carrinhos': n(0, def ? 2 : 1), 'Alívios': n(def ? 1 : 0, pos === 'DC' ? 8 : 2), 'Faltas': n(0, 3), 'Faltas sofridas': n(0, ata ? 4 : 2),
            'Dribbles': dr, 'Dribbles/com sucesso': Math.round(dr * entre(0.35, 0.7)), 'Cruzamentos': cr, 'Cruzamentos/certos': Math.round(cr * entre(0.2, 0.45)),
            'Corridas seguidas': n(0, ata || lat ? 4 : 1), 'Foras de jogo': pos === 'PL' ? n(0, 2) : 0
          };
        })()
      });
    });

  });
  // Jogos do campeonato (todas as equipas) e oportunidades codificadas com o método do departamento.
  const POS_EV_DEMO = { GR: 'Guarda-redes', DD: 'Defesa direito', DE: 'Defesa esquerdo', DC: 'Defesa central', MDC: 'Médio defensivo', MC: 'Médio centro', ED: 'Extremo direito', EE: 'Extremo esquerdo', PL: 'Ponta de lança' };
  const apelidos = ['Silva', 'Costa', 'Rocha', 'Pires', 'Lima', 'Neves', 'Moura', 'Faria', 'Teles', 'Gomes', 'Ramos', 'Matos', 'Vaz', 'Cunha', 'Leite', 'Simões', 'Barros', 'Couto'];
  const nomesProprios = ['João', 'Rui', 'Tiago', 'Nuno', 'Hugo', 'André', 'Diogo', 'Paulo', 'Ivo', 'Luís', 'Bruno', 'Filipe'];
  const posAtaque = ['Ponta de lança', 'Ponta de lança', 'Extremo direito', 'Extremo esquerdo', 'Médio ofensivo', 'Médio centro', 'Defesa central'];
  const posPasse = ['Defesa direito', 'Defesa esquerdo', 'Extremo direito', 'Extremo esquerdo', 'Médio centro', 'Médio ofensivo', 'Ponta de lança'];
  const elencos = {};
  const elenco = eq => elencos[eq] ||= (eq === clube ? plantel.map(([n, p]) => [n, POS_EV_DEMO[p]])
    : Array.from({ length: 16 }, (_, k) => [`${nomesProprios[(k * 5 + eq.length) % nomesProprios.length]} ${apelidos[(k * 7 + eq.length * 3) % apelidos.length]}`, POSICOES_EV[(k * 3 + 1) % POSICOES_EV.length]]));
  const quem = (eq, posicoes) => { const pos = escolher(posicoes); const cand = elenco(eq).filter(x => x[1] === pos); return cand.length ? escolher(cand) : escolher(elenco(eq)); };
  const pt = (d0, d1, y0, y1) => ({ x: r1(100 - entre(d0, d1) / 1.05), y: r1(entre(y0, y1)) });
  const gerarOps = (alvo, equipa, n, golos, ligacao) => {
    for (let k = 0; k < n; k++) {
      const golo = k < golos;
      const momento = rnd() < 0.45 ? 'Organização' : rnd() < 0.55 ? 'Transição' : 'Esquema tático';
      const sub = escolher(MOMENTOS[momento].sub.concat(momento === 'Esquema tático' ? ['Canto', 'Canto'] : momento === 'Organização' ? ['Jogo exterior'] : []));
      const mecs = mecanismosDe(momento, sub); const mec = mecs.length ? escolher(mecs) : null;
      const esq = rnd() < 0.5;
      let fin, passe = null;
      if (sub === 'Penálti') fin = { x: 89.6, y: 49 };
      else if (sub === 'Canto') { passe = { x: 99.5, y: esq ? 0.5 : 99.5 }; fin = mec === '2.ª bola' ? pt(14, 24, 30, 70) : pt(3, 11, 33, 67); }
      else if (sub === 'Livre' || sub === 'Lançamento') { passe = pt(18, 35, esq ? 3 : 70, esq ? 30 : 97); fin = mec === 'Remate direto' ? pt(18, 27, 30, 70) : pt(4, 13, 30, 70); if (mec === 'Remate direto') passe = null; }
      else if (/^Cruzamento/.test(mec || '')) { passe = pt(mec === 'Cruzamento atrasado' ? 1 : 6, mec === 'Cruzamento atrasado' ? 6 : 26, esq ? 3 : 81, esq ? 19 : 97); fin = pt(4, 13, 32, 68); }
      else if (mec === 'Rotura') { passe = pt(22, 42, 25, 75); fin = pt(7, 16, 28, 72); }
      else if (mec === 'Combinação interior') { passe = pt(16, 26, 30, 70); fin = pt(8, 16, 30, 70); }
      else if (mec === 'Remate exterior') { passe = rnd() < 0.5 ? pt(22, 32, 20, 80) : null; fin = pt(17, 28, 25, 75); }
      else if (mec === '1x1') { passe = pt(20, 32, esq ? 5 : 60, esq ? 40 : 95); fin = pt(6, 17, esq ? 22 : 45, esq ? 55 : 78); }
      else { fin = pt(9, 22, 28, 72); }
      const corredor = passe ? (passe.y < 20.35 ? 'Esquerdo' : passe.y > 79.65 ? 'Direito' : 'Centro') : escolher(CORREDORES);
      const minuto = inteiro(2, 93); const tempo = tempoDoMinuto(minuto);
      const [fNome, fPos] = quem(equipa, posAtaque); const [pNome, pPos] = sub === 'Penálti' ? [null, null] : quem(equipa, posPasse);
      dados.eventos.push({
        id: uuid(), partida_id: alvo.partida_id || null, jogo_id: ligacao?.jogo_id || null, equipa, lado: ligacao ? ligacao.lado : null,
        tipo: 'oportunidade', minuto, tempo, parte: parteDoTempo(tempo), momento, sub_momento: sub, mecanismo: mec, corredor,
        qualidade: golo || sub === 'Penálti' || rnd() < 0.25 ? 'Grande oportunidade' : 'Oportunidade', finalizacao: null,
        resultado: golo ? 'Golo' : escolher(['Defesa do GR', 'Fora', 'Bloqueado', 'Fora', 'Ferro', 'Defesa do GR']),
        zona_x: fin.x, zona_y: fin.y, passe_x: passe ? passe.x : null, passe_y: passe ? passe.y : null, local_aprox: false, origem: null,
        jogador: fNome, posicao_finalizador: fPos, assistente: pNome !== fNome ? pNome : null, posicao_passe: pNome !== fNome ? pPos : null,
        video_url: null, notas: null, criado_por: 'demo', created_at: new Date().toISOString()
      });
    }
  };
  dados.partidas = [];
  let jornada = 0;
  for (const j of dados.jogos) {
    const xgN = dados.estatisticas_equipa.find(e => e.jogo_id === j.id && e.lado === 'nos')?.metricas['Golos esperados'] || 1.2;
    const xgA = dados.estatisticas_equipa.find(e => e.jogo_id === j.id && e.lado === 'adversario')?.metricas['Golos esperados'] || 1;
    const nN = Math.max(j.golos_marcados, Math.round(xgN * entre(3, 4.2))), nA = Math.max(j.golos_sofridos, Math.round(xgA * entre(3, 4.2)));
    if (j.competicao !== 'Liga') { // jogo do SCUT fora do campeonato
      gerarOps({}, clube, nN, j.golos_marcados, { jogo_id: j.id, lado: 'nos' }); gerarOps({}, j.adversario, nA, j.golos_sofridos, { jogo_id: j.id, lado: 'adversario' });
      continue;
    }
    jornada++; j.jornada = jornada;
    const casaNos = j.local === 'casa';
    const pN = { id: uuid(), competicao: 'Liga', jornada, casa: casaNos ? clube : j.adversario, fora: casaNos ? j.adversario : clube,
      golos_casa: casaNos ? j.golos_marcados : j.golos_sofridos, golos_fora: casaNos ? j.golos_sofridos : j.golos_marcados, treinador_casa: null, treinador_fora: null, jogo_id: j.id, updated_at: j.data };
    dados.partidas.push(pN);
    const eN = dados.estatisticas_equipa.find(e => e.jogo_id === j.id && e.lado === 'nos').metricas, eA = dados.estatisticas_equipa.find(e => e.jogo_id === j.id && e.lado === 'adversario').metricas;
    linhaLiga(jornada, clube, j.adversario, j.local, j.golos_marcados, j.golos_sofridos, eN, j.data);
    linhaLiga(jornada, j.adversario, clube, casaNos ? 'fora' : 'casa', j.golos_sofridos, j.golos_marcados, eA, j.data);
    gerarOps({ partida_id: pN.id }, clube, nN, j.golos_marcados, { jogo_id: j.id, lado: 'nos' });
    gerarOps({ partida_id: pN.id }, j.adversario, nA, j.golos_sofridos, { jogo_id: j.id, lado: 'adversario' });
    // Os outros jogos da jornada (uma equipa folga, porque são 15).
    const outros = adversarios.filter(a => a !== j.adversario);
    const rodar = outros.slice(jornada % outros.length).concat(outros.slice(0, jornada % outros.length));
    for (let k = 0; k + 1 < rodar.length; k += 2) {
      const casa = rodar[k], fora = rodar[k + 1];
      const p = { id: uuid(), competicao: 'Liga', jornada, casa, fora, golos_casa: 0, golos_fora: 0, treinador_casa: null, treinador_fora: null, jogo_id: null, updated_at: j.data };
      const xc = r2(Math.max(0.2, entre(0.6, 1.8) * forca[casa] / forca[fora] * 1.08)), xf = r2(Math.max(0.2, entre(0.5, 1.6) * forca[fora] / forca[casa]));
      const gc = Math.max(0, Math.round(xc + entre(-0.9, 0.9))), gf = Math.max(0, Math.round(xf + entre(-0.9, 0.9)));
      p.golos_casa = gc; p.golos_fora = gf; dados.partidas.push(p);
      const [mc, mf] = parMetricas(metricasLiga(xc, gc, forca[casa] / forca[fora]), metricasLiga(xf, gf, forca[fora] / forca[casa]));
      linhaLiga(jornada, casa, fora, 'casa', gc, gf, mc, j.data); linhaLiga(jornada, fora, casa, 'fora', gf, gc, mf, j.data);
      gerarOps({ partida_id: p.id }, casa, Math.max(gc, inteiro(3, 10)), gc); gerarOps({ partida_id: p.id }, fora, Math.max(gf, inteiro(2, 9)), gf);
    }
  }

  // Esquemas táticos (cantos e livres) de todos os jogos do campeonato.
  for (const p of dados.partidas) {
    for (const [lado, equipa] of [['casa', p.casa], ['fora', p.fora]]) {
      const n = inteiro(5, 13); const golos = rnd() < 0.18 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const tipo = rnd() < 0.66 ? 'Canto' : 'Livre'; const ladoEP = tipo === 'Canto' ? (rnd() < 0.5 ? 'Esquerdo' : 'Direito') : escolher(['Esquerdo', 'Direito', 'Esquerdo', 'Direito', 'Centro']);
        const dist = tipo === 'Livre' ? escolher(['Curto', 'Médio', 'Médio', 'Longo']) : null;
        const mec = tipo === 'Canto' ? escolher(['Direto', 'Direto', 'Direto', 'Combinado']) : (ladoEP === 'Centro' && rnd() < 0.6 ? 'Direto' : escolher(['Cruzamento', 'Cruzamento', 'Combinado']));
        const zona = mec === 'Direto' && tipo === 'Livre' ? 'Baliza' : escolher(['Zona 1', 'Zona 1', 'Zona 2', 'Zona 2', 'Zona 3', 'Zona 3', 'Zona 4', 'Fora de área']);
        const golo = golos > 0 && k === n - 1 && zona !== 'Baliza';
        const contacto = golo ? 'Ataque' : zona === 'Baliza' ? 'Guarda-redes' : escolher(['Defesa', 'Defesa', 'Defesa', 'Ataque', 'Ataque', 'Guarda-redes', 'Fora']);
        const res = golo ? 'Golo' : contacto === 'Ataque' ? escolher(['Remate fora', 'Defesa GR', 'Remate bloqueado', 'Passe']) : contacto === 'Guarda-redes' ? escolher(['Corte GR', 'Defesa GR']) : contacto === 'Fora' ? null : escolher(['Corte defesa', 'Corte defesa', 'Falta atacante']);
        const sem = `${p.id}|${lado}|${k}`; const bat = pontoBatidaEP(tipo, ladoEP, dist, sem + 'b'), que = pontoQuedaEP(zona, ladoEP, sem + 'q');
        const el = elenco(equipa); const minuto = inteiro(2, 93);
        dados.eventos.push({ id: uuid(), partida_id: p.id, jogo_id: p.jogo_id || null, equipa, lado: p.jogo_id ? (equipa === clube ? 'nos' : 'adversario') : null,
          tipo: 'esquema_tatico', momento: 'Esquema tático', sub_momento: tipo, ep_tipo: tipo, corredor: ladoEP, distancia: dist, mecanismo: mec,
          tipo_bola: rnd() < 0.55 ? 'Fechado' : 'Aberto', primeiro_contacto: contacto, zona_ep: zona, resultado: res,
          segunda_vaga: res === 'Corte defesa' && rnd() < 0.25 ? escolher(['Remate fora', 'Corte defesa', 'Remate bloqueado']) : null,
          jogador: el[(k * 3 + equipa.length) % 4 + 6][0], referencia: el[(k * 5) % 3 + 2][0], minuto, tempo: tempoDoMinuto(minuto),
          zona_x: que?.x ?? null, zona_y: que?.y ?? null, passe_x: bat?.x ?? null, passe_y: bat?.y ?? null, local_aprox: false, origem: 'app', criado_por: 'demo', created_at: new Date().toISOString() });
      }
    }
  }

  // Próximos jogos (por disputar) e microciclos criados a partir do modelo.
  const ultimo = dados.jogos[dados.jogos.length - 1];
  [[adversarios[2], 'fora'], [adversarios[5], 'casa'], [adversarios[8], 'fora']].forEach(([adv, local], i) => {
    dados.jogos.push({ id: uuid(), data: new Date(Date.parse(ultimo.data) + (i + 1) * 7 * 86400000).toISOString().slice(0, 10), adversario: adv, competicao: 'Liga', jornada: jornada + i + 1, local, golos_marcados: null, golos_sofridos: null, notas: null, created_at: new Date().toISOString() });
  });
  dados.agenda = [];
  const n = dados.jogos.length;
  for (const j of [dados.jogos[n - 4], dados.jogos[n - 3]]) {
    for (const it of MODELO_PADRAO) {
      const data = new Date(Date.parse(j.data) + it.md * 86400000).toISOString().slice(0, 10);
      dados.agenda.push({ id: uuid(), tipo: it.tipo, titulo: it.titulo, data, hora_inicio: it.hora_inicio || null, hora_fim: it.hora_fim || null, local: it.tipo === 'treino' ? 'Campo 1' : it.tipo === 'reuniao' ? 'Sala de vídeo' : null,
        responsavel: it.responsavel || null, estado: it.tipo === 'tarefa' ? (j === dados.jogos[n - 4] ? 'feito' : 'por_fazer') : null, descricao: null, jogo_id: j.id, md: it.md, created_at: new Date().toISOString() });
    }
  }
  // Plantéis e onzes dos adversários (os últimos 3 jogos de cada equipa da liga).
  const nomesP = ['Tiago', 'Rúben', 'Diogo', 'André', 'Bruno', 'Pedro', 'Rafael', 'João', 'Miguel', 'Gonçalo', 'Nuno', 'Hugo', 'Fábio', 'Ricardo', 'Vítor', 'Leandro', 'Simão', 'Ivo', 'Kevin', 'Samuel', 'Lucas', 'Martim'];
  const apelidosAdv = ['Almeida', 'Costa', 'Ferreira', 'Rocha', 'Matos', 'Pinto', 'Carvalho', 'Nunes', 'Moreira', 'Lopes', 'Teixeira', 'Vieira', 'Fonseca', 'Barros', 'Cardoso', 'Neves', 'Brito', 'Faria', 'Mendes', 'Sousa', 'Tavares', 'Correia'];
  const quadro = [['Guarda-redes', 3], ['Defesa central', 4], ['Lateral direito', 2], ['Lateral esquerdo', 2], ['Médio defensivo', 2], ['Médio centro', 3], ['Médio ofensivo', 2], ['Extremo direito', 2], ['Extremo esquerdo', 2], ['Ponta de lança', 2]];
  dados.jogadores_adversarios = []; dados.onzes = [];
  for (const eq of adversarios) {
    const usados = new Set(); let num = 1; const lista = [];
    for (const [pos, n] of quadro) for (let k = 0; k < n; k++) {
      let nome; do { nome = `${escolher(nomesP)} ${escolher(apelidosAdv)}`; } while (usados.has(nome)); usados.add(nome);
      const titular = k === 0 || (pos === 'Defesa central' && k === 1) || (pos === 'Médio centro' && k === 1);
      const jogos = titular ? inteiro(7, 10) : inteiro(0, 6);
      const r = { id: uuid(), equipa: eq, nome, numero: pos === 'Guarda-redes' && k === 0 ? 1 : (num += inteiro(1, 4)) % 99, posicao: pos, data_nascimento: `${inteiro(1994, 2006)}-0${inteiro(1, 9)}-1${inteiro(0, 9)}`,
        altura: inteiro(pos === 'Guarda-redes' || pos === 'Defesa central' ? 182 : 168, pos === 'Guarda-redes' || pos === 'Defesa central' ? 196 : 186), pe: rnd() < 0.75 ? 'Direito' : 'Esquerdo', nacionalidade: 'Portugal', foto: null,
        jogos, minutos: jogos ? Math.round(jogos * entre(titular ? 70 : 15, titular ? 90 : 60)) : 0, golos: pos === 'Ponta de lança' || pos.startsWith('Extremo') ? inteiro(0, 4) : inteiro(0, 1), assistencias: inteiro(0, 3),
        atencao: false, notas: null, tm_id: null, tm_url: null, updated_at: new Date().toISOString() };
      lista.push(r);
    }
    const pl = lista.find(r => r.posicao === 'Ponta de lança'), ext = lista.find(r => r.posicao === 'Extremo direito');
    Object.assign(pl, { atencao: true, notas: 'Ataque à profundidade\nForte no jogo aéreo' }); Object.assign(ext, { atencao: true, notas: 'Duelos 1x1\nCruzamento rasteiro' });
    dados.jogadores_adversarios.push(...lista);
    const linhas = dados.estatisticas_liga.filter(l => l.equipa === eq).sort((a, b) => b.jornada - a.jornada).slice(0, 3);
    for (const l of linhas) {
      const sistema = escolher(['1-4-2-3-1', '1-4-3-3', '1-4-4-2']);
      const slots = FORMACOES[sistema];
      const livres = [...lista];
      const titulares = slots.map((s, i) => { const k = livres.findIndex(p => p.posicao === POS_PAPEL[s.p]) ; const p = livres.splice(k >= 0 ? k : 0, 1)[0]; return { slot: i, nome: p.nome, saiu: null, amarelo: rnd() < 0.12, vermelho: false }; });
      const banco = livres.slice(0, 9).map(p => ({ nome: p.nome, entrou: null, substituiu: null, amarelo: false }));
      [8, 9, 6].forEach((ti, k) => { const min = [62, 70, 81][k]; titulares[ti].saiu = min; banco[k + 2].entrou = min; banco[k + 2].substituiu = titulares[ti].nome; });
      dados.onzes.push({ id: uuid(), equipa: eq, competicao: l.competicao, jornada: l.jornada, rotulo: null, data: null, adversario: l.adversario, local: l.local, golos_pro: l.golos, golos_contra: l.golos_sofridos, sistema, titulares, banco, origem: 'manual', tm_url: null, created_at: new Date().toISOString() });
    }
  }
  for (const t of EPOCA_TABELAS) for (const r of dados[t] || []) r.epoca ||= '2026/27';
  return dados;
}
