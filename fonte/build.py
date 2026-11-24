import pathlib, re

def _regras(inner, prefixo):
    """Prefixa cada seletor das regras de um bloco (sem blocos aninhados, excepto @page, que é omitido)."""
    out, i = [], 0
    while True:
        a = inner.find('{', i)
        if a < 0: break
        sel = re.sub(r'/\*.*?\*/', '', inner[i:a], flags=re.S).strip()
        b = inner.find('}', a)
        corpo = inner[a:b + 1]; i = b + 1
        if not sel or sel.startswith('@'): continue
        out.append(', '.join(prefixo + x.strip() for x in sel.split(',')) + ' ' + corpo)
    return '\n'.join(out)

def transformar_css(css):
    """Exportação em folhas A4: com html.medir, as regras de impressão aplicam-se também no ecrã (para medir as páginas)
    e as regras responsivas deixam de se aplicar (a página tem largura fixa, seja qual for o ecrã ou a impressora)."""
    res, i = [], 0
    while True:
        m = re.search(r'@media([^{]*)\{', css[i:])
        if not m: res.append(css[i:]); break
        ini = i + m.start(); s = i + m.end(); d, j = 1, s
        while d:
            d += {'{': 1, '}': -1}.get(css[j], 0); j += 1
        cab, inner = m.group(1).strip(), css[s:j - 1]
        res.append(css[i:j])
        if cab == 'print':
            res.append('\n' + _regras(inner, ':where(html.medir) ') + '\n')
        elif 'width' in cab and '@' not in inner:
            res[-1] = css[i:ini] + '@media ' + cab + ' {\n' + _regras(inner, ':where(html:not(.medir)) ') + '\n}'
        i = j
    return ''.join(res)
src = pathlib.Path(__file__).parent / 'src'
ordem = ['util.js','db.js','demo.js','importer.js','app.js','relatorio.js','posjogo.js','oportunidades.js','perfis.js','jogador.js','plantel.js','transfermarkt.js','calendario.js','visao.js','analise.js','rel_oportunidades.js', 'rel_esquemas.js','codificacao.js','esquemas.js','campeonato.js','observacao.js','verificacao.js','dados_jogo.js','adversario_wy.js','conclusoes_wy.js','arquivo.js','importacao.js']
# Imagens: ficam como ficheiros em img/ (o index.html fica leve e o browser guarda-as em cache).
IMG = {'/*FUNDO_A4*/': 'fundo_a4.jpg', '/*FUNDO_A4_H*/': 'fundo_a4_h.jpg', '/*SIMBOLO*/': 'simbolo.png', '/*FUNDO*/': 'fundo.jpg', '/*FUNDO_FORMA*/': 'fundo_forma.jpg', '/*FUNDO_CAPA*/': 'fundo_capa.jpg'}
raiz = pathlib.Path(__file__).parent
(raiz/'img').mkdir(exist_ok=True)
for f in set(IMG.values()): (raiz/'img'/f).write_bytes((src/f).read_bytes())
def imgs(t):
    for k, f in IMG.items():
        t = t.replace("data:image/jpeg;base64," + k, 'img/' + f).replace("data:image/png;base64," + k, 'img/' + f)
    return t
js = imgs('\n'.join((src/f).read_text() for f in ordem))
css = imgs(transformar_css((src/'styles.css').read_text()))
html = (src/'shell.html').read_text().replace('/*CSS*/', css).replace('/*JS*/', js)
(pathlib.Path(__file__).parent/'index.html').write_text(html)
print('ok', len(html)//1024, 'KB')
