# Departamento de Análise — SCUT Torreense

Aplicação web (uma só página) do departamento de análise. A Vercel publica a raiz deste repositório:

- `index.html` — a aplicação já construída (com a ligação ao Supabase).
- `img/` — fundos e símbolo usados pela aplicação e pelos PDF.
- `api/transfermarkt.py` — função da Vercel que lê páginas do Transfermarkt.

## Código-fonte (`fonte/`, não é publicado)

- `fonte/src/` — JavaScript, CSS, `shell.html` e imagens originais.
- `fonte/schema.sql` — estrutura da base de dados e regras de acesso (RLS). Pode ser corrido outra vez no Supabase sem perder dados.
- `fonte/build.py` — junta `src/` num único `index.html` (sem ligação ao Supabase; abre em modo demonstração).
- `fonte/build_entrega.py` — acrescenta a ligação ao Supabase e copia `img/` para a raiz do repositório.
- `fonte/build_preview.py` — versão com as imagens embutidas, para abrir offline.

## Atualizar a aplicação

```bash
cd fonte
python3 build.py
python3 build_entrega.py      # escreve ../index.html e ../img/
git add -A && git commit -m "..." && git push
```

A Vercel publica automaticamente cada push para `main`.

## Papéis

- **departamento** — tudo, incluindo importações, definições e apagar.
- **colaborador** — cria e edita codificação, observação, jogos e arquivo; não apaga (bloqueado também na base de dados).
- **equipa_tecnica** — sem acesso.

## Cópias de segurança

Em Definições → Cópia de segurança: descarrega um ficheiro `.json` com todas as tabelas. A aplicação lembra o departamento ao fim de 7 dias. "Repor a partir de uma cópia" volta a pôr os registos do ficheiro (não apaga nada).
