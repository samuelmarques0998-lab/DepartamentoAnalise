-- =====================================================================
-- Departamento de Análise — esquema da base de dados (Supabase)
-- Correr uma vez no Supabase: SQL Editor > New query > colar > Run.
-- Pode voltar a ser corrido sem apagar dados (usa IF NOT EXISTS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfis: cada utilizador do Supabase Auth tem um papel.
--   departamento   -> importa, codifica e edita
--   equipa_tecnica -> consulta
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nome       text,
  papel      text not null default 'equipa_tecnica'
             check (papel in ('departamento', 'equipa_tecnica')),
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um utilizador é criado no Auth.
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_utilizador on auth.users;
create trigger ao_criar_utilizador
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Utilizadores que já existiam antes deste script.
insert into public.perfis (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.e_departamento()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis where id = auth.uid() and papel = 'departamento'
  );
$$;

-- ---------------------------------------------------------------------
-- Configuração (uma só linha): nome do clube, métricas-chave, critérios.
-- ---------------------------------------------------------------------
create table if not exists public.configuracao (
  id             int primary key default 1 check (id = 1),
  nome_clube     text not null default '',
  nomes_alternativos text[] not null default '{}',
  metricas_chave text[] not null default '{}',
  criterios      jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);
insert into public.configuracao (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Jogos
-- ---------------------------------------------------------------------
create table if not exists public.jogos (
  id              uuid primary key default gen_random_uuid(),
  data            date not null,
  adversario      text not null,
  competicao      text,
  local           text check (local in ('casa', 'fora', 'neutro')),
  golos_marcados  int,
  golos_sofridos  int,
  notas           text,
  created_at      timestamptz not null default now(),
  unique (data, adversario)
);
create index if not exists jogos_data_idx on public.jogos (data desc);

-- Jogos identificados pela jornada (ficheiros sem data, como o da liga).
alter table public.jogos add column if not exists jornada int;
alter table public.jogos alter column data drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname in ('jogos_comp_jornada_adv_key', 'jogos_epoca_comp_jornada_adv_key')) then
    alter table public.jogos add constraint jogos_comp_jornada_adv_key unique (competicao, jornada, adversario);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Registo de cada ficheiro importado (o original fica no Storage).
-- ---------------------------------------------------------------------
create table if not exists public.importacoes (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('equipa', 'jogadores', 'liga', 'oportunidades')),
  ficheiro        text not null,
  caminho_storage text,
  linhas          int,
  resumo          jsonb not null default '{}'::jsonb,
  criado_por      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);

alter table public.importacoes drop constraint if exists importacoes_tipo_check;
alter table public.importacoes add constraint importacoes_tipo_check check (tipo in ('equipa', 'jogadores', 'liga', 'oportunidades', 'esquemas'));

-- ---------------------------------------------------------------------
-- Estatísticas Wyscout por jogo e por equipa.
-- As métricas ficam em JSON: se o Wyscout acrescentar colunas, nada parte.
-- ---------------------------------------------------------------------
create table if not exists public.estatisticas_equipa (
  id            uuid primary key default gen_random_uuid(),
  jogo_id       uuid not null references public.jogos(id) on delete cascade,
  lado          text not null check (lado in ('nos', 'adversario')),
  equipa        text,
  metricas      jsonb not null default '{}'::jsonb,
  importacao_id uuid references public.importacoes(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (jogo_id, lado)
);

-- Estatísticas Wyscout por jogo e por jogador.
create table if not exists public.estatisticas_jogador (
  id            uuid primary key default gen_random_uuid(),
  jogo_id       uuid not null references public.jogos(id) on delete cascade,
  jogador       text not null,
  lado          text not null default 'nos' check (lado in ('nos', 'adversario')),
  equipa        text,
  posicao       text,
  minutos       numeric,
  metricas      jsonb not null default '{}'::jsonb,
  importacao_id uuid references public.importacoes(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (jogo_id, jogador, lado)
);
create index if not exists estat_jogador_nome_idx on public.estatisticas_jogador (jogador);

-- ---------------------------------------------------------------------
-- Estatísticas de todas as equipas da liga, jornada a jornada
-- (para comparar com a média da liga e calcular a classificação).
-- ---------------------------------------------------------------------
create table if not exists public.estatisticas_liga (
  id             uuid primary key default gen_random_uuid(),
  competicao     text not null,
  jornada        int not null,
  equipa         text not null,
  adversario     text,
  local          text,
  golos          int,
  golos_sofridos int,
  metricas       jsonb not null default '{}'::jsonb,
  importacao_id  uuid references public.importacoes(id) on delete set null,
  updated_at     timestamptz not null default now(),
  unique (competicao, jornada, equipa, adversario)
);

-- ---------------------------------------------------------------------
-- Jogos do campeonato (todas as equipas), criados ao importar o ficheiro
-- da liga. jogo_id liga o jogo do campeonato ao jogo do SCUT.
-- ---------------------------------------------------------------------
create table if not exists public.partidas (
  id             uuid primary key default gen_random_uuid(),
  competicao     text not null,
  jornada        int,
  casa           text not null,
  fora           text not null,
  golos_casa     int,
  golos_fora     int,
  treinador_casa text,
  treinador_fora text,
  jogo_id        uuid references public.jogos(id) on delete set null,
  updated_at     timestamptz not null default now(),
  unique (competicao, casa, fora)
);

-- ---------------------------------------------------------------------
-- Eventos codificados pelo departamento.
-- Coordenadas em % do campo (0–100), sempre do ponto de vista da equipa
-- que realiza a ação, a atacar da esquerda para a direita.
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id           uuid primary key default gen_random_uuid(),
  jogo_id      uuid not null references public.jogos(id) on delete cascade,
  tipo         text not null check (tipo in ('oportunidade', 'esquema_tatico')),
  lado         text not null check (lado in ('nos', 'adversario')),
  minuto       int check (minuto between 0 and 130),
  parte        text,
  momento      text,
  subtipo      text,
  qualidade    text,
  ultima_acao  text,
  finalizacao  text,
  resultado    text,
  zona_x       numeric check (zona_x between 0 and 100),
  zona_y       numeric check (zona_y between 0 and 100),
  jogador      text,
  assistente   text,
  video_url    text,
  notas        text,
  criado_por   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists eventos_jogo_idx on public.eventos (jogo_id);

-- Codificação de todos os jogos do campeonato (método do departamento):
-- cada oportunidade pertence a um jogo do campeonato e a uma equipa.
alter table public.eventos alter column jogo_id drop not null;
alter table public.eventos alter column lado drop not null;
alter table public.eventos add column if not exists partida_id uuid references public.partidas(id) on delete set null;
alter table public.eventos add column if not exists equipa text;
alter table public.eventos add column if not exists sub_momento text;
alter table public.eventos add column if not exists mecanismo text;
alter table public.eventos add column if not exists corredor text;
alter table public.eventos add column if not exists tempo text;
alter table public.eventos add column if not exists passe_x numeric;
alter table public.eventos add column if not exists passe_y numeric;
alter table public.eventos add column if not exists posicao_passe text;
alter table public.eventos add column if not exists posicao_finalizador text;
-- Oportunidades importadas da folha antiga: o local é aproximado (dentro da zona codificada).
alter table public.eventos add column if not exists local_aprox boolean not null default false;
alter table public.eventos add column if not exists origem text;
create index if not exists eventos_partida_idx on public.eventos (partida_id);

-- ---------------------------------------------------------------------
-- Plantel: dados de cada jogador.
-- nome_wyscout liga o jogador às estatísticas (ex.: "M. Viana").
-- A fotografia fica guardada como imagem pequena (data URL, ~15 KB).
-- ---------------------------------------------------------------------
create table if not exists public.jogadores (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null unique,
  numero          int check (numero between 0 and 99),
  posicao         text,
  data_nascimento date,
  altura          int check (altura between 120 and 230),
  pe              text check (pe in ('Direito', 'Esquerdo', 'Ambos')),
  nome_wyscout    text,
  foto            text,
  notas           text,
  created_at      timestamptz not null default now()
);

-- Ligação ao Transfermarkt (importação de jogadores).
alter table public.jogadores add column if not exists tm_id text;
alter table public.jogadores add column if not exists tm_url text;
alter table public.jogadores add column if not exists nacionalidade text;
create unique index if not exists jogadores_tm_id_idx on public.jogadores (tm_id) where tm_id is not null;

-- ---------------------------------------------------------------------
-- Calendário: treinos, reuniões e tarefas do departamento.
-- jogo_id + md ligam o evento ao microciclo de um jogo (md = dias em relação
-- ao jogo: -3 = MD-3, 1 = MD+1).
-- ---------------------------------------------------------------------
create table if not exists public.agenda (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('treino', 'reuniao', 'tarefa', 'outro')),
  titulo      text not null,
  data        date not null,
  hora_inicio time,
  hora_fim    time,
  local       text,
  responsavel text,
  estado      text check (estado in ('por_fazer', 'em_curso', 'feito')),
  descricao   text,
  jogo_id     uuid references public.jogos(id) on delete set null,
  md          int,
  created_at  timestamptz not null default now()
);
create index if not exists agenda_data_idx on public.agenda (data);

-- Semana-tipo usada para criar o microciclo de cada jogo.
alter table public.configuracao add column if not exists modelo_microciclo jsonb;

-- ---------------------------------------------------------------------
-- Correspondência de nomes (ex.: "SL Benfica" -> "Benfica").
-- ---------------------------------------------------------------------
create table if not exists public.mapeamento_nomes (
  tipo        text not null check (tipo in ('equipa', 'jogador')),
  original    text not null,
  normalizado text not null,
  primary key (tipo, original)
);


-- ---------------------------------------------------------------------
-- Plantéis dos adversários (importados do Transfermarkt ou introduzidos à mão).
-- ---------------------------------------------------------------------
create table if not exists public.jogadores_adversarios (
  id              uuid primary key default gen_random_uuid(),
  equipa          text not null,
  nome            text not null,
  numero          int check (numero between 0 and 99),
  posicao         text,
  data_nascimento date,
  altura          int,
  pe              text,
  nacionalidade   text,
  foto            text,
  jogos           int,
  minutos         int,
  golos           int,
  assistencias    int,
  atencao         boolean not null default false,
  notas           text,
  tm_id           text,
  tm_url          text,
  updated_at      timestamptz not null default now(),
  unique (equipa, nome)
);
create index if not exists jogadores_adversarios_equipa_idx on public.jogadores_adversarios (equipa);

-- Onzes dos adversários (sistema, titulares, banco, substituições e cartões).
create table if not exists public.onzes (
  id            uuid primary key default gen_random_uuid(),
  equipa        text not null,
  competicao    text,
  jornada       int,
  rotulo        text,
  data          date,
  adversario    text,
  local         text check (local in ('casa', 'fora')),
  golos_pro     int,
  golos_contra  int,
  sistema       text,
  titulares     jsonb not null default '[]',
  banco         jsonb not null default '[]',
  origem        text not null default 'manual',
  tm_url        text,
  created_at    timestamptz not null default now()
);
create index if not exists onzes_equipa_idx on public.onzes (equipa);

-- Links do Transfermarkt de cada equipa (para voltar a importar o plantel).
alter table public.configuracao add column if not exists tm_equipas jsonb not null default '{}';


-- ---------------------------------------------------------------------
-- Arquivo do pré-jogo, por jornada: relatório estatístico (PDF no Storage)
-- e relatório de observação (vídeo no YouTube).
-- ---------------------------------------------------------------------
create table if not exists public.arquivo (
  id             uuid primary key default gen_random_uuid(),
  competicao     text not null,
  jornada        int not null,
  adversario     text,
  tipo           text not null check (tipo in ('estatistico', 'observacao')),
  caminho        text,
  ficheiro_nome  text,
  tamanho        bigint,
  video_url      text,
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (competicao, jornada, tipo)
);

-- ---------------------------------------------------------------------
-- Segurança (Row Level Security)
-- Todos os utilizadores autenticados leem; só o departamento escreve.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['configuracao','jogos','importacoes','estatisticas_equipa',
                           'estatisticas_jogador','eventos','mapeamento_nomes','jogadores','estatisticas_liga','agenda','partidas',
                           'jogadores_adversarios','onzes','arquivo']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- Só o departamento lê e escreve (uma conta sem o papel de departamento não vê nada).
    execute format('drop policy if exists "ler autenticados" on public.%I', t);
    execute format('drop policy if exists "ler departamento" on public.%I', t);
    execute format('drop policy if exists "escrever departamento" on public.%I', t);
    execute format('create policy "ler departamento" on public.%I for select to authenticated using (public.e_departamento())', t);
    execute format('create policy "escrever departamento" on public.%I for all to authenticated
                    using (public.e_departamento()) with check (public.e_departamento())', t);
  end loop;
end $$;

alter table public.perfis enable row level security;
drop policy if exists "ver perfis" on public.perfis;
create policy "ver perfis" on public.perfis for select to authenticated
  using (id = auth.uid() or public.e_departamento());
drop policy if exists "gerir perfis" on public.perfis;
create policy "gerir perfis" on public.perfis for update to authenticated
  using (public.e_departamento()) with check (public.e_departamento());

-- ---------------------------------------------------------------------
-- Storage: guarda os ficheiros originais exportados do Wyscout.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('exportacoes-wyscout', 'exportacoes-wyscout', false)
on conflict (id) do nothing;

drop policy if exists "exportacoes ler" on storage.objects;
create policy "exportacoes ler" on storage.objects for select to authenticated
  using (bucket_id = 'exportacoes-wyscout' and public.e_departamento());
drop policy if exists "exportacoes escrever" on storage.objects;
create policy "exportacoes escrever" on storage.objects for insert to authenticated
  with check (bucket_id = 'exportacoes-wyscout' and public.e_departamento());

-- Storage do arquivo (PDF dos relatórios estatísticos).
insert into storage.buckets (id, name, public)
values ('arquivo', 'arquivo', false)
on conflict (id) do nothing;
drop policy if exists "arquivo ler" on storage.objects;
create policy "arquivo ler" on storage.objects for select to authenticated
  using (bucket_id = 'arquivo' and public.e_departamento());
drop policy if exists "arquivo escrever" on storage.objects;
create policy "arquivo escrever" on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivo' and public.e_departamento());
drop policy if exists "arquivo alterar" on storage.objects;
create policy "arquivo alterar" on storage.objects for update to authenticated
  using (bucket_id = 'arquivo' and public.e_departamento()) with check (bucket_id = 'arquivo' and public.e_departamento());
drop policy if exists "arquivo apagar" on storage.objects;
create policy "arquivo apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'arquivo' and public.e_departamento());

-- ---------------------------------------------------------------------
-- DEPOIS DE CRIAR O SEU UTILIZADOR (Authentication > Users > Add user),
-- dê-lhe o papel de departamento, trocando o email:
--
--   update public.perfis set papel = 'departamento'
--   where email = 'o.seu.email@clube.pt';
-- ---------------------------------------------------------------------

-- Métricas escolhidas para o relatório pós-jogo (partilhadas por todo o departamento).
alter table public.configuracao add column if not exists relatorio_equipa jsonb;
-- Símbolos das equipas (imagens pequenas) para os rankings do campeonato.
alter table public.configuracao add column if not exists simbolos_equipas jsonb;

-- Esquemas táticos (cantos e livres): campos próprios na tabela de eventos.
alter table public.eventos add column if not exists ep_tipo text;
alter table public.eventos add column if not exists distancia text;
alter table public.eventos add column if not exists tipo_bola text;
alter table public.eventos add column if not exists primeiro_contacto text;
alter table public.eventos add column if not exists zona_ep text;
alter table public.eventos add column if not exists segunda_vaga text;
alter table public.eventos add column if not exists referencia text;
create index if not exists eventos_partida_idx on public.eventos (partida_id);

-- =====================================================================
-- Épocas (2026/27, 2027/28, …): cada época fica separada.
-- A época começa a 1 de julho. Os dados que já existem ficam em 2026/27
-- (ou na época da data do jogo, quando a há).
-- =====================================================================
create or replace function public.epoca_de(d date) returns text language sql immutable as $$
  select case when extract(month from d) >= 7
    then extract(year from d)::int || '/' || lpad(((extract(year from d)::int + 1) % 100)::text, 2, '0')
    else (extract(year from d)::int - 1) || '/' || lpad((extract(year from d)::int % 100)::text, 2, '0') end
$$;

alter table public.jogos             add column if not exists epoca text;
alter table public.partidas          add column if not exists epoca text;
alter table public.estatisticas_liga add column if not exists epoca text;
alter table public.onzes             add column if not exists epoca text;
alter table public.arquivo           add column if not exists epoca text;

update public.jogos             set epoca = coalesce(public.epoca_de(data), '2026/27') where epoca is null;
update public.onzes             set epoca = coalesce(public.epoca_de(data), '2026/27') where epoca is null;
update public.partidas          set epoca = '2026/27' where epoca is null;
update public.estatisticas_liga set epoca = '2026/27' where epoca is null;
update public.arquivo           set epoca = '2026/27' where epoca is null;

-- As chaves únicas por competição passam a incluir a época
-- (a J1 de 2027/28 não substitui a J1 de 2026/27).
do $$
declare r record;
begin
  for r in
    select c.conname, t.relname
    from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and c.contype = 'u'
      and t.relname in ('jogos', 'partidas', 'estatisticas_liga', 'arquivo')
      and exists (select 1 from pg_attribute a where a.attrelid = t.oid and a.attnum = any(c.conkey) and a.attname = 'competicao')
      and not exists (select 1 from pg_attribute a where a.attrelid = t.oid and a.attnum = any(c.conkey) and a.attname = 'epoca')
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'jogos_epoca_comp_jornada_adv_key') then
    alter table public.jogos add constraint jogos_epoca_comp_jornada_adv_key unique (epoca, competicao, jornada, adversario);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'partidas_epoca_comp_casa_fora_key') then
    alter table public.partidas add constraint partidas_epoca_comp_casa_fora_key unique (epoca, competicao, casa, fora);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estatisticas_liga_epoca_key') then
    alter table public.estatisticas_liga add constraint estatisticas_liga_epoca_key unique (epoca, competicao, jornada, equipa, adversario);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'arquivo_epoca_comp_jornada_tipo_key') then
    alter table public.arquivo add constraint arquivo_epoca_comp_jornada_tipo_key unique (epoca, competicao, jornada, tipo);
  end if;
end $$;

-- Estatísticas do jogo (ficheiro Wyscout da equipa) guardadas em cada onze.
alter table public.onzes add column if not exists estatisticas jsonb;

-- Recarregar a cache da API para ela ver as colunas novas.
-- ---------------------------------------------------------------------
-- Colaborador: vê toda a aplicação, com estas restrições:
--   * calendário: só vê as suas tarefas e só cria/altera tarefas atribuídas a si;
--   * jogadores (plantel próprio) e definições: só leitura;
--   * importação: sem acesso (as tabelas que só a importação escreve ficam só de leitura).
-- Pode codificar oportunidades e esquemas, preencher observação, arquivo e jogos.
-- Para dar o papel: update public.perfis set papel = 'colaborador' where email = '...';
-- ---------------------------------------------------------------------
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check check (papel in ('departamento', 'equipa_tecnica', 'colaborador'));

create or replace function public.e_colaborador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'colaborador');
$$;

-- Tarefas atribuídas a uma pessoa (o colaborador só vê e mexe nas suas).
alter table public.agenda add column if not exists atribuido_a uuid references public.perfis(id) on delete set null;

do $$
declare t text;
begin
  -- Leitura de tudo (menos a agenda, tratada à parte).
  foreach t in array array['configuracao','jogos','importacoes','estatisticas_equipa','estatisticas_jogador','eventos','mapeamento_nomes',
                           'jogadores','estatisticas_liga','partidas','jogadores_adversarios','onzes','arquivo']
  loop
    execute format('drop policy if exists "ler colaborador" on public.%I', t);
    execute format('create policy "ler colaborador" on public.%I for select to authenticated using (public.e_colaborador())', t);
  end loop;
  -- Criar e editar (nunca apagar) no que é codificação, observação, arquivo e jogos.
  foreach t in array array['jogos','eventos','partidas','mapeamento_nomes','onzes','arquivo','jogadores_adversarios']
  loop
    execute format('drop policy if exists "escrever colaborador" on public.%I', t);
    execute format('drop policy if exists "criar colaborador" on public.%I', t);
    execute format('drop policy if exists "editar colaborador" on public.%I', t);
    execute format('create policy "criar colaborador" on public.%I for insert to authenticated with check (public.e_colaborador())', t);
    execute format('create policy "editar colaborador" on public.%I for update to authenticated
                    using (public.e_colaborador()) with check (public.e_colaborador())', t);
  end loop;
end $$;

drop policy if exists "agenda colaborador" on public.agenda;
drop policy if exists "agenda colaborador ler" on public.agenda;
drop policy if exists "agenda colaborador criar" on public.agenda;
drop policy if exists "agenda colaborador editar" on public.agenda;
create policy "agenda colaborador ler" on public.agenda for select to authenticated
  using (public.e_colaborador() and tipo = 'tarefa' and atribuido_a = auth.uid());
create policy "agenda colaborador criar" on public.agenda for insert to authenticated
  with check (public.e_colaborador() and tipo = 'tarefa' and atribuido_a = auth.uid());
create policy "agenda colaborador editar" on public.agenda for update to authenticated
  using (public.e_colaborador() and tipo = 'tarefa' and atribuido_a = auth.uid())
  with check (public.e_colaborador() and tipo = 'tarefa' and atribuido_a = auth.uid());

drop policy if exists "arquivo ler colaborador" on storage.objects;
create policy "arquivo ler colaborador" on storage.objects for select to authenticated
  using (bucket_id = 'arquivo' and public.e_colaborador());
drop policy if exists "arquivo escrever colaborador" on storage.objects;
create policy "arquivo escrever colaborador" on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivo' and public.e_colaborador());
drop policy if exists "arquivo alterar colaborador" on storage.objects;
create policy "arquivo alterar colaborador" on storage.objects for update to authenticated
  using (bucket_id = 'arquivo' and public.e_colaborador()) with check (bucket_id = 'arquivo' and public.e_colaborador());

-- Primeiro jogo da equipa técnica atual (separa os dados em "antes" e "desde").
alter table public.configuracao add column if not exists inicio_equipa_tecnica date;

-- Estatísticas Wyscout de adversários de fora da liga (Team stats, com as duas linhas de cada jogo).
create table if not exists public.estatisticas_adversario (
  id             uuid primary key default gen_random_uuid(),
  epoca          text,
  equipa         text not null,
  data           date not null,
  jogo           text,
  competicao     text,
  local          text check (local in ('casa', 'fora')),
  adversario     text not null,
  golos          integer,
  golos_sofridos integer,
  metricas       jsonb not null default '{}'::jsonb,
  metricas_adv   jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (epoca, equipa, data, adversario)
);
create index if not exists estatisticas_adversario_equipa_idx on public.estatisticas_adversario (equipa);
alter table public.estatisticas_adversario enable row level security;
drop policy if exists "ler departamento" on public.estatisticas_adversario;
drop policy if exists "escrever departamento" on public.estatisticas_adversario;
drop policy if exists "ler colaborador" on public.estatisticas_adversario;
drop policy if exists "escrever colaborador" on public.estatisticas_adversario;
create policy "ler departamento" on public.estatisticas_adversario for select to authenticated using (public.e_departamento());
create policy "escrever departamento" on public.estatisticas_adversario for all to authenticated using (public.e_departamento()) with check (public.e_departamento());
create policy "ler colaborador" on public.estatisticas_adversario for select to authenticated using (public.e_colaborador());
drop policy if exists "criar colaborador" on public.estatisticas_adversario;
drop policy if exists "editar colaborador" on public.estatisticas_adversario;
create policy "criar colaborador" on public.estatisticas_adversario for insert to authenticated with check (public.e_colaborador());
create policy "editar colaborador" on public.estatisticas_adversario for update to authenticated using (public.e_colaborador()) with check (public.e_colaborador());

-- Conclusões escolhidas e editadas no relatório pré-jogo, por adversário.
alter table public.configuracao add column if not exists conclusoes_pre jsonb not null default '{}'::jsonb;

-- Equipa (escalão): Equipa Principal ou Sub-23. As chaves únicas passam a incluir o escalão.
do $$
declare t text;
begin
  foreach t in array array['jogos','partidas','estatisticas_liga','onzes','arquivo','estatisticas_adversario','jogadores','jogadores_adversarios','agenda','importacoes'] loop
    execute format('alter table public.%I add column if not exists escalao text not null default ''principal''', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_escalao_check');
    execute format('alter table public.%I add constraint %I check (escalao in (''principal'',''sub23''))', t, t || '_escalao_check');
  end loop;
end $$;
alter table public.configuracao add column if not exists por_escalao jsonb not null default '{}'::jsonb;
alter table public.jogos drop constraint if exists jogos_epoca_comp_jornada_adv_key;
alter table public.jogos drop constraint if exists jogos_data_adversario_key;
alter table public.jogos add constraint jogos_epoca_comp_jornada_adv_key unique (escalao, epoca, competicao, jornada, adversario);
alter table public.jogos add constraint jogos_data_adversario_key unique (escalao, data, adversario);
alter table public.estatisticas_liga drop constraint if exists estatisticas_liga_epoca_key;
alter table public.estatisticas_liga add constraint estatisticas_liga_epoca_key unique (escalao, epoca, competicao, jornada, equipa, adversario);
alter table public.partidas drop constraint if exists partidas_epoca_comp_casa_fora_key;
alter table public.partidas add constraint partidas_epoca_comp_casa_fora_key unique (escalao, epoca, competicao, casa, fora);
alter table public.arquivo drop constraint if exists arquivo_epoca_comp_jornada_tipo_key;
alter table public.arquivo add constraint arquivo_epoca_comp_jornada_tipo_key unique (escalao, epoca, competicao, jornada, tipo);
alter table public.estatisticas_adversario drop constraint if exists estatisticas_adversario_epoca_equipa_data_adversario_key;
alter table public.estatisticas_adversario add constraint estatisticas_adversario_epoca_equipa_data_adversario_key unique (escalao, epoca, equipa, data, adversario);
alter table public.jogadores drop constraint if exists jogadores_nome_key;
alter table public.jogadores add constraint jogadores_nome_key unique (escalao, nome);
alter table public.jogadores_adversarios drop constraint if exists jogadores_adversarios_equipa_nome_key;
alter table public.jogadores_adversarios add constraint jogadores_adversarios_equipa_nome_key unique (escalao, equipa, nome);

-- Segundos do minuto nos esquemas táticos (ex.: 35:20).
alter table eventos add column if not exists segundo smallint check (segundo between 0 and 59);

-- Atualização automática (Supabase Realtime).
alter publication supabase_realtime add table agenda, arquivo, configuracao, estatisticas_adversario, estatisticas_equipa, estatisticas_jogador, estatisticas_liga, eventos, jogadores, jogadores_adversarios, jogos, mapeamento_nomes, onzes, partidas;

-- Esquemas táticos: tipo de defesa (cantos contra) e jogadores marcados HxH (cantos a favor).
alter table eventos add column if not exists tipo_defesa text, add column if not exists hxh text[];


-- Símbolos das equipas numa tabela própria (antes viviam todos em configuracao.simbolos_equipas).
create table if not exists public.simbolos_equipas (
  chave text primary key,
  imagem text not null,
  updated_at timestamptz not null default now()
);
alter table public.simbolos_equipas enable row level security;
drop policy if exists "ler simbolos" on public.simbolos_equipas;
drop policy if exists "inserir simbolos" on public.simbolos_equipas;
drop policy if exists "alterar simbolos" on public.simbolos_equipas;
drop policy if exists "apagar simbolos" on public.simbolos_equipas;
create policy "ler simbolos" on public.simbolos_equipas for select to authenticated using ((select public.e_departamento()) or (select public.e_colaborador()));
create policy "inserir simbolos" on public.simbolos_equipas for insert to authenticated with check ((select public.e_departamento()) or (select public.e_colaborador()));
create policy "alterar simbolos" on public.simbolos_equipas for update to authenticated using ((select public.e_departamento()) or (select public.e_colaborador())) with check ((select public.e_departamento()) or (select public.e_colaborador()));
create policy "apagar simbolos" on public.simbolos_equipas for delete to authenticated using ((select public.e_departamento()));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'simbolos_equipas') then
    alter publication supabase_realtime add table public.simbolos_equipas;
  end if;
exception when undefined_object then null; end $$;

-- Data da última cópia de segurança (para o aviso semanal).
alter table public.configuracao add column if not exists ultima_copia timestamptz;


-- updated_at em todas as tabelas da app, sempre marcado pela base de dados: permite à app guardar os dados no browser
-- e, ao abrir, pedir só o que mudou desde a última vez.
alter table public.eventos add column if not exists updated_at timestamptz not null default now();
alter table public.jogos add column if not exists updated_at timestamptz not null default now();
alter table public.jogadores add column if not exists updated_at timestamptz not null default now();
alter table public.onzes add column if not exists updated_at timestamptz not null default now();
alter table public.agenda add column if not exists updated_at timestamptz not null default now();
alter table public.importacoes add column if not exists updated_at timestamptz not null default now();
alter table public.mapeamento_nomes add column if not exists updated_at timestamptz not null default now();
create or replace function public.tocar_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['agenda','arquivo','configuracao','estatisticas_adversario','estatisticas_equipa','estatisticas_jogador','estatisticas_liga',
                           'eventos','importacoes','jogadores','jogadores_adversarios','jogos','mapeamento_nomes','onzes','partidas','simbolos_equipas'] loop
    execute format('drop trigger if exists tocar_updated_at on public.%I', t);
    execute format('create trigger tocar_updated_at before insert or update on public.%I for each row execute function public.tocar_updated_at()', t);
  end loop;
end $$;
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;


-- Scout (só o departamento): jogadores de outras equipas (Transfermarkt + Wyscout) e a avaliação de cada um.
create table if not exists public.scout_jogadores (
  id uuid primary key default gen_random_uuid(),
  equipa text not null,
  nome text not null,
  nome_wyscout text,
  posicao text, numero int, nascimento date, idade int, nacionalidade text, pe text, altura int,
  valor_mercado text, contrato text, foto text, tm_id text, tm_url text,
  wyscout jsonb, wyscout_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scout_jogadores_equipa on public.scout_jogadores (equipa);
create table if not exists public.scout_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  jogador_id uuid not null references public.scout_jogadores(id) on delete cascade,
  rendimento smallint check (rendimento between 1 and 9),
  potencial smallint check (potencial between 1 and 9),
  margem_venda smallint check (margem_venda between 1 and 3),
  comentario text,
  autor uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scout_avaliacoes_jogador on public.scout_avaliacoes (jogador_id);
alter table public.scout_jogadores enable row level security;
alter table public.scout_avaliacoes enable row level security;
drop policy if exists "scout departamento" on public.scout_jogadores;
drop policy if exists "scout departamento" on public.scout_avaliacoes;
create policy "scout departamento" on public.scout_jogadores for all to authenticated using ((select public.e_departamento())) with check ((select public.e_departamento()));
create policy "scout departamento" on public.scout_avaliacoes for all to authenticated using ((select public.e_departamento())) with check ((select public.e_departamento()));
drop trigger if exists tocar_updated_at on public.scout_jogadores;
create trigger tocar_updated_at before insert or update on public.scout_jogadores for each row execute function public.tocar_updated_at();
drop trigger if exists tocar_updated_at on public.scout_avaliacoes;
create trigger tocar_updated_at before insert or update on public.scout_avaliacoes for each row execute function public.tocar_updated_at();
do $$ declare t text; begin
  foreach t in array array['scout_jogadores','scout_avaliacoes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
exception when undefined_object then null; end $$;


-- Scout: equipas (campeonato e link do Transfermarkt). As equipas de um campeonato entram de uma vez pelo link do campeonato.
create table if not exists public.scout_equipas (
  id uuid primary key default gen_random_uuid(),
  equipa text not null unique,
  campeonato text,
  tm_url text,
  tm_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scout_equipas enable row level security;
drop policy if exists "scout departamento" on public.scout_equipas;
create policy "scout departamento" on public.scout_equipas for all to authenticated using ((select public.e_departamento())) with check ((select public.e_departamento()));
drop trigger if exists tocar_updated_at on public.scout_equipas;
create trigger tocar_updated_at before insert or update on public.scout_equipas for each row execute function public.tocar_updated_at();
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'scout_equipas') then
    alter publication supabase_realtime add table public.scout_equipas;
  end if;
exception when undefined_object then null; end $$;


-- Escalas do Scout: rendimento e potencial 1–9, margem de venda 1–3.
alter table public.scout_avaliacoes drop constraint if exists scout_avaliacoes_rendimento_check;
alter table public.scout_avaliacoes drop constraint if exists scout_avaliacoes_potencial_check;
alter table public.scout_avaliacoes drop constraint if exists scout_avaliacoes_margem_venda_check;
alter table public.scout_avaliacoes add constraint scout_avaliacoes_rendimento_check check (rendimento between 1 and 9);
alter table public.scout_avaliacoes add constraint scout_avaliacoes_potencial_check check (potencial between 1 and 9);
alter table public.scout_avaliacoes add constraint scout_avaliacoes_margem_venda_check check (margem_venda between 1 and 3);

notify pgrst, 'reload schema';
