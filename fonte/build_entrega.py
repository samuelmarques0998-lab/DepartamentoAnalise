"""Gera a versão publicada: o index.html com a ligação ao Supabase e a pasta img/.
Uso: python3 build.py && python3 build_entrega.py [pasta de destino]
Sem destino, escreve na pasta acima desta (a raiz do repositório, que é o que a Vercel publica)."""
import pathlib, shutil, sys
raiz = pathlib.Path(__file__).parent
destino = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else raiz.parent
s = (raiz / 'index.html').read_text()
old = "const LIGACAO = {\n  url: '',\n  chave: ''\n};"
assert old in s
# A chave "anon" é pública por natureza (vai sempre no browser); a segurança está nas regras RLS do schema.sql.
s = s.replace(old, """const LIGACAO = {
  url: 'https://ciyvgscuqmtcqttiakaj.supabase.co',
  chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeXZnc2N1cW10Y3F0dGlha2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDY5NDMsImV4cCI6MjEwODUyMjk0M30.9kmr5az3gUrws_QXTa9PZakpgZJrAKUefI3t_Z9-ZNg'
};""")
destino.mkdir(parents=True, exist_ok=True)
(destino / 'index.html').write_text(s)
shutil.copytree(raiz / 'img', destino / 'img', dirs_exist_ok=True)
print('entrega ok ->', destino)
