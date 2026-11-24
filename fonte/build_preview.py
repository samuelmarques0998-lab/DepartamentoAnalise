import re, pathlib, os
os.chdir(pathlib.Path(__file__).parent)
h = pathlib.Path('index.html').read_text()
import base64
for f in pathlib.Path('img').iterdir():
    h = h.replace('img/' + f.name, ('data:image/png;base64,' if f.suffix == '.png' else 'data:image/jpeg;base64,') + base64.b64encode(f.read_bytes()).decode())
head = re.search(r'<head>(.*?)</head>', h, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', h, re.S).group(1)
head = re.sub(r'<meta[^>]*>\n', '', head)
head = head.replace('<title>Departamento de Análise</title>', '<title>Departamento de Análise CD Ribeira</title>')
head = re.sub(r'<script src="https://cdn.jsdelivr.net/npm/@supabase[^"]*"></script>\n', '', head)
head = head.replace('chart.js@4/dist', 'chart.js@4.4.1/dist')
head = head.replace('</style>', '#b-pdf, #b-ligacao { display: none !important; }\n.topo { top: env(safe-area-inset-top, 0px); }\n</style>')
body = body.replace('function obterLigacao() {', 'function obterLigacao() {\n  return { demo: true };', 1)
pathlib.Path('preview').mkdir(exist_ok=True)
pathlib.Path('preview/departamento-analise.html').write_text(head.strip() + '\n' + body.strip() + '\n')
print('ok')
