// ---------- Acesso aos dados ----------
// Duas implementações com a mesma interface:
//   SupaDB  -> o vosso projeto Supabase
//   LocalDB -> modo de demonstração (dados de exemplo guardados no browser)

const TABELAS_CHAVE = { mapeamento_nomes: ['tipo', 'original'], simbolos_equipas: ['chave'] };
const BUCKET = 'exportacoes-wyscout';

class SupaDB {
  constructor(url, chave) {
    this.modo = 'supabase';
    this.url = url;
    this.sb = window.supabase.createClient(url, chave);
  }
  _ok({ data, error }) {
    if (error) throw new Error(traduzErro(error.message || String(error)));
    return data;
  }
  async sessao() { return this._ok(await this.sb.auth.getSession()).session; }
  async entrar(email, password) { this._ok(await this.sb.auth.signInWithPassword({ email, password })); }
  async sair() { try { await cacheIdb.limpar(); } catch { /* sem cache */ } await this.sb.auth.signOut(); }
  async perfil() {
    const { user } = this._ok(await this.sb.auth.getUser());
    const p = this._ok(await this.sb.from('perfis').select('*').eq('id', user.id).maybeSingle());
    return p || { id: user.id, email: user.email, papel: 'equipa_tecnica' };
  }
  // Lê tudo, página a página (o Supabase devolve no máximo 1000 linhas por pedido).
  // opcoes: colunas (por omissão todas), desde (só o alterado a partir desta data), em ([coluna, valores]).
  async listar(tabela, ordem = 'created_at', { colunas = '*', desde = null, em = null } = {}) {
    if (em) {
      const [col, vals] = em; let out = [];
      for (let i = 0; i < vals.length; i += 150) out = out.concat(this._ok(await this.sb.from(tabela).select(colunas).in(col, vals.slice(i, i + 150))));
      return out;
    }
    const pagina = 1000; let todas = []; let de = 0;
    for (;;) {
      let q = this.sb.from(tabela).select(colunas);
      if (desde) q = q.gte('updated_at', desde);
      q = q.order(ordem, { ascending: true });
      if (ordem !== 'id' && !TABELAS_CHAVE[tabela]) q = q.order('id', { ascending: true });
      const linhas = this._ok(await q.range(de, de + pagina - 1));
      todas = todas.concat(linhas);
      if (linhas.length < pagina) return todas;
      de += pagina;
    }
  }
  async upsert(tabela, linhas, onConflict) {
    this.escrevi = Date.now();
    linhas = linhas.map(l => comEpoca(tabela, l));
    let out = [];
    for (let i = 0; i < linhas.length; i += 500) {
      const parte = linhas.slice(i, i + 500);
      out = out.concat(this._ok(await this.sb.from(tabela).upsert(parte, { onConflict: conflitoComEscalao(tabela, onConflict) }).select()));
    }
    return out;
  }
  async inserir(tabela, linha) { this.escrevi = Date.now(); return this._ok(await this.sb.from(tabela).insert(comEpoca(tabela, linha)).select().single()); }
  async inserirVarios(tabela, linhas) {
    this.escrevi = Date.now();
    linhas = linhas.map(l => comEpoca(tabela, l));
    let out = [];
    for (let i = 0; i < linhas.length; i += 500) out = out.concat(this._ok(await this.sb.from(tabela).insert(linhas.slice(i, i + 500)).select()));
    return out;
  }
  async atualizar(tabela, filtro, patch) { this.escrevi = Date.now(); return this._ok(await this.sb.from(tabela).update(patch).match(filtro).select()); }
  async apagar(tabela, filtro) { this.escrevi = Date.now(); this._ok(await this.sb.from(tabela).delete().match(filtro)); }
  async carregarFicheiro(ficheiro) {
    const nome = ficheiro.name.normalize('NFD').replace(/[^\w.-]+/g, '_');
    const caminho = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${nome}`;
    this._ok(await this.sb.storage.from(BUCKET).upload(caminho, ficheiro, { upsert: false }));
    return caminho;
  }
  // Arquivo do pré-jogo (bucket próprio).
  async arquivoGuardar(caminho, ficheiro) { this._ok(await this.sb.storage.from('arquivo').upload(caminho, ficheiro, { upsert: true, contentType: ficheiro.type || 'application/pdf' })); return caminho; }
  async arquivoUrl(caminho) { const r = this._ok(await this.sb.storage.from('arquivo').createSignedUrl(caminho, 3600)); return r.signedUrl; }
  async arquivoApagar(caminho) { this._ok(await this.sb.storage.from('arquivo').remove([caminho])); }
}

function traduzErro(msg) {
  if (/Invalid login credentials/i.test(msg)) return 'Email ou palavra-passe incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Este email ainda não foi confirmado. Confirme-o no Supabase (Authentication > Users).';
  if (/row-level security/i.test(msg)) return 'Sem permissão: só utilizadores do departamento podem alterar dados.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Não foi possível ligar ao Supabase. Verifique a internet e o URL do projeto.';
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return 'As tabelas não existem. Corra o ficheiro schema.sql no Supabase (SQL Editor).';
  if (/agenda|modelo_microciclo/i.test(msg) && /does not exist|Could not find/i.test(msg)) return 'Falta atualizar a base de dados para o calendário. Corra outra vez o ficheiro schema.sql no Supabase (SQL Editor).';
  if (/column .*(tm_id|tm_url|nacionalidade)|'(tm_id|tm_url|nacionalidade)' column/i.test(msg)) return 'Falta atualizar a base de dados para o Transfermarkt. Corra outra vez o ficheiro schema.sql no Supabase (SQL Editor).';
  if (/column .*epoca|'epoca' column|epoca.*does not exist|no unique or exclusion constraint/i.test(msg)) return 'Falta atualizar a base de dados para as épocas. Corra outra vez o ficheiro schema.sql no Supabase (SQL Editor).';
  if (/simbolos_equipas|relatorio_equipa|tm_equipas|jogadores_adversarios|onzes|arquivo/i.test(msg) && /does not exist|Could not find|schema cache/i.test(msg)) return 'Falta atualizar a base de dados para esta opção. Corra outra vez o ficheiro schema.sql no Supabase (SQL Editor).';
  if (/Bucket not found/i.test(msg)) return 'O espaço de ficheiros não existe. Corra o ficheiro schema.sql no Supabase.';
  return msg;
}

class LocalDB {
  constructor() {
    this.modo = 'demo';
    this.dados = lsGet('analise_demo_v9') || null;
    if (!this.dados) { this.dados = gerarDemo(); this._guardar(); }
    for (const t of EPOCA_TABELAS) for (const r of this.dados[t] || []) r.epoca ||= epocaDaLinha(r);
  }
  _guardar() { lsSet('analise_demo_v9', this.dados); }
  _t(tabela) { return (this.dados[tabela] ||= []); }
  async sessao() { return { demo: true }; }
  async entrar() {}
  async sair() {}
  // Na demonstração dá para experimentar o papel de colaborador (localStorage analise_demo_papel = 'colaborador').
  async perfil() { let papel = 'departamento'; try { if (localStorage.getItem('analise_demo_papel') === 'colaborador') papel = 'colaborador'; } catch { /* sem armazenamento */ } return { id: 'demo', email: 'demonstracao@clube.pt', papel }; }
  async listar(tabela, ordem = 'created_at') {
    const l = this._t(tabela).map(r => structuredClone(r));
    return l.sort((a, b) => String(a[ordem] ?? '').localeCompare(String(b[ordem] ?? '')));
  }
  _completar(tabela, linha) {
    const agora = new Date().toISOString();
    const r = { ...comEpoca(tabela, linha) };
    if (!TABELAS_CHAVE[tabela] && !r.id) r.id = uuid();
    if (!('created_at' in r) && tabela !== 'configuracao' && !TABELAS_CHAVE[tabela]) r.created_at = agora;
    if (tabela.startsWith('estatisticas')) r.updated_at = agora;
    return r;
  }
  async upsert(tabela, linhas, onConflict) {
    const chaves = conflitoComEscalao(tabela, onConflict).split(',').map(s => s.trim());
    const t = this._t(tabela); const out = [];
    for (let linha of linhas) {
      linha = comEpoca(tabela, linha);
      const ex = t.find(r => chaves.every(k => (k === 'escalao' ? escalaoDaLinha(r) === escalaoDaLinha(linha) : String(r[k]) === String(linha[k]))));
      if (ex) { Object.assign(ex, linha); if (tabela.startsWith('estatisticas')) ex.updated_at = new Date().toISOString(); out.push(structuredClone(ex)); }
      else { const n = this._completar(tabela, linha); t.push(n); out.push(structuredClone(n)); }
    }
    this._guardar(); return out;
  }
  async inserir(tabela, linha) {
    const n = this._completar(tabela, linha); this._t(tabela).push(n); this._guardar(); return structuredClone(n);
  }
  async inserirVarios(tabela, linhas) { const t = this._t(tabela); const out = linhas.map(l => { const n = this._completar(tabela, l); t.push(n); return structuredClone(n); }); this._guardar(); return out; }
  async atualizar(tabela, filtro, patch) {
    const out = [];
    for (const r of this._t(tabela)) {
      if (Object.entries(filtro).every(([k, v]) => String(r[k]) === String(v))) { Object.assign(r, patch); out.push(structuredClone(r)); }
    }
    this._guardar(); return out;
  }
  async apagar(tabela, filtro) {
    const corresponde = r => Object.entries(filtro).every(([k, v]) => String(r[k]) === String(v));
    const apagados = this._t(tabela).filter(corresponde);
    this.dados[tabela] = this._t(tabela).filter(r => !corresponde(r));
    if (tabela === 'jogos') { // apagar em cascata, como no Supabase
      const ids = new Set(apagados.map(r => r.id));
      for (const t of ['estatisticas_equipa', 'estatisticas_jogador', 'eventos']) this.dados[t] = this._t(t).filter(r => !ids.has(r.jogo_id));
    }
    this._guardar();
  }
  async carregarFicheiro(f) { return `demonstracao/${f.name}`; }
  // Na demonstração os PDF do arquivo ficam só em memória (perdem-se ao recarregar a página).
  async arquivoGuardar(caminho, ficheiro) { (this.ficheiros ||= {})[caminho] = URL.createObjectURL(ficheiro); return caminho; }
  async arquivoUrl(caminho) { const u = this.ficheiros?.[caminho]; if (!u) throw new Error('Na demonstração o PDF só fica disponível até recarregar a página.'); return u; }
  async arquivoApagar(caminho) { if (this.ficheiros) delete this.ficheiros[caminho]; }
  repor() { this.dados = gerarDemo(); this._guardar(); }
}
